# SignSpeak AI — NSL Sign-to-Voice (Starter Project)

An advanced, trainable prototype for real-time sign-to-text-to-speech. It includes a responsive web/PWA interface, FastAPI backend, MediaPipe hand tracking, temporal LSTM training pipeline, dataset collection tool, and browser speech synthesis in English, Nepali, or Hindi.

## Important limitation
This is **not a pretrained Nepali Sign Language (NSL) translator**. There is no bundled validated NSL model or dataset. NSL signs must be collected/labeled with fluent signers or sourced from a properly licensed, representative dataset. Until you train a model, the UI can show hand-tracking status but will label phrase recognition as unavailable. Do not present untrained signs as recognized. This starter uses hand landmarks; real NSL translation may also need body pose, facial expression, two-hand coordination, and sign-language grammar.

## Requirements
- Python 3.10 or 3.11 recommended
- Node.js 20+ and npm
- Webcam
- For model training: TensorFlow-compatible Python environment and labeled sequences

## 1) Start backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend docs: http://localhost:8000/docs

## 2) Start web app
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173). Allow camera access. Camera access requires localhost or HTTPS.

## 3) Collect labeled training sequences
Collect one label per take, in a consistent camera setup. Labels should be short canonical classes such as `hello`, `thank_you`, `welcome`, `sorry`, `help_me`, `emergency_help`, `water`, `yes`, `no`, `goodbye`. Use a fluent NSL signer and multiple people, backgrounds, lighting conditions, and camera distances. Get consent and avoid storing identifiable footage; the collector stores only landmark sequences.

```bash
cd ml
pip install -r requirements.txt
python collect_data.py --label hello --samples 100 --seconds 2 --out ../dataset
python collect_data.py --label thank_you --samples 100 --seconds 2 --out ../dataset
# repeat for every label; each command writes into dataset/
```
Press `q` to stop early. Each sample is a sequence of 30 frames × 126 hand-landmark features (two hands, 21 points × xyz each). Missing hands are zero-filled. This baseline is hand-only and may not distinguish signs requiring facial/body information.

## 4) Train model
From project root:
```bash
python ml/train_model.py --data dataset --output backend/models/sign_model.keras
```
The script saves a model and `labels.json`. Use a subject-independent test set for meaningful evaluation; the starter's random split is only a quick smoke test and can overestimate real-world performance when samples from the same signer are mixed.

Copy the generated `labels.json` to `backend/models/labels.json` if your training script ran from the project root (the script also attempts to save it alongside the model). Restart backend after training.

## 5) Mobile use
The frontend is responsive and can be installed as a PWA from a supported mobile browser. On a phone, open the frontend using your computer's LAN IP and configure `VITE_API_URL` to `http://COMPUTER_LAN_IP:8000`; both devices must be on the same network, and camera access on a non-localhost origin generally requires HTTPS. For production/mobile deployment, use HTTPS and a hosted backend. This is not a native Android/iOS package yet.

## What works before training?
- Live webcam capture
- MediaPipe hand landmark detection via backend
- Prediction API and explicit “model not trained” state
- Browser speech synthesis after a recognized phrase is returned
- Dataset collection and temporal model training pipeline

## Model and confidence behavior
The backend only returns a recognized label when a trained model exists and its maximum softmax score reaches `CONFIDENCE_THRESHOLD` (default 0.75). Otherwise it returns `uncertain`; it never pretends an unknown sign was recognized. Tune this threshold on a held-out validation set.

## API
- `GET /health`
- `POST /predict` with `{"image":"<base64 JPEG>","session_id":"browser"}`
- `POST /reset` with `{"session_id":"browser"}`

## Responsible use
This is an assistive prototype, not a substitute for qualified interpreters or emergency services. Emergency phrases should be tested carefully with NSL signers. Never rely on an unvalidated model for emergency communication.
