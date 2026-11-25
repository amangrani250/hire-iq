# Architecture Decision Records (ADRs)

## ADR-001: Dual Context Pattern
**Status**: Accepted  
**Date**: 2026-05-18  
**Decision**: Split state into `ThemeContext` (UI preference) and `ResumeContext` (domain data)  
**Rationale**: Single Responsibility Principle. Theme changes affect only UI, resume operations affect only data. Avoids unnecessary re-renders.  
**Consequences**: Two providers wrapped at App root; slightly more boilerplate but clearer separation.

## ADR-002: No `any` Types
**Status**: Accepted  
**Date**: 2026-05-18  
**Decision**: All TypeScript code must use explicit types; `any` is forbidden  
**Rationale**: Type safety catches runtime errors at compile time. Discriminated unions used for reducer actions. Generics for API services.  
**Consequences**: More verbose type definitions, but zero runtime type errors.

## ADR-003: REST + WebSocket Dual Transport
**Status**: Accepted  
**Date**: 2026-05-18  
**Decision**: Interview supports both WebSocket (primary) and REST (fallback)  
**Rationale**: WebSocket provides real-time streaming for low-latency conversation. REST fallback ensures operation behind proxies that block WS.  
**Consequences**: Code duplication in `ws.py` and `rest.py`; mitigated by shared `build_system_message()` utility.

## ADR-004: In-Memory Sessions (No Database)
**Status**: Accepted  
**Date**: 2026-05-18  
**Decision**: Use `cachetools.TTLCache` for session storage instead of PostgreSQL/Redis  
**Rationale**: MVP phase. No persistence needed — sessions are ephemeral per interview session. 30min TTL auto-cleanup.  
**Consequences**: All data lost on server restart. Not suitable for production scale (1K concurrent limit). Database migration planned for v2.

## ADR-005: Cascading TTS with Fallback
**Status**: Accepted  
**Date**: 2026-05-18  
**Decision**: TTS chain: ElevenLabs → OpenAI TTS → gTTS  
**Rationale**: Premium voice quality (ElevenLabs) with automatic degradation to free tier (gTTS) if API keys missing or errors occur.  
**Consequences**: First-call latency varies by provider. gTTS runs in executor thread (blocking I/O).

## ADR-006: Shared Utility Consolidation
**Status**: Accepted  
**Date**: 2026-05-18  
**Decision**: Extract duplicate code into `utils/` and `utils/system_msg.py`  
**Rationale**: Eliminated 5+ copies of markdown JSON extraction, 3 copies of system message construction, 2 LLM client configurations.  
**Consequences**: Single source of truth. All changes to JSON parsing or system messages happen in one place.

## ADR-007: Agent Memory via `.md` Files
**Status**: Accepted  
**Date**: 2026-05-18  
**Decision**: Project context stored in `.opencode/memory/*.md`, updated via PowerShell script  
**Rationale**: Token-efficient — agents read pre-compiled context instead of scanning every file. Reduces token usage ~5-10x.  
**Consequences**: Memory staleness if update script not run. Mitigated by git pre-commit hook auto-update.
