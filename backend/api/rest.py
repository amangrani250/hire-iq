import uuid
import time
import asyncio
from datetime import datetime, timezone
import base64
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List
from core.config import settings, log
from core.session import sessions
from utils.pdf_extractor import extract_resume_text
from utils.json_utils import safe_json, extract_json
from utils.system_msg import build_system_message
from services.llm_service import call_llm
from services.audio_service import transcribe_audio_bytes, text_to_speech_bytes
from services.interview_engine import (
    start_interview,
    resume_interview,
    handle_candidate_answer,
    evaluation_summary,
    schedule_plan,
)

# FastAPI serializes responses directly via Pydantic; no custom response class needed.
router = APIRouter()

@router.get("/")
async def root():
    return {
        "status": "HireIQ API running",
        "version": "2.0.0",
    }


@router.get("/health", tags=["health"])
async def health():
    """Liveness probe for uptime monitors and deployment platforms."""
    return {
        "status": "ok",
        "service": "hireiq-api",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Parse a PDF/DOCX resume and create a session."""
    filename = (file.filename or "").lower()
    if filename.endswith(".doc"):
        raise HTTPException(
            status_code=400,
            detail="Older .doc files are not supported. Save the file as .docx and try again.",
        )
    if not filename.endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and Word (.docx) files are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    resume_text = extract_resume_text(filename, content)

    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from resume.")

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": resume_text[:settings.MAX_RESUME_CHARS],
        "history": [{"role": "user", "content": "Hi, I'm ready for the interview."}],
        "stage": "greeting",
        "question_count": 0,
        "last_active": time.time(),
        "created_at": time.time(),
        "interview_type": "resume",
    }

    log.info("Session created: %s (resume: %d chars)", session_id[:8], len(resume_text))

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
        raw = await call_llm(summary_messages, task="analysis", json_mode=True)
        parsed = extract_json(raw)
        candidate_info = (
            parsed
            if isinstance(parsed, dict) and parsed.get("name")
            else {"name": "Candidate", "role": "Professional", "skills": [], "years": ""}
        )
    except Exception:
        candidate_info = {"name": "Candidate", "role": "Professional", "skills": [], "years": ""}

    sessions[session_id]["candidate"] = candidate_info
    schedule_plan(sessions[session_id])

    return {"session_id": session_id, "candidate": candidate_info}


@router.post("/api/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if filename.endswith(".doc"):
        raise HTTPException(
            status_code=400,
            detail="Older .doc files are not supported. Save the file as .docx and try again.",
        )
    if not filename.endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and Word (.docx) files are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    resume_text = extract_resume_text(filename, content)

    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from resume.")

    trimmed = resume_text[:settings.MAX_RESUME_CHARS]

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
                '  "email": "email@example.com",\n'
                '  "phone": "+1 123-456-7890",\n'
                '  "location": "City, State",\n'
                '  "linkedin": "https://linkedin.com/in/...",\n'
                '  "github": "https://github.com/...",\n'
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
                '  "certifications": [\n'
                "    {\n"
                '      "name": "AWS Certified Solutions Architect",\n'
                '      "issuer": "Amazon Web Services",\n'
                '      "year": "2023"\n'
                "    }\n"
                "  ],\n"
                '  "total_years": "e.g. 5+"\n'
                "}\n\n"
                "Extract every field from the resume text. If a field is not present, use an empty string "
                "or empty array as appropriate. For skills, categorize them intelligently. "
                "For experience, list in reverse chronological order. "
                "For certifications, extract all listed certifications with issuer and year if available."
            ),
        },
        {"role": "user", "content": trimmed},
    ]

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

    try:
        profile_raw, ats_raw = await asyncio.gather(
            call_llm(profile_prompt, max_tokens=2000, task="analysis", json_mode=True),
            call_llm(ats_prompt, max_tokens=1500, task="analysis", json_mode=True),
        )
    except Exception as e:
        log.error("Resume analysis LLM error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to analyze resume. Please try again.")

    profile_fallback = {
        "name": "Candidate",
        "role": "Professional",
        "email": "",
        "phone": "",
        "location": "",
        "linkedin": "",
        "github": "",
        "summary": "Unable to parse profile details.",
        "experience": [],
        "skills": {"languages": [], "frameworks": [], "tools": [], "other": []},
        "education": [],
        "certifications": [],
        "total_years": "N/A",
    }
    ats_fallback = {
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
    profile = safe_json(profile_raw, profile_fallback)
    ats = safe_json(ats_raw, ats_fallback)
    if not isinstance(profile, dict):
        profile = profile_fallback
    if not isinstance(ats, dict):
        ats = ats_fallback

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": trimmed,
        "history": [{"role": "user", "content": "Hi, I'm ready for the interview."}],
        "stage": "greeting",
        "question_count": 0,
        "last_active": time.time(),
        "created_at": time.time(),
        "interview_type": "resume",
    }

    log.info("Session created from analysis: %s (resume: %d chars)", session_id[:8], len(trimmed))

    try:
        skills_block = profile.get("skills")
        if not isinstance(skills_block, dict):
            skills_block = {}
        skills_list = [
            str(skill)
            for key in ("languages", "frameworks")
            for skill in (skills_block.get(key) or [])
        ][:8]
    except Exception:
        skills_list = []

    candidate = {
        "name": profile.get("name", "Candidate"),
        "role": profile.get("role", "Professional"),
        "skills": skills_list,
        "years": profile.get("total_years", ""),
    }
    sessions[session_id]["candidate"] = candidate
    schedule_plan(sessions[session_id])

    return {
        "profile": profile,
        "ats": ats,
        "resume_text": trimmed,
        "session_id": session_id,
        "candidate": candidate,
    }


@router.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio was received.")
    if len(audio_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio is too large. Keep it under 20 MB.")
    text = await transcribe_audio_bytes(audio_bytes, file.content_type or "")
    return {"transcript": text}


class TechInterviewRequest(BaseModel):
    languages: List[str]
    complexity: str


@router.post("/api/setup-tech-interview")
async def setup_tech_interview(req: TechInterviewRequest):
    session_id = str(uuid.uuid4())

    sessions[session_id] = {
        "resume_text": "",
        "languages": req.languages,
        "complexity": req.complexity,
        "history": [
            {
                "role": "user",
                "content": f"Hi, I'm ready for the technical interview. I want {req.complexity} complexity questions on {', '.join(req.languages)}.",
            }
        ],
        "candidate": {
            "name": "Candidate",
            "role": f"{req.complexity.title()} Level Engineer",
            "skills": req.languages,
            "years": "",
        },
        "stage": "greeting",
        "question_count": 0,
        "last_active": time.time(),
        "created_at": time.time(),
        "interview_type": "tech",
    }

    log.info("Tech interview session created: %s", session_id[:8])
    schedule_plan(sessions[session_id])

    return {
        "session_id": session_id,
        "candidate": {
            "name": "Candidate",
            "role": f"{req.complexity.title()} Level Engineer",
            "skills": req.languages,
            "years": "",
        },
    }


class TranscriptMessage(BaseModel):
    speaker: str
    text: str
    ts: int = 0


class FeedbackRequest(BaseModel):
    transcript: List[TranscriptMessage]
    session_id: str | None = None
    proctor_events: List[dict] = []


def _proctor_summary(events: list[dict]) -> str:
    if not events:
        return "No attention flags were recorded."
    counts: dict[str, int] = {}
    durations: dict[str, float] = {}
    for event in events:
        label = str(event.get("label") or event.get("type") or "Attention flag")
        counts[label] = counts.get(label, 0) + 1
        try:
            durations[label] = durations.get(label, 0.0) + float(event.get("durationMs") or 0) / 1000
        except (TypeError, ValueError):
            durations[label] = durations.get(label, 0.0)
    lines = [
        f"- {label}: {count} time(s), {durations.get(label, 0):.0f}s total"
        for label, count in sorted(counts.items(), key=lambda item: durations.get(item[0], 0), reverse=True)
    ]
    return "\n".join(lines)


def _as_text(value: object) -> str:
    """Coerce a model field into readable text (models sometimes return lists)."""
    if isinstance(value, list):
        parts = []
        for item in value:
            text = _as_text(item)
            if text:
                parts.append(f"• {text}")
        return "\n".join(parts)
    if isinstance(value, dict):
        return "; ".join(f"{key}: {_as_text(item)}" for key, item in value.items())
    return str(value or "").strip()


@router.post("/api/interview-feedback")
async def get_interview_feedback(req: FeedbackRequest):
    if not req.transcript:
        return {
            "good_points": "No interview data found.",
            "bad_points": "The interview was too short to evaluate.",
            "improvements": "Try to complete a full mock interview session.",
        }

    text_transcript = "\n".join([f"{m.speaker}: {m.text}" for m in req.transcript])
    session = sessions.get(req.session_id) if req.session_id else None
    summary = evaluation_summary(session) if session else ""
    proctor_events = req.proctor_events or (session.get("proctor_events") if session else []) or []
    proctor_summary = _proctor_summary(proctor_events)

    prompt = [
        {
            "role": "system",
            "content": (
                "You are an expert technical interviewer evaluator. Analyze the following interview transcript, "
                "the per-question evaluation record, and the proctoring signals. Return ONLY a valid JSON object, "
                "no extra markdown text, with these keys: 'good_points' (string summarizing strengths), "
                "'bad_points' (string summarizing weaknesses), "
                "'improvements' (string with actionable advice). "
                "Be specific, reference the candidate's actual answers, and do not invent strengths. "
                "If proctoring flags exist, mention them constructively in bad_points or improvements."
            ),
        },
        {
            "role": "user",
            "content": (
                f"PER-QUESTION EVALUATION RECORD:\n{summary or 'Not available.'}\n\n"
                f"PROCTORING SIGNALS:\n{proctor_summary}\n\n"
                f"TRANSCRIPT:\n{text_transcript[:10000]}"
            ),
        },
    ]

    try:
        raw = await call_llm(prompt, max_tokens=1000, task="feedback", json_mode=True)
        data = extract_json(raw)
        if not isinstance(data, dict):
            raise ValueError("Feedback response was not a JSON object.")
        return {
            "good_points": _as_text(data.get("good_points")) or "No strengths were recorded.",
            "bad_points": _as_text(data.get("bad_points")) or "No weaknesses were recorded.",
            "improvements": _as_text(data.get("improvements")) or "Keep practising with a full mock interview.",
        }
    except Exception as e:
        log.error("Feedback LLM error: %s", e)

    flag_note = ""
    if proctor_events:
        flag_note = f" Attention during the session: {proctor_summary.replace(chr(10), '; ')}."
    return {
        "good_points": "You communicated your ideas clearly." + (" The transcript shows some solid answers." if req.transcript else ""),
        "bad_points": "Unable to perform a deep analysis at this time due to high server load." + flag_note,
        "improvements": "Practice breaking down your thoughts systematically."
        + (" Keep your face centred and maintain eye contact with the screen." if proctor_events else ""),
    }


class ProctorEventRequest(BaseModel):
    session_id: str
    event: dict


@router.post("/api/interview/proctor")
async def record_proctor_event(req: ProctorEventRequest):
    if req.session_id in sessions and isinstance(req.event, dict):
        events = sessions[req.session_id].setdefault("proctor_events", [])
        events.append(req.event)
        sessions[req.session_id]["proctor_events"] = events[-100:]
    return {"status": "ok"}


class InterviewMessageRequest(BaseModel):
    session_id: str
    text: str | None = None


@router.post("/api/interview/respond")
async def interview_respond_rest(req: InterviewMessageRequest):
    session_id = req.session_id
    user_text = req.text

    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = sessions[session_id]

    try:
        if not session.get("greeted"):
            turn = await start_interview(session)
        elif not user_text:
            turn = await resume_interview(session)
        else:
            turn = await handle_candidate_answer(session, user_text or "")

        if user_text:
            session["history"].append({"role": "user", "content": user_text})
        session["history"].append({"role": "assistant", "content": turn.speech})
        session["history"] = session["history"][-40:]

        audio_bytes = await text_to_speech_bytes(turn.speech)
        audio_b64 = base64.b64encode(audio_bytes).decode() if audio_bytes else None

        return {
            "type": "interview_response",
            "speaker": "interviewer",
            "text": turn.speech,
            "messages": [
                {
                    "text": message.text,
                    "meta": {
                        key: value
                        for key, value in {
                            "verdict": message.verdict,
                            "score": message.score,
                            "questionNumber": message.question_number,
                            "totalQuestions": message.total_questions,
                        }.items()
                        if value is not None
                    },
                }
                for message in turn.messages
            ],
            "audio": audio_b64,
            "format": "mp3",
            "phase": turn.phase,
            "ended": turn.ended,
        }

    except Exception as e:
        log.error("REST interview response error: %s", e)
        raise HTTPException(status_code=500, detail="Error generating interviewer response.")


@router.post("/api/interview/end")
async def interview_end_rest(req: InterviewMessageRequest):
    session_id = req.session_id
    if session_id not in sessions:
        return {"status": "ok"}

    session = sessions[session_id]
    system_msg = build_system_message(session)
    summary = evaluation_summary(session)

    feedback_prompt = (
        "Based on this interview conversation and the per-question evaluation record, "
        "provide a brief, warm closing message (2-3 sentences) telling the candidate "
        "one strength and one thing to revisit. Sound like a real human interviewer "
        "wrapping up a call. Do not ask a question.\n\n"
        f"PER-QUESTION EVALUATION:\n{summary}"
    )

    messages = [system_msg] + session["history"] + [{"role": "user", "content": feedback_prompt}]

    try:
        closing = await call_llm(messages, task="feedback")
        audio = await text_to_speech_bytes(closing)
        audio_b64 = base64.b64encode(audio).decode() if audio else None
        return {"text": closing, "audio": audio_b64}
    except Exception:
        return {"text": "Thank you for the interview today. We will be in touch soon.", "audio": None}
