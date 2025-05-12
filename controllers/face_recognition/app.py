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
from gpiozero import LED, Button
import threading
import atexit
import signal

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

# Global face data
known_face_encodings = []
known_face_names = []
last_recognized_person = None
last_recognition_time = 0
recognition_cooldown = 5  # seconds

def cleanup():
    global camera_process
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
            return None, frame

        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_small_frame)

        if not face_locations:
            return None, frame

        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        recognized_person = None
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

            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

        return recognized_person, frame

    except Exception as e:
        print("Error in process_frame:", e)
        return None, frame

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

            _, processed_frame = process_frame(frame)
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            frame_bytes = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    except Exception as e:
        print("Error in generate_frames:", e)

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
        "libcamera-vid -t 0 --width 640 --height 480 --framerate 30 --codec yuv420 --output - | "
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

        recognized_person, _ = process_frame(img)
        if recognized_person:
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
        subprocess.run(['espeak', '-s', '130', text])
        return jsonify({'success': True, 'message': 'Speech completed'})
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

    threading.Thread(target=start_ir_listener, daemon=True).start()

    print("[BOOT] Starting Flask server...")
    app.run(host='0.0.0.0', port=5030, debug=False, use_reloader=False)