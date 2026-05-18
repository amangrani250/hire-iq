from models.resume import ResumeData, GenerateResumeResponse, ImproveSectionResponse
from utils.json_utils import safe_json
from services.llm_service import call_llm


async def generate_resume(raw_input: str, job_role: str = "") -> GenerateResumeResponse:
    job_context = f"targeting the role of {job_role}" if job_role else "for a general professional resume"

    prompt = f"""You are an expert resume writer and ATS optimization specialist.

The user has provided the following raw information {job_context}:

---
{raw_input}
---

Extract and structure this into a professional resume. Return ONLY a valid JSON object with this exact structure:

{{
  "personal_info": {{
    "full_name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": "",
    "title": ""
  }},
  "summary": "A compelling 2-3 sentence professional summary",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {{
      "company": "",
      "role": "",
      "start_date": "",
      "end_date": "",
      "description": "• Achievement 1\\n• Achievement 2\\n• Achievement 3"
    }}
  ],
  "education": [
    {{
      "institution": "",
      "degree": "",
      "field": "",
      "year": "",
      "gpa": ""
    }}
  ],
  "projects": [
    {{
      "name": "",
      "description": "",
      "tech_stack": "",
      "link": ""
    }}
  ],
  "certifications": [
    {{
      "name": "",
      "issuer": "",
      "year": ""
    }}
  ],
  "ats_score": 75,
  "suggestions": [
    "Add quantifiable achievements",
    "Include relevant keywords for the target role"
  ]
}}

Rules:
- Use strong action verbs in experience bullet points
- Make summary ATS-optimized with relevant keywords
- ats_score should be 0-100 based on keyword richness and structure
- Return ONLY the JSON, no markdown, no explanation"""

    messages = [{"role": "user", "content": prompt}]
    raw = await call_llm(messages, max_tokens=2000, temperature=0.3)
    data = safe_json(raw, {})

    resume_data = ResumeData(
        personal_info=data.get("personal_info", {}),
        summary=data.get("summary", ""),
        skills=data.get("skills", []),
        experience=data.get("experience", []),
        education=data.get("education", []),
        projects=data.get("projects", []),
        certifications=data.get("certifications", []),
    )

    return GenerateResumeResponse(
        resume_data=resume_data,
        ats_score=data.get("ats_score", 70),
        suggestions=data.get("suggestions", []),
    )


async def improve_section(section: str, content: str, job_role: str = "") -> ImproveSectionResponse:
    job_context = f" for a {job_role} role" if job_role else ""

    prompt = f"""You are an expert resume writer{job_context}.

Improve this resume {section} section:

---
{content}
---

Return ONLY a valid JSON object:
{{
  "improved_content": "The improved version of the content",
  "suggestions": ["tip1", "tip2", "tip3"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}

Rules:
- Use strong action verbs
- Add measurable impact where possible
- Keep it concise and ATS-friendly
- Return ONLY JSON, no markdown"""

    messages = [{"role": "user", "content": prompt}]
    raw = await call_llm(messages, max_tokens=800, temperature=0.4)
    data = safe_json(raw, {})

    return ImproveSectionResponse(
        improved_content=data.get("improved_content", content),
        suggestions=data.get("suggestions", []),
        keywords=data.get("keywords", []),
    )
