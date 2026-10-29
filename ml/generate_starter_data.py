"""
Generate a structured starter dataset of 30-frame x 126-feature landmark sequences
for testing the temporal LSTM sign recognition pipeline.
Classes: hello, thank_you, yes, no, help_me, water, goodbye
"""

import os
from pathlib import Path
import numpy as np

LABELS = ["hello", "thank_you", "yes", "no", "help_me", "water", "goodbye"]
SAMPLES_PER_CLASS = 45
SEQUENCE_LENGTH = 30
FEATURES = 126  # 63 left hand + 63 right hand

# Base hand skeleton templates (21 points x 3 coordinates)
def base_hand(origin_x=0.5, origin_y=0.5, origin_z=0.0, scale=0.15):
    # Normalized 21 points of hand: wrist at [0], thumb 1-4, index 5-8, middle 9-12, ring 13-16, pinky 17-20
    lms = np.zeros((21, 3), dtype=np.float32)
    lms[0] = [origin_x, origin_y, origin_z] # wrist
    # Finger offsets from wrist
    finger_offsets = [
        # Thumb
        [[0.02, -0.04, 0.0], [0.04, -0.07, -0.01], [0.06, -0.09, -0.02], [0.08, -0.11, -0.03]],
        # Index
        [[0.02, -0.07, -0.01], [0.03, -0.12, -0.02], [0.03, -0.16, -0.02], [0.03, -0.20, -0.02]],
        # Middle
        [[0.0, -0.07, -0.01], [0.0, -0.13, -0.02], [0.0, -0.18, -0.02], [0.0, -0.22, -0.02]],
        # Ring
        [[-0.02, -0.07, -0.01], [-0.02, -0.12, -0.02], [-0.02, -0.16, -0.02], [-0.02, -0.19, -0.02]],
        # Pinky
        [[-0.04, -0.06, -0.01], [-0.05, -0.10, -0.02], [-0.05, -0.13, -0.02], [-0.05, -0.16, -0.02]],
    ]
    idx = 1
    for f in finger_offsets:
        for pt in f:
            lms[idx] = lms[0] + np.array(pt, dtype=np.float32) * (scale / 0.15)
            idx += 1
    return lms

def make_sequence(label, seed):
    np.random.seed(seed)
    seq = np.zeros((SEQUENCE_LENGTH, FEATURES), dtype=np.float32)
    # Temporal phase 0 to 1
    t = np.linspace(0, 1, SEQUENCE_LENGTH)
    
    # Random signer variation
    noise_level = np.random.uniform(0.005, 0.015)
    speed_factor = np.random.uniform(0.85, 1.15)
    pos_jitter_x = np.random.uniform(-0.04, 0.04)
    pos_jitter_y = np.random.uniform(-0.04, 0.04)
    
    for i, step in enumerate(t):
        left_h = np.zeros((21, 3), dtype=np.float32)
        right_h = np.zeros((21, 3), dtype=np.float32)
        
        if label == "hello":
            # Right hand waving in upper right quadrant (x: ~0.65 to 0.75, y: ~0.3)
            wave_x = 0.70 + pos_jitter_x + 0.06 * np.sin(speed_factor * 2 * np.pi * 2.5 * step)
            wave_y = 0.32 + pos_jitter_y + 0.02 * np.cos(speed_factor * 2 * np.pi * 1.0 * step)
            right_h = base_hand(wave_x, wave_y, -0.1)
            
        elif label == "goodbye":
            # Right hand waving higher and broader
            wave_x = 0.68 + pos_jitter_x + 0.09 * np.sin(speed_factor * 2 * np.pi * 3.0 * step)
            wave_y = 0.25 + pos_jitter_y + 0.01 * np.cos(speed_factor * 2 * np.pi * 1.5 * step)
            right_h = base_hand(wave_x, wave_y, -0.05, scale=0.17)
            
        elif label == "thank_you":
            # Hand moving from chin forward towards other person (y moves from 0.45 down to 0.58, z moves from -0.1 to -0.3)
            ty_x = 0.55 + pos_jitter_x
            ty_y = 0.42 + 0.16 * step + pos_jitter_y
            ty_z = -0.05 - 0.22 * step
            right_h = base_hand(ty_x, ty_y, ty_z)
            
        elif label == "yes":
            # Right hand fist nodding up and down repeatedly
            yes_x = 0.60 + pos_jitter_x
            yes_y = 0.45 + pos_jitter_y + 0.08 * np.sin(speed_factor * 2 * np.pi * 2.0 * step)
            right_h = base_hand(yes_x, yes_y, -0.15, scale=0.11)
            
        elif label == "no":
            # Two fingers snapping together horizontally near chest
            no_x = 0.58 + pos_jitter_x + 0.03 * np.cos(speed_factor * 2 * np.pi * 1.5 * step)
            no_y = 0.48 + pos_jitter_y
            right_h = base_hand(no_x, no_y, -0.12, scale=0.13)
            
        elif label == "water":
            # Hand tapping chin (y oscillating sharply between 0.38 and 0.44)
            w_x = 0.52 + pos_jitter_x
            w_y = 0.40 + pos_jitter_y + 0.04 * np.abs(np.sin(speed_factor * 2 * np.pi * 3.0 * step))
            right_h = base_hand(w_x, w_y, -0.08, scale=0.14)
            
        elif label == "help_me":
            # Two hands involved: left palm base (flat), right fist resting on it and moving upward
            lift = 0.10 * step
            left_h = base_hand(0.42 + pos_jitter_x, 0.60 - lift + pos_jitter_y, -0.15, scale=0.15)
            right_h = base_hand(0.45 + pos_jitter_x, 0.52 - lift + pos_jitter_y, -0.18, scale=0.12)

        # Add Gaussian jitter
        if np.any(left_h):
            left_h += np.random.normal(0, noise_level, left_h.shape)
        if np.any(right_h):
            right_h += np.random.normal(0, noise_level, right_h.shape)
            
        seq[i] = np.concatenate([left_h.flatten(), right_h.flatten()])
        
    return seq

def main():
    root = Path(__file__).resolve().parent.parent
    dataset_dir = root / "dataset"
    dataset_dir.mkdir(parents=True, exist_ok=True)
    print(f"Generating starter dataset in: {dataset_dir}")
    
    total = 0
    for l_idx, label in enumerate(LABELS):
        label_dir = dataset_dir / label
        label_dir.mkdir(parents=True, exist_ok=True)
        for s in range(SAMPLES_PER_CLASS):
            seed = l_idx * 1000 + s
            arr = make_sequence(label, seed)
            file_path = label_dir / f"{label}_{s:04d}.npy"
            np.save(file_path, arr)
            total += 1
        print(f"  Generated {SAMPLES_PER_CLASS} samples for '{label}'")
        
    print(f"Successfully generated {total} sample sequences across {len(LABELS)} classes.")

if __name__ == "__main__":
    main()
