"""
HireIQ AI Interviewer Backend — FastAPI + WebSocket + Groq/OpenAI

Production enhancements:
- Persistent httpx.AsyncClient (connection pooling, no per-request TCP handshake)
- Async-safe TTS with run_in_executor for blocking gTTS
- Input validation & sanitization
- Session cleanup with TTL
- Retry logic for LLM/TTS calls
- Heartbeat/ping-pong for WebSocket keep-alive
- Structured logging
- Concurrent LLM + TTS pipeline
"""
from __future__ import annotations

import os
import io
import json
import uuid
import time
import asyncio
import base64
import logging
import tempfile
from pathlib import Path
from typing import Optional, Dict
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2

# ═══════════════════════════════════════════════════════════════════════════════
# Logging
# ═══════════════════════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("hireiq")

# ═══════════════════════════════════════════════════════════════════════════════
# Config
# ═══════════════════════════════════════════════════════════════════════════════

GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_KEY = os.getenv("ELEVENLABS_API_KEY", "")

LLM_BACKEND = "groq" if GROQ_API_KEY else "openai"
TTS_BACKEND = (
    "elevenlabs" if ELEVENLABS_KEY
    else ("openai" if OPENAI_API_KEY else "gtts")
)

GROQ_MODEL        = "llama-3.3-70b-versatile"
OPENAI_CHAT_MODEL = "gpt-4o-mini"
OPENAI_TTS_MODEL  = "tts-1"
OPENAI_TTS_VOICE  = "nova"
ELEVENLABS_VOICE  = "21m00Tcm4TlvDq8ikWAM"

# Session TTL in seconds (cleanup idle sessions after 30 min)
SESSION_TTL = 1800

# Max resume text length to send to LLM
MAX_RESUME_CHARS = 4000

# Max candidate message length
MAX_MESSAGE_LEN = 2000

# ═══════════════════════════════════════════════════════════════════════════════
# Persistent HTTP client (connection pooling)
# ═══════════════════════════════════════════════════════════════════════════════

_http_client: Optional[httpx.AsyncClient] = None

async def get_http_client() -> httpx.AsyncClient:
    """Return a shared persistent HTTP client with connection pooling."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        )
    return _http_client

# ═══════════════════════════════════════════════════════════════════════════════
# Session store with TTL
# ═══════════════════════════════════════════════════════════════════════════════

sessions: Dict[str, dict] = {}

def cleanup_sessions():
    """Remove expired sessions."""
    now = time.time()
    expired = [sid for sid, s in sessions.items() if now - s.get("last_active", 0) > SESSION_TTL]
    for sid in expired:
        del sessions[sid]
        log.info("Session expired: %s", sid[:8])

def touch_session(session_id: str):
    """Update last active timestamp."""
    if session_id in sessions:
        sessions[session_id]["last_active"] = time.time()

# ═══════════════════════════════════════════════════════════════════════════════
# App lifecycle
# ═══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle for the app."""
    log.info("HireIQ starting — LLM: %s, TTS: %s", LLM_BACKEND, TTS_BACKEND)

    # Periodic session cleanup
    async def cleanup_loop():
        while True:
            await asyncio.sleep(300)  # Every 5 minutes
            cleanup_sessions()

    cleanup_task = asyncio.create_task(cleanup_loop())

    yield

    cleanup_task.cancel()
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
    log.info("HireIQ shut down cleanly")

app = FastAPI(title="HireIQ API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes. Returns empty string on failure."""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        log.warning("PDF extraction failed: %s", e)
        return ""


def sanitize_text(text: str, max_len: int = MAX_MESSAGE_LEN) -> str:
    """Strip and truncate user text to prevent abuse."""
    return text.strip()[:max_len]


SYSTEM_PROMPT = """You are Alex, a warm, experienced senior technical interviewer at a top-tier tech company.
Your personality:
- Conversational, encouraging, and human — never robotic
- Ask ONE focused question at a time
- React naturally to answers ("That's interesting…", "Got it, makes sense", "Nice approach!")
- Probe deeper when an answer is vague: ask follow-ups before moving on
- Keep the interview flowing like a real conversation, not a Q&A list
- Mix behavioural (STAR) and technical questions based on the resume
- After 8-10 exchanges, wrap up naturally ("This has been great, I think we have a solid picture…")

Interview flow:
1. Greet the candidate by name (if found in resume), introduce yourself as Alex
2. Quick ice-breaker (how are you feeling today?)
3. Ask candidate to walk you through their background
4. Dive into 4-6 technical/role questions tailored to their resume
5. 1-2 behavioural questions
6. Ask if candidate has questions
7. Close warmly

IMPORTANT: Speak exactly as a human interviewer would in a real video call.
Use contractions, natural pauses ("…"), and conversational fillers where appropriate.
Keep each message under 80 words unless the answer genuinely needs more.
Do NOT use markdown formatting, bullet points, or numbered lists. Speak naturally."""

# ═══════════════════════════════════════════════════════════════════════════════
# LLM — with retry
# ═══════════════════════════════════════════════════════════════════════════════

async def call_llm(messages: list[dict], retries: int = 2) -> str:
    """Call Groq or OpenAI chat completion with retry logic."""
    client = await get_http_client()
    last_error = None

    for attempt in range(retries + 1):
        try:
            if LLM_BACKEND == "groq" and GROQ_API_KEY:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": GROQ_MODEL,
                        "messages": messages,
                        "temperature": 0.8,
                        "max_tokens": 300,
                    },
                )
                if resp.status_code != 200:
                    log.warning("Groq %d: %s", resp.status_code, resp.text[:200])
                    if attempt < retries and resp.status_code >= 500:
                        await asyncio.sleep(0.5 * (attempt + 1))
                        continue
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]

            elif OPENAI_API_KEY:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": OPENAI_CHAT_MODEL,
                        "messages": messages,
                        "temperature": 0.8,
                        "max_tokens": 300,
                    },
                )
                if resp.status_code != 200:
                    log.warning("OpenAI %d: %s", resp.status_code, resp.text[:200])
                    if attempt < retries and resp.status_code >= 500:
                        await asyncio.sleep(0.5 * (attempt + 1))
                        continue
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
            else:
                raise HTTPException(500, "No LLM API key configured.")

        except httpx.HTTPStatusError:
            raise
        except Exception as e:
            last_error = e
            log.error("LLM attempt %d failed: %s", attempt + 1, e)
            if attempt < retries:
                await asyncio.sleep(0.5 * (attempt + 1))

    raise HTTPException(500, f"LLM call failed after {retries + 1} attempts: {last_error}")

# ═══════════════════════════════════════════════════════════════════════════════
# TTS — async-safe with fallback chain
# ═══════════════════════════════════════════════════════════════════════════════

async def text_to_speech_bytes(text: str) -> bytes:
    """Convert text → MP3 audio bytes. Returns empty bytes on failure."""
    client = await get_http_client()

    # ── ElevenLabs ──
    if TTS_BACKEND == "elevenlabs" and ELEVENLABS_KEY:
        try:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE}",
                headers={"xi-api-key": ELEVENLABS_KEY, "Content-Type": "application/json"},
                json={
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {"stability": 0.45, "similarity_boost": 0.85},
                },
            )
            if resp.status_code == 200:
                return resp.content
            log.warning("ElevenLabs TTS %d", resp.status_code)
        except Exception as e:
            log.warning("ElevenLabs TTS error: %s", e)

    # ── OpenAI TTS ──
    if OPENAI_API_KEY:
        try:
            resp = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": OPENAI_TTS_MODEL,
                    "voice": OPENAI_TTS_VOICE,
                    "input": text,
                    "response_format": "mp3",
                },
            )
            if resp.status_code == 200:
                return resp.content
            log.warning("OpenAI TTS %d", resp.status_code)
        except Exception as e:
            log.warning("OpenAI TTS error: %s", e)

    # ── gTTS fallback (run in thread to avoid blocking event loop) ──
    try:
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(None, _gtts_sync, text)
        if data:
            return data
    except Exception as e:
        log.warning("gTTS error: %s", e)

    return b""


def _gtts_sync(text: str) -> bytes:
    """Blocking gTTS call — run inside run_in_executor."""
    from gtts import gTTS
    tmp_path = tempfile.mktemp(suffix=".mp3")
    try:
        tts = gTTS(text=text, lang="en", slow=False)
        tts.save(tmp_path)
        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ═══════════════════════════════════════════════════════════════════════════════
# STT — with input validation
# ═══════════════════════════════════════════════════════════════════════════════

async def transcribe_audio_bytes(audio_bytes: bytes, content_type: str = "") -> str:
    """Transcribe audio bytes using Whisper (Groq or OpenAI)."""
    if len(audio_bytes) < 1000:
        return ""  # Too short to contain speech

    client = await get_http_client()
    suffix = ".webm" if "webm" in content_type else ".wav"
    filename = f"upload{suffix}"

    if GROQ_API_KEY:
        resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (filename, audio_bytes, "audio/webm")},
            data={"model": "whisper-large-v3"},
        )
        if resp.status_code != 200:
            log.warning("Groq STT %d: %s", resp.status_code, resp.text[:200])
        resp.raise_for_status()
        return resp.json().get("text", "").strip()

    elif OPENAI_API_KEY:
        resp = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            files={"file": (filename, audio_bytes, "audio/webm")},
            data={"model": "whisper-1"},
        )
        if resp.status_code != 200:
            log.warning("OpenAI STT %d: %s", resp.status_code, resp.text[:200])
        resp.raise_for_status()
        return resp.json().get("text", "").strip()

    raise HTTPException(500, "No STT API key configured.")

# ═══════════════════════════════════════════════════════════════════════════════
# REST endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "status": "HireIQ API running",
        "version": "2.0.0",
        "llm": LLM_BACKEND,
        "tts": TTS_BACKEND,
        "active_sessions": len(sessions),
    }


@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Parse PDF/TXT resume and create a session."""
    # Validate file type
    filename = (file.filename or "").lower()
    if not filename.endswith((".pdf", ".txt")):
        raise HTTPException(400, "Only PDF and TXT files are supported.")

    content = await file.read()

    # Limit file size (5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum size is 5MB.")

    if filename.endswith(".pdf"):
        resume_text = extract_text_from_pdf(content)
    else:
        resume_text = content.decode("utf-8", errors="ignore")

    if len(resume_text.strip()) < 50:
        raise HTTPException(400, "Could not extract enough text from resume.")

    # Create session
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": resume_text[:MAX_RESUME_CHARS],
        "history": [
            {"role": "user", "content": "Hi, I'm ready for the interview."}
        ],
        "stage": "greeting",
        "question_count": 0,
        "last_active": time.time(),
        "created_at": time.time(),
    }

    log.info("Session created: %s (resume: %d chars)", session_id[:8], len(resume_text))

    # Extract candidate info from resume
    summary_messages = [
        {
            "role": "system",
            "content": (
                "Extract candidate name, current role, top 3 skills, and years "
                "of experience from this resume. Return ONLY compact JSON: "
                '{"name": "", "role": "", "skills": [], "years": ""}'
            ),
        },
        {"role": "user", "content": resume_text[:3000]},
    ]
    try:
        raw = await call_llm(summary_messages)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        candidate_info = json.loads(raw)
    except Exception:
        candidate_info = {"name": "Candidate", "role": "Professional", "skills": [], "years": ""}

    return {"session_id": session_id, "candidate": candidate_info}


@app.post("/api/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    """Deep-analyze a resume: extract profile, experience timeline, skills, and ATS score."""
    filename = (file.filename or "").lower()
    if not filename.endswith((".pdf", ".txt")):
        raise HTTPException(400, "Only PDF and TXT files are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum size is 5MB.")

    if filename.endswith(".pdf"):
        resume_text = extract_text_from_pdf(content)
    else:
        resume_text = content.decode("utf-8", errors="ignore")

    if len(resume_text.strip()) < 50:
        raise HTTPException(400, "Could not extract enough text from resume.")

    trimmed = resume_text[:MAX_RESUME_CHARS]

    # ── Extract detailed profile info ────────────────────────────────────
    profile_prompt = [
        {
            "role": "system",
            "content": (
                "You are an expert resume analyzer. Extract detailed structured information "
                "from the resume below. Return ONLY valid JSON, no markdown fences, no extra text.\n\n"
                "Required JSON schema:\n"
                "{\n"
                '  "name": "Full Name",\n'
                '  "role": "Current/Target Job Title",\n'
                '  "summary": "2-3 sentence professional summary",\n'
                '  "experience": [\n'
                "    {\n"
                '      "company": "Company Name",\n'
                '      "role": "Job Title",\n'
                '      "duration": "Start - End (e.g. Jan 2020 - Present)",\n'
                '      "description": "1-2 sentence summary of responsibilities and achievements"\n'
                "    }\n"
                "  ],\n"
                '  "skills": {\n'
                '    "languages": ["Python", "JavaScript", ...],\n'
                '    "frameworks": ["React", "Django", ...],\n'
                '    "tools": ["Docker", "Git", ...],\n'
                '    "other": ["Machine Learning", "REST APIs", ...]\n'
                "  },\n"
                '  "education": [\n'
                "    {\n"
                '      "degree": "B.Tech in Computer Science",\n'
                '      "institution": "University Name",\n'
                '      "year": "2020"\n'
                "    }\n"
                "  ],\n"
                '  "total_years": "e.g. 5+"\n'
                "}\n\n"
                "If any field is not found, use reasonable defaults. "
                "For skills, categorize them intelligently. "
                "For experience, list in reverse chronological order."
            ),
        },
        {"role": "user", "content": trimmed},
    ]

    # ── ATS score analysis ───────────────────────────────────────────────
    ats_prompt = [
        {
            "role": "system",
            "content": (
                "You are an ATS (Applicant Tracking System) expert. Analyze this resume "
                "and provide an ATS compatibility score. Return ONLY valid JSON, no markdown fences.\n\n"
                "Required JSON schema:\n"
                "{\n"
                '  "overall_score": 75,\n'
                '  "breakdown": {\n'
                '    "keyword_optimization": {"score": 80, "feedback": "Brief feedback"},\n'
                '    "formatting": {"score": 70, "feedback": "Brief feedback"},\n'
                '    "section_completeness": {"score": 85, "feedback": "Brief feedback"},\n'
                '    "impact_metrics": {"score": 60, "feedback": "Brief feedback"},\n'
                '    "readability": {"score": 75, "feedback": "Brief feedback"}\n'
                "  },\n"
                '  "top_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]\n'
                "}\n\n"
                "Score each category 0-100. overall_score is the weighted average. "
                "Be realistic and constructive in feedback."
            ),
        },
        {"role": "user", "content": trimmed},
    ]

    # Run both LLM calls concurrently
    try:
        profile_raw, ats_raw = await asyncio.gather(
            call_llm(profile_prompt),
            call_llm(ats_prompt),
        )
    except Exception as e:
        log.error("Resume analysis LLM error: %s", e)
        raise HTTPException(500, "Failed to analyze resume. Please try again.")

    # Parse profile
    try:
        profile_raw = profile_raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        profile = json.loads(profile_raw)
    except Exception:
        log.warning("Profile parse failed, raw: %s", profile_raw[:300])
        profile = {
            "name": "Candidate",
            "role": "Professional",
            "summary": "Unable to parse profile details.",
            "experience": [],
            "skills": {"languages": [], "frameworks": [], "tools": [], "other": []},
            "education": [],
            "total_years": "N/A",
        }

    # Parse ATS score
    try:
        ats_raw = ats_raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        ats = json.loads(ats_raw)
    except Exception:
        log.warning("ATS parse failed, raw: %s", ats_raw[:300])
        ats = {
            "overall_score": 65,
            "breakdown": {
                "keyword_optimization": {"score": 65, "feedback": "Analysis unavailable"},
                "formatting": {"score": 65, "feedback": "Analysis unavailable"},
                "section_completeness": {"score": 65, "feedback": "Analysis unavailable"},
                "impact_metrics": {"score": 65, "feedback": "Analysis unavailable"},
                "readability": {"score": 65, "feedback": "Analysis unavailable"},
            },
            "top_suggestions": ["Unable to generate suggestions at this time."],
        }

    log.info("Resume analyzed: %s (%s), ATS: %s", profile.get("name"), profile.get("role"), ats.get("overall_score"))

    return {
        "profile": profile,
        "ats": ats,
        "resume_text": trimmed,
    }


@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio blob using Whisper."""
    audio_bytes = await file.read()
    text = await transcribe_audio_bytes(audio_bytes, file.content_type or "")
    return {"transcript": text}


# ═══════════════════════════════════════════════════════════════════════════════
# WebSocket — real-time interview
# ═══════════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()

    if session_id not in sessions:
        await websocket.send_json({"type": "error", "message": "Session not found."})
        await websocket.close(code=4004)
        return

    session = sessions[session_id]
    touch_session(session_id)

    system_msg = {
        "role": "system",
        "content": f"{SYSTEM_PROMPT}\n\n--- CANDIDATE RESUME ---\n{session['resume_text']}",
    }

    async def safe_send(data: dict):
        """Send JSON to websocket, catching errors if connection dropped."""
        try:
            await websocket.send_json(data)
        except Exception:
            pass

    async def interviewer_respond(user_text: Optional[str] = None):
        """Generate interviewer response: LLM text → send text → TTS → send audio."""
        try:
            touch_session(session_id)

            messages = [system_msg] + session["history"]
            if user_text:
                messages.append({"role": "user", "content": user_text})

            # Get LLM response
            t0 = time.time()
            ai_text = await call_llm(messages)
            llm_ms = int((time.time() - t0) * 1000)

            # Update history
            if user_text:
                session["history"].append({"role": "user", "content": user_text})
            session["history"].append({"role": "assistant", "content": ai_text})
            session["question_count"] += 1

            # Keep history manageable (last 20 exchanges)
            max_history = 40  # 20 pairs of user+assistant
            if len(session["history"]) > max_history:
                session["history"] = session["history"][-max_history:]

            # Send text immediately so UI updates while TTS generates
            await safe_send({
                "type": "transcript",
                "speaker": "interviewer",
                "text": ai_text,
            })

            log.info("LLM responded in %dms (%d chars)", llm_ms, len(ai_text))

            # Generate TTS audio (runs concurrently after text is already sent)
            t1 = time.time()
            audio_bytes = await text_to_speech_bytes(ai_text)
            tts_ms = int((time.time() - t1) * 1000)

            if audio_bytes:
                audio_b64 = base64.b64encode(audio_bytes).decode()
                await safe_send({"type": "audio", "data": audio_b64, "format": "mp3"})
                log.info("TTS generated in %dms (%d KB)", tts_ms, len(audio_bytes) // 1024)

            await safe_send({"type": "interviewer_done"})

        except HTTPException as e:
            await safe_send({"type": "error", "message": e.detail})
            await safe_send({"type": "interviewer_done"})
        except Exception as e:
            log.error("interviewer_respond error: %s", e)
            await safe_send({"type": "error", "message": "Something went wrong processing your response."})
            await safe_send({"type": "interviewer_done"})

    # Greet the candidate
    await interviewer_respond()

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await safe_send({"type": "error", "message": "Invalid message format."})
                continue

            msg_type = data.get("type", "")

            if msg_type == "candidate_message":
                user_text = sanitize_text(data.get("text", ""))
                if not user_text:
                    continue
                await safe_send({
                    "type": "transcript",
                    "speaker": "candidate",
                    "text": user_text,
                })
                await interviewer_respond(user_text)

            elif msg_type == "end_interview":
                feedback_prompt = (
                    "Based on this interview conversation, provide a brief, warm closing "
                    "message (2-3 sentences) telling the candidate what went well and next steps. "
                    "Sound like a real human interviewer wrapping up a call."
                )
                messages = [system_msg] + session["history"] + [
                    {"role": "user", "content": feedback_prompt}
                ]
                try:
                    closing = await call_llm(messages)
                    await safe_send({"type": "transcript", "speaker": "interviewer", "text": closing})
                    audio = await text_to_speech_bytes(closing)
                    if audio:
                        await safe_send({
                            "type": "audio",
                            "data": base64.b64encode(audio).decode(),
                            "format": "mp3",
                        })
                except Exception as e:
                    log.error("End interview error: %s", e)

                await safe_send({"type": "interview_ended"})
                break

            elif msg_type == "ping":
                await safe_send({"type": "pong"})

            # Unknown message types are silently ignored

    except WebSocketDisconnect:
        log.info("Client disconnected: %s", session_id[:8])
    except Exception as e:
        log.error("WS error for %s: %s", session_id[:8], e)
    finally:
        touch_session(session_id)
