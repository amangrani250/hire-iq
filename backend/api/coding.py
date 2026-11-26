"""Integrated coding lab API: catalog, judge, and AI review."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.config import log
from services.code_runner import (
    JudgeUnavailableError,
    MAX_CODE_BYTES,
    get_language,
    language_catalog,
    run_solution,
)
from services.coding_challenges import get_challenge, get_warmups, list_challenges
from services.llm_service import call_llm
from utils.json_utils import extract_json

router = APIRouter(prefix="/api/coding", tags=["coding"])


class RunRequest(BaseModel):
    language: str
    challenge_id: str
    code: str = Field(min_length=1, max_length=MAX_CODE_BYTES)
    mode: Literal["run", "submit"] = "run"


class WarmupAnswer(BaseModel):
    question_id: str
    question: str
    answer: str = Field(default="", max_length=4000)


class ReviewRequest(BaseModel):
    language: str
    challenge_id: str
    code: str = Field(default="", max_length=MAX_CODE_BYTES)
    results: dict[str, Any] | None = None
    warmup_answers: list[WarmupAnswer] = Field(default_factory=list)


@router.get("/catalog")
def coding_catalog():
    """Languages, challenges, and warm-up questions for the coding lab."""
    languages = language_catalog()
    return {
        "languages": languages,
        "challenges": list_challenges(),
        "warmups": get_warmups(),
        "limits": {
            "code_bytes": MAX_CODE_BYTES,
            "test_timeout_seconds": 4,
            "compile_timeout_seconds": 15,
        },
    }


@router.post("/run")
def coding_run(req: RunRequest):
    """Run sample tests or submit against the full hidden suite."""
    challenge = get_challenge(req.challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found.")

    if not get_language(req.language):
        raise HTTPException(status_code=400, detail="Unsupported language.")

    try:
        result = run_solution(req.language, challenge, req.code, req.mode)
    except JudgeUnavailableError as exc:
        log.warning("Coding judge unavailable: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The code sandbox is temporarily unavailable. Please try again in a moment.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        log.error("Coding judge error: %s", exc)
        raise HTTPException(status_code=500, detail="The judge could not run your code.") from exc

    return {
        **result,
        "language": req.language,
        "challenge_id": req.challenge_id,
        "mode": req.mode,
    }


@router.post("/review")
async def coding_review(req: ReviewRequest):
    """Ask Aira for a senior-level review of the submitted solution."""
    challenge = get_challenge(req.challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found.")

    language = get_language(req.language)
    if not language:
        raise HTTPException(status_code=400, detail="Unsupported language.")

    results = req.results or {}
    failed_tests = [
        test
        for test in (results.get("tests") or [])
        if isinstance(test, dict) and not test.get("passed")
    ][:3]
    failed_summary = "\n".join(
        f"- {test.get('name')}: input={str(test.get('input', '')).strip()[:160]!r}, "
        f"expected={str(test.get('expected', '')).strip()[:120]!r}, "
        f"actual={str(test.get('actual', '')).strip()[:120]!r}, "
        f"stderr={str(test.get('stderr', '')).strip()[:160]!r}"
        for test in failed_tests
    ) or "No failed test details were recorded."
    warmups = "\n".join(
        f"- {item.question}\n  {item.answer}" for item in req.warmup_answers if item.answer.strip()
    ) or "No warm-up answers provided."

    prompt = [
        {
            "role": "system",
            "content": (
                "You are Aira, a senior software engineer and technical interviewer with 15 years "
                "of experience. Review the candidate's solution like a thoughtful senior engineer. "
                "Be specific, practical, and concise. Return ONLY valid JSON with this schema:\n"
                "{\n"
                '  "verdict": "correct | almost | incorrect | not_attempted",\n'
                '  "summary": "2-3 sentences",\n'
                '  "strengths": ["specific strength"],\n'
                '  "issues": ["specific bug, edge case, or readability issue"],\n'
                '  "complexity": "time and space complexity with a short explanation",\n'
                '  "next_steps": ["one concrete thing to practice next"]\n'
                "}\n"
                "Do not invent test results. If the code passed, focus on clarity and complexity. "
                "If it failed, point to the likely cause from the code and results."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Language: {language['label']}\n"
                f"Challenge: {challenge['title']} ({challenge['difficulty']})\n"
                f"Problem: {challenge['prompt']}\n"
                f"Expected complexity: {challenge['expected_complexity']}\n\n"
                f"Judge result summary: passed {results.get('passed', 0)} of "
                f"{results.get('total', 0)}; status: {results.get('status', 'not run')}.\n"
                f"Failed test details:\n{failed_summary}\n\n"
                f"Warm-up answers:\n{warmups}\n\n"
                f"Code:\n```{language['extension']}\n{req.code[:12000]}\n```"
            ),
        },
    ]

    fallback = {
        "verdict": "correct" if results.get("status") == "passed" else "not_attempted",
        "summary": "Your submission was executed by the judge. Request another review after improving the solution.",
        "strengths": ["The solution was submitted and reviewed by the judge."],
        "issues": [] if results.get("status") == "passed" else ["The full hidden suite has not passed yet."],
        "complexity": challenge["expected_complexity"],
        "next_steps": ["Re-run the sample tests and request a review once the solution is stable."],
    }

    try:
        raw = await call_llm(prompt, max_tokens=1100, task="analysis", json_mode=True)
        review = extract_json(raw)
        if not isinstance(review, dict):
            return fallback
        return {
            "verdict": review.get("verdict", fallback["verdict"]),
            "summary": review.get("summary", fallback["summary"]),
            "strengths": review.get("strengths", fallback["strengths"]),
            "issues": review.get("issues", fallback["issues"]),
            "complexity": review.get("complexity", challenge["expected_complexity"]),
            "next_steps": review.get("next_steps", fallback["next_steps"]),
        }
    except Exception as exc:
        log.warning("Coding review LLM error: %s", exc)
        return fallback
