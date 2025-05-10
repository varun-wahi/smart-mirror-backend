import cv2
import face_recognition
import numpy as np
import os
import glob
import datetime

def load_face_encodings_from_directory(directory_path):
    """
    Load all images from a directory and create face encodings.
    Uses the filename (without extension) as the person's name.
    """
    known_face_encodings = []
    known_face_names = []

    if not os.path.isdir(directory_path):
        print(f"Error: Directory '{directory_path}' not found!")
        return known_face_encodings, known_face_names

    # Get image files with common extensions
    image_extensions = ['jpg', 'jpeg', 'png', 'bmp']
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext}')))
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext.upper()}')))

    if not image_files:
        print(f"No image files found in '{directory_path}'")
        return known_face_encodings, known_face_names

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

            if len(face_locations) > 1:
                print(f"Warning: Multiple faces found in '{basename}'. Using the first one.")

            face_encoding = face_recognition.face_encodings(image, face_locations)[0]
            known_face_encodings.append(face_encoding)
            known_face_names.append(name)

            print(f"Successfully loaded: {name}")

        except Exception as e:
            print(f"Error processing '{basename}': {e}")

    return known_face_encodings, known_face_names

def capture_and_log_image(frame, name="snapshot"):
    """
    Captures the current frame and saves it as an image.
    Logs the image path to the console.
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{name}_{timestamp}.jpg"
    save_path = os.path.join(os.getcwd(), filename)
    cv2.imwrite(save_path, frame)
    print(f"[INFO] Image saved: {save_path}")
    return save_path

def find_working_camera(max_tested=10):
    """
    Try multiple camera indexes to find a working one.
    """
    for i in range(max_tested):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            print(f"Camera found at index {i}")
            return i
        cap.release()
    print("No working camera found.")
    return None

# === Setup ===
faces_directory = "/home/smartmirror/Desktop/SmartMirror/smart-mirror-backend/scripts/Facial-Recognition-Single-Image/faces"
print(f"Loading faces from directory: {faces_directory}")
known_face_encodings, known_face_names = load_face_encodings_from_directory(faces_directory)

if not known_face_encodings:
    print("Error: No usable reference faces were found. Please check your images.")
    exit()
else:
    print(f"Successfully loaded {len(known_face_encodings)} reference faces.")

# === Camera Setup ===
camera_index = find_working_camera()
if camera_index is None:
    exit()

# video_capture = cv2.VideoCapture(camera_index)
video_capture = cv2.VideoCapture(0, cv2.CAP_V4L2)

if not video_capture.isOpened():
    print("Error: Could not open video capture device")
    exit()

# Take an initial test snapshot
ret, test_frame = video_capture.read()
if ret:
    capture_and_log_image(test_frame, "test_capture")
else:
    print("Error: Could not read initial frame for test capture.")

print("Press 's' to save a snapshot, 'q' to quit.")

# === Main Loop ===
while True:
    ret, frame = video_capture.read()
    if not ret:
        print("Failed to grab frame from webcam.")
        break

    # Resize frame for faster processing
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    # Detect faces
    face_locations = face_recognition.face_locations(rgb_small_frame)

    if face_locations:
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"

            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]

            # Scale face locations back up
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            # Draw face box and name
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.8, (255, 255, 255), 1)

    # Show the frame
    cv2.imshow('Video', frame)

    # Handle keypress
    key = cv2.waitKey(1) & 0xFF
    if key == ord('s'):
        capture_and_log_image(frame, "manual_snapshot")
    elif key == ord('q'):
        break

# === Cleanup ===
video_capture.release()
cv2.destroyAllWindows()
