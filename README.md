# 🎙️ HireIQ — AI-Powered Interview Platform

A real-time AI interviewer that works like Zoom/Google Meet.  
Upload your resume → get a personalized technical interview → hear a realistic human-sounding interviewer.

---

## ✨ Features

| Feature | How it works |
|---|---|
| **Resume parsing** | PDF and Word (.docx) extracted server-side |
| **AI Interviewer "Aira"** | GPT-OSS 120B for live turns, Qwen 3.8 27B for analysis (Groq) |
| **One question at a time** | A pre-generated, verified question plan; Aira never asks several questions in one turn |
| **Per-answer evaluation** | Every answer is scored against a rubric, with explicit correction when it is wrong or incomplete |
| **Question progress** | Live "Question X of Y" indicator and a verdict badge in the transcript |
| **Voice + text answers** | Speak naturally, or type an answer from the transcript panel when a mic is unavailable |
| **Realistic voice** | ElevenLabs → OpenAI TTS → gTTS (free fallback) |
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
gTTS handles voice for free with no key needed.

---

## 🚀 Quick Start

### 1. Clone / unzip
```bash
cd ai-interviewer
```

### 2. Backend setup
```bash
cd backend

# Requires Python 3.15+
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
Health check at: http://localhost:8000/health

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
2. **Question plan** → Aira prepares a small set of self-contained questions with reference answers, then a second model verifies them for correctness before the call
3. **WebSocket opens** → Aira greets you and asks exactly one question
4. **You answer** → speech-to-text (or the transcript text box) sends the answer to the evaluator
5. **Aira evaluates** → the answer is scored against the rubric. Correct answers move on; wrong answers get the correct explanation before the next question. Vague answers get one focused probe
6. **Progress** → the transcript shows a verdict/score badge and the header shows "Question X of Y"
7. **End call** → the report uses the per-question evaluation record, not just the raw transcript

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | **Required** — LLM + STT |
| `GROQ_MODEL_INTERVIEW` | `openai/gpt-oss-120b` | Live interview turns |
| `GROQ_MODEL_ANALYSIS` | `qwen/qwen3.8-27b` | Resume profile + ATS JSON |
| `GROQ_MODEL_RESUME` | `qwen/qwen3.8-27b` | Resume generation / rewriting |
| `GROQ_MODEL_FEEDBACK` | `openai/gpt-oss-120b` | Closing message + feedback report |
| `GROQ_FALLBACK_MODELS` | `openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b` | Automatic fallbacks |
| `GROQ_STT_MODEL` | `whisper-large-v3` | Speech-to-text model |

### Model routing

| Task | Model | Why |
|---|---|---|
| Live interview turns | `openai/gpt-oss-120b` | Best reasoning and instruction-following for follow-up questions |
| Resume profile + ATS | `qwen/qwen3.8-27b` | Fast and reliable structured JSON |
| Resume generation / rewriting | `qwen/qwen3.8-27b` | Good writing quality with predictable JSON |
| Closing message + feedback report | `openai/gpt-oss-120b` | Highest-quality post-interview review |
| Speech-to-text | `whisper-large-v3` | Accuracy-first; set to `whisper-large-v3-turbo` for speed |

If a model is retired or unavailable, the backend automatically tries
`openai/gpt-oss-120b` → `qwen/qwen3.8-27b` → `openai/gpt-oss-20b`.
| `OPENAI_API_KEY` | — | Optional fallback |
| `ELEVENLABS_API_KEY` | — | Better voice quality |
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend URL for frontend |

---

## 🔊 Voice quality tiers

| Tier | TTS engine | Quality | Cost |
|---|---|---|---|
| Best | ElevenLabs (Rachel voice) | ★★★★★ | Free tier |
| Good | OpenAI TTS (Nova) | ★★★★ | ~$0.015/1k chars |
| Free | gTTS | ★★★ | Completely free |

---

## 🛠️ Tech Stack

**Backend:** Python 3.15+, FastAPI, WebSockets, pypdf, python-docx, httpx  
**Frontend:** React 18, Lucide React  
**AI:** GPT-OSS 120B for live interviews, Qwen 3.8 27B for resume analysis/writing, Groq Whisper for STT, gTTS  
**Protocols:** REST (resume upload), WebSocket (real-time interview)

---

## 📝 Troubleshooting

**Mic not working?**  
→ Allow microphone permissions in browser. Chrome/Edge work best.

**CORS errors?**  
→ Make sure backend is running on port 8000. Check `REACT_APP_API_URL` in frontend.

**No audio from interviewer?**  
→ Check your API key. The gTTS fallback is installed with the backend requirements.

**"Session not found" on WS?**  
→ Upload the resume first — session is created on upload.
