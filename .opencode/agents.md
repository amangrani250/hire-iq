# Multi-Agent Orchestration System

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │     Orchestrator (opencode)         │
                    │  Loads context from .opencode/memory │
                    └──────┬──────┬──────┬──────┬─────────┘
                           │      │      │      │
              ┌────────────┘      │      │      └────────────┐
              ▼                   ▼      ▼                   ▼
     ┌────────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐
     │ FrontendAgent  │  │ BackendAgent│  │ Security    │  │ Performance    │
     │ (React/TS)     │  │ (Python/API)│  │ Agent       │  │ Agent          │
     └────────┬───────┘  └──────┬─────┘  └──────┬─────┘  └───────┬────────┘
              │                 │               │                │
              ▼                 ▼               ▼                ▼
     ┌────────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐
     │ ResponsiveUX   │  │ CodeReview │  │ Security   │  │ Bundle         │
     │ Agent          │  │ Agent      │  │ Audit      │  │ Optimization   │
     └────────────────┘  └────────────┘  └────────────┘  └────────────────┘
```

## Agent Definitions

All agents run in **parallel** where possible. Each is isolated with its own skills/prompts.

### 1. FrontendAgent (React/TypeScript)
- **Module**: `frontend/`
- **Skills**: `skills/frontend/*.md`
- **Responsibilities**:
  - All React component creation and modification
  - TypeScript type safety enforcement
  - State management (Context API, hooks)
  - UI component library management
  - Route configuration
- **Parallel**: Yes (isolated from BackendAgent)

### 2. BackendAgent (Python/FastAPI)
- **Module**: `backend/`
- **Skills**: `skills/backend/*.md`
- **Responsibilities**:
  - All Python/FastAPI development
  - API endpoint creation and modification
  - Database/model schema design
  - Service layer business logic
  - Middleware and error handling
- **Parallel**: Yes (isolated from FrontendAgent)

### 3. ResponsiveUXAgent
- **Module**: `frontend/` (cross-cutting)
- **Skills**: `skills/shared/responsive-design.md`
- **Responsibilities**:
  - Mobile-first responsive design
  - Cross-device compatibility (mobile, tablet, desktop)
  - CSS media queries and Tailwind breakpoints
  - Touch interaction support
  - Screen size adaptation
- **Parallel**: Yes

### 4. AccessibilityAgent
- **Module**: `frontend/` (cross-cutting)
- **Skills**: `skills/shared/accessibility.md`
- **Responsibilities**:
  - WCAG 2.1 AA compliance
  - ARIA labels and roles
  - Keyboard navigation
  - Screen reader optimization
  - Color contrast ratios
  - Focus management
- **Parallel**: Yes

### 5. SecurityAgent
- **Module**: all modules
- **Skills**: `skills/shared/security-audit.md`
- **Responsibilities**:
  - Input validation and sanitization
  - XSS/CSRF/SQL injection prevention
  - API authentication/authorization
  - CORS configuration review
  - Dependency vulnerability scanning
  - Secrets management (never commit keys)
  - Rate limiting awareness
- **Parallel**: Yes

### 6. CodeReviewAgent
- **Module**: all modules
- **Skills**: `skills/shared/code-review.md`, `skills/shared/solid-principles.md`
- **Responsibilities**:
  - Code quality enforcement
  - SOLID principles adherence
  - DRY/WET code analysis
  - Naming convention validation
  - Type safety verification
  - Error handling completeness
- **Parallel**: No (runs after Frontend/Backend agents)

### 7. PerformanceAgent
- **Module**: `frontend/` primarily
- **Skills**: `skills/frontend/bundle-optimization.md`
- **Responsibilities**:
  - Bundle size analysis and reduction
  - Code splitting recommendations
  - Lazy loading implementation
  - Dependency auditing (remove unused)
  - Image/font optimization
  - CRA build optimization
- **Parallel**: Yes

### 8. DevOpsAgent
- **Module**: project root
- **Skills**: `skills/shared/devops.md`
- **Responsibilities**:
  - Docker configuration
  - CI/CD pipeline
  - Environment configuration
  - Deployment scripts
- **Parallel**: Yes

## Execution Flow

```
Task Request
    │
    ▼
┌─────────────────────────────┐
│ 1. Load Memory Context      │ ← .opencode/memory/*.md
│    (token-efficient)         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 2. Route to Agent(s)        │ ← Match module + intent
│    (parallel dispatch)       │
└─────────────┬───────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
  FrontendAgent    BackendAgent
  + ResponsiveUX    + SecurityAgent
  + Accessibility   + CodeReviewAgent
  + Security        + DevOpsAgent
  + Performance
     │                 │
     └────────┬────────┘
              │
              ▼
┌─────────────────────────────┐
│ 3. CodeReviewAgent          │ ← Validates all changes
│    (sequential gate)         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 4. Update Memory            │ ← .opencode/scripts/update-memory.ps1
│    (automatic)               │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 5. Build + Test             │ ← npm run build / python check
│    (verification)            │
└─────────────────────────────┘
```
