from flask import Flask, jsonify, request, Response
import face_recognition
import os
import numpy as np
from camera import VideoCamera
import cv2
import dlib
from scipy.spatial import distance as dist
import time
import random
import base64
from flask_cors import CORS
import requests
from hand_gestures import HAND_GESTURES
import atexit
import signal
import sys
from PIL import Image, ImageDraw, ImageFont
import io

app = Flask(__name__)
CORS(app, resources={
    r"/video_feed": {"origins": "*"},
    r"/get_gesture": {"origins": "*"},
    r"/capture": {"origins": "*"}
})

# Initialize dlib's face detector and facial landmark predictor
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

# Load known faces
known_face_encodings = []
known_face_names = []

for filename in os.listdir("known_faces"):
    if filename.endswith(".jpg") or filename.endswith(".png"):
        image = face_recognition.load_image_file(f"known_faces/{filename}")
        encodings = face_recognition.face_encodings(image)
        if encodings:
            known_face_encodings.append(encodings[0])
            known_face_names.append(os.path.splitext(filename)[0])

camera = VideoCamera()

# Load hand gesture images
hand_gesture_images = {}
for gesture in HAND_GESTURES:
    image_path = f"hand_gestures/{gesture['name']}.jpg"
    if os.path.exists(image_path):
        image = cv2.imread(image_path)
        hand_gesture_images[gesture['name']] = image

# Timer and animation state
current_gesture = None
gesture_start_time = None
gesture_duration = 5  # 5 seconds for gesture verification
verification_state = "waiting"  # waiting, success, failure
face_verified = False  # Track if face has been verified

def add_timer_overlay(frame, remaining_time):
    # Convert frame to PIL Image
    frame_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(frame_pil)
    
    # Add timer text
    timer_text = f"Time: {remaining_time:.1f}s"
    font = ImageFont.truetype("Arial.ttf", 40)
    text_width, text_height = draw.textsize(timer_text, font=font)
    
    # Draw semi-transparent background for timer
    draw.rectangle(
        [(10, 10), (10 + text_width + 20, 10 + text_height + 20)],
        fill=(0, 0, 0, 128)
    )
    
    # Draw timer text
    draw.text((20, 20), timer_text, font=font, fill=(255, 255, 255))
    
    # Convert back to OpenCV format
    return cv2.cvtColor(np.array(frame_pil), cv2.COLOR_RGB2BGR)

def add_gesture_overlay(frame, gesture_name):
    # Convert frame to PIL Image
    frame_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(frame_pil)
    
    # Add gesture text
    gesture_text = f"Gesture: {gesture_name}"
    font = ImageFont.truetype("Arial.ttf", 30)
    text_width, text_height = draw.textsize(gesture_text, font=font)
    
    # Draw semi-transparent background for gesture
    draw.rectangle(
        [(10, frame.shape[0] - text_height - 30), 
         (10 + text_width + 20, frame.shape[0] - 10)],
        fill=(0, 0, 0, 128)
    )
    
    # Draw gesture text
    draw.text((20, frame.shape[0] - text_height - 20), 
              gesture_text, font=font, fill=(255, 255, 255))
    
    # Convert back to OpenCV format
    return cv2.cvtColor(np.array(frame_pil), cv2.COLOR_RGB2BGR)

def add_verification_overlay(frame, state):
    # Convert frame to PIL Image
    frame_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(frame_pil)
    
    # Add verification state text
    if state == "success":
        text = "✓ Verified"
        color = (0, 255, 0)  # Green
    elif state == "failure":
        text = "✗ Failed"
        color = (255, 0, 0)  # Red
    else:
        text = "Verifying..."
        color = (255, 255, 0)  # Yellow
    
    font = ImageFont.truetype("Arial.ttf", 40)
    text_width, text_height = draw.textsize(text, font=font)
    
    # Draw semi-transparent background
    draw.rectangle(
        [(frame.shape[1] - text_width - 30, 10), 
         (frame.shape[1] - 10, 10 + text_height + 20)],
        fill=(0, 0, 0, 128)
    )
    
    # Draw text
    draw.text((frame.shape[1] - text_width - 20, 20), 
              text, font=font, fill=color)
    
    # Convert back to OpenCV format
    return cv2.cvtColor(np.array(frame_pil), cv2.COLOR_RGB2BGR)

def eye_aspect_ratio(eye):
    # Compute the euclidean distances between the two sets of
    # vertical eye landmarks (x, y)-coordinates
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    # Compute the euclidean distance between the horizontal
    # eye landmark (x, y)-coordinates
    C = dist.euclidean(eye[0], eye[3])
    # Compute the eye aspect ratio
    ear = (A + B) / (2.0 * C)
    return ear

def check_liveness(frame):
    # Convert frame to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect faces in the grayscale frame
    faces = detector(gray, 0)
    
    if len(faces) == 0:
        return False, "No face detected"
    
    for face in faces:
        # Get facial landmarks using dlib
        shape = predictor(gray, face)
        
        # Extract eye landmarks
        left_eye = []
        right_eye = []
        
        # Left eye landmarks (indices 36-41)
        for i in range(36, 42):
            left_eye.append((shape.part(i).x, shape.part(i).y))
        
        # Right eye landmarks (indices 42-47)
        for i in range(42, 48):
            right_eye.append((shape.part(i).x, shape.part(i).y))
        
        # Calculate eye aspect ratio
        left_ear = eye_aspect_ratio(left_eye)
        right_ear = eye_aspect_ratio(right_eye)
        
        # Average the eye aspect ratio
        ear = (left_ear + right_ear) / 2.0
        
        # Check if eyes are open (EAR > 0.3)
        if ear < 0.3:
            return False, "Eyes are closed"
    
    return True, "Live face detected"

def check_hand_gesture(frame, target_gesture):
    # Convert frame to base64
    _, buffer = cv2.imencode('.jpg', frame)
    frame_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Call Hugging Face API - using a zero-shot image classification model
    API_URL = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32"
    headers = {"Authorization": "Bearer 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"}
    
    # Use our predefined gesture names as candidate labels
    candidate_labels = [gesture['name'] for gesture in HAND_GESTURES]
    
    payload = {
        "inputs": frame_base64,
        "parameters": {
            "candidate_labels": candidate_labels
        }
    }
    
    try:
        # First check if model is ready
        model_status = requests.get(API_URL, headers=headers)
        if model_status.status_code == 503:
            print("Model is loading, please wait...")
            return False, frame
        
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        
        # Process the AI response
        if isinstance(result, list):
            # Sort results by score in descending order
            sorted_results = sorted(result, key=lambda x: x['score'], reverse=True)
            best_match = sorted_results[0]
            
            # Get the target gesture name and best match label
            target_name = target_gesture['name'].lower()
            detected_label = best_match['label'].lower()
            confidence = best_match['score']
            
            # Direct comparison since we're using the same names
            is_match = (target_name == detected_label) and confidence > 0.3
            
            # Add text to the frame showing the result
            cv2.putText(frame, f"Target: {target_gesture['name']}", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, f"Detected: {best_match['label']}", 
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, f"Confidence: {confidence:.2f}", 
                        (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, f"Match: {'Yes' if is_match else 'No'}", 
                        (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Print debug information
            print(f"Target: {target_name}")
            print(f"Detected: {detected_label}")
            print(f"Confidence: {confidence:.2f}")
            print(f"Is Match: {is_match}")
            
            return is_match, frame
        else:
            print("Unexpected API response format:", result)
            return False, frame
        
    except requests.exceptions.RequestException as e:
        print(f"Error calling Hugging Face API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"API Response: {e.response.text}")
        return False, frame
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False, frame

def gen(camera):
    global current_gesture, gesture_start_time, verification_state
    
    while True:
        frame = camera.get_frame()
        if frame is not None:
            # Decode the base64 frame
            frame_bytes = base64.b64decode(frame)
            frame_np = np.frombuffer(frame_bytes, dtype=np.uint8)
            frame_cv = cv2.imdecode(frame_np, cv2.IMREAD_COLOR)
            
            # Add overlays
            if current_gesture and gesture_start_time:
                remaining_time = gesture_duration - (time.time() - gesture_start_time)
                if remaining_time > 0:
                    frame_cv = add_timer_overlay(frame_cv, remaining_time)
                    frame_cv = add_gesture_overlay(frame_cv, current_gesture['name'])
                else:
                    verification_state = "failure"
            
            # Add verification state overlay
            frame_cv = add_verification_overlay(frame_cv, verification_state)
            
            # Encode the frame
            _, buffer = cv2.imencode('.jpg', frame_cv)
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(gen(camera),
                    mimetype='multipart/x-mixed-replace; boundary=frame',
                    headers={
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    })

@app.route('/get_gesture', methods=['GET'])
def get_gesture():
    global current_gesture, gesture_start_time, verification_state, face_verified
    
    # Reset verification state
    verification_state = "waiting"
    face_verified = False
    
    # Select a random hand gesture
    current_gesture = random.choice(HAND_GESTURES)
    gesture_start_time = time.time()
    
    # Get the gesture image if available
    gesture_image = None
    if current_gesture['name'] in hand_gesture_images:
        _, buffer = cv2.imencode('.jpg', hand_gesture_images[current_gesture['name']])
        gesture_image = base64.b64encode(buffer).decode('utf-8')
    
    # Create a simple image showing the gesture description
    img = np.zeros((300, 500, 3), dtype=np.uint8)
    img.fill(255)  # White background
    
    # Add text to the image
    cv2.putText(img, f"Gesture: {current_gesture['name']}", 
                (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    cv2.putText(img, current_gesture['description'], 
                (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # Convert image to base64
    _, buffer = cv2.imencode('.jpg', img)
    description_image = base64.b64encode(buffer).decode('utf-8')
    
    return jsonify({
        "gesture_name": current_gesture["name"],
        "gesture_description": current_gesture["description"],
        "gesture_image": gesture_image,
        "description_image": description_image,
        "gesture_prompt": current_gesture["prompt"],
        "time_limit": gesture_duration
    })

@app.route('/capture', methods=['POST'])
def capture():
    global verification_state, face_verified
    
    success, frame = camera.video.read()
    if not success:
        return jsonify({"verified": False, "error": "Could not capture frame"})

    # Check for liveness first
    is_live, liveness_message = check_liveness(frame)
    if not is_live:
        verification_state = "failure"
        return jsonify({"verified": False, "message": liveness_message})

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_frame)
    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    if not face_encodings:
        verification_state = "failure"
        return jsonify({"verified": False, "message": "No face detected"})

    # Check if face matches known faces
    for face_encoding in face_encodings:
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.4)
        if True in matches:
            face_verified = True
            break

    if not face_verified:
        verification_state = "failure"
        return jsonify({"verified": False, "message": "Face not recognized"})

    # Only proceed with gesture verification if face is verified
    if face_verified:
        # Check if time is up
        if time.time() - gesture_start_time > gesture_duration:
            verification_state = "failure"
            return jsonify({
                "verified": False, 
                "message": "Time's up! Gesture verification failed.",
                "time_up": True
            })

        # Check hand gesture
        is_match, frame = check_hand_gesture(frame, current_gesture)
        if is_match:
            verification_state = "success"
            return jsonify({
                "verified": True, 
                "message": "Verification successful",
                "time_up": False
            })
        else:
            verification_state = "failure"
            return jsonify({
                "verified": False, 
                "message": "Gesture verification failed",
                "time_up": False
            })

def cleanup_resources():
    print("Cleaning up resources...")
    try:
        # Release camera resources
        if camera.video.isOpened():
            camera.video.release()
        
        # Clean up OpenCV windows
        cv2.destroyAllWindows()
        
        # Clean up multiprocessing resources
        import multiprocessing
        multiprocessing.get_context()._cleanup()
        
        # Force garbage collection
        import gc
        gc.collect()
        
    except Exception as e:
        print(f"Error during cleanup: {e}")

def signal_handler(sig, frame):
    print("\nShutting down gracefully...")
    cleanup_resources()
    sys.exit(0)

# Register cleanup handlers
atexit.register(cleanup_resources)
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == '__main__':
    try:
        app.run(debug=True, port=5000, host='0.0.0.0')
    except KeyboardInterrupt:
        print("\nShutting down gracefully...")
        cleanup_resources()
    except Exception as e:
        print(f"Error: {e}")
        cleanup_resources()
    finally:
        cleanup_resources()
