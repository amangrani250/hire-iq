# Accessibility Skill (WCAG 2.1 AA)

## Mandatory Requirements

### 1. Semantic HTML
- Use `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>` landmarks
- Heading hierarchy: one `<h1>` per page, no skipping levels
- Use `<button>` for actions, `<a>` for navigation (never `<div onClick>`)
- Form inputs must have associated `<label>` elements

### 2. ARIA Attributes
```typescript
// Required patterns
<button aria-label="Close modal" onClick={closeModal}>✕</button>
<div role="alert" aria-live="polite">{errorMessage}</div>
<nav aria-label="Main navigation">{links}</nav>
// For custom controls, add role + aria-* attributes
// e.g., role="tablist", role="tab", aria-selected, aria-controls
```

### 3. Keyboard Navigation
- All interactive elements reachable via Tab
- Visible focus indicator (never `outline: none` without replacement)
- Focus order matches visual order
- Escape key closes modals/dialogs
- Enter/Space activates buttons and links

### 4. Color & Contrast
- Text contrast ratio ≥ 4.5:1 (normal) or 3:1 (large text ≥18px bold/24px)
- Do not rely solely on color to convey information
- Dark mode must maintain contrast ratios

### 5. Screen Readers
- `alt` text on all images (empty `alt=""` for decorative)
- `aria-hidden="true"` for icons used purely decoratively
- Live regions (`aria-live="polite"`) for dynamic content updates
- Status messages use `role="status"`

### 6. Motion & Animation
- Respect `prefers-reduced-motion`: wrap framer-motion animations:
```typescript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const transition = prefersReduced ? { duration: 0 } : { duration: 0.5 };
```
- All animation durations ≤ 3x when reduced motion preferred
- No auto-playing content without user control

### 7. Forms
- All inputs have `<label>` (visible, not just aria-label)
- Error messages linked to inputs via `aria-describedby`
- Required fields marked with `aria-required="true"`
- Autocomplete attributes for common fields

### 8. Testing
- [ ] Run axe DevTools browser extension
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (NVDA or VoiceOver)
- [ ] Test with 200% browser zoom
- [ ] Test with forced colors mode (Windows High Contrast)
