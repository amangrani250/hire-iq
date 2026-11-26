import asyncio

import httpx
from fastapi import HTTPException

from core.config import settings, log
from services.http_client import get_http_client

SYSTEM_PROMPT = """You are Aira, a warm, experienced senior technical interviewer at a top-tier tech company.
Your personality:
- Conversational, encouraging, and human — never robotic
- Ask ONE focused question at a time
- React naturally to answers ("That's interesting…", "Got it, makes sense", "Nice approach!")
- Probe deeper when an answer is vague: ask follow-ups before moving on
- Keep the interview flowing like a real conversation, not a Q&A list
- Mix behavioural (STAR) and technical questions based on the resume
- After 8-10 exchanges, wrap up naturally ("This has been great, I think we have a solid picture…")

Question Management (critical rules):
- When the candidate says "repeat" or "can you repeat" or similar: rephrase and repeat your last question clearly. Do NOT move to a new topic. Keep rephrasing until they answer.
- When the candidate says "next question", "let's move on", or "I've answered that": gracefully move to your next planned topic or question. Acknowledge briefly ("Great, let's move on") then ask a new question.
- If the candidate gives a very short/vague answer (under 10 words): gently ask a follow-up to get more detail. Do not accept shallow answers.
- If the candidate gives a thorough, quality answer: acknowledge it ("Excellent, that's a solid answer") and move to the next question.
- You can repeat a question at most 2 times per question. After that, if the candidate still hasn't answered, move on.

Interview flow:
1. Greet the candidate by name (if found in resume), introduce yourself as Aira
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

TECH_SYSTEM_PROMPT = """You are Aira, a warm, experienced senior technical interviewer at a top-tier tech company.
Your personality:
- Conversational, encouraging, and human — never robotic
- Ask ONE focused technical question at a time
- Keep the interview flowing like a real conversation, not a Q&A list
- Focus PURELY on the requested programming languages and complexity level. Do NOT ask about background or behavioral questions.

Feedback Rules:
- If the candidate gives the RIGHT answer, explicitly start by saying "Right answer." or "Correct."
- If the candidate gives the WRONG answer, explicitly start by saying "Wrong answer." followed by the correct explanation.

Question Management (critical rules):
- When the candidate says "repeat" or "can you repeat": rephrase and repeat your last question. Do NOT move on.
- When the candidate says "next question" or "let's move on": acknowledge and ask your next planned technical question.
- If answer is very short (under 10 words): ask a follow-up to get more detail.
- If answer is thorough and correct: acknowledge and move to the next question.
- You can repeat a question at most 2 times. After that, move on regardless.

Interview flow:
1. Greet the candidate and mention the languages you will be testing them on
2. Dive strictly into technical questions on the chosen programming languages, matching the requested complexity level.
3. After 5-8 exchanges, wrap up naturally. When concluding the interview, explicitly instruct the candidate: "Please click on the End Call button."

IMPORTANT: Speak exactly as a human interviewer would in a real video call.
Use contractions, natural pauses ("…"), and conversational fillers where appropriate.
Keep each message under 80 words unless the answer genuinely needs more.
Do NOT use markdown formatting, bullet points, or numbered lists. Speak naturally."""

RETRYABLE_STATUS = {429, 500, 502, 503, 504}

TASK_TEMPERATURES = {
    "interview": 0.8,
    "feedback": 0.7,
    "analysis": 0.2,
    "resume": 0.4,
}


async def _call_groq(
    client: httpx.AsyncClient,
    messages: list[dict],
    retries: int,
    max_tokens: int,
    task: str,
    temperature: float,
    json_mode: bool = False,
) -> str:
    """Try the task's primary Groq model, then global fallbacks, with retries."""
    models = settings.models_for_task(task)
    primary = models[0]
    last_error = "No Groq models configured."

    for attempt in range(retries + 1):
        for model in models:
            body: dict = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}

            try:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
            except httpx.RequestError as exc:
                last_error = f"{model}: {exc}"
                log.error("Groq request failed for %s: %s", model, exc)
                continue

            if response.status_code in {400, 404}:
                # Per-model request problems (missing model, unsupported
                # response format) should fall through to the next model.
                last_error = f"{model} returned HTTP {response.status_code}"
                log.warning("Groq %s %d: %s", model, response.status_code, response.text[:300])
                continue

            if response.status_code in RETRYABLE_STATUS:
                # Rate limits and upstream errors are often model-specific (for
                # example a per-model output-token limit). Try the fallback
                # models right away instead of hammering the same one.
                last_error = f"{model} returned HTTP {response.status_code}"
                log.warning("Groq %s %d: %s", model, response.status_code, response.text[:300])
                continue

            if response.status_code != 200:
                last_error = f"{model} returned HTTP {response.status_code}"
                log.warning("Groq %s %d: %s", model, response.status_code, response.text[:300])
                raise HTTPException(
                    status_code=502,
                    detail="The AI provider rejected the request. Please try again.",
                )

            try:
                payload = response.json()
                content = (
                    payload.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    or ""
                ).strip()
            except (ValueError, IndexError, KeyError, TypeError):
                content = ""

            if content:
                if model != primary:
                    log.info("Groq fallback for %s: %s", task, model)
                return content

            last_error = f"{model} returned an empty response"
            log.warning("Groq model %s returned an empty response; trying the next model.", model)

        if attempt < retries:
            await asyncio.sleep(0.5 * (attempt + 1))

    log.error("All configured Groq models failed: %s", last_error)
    raise HTTPException(
        status_code=502,
        detail="The AI interviewer is temporarily unavailable. Please try again in a moment.",
    )


async def _call_openai(
    client: httpx.AsyncClient,
    messages: list[dict],
    retries: int,
    max_tokens: int,
    temperature: float,
    json_mode: bool = False,
) -> str:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="No AI provider is configured.")

    last_error = None
    for attempt in range(retries + 1):
        body: dict = {
            "model": settings.OPENAI_CHAT_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=body,
            )

            if response.status_code != 200:
                log.warning("OpenAI %d: %s", response.status_code, response.text[:200])
                if attempt < retries and response.status_code in RETRYABLE_STATUS:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                response.raise_for_status()

            return response.json()["choices"][0]["message"]["content"]

        except httpx.HTTPStatusError:
            raise
        except Exception as exc:
            last_error = exc
            log.error("OpenAI attempt %d failed: %s", attempt + 1, exc)
            if attempt < retries:
                await asyncio.sleep(0.5 * (attempt + 1))

    raise HTTPException(
        status_code=500,
        detail=f"AI call failed after {retries + 1} attempts: {last_error}",
    )


async def call_llm(
    messages: list[dict],
    retries: int = 2,
    max_tokens: int = 800,
    task: str = "analysis",
    temperature: float | None = None,
    json_mode: bool = False,
) -> str:
    """Call the task-appropriate AI model, with model fallbacks for Groq."""
    client = await get_http_client()
    resolved_temperature = (
        temperature if temperature is not None else TASK_TEMPERATURES.get(task, 0.4)
    )

    if settings.LLM_BACKEND == "groq" and settings.GROQ_API_KEY:
        return await _call_groq(
            client, messages, retries, max_tokens, task, resolved_temperature, json_mode
        )

    return await _call_openai(
        client, messages, retries, max_tokens, resolved_temperature, json_mode
    )
