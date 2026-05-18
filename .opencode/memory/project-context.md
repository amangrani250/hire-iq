# Project Context

## Overview
HireIQ — AI-powered interview preparation platform. Upload resumes, practice with AI interviewers (voice/text), get ATS scoring, generate learning roadmaps, and build resumes.

## Tech Stack
- **Frontend**: React 18, TypeScript 6, Tailwind CSS, CRA 5
- **Backend**: Python 3.12, FastAPI 0.111, Uvicorn 0.30
- **LLM**: Groq (primary, llama-3.3-70b-versatile), OpenAI fallback (gpt-4o-mini)
- **STT**: Groq Whisper / OpenAI Whisper
- **TTS**: ElevenLabs → OpenAI TTS → gTTS (cascading fallback)
- **Audio**: WebRTC (webcam + mic), WebSocket streaming
- **PDF**: PyPDF2 extraction, html2pdf.js export
- **Deploy**: Docker, Vercel serverless

## Architecture
```
User ←→ React SPA ←→ FastAPI Backend ←→ Groq/OpenAI API
          │                  │
          │            [WebSocket]
          │     Real-time Interview Streaming
          │
     [LocalStorage]
     Saved Resumes & Roadmap Progress
```

## Key Decisions (ADRs)
1. **Dual contexts**: ThemeContext (UI) + ResumeContext (data) kept separate for single responsibility
2. **No `any` types**: All TypeScript explicitly typed via discriminated unions & generics
3. **REST + WebSocket**: Dual transport for interview (WS for real-time, REST fallback)
4. **In-memory sessions**: TTLCache with 30min TTL (no database needed for MVP)
5. **Cascading TTS**: ElevenLabs → OpenAI → gTTS for resilience
6. **No database**: All state in-memory TTL cache + browser localStorage

## Current Agent System
- **8 agents** defined in `.opencode/agents.md`
- Memory auto-updates via `.opencode/scripts/update-project-memory.ps1`
- Agents run in parallel where possible (codeReview is sequential gate)
- Each agent has isolated skills + prompts

## Quick Commands
```bash
# Frontend
cd frontend && npm start        # Dev server (port 3000)
cd frontend && npm run build    # Production build

# Backend
cd backend && python -m uvicorn main:app --reload  # Dev server (port 8000)

# Docker
docker-compose up               # Full stack
```
