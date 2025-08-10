# Face Recognition and Liveness Detection System

This project implements a face recognition system with liveness detection and hand gesture recognition capabilities.

## Features
- Face recognition using dlib and face-recognition libraries
- Liveness detection using eye blink detection
- Hand gesture recognition using Hugging Face's CLIP model
- Web interface using Flask
- Real-time video processing

## Setup Instructions

### 1. System Requirements
- Python 3.8 or higher
- Webcam
- Internet connection (for Hugging Face API)

### 2. Installation

#### For Ubuntu/Debian:
```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install build-essential cmake
sudo apt-get install libopenblas-dev liblapack-dev
sudo apt-get install libx11-dev libgtk-3-dev
sudo apt-get install python3-dev python3-pip

# Install Python dependencies
pip install -r requirements.txt
```

#### For macOS:
```bash
# Install system dependencies
brew install cmake
brew install openblas
brew install dlib

# Install Python dependencies
pip install -r requirements.txt
```

#### For Windows:
```bash
# Install Python dependencies
pip install -r requirements.txt
```

### 3. Download Required Models
1. Download the facial landmark predictor:
```bash
wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
bunzip2 shape_predictor_68_face_landmarks.dat.bz2
```

2. Place the downloaded file in the project root directory.

### 4. Environment Variables
Create a `.env` file in the project root with your Hugging Face API token:
```
HUGGING_FACE_API_TOKEN=your_api_token_here
```

### 5. Running the Application
```bash
python face.py
```

The application will be available at `http://localhost:5000`

## Project Structure
```
.
├── face.py              # Main application file
├── requirements.txt     # Python dependencies
├── README.md           # This file
├── hand_gestures/      # Directory for gesture images
└── shape_predictor_68_face_landmarks.dat  # Facial landmark predictor
```

## Usage
1. Open the web interface at `http://localhost:5000`
2. Allow camera access when prompted
3. Follow the on-screen instructions for face recognition and gesture detection

## Notes
- Make sure you have a good lighting condition for better face recognition
- Keep your face within the frame and maintain eye contact with the camera
- For hand gestures, ensure your hand is clearly visible and well-lit

## Troubleshooting
- If you encounter issues with dlib installation, try installing it using conda:
  ```bash
  conda install -c conda-forge dlib
  ```
- For webcam issues, try using a different camera or check camera permissions
- If the application runs slowly, try reducing the video frame size in the code 


in terminal _______ sahil baby ________ 😘

   # 1. Install system dependencies (as per README.md)
   # 2. Create a virtual environment (recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # 3. Install Python dependencies
   pip install -r requirements.txt

   # 4. Create .env file with your Hugging Face API token
   echo "HUGGING_FACE_API_TOKEN=your_api_token_here" > .env

   # 5. Run the application
   python face.py