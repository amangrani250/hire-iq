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
| **Attention proctoring** | MediaPipe FaceLandmarker tracks presence, gaze, head pose, distance, extra faces, and phones, with a flag report |
| **Virtual backgrounds** | Teams-style office, lounge, study, studio, and blur backgrounds rendered locally |
| **Downloadable recording** | The candidate's processed camera plus both voices is recorded and downloadable as MP4 (WebM fallback) |
| **Realistic voice** | ElevenLabs → OpenAI TTS → gTTS (free fallback) |
| **Speech-to-text** | Groq Whisper-large-v3 (free) or OpenAI Whisper |
| **Real-time comms** | WebSocket (FastAPI) |
| **Video call UI** | React — Zoom-style tiles, controls, transcript panel |
| **Integrated Coding Lab** | Language-aware CodeMirror IDE, real judge, warm-ups, and Aira review |
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
│   ├── main.py                  ← FastAPI app and router wiring
│   ├── api/
│   │   ├── rest.py              ← Resume, interview, feedback endpoints
│   │   ├── ws.py                ← Live interview WebSocket
│   │   ├── coding.py            ← Coding Lab catalog, judge, AI review
│   │   └── job_roadmap.py
│   ├── services/
│   │   ├── code_runner.py       ← Sandboxed local compile/run judge
│   │   ├── coding_challenges.py ← Challenges, starters, warm-ups
│   │   └── llm_service.py       ← Task-routed LLM calls + fallbacks
│   └── requirements.txt
└── frontend/
    ├── index.html
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── coding/CodeEditor.tsx
        │   ├── UploadScreen.tsx
        │   ├── InterviewRoom.tsx
        │   └── EndScreen.tsx
        ├── pages/
        │   ├── CodingLabPage.tsx
        │   ├── BuilderPage.tsx
        │   └── JobRoadmapPage.tsx
        └── hooks/ · contexts/ · services/
```

---

## 🚀 Deploying to Vercel

This repo is designed to run as **two Vercel projects**:

### Frontend project

- Root directory: `frontend`
- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `build` (already configured in `frontend/vercel.json`)
- Environment variable:
  ```text
  VITE_API_URL=https://your-backend.vercel.app
  ```

### Backend project

- Root directory: `backend`
- Framework preset: **FastAPI / Other**
- Environment variables:
  ```text
  GROQ_API_KEY=...
  CODE_EXECUTION_PROVIDER=auto
  JUDGE0_URL=https://ce.judge0.com
  ```
- `auto` uses the local compiler on your machine and **Judge0 CE on Vercel**, because Vercel functions cannot host arbitrary compilers or runtimes.
- For higher rate limits or private execution, point `JUDGE0_URL` at a self-hosted Judge0 instance. For RapidAPI, also set `JUDGE0_API_KEY` and `JUDGE0_RAPIDAPI_HOST`.
- Vercel serverless functions do not support long-lived WebSockets. The interview room has a REST fallback, but for reliable real-time interviews run the backend on a stateful host (Railway/Render/Fly) and set `VITE_API_URL` to it.

The Coding Lab is fully HTTP-based, so it works on Vercel with Judge0.

---

## 🧑‍💻 Coding Lab

Open **Code Lab** in the navigation (`/coding-lab`).

1. Choose an available runtime — Python, JavaScript, TypeScript, or Java. The catalog only enables runtimes that are installed on the backend host.
2. Pick a difficulty and challenge (Pair Sum, Balanced Brackets, or Merge Intervals).
3. Aira asks warm-up questions about requirements, testing, debugging, and engineering judgment.
4. Solve the challenge in a CodeMirror 6 editor with language highlighting, autosave, and keyboard shortcuts.
5. **Run** executes the visible samples; **Submit** runs the full hidden suite.
6. Inspect per-test input, expected output, actual output, stderr, and compile errors.
7. Ask Aira for a senior-level review covering correctness, complexity, edge cases, and next steps.

API endpoints:

```text
GET  /api/coding/catalog
POST /api/coding/run
POST /api/coding/review
```

The judge uses the local toolchain during development and Judge0 CE on Vercel. Replace the remote provider with an isolated container/job worker if you need stronger isolation or higher throughput for a public multi-tenant service.

---

## 🎛️ How the interview works

1. **Upload resume** → backend extracts text, creates a session, extracts candidate info
2. **Question plan** → Aira prepares a small set of self-contained questions with reference answers, then a second model verifies them for correctness before the call
3. **WebSocket opens** → Aira greets you and asks exactly one question
4. **You answer** → speech-to-text (or the transcript text box) sends the answer to the evaluator
5. **Aira evaluates** → the answer is scored against the rubric. Correct answers move on; wrong answers get the correct explanation before the next question. Vague answers get one focused probe
6. **Progress** → the transcript shows a verdict/score badge and the header shows "Question X of Y"
7. **Proctoring** → MediaPipe checks the face, gaze, distance, extra people, phones, and camera state. Flags appear live and in the final report
8. **Recording** → the processed camera feed and a mix of the candidate mic and Aira's voice are recorded locally. Download the MP4 (or WebM) from the end screen
9. **End call** → the report uses the per-question evaluation record, not just the raw transcript

### Recording and proctoring notes

- MediaPipe models and WASM run **locally in the browser**; video is not uploaded for analysis.
- The virtual background picker offers Office, Lounge, Study, Studio, Blur, and None.
- Recording starts automatically in the interview room. The header shows a `REC` indicator.
- Chromium browsers record **WebM (VP9 + Opus)**; MP4 is used only when WebM is unavailable.
- Headphones are recommended so Aira's voice is not picked up twice by the room mic.
- The last recording is stored in IndexedDB and offered as a download on the end screen.
- Attention flags include: left the frame, looking away, off centre, multiple faces, phone detected, too close/far, and camera turned off.
- The MediaPipe WASM runtime and models are bundled under `frontend/public/mediapipe` and `frontend/public/models`, so the first interview works offline after the page assets load. They add roughly 24 MB to the frontend build.

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
| `CODE_EXECUTION_PROVIDER` | `auto` | `local` on dev, `judge0` on Vercel |
| `JUDGE0_URL` | `https://ce.judge0.com` | Judge0 API base URL |
| `JUDGE0_API_KEY` | — | Optional Judge0/RapidAPI key |
| `JUDGE0_RAPIDAPI_HOST` | — | Set when using Judge0 through RapidAPI |

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
| `VITE_API_URL` | `http://localhost:8000` | Backend URL for frontend |

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
**Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 4, CodeMirror 6, Lucide React  
**AI:** GPT-OSS 120B for live interviews, Qwen 3.8 27B for resume analysis/writing, Groq Whisper for STT, gTTS  
**Vision:** MediaPipe Tasks Vision (FaceLandmarker, ImageSegmenter, ObjectDetector)  
**Media:** MediaRecorder + Web Audio + canvas capture (local MP4/WebM recording)  
**Protocols:** REST (resume upload), WebSocket (real-time interview)

---

## 📝 Troubleshooting

**Mic not working?**  
→ Allow microphone permissions in browser. Chrome/Edge work best.

**CORS errors?**  
→ Make sure backend is running on port 8000. Check `VITE_API_URL` in frontend.

**No audio from interviewer?**  
→ Check your API key. The gTTS fallback is installed with the backend requirements.

**"Session not found" on WS?**  
→ Upload the resume first — session is created on upload.
