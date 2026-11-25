# Project Changelog

## 2026-05-18 — Initial Agent System Setup
- Created multi-agent orchestration system in `.opencode/`
- Defined 8 agents: Frontend, Backend, ResponsiveUX, Accessibility, Security, CodeReview, Performance, DevOps
- Created project memory system with auto-updating `.md` files
- Created domain-specific skills for frontend (React optimization, bundle) and backend (Python, API security)
- Created shared skills for responsive design, accessibility, security audit, code review, SOLID principles
- Added auto-update script that regenerates structure maps on project changes
- Added git pre-commit hook for memory sync
- Migrated frontend from JS/JSX to TypeScript (zero errors)
- Refactored backend: consolidated LLM client config, shared system message builder, shared JSON utils, error middleware

## Migration Notes
- Frontend: All `.js`/`.jsx` files deleted; `.ts`/`.tsx` replacements in place
- Backend: `ai_service.py` now uses shared `call_llm()` instead of separate `AsyncOpenAI` client
- Backend: `utils/json_utils.py` eliminates 5+ copies of markdown-stripping code
- Backend: `utils/system_msg.py` eliminates 3 copies of system message construction
- Backend: Global exception handler added in `main.py`
