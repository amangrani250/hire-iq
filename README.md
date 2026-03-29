# 🎙️ HireIQ — AI-Powered Interview Platform

A real-time AI interviewer that works like Zoom/Google Meet.  
Upload your resume → get a personalized technical interview → hear a realistic human-sounding interviewer.

---

## ✨ Features

| Feature | How it works |
|---|---|
| **Resume parsing** | PDF/TXT extracted server-side (PyPDF2) |
| **AI Interviewer "Alex"** | Groq LLaMA-3 70B (free) or OpenAI GPT-4o-mini |
| **Realistic voice** | ElevenLabs → OpenAI TTS → edge-tts (all free fallbacks) |
| **Speech-to-text** | Groq Whisper-large-v3 (free) or OpenAI Whisper |
| **Real-time comms** | WebSocket (FastAPI) |
| **Video call UI** | React — Zoom-style tiles, controls, transcript panel |
| **Auto voice activity** | Silence detection starts/stops recording automatically |

---

## 🔑 API Keys (free options)

| Service | Where to get | Cost |
|---|---|---|
| **Groq** (LLM + STT) | https://console.groq.com | **Free** — generous limits |
| **ElevenLabs** (TTS) | https://elevenlabs.io | Free tier (10k chars/mo) |
| **OpenAI** (optional) | https://platform.openai.com | Paid, fallback only |

**Minimum requirement:** Just a free Groq API key is enough to run everything.  
edge-tts handles voice for free with no key needed.

---

## 🚀 Quick Start

### 1. Clone / unzip
```bash
cd ai-interviewer
```

### 2. Backend setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill .env
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start backend
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs at: http://localhost:8000/docs

### 3. Frontend setup
```bash
# In a new terminal
cd frontend

npm install
npm start
```

Frontend runs at: http://localhost:3000

---

## 🐳 Docker (optional)

```bash
# From project root
docker-compose up --build
```

---

## 📁 Project Structure

```
ai-interviewer/
├── backend/
│   ├── main.py              ← FastAPI app, WebSocket, TTS, STT, LLM
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.js           ← Screen router
        ├── components/
        │   ├── UploadScreen.js    ← Resume drop zone
        │   ├── InterviewRoom.js   ← Zoom-style call UI
        │   ├── VideoTile.js       ← Participant tiles
        │   ├── TranscriptPanel.js ← Live captions
        │   ├── ControlBar.js      ← Mic/cam/end controls
        │   └── EndScreen.js       ← Post-interview screen
        └── hooks/
            ├── useAudioRecorder.js   ← VAD + MediaRecorder
            └── useInterviewSocket.js ← WebSocket + audio queue
```

---

## 🎛️ How the interview works

1. **Upload resume** → backend extracts text, creates a session, extracts candidate info
2. **WebSocket opens** → AI generates a personalized greeting from resume context
3. **Auto recording** — silence detection listens when interviewer is done speaking
4. **You speak** → audio sent to Whisper STT → text sent to LLaMA/GPT → response spoken via TTS
5. **Transcript panel** — every message from both sides is shown live
6. **End call** → AI gives a warm closing statement → End screen

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | **Required** — LLM + STT |
| `OPENAI_API_KEY` | — | Optional fallback |
| `ELEVENLABS_API_KEY` | — | Better voice quality |
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend URL for frontend |

---

## 🔊 Voice quality tiers

| Tier | TTS engine | Quality | Cost |
|---|---|---|---|
| Best | ElevenLabs (Rachel voice) | ★★★★★ | Free tier |
| Good | OpenAI TTS (Nova) | ★★★★ | ~$0.015/1k chars |
| Free | edge-tts (Jenny Neural) | ★★★ | Completely free |

---

## 🛠️ Tech Stack

**Backend:** Python 3.11, FastAPI, WebSockets, PyPDF2, httpx, edge-tts  
**Frontend:** React 18, Lucide React  
**AI:** Groq LLaMA-3-70B, Groq Whisper-large-v3, edge-tts  
**Protocols:** REST (resume upload), WebSocket (real-time interview)

---

## 📝 Troubleshooting

**Mic not working?**  
→ Allow microphone permissions in browser. Chrome/Edge work best.

**CORS errors?**  
→ Make sure backend is running on port 8000. Check `REACT_APP_API_URL` in frontend.

**No audio from interviewer?**  
→ Check your API key. edge-tts fallback requires `pip install edge-tts`. Try `pip install edge-tts --upgrade`.

**"Session not found" on WS?**  
→ Upload the resume first — session is created on upload.
