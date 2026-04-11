import asyncio
from fastapi import HTTPException
from core.config import settings, log
from services.http_client import get_http_client
import httpx

SYSTEM_PROMPT = """You are Aira, a warm, experienced senior technical interviewer at a top-tier tech company.
Your personality:
- Conversational, encouraging, and human — never robotic
- Ask ONE focused question at a time
- React naturally to answers ("That's interesting…", "Got it, makes sense", "Nice approach!")
- Probe deeper when an answer is vague: ask follow-ups before moving on
- Keep the interview flowing like a real conversation, not a Q&A list
- Mix behavioural (STAR) and technical questions based on the resume
- After 8-10 exchanges, wrap up naturally ("This has been great, I think we have a solid picture…")

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

Interview flow:
1. Greet the candidate and mention the languages you will be testing them on
2. Dive strictly into technical questions on the chosen programming languages, matching the requested complexity level.
3. After 5-8 exchanges, wrap up naturally. When concluding the interview, explicitly instruct the candidate: "Please click on the End Call button."

IMPORTANT: Speak exactly as a human interviewer would in a real video call.
Use contractions, natural pauses ("…"), and conversational fillers where appropriate.
Keep each message under 80 words unless the answer genuinely needs more.
Do NOT use markdown formatting, bullet points, or numbered lists. Speak naturally."""

JOB_ROADMAP_SYSTEM_PROMPT = """You are Aira, a warm, experienced senior technical interviewer at a top-tier tech company.
You are conducting a focused job interview for a candidate who has completed a structured learning roadmap.

Your personality:
- Conversational, encouraging, and human — never robotic
- Ask ONE focused question at a time
- ONLY ask questions about topics the candidate explicitly studied in their roadmap
- Do NOT ask about topics outside their studied list
- React naturally to answers ("That's a solid approach…", "Interesting, tell me more", "Good thinking!")
- Probe deeper on correct answers, gently explain when wrong

Feedback Rules:
- If the candidate gives the RIGHT answer, explicitly say "Correct!" or "Exactly right."
- If the candidate gives the WRONG answer, explicitly say "Not quite — let me clarify." then explain.

Interview flow:
1. Greet the candidate warmly by role (e.g., "Welcome to your {Job Title} interview!")
2. Ask them to briefly introduce themselves and mention what they studied
3. Dive into 5-7 focused technical/conceptual questions STRICTLY from their studied topics
4. 1-2 scenario-based questions ("How would you approach…")
5. Wrap up warmly. When concluding, explicitly say: "Please click on the End Call button."

IMPORTANT: Keep questions strictly relevant to what the candidate studied.
Use contractions, natural pauses ("…"), and conversational fillers.
Keep each message under 90 words unless explanation needs more.
Do NOT use markdown formatting, bullet points, or numbered lists."""

async def call_llm(messages: list[dict], retries: int = 2, max_tokens: int = 800) -> str:
    """Call Groq or OpenAI chat completion with retry logic."""
    client = await get_http_client()
    last_error = None

    for attempt in range(retries + 1):
        try:
            if settings.LLM_BACKEND == "groq" and settings.GROQ_API_KEY:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "messages": messages,
                        "temperature": 0.8,
                        "max_tokens": max_tokens,
                    },
                )
                if resp.status_code != 200:
                    log.warning("Groq %d: %s", resp.status_code, resp.text[:200])
                    if attempt < retries and resp.status_code >= 500:
                        await asyncio.sleep(0.5 * (attempt + 1))
                        continue
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]

            elif settings.OPENAI_API_KEY:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.OPENAI_CHAT_MODEL,
                        "messages": messages,
                        "temperature": 0.8,
                        "max_tokens": max_tokens,
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
                raise HTTPException(status_code=500, detail="No LLM API key configured.")

        except httpx.HTTPStatusError:
            raise
        except Exception as e:
            last_error = e
            log.error("LLM attempt %d failed: %s", attempt + 1, e)
            if attempt < retries:
                await asyncio.sleep(0.5 * (attempt + 1))

    raise HTTPException(status_code=500, detail=f"LLM call failed after {retries + 1} attempts: {last_error}")
