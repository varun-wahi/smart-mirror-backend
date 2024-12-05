import sys
import json
import face_recognition
import os
import numpy as np

def load_known_faces(known_faces_dir):
    """
    Load known faces from a directory.
    Each image filename (without extension) is considered the person's name.
    """
    print(f"Loading known faces from directory: {known_faces_dir}")
    known_face_encodings = []
    known_face_names = []

    for filename in os.listdir(known_faces_dir):
        if filename.endswith(('.jpg', '.jpeg', '.png')):
            image_path = os.path.join(known_faces_dir, filename)
            print(f"Processing known face: {image_path}")
            try:
                image = face_recognition.load_image_file(image_path)
                encoding = face_recognition.face_encodings(image)[0]  # Assumes one face per image
                name = os.path.splitext(filename)[0]
                known_face_encodings.append(encoding)
                known_face_names.append(name)
                print(f"Added {name} to known faces.")
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")
    
    print(f"Loaded {len(known_face_names)} known faces.")
    return known_face_encodings, known_face_names

def authenticate_face(image_path, known_faces_dir, tolerance=0.6):
    print(f"Authenticating face in image: {image_path}")
    print(f"Using known faces directory: {known_faces_dir}")
    try:
        # Load known faces
        known_face_encodings, known_face_names = load_known_faces(known_faces_dir)
        
        # Load the image to authenticate
        unknown_image = face_recognition.load_image_file(image_path)
        
        # Detect faces in the unknown image
        face_locations = face_recognition.face_locations(unknown_image)
        face_encodings = face_recognition.face_encodings(unknown_image, face_locations)

        print(f"Detected {len(face_encodings)} face(s) in the image.")

        if len(face_encodings) > 0:
            # Compare the first detected face with known faces
            face_encoding = face_encodings[0]
            matches = face_recognition.compare_faces(
                known_face_encodings, 
                face_encoding, 
                tolerance=tolerance
            )
            
            # Find the name of the matched face
            name = "Unknown"
            if True in matches:
                first_match_index = matches.index(True)
                name = known_face_names[first_match_index]
                print(f"Matched face with: {name}")
                
                return {
                    "success": True,
                    "teacherName": name,
                    "message": f"Face authenticated successfully as {name}."
                }
            else:
                print("No matching face found.")
                return {
                    "success": False,
                    "message": "No matching face found."
                }
        else:
            print("No face detected in the image.")
            return {
                "success": False,
                "message": "No face detected."
            }
    except Exception as e:
        print(f"Error during face authentication: {str(e)}")
        return {
            "success": False,
            "message": f"Error during face authentication: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "message": "Usage: python script.py <image_path> <known_faces_directory>"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    known_faces_dir = sys.argv[2]
    
    result = authenticate_face(image_path, known_faces_dir)
    print(json.dumps(result))