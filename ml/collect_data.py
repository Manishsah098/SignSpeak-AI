import argparse, os, time
from pathlib import Path
import cv2
import mediapipe as mp
import numpy as np

LENGTH = 30
ROOT = Path(__file__).resolve().parent.parent
HAND_TASK_PATH = ROOT / "backend" / "models" / "hand_landmarker.task"

use_legacy = hasattr(mp, "solutions")

def get_tracker():
    if use_legacy:
        return mp.solutions.hands.Hands(
            max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5
        )
    else:
        from mediapipe.tasks.python import vision
        from mediapipe.tasks.python.core.base_options import BaseOptions
        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(HAND_TASK_PATH)),
            num_hands=2, min_hand_detection_confidence=0.5, min_tracking_confidence=0.5
        )
        return vision.HandLandmarker.create_from_options(options)

def process_frame(tracker, rgb):
    hands = {}
    if use_legacy:
        res = tracker.process(rgb)
        if res.multi_hand_landmarks and res.multi_handedness:
            for lm, handedness in zip(res.multi_hand_landmarks, res.multi_handedness):
                side = handedness.classification[0].label.lower()
                hands[side] = np.array([[p.x, p.y, p.z] for p in lm.landmark], dtype=np.float32).flatten()
    else:
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = tracker.detect(mp_img)
        if res.hand_landmarks and res.handedness:
            for lm, h_cats in zip(res.hand_landmarks, res.handedness):
                side = h_cats[0].category_name.lower()
                hands[side] = np.array([[p.x, p.y, p.z] for p in lm], dtype=np.float32).flatten()
    return np.concatenate([hands.get("left", np.zeros(63, np.float32)),
                          hands.get("right", np.zeros(63, np.float32))])

def main():
    parser = argparse.ArgumentParser(description="Collect landmark-only temporal samples for one sign class.")
    parser.add_argument("--label", required=True, help="Canonical label, e.g. thank_you")
    parser.add_argument("--samples", type=int, default=50)
    parser.add_argument("--seconds", type=float, default=2.0)
    parser.add_argument("--out", default="dataset")
    args = parser.parse_args()
    out = Path(args.out) / args.label
    out.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise SystemExit("Could not open webcam.")

    tracker = get_tracker()
    sample = 0
    print("Press SPACE to record a sample, q to quit. Each sample lasts the configured seconds.")
    try:
        while sample < args.samples:
            ok, frame = cap.read()
            if not ok: break
            cv2.putText(frame, f"Label: {args.label} | Samples: {sample}/{args.samples} | SPACE=record q=quit",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)
            cv2.imshow("SignSpeak dataset collector", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'): break
            if key == 32:
                sequence = []
                end = time.time() + args.seconds
                while time.time() < end and len(sequence) < LENGTH:
                    ok, frame = cap.read()
                    if not ok: break
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    sequence.append(process_frame(tracker, rgb))
                    cv2.putText(frame, f"Recording {len(sequence)}/{LENGTH}", (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                    cv2.imshow("SignSpeak dataset collector", frame)
                    cv2.waitKey(1)
                if len(sequence) == LENGTH:
                    np.save(out / f"{args.label}_{sample:04d}.npy", np.stack(sequence))
                    sample += 1
                    print(f"Saved {sample}/{args.samples}")
                else:
                    print("Incomplete sequence discarded. Try again.")
    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
