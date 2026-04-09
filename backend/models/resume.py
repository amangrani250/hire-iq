from pydantic import BaseModel, Field
from typing import Optional, List


class PersonalInfo(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    website: str = ""
    title: str = ""


class Experience(BaseModel):
    company: str = ""
    role: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class Education(BaseModel):
    institution: str = ""
    degree: str = ""
    field: str = ""
    year: str = ""
    gpa: str = ""


class Project(BaseModel):
    name: str = ""
    description: str = ""
    tech_stack: str = ""
    link: str = ""


class Certification(BaseModel):
    name: str = ""
    issuer: str = ""
    year: str = ""


class ResumeData(BaseModel):
    personal_info: Optional[PersonalInfo] = None
    summary: str = ""
    skills: List[str] = []
    experience: List[Experience] = []
    education: List[Education] = []
    projects: List[Project] = []
    certifications: List[Certification] = []


class GenerateResumeRequest(BaseModel):
    raw_input: str = Field(..., description="User's raw text or voice-to-text input")
    job_role: Optional[str] = Field(default="", description="Target job role for optimization")
    template: Optional[str] = Field(default="minimal")


class GenerateResumeResponse(BaseModel):
    resume_data: ResumeData
    ats_score: int
    suggestions: List[str]


class ImproveSectionRequest(BaseModel):
    section: str = Field(..., description="Section name: summary, experience, skills, etc.")
    content: str = Field(..., description="Current content to improve")
    job_role: Optional[str] = ""


class ImproveSectionResponse(BaseModel):
    improved_content: str
    suggestions: List[str]
    keywords: List[str]
