import cv2
import base64

class VideoCamera:
    def __init__(self):
        self.video = cv2.VideoCapture(0)
        if not self.video.isOpened():
            raise Exception("Could not open video device")

    def __del__(self):
        if self.video.isOpened():
            self.video.release()

    def get_frame(self):
        if not self.video.isOpened():
            self.video = cv2.VideoCapture(0)
            if not self.video.isOpened():
                return None

        success, image = self.video.read()
        if not success:
            return None

        # Resize the frame to a smaller size for better performance
        image = cv2.resize(image, (640, 480))
        
        # Convert to JPEG and then to base64
        ret, jpeg = cv2.imencode('.jpg', image)
        if not ret:
            return None

        # Convert to base64
        frame_base64 = base64.b64encode(jpeg.tobytes()).decode('utf-8')
        return frame_base64
