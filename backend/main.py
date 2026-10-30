import base64, json, os, threading
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("KERAS_HOME", os.path.join(os.path.dirname(__file__), ".keras"))
from collections import defaultdict, deque
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "sign_model.keras"
LABELS_PATH = MODEL_DIR / "labels.json"
SEQUENCE_LENGTH = 30
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.75"))

app = FastAPI(title="SignSpeak AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"]
)

HAND_TASK_PATH = MODEL_DIR / "hand_landmarker.task"
HAND_TASK_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

use_legacy_mp = hasattr(mp, "solutions")
tracker = None

if use_legacy_mp:
    mp_hands = mp.solutions.hands
    tracker = mp_hands.Hands(
        static_image_mode=False, max_num_hands=2, model_complexity=1,
        min_detection_confidence=0.5, min_tracking_confidence=0.5
    )
else:
    import urllib.request
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python.core.base_options import BaseOptions

    if not HAND_TASK_PATH.exists():
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        try:
            urllib.request.urlretrieve(HAND_TASK_URL, str(HAND_TASK_PATH))
        except Exception as e:
            print(f"Warning: Failed to download hand landmarker model: {e}")

    if HAND_TASK_PATH.exists():
        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(HAND_TASK_PATH)),
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        tracker = vision.HandLandmarker.create_from_options(options)

tracker_lock = threading.Lock()
windows = defaultdict(lambda: deque(maxlen=SEQUENCE_LENGTH))
model = None
labels = []

def load_model():
    global model, labels
    if LABELS_PATH.exists():
        try:
            labels = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error loading labels: {e}")
            labels = []
    if MODEL_PATH.exists():
        try:
            import tensorflow as tf
            model = tf.keras.models.load_model(MODEL_PATH)
            print(f"Loaded sign model with labels: {labels}")
        except Exception as exc:
            try:
                import keras
                model = keras.models.load_model(MODEL_PATH)
                print(f"Loaded sign model via keras: {labels}")
            except Exception as exc2:
                print(f"Could not load model: {exc} / {exc2}")
                model = None

def extract_features(rgb):
    """Return 126 values: two hands, each 21 landmarks x (x,y,z), and 2D normalized landmark coordinates."""
    hands = {}
    landmarks_2d = {}
    if use_legacy_mp and tracker:
        result = tracker.process(rgb)
        if result.multi_hand_landmarks and result.multi_handedness:
            for hand_lms, handedness in zip(result.multi_hand_landmarks, result.multi_handedness):
                side = handedness.classification[0].label.lower()
                arr = np.array([[p.x, p.y, p.z] for p in hand_lms.landmark], dtype=np.float32)
                hands[side] = arr.flatten()
                landmarks_2d[side] = [[round(float(p.x), 4), round(float(p.y), 4)] for p in hand_lms.landmark]
    elif tracker:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = tracker.detect(mp_image)
        if result.hand_landmarks and result.handedness:
            for hand_lms, handedness_cats in zip(result.hand_landmarks, result.handedness):
                side = handedness_cats[0].category_name.lower()
                arr = np.array([[p.x, p.y, p.z] for p in hand_lms], dtype=np.float32)
                hands[side] = arr.flatten()
                landmarks_2d[side] = [[round(float(p.x), 4), round(float(p.y), 4)] for p in hand_lms]

    # Fixed order left then right; missing hands become zero vectors.
    feature_vec = np.concatenate([
        hands.get("left", np.zeros(63, dtype=np.float32)),
        hands.get("right", np.zeros(63, dtype=np.float32))
    ])
    return feature_vec, len(hands), landmarks_2d

class PredictRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded JPEG or data URL")
    session_id: str = "browser"
    threshold: float | None = None

class ResetRequest(BaseModel):
    session_id: str = "browser"

class SimulateRequest(BaseModel):
    phrase: str
    confidence: float = 0.95

@app.on_event("startup")
def startup():
    load_model()

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "SignSpeak AI Backend",
        "version": "1.0.0",
        "model_loaded": model is not None,
        "labels": labels,
        "labels_count": len(labels),
        "sequence_length": SEQUENCE_LENGTH,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "active_sessions": len(windows)
    }

@app.post("/reset")
def reset(req: ResetRequest):
    windows[req.session_id].clear()
    return {"ok": True, "session_id": req.session_id, "cleared_frames": 0}

@app.post("/simulate")
def simulate(req: SimulateRequest):
    """Utility endpoint to simulate prediction test events for UI demonstration."""
    phrase = req.phrase.strip()
    return {
        "status": "recognized",
        "hands_detected": 2,
        "landmarks": {},
        "recognized": True,
        "phrase": phrase,
        "confidence": round(float(req.confidence), 4),
        "top_predictions": [{"phrase": phrase, "confidence": round(float(req.confidence), 4)}],
        "model_loaded": True,
        "frames_ready": SEQUENCE_LENGTH,
        "required_frames": SEQUENCE_LENGTH,
        "message": f"Simulated sign recognized: {phrase}"
    }

@app.post("/predict")
def predict(req: PredictRequest):
    raw = req.image.split(",", 1)[-1]
    try:
        image_bytes = base64.b64decode(raw)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            return {"status": "error", "message": "Invalid image"}
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        with tracker_lock:
            features, hands_detected, landmarks_2d = extract_features(rgb)
        win = windows[req.session_id]
        win.append(features)
        
        target_threshold = req.threshold if (req.threshold is not None and 0.1 <= req.threshold <= 1.0) else CONFIDENCE_THRESHOLD

        response = {
            "status": "tracking" if hands_detected else "no_hand",
            "hands_detected": hands_detected,
            "landmarks": landmarks_2d,
            "recognized": False,
            "phrase": None,
            "confidence": None,
            "top_predictions": [],
            "model_loaded": model is not None,
            "frames_ready": len(win),
            "required_frames": SEQUENCE_LENGTH,
            "message": "Model not trained. Collect NSL examples and train the model." if model is None else ("Collecting movement sequence..." if len(win) < SEQUENCE_LENGTH else "Analyzing temporal sequence...")
        }
        if model is None:
            return response
        if len(win) < SEQUENCE_LENGTH:
            return response

        batch = np.expand_dims(np.stack(win), axis=0)
        probs = model.predict(batch, verbose=0)[0]
        idx = int(np.argmax(probs))
        confidence = float(probs[idx])
        response["confidence"] = round(confidence, 4)

        # Build top 3 candidate predictions
        top_indices = np.argsort(probs)[::-1][:3]
        top_preds = []
        for rank_idx in top_indices:
            if rank_idx < len(labels):
                top_preds.append({
                    "phrase": labels[rank_idx],
                    "confidence": round(float(probs[rank_idx]), 4)
                })
        response["top_predictions"] = top_preds

        if confidence >= target_threshold and idx < len(labels):
            response.update({
                "recognized": True,
                "phrase": labels[idx],
                "status": "recognized",
                "message": f"Sign recognized: {labels[idx]}"
            })
        else:
            response.update({
                "status": "uncertain",
                "message": f"Sign uncertain (confidence {round(confidence, 2)} < {round(target_threshold, 2)}); please hold or repeat"
            })
        return response
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
