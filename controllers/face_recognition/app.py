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

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
known_face_encodings = []
known_face_names = []
last_recognized_person = None
last_recognition_time = 0
recognition_cooldown = 5  # seconds between recognitions

def load_face_encodings_from_directory(directory_path):
    """
    Load all images from a directory and create face encodings.
    Uses the filename (without extension) as the person's name.
    """
    face_encodings = []
    face_names = []
    
    # Check if directory exists
    if not os.path.isdir(directory_path):
        print(f"Error: Directory '{directory_path}' not found!")
        return face_encodings, face_names
    
    # Get all image files with common extensions
    image_extensions = ['jpg', 'jpeg', 'png', 'bmp']
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext}')))
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext.upper()}')))
    
    if not image_files:
        print(f"No image files found in '{directory_path}'")
        return face_encodings, face_names
    
    print(f"Found {len(image_files)} images. Processing...")
    
    # Process each image file
    for image_file in image_files:
        # Extract name from filename (without extension and path)
        basename = os.path.basename(image_file)
        name = os.path.splitext(basename)[0]
        
        try:
            # Load image
            image = face_recognition.load_image_file(image_file)
            
            # Find faces in the image
            face_locations = face_recognition.face_locations(image)
            
            if not face_locations:
                print(f"Warning: No face found in '{basename}'. Skipping...")
                continue
                
            # If multiple faces found, use the first one
            if len(face_locations) > 1:
                print(f"Warning: Multiple faces found in '{basename}'. Using the first one.")
                
            # Get the face encoding
            face_encoding = face_recognition.face_encodings(image, face_locations)[0]
            
            # Add encoding and name to lists
            face_encodings.append(face_encoding)
            face_names.append(name)
            
            print(f"Successfully loaded: {name}")
            
        except Exception as e:
            print(f"Error processing '{basename}': {e}")
    
    return face_encodings, face_names

def process_frame(frame):
    """Process a video frame and return recognition results"""
    global last_recognized_person, last_recognition_time
    try:
    
        # Resize frame for faster processing
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Find faces in the frame
        face_locations = face_recognition.face_locations(rgb_small_frame)
        
        if not face_locations:
            return None, frame
        
        # Find face encodings
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        
        # Initialize recognition result
        recognized_person = None
        current_time = time.time()
        
        # Process each detected face
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Scale face locations back up
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
            
            # Check if this face matches any known face
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"
            
            if True in matches:
                # Find best match
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)
                
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]
                    
                    # Check if we should recognize this person (cooldown)
                    if (name != last_recognized_person or 
                        current_time - last_recognition_time > recognition_cooldown):
                        recognized_person = name
                        last_recognized_person = name
                        last_recognition_time = current_time
            
            # Draw rectangle and name
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.8, (255, 255, 255), 1)
        
        return recognized_person, frame
    except Exception as e:
        print("Face Recognition Error in process_frame:", e)
        return None, frame
def generate_frames():
    """Generate video frames with face recognition for streaming"""
    # Open webcam
    # video_capture = cv2.VideoCapture(0)
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
            
            # Process the frame
            recognized_person, processed_frame = process_frame(frame)
            
            # If someone is recognized, send this info in a separate endpoint
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            frame_bytes = buffer.tobytes()
            
            # Yield the frame in byte format for streaming
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    except Exception as e:
        print("Face recognition error in generate_frames: ",e)
@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/check_recognition')
def check_recognition():
    """Endpoint to check if anyone has been recognized recently"""
    global last_recognized_person, last_recognition_time
    
    current_time = time.time()
    
    # Only return a recognition if it's recent (within 2 seconds)
    if last_recognized_person and current_time - last_recognition_time < 2:
        return jsonify({
            'recognized': True,
            'name': last_recognized_person,
            'timestamp': last_recognition_time
        })
    
    return jsonify({
        'recognized': False
    })

# Example Flask endpoint
@app.route('/start_camera', methods=['POST'])
def start_camera():
    print("CAMERA STARTING")
    subprocess.Popen(
        "libcamera-vid -t 0 --width 640 --height 480 --framerate 30 --codec yuv420 --output - | "
        "ffmpeg -f rawvideo -pix_fmt yuv420p -s 640x480 -i - -f v4l2 -pix_fmt yuv420p /dev/video10", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # subprocess.Popen(
    #     "libcamera-vid -t 0 --width 640 --height 480 --framerate 30 --codec yuv420 --output - | "
    #     "ffmpeg -f rawvideo -pix_fmt yuv420p -s 640x480 -i - -f v4l2 -pix_fmt yuv420p /dev/video10",
    #     shell=True
    # )
    return jsonify({"status": "Camera started"})


@app.route('/upload', methods=['POST'])
def upload_image():
    """Upload an image for processing"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode base64 image
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Process the image
        recognized_person, _ = process_frame(img)
        
        if recognized_person:
            return jsonify({
                'recognized': True,
                'name': recognized_person
            })
        else:
            return jsonify({
                'recognized': False,
                'message': 'No person recognized'
            })
    
    except Exception as e:
        print(f"Error processing uploaded image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/speak', methods=['POST'])
def speak_text():
    """Directly speak text using the Raspberry Pi's audio system"""
    try:
        data = request.json
        text = data.get('text', 'Welcome')
        
        # Use espeak for text-to-speech (comes pre-installed on many Raspberry Pi OS versions)
        # You can adjust the speed (-s) and voice parameters as needed
        subprocess.run(['espeak', '-s', '130', text])
        
        # Or use festival (another TTS system available for Raspberry Pi)
        # echo_process = subprocess.Popen(['echo', text], stdout=subprocess.PIPE)
        # subprocess.run(['festival', '--tts'], stdin=echo_process.stdout)
        
        return jsonify({'success': True, 'message': 'Speech completed'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
if __name__ == '__main__':
    # Directory containing face images
    faces_directory = "./controllers/face_recognition/faces"  # Change this to your directory
    
    # Load known face encodings and names
    print(f"Loading faces from directory: {faces_directory}")
    known_face_encodings, known_face_names = load_face_encodings_from_directory(faces_directory)
    
    if not known_face_encodings:
        print("Warning: No face encodings loaded. Recognition will not work.")
    else:
        print(f"Successfully loaded {len(known_face_encodings)} reference faces.")
    
    # Start the Flask app
    app.run(host='0.0.0.0', port=5030, debug=True)