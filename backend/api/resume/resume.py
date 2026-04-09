from fastapi import APIRouter, HTTPException
from models.resume import (
    GenerateResumeRequest,
    GenerateResumeResponse,
    ImproveSectionRequest,
    ImproveSectionResponse,
)
from services.ai_service import generate_resume, improve_section

router = APIRouter()


@router.post("/generate-resume", response_model=GenerateResumeResponse)
async def generate_resume_endpoint(request: GenerateResumeRequest):
    """Generate a structured resume from raw user input using AI."""
    if not request.raw_input.strip():
        raise HTTPException(status_code=400, detail="raw_input cannot be empty")
    try:
        result = await generate_resume(request.raw_input, request.job_role or "")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/improve-section", response_model=ImproveSectionResponse)
async def improve_section_endpoint(request: ImproveSectionRequest):
    """Improve a specific resume section using AI."""
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="content cannot be empty")
    try:
        result = await improve_section(request.section, request.content, request.job_role or "")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI improvement failed: {str(e)}")
