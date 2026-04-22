# Humanity Protocol — Quick Start

## Running the App

### 1. Start the Flask Backend (Terminal 1)
```bash
cd backend
python app.py
# → Running at http://localhost:5000
```

### 2. Start the React Frontend (Terminal 2)
```bash
cd frontend-react
npm run dev
# → Running at http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## Architecture
- **Backend:** Flask (Python) on port 5000
- **Frontend:** React + Vite on port 5173
- **Proxy:** Vite proxies `/api/*` → Flask (`http://localhost:5000`)

## Protocol
7-step **HUMANITY-PROTOCOL (HP)**:
1. Auth init (send User ID + RSA public key)
2. Receive encrypted cryptographic challenge
3. Sign nonce with RSA-PSS private key
4. Receive randomised biometric challenge
5. Capture webcam + MediaPipe FaceMesh landmarks
6. Server verifies liveness + deepfake detection
7. Session token issued (SHA-256 hashed)
