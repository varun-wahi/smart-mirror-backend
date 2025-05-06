import cv2
import face_recognition
import numpy as np
import os
import glob

def load_face_encodings_from_directory(directory_path):
    """
    Load all images from a directory and create face encodings.
    Uses the filename (without extension) as the person's name.
    """
    known_face_encodings = []
    known_face_names = []
    
    # Check if directory exists
    if not os.path.isdir(directory_path):
        print(f"Error: Directory '{directory_path}' not found!")
        return known_face_encodings, known_face_names
    
    # Get all image files with common extensions
    image_extensions = ['jpg', 'jpeg', 'png', 'bmp']
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext}')))
        image_files.extend(glob.glob(os.path.join(directory_path, f'*.{ext.upper()}')))
    
    if not image_files:
        print(f"No image files found in '{directory_path}'")
        return known_face_encodings, known_face_names
    
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
            known_face_encodings.append(face_encoding)
            known_face_names.append(name)
            
            print(f"Successfully loaded: {name}")
            
        except Exception as e:
            print(f"Error processing '{basename}': {e}")
    
    return known_face_encodings, known_face_names

# Directory containing face images
faces_directory = "/Users/varunwahi/Development/Interview_Prep/frontend/src/controlApp/scripts/Facial-Recognition-Single-Image/faces"

# Load known face encodings and names from directory
print(f"Loading faces from directory: {faces_directory}")
known_face_encodings, known_face_names = load_face_encodings_from_directory(faces_directory)

# Check if we have any face encodings
if not known_face_encodings:
    print("Error: No usable reference faces were found. Please check your images.")
    exit()
else:
    print(f"Successfully loaded {len(known_face_encodings)} reference faces.")

# Initialize webcam
video_capture = cv2.VideoCapture(0)
if not video_capture.isOpened():
    print("Error: Could not open video capture device")
    exit()

print("Press 'q' to quit the program")

while True:
    # Capture frame-by-frame
    ret, frame = video_capture.read()
    
    if not ret:
        print("Failed to grab frame from webcam.")
        break

    # Resize frame to improve performance
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    
    # Convert BGR color (OpenCV) to RGB (face_recognition)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    # Find all face locations and encodings in the current frame
    face_locations = face_recognition.face_locations(rgb_small_frame)
    
    if face_locations:
        # Use face_locations to get face_encodings
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Compare face with known faces
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"
            
            # Use the known face with the smallest distance to the new face
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]

            # Scale back up face locations since the frame was resized
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            # Draw a box around the face
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
            
            # Draw a label with a name below the face
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
            font = cv2.FONT_HERSHEY_DUPLEX
            cv2.putText(frame, name, (left + 6, bottom - 6), font, 0.8, (255, 255, 255), 1)

    # Display the resulting frame
    cv2.imshow('Video', frame)

    # Hit 'q' on the keyboard to quit!
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release resources
video_capture.release()
cv2.destroyAllWindows()
