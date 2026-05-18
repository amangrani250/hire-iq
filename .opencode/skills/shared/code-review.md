# Code Review Skill

## Review Checklist (Run After Every Change)

### 1. Type Safety
- [ ] No `any` types (use `unknown` + explicit narrowing instead)
- [ ] All function parameters typed
- [ ] All function return types infer correctly or are explicit
- [ ] No `as` casts that mask real type issues (prefer `as const`, `satisfies`)
- [ ] Generics used where appropriate for reusable functions

### 2. Error Handling
- [ ] All API calls wrapped in try/catch with user feedback
- [ ] Error boundaries for React component trees
- [ ] Backend: `HTTPException` with appropriate status codes
- [ ] Backend: Graceful degradation with fallback values (not raw crashes)
- [ ] WebSocket: `safe_send` pattern for send failures
- [ ] Logging on error paths (with context, not just "error happened")

### 3. Performance
- [ ] No unnecessary re-renders (memoization where needed)
- [ ] No expensive computations in render body
- [ ] Lazy loading for route-level components
- [ ] Bundle size considered for new dependencies
- [ ] Debounced search/input handlers

### 4. Naming Conventions
- Components: PascalCase (`ExportButton.tsx`)
- Hooks: camelCase with `use` prefix (`useAudioRecorder.ts`)
- Utilities: camelCase (`formatDate`, not `FormatDate`)
- Types/Interfaces: PascalCase (`ResumeData`, not `resume_data`)
- Files: match the export name (one component per file)

### 5. Code Organization
- [ ] Single Responsibility: each file/component does one thing
- [ ] DRY: no duplicated logic (extract to utils or hooks)
- [ ] No long files (>400 lines suggests splitting)
- [ ] No deep nesting (>4 levels of indentation suggests refactoring)
- [ ] Consistent import ordering: React → libraries → internal modules

### 6. Testing Surface
- [ ] Error paths all covered (empty states, API failures, invalid inputs)
- [ ] Edge cases handled (empty arrays, null values, boundary conditions)

### 7. Security Hotspots
- [ ] No hardcoded secrets
- [ ] No raw HTML rendering
- [ ] Inputs validated before processing
- [ ] No debug endpoints exposed in production
