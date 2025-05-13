import cv2
import face_recognition
import numpy as np
import os
import glob
import json
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import time
import base64
import subprocess
import threading
import atexit
import signal
import datetime
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import requests
from gpiozero import LED, Button

app = Flask(__name__)
CORS(app)

# GPIO Pins
LED_PIN = 27
IR_PIN = 17

# Initialize components
led = LED(LED_PIN)
ir_sensor = Button(IR_PIN, pull_up=False)

# Lock for thread safety
state_lock = threading.Lock()
led_state = False
camera_process = None

# Text-to-speech process management
speech_lock = threading.Lock()
current_speech_process = None

# Global face data
known_face_encodings = []
known_face_names = []
last_recognized_person = None
last_recognition_time = 0
recognition_cooldown = 5  # seconds

# Google Sheets configuration
SPREADSHEET_NAME = "Attendance Log"
# Use absolute path for credentials file
CREDENTIALS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "credentials.json")
# Alternative locations to search for credentials file
ALTERNATIVE_CREDENTIAL_PATHS = [
    "./credentials.json",
    "../credentials.json",
    "/home/smartmirror/Desktop/SmartMirror/backend/controllers/face_recognition/credentials.json"  # Adjust for your username if not pi
]

# Telegram configuration
TELEGRAM_BOT_TOKEN = "8126908772:AAHLwYm7eQn0s53rIRtA_nVotTqPImJbXtA"  # Replace with your bot token
TELEGRAM_GROUP_ID = "-4786736575"    # Replace with your group ID
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/14v-KCOdJa5uTtVfaqriX4CanhTvJykTPDYL0bJ05LuY/edit?usp=sharing"  # Replace with your shared Google Sheet URL

# Initialize Google Sheets API
def init_google_sheets():
    global CREDENTIALS_FILE
    
    # Try to find credentials file
    credentials_found = False
    if os.path.exists(CREDENTIALS_FILE):
        credentials_found = True
        print(f"[SHEETS] Found credentials file at: {CREDENTIALS_FILE}")
    else:
        # Try alternative paths
        print(f"[SHEETS] Credentials not found at {CREDENTIALS_FILE}, trying alternatives...")
        for alt_path in ALTERNATIVE_CREDENTIAL_PATHS:
            if os.path.exists(alt_path):
                CREDENTIALS_FILE = alt_path
                credentials_found = True
                print(f"[SHEETS] Found credentials file at alternative path: {CREDENTIALS_FILE}")
                break
    
    if not credentials_found:
        print(f"[SHEETS] ERROR: Credentials file not found. Looked in:")
        print(f"  - {CREDENTIALS_FILE}")
        for path in ALTERNATIVE_CREDENTIAL_PATHS:
            print(f"  - {path}")
        print("[SHEETS] Attendance logging will be disabled.")
        return None
    
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        print(f"[SHEETS] Loading credentials from: {CREDENTIALS_FILE}")
        credentials = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
        client = gspread.authorize(credentials)
        
        # Try to open existing spreadsheet, create if it doesn't exist
        try:
            spreadsheet = client.open(SPREADSHEET_NAME)
            print(f"[SHEETS] Opened existing spreadsheet: {SPREADSHEET_NAME}")
        except gspread.SpreadsheetNotFound:
            print(f"[SHEETS] Creating new spreadsheet: {SPREADSHEET_NAME}")
            spreadsheet = client.create(SPREADSHEET_NAME)
            # Share the spreadsheet with a specific email (optional)
            # spreadsheet.share('example@email.com', perm_type='user', role='writer')
        
        # Get or create the worksheet
        try:
            worksheet = spreadsheet.worksheet("Attendance")
            print("[SHEETS] Found existing worksheet: Attendance")
        except gspread.WorksheetNotFound:
            print("[SHEETS] Creating new worksheet: Attendance")
            worksheet = spreadsheet.add_worksheet(title="Attendance", rows=1000, cols=4)
            # Add headers
            worksheet.update('A1:D1', [['Name', 'Date', 'Time', 'Status']])
        
        print(f"[SHEETS] Google Sheets initialized successfully")
        return client
    except Exception as e:
        print(f"[SHEETS] Error initializing Google Sheets: {e}")
        if "invalid_grant" in str(e).lower():
            print("[SHEETS] Authentication error - check if your credentials.json is valid and not expired")
        return None

# Google Sheets client
sheets_client = None

def log_attendance(name):
    """Log attendance to Google Sheets"""
    global sheets_client
    
    if not sheets_client:
        print("[SHEETS] Sheets client not initialized, cannot log attendance")
        return False
    
    try:
        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")
        
        # Open spreadsheet and worksheet
        try:
            spreadsheet = sheets_client.open(SPREADSHEET_NAME)
            worksheet = spreadsheet.worksheet("Attendance")
            
            # Add new row with attendance data
            worksheet.append_row([name, date_str, time_str, "Present"])
            print(f"[SHEETS] Logged attendance for {name}")
            return True
        except gspread.exceptions.APIError as api_error:
            print(f"[SHEETS] Google Sheets API error: {api_error}")
            # Try to refresh the client if token expired
            if "invalid_grant" in str(api_error).lower() or "unauthorized" in str(api_error).lower():
                print("[SHEETS] Attempting to reinitialize Google Sheets client...")
                sheets_client = init_google_sheets()
                if sheets_client:
                    # Try again once
                    spreadsheet = sheets_client.open(SPREADSHEET_NAME)
                    worksheet = spreadsheet.worksheet("Attendance")
                    worksheet.append_row([name, date_str, time_str, "Present"])
                    print(f"[SHEETS] Logged attendance for {name} after reinitializing")
                    return True
            return False
    except Exception as e:
        print(f"[SHEETS] Error logging attendance: {e}")
        return False

def send_telegram_notification(name, image_bytes=None):
    """Send notification to Telegram group"""
    if TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN" or TELEGRAM_GROUP_ID == "YOUR_GROUP_ID":
        print("[TELEGRAM] Bot token or group ID not configured")
        return False
        
    try:
        message = f"✅ Attendance logged successfully!\n\n👤 Name: {name}\n🕒 Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        # Add spreadsheet link if available
        if SPREADSHEET_URL != "YOUR_SPREADSHEET_URL":
            message += f"\n\n📊 Attendance sheet: {SPREADSHEET_URL}"
        
        # Send text message
        print(f"[TELEGRAM] Sending message to group {TELEGRAM_GROUP_ID}")
        text_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        text_params = {
            "chat_id": TELEGRAM_GROUP_ID,
            "text": message,
            "parse_mode": "HTML"
        }
        text_response = requests.post(text_url, data=text_params)
        
        if text_response.status_code != 200:
            print(f"[TELEGRAM] Error sending text message: {text_response.text}")
            return False
            
        
        print(f"[TELEGRAM] Notification sent for {name}")
        return True
    except Exception as e:
        print(f"[TELEGRAM] Error sending notification: {e}")
        return False

def cleanup():
    global camera_process, current_speech_process
    print("[CLEANUP] Cleaning up resources...")

    try:
        led.off()
        print("[CLEANUP] LED turned off.")
    except Exception as e:
        print(f"[CLEANUP] LED cleanup error: {e}")

    try:
        if camera_process and camera_process.poll() is None:
            camera_process.terminate()
            camera_process.wait(timeout=3)
            print("[CLEANUP] Camera subprocess terminated.")
    except Exception as e:
        print(f"[CLEANUP] Failed to terminate camera subprocess: {e}")
        
    try:
        with speech_lock:
            if current_speech_process and current_speech_process.poll() is None:
                current_speech_process.terminate()
                print("[CLEANUP] Speech process terminated.")
    except Exception as e:
        print(f"[CLEANUP] Failed to terminate speech process: {e}")

atexit.register(cleanup)

def load_face_encodings_from_directory(directory_path):
    face_encodings = []
    face_names = []

    if not os.path.isdir(directory_path):
        print(f"Error: Directory '{directory_path}' not found!")
        return face_encodings, face_names

    image_extensions = ['jpg', 'jpeg', 'png', 'bmp']
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext}')))
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext.upper()}')))

    if not image_files:
        print(f"No image files found in '{directory_path}'")
        return face_encodings, face_names

    print(f"Found {len(image_files)} images. Processing...")

    for image_file in image_files:
        basename = os.path.basename(image_file)
        name = os.path.splitext(basename)[0]

        try:
            image = face_recognition.load_image_file(image_file)
            face_locations = face_recognition.face_locations(image)

            if not face_locations:
                print(f"Warning: No face found in '{basename}'. Skipping...")
                continue

            face_encoding = face_recognition.face_encodings(image, face_locations)[0]
            face_encodings.append(face_encoding)
            face_names.append(name)
            print(f"Loaded face: {name}")

        except Exception as e:
            print(f"Error processing '{basename}': {e}")

    return face_encodings, face_names

def process_frame(frame):
    global last_recognized_person, last_recognition_time

    try:
        if not known_face_encodings:
            return None, frame, None

        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_small_frame)

        if not face_locations:
            return None, frame, None

        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        recognized_person = None
        face_image = None
        current_time = time.time()

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"

            if True in matches:
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]

                    if name != last_recognized_person or current_time - last_recognition_time > recognition_cooldown:
                        recognized_person = name
                        last_recognized_person = name
                        last_recognition_time = current_time
                        
                        # Capture face image for notification
                        face_image = frame[top:bottom, left:right].copy()

            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

        return recognized_person, frame, face_image

    except Exception as e:
        print("Error in process_frame:", e)
        return None, frame, None

def generate_frames():
    try:
        video_capture = cv2.VideoCapture("/dev/video10")
        if not video_capture.isOpened():
            print("Error: Could not open video capture device")
            return

        while True:
            success, frame = video_capture.read()
            if not success:
                print("Failed to grab frame from webcam")
                break

            recognized_person, processed_frame, face_image = process_frame(frame)
            
            # If person recognized, log attendance and send notification
            if recognized_person:
                threading.Thread(target=handle_recognition, args=(recognized_person, face_image)).start()
                
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            frame_bytes = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    except Exception as e:
        print("Error in generate_frames:", e)

def handle_recognition(name, face_image):
    """Handle recognition event - log attendance and send notification"""
    try:
        print(f"[RECOGNITION] Handling recognition for {name}")
        
        # Log attendance to Google Sheets
        attendance_logged = log_attendance(name)
        if attendance_logged:
            print(f"[RECOGNITION] Successfully logged attendance for {name}")
        else:
            print(f"[RECOGNITION] Failed to log attendance for {name}")
        
        # Send Telegram notification if bot token and group ID are configured
        telegram_sent = False
        if TELEGRAM_BOT_TOKEN != "YOUR_BOT_TOKEN" and TELEGRAM_GROUP_ID != "YOUR_GROUP_ID":
            if face_image is not None:
                _, img_encoded = cv2.imencode('.jpg', face_image)
                img_bytes = img_encoded.tobytes()
                telegram_sent = send_telegram_notification(name, img_bytes)
            else:
                telegram_sent = send_telegram_notification(name)
                
            if telegram_sent:
                print(f"[TELEGRAM] Successfully sent notification for {name}")
            else:
                print(f"[TELEGRAM] Failed to send notification for {name}")
        else:
            print("[TELEGRAM] Bot token or group ID not configured, skipping notification")
        
        # Welcome message using improved TTS
        welcome_message = f"Welcome {name}. Your attendance has been logged successfully."
        if attendance_logged:
            if telegram_sent:
                welcome_message += " Notification has been sent."
        speak_improved(welcome_message)
    except Exception as e:
        print(f"[RECOGNITION] Error handling recognition: {e}")
        # Try to speak a simple message even if other steps failed
        try:
            speak_improved(f"Welcome {name}.")
        except:
            pass

def speak_improved(text):
    """Speak text with improved natural-sounding voice"""
    global current_speech_process
    
    with speech_lock:
        # Stop any current speech
        if current_speech_process and current_speech_process.poll() is None:
            current_speech_process.terminate()
            try:
                current_speech_process.wait(timeout=1)
            except:
                pass
        
        # Use pico2wave for more natural sounding speech
        try:
            # Try with pico2wave if available
            temp_file = "/tmp/speech.wav"
            current_speech_process = subprocess.Popen(
                ["pico2wave", "-w", temp_file, text],
                stdout=subprocess.DEVNULL, 
                stderr=subprocess.DEVNULL
            )
            current_speech_process.wait()
            current_speech_process = subprocess.Popen(
                ["aplay", temp_file],
                stdout=subprocess.DEVNULL, 
                stderr=subprocess.DEVNULL
            )
        except Exception:
            # Fall back to espeak with improved settings
            current_speech_process = subprocess.Popen(
                ["espeak", "-s", "130", "-p", "50", "-a", "150", "-g", "10", text],
                stdout=subprocess.DEVNULL, 
                stderr=subprocess.DEVNULL
            )

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/check_recognition')
def check_recognition():
    current_time = time.time()
    if last_recognized_person and current_time - last_recognition_time < 2:
        return jsonify({
            'recognized': True,
            'name': last_recognized_person,
            'timestamp': last_recognition_time
        })
    return jsonify({'recognized': False})

@app.route('/start_camera', methods=['POST'])
def start_camera():
    global camera_process
    if camera_process and camera_process.poll() is None:
        return jsonify({"status": "Camera already running"})

    print("[INFO] Starting camera subprocess...")
    command = (
        "libcamera-vid --nopreview -t 0 --width 640 --height 480 --framerate 30 --codec yuv420 --output - | "
        "ffmpeg -f rawvideo -pix_fmt yuv420p -s 640x480 -i - -f v4l2 -pix_fmt yuv420p /dev/video10"
    )
    camera_process = subprocess.Popen(command, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return jsonify({"status": "Camera started"})

@app.route('/upload', methods=['POST'])
def upload_image():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400

        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        recognized_person, _, face_image = process_frame(img)
        if recognized_person:
            # Handle recognition in background thread
            threading.Thread(target=handle_recognition, args=(recognized_person, face_image)).start()
            return jsonify({'recognized': True, 'name': recognized_person})
        else:
            return jsonify({'recognized': False, 'message': 'No person recognized'})
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/speak', methods=['POST'])
def speak_text():
    try:
        data = request.json
        text = data.get('text', 'Welcome')
        speak_improved(text)
        return jsonify({'success': True, 'message': 'Speech queued'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/led/on', methods=['POST'])
def turn_led_on():
    global led_state
    with state_lock:
        led.on()
        led_state = True
    return jsonify({'success': True, 'message': 'LED turned ON'})

@app.route('/led/off', methods=['POST'])
def turn_led_off():
    global led_state
    with state_lock:
        led.off()
        led_state = False
    return jsonify({'success': True, 'message': 'LED turned OFF'})

@app.route('/led/status', methods=['GET'])
def get_led_status():
    return jsonify({'led_on': led_state})

@app.route('/shutdown', methods=['POST'])
def shutdown():
    os.system("sudo shutdown now")
    return jsonify({"status": "Shutting down..."})

@app.route('/reboot', methods=['POST'])
def reboot():
    os.system("sudo reboot now")
    return jsonify({"status": "Rebooting..."})

def toggle_led():
    global led_state
    with state_lock:
        led_state = not led_state
        led.value = led_state
        print(f"[IR SENSOR] Hand detected. LED is now {'ON' if led_state else 'OFF'}.")

def start_ir_listener():
    ir_sensor.when_pressed = toggle_led
    print("[INFO] IR sensor listener active.")

if __name__ == '__main__':
    print("[BOOT] Loading known faces...")
    faces_directory = "./controllers/face_recognition/faces"
    known_face_encodings, known_face_names = load_face_encodings_from_directory(faces_directory)

    if not known_face_encodings:
        print("[WARN] No faces loaded. Recognition will not work.")

    # Initialize Google Sheets
    print("[BOOT] Initializing Google Sheets...")
    sheets_client = init_google_sheets()
    
    if sheets_client:
        print("[BOOT] Google Sheets initialized successfully")
    else:
        print("[WARN] Google Sheets initialization failed. Attendance logging will be disabled.")
    
    # Check Telegram configuration
    if TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN" or TELEGRAM_GROUP_ID == "YOUR_GROUP_ID":
        print("[WARN] Telegram configuration not set. Notifications will be disabled.")
    else:
        print("[BOOT] Telegram configuration detected")

    threading.Thread(target=start_ir_listener, daemon=True).start()

    print("[BOOT] Starting Flask server...")
    app.run(host='0.0.0.0', port=5030, debug=False, use_reloader=False)