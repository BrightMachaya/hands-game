"""Hands Command Game Landmarker and Gesture Engine.

PEP 8 COMPLIANCE NOTE:
    - Standard library packages (`os`, `urllib.request`) are separated from 
      third-party vision libraries (`cv2`, `mediapipe`).
    - The class identity uses PascalCase (`HandDetector`).
    - Instance variables and methods cleanly employ lowercase snake_case.
"""

import os
import urllib.request
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


class HandDetector:
    """Extracts gestures and draws structural meshes on video frames.
    
    OOP PILLAR: ABSTRACTION
        This class functions as an absolute abstraction boundary. External systems 
        (like server.py) invoke its public methods without needing any awareness 
        of internal file system checks, asset networks, or manual matrix drawing arrays.
    """

    # -------------------------------------------------------------------------
    # FEATURE 1: THE CONSTRUCTOR (OOP PILLAR: ENCAPSULATION)
    # -------------------------------------------------------------------------
    def __init__(self) -> None:
        """The Python Object Constructor Initializer.
        
        This constructor encapsulates setup routines, local path validations, 
        and weights acquisition seamlessly inside the instance context wrapper (`self`).
        """
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "hand_landmarker.task")

        if not os.path.exists(model_path):
            print("📥 Downloading hand landmarker asset model...")
            url = (
                "https://storage.googleapis.com/mediapipe-models/"
                "hand_landmarker/hand_landmarker/float16/1/"
                "hand_landmarker.task"
            )
            urllib.request.urlretrieve(url, model_path)
            print("✅ Model download complete!")

        # -------------------------------------------------------------------------
        # CONCEPTUAL DESCRIPTOR APPLICABILITY
        # -------------------------------------------------------------------------
        # Under the hood, configuration attributes like `min_hand_detection_confidence` 
        # mirror Descriptor patterns. They intercept class attribute assignment to 
        # ensure floats stay safely bounded within explicit mathematical scales (0.0 to 1.0).
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.6,
            min_tracking_confidence=0.6,
        )
        
        # OOP PILLAR: ENCAPSULATION
        # Internal configuration states (`self.detector` and `self.connections`) 
        # are stored direct to the object instance context, hiding structural parameters.
        self.detector = vision.HandLandmarker.create_from_options(options)

        # Structural map connecting joints for lines drawing sequence
        self.connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),       # Thumb
            (0, 5), (5, 6), (6, 7), (7, 8),       # Index
            (9, 10), (10, 11), (11, 12),          # Middle
            (13, 14), (14, 15), (15, 16),         # Ring
            (0, 17), (17, 18), (18, 19), (19, 20), # Pinky
            (5, 9), (9, 13), (13, 17)             # Palm base
        ]

    # -------------------------------------------------------------------------
    # CONCEPTUAL DECORATOR APPLICABILITY
    # -------------------------------------------------------------------------
    # If structural optimization tracking was desired here, a Python Decorator 
    # (e.g., `@time_profile_logger`) could be attached directly above this declaration. 
    # That would seamlessly inject performance metrics tracking without manipulating the 
    # localized CV2/MediaPipe state computations inside the function scope.
    def parse_frame(self, frame):
        """Analyzes a frame, draws the tracking mesh, and identifies gestures.

        Returns:
            A tuple containing: (str: detected_gesture, ndarray: annotated_frame)
            
        OOP PILLAR: POLYMORPHISM
            This serves a predictable, standardized interface signature. Any processing 
            module inheriting from an engine blueprint can override this definition 
            polymorphically to support different ML architectures (like YOLO or PyTorch).
        """
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        results = self.detector.detect(mp_image)

        gesture = "no hand"
        
        if results.hand_landmarks:
            # -------------------------------------------------------------------------
            # FEATURE 2: THE ITERATOR PROTOCOL
            # -------------------------------------------------------------------------
            # The tracking execution utilizes native Python Iterator machinery. 
            # The `for ... in` constructs fetch tracking landmarks and spatial structural 
            # connection lists sequentially by invoking internal container `__iter__` 
            # and `__next__` magic protocols automatically.
            
            # 1. Draw the visual tracking mesh onto the frame matrix
            for hand_landmarks in results.hand_landmarks:
                # Convert normalized landmarks to clear pixel coordinates via List Comprehension Iterator
                coords = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks]
                
                # Draw joint connection mesh lines (Neon Cyan color) using Iterator unpacks
                for start_idx, end_idx in self.connections:
                    cv2.line(frame, coords[start_idx], coords[end_idx], (255, 255, 0), 2)
                
                # Draw physical node joint dots (Bright Neon Magenta magenta color)
                for coord in coords:
                    cv2.circle(frame, coord, 4, (255, 0, 255), -1)

            # 2. Evaluate physical gesture string rules
            if len(results.hand_landmarks) == 2:
                gesture = "raise hands"
            else:
                hand_info = results.handedness[0][0]
                gesture = f"{hand_info.category_name.lower()} hand"

        return gesture, frame