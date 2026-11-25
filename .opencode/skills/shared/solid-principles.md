# SOLID Principles Enforcement

## S — Single Responsibility
**Each module/class/function should have one reason to change.**
```
GOOD:  ResumeContext.tsx → only manages resume state
       api.ts → only handles HTTP communication
       ControlBar.tsx → only renders control buttons

BAD:   helpers.ts that formats dates AND calls APIs AND validates forms
       (split into dateUtils.ts, api.ts, validation.ts)
```

## O — Open/Closed
**Open for extension, closed for modification.**
- Use discriminated unions for reducer actions (add new action type without modifying existing)
- Backend: new interview types via new session keys (not modifying `SYSTEM_PROMPT`)
- Hook composition: compose existing hooks rather than modifying them

## L — Liskov Substitution
**Derived types must be substitutable for their base types.**
- In TypeScript: ensure interface extensions don't narrow parameter types
- All resume array items (Experience, Education, Project, Certification) have consistent shapes
- No unexpected `undefined` where `string` is expected (use `??` default values)

## I — Interface Segregation
**Clients should not depend on interfaces they don't use.**
- Split contexts: ThemeContext (just theme/toggle), ResumeContext (full resume CRUD)
- Component props: only pass what the component needs, not the entire state object
- Avoid "god interfaces" — keep `Resume` as aggregate, but pass specific slices to components

## D — Dependency Inversion
**Depend on abstractions, not concretions.**
- Frontend: `services/api.ts` abstracts HTTP details from components
- Backend: `services/llm_service.call_llm()` abstracts Groq/OpenAI from route handlers
- Utils layer: `utils/helpers.ts`, `utils/api-helpers.ts` abstract implementation

## This Project: Pattern Review

### Frontend
| Principle | How We Apply It |
|-----------|----------------|
| SRP | Contexts separated by concern; hooks each own one capability; utils isolated |
| OCP | Resume reducer actions extendable via discriminated union; interview types extensible |
| ISP | Props typed per component; contexts separated |
| DIP | API layer abstracts transport; hooks abstract browser APIs |

### Backend
| Principle | How We Apply It |
|-----------|----------------|
| SRP | `api/` (routing), `services/` (business logic), `utils/` (helpers) separated |
| OCP | New interview types via new session keys + `build_system_message()` dispatch |
| ISP | Settings split per domain; session dict decoupled from Pydantic models |
| DIP | `llm_service` abstracts provider; `audio_service` cascades TTS providers |
