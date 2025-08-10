import cv2
import numpy as np

def create_gesture_image(name, points):
    # Create a white image
    img = np.ones((400, 400, 3), dtype=np.uint8) * 255
    
    # Draw hand outline
    cv2.rectangle(img, (50, 50), (350, 350), (0, 0, 0), 2)
    
    # Draw dots for key points
    for point in points:
        cv2.circle(img, point, 10, (0, 0, 255), -1)  # Red dots
    
    # Save the image
    cv2.imwrite(f"hand_gestures/{name}.jpg", img)

# Define key points for each gesture
# Format: (x, y) coordinates
gestures = {
    "peace": [
        (100, 100),  # Thumb base
        (150, 100),  # Thumb tip
        (200, 100),  # Index finger base
        (200, 50),   # Index finger tip
        (250, 100),  # Middle finger base
        (250, 50),   # Middle finger tip
        (300, 100),  # Ring finger base
        (300, 150),  # Ring finger tip
        (350, 100),  # Pinky base
        (350, 150)   # Pinky tip
    ],
    "thumbs_up": [
        (100, 100),  # Thumb base
        (150, 50),   # Thumb tip
        (200, 100),  # Index finger base
        (200, 150),  # Index finger tip
        (250, 100),  # Middle finger base
        (250, 150),  # Middle finger tip
        (300, 100),  # Ring finger base
        (300, 150),  # Ring finger tip
        (350, 100),  # Pinky base
        (350, 150)   # Pinky tip
    ],
    "ok": [
        (100, 100),  # Thumb base
        (150, 150),  # Thumb tip
        (200, 100),  # Index finger base
        (200, 150),  # Index finger tip
        (250, 100),  # Middle finger base
        (250, 150),  # Middle finger tip
        (300, 100),  # Ring finger base
        (300, 150),  # Ring finger tip
        (350, 100),  # Pinky base
        (350, 150)   # Pinky tip
    ],
    "rock": [
        (100, 100),  # Thumb base
        (150, 100),  # Thumb tip
        (200, 100),  # Index finger base
        (200, 50),   # Index finger tip
        (250, 100),  # Middle finger base
        (250, 150),  # Middle finger tip
        (300, 100),  # Ring finger base
        (300, 150),  # Ring finger tip
        (350, 100),  # Pinky base
        (350, 50)    # Pinky tip
    ]
}

# Create images for each gesture
for name, points in gestures.items():
    create_gesture_image(name, points) 