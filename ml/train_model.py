import argparse, json, os
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
from pathlib import Path
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="dataset")
    parser.add_argument("--output", default="backend/models/sign_model.keras")
    parser.add_argument("--epochs", type=int, default=35)
    args = parser.parse_args()
    data_dir = Path(args.data)
    X, y = [], []
    labels = sorted(p.name for p in data_dir.iterdir() if p.is_dir())
    if len(labels) < 2:
        raise SystemExit("Need at least two label folders, each containing .npy sequences.")
    for label in labels:
        for path in (data_dir / label).glob("*.npy"):
            arr = np.load(path)
            if arr.shape == (30, 126):
                X.append(arr.astype(np.float32)); y.append(labels.index(label))
    if len(X) < 20:
        raise SystemExit(f"Only {len(X)} valid sequences found. Collect more samples first.")
    X = np.asarray(X); y = np.asarray(y)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(30, 126)),
        tf.keras.layers.Masking(mask_value=0.0),
        tf.keras.layers.LSTM(96, return_sequences=True),
        tf.keras.layers.Dropout(0.25),
        tf.keras.layers.LSTM(64),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(0.25),
        tf.keras.layers.Dense(len(labels), activation="softmax")
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(X_train, y_train, validation_split=0.15, epochs=args.epochs, batch_size=16,
              callbacks=[tf.keras.callbacks.EarlyStopping(patience=6, restore_best_weights=True)],
              verbose=1)
    pred = np.argmax(model.predict(X_test, verbose=0), axis=1)
    print(classification_report(y_test, pred, labels=range(len(labels)), target_names=labels, zero_division=0))
    print("Confusion matrix:\n", confusion_matrix(y_test, pred))
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    model.save(out)
    (out.parent / "labels.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved model: {out}\nSaved labels: {out.parent / 'labels.json'}")
    print("Warning: random split can leak signer/background information. For honest evaluation, split by signer.")

if __name__ == "__main__":
    main()
