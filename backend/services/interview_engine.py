"""Structured, one-question-at-a-time interview engine.

The old flow asked a general-purpose chat model to both run the interview and
decide when to move on, which meant it could ask several questions at once and
accept almost any answer. This module separates the job into three pieces:

1. A question plan is generated once, with a reference answer and required
   points for every question.
2. Every candidate answer is evaluated against that rubric.
3. The reply is composed deterministically: feedback (including the correct
   answer when needed) plus exactly one next question.

The engine works for resume interviews, technical interviews, and roadmap
interviews.
"""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from core.config import log
from services.llm_service import call_llm
from utils.json_utils import extract_json


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Question(BaseModel):
    topic: str = "General"
    question: str
    difficulty: str = "medium"
    category: str = "technical"
    expected_points: list[str] = Field(default_factory=list)
    model_answer: str = ""
    follow_up: str = ""


class AnswerEvaluation(BaseModel):
    verdict: str = "incorrect"
    score: float = 0.0
    feedback: str = ""
    missing_points: list[str] = Field(default_factory=list)


@dataclass
class TurnMessage:
    text: str
    verdict: str | None = None
    score: float | None = None
    question_number: int | None = None
    total_questions: int | None = None


@dataclass
class InterviewTurn:
    messages: list[TurnMessage]
    speech: str
    phase: str = "in_progress"
    ended: bool = False


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

RE_REPEAT = re.compile(
    r"\b(repeat|say (?:that|it) again|didn'?t (?:catch|hear)|come again|pardon)\b",
    re.I,
)
RE_CLARIFY = re.compile(
    r"\b(what do you mean|explain (?:the|your) question|rephrase|clarify (?:the|your) question)\b",
    re.I,
)
RE_HINT = re.compile(r"\b(hint|clue|guide me|help me with the question)\b", re.I)
RE_NEXT = re.compile(
    r"\b(next question|move on|skip (?:this|it)|i think i(?:'ve| have) answered|pass)\b",
    re.I,
)
RE_IDK = re.compile(
    r"\b(i (?:don'?t|do not) know|no idea|not sure|can'?t answer|i have no clue)\b",
    re.I,
)
RE_ACK = re.compile(r"^(?:ok(?:ay)?|sure|yes|no|thanks?|thank you|great|got it)\b", re.I)

NEXT_TRANSITIONS = [
    "Let's move on.",
    "Next one.",
    "Okay, next question.",
    "Let's keep going.",
    "Here's another one.",
]

GENERIC_FOLLOW_UPS = [
    "Can you walk me through your reasoning?",
    "Can you be more specific and give an example?",
    "What trade-offs did you consider?",
]


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------


def _ensure_state(session: dict[str, Any]) -> None:
    session.setdefault("interview_plan", [])
    session.setdefault("current_question_index", 0)
    session.setdefault("attempts_on_current", 0)
    session.setdefault("hints_on_current", 0)
    session.setdefault("evaluations", [])
    session.setdefault("interview_phase", "not_started")
    session.setdefault("greeted", False)
    session.setdefault("question_count", 0)


def _candidate_name(session: dict[str, Any]) -> str:
    candidate = session.get("candidate") or {}
    name = str(candidate.get("name") or "").strip()
    if not name or name.lower() in {"candidate", "professional", "you", "user"}:
        return "there"
    return name.split()[0]


def _interview_type(session: dict[str, Any]) -> str:
    return session.get("interview_type", "resume")


def _items(session: dict[str, Any]) -> list[dict[str, Any]]:
    return session.get("interview_plan") or []


def _current_question(session: dict[str, Any]) -> dict[str, Any] | None:
    plan = _items(session)
    idx = int(session.get("current_question_index", 0))
    if 0 <= idx < len(plan):
        return plan[idx]
    return None


def _progress_meta(session: dict[str, Any], index: int | None = None) -> dict[str, int]:
    plan = _items(session)
    total = len(plan)
    idx = int(session.get("current_question_index", 0)) if index is None else index
    return {
        "question_number": max(1, min(idx + 1, total or 1)),
        "total_questions": max(1, total),
    }


def _meta(
    session: dict[str, Any],
    index: int | None = None,
    verdict: str | None = None,
    score: float | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {
        "question_number": _progress_meta(session, index)["question_number"],
        "total_questions": _progress_meta(session, index)["total_questions"],
    }
    if verdict:
        meta["verdict"] = verdict
    if score is not None:
        meta["score"] = round(float(score), 1)
    return meta


def _message(
    session: dict[str, Any],
    text: str,
    *,
    index: int | None = None,
    verdict: str | None = None,
    score: float | None = None,
) -> TurnMessage:
    meta = _meta(session, index, verdict, score)
    return TurnMessage(
        text=text,
        verdict=meta.get("verdict"),
        score=meta.get("score"),
        question_number=meta.get("question_number"),
        total_questions=meta.get("total_questions"),
    )


def _single(session: dict[str, Any], text: str, **kwargs: Any) -> InterviewTurn:
    msg = _message(session, text, **kwargs)
    return InterviewTurn(messages=[msg], speech=text, phase=session.get("interview_phase", "in_progress"))


# ---------------------------------------------------------------------------
# Text hygiene
# ---------------------------------------------------------------------------


def _clean_spoken(text: str) -> str:
    text = re.sub(r"```.*?```", " ", text or "", flags=re.S)
    text = re.sub(r"[*_#>`]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _strip_questions(text: str) -> str:
    """Feedback must never contain a question: exactly one question is added."""
    return re.sub(r"\?+", ".", text or "").strip()


def _limit_words(text: str, limit: int) -> str:
    words = text.split()
    if len(words) <= limit:
        return text
    shortened = " ".join(words[:limit])
    if "." in shortened:
        shortened = shortened.rsplit(".", 1)[0] + "."
    else:
        shortened = shortened.rstrip(",;:") + "."
    return shortened


def _ensure_one_question(text: str) -> str:
    text = _clean_spoken(text)
    if not text:
        return ""
    if re.match(r"^(explain|describe|tell me about|walk me through)\b", text, re.I):
        text = re.sub(
            r"^(explain|describe|tell me about|walk me through)\b",
            lambda match: f"Can you {match.group(1).lower()}",
            text,
            count=1,
            flags=re.I,
        )
    if "?" not in text:
        return text.rstrip(".") + "?"
    return text


def _terms(text: str) -> set[str]:
    stop = {
        "the", "and", "for", "that", "with", "this", "from", "have", "will",
        "your", "you", "are", "what", "how", "why", "when", "which", "can",
        "does", "did", "not", "but", "into", "about", "they", "their", "them",
        "would", "could", "should", "there", "then", "than", "also", "just",
        "like", "make", "made", "use", "used", "using", "get", "got", "one",
    }
    text = (text or "").replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.]{2,}", text.lower())
    return {w for w in words if w not in stop}


def _overlap(a: str, b: str) -> float:
    left, right = _terms(a), _terms(b)
    if not right:
        return 0.0
    return len(left & right) / len(right)


LANGUAGE_ALIASES: dict[str, tuple[str, ...]] = {
    "javascript": ("javascript", "js"),
    "typescript": ("typescript", "ts"),
    "python": ("python",),
    "java": ("java",),
    "c++": ("c++", "cpp"),
    "c#": ("c#", "csharp"),
    "go": ("golang",),
    "rust": ("rust",),
    "react": ("react", "react.js", "reactjs"),
    "node": ("node.js", "nodejs"),
    "sql": ("sql",),
    "ruby": ("ruby",),
    "php": ("php",),
    "kotlin": ("kotlin",),
    "swift": ("swift",),
    "scala": ("scala",),
    "dart": ("dart",),
}

LANGUAGE_PREREQUISITES: dict[str, set[str]] = {
    "react": {"javascript", "typescript"},
    "node": {"javascript", "typescript"},
    "typescript": {"javascript"},
}


def _canonical_languages(values: list[str]) -> set[str]:
    found: set[str] = set()
    for value in values:
        for canonical, aliases in LANGUAGE_ALIASES.items():
            if any(re.search(rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])", value, re.I) for alias in aliases):
                found.add(canonical)
    return found


def _mentions_foreign_language(session: dict[str, Any], text: str) -> bool:
    requested = _canonical_languages([str(item) for item in session.get("languages", [])])
    if not requested:
        return False
    allowed = set(requested)
    for language in requested:
        allowed |= LANGUAGE_PREREQUISITES.get(language, set())
    mentioned = _canonical_languages([text])
    return bool(mentioned - allowed)


BAD_QUESTION_RE = re.compile(
    r"(following code|code above|this code|this snippet|table below|image above|as shown)",
    re.I,
)
CODE_LIKE_RE = re.compile(r"(console\.log|=>|;\s*$|function\s*\w+\s*\()")
CODE_OUTPUT_RE = re.compile(
    r"\bwhat (?:is|will be) (?:the )?(?:output|printed|logged)\b|"
    r"\bwhat does (?:this|the) (?:code|function|snippet) (?:print|return|output)\b|"
    r"\bwhat happens when (?:this|the) code\b",
    re.I,
)


def _is_usable_question(session: dict[str, Any], text: str, topic: str = "") -> bool:
    if not text:
        return False
    if BAD_QUESTION_RE.search(text) or CODE_OUTPUT_RE.search(text):
        return False
    if CODE_LIKE_RE.search(text):
        # Spoken interviews cannot rely on a visible code sample.
        return False
    if _interview_type(session) == "tech" and _mentions_foreign_language(
        session, f"{text} {topic}"
    ):
        return False
    return True


# ---------------------------------------------------------------------------
# Curated fallback plan
# ---------------------------------------------------------------------------

TECH_FALLBACK: dict[str, list[dict[str, Any]]] = {
    "javascript": [
        {
            "topic": "JavaScript event loop",
            "question": "How does the JavaScript event loop decide what to run next when a promise and a timer are both pending?",
            "expected_points": ["call stack", "microtask queue", "macrotask queue", "promises run before timers"],
            "model_answer": "JavaScript runs the call stack first, then drains the microtask queue, which contains promise callbacks, before taking the next macrotask such as a timer callback. That is why a resolved promise runs before a zero-delay setTimeout.",
            "follow_up": "Which queue would run first: a resolved promise callback or a setTimeout with zero delay?",
        },
        {
            "topic": "Closures",
            "question": "What is a closure, and what problem can it cause in a loop?",
            "expected_points": ["function remembers lexical scope", "variables stay alive", "loop with var captures the same binding", "let creates a new binding"],
            "model_answer": "A closure is a function that keeps access to the lexical environment where it was created. In a loop with var, every callback closes over the same variable, so they all see the final value. Using let creates a fresh binding per iteration, which fixes it.",
            "follow_up": "What would you see if you used var instead of let in that loop?",
        },
    ],
    "typescript": [
        {
            "topic": "Type safety",
            "question": "What is the difference between any and unknown in TypeScript?",
            "expected_points": ["any disables checking", "unknown requires narrowing", "unknown is safer"],
            "model_answer": "Both can hold any value, but any disables type checking and lets you use the value freely. unknown is safer because TypeScript forces you to narrow the type before using it, for example with a typeof check.",
            "follow_up": "How would you narrow an unknown value before calling a method on it?",
        },
        {
            "topic": "Generics",
            "question": "Why would you use a generic in TypeScript instead of a union type?",
            "expected_points": ["preserves relationship between input and output", "reusable across types", "avoids casts"],
            "model_answer": "A generic preserves the relationship between the input and the output, so the caller still gets a specific type. A union forces you to handle every member and often leads to casts or lost type information.",
            "follow_up": "Give an example where a union loses information that a generic keeps.",
        },
    ],
    "python": [
        {
            "topic": "Python GIL",
            "question": "What is the Python GIL, and what does it mean for CPU-bound versus I/O-bound work?",
            "expected_points": ["one thread executes bytecode at a time", "CPU-bound threads do not run in parallel", "I/O releases the GIL", "use multiprocessing or asyncio"],
            "model_answer": "The GIL is a lock that lets only one thread execute Python bytecode at a time. CPU-bound threads therefore do not run truly in parallel, while I/O-bound work can still overlap because I/O releases the GIL. For CPU-bound work, use multiprocessing or native extensions.",
            "follow_up": "Which would you choose for a CPU-heavy image processing task, threads or processes?",
        },
        {
            "topic": "Generators",
            "question": "How does a Python generator differ from a list, and when would you use one?",
            "expected_points": ["lazy evaluation", "yields one item at a time", "constant memory", "good for large streams"],
            "model_answer": "A generator yields values lazily, one at a time, so it does not build the whole collection in memory. A list holds every element. Generators are useful for large or infinite streams and pipelines where you only need each value once.",
            "follow_up": "What happens to a generator after you iterate over it once?",
        },
    ],
    "react": [
        {
            "topic": "React rendering",
            "question": "Why can a React component re-render even when its props have not changed?",
            "expected_points": ["parent re-render", "state or context change", "new object identity", "memo does not compare deeply"],
            "model_answer": "A component re-renders when its parent re-renders, when its own state changes, when a context it reads changes, or when a memo boundary receives a new object identity. React.memo compares props shallowly, so a new object or function prop still causes a render.",
            "follow_up": "How would you stop a callback prop from breaking memoization?",
        },
        {
            "topic": "React effects",
            "question": "What is the purpose of the dependency array in useEffect, and what happens if it is wrong?",
            "expected_points": ["controls when the effect re-runs", "missing deps cause stale values", "extra deps cause unnecessary runs", "cleanup runs before re-run"],
            "model_answer": "The dependency array tells React when the effect should run again. Missing dependencies can capture stale props or state, while extra dependencies cause unnecessary runs. The cleanup function runs before the next effect and on unmount.",
            "follow_up": "What kind of bug appears when you omit a value that changes over time?",
        },
    ],
    "java": [
        {
            "topic": "equals and hashCode",
            "question": "Why must equals and hashCode be consistent in Java?",
            "expected_points": ["hash-based collections", "equal objects need equal hashes", "contract", "broken lookups"],
            "model_answer": "Hash-based collections such as HashMap use hashCode to choose a bucket and equals to find the matching key. If equal objects have different hashes, lookups, removals, and deduplication break even though equals says they are the same.",
            "follow_up": "What happens if two equal objects return different hash codes in a HashSet?",
        },
    ],
    "sql": [
        {
            "topic": "Indexes",
            "question": "How does a database index speed up a query, and what does it cost?",
            "expected_points": ["B-tree lookup", "avoids full scan", "extra writes", "storage", "selectivity matters"],
            "model_answer": "An index stores a sorted structure such as a B-tree so the database can find rows without scanning the whole table. It costs storage and makes inserts, updates, and deletes slower, so indexes should target selective columns used in filters and joins.",
            "follow_up": "Why can an index on a column with very few distinct values be a poor choice?",
        },
    ],
    "go": [
        {
            "topic": "Goroutines",
            "question": "How do goroutines differ from operating-system threads?",
            "expected_points": ["user-space scheduling", "small initial stack", "multiplexed onto OS threads", "cheap to create"],
            "model_answer": "Goroutines are scheduled by the Go runtime and multiplexed onto a smaller pool of OS threads. They start with a small stack that grows as needed, so creating many of them is cheap compared with a thread per task.",
            "follow_up": "What happens when a goroutine blocks on a channel?",
        },
    ],
    "generic": [
        {
            "topic": "System design",
            "question": "How would you design a rate limiter for a public API?",
            "expected_points": ["identify the key", "token bucket or sliding window", "shared state", "distributed store", "429 response"],
            "model_answer": "I would key the limit by user or API key, use a token bucket or sliding-window counter, and store the counters in a shared store such as Redis when there are multiple API servers. Rejected requests return 429 with a retry hint.",
            "follow_up": "What would you do if the rate-limiter store itself becomes a bottleneck?",
        },
        {
            "topic": "Debugging",
            "question": "A service starts returning 500 errors after a deploy. Walk me through how you would investigate it.",
            "expected_points": ["stabilize or roll back", "check logs and metrics", "recent changes", "reproduce", "root cause", "add a regression test"],
            "model_answer": "First I would stop the bleeding, likely by rolling back, then check error logs, metrics, and the deploy diff. I would reproduce the failure in a safe environment, isolate the root cause, fix it, and add a regression test before redeploying.",
            "follow_up": "Which signal would you check first, logs or metrics, and why?",
        },
        {
            "topic": "Complexity",
            "question": "How do you work out the time and space complexity of an algorithm, and why does it matter in practice?",
            "expected_points": ["count operations by input size", "dominant term", "space for extra structures", "scaling", "trade-offs"],
            "model_answer": "I count how the work grows with the input size, keep the dominant term, and do the same for extra memory. It matters because it predicts how the solution scales, and it exposes trade-offs such as speed versus memory.",
            "follow_up": "What is the complexity of looking up a value in a hash map, and what assumption makes that true?",
        },
        {
            "topic": "Caching",
            "question": "When would you introduce a cache, and how do you stop it from serving stale data?",
            "expected_points": ["read-heavy workload", "cache key", "TTL or invalidation", "consistency", "measure hit rate"],
            "model_answer": "I would cache when reads are frequent, expensive, and tolerant of a small delay. I would choose a clear cache key, use a TTL or explicit invalidation on writes, and monitor the hit rate. For strong consistency, I would avoid caching or invalidate synchronously.",
            "follow_up": "What would you do if invalidation fails after a write?",
        },
        {
            "topic": "Testing",
            "question": "How would you test a feature that depends on a third-party API you do not control?",
            "expected_points": ["contract tests", "stubs or fakes", "timeouts and retries", "error paths", "integration test"],
            "model_answer": "I would isolate the client behind an interface, use fakes or recorded responses for fast tests, and add a small contract or integration test against the real API. I would also test timeouts, retries, and malformed responses, not just the happy path.",
            "follow_up": "Which failure mode is most important to test first?",
        },
        {
            "topic": "Concurrency",
            "question": "What is a race condition, and how would you prevent one?",
            "expected_points": ["shared mutable state", "interleaving", "locking or atomic operations", "immutability", "reproduce under load"],
            "model_answer": "A race condition happens when two executions interleave over shared mutable state and the result depends on timing. I prevent it with locking, atomic operations, message passing, or immutable data, and I verify the fix with a concurrency test or load test.",
            "follow_up": "Why can adding a lock create a deadlock if you are not careful?",
        },
    ],
}

RESUME_FALLBACK = [
    {
        "topic": "Recent project",
        "question": "Walk me through the project you are most proud of: what you owned, the hardest decision, and the outcome.",
        "expected_points": ["clear ownership", "technical decision", "trade-off", "measurable outcome"],
        "model_answer": "A strong answer names the project, the candidate's specific ownership, one important technical decision with its trade-off, and a measurable result such as performance, reliability, or user impact.",
        "follow_up": "What would you do differently if you rebuilt it today?",
        "category": "behavioral",
    },
    {
        "topic": "Debugging",
        "question": "Tell me about the hardest bug you have debugged. How did you narrow it down?",
        "expected_points": ["symptom", "hypothesis", "isolation", "root cause", "prevention"],
        "model_answer": "A strong answer describes the symptom, how the candidate formed and tested hypotheses, the tooling used to isolate the cause, the actual root cause, and the change that prevented recurrence.",
        "follow_up": "What signal finally pointed you at the root cause?",
        "category": "behavioral",
    },
    {
        "topic": "Code quality",
        "question": "How do you decide what deserves a unit test versus an integration test versus no test?",
        "expected_points": ["risk and complexity", "contracts", "fast unit tests", "integration for wiring", "not testing implementation details"],
        "model_answer": "I test the risky, complex behavior and the public contracts. Pure logic gets fast unit tests, while database, network, and cross-service wiring get integration tests. I avoid tests that only assert implementation details.",
        "follow_up": "Can you give an example of a bug a unit test would have missed?",
        "category": "technical",
    },
    {
        "topic": "API design",
        "question": "How would you design a paginated API that stays stable while records are being inserted?",
        "expected_points": ["cursor-based pagination", "stable sort key", "no offset drift", "limits"],
        "model_answer": "I would use cursor-based pagination with a stable unique sort key rather than offset pagination, because offsets drift when rows are inserted. The cursor encodes the last seen key, and the API returns the next cursor with an enforced page limit.",
        "follow_up": "What breaks if the sort key is not unique?",
        "category": "technical",
    },
    {
        "topic": "Performance",
        "question": "A page feels slow for users. How do you find out whether the problem is frontend, network, or backend?",
        "expected_points": ["measure first", "browser performance tools", "network waterfall", "server traces", "percentiles"],
        "model_answer": "I would measure before changing anything: browser performance traces and core web vitals for the frontend, a network waterfall for transfer and latency, and server traces plus p95 latency for the backend. Comparing those signals tells me where the time is actually going.",
        "follow_up": "Which percentile would you use to judge a real user's experience, and why?",
        "category": "technical",
    },
    {
        "topic": "Collaboration",
        "question": "Tell me about a time you disagreed with a teammate on a technical decision. How did you resolve it?",
        "expected_points": ["listen", "shared criteria", "evidence", "decision", "commitment"],
        "model_answer": "A strong answer shows the candidate listening to the other view, agreeing on criteria such as risk or maintainability, bringing evidence or a small prototype, and then committing to the decision even if it was not theirs.",
        "follow_up": "What did you learn from that disagreement?",
        "category": "behavioral",
    },
]


def _fallback_plan(session: dict[str, Any]) -> list[Question]:
    interview_type = _interview_type(session)
    if interview_type == "resume":
        raw = RESUME_FALLBACK
    else:
        languages = [str(item).lower() for item in session.get("languages", [])]
        raw = []
        for language in languages:
            for key, questions in TECH_FALLBACK.items():
                if key != "generic" and (key in language or language in key):
                    raw.extend(questions[:2])
        raw.extend(TECH_FALLBACK["generic"])
        if not raw:
            raw = TECH_FALLBACK["generic"]
        raw = raw[:6]
    questions: list[Question] = []
    for item in raw:
        try:
            question = Question(**item)
        except ValidationError:
            continue
        if question.question:
            questions.append(question)
    return questions[:7]


# ---------------------------------------------------------------------------
# Plan generation
# ---------------------------------------------------------------------------


def _plan_prompt(session: dict[str, Any]) -> str:
    interview_type = _interview_type(session)
    base_rules = (
        "Each question must test ONE concept and have a clear, correct answer. "
        "Questions must be answerable in 30 to 90 seconds. "
        "Every question must be fully understandable by hearing it once: do NOT refer to "
        "'the following code', 'the code above', 'this snippet', a table, an image, or "
        "anything the candidate cannot see. Never include code blocks or markdown. "
        "Prefer conceptual how/why questions. Never ask trick questions, 'what is the output' "
        "questions, or questions that require running code. "
        "expected_points must contain 3 to 5 short phrases that a correct answer needs. "
        "model_answer must be an accurate, concise reference answer under 90 words. "
        "follow_up must be one probing question used when an answer is vague. "
        "Return ONLY valid JSON with the shape "
        '{"questions":[{"topic":"","question":"","difficulty":"easy|medium|hard",'
        '"category":"intro|technical|behavioral|scenario","expected_points":[""],'
        '"model_answer":"","follow_up":""}]}. '
        "No markdown, no commentary."
    )
    if interview_type == "tech":
        languages = ", ".join(session.get("languages", [])) or "general programming"
        complexity = session.get("complexity", "medium")
        return (
            f"Design a rigorous {complexity}-complexity technical interview plan. "
            f"The interview covers ONLY these languages: {languages}. "
            "Do not mention or test any other programming language. "
            "Create exactly 6 questions ordered from fundamentals to deeper reasoning. "
            "Include one practical debugging or scenario question. "
            "Do not ask about the candidate's background or behaviour. " + base_rules
        )
    if interview_type == "job_roadmap":
        topics = ", ".join(session.get("topics_studied", [])) or session.get("job_title", "the role")
        role = session.get("job_title", "the target role")
        level = session.get("experience_level", "mid")
        return (
            f"Design a {level}-level interview for a {role} role. "
            f"The candidate studied exactly these topics: {topics}. "
            "Create 6 questions that ONLY test those studied topics. "
            "Each question must be practical and test understanding, not trivia. " + base_rules
        )
    candidate = session.get("candidate") or {}
    role = candidate.get("role") or "software engineer"
    skills = ", ".join(candidate.get("skills", [])[:12]) or "their listed skills"
    years = candidate.get("years") or ""
    return (
        f"Design a realistic interview for a {role} candidate{f' with {years} of experience' if years else ''}. "
        f"Their strongest listed skills are: {skills}. "
        "Create 7 questions: one background question, four technical questions tied to the resume, "
        "and two behavioural questions that use the STAR format. "
        "Do not ask generic trivia; anchor technical questions in the candidate's actual work. "
        + base_rules
    )


def _plan_context(session: dict[str, Any]) -> str:
    interview_type = _interview_type(session)
    if interview_type == "resume":
        candidate = session.get("candidate") or {}
        resume = (session.get("resume_text") or "")[:4000]
        return (
            f"Candidate profile: {candidate}\n\n"
            f"Resume:\n{resume}"
        )
    if interview_type == "tech":
        return (
            f"Languages: {', '.join(session.get('languages', []))}\n"
            f"Complexity: {session.get('complexity', 'medium')}"
        )
    return (
        f"Role: {session.get('job_title', '')}\n"
        f"Level: {session.get('experience_level', '')}\n"
        f"Studied topics: {', '.join(session.get('topics_studied', []))}\n"
        f"Specific tasks: {', '.join(session.get('studied_specific_topics', []))}"
    )


async def _generate_plan(session: dict[str, Any]) -> list[Question]:
    prompt = _plan_prompt(session)
    context = _plan_context(session)
    try:
        raw = await call_llm(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": context},
            ],
            task="analysis",
            temperature=0.35,
            max_tokens=3000,
        )
        data = extract_json(raw)
        raw_questions = []
        if isinstance(data, dict):
            raw_questions = data.get("questions") or []
        elif isinstance(data, list):
            raw_questions = data
        questions: list[Question] = []
        seen: set[str] = set()
        for item in raw_questions:
            if not isinstance(item, dict):
                continue
            text = _ensure_one_question(str(item.get("question", "")))
            topic = str(item.get("topic", "General")).strip() or "General"
            if not text or text.lower() in seen:
                continue
            if not _is_usable_question(session, text, topic):
                log.info("Dropping unusable plan question: %s", text[:90])
                continue
            seen.add(text.lower())
            points = item.get("expected_points") or []
            if isinstance(points, str):
                points = [points]
            points = [str(point).strip() for point in points if str(point).strip()][:6]
            model_answer = _clean_spoken(str(item.get("model_answer", "")))
            if not model_answer:
                model_answer = "A correct answer should cover: " + ", ".join(points) + "."
            questions.append(
                Question(
                    topic=topic,
                    question=text,
                    difficulty=str(item.get("difficulty", "medium")).lower(),
                    category=str(item.get("category", "technical")).lower(),
                    expected_points=points,
                    model_answer=model_answer,
                    follow_up=_ensure_one_question(str(item.get("follow_up", ""))),
                )
            )
        if len(questions) >= 4:
            questions = await _verify_plan(session, questions)
        if len(questions) >= 4:
            log.info("Interview plan generated (%d questions, type=%s)", len(questions), _interview_type(session))
            return questions
        log.warning("Interview plan was too short (%d); using curated fallback.", len(questions))
    except Exception as error:
        log.warning("Interview plan generation failed: %s", error)

    return _fallback_plan(session)


async def _verify_plan(
    session: dict[str, Any], questions: list[Question]
) -> list[Question]:
    """Cross-check every question and reference answer before the interview.

    The generating model can produce an ambiguous question or, worse, a wrong
    reference answer. A second pass with the reasoning model removes or fixes
    those before the candidate ever hears them.
    """
    payload = [
        {
            "id": str(index),
            "topic": question.topic,
            "question": question.question,
            "expected_points": question.expected_points,
            "model_answer": question.model_answer,
        }
        for index, question in enumerate(questions)
    ]
    prompt = (
        "You are a principal engineer reviewing an interview plan before it is used in a live mock interview. "
        "For every item, verify:\n"
        "1. The question is self-contained, unambiguous, and can be answered without seeing code or a table.\n"
        "2. The model_answer is technically correct, complete, and under 90 words.\n"
        "3. The expected_points match the model_answer and are truly required for a correct answer.\n"
        "4. The question tests one concept, is not a trick, and is not a code-output question.\n\n"
        "Return ONLY valid JSON:\n"
        '{"reviews":[{"id":"0","valid":true,"corrected_question":"","corrected_model_answer":"","corrected_expected_points":[],"reason":""}]}\n'
        "If the item is valid, use empty correction fields. "
        "If it is fixable, set valid to true and provide corrected fields. "
        "If it is not fixable, set valid to false. "
        "Be strict about technical correctness: a confidently wrong answer is worse than dropping the question. "
        "No markdown, no extra keys."
    )
    try:
        raw = await call_llm(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            task="interview",
            temperature=0.1,
            max_tokens=3000,
        )
        data = extract_json(raw)
        reviews = data.get("reviews") if isinstance(data, dict) else None
        if not isinstance(reviews, list):
            return questions
        review_map = {
            str(review.get("id")): review
            for review in reviews
            if isinstance(review, dict) and review.get("id") is not None
        }
        verified: list[Question] = []
        for index, question in enumerate(questions):
            review = review_map.get(str(index))
            if not review:
                verified.append(question)
                continue
            valid_flag = review.get("valid")
            is_invalid = valid_flag is False or str(valid_flag).strip().lower() == "false"
            if is_invalid and not review.get("corrected_model_answer"):
                log.info("Verifier dropped question %d: %s", index, review.get("reason", "invalid"))
                continue

            corrected_question = _ensure_one_question(str(review.get("corrected_question") or ""))
            corrected_answer = _clean_spoken(str(review.get("corrected_model_answer") or ""))
            corrected_points = review.get("corrected_expected_points") or []
            if isinstance(corrected_points, str):
                corrected_points = [corrected_points]
            corrected_points = [
                str(point).strip() for point in corrected_points if str(point).strip()
            ][:6]

            if corrected_question and _is_usable_question(session, corrected_question, question.topic):
                question.question = corrected_question
            if corrected_answer:
                question.model_answer = corrected_answer
            if corrected_points:
                question.expected_points = corrected_points
            if not question.model_answer:
                continue
            verified.append(question)
        return verified
    except Exception as error:
        log.warning("Plan verification failed, keeping generated plan: %s", error)
        return questions


async def prepare_plan(session: dict[str, Any]) -> None:
    """Generate and store the question plan once for a session."""
    _ensure_state(session)
    if _items(session):
        return
    plan = await _generate_plan(session)
    session["interview_plan"] = [question.model_dump() for question in plan]
    session["current_question_index"] = 0
    session["attempts_on_current"] = 0
    session["hints_on_current"] = 0
    session["evaluations"] = []
    session["interview_phase"] = "in_progress"


def schedule_plan(session: dict[str, Any]) -> None:
    """Start plan generation in the background while the candidate navigates."""
    _ensure_state(session)
    if _items(session):
        return
    task = session.get("plan_task")
    if task and not task.done():
        return
    try:
        session["plan_task"] = asyncio.create_task(prepare_plan(session))
    except RuntimeError:
        # No running loop (e.g. an unusual sync context); fall back to lazy.
        session["plan_task"] = None


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------


def _normalise_verdict(value: Any) -> str:
    text = str(value or "").strip().lower().replace(" ", "_").replace("-", "_")
    mapping = {
        "correct": "correct",
        "right": "correct",
        "partially_correct": "partially_correct",
        "partial": "partially_correct",
        "mostly_correct": "partially_correct",
        "incorrect": "incorrect",
        "wrong": "incorrect",
        "vague": "vague",
        "unclear": "vague",
        "off_topic": "off_topic",
        "irrelevant": "off_topic",
        "dont_know": "dont_know",
        "don't_know": "dont_know",
        "unknown": "dont_know",
    }
    return mapping.get(text, "incorrect")


def _heuristic_evaluation(question: dict[str, Any], answer: str) -> AnswerEvaluation:
    reference = " ".join(
        [question.get("model_answer", ""), *question.get("expected_points", [])]
    )
    overlap = _overlap(answer, reference)
    words = len(answer.split())
    if words < 4:
        return AnswerEvaluation(
            verdict="vague",
            score=1.0,
            feedback="That is too brief for me to evaluate. Give me your reasoning and a concrete detail.",
        )
    if overlap >= 0.45:
        verdict = "correct"
        score = 8.0
        feedback = "That is essentially right."
    elif overlap >= 0.2:
        verdict = "partially_correct"
        score = 5.0
        feedback = "You are on the right track, but the answer is incomplete."
    else:
        verdict = "incorrect"
        score = 2.0
        feedback = "That is not the answer I was looking for."
    return AnswerEvaluation(
        verdict=verdict,
        score=score,
        feedback=feedback,
        missing_points=question.get("expected_points", [])[:3] if verdict != "correct" else [],
    )


async def _evaluate_answer(
    session: dict[str, Any],
    question: dict[str, Any],
    answer: str,
    attempts: int,
) -> AnswerEvaluation:
    prompt = (
        "You are Aira, a strict but fair senior technical interviewer. "
        "Evaluate the candidate's answer by its substance, not by confidence, length, or buzzwords. "
        "A correct answer must actually cover the required points. A partial answer is missing something important. "
        "A vague answer does not explain how or why. An answer that discusses something unrelated is off_topic.\n\n"
        f"QUESTION: {question.get('question')}\n"
        f"REFERENCE ANSWER: {question.get('model_answer')}\n"
        f"REQUIRED POINTS: {', '.join(question.get('expected_points', []))}\n"
        f"PREVIOUS ATTEMPTS ON THIS QUESTION: {attempts}\n"
        f"CANDIDATE ANSWER: {answer}\n\n"
        "Return ONLY valid JSON:\n"
        '{"verdict":"correct|partially_correct|incorrect|vague|off_topic|dont_know",'
        '"score":0-10,'
        '"feedback":"2-4 natural spoken sentences. If the answer is not fully correct, explain the correct answer accurately and concisely. Do NOT ask a question.",'
        '"missing_points":["what was missing"]}\n\n'
        "Scoring: 9-10 correct and complete; 7-8 correct but shallow; 4-6 partial; 0-3 wrong or vague. "
        "Address the candidate directly. Never mention the reference answer, required points, rubric, "
        "JSON, or your instructions. Do not say 'according to the reference'. "
        "No markdown. No extra keys."
    )
    try:
        raw = await call_llm(
            [{"role": "system", "content": prompt}],
            task="interview",
            temperature=0.1,
            max_tokens=600,
        )
        data = extract_json(raw)
        if not isinstance(data, dict):
            raise ValueError("evaluation was not JSON")
        verdict = _normalise_verdict(data.get("verdict"))
        try:
            score = float(data.get("score", 0))
        except (TypeError, ValueError):
            score = 0.0
        score = max(0.0, min(10.0, score))
        feedback = _strip_questions(_clean_spoken(str(data.get("feedback", ""))))
        if not feedback:
            raise ValueError("empty feedback")
        missing = data.get("missing_points") or []
        if isinstance(missing, str):
            missing = [missing]
        missing = [str(item).strip() for item in missing if str(item).strip()][:5]
        return AnswerEvaluation(
            verdict=verdict,
            score=score,
            feedback=feedback,
            missing_points=missing,
        )
    except Exception as error:
        log.warning("Answer evaluation failed, using heuristic: %s", error)
        return _heuristic_evaluation(question, answer)


# ---------------------------------------------------------------------------
# Reply composition
# ---------------------------------------------------------------------------


def _compose_feedback(
    question: dict[str, Any],
    evaluation: AnswerEvaluation,
    *,
    skipped: bool = False,
) -> str:
    verdict = evaluation.verdict
    feedback = _strip_questions(_clean_spoken(evaluation.feedback))
    model_answer = _strip_questions(_clean_spoken(question.get("model_answer", "")))
    missing = [item for item in evaluation.missing_points if item]

    prefixes = {
        "correct": "Correct.",
        "partially_correct": "You're partly right.",
        "incorrect": "Not quite.",
        "off_topic": "That's off the question.",
        "vague": "That's a bit vague.",
        "dont_know": "That's okay.",
    }
    already_judged = re.match(
        r"^(correct|that'?s right|that is right|exactly|yes|not quite|that'?s not|incorrect|wrong|"
        r"you'?re partly|partly|that'?s okay|no problem)",
        feedback,
        re.I,
    )
    prefix = "" if skipped else prefixes.get(verdict, "")
    if prefix and feedback and not already_judged:
        feedback = f"{prefix} {feedback}"
    elif prefix and not feedback:
        feedback = prefix

    if skipped:
        return _limit_words(f"{feedback} {model_answer}".strip(), 80)

    if verdict == "correct":
        return _limit_words(feedback or "Correct.", 55)

    if verdict == "dont_know":
        return _limit_words(f"{feedback} {model_answer}".strip(), 80)

    if verdict == "partially_correct":
        body = feedback or prefix
        if missing:
            body = f"{body} The missing piece is {missing[0]}."
        if model_answer and _overlap(body, model_answer) < 0.35:
            body = f"{body} {model_answer}"
        return _limit_words(body.strip(), 90)

    # Incorrect, off-topic, or still vague after a probe: teach the verified
    # reference answer directly. This keeps the correction concise and avoids
    # a long, repetitive explanation in the candidate's ear.
    return _limit_words(f"{prefix} {model_answer or feedback}".strip(), 80)


def _next_transition(session: dict[str, Any]) -> str:
    index = int(session.get("current_question_index", 0))
    return NEXT_TRANSITIONS[index % len(NEXT_TRANSITIONS)]


def _finish_question(
    session: dict[str, Any],
    evaluation: AnswerEvaluation,
    *,
    skipped: bool = False,
) -> InterviewTurn:
    question = _current_question(session) or {}
    question_index = int(session.get("current_question_index", 0))
    feedback = _compose_feedback(question, evaluation, skipped=skipped)

    session.setdefault("evaluations", []).append(
        {
            "question": question.get("question", ""),
            "topic": question.get("topic", "General"),
            "verdict": "skipped" if skipped else evaluation.verdict,
            "score": 0.0 if skipped else evaluation.score,
            "candidate_missing": evaluation.missing_points,
        }
    )

    total = len(_items(session))
    next_index = question_index + 1
    session["current_question_index"] = next_index
    session["attempts_on_current"] = 0
    session["hints_on_current"] = 0
    session["question_count"] = min(next_index, total)

    messages: list[TurnMessage] = [
        _message(
            session,
            feedback,
            index=question_index,
            verdict="skipped" if skipped else evaluation.verdict,
            score=0.0 if skipped else evaluation.score,
        )
    ]

    if next_index < total:
        next_question = _items(session)[next_index]
        question_text = _ensure_one_question(str(next_question.get("question", "")))
        transition = _next_transition(session)
        line = f"{transition} {question_text}".strip()
        session["interview_phase"] = "in_progress"
        messages.append(_message(session, line, index=next_index))
        speech = f"{feedback} {line}".strip()
    else:
        if _interview_type(session) == "resume":
            tail = "That's all my questions. Is there anything you'd like to ask me?"
            session["interview_phase"] = "awaiting_questions"
        else:
            tail = "That's all my questions. Please click End Call when you're ready."
            session["interview_phase"] = "complete"
        messages.append(_message(session, tail, index=max(0, total - 1)))
        speech = f"{feedback} {tail}".strip()

    session["diagnostics"] = {
        "last_verdict": evaluation.verdict,
        "last_score": evaluation.score,
    }
    return InterviewTurn(messages=messages, speech=speech, phase=session["interview_phase"])


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def start_interview(session: dict[str, Any]) -> InterviewTurn:
    _ensure_state(session)
    task = session.get("plan_task")
    if task:
        try:
            await task
        except Exception as error:
            log.warning("Background plan generation failed: %s", error)
    if not _items(session):
        await prepare_plan(session)

    first = _current_question(session)
    if not first:
        return _single(
            session,
            "I wasn't able to prepare the interview plan. Please try starting a new session.",
        )

    name = _candidate_name(session)
    interview_type = _interview_type(session)
    if interview_type == "tech":
        languages = ", ".join(session.get("languages", []))
        complexity = session.get("complexity", "medium")
        intro = (
            f"Hi {name}, I'm Aira. Today I'll test you on {languages} at {complexity} level. "
            "We'll take one question at a time, and if an answer needs correction I'll explain it before we move on."
        )
    elif interview_type == "job_roadmap":
        role = session.get("job_title", "the role")
        intro = (
            f"Hi {name}, I'm Aira. Let's see how your preparation for the {role} role is paying off. "
            "One question at a time — I'll correct anything that needs it."
        )
    else:
        role = (session.get("candidate") or {}).get("role") or "the role"
        intro = (
            f"Hi {name}, I'm Aira. Thanks for making the time. "
            f"I'll start with your background, then dig into a few technical areas for {role}."
        )

    question_text = _ensure_one_question(str(first.get("question", "")))
    speech = f"{intro} First question: {question_text}"
    session["greeted"] = True
    session["interview_phase"] = "in_progress"
    session["question_count"] = 1
    log.info(
        "Interview started: type=%s total_questions=%d",
        interview_type,
        len(_items(session)),
    )
    return InterviewTurn(
        messages=[_message(session, speech, index=0)],
        speech=speech,
        phase="in_progress",
    )


async def resume_interview(session: dict[str, Any]) -> InterviewTurn:
    """Re-ask the active question after a reconnect without losing state."""
    _ensure_state(session)
    if not _items(session):
        return await start_interview(session)
    question = _current_question(session)
    if not question:
        return _single(session, "Welcome back. That's all my questions — please click End Call when you're ready.")
    phase = session.get("interview_phase", "in_progress")
    if phase == "awaiting_questions":
        return _single(session, "Welcome back. Is there anything you'd like to ask me before we finish?")
    if phase == "complete":
        return _single(session, "Welcome back. We've covered everything — please click End Call when you're ready.")
    question_text = _ensure_one_question(str(question.get("question", "")))
    session["greeted"] = True
    return _single(session, f"Welcome back. Let's pick up where we left off. {question_text}")


async def handle_candidate_answer(session: dict[str, Any], answer: str) -> InterviewTurn:
    _ensure_state(session)
    if not _items(session):
        return await start_interview(session)

    answer = _clean_spoken(answer)
    if not answer:
        return _single(session, "I didn't catch that. Could you say it again?")

    phase = session.get("interview_phase", "in_progress")
    if phase == "awaiting_questions":
        speech = (
            "That's a good question. I'd suggest raising it with the hiring team in the next round. "
            "Thanks for your time today — please click End Call when you're ready."
        )
        session["interview_phase"] = "complete"
        return _single(session, speech)
    if phase == "complete":
        speech = (
            "We've covered everything I planned. Please click End Call to see your feedback and transcript."
        )
        return _single(session, speech)

    question = _current_question(session)
    if not question:
        return _single(session, "That's all my questions. Please click End Call when you're ready.")

    normalised = answer.lower().strip()
    question_text = _ensure_one_question(str(question.get("question", "")))
    attempts = int(session.get("attempts_on_current", 0))

    if RE_REPEAT.search(normalised):
        session["repeat_count"] = int(session.get("repeat_count", 0)) + 1
        return _single(session, f"Of course. Here's the question again: {question_text}")
    if RE_CLARIFY.search(normalised):
        return _single(session, f"Sure. I'm asking: {question_text}")
    if RE_HINT.search(normalised):
        if int(session.get("hints_on_current", 0)) >= 1:
            return _single(session, f"I've already given you a hint. Take your best shot: {question_text}")
        session["hints_on_current"] = 1
        points = question.get("expected_points") or []
        hint = _strip_questions(_clean_spoken(str(points[0]))) if points else "Think about the trade-offs and give a concrete example."
        return _single(session, f"Here's a hint: {hint} Now, {question_text}")
    if RE_NEXT.search(normalised):
        skipped = AnswerEvaluation(
            verdict="skipped",
            score=0.0,
            feedback="No problem.",
            missing_points=[],
        )
        return _finish_question(session, skipped, skipped=True)
    if RE_IDK.search(normalised) and len(normalised.split()) <= 8:
        evaluation = AnswerEvaluation(
            verdict="dont_know",
            score=0.0,
            feedback="No problem.",
            missing_points=[],
        )
        return _finish_question(session, evaluation)

    if len(normalised.split()) < 4 and not RE_ACK.match(normalised):
        if attempts < 1:
            session["attempts_on_current"] = attempts + 1
            probe = question.get("follow_up") or GENERIC_FOLLOW_UPS[0]
            probe = _ensure_one_question(probe)
            return _single(session, f"Give me a little more to work with. {probe}")
        evaluation = AnswerEvaluation(
            verdict="vague",
            score=0.0,
            feedback="That's too brief for me to assess.",
            missing_points=question.get("expected_points", [])[:3],
        )
        return _finish_question(session, evaluation)

    evaluation = await _evaluate_answer(session, question, answer, attempts)

    if evaluation.verdict == "vague" and attempts < 1:
        session["attempts_on_current"] = attempts + 1
        feedback = _strip_questions(_clean_spoken(evaluation.feedback))
        probe = question.get("follow_up") or GENERIC_FOLLOW_UPS[attempts % len(GENERIC_FOLLOW_UPS)]
        probe = _ensure_one_question(probe)
        speech = f"{feedback} {probe}".strip()
        return _single(
            session,
            speech,
            verdict=evaluation.verdict,
            score=evaluation.score,
        )

    return _finish_question(session, evaluation)


def evaluation_summary(session: dict[str, Any]) -> str:
    """Compact per-question summary for the closing message and final report."""
    evaluations = session.get("evaluations") or []
    if not evaluations:
        return "No answers were evaluated."
    lines = []
    for index, item in enumerate(evaluations, start=1):
        lines.append(
            f"Q{index} [{item.get('verdict', 'unrated')}, {item.get('score', 0)}/10] "
            f"{item.get('topic', 'General')}: missing {', '.join(item.get('candidate_missing') or []) or 'nothing noted'}"
        )
    return "\n".join(lines)
