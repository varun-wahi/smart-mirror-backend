import sys
import os
import face_recognition
import json
import numpy as np

def register_face(image_path, output_dir, teacher_name=None):
    try:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Use filename as default teacher name if not provided
        if teacher_name is None:
            teacher_name = os.path.splitext(os.path.basename(image_path))[0]

        print(f"Registering face for {teacher_name} from {image_path}")

        image = face_recognition.load_image_file(image_path)
        encodings = face_recognition.face_encodings(image)

        if len(encodings) == 0:
            return {
                "success": False,
                "message": "No face detected in the image."
            }

        encoding = encodings[0]
        output_path = os.path.join(output_dir, f"{teacher_name}.npy")
        np.save(output_path, encoding)

        return {
            "success": True,
            "message": f"Face registered for {teacher_name}",
            "encodingPath": output_path
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Error during face registration: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "message": "Usage: python register_face.py <image_path> <output_dir> [teacher_name]"
        }))
        sys.exit(1)

    image_path = sys.argv[1]
    output_dir = sys.argv[2]
    teacher_name = sys.argv[3] if len(sys.argv) > 3 else None

    result = register_face(image_path, output_dir, teacher_name)
    print(json.dumps(result))