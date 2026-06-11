import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request
import os

# Download the model if it doesn't exist
model_path = "hand_landmarker.task"
if not os.path.exists(model_path):
    print("Downloading hand landmarker model...")
    url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    urllib.request.urlretrieve(url, model_path)
    print("Download complete!")

# Initialize the detector
base_options = python.BaseOptions(model_asset_path=model_path)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_hands=2,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5,
)

detector = vision.HandLandmarker.create_from_options(options)

# Start webcam
cap = cv2.VideoCapture(0)
timestamp_ms = 0

print("Game Ready! Raise your hands or put them down...")
print("Press 'q' to quit")

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        continue
    
    # Flip horizontally for mirror view
    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    
    # Detect hands
    detection_result = detector.detect_for_video(mp_image, timestamp_ms)
    timestamp_ms += 33
    
    # Determine hand positions
    hand_status = "No Hands Detected"
    hand_count = 0
    
    if detection_result.hand_landmarks:
        hand_count = len(detection_result.hand_landmarks)
        # Get wrist Y position (landmark 0) of first hand
        wrist_y = detection_result.hand_landmarks[0][0].y
        
        if wrist_y < 0.45:
            hand_status = "🖐️ HANDS UP!"
        elif wrist_y < 0.7:
            hand_status = "🤚 HANDS MIDDLE"
        else:
            hand_status = "✋ HANDS DOWN"
    
    # Display on screen
    cv2.putText(frame, hand_status, (50, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
    cv2.putText(frame, f"Hands: {hand_count}", (50, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    
    cv2.imshow('Hands Up/Down Game', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
detector.close()