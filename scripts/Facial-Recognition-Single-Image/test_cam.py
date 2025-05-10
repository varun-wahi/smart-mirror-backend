#!/usr/bin/env python3
"""
Face Recognition Testing Script

This script tests the face recognition backend to ensure it's working correctly.
It checks connections to the API endpoints and verifies face recognition functionality.
"""

import requests
import time
import os
import sys
import json
from datetime import datetime

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def log_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def log_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def log_info(message):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

# API URL
API_URL = os.environ.get("API_URL", "http://localhost:5030")

def test_connection():
    """Test connection to the API"""
    try:
        response = requests.get(f"{API_URL}/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            log_success(f"Connected to Face Recognition API: {API_URL}")
            log_info(f"Service status: {data['status']}")
            if data.get('face_detected'):
                log_info("Face currently detected in camera view")
            if data.get('recognized_name'):
                log_info(f"Currently recognized person: {data['recognized_name']}")
            return True
        else:
            log_error(f"API returned status code {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        log_error(f"Could not connect to API at {API_URL}")
        return False
    except Exception as e:
        log_error(f"Error connecting to API: {str(e)}")
        return False

def test_recognition():
    """Test face recognition functionality"""
    try:
        response = requests.get(f"{API_URL}/check_recognition", timeout=5)
        if response.status_code == 200:
            data = response.json()
            log_success("Recognition API endpoint is working")
            
            # Check recognition status
            if data.get('face_detected'):
                log_info("Face detected in camera view")
                if data.get('recognized'):
                    log_success(f"Person recognized: {data['name']}")
                else:
                    log_warning("Face detected but not recognized")
            else:
                log_warning("No face currently detected - please stand in front of camera")
                
            return True
        else:
            log_error(f"Recognition API returned status code {response.status_code}")
            return False
    except Exception as e:
        log_error(f"Error testing recognition: {str(e)}")
        return False

def test_reset_recognition():
    """Test reset recognition functionality"""
    try:
        response = requests.get(f"{API_URL}/reset_recognition", timeout=5)
        if response.status_code == 200:
            data = response.json()
            log_success("Reset recognition API endpoint is working")
            if data.get('previous_name'):
                log_info(f"Previous recognition ({data['previous_name']}) was reset")
            else:
                log_info("No active recognition to reset")
            return True
        else:
            log_error(f"Reset API returned status code {response.status_code}")
            return False
    except Exception as e:
        log_error(f"Error testing reset: {str(e)}")
        return False

def test_video_feed():
    """Test video feed"""
    try:
        # Just check headers instead of downloading the full stream
        response = requests.head(f"{API_URL}/video_feed", timeout=5)
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if 'multipart/x-mixed-replace' in content_type:
                log_success("Video feed is working (MJPEG stream)")
                return True
            else:
                log_warning(f"Video feed has unexpected content type: {content_type}")
                return False
        else:
            log_error(f"Video feed API returned status code {response.status_code}")
            return False
    except Exception as e:
        log_error(f"Error testing video feed: {str(e)}")
        return False

def show_logs():
    """Show recent logs"""
    try:
        response = requests.get(f"{API_URL}/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if 'recent_logs' in data and data['recent_logs']:
                print("\n" + Colors.BOLD + "Recent Logs:" + Colors.END)
                for log in data['recent_logs']:
                    print(f"  {log.strip()}")
            else:
                log_warning("No logs available")
            return True
        else:
            log_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        log_error(f"Error getting logs: {str(e)}")
        return False

def run_continuous_monitor():
    """Run continuous monitoring of face detection"""
    try:
        print("\n" + Colors.BOLD + "Starting continuous monitoring (Ctrl+C to exit)..." + Colors.END)
        print("-" * 60)
        
        while True:
            try:
                response = requests.get(f"{API_URL}/check_recognition", timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    
                    if data.get('face_detected'):
                        if data.get('recognized'):
                            print(f"[{timestamp}] {Colors.GREEN}RECOGNIZED: {data['name']}{Colors.END}")
                        else:
                            print(f"[{timestamp}] {Colors.YELLOW}Face detected but not recognized{Colors.END}")
                    else:
                        print(f"[{timestamp}] No face detected")
                else:
                    print(f"[{timestamp}] {Colors.RED}API error: {response.status_code}{Colors.END}")
            except Exception as e:
                print(f"[{timestamp}] {Colors.RED}Error: {str(e)}{Colors.END}")
                
            # Wait before next check
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n" + Colors.BOLD + "Monitoring stopped." + Colors.END)

def main():
    """Main function"""
    print(Colors.BOLD + "\nFace Recognition System Test" + Colors.END)
    print("-" * 60)
    
    # Test API connection
    if not test_connection():
        print("\nPlease ensure the face recognition backend is running:")
        print("  1. Check if the service is running: sudo systemctl status face-recognition")
        print("  2. Start the service if needed: sudo systemctl start face-recognition")
        print("  3. View logs: sudo journalctl -u face-recognition -f")
        return False
    
    # Run all tests
    tests_passed = 0
    tests_total = 3
    
    print("\nRunning tests:")
    if test_video_feed():
        tests_passed += 1
    
    if test_recognition():
        tests_passed += 1
    
    if test_reset_recognition():
        tests_passed += 1
    
    print(f"\nTest results: {tests_passed}/{tests_total} tests passed")
    
    # Show logs
    print("\nChecking recent logs:")
    show_logs()
    
    # Offer continuous monitoring
    if tests_passed > 0:  # If at least some tests passed
        print("\nOptions:")
        print("  1. Start continuous monitoring")
        print("  2. Exit")
        
        try:
            choice = input("\nEnter choice (1-2): ")
            if choice == "1":
                run_continuous_monitor()
        except KeyboardInterrupt:
            pass
    
    print("\nTest completed.")

if __name__ == "__main__":
    main()