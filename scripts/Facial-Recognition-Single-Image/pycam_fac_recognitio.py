from flask import Flask, Response, jsonify
from flask_cors import CORS
import cv2
from picamera2 import Picamera2
import face_recognition
import numpy as np
import threading
import time
import os
import logging
import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("/home/smartmirror/Desktop/SmartMirror/smart-mirror-backend/face_recognition.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("face_recognition")

# Global variables
output_frame = None
last_recognized_name = None
face_detected = False
lock = threading.Lock()

# Load known faces
def load_known_faces(directory):
    known_encodings, known_names = [], []
    
    # Check if directory exists
    if not os.path.exists(directory):
        logger.error(f"Face directory does not exist: {directory}")
        return known_encodings, known_names
    
    logger.info(f"Loading known faces from: {directory}")
    
    for file in os.listdir(directory):
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            file_path = os.path.join(directory, file)
            try:
                logger.info(f"Processing face image: {file}")
                image = face_recognition.load_image_file(file_path)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    known_encodings.append(encodings[0])
                    name = os.path.splitext(file)[0]
                    known_names.append(name)
                    logger.info(f"Successfully loaded face: {name}")
                else:
                    logger.warning(f"No face found in image: {file}")
            except Exception as e:
                logger.error(f"Error processing face image {file}: {str(e)}")
    
    logger.info(f"Loaded {len(known_names)} known faces: {known_names}")
    return known_encodings, known_names

# Initialize camera
picam2 = None
def initialize_camera():
    global picam2
    picam2 = Picamera2()
    picam2.configure(picam2.create_preview_configuration(main={"format": "RGB888", "size": (640, 480)}))
    picam2.start()
    print("[INFO] Camera initialized")

# Face recognition function
def recognize_faces():
    global output_frame, last_recognized_name, face_detected, picam2
    
    # Track last recognition to avoid spamming logs
    last_recognition_time = 0
    previously_recognized = None
    
    # Load known faces
    faces_path = "/home/smartmirror/Desktop/SmartMirror/smart-mirror-backend/scripts/Facial-Recognition-Single-Image/faces"
    logger.info(f"Loading known faces from {faces_path}")
    known_encodings, known_names = load_known_faces(faces_path)
    logger.info(f"Loaded {len(known_names)} known faces")
    
    # Initialize camera if not already initialized
    if picam2 is None:
        try:
            initialize_camera()
            logger.info("Camera initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize camera: {str(e)}")
            return
    
    logger.info("Starting face recognition loop")
    frame_count = 0
    
    while True:
        try:
            frame_count += 1
            # Capture frame
            frame = picam2.capture_array()
            
            # Process every other frame for better performance
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(small_frame)
            
            # Update face_detected status
            current_face_detected = len(face_locations) > 0
            
            # Log face detection status periodically (every 50 frames)
            if frame_count % 50 == 0:
                logger.debug(f"Face detected: {current_face_detected}")
            
            if current_face_detected:
                face_encodings = face_recognition.face_encodings(small_frame, face_locations)
                
                for (top, right, bottom, left), encoding in zip(face_locations, face_encodings):
                    # Compare with known faces
                    matches = face_recognition.compare_faces(known_encodings, encoding)
                    name = "Unknown"
                    confidence = 0
                    
                    if len(known_encodings) > 0:
                        face_distances = face_recognition.face_distance(known_encodings, encoding)
                        best_index = np.argmin(face_distances)
                        confidence = 1 - face_distances[best_index]
                        
                        if matches[best_index] and confidence > 0.5:  # Add confidence threshold
                            name = known_names[best_index]
                            
                            # Log recognition with confidence level (but don't spam logs)
                            current_time = time.time()
                            if (name != previously_recognized or 
                                (current_time - last_recognition_time) > 5):  # Log every 5 seconds max
                                
                                logger.info(f"RECOGNIZED: {name} (confidence: {confidence:.2f})")
                                previously_recognized = name
                                last_recognition_time = current_time
                            
                            # Update last recognized name
                            with lock:
                                if last_recognized_name != name:
                                    logger.info(f"Setting recognized person to: {name}")
                                last_recognized_name = name
                    
                    # Scale back face coordinates
                    scale = 4
                    top *= scale
                    right *= scale
                    bottom *= scale
                    left *= scale
                    
                    # Draw rectangle and name
                    cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                    cv2.putText(frame, name, (left + 6, bottom - 6), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 1)
            
            # Update global face_detected status
            with lock:
                face_detected = current_face_detected
            
            # Convert frame to JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            
            # Update global output frame
            with lock:
                output_frame = buffer.tobytes()
                
        except Exception as e:
            print(f"[ERROR] {e}")
            continue
            
        # Sleep to reduce CPU usage
        time.sleep(0.05)

# Generate video feed
def generate():
    global output_frame
    while True:
        with lock:
            if output_frame is None:
                continue
            yield (b'--frame\r\n'
                  b'Content-Type: image/jpeg\r\n\r\n' + output_frame + b'\r\n')

# API Routes
@app.route('/video_feed')
def video_feed():
    # Return the response generated along with the specific media type
    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/check_recognition')
def check_recognition():
    global last_recognized_name, face_detected
    with lock:
        response = {
            'recognized': last_recognized_name is not None,
            'name': last_recognized_name,
            'face_detected': face_detected,
            'timestamp': datetime.datetime.now().isoformat()
        }
        
        # Log API calls when recognition status changes
        if last_recognized_name is not None:
            logger.info(f"API call: Recognition status - Recognized {last_recognized_name}")
        elif face_detected:
            logger.debug("API call: Recognition status - Face detected but not recognized")
    
    return jsonify(response)

@app.route('/reset_recognition')
def reset_recognition():
    global last_recognized_name
    old_name = last_recognized_name
    with lock:
        last_recognized_name = None
    logger.info(f"Reset recognition: {old_name} -> None")
    return jsonify({'status': 'reset successful', 'previous_name': old_name})

@app.route('/status')
def status():
    """API endpoint to check system status and logs"""
    global last_recognized_name, face_detected
    
    # Get last log entries
    last_logs = []
    try:
        log_file = "/home/smartmirror/Desktop/SmartMirror/smart-mirror-backend/face_recognition.log"
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                # Get last 20 lines
                last_logs = f.readlines()[-20:]
    except Exception as e:
        last_logs = [f"Error reading logs: {str(e)}"]
    
    with lock:
        status_info = {
            'service': 'Face Recognition API',
            'status': 'running',
            'face_detected': face_detected,
            'recognized_name': last_recognized_name,
            'timestamp': datetime.datetime.now().isoformat(),
            'recent_logs': last_logs
        }
    
    return jsonify(status_info)

if __name__ == '__main__':
    # Log startup
    logger.info("===== Face Recognition Service Starting =====")
    
    # Start face recognition thread
    logger.info("Starting face recognition thread")
    face_thread = threading.Thread(target=recognize_faces, daemon=True)
    face_thread.start()
    
    # Run Flask app
    logger.info("Starting Flask server at http://localhost:5030")
    
    # Add routes to log for troubleshooting
    logger.info("Available endpoints:")
    logger.info(" - /video_feed - Camera stream")
    logger.info(" - /check_recognition - Recognition status")
    logger.info(" - /reset_recognition - Reset current recognition")
    logger.info(" - /status - System status and logs")
    
    app.run(host='0.0.0.0', port=5030, debug=False)