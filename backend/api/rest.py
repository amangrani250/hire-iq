import uuid
import time
import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel
from typing import List
import orjson
from core.config import settings, log
from core.session import sessions
from utils.pdf_extractor import extract_text_from_pdf
from services.llm_service import call_llm
from services.audio_service import transcribe_audio_bytes

# Ensure that responses default to ORJSONResponse for speed performance
router = APIRouter(default_response_class=ORJSONResponse)

@router.get("/")
async def root():
    return {
        "status": "HireIQ API running",
        "version": "2.0.0",
        "llm": settings.LLM_BACKEND,
        "tts": settings.TTS_BACKEND,
        "active_sessions": len(sessions),
    }

@router.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Parse PDF/TXT resume and create a session."""
    filename = (file.filename or "").lower()
    if not filename.endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    if filename.endswith(".pdf"):
        resume_text = extract_text_from_pdf(content)
    else:
        resume_text = content.decode("utf-8", errors="ignore")

    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from resume.")

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": resume_text[:settings.MAX_RESUME_CHARS],
        "history": [
            {"role": "user", "content": "Hi, I'm ready for the interview."}
        ],
        "stage": "greeting",
        "question_count": 0,
        "last_active": time.time(),
        "created_at": time.time(),
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
        raw = await call_llm(summary_messages)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        candidate_info = orjson.loads(raw)
    except Exception:
        candidate_info = {"name": "Candidate", "role": "Professional", "skills": [], "years": ""}

    return {"session_id": session_id, "candidate": candidate_info}


@router.post("/api/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    """Deep-analyze a resume: extract profile, experience timeline, skills, and ATS score."""
    filename = (file.filename or "").lower()
    if not filename.endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    if filename.endswith(".pdf"):
        resume_text = extract_text_from_pdf(content)
    else:
        resume_text = content.decode("utf-8", errors="ignore")

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
            call_llm(profile_prompt, max_tokens=2000),
            call_llm(ats_prompt, max_tokens=1500),
        )
    except Exception as e:
        log.error("Resume analysis LLM error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to analyze resume. Please try again.")

    try:
        profile_raw = profile_raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        profile = orjson.loads(profile_raw)
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

    try:
        ats_raw = ats_raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        ats = orjson.loads(ats_raw)
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

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": trimmed,
        "history": [
            {"role": "user", "content": "Hi, I'm ready for the interview."}
        ],
        "stage": "greeting",
        "question_count": 0,
        "last_active": time.time(),
        "created_at": time.time(),
    }

    log.info("Session created from analysis: %s (resume: %d chars)", session_id[:8], len(trimmed))
    
    try:
        skills_list = profile.get("skills", {}).get("languages", []) + profile.get("skills", {}).get("frameworks", [])
    except Exception:
        skills_list = []

    return {
        "profile": profile,
        "ats": ats,
        "resume_text": trimmed,
        "session_id": session_id,
        "candidate": {
            "name": profile.get("name", "Candidate"),
            "role": profile.get("role", "Professional"),
            "skills": skills_list,
            "years": profile.get("total_years", "")
        }
    }

@router.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio blob using Whisper."""
    audio_bytes = await file.read()
    text = await transcribe_audio_bytes(audio_bytes, file.content_type or "")
    return {"transcript": text}

class TranscriptMessage(BaseModel):
    speaker: str
    text: str
    ts: int = 0

class FeedbackRequest(BaseModel):
    transcript: List[TranscriptMessage]

@router.post("/api/interview-feedback")
async def get_interview_feedback(req: FeedbackRequest):
    """Generate constructive feedback based on the interview transcript."""
    if not req.transcript:
        return {
            "good_points": "No interview data found.",
            "bad_points": "The interview was too short to evaluate.",
            "improvements": "Try to complete a full mock interview session."
        }
        
    text_transcript = "\n".join([f"{m.speaker}: {m.text}" for m in req.transcript])
    
    prompt = [
        {"role": "system", "content": (
            "You are an expert technical interviewer evaluator. Analyze the following interview transcript. "
            "Return ONLY a valid JSON object, no extra markdown text, with these keys: "
            "'good_points' (string summarizing strengths), "
            "'bad_points' (string summarizing weaknesses), "
            "'improvements' (string with actionable advice)."
        )},
        {"role": "user", "content": text_transcript[:10000]}
    ]
    
    try:
        raw = await call_llm(prompt, max_tokens=1000)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = orjson.loads(raw)
        return data
    except Exception as e:
        log.error("Feedback LLM error: %s", e)
        return {
            "good_points": "You communicated your ideas clearly.",
            "bad_points": "Unable to perform deep analysis at this time due to high server load.",
            "improvements": "Practice breaking down your thoughts systematically."
        }
