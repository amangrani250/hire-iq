from typing import Any
from services.llm_service import SYSTEM_PROMPT, TECH_SYSTEM_PROMPT


def build_system_message(session: dict[str, Any]) -> dict:
    """
    Build the system message dict based on session interview_type.
    Shared by WebSocket and REST endpoints to eliminate duplication.
    """
    interview_type = session.get("interview_type", "resume")

    if interview_type == "tech":
        languages = ", ".join(session.get("languages", []))
        complexity = session.get("complexity", "medium")
        content = f"{TECH_SYSTEM_PROMPT}\n\n--- INTERVIEW PARAMETERS ---\nLanguages: {languages}\nComplexity: {complexity}"

    elif interview_type == "job_roadmap":
        custom = session.get("custom_system_prompt")
        if custom:
            content = custom
        else:
            job_title = session.get("job_title", "")
            exp_level = session.get("experience_level", "")
            topics = ", ".join(session.get("topics_studied", []))
            content = (
                f"You are Aira, a technical interviewer.\n"
                f"Job: {job_title} ({exp_level})\n"
                f"Topics studied: {topics}\n"
                f"ASK ONLY about the topics listed above."
            )

    else:
        resume_text = session.get("resume_text", "")
        content = f"{SYSTEM_PROMPT}\n\n--- CANDIDATE RESUME ---\n{resume_text}"

    return {"role": "system", "content": content}
