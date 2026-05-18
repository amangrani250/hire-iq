# React Optimization Skill

## Performance Rules
1. **Memoize aggressively**: `React.memo` for pure components, `useMemo`/`useCallback` for expensive computations
2. **Context splitting**: multiple small contexts over one large context to prevent unnecessary re-renders
3. **Lazy loading**: `React.lazy()` + `Suspense` for route-level code splitting
4. **Bundle analysis**: run `npx source-map-explorer build/static/js/*.js` periodically
5. **Tree shaking**: import only what you need (`import { Code } from 'lucide-react'` not `import *`)
6. **Image optimization**: use WebP format, lazy load below-fold images
7. **Avoid prop drilling**: prefer Context or composition over passing props through 3+ levels
8. **State colocation**: keep state as close to where it's used as possible
9. **Debounce rapid state changes**: use `useDebounce` for search/input fields
10. **Virtualize long lists**: use `react-window` or `react-virtuoso` for lists >100 items

## Code Patterns for This Project
- ThemeContext + ResumeContext = good (two small contexts). Keep it that way.
- ResumeForm uses `castArr` helper for type-safe array fields — keep pattern consistent
- Avoid inline functions in JSX props that cause re-renders of child components
- `useCallback` all hook returns and callback props in contexts
- Use `satisfies` keyword for API payload validation as done in `api.ts`

## TypeScript Rules
- No `any` or `as any` — cast via `unknown` if needed (e.g., `as unknown as Record<string, string>`)
- Prefer discriminated unions over optional fields for state shapes
- Use `satisfies` for compile-time validation without widening
- All component props must have explicit interfaces (exported where reused)
- `useRef<HTMLDivElement>(null)` — always type refs

## Lint & Quality
- Run `npx react-scripts build` before committing (zero warnings)
- Check for unused imports with `npx react-scripts build` warnings
