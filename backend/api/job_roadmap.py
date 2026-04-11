import uuid
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel
from typing import List, Optional
import orjson

from core.config import settings, log
from core.session import sessions
from services.llm_service import call_llm

router = APIRouter(default_response_class=ORJSONResponse)


# ─── Pydantic models ────────────────────────────────────────────────────────

class RoadmapRequest(BaseModel):
    job_title: str
    experience_level: str  # "fresher" | "mid" | "senior"
    duration_days: int = 7  # 7, 14, or 30


class JobInterviewRequest(BaseModel):
    job_title: str
    experience_level: str
    topics_studied: List[str]
    studied_day_themes: Optional[List[str]] = None
    studied_specific_topics: Optional[List[str]] = None


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/api/job-roadmap")
async def generate_job_roadmap(req: RoadmapRequest):
    """Generate a day-by-day learning roadmap for a specific job role."""

    prompt = [
        {
            "role": "system",
            "content": (
                "You are an expert career coach and technical mentor. "
                "Generate a structured, practical interview preparation roadmap. "
                "Return ONLY valid JSON — no markdown, no extra text.\n\n"
                "Output schema:\n"
                "{\n"
                '  "job_title": "string",\n'
                '  "experience_level": "string",\n'
                '  "strategy": "2-3 sentence overall strategy to crack this interview",\n'
                '  "key_topics": ["topic1", "topic2", ...],\n'
                '  "days": [\n'
                "    {\n"
                '      "day": 1,\n'
                '      "theme": "short day theme title",\n'
                '      "tasks": [\n'
                "        {\n"
                '          "id": "d1t1",\n'
                '          "title": "Task title",\n'
                '          "description": "What to study and how to practice",\n'
                '          "type": "learn | practice | revise | mock",\n'
                '          "duration_mins": 45,\n'
                '          "resources": ["Resource/concept hint 1", "Resource/concept hint 2"]\n'
                "        }\n"
                "      ]\n"
                "    }\n"
                "  ]\n"
                "}\n\n"
                f"Generate exactly {req.duration_days} days. "
                "Each day should have 3-5 tasks totaling ~3-4 hours. "
                "Progressively build from fundamentals to advanced topics. "
                "Make tasks specific and actionable, not vague."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Job Title: {req.job_title}\n"
                f"Experience Level: {req.experience_level}\n"
                f"Preparation Duration: {req.duration_days} days\n\n"
                "Generate a comprehensive, practical roadmap to crack this interview."
            ),
        },
    ]

    try:
        raw = await call_llm(prompt, max_tokens=4000)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = orjson.loads(raw)
        log.info("Roadmap generated for: %s (%s)", req.job_title, req.experience_level)
        return data
    except orjson.JSONDecodeError as e:
        log.error("Roadmap JSON parse error: %s | raw: %s", e, raw[:300])
        raise HTTPException(status_code=500, detail="Failed to parse roadmap. Please try again.")
    except Exception as e:
        log.error("Roadmap generation error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to generate roadmap. Please try again.")


@router.post("/api/job-interview-session")
async def create_job_interview_session(req: JobInterviewRequest):
    """Create an AI interview session scoped to exactly what the candidate studied."""

    topics_str = ", ".join(req.topics_studied) if req.topics_studied else req.job_title
    themes_str = ", ".join(req.studied_day_themes) if req.studied_day_themes else ""
    specific_str = ", ".join(req.studied_specific_topics) if req.studied_specific_topics else ""

    # Build a concrete, forbidden-topics-aware system prompt
    custom_system_prompt = f"""You are Aira, a warm, experienced senior technical interviewer at a top-tier tech company.
You are conducting a STRICTLY SCOPED interview for a {req.job_title} position ({req.experience_level} level).

The candidate completed a structured learning roadmap. Here is EXACTLY what they studied:

KEY TOPICS: {topics_str}
{f"DAY THEMES: {themes_str}" if themes_str else ""}
{f"SPECIFIC TASKS COMPLETED: {specific_str}" if specific_str else ""}

STRICT RULES — YOU MUST FOLLOW THESE:
1. ONLY ask questions about the topics listed above. Do NOT ask about anything else.
2. If you think of a question outside those topics, skip it and pick another from the list.
3. Every single question must map directly to one of the KEY TOPICS or SPECIFIC TASKS above.
4. Ask ONE question at a time.
5. React naturally: "Great answer!", "Interesting approach!", "Not quite — let me explain."
6. If the candidate gives the RIGHT answer, say "Correct!" or "Exactly right." first.
7. If WRONG, say "Not quite — let me clarify." then give a concise explanation.

Interview flow:
1. Greet the candidate warmly: "Welcome to your {req.job_title} interview! You've been preparing hard, let's see what you've got."
2. Confirm what they studied: "I see you covered {topics_str[:80]}. Let's dive in."
3. Ask 5-7 targeted questions STRICTLY from the studied topics above.
4. 1-2 practical scenario questions: "How would you apply [studied topic] to solve [real scenario]?"
5. Close warmly. When done, say exactly: "Please click on the End Call button."

CRITICAL: You have been given the exact list of topics. There is no excuse to ask anything outside that list.
Keep responses under 90 words. No markdown, no bullet points. Speak naturally like a human interviewer."""

    complexity_map = {"fresher": "low", "mid": "medium", "senior": "high"}

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": "",
        "job_title": req.job_title,
        "experience_level": req.experience_level,
        "topics_studied": req.topics_studied,
        "studied_day_themes": req.studied_day_themes or [],
        "studied_specific_topics": req.studied_specific_topics or [],
        "languages": req.topics_studied,
        "complexity": complexity_map.get(req.experience_level, "medium"),
        # Store the fully rendered system prompt directly on the session
        "custom_system_prompt": custom_system_prompt,
        "history": [
            {
                "role": "user",
                "content": (
                    f"Hi, I'm ready for my {req.job_title} interview. "
                    f"I studied the following topics: {topics_str}."
                ),
            }
        ],
        "stage": "greeting",
        "question_count": 0,
        "last_active": time.time(),
        "created_at": time.time(),
        "interview_type": "job_roadmap",
    }

    log.info(
        "Job roadmap interview session created: %s | job: %s | topics: %s",
        session_id[:8],
        req.job_title,
        topics_str[:80],
    )

    return {
        "session_id": session_id,
        "candidate": {
            "name": "Candidate",
            "role": req.job_title,
            "skills": req.topics_studied[:6],
            "years": req.experience_level,
        },
    }

