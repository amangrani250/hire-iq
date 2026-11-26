# HireIQ Design System

The interface is built on one token set and one set of primitives. Pages compose
patterns; they do not invent colours, type scales, or controls.

The visual direction is a modern product studio: cool neutral surfaces, near-black
ink, a single indigo/violet accent gradient, Sora for display type, Inter for
product UI, and JetBrains Mono for data and labels. Accent gradients are reserved
for primary actions and one hero phrase — never for body text or body surfaces.

---

## 1. Token architecture

Three tiers, in `src/index.css`:

1. **Primitive values** — the brand ramp and status hues.
2. **Semantic roles** — `background`, `card`, `muted`, `border`, `primary`,
   `success`, `warning`, `danger`, etc. Each surface has a paired foreground.
3. **Components** — buttons, fields, cards, navigation, and product shells
   consume only semantic roles.

Light and dark are the same token set, overridden under `.dark`. Nothing in a
component is allowed to know which theme is active.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| `background` / `foreground` | cool paper / ink | deep navy / near-white | Page shell, body text |
| `card` / `card-foreground` | white / ink | navy panel / near-white | Panels and raised surfaces |
| `muted` / `muted-foreground` | slate wash / slate | navy wash / slate | Quiet fills, secondary text |
| `border` / `input` | slate line / stronger line | soft navy line / stronger line | Dividers, form outlines |
| `primary` / `primary-foreground` | indigo / white | periwinkle / near-black | Primary action, focus energy |
| `secondary` / `secondary-foreground` | slate / ink | navy / near-white | Quiet actions |
| `accent` / `accent-foreground` | indigo wash / deep indigo | indigo wash / periwinkle | Selected and hovered states |
| `success`, `warning`, `danger`, `info` | tuned for 4.5:1 text | tuned for dark surfaces | Feedback only |

Rules:

- Never use raw Tailwind palette classes (`text-gray-500`, `bg-blue-600`) in
  product UI. Use semantic classes (`text-muted-foreground`, `bg-card`).
- Never use white/black directly for UI chrome. The one exception is a resume
  document, which is paper and must stay light in both themes.
- Borders do the structural work; shadows are quiet (`xs`–`lg`). Glows only mark
  the speaking participant or a primary CTA.
- Colour carries meaning only for status; the indigo/violet gradient is the one
  brand signature.

Tailwind (v4, CSS-first) maps every role in the `@theme` blocks at the top of
`src/index.css`, so utilities are available as `bg-background`,
`text-foreground`, `border-border`, `bg-primary/10`, `ring-ring/10`, and so on.

---

## 2. Type

| Token / class | Role |
| --- | --- |
| `font-sans` (Inter) | Product UI, body copy |
| `font-display` (Sora) | Headings, metric values, hero display |
| `.display` (Sora + accent gradient) | Hero and editorial display lines |
| `font-mono` (JetBrains Mono) | Eyebrows, status, timers, labels, data |

- Display: `clamp(2.9rem, 7vw, 4.9rem)`, line-height `0.98`, optical tracking.
- Page title: `28–34px`, weight 600, tight tracking.
- Section title: `clamp(1.9rem, 3.4vw, 2.8rem)`, weight 600.
- Body: 15px / 1.6. Supporting copy: 13–14px. Labels: 11–12px.
- Eyebrows use `.eyebrow` (mono, uppercase, tracked) and are sentence-case in
  content; the class handles the caps.
- Headings and paragraphs use `text-wrap: balance` / `pretty`.

---

## 3. Shape, spacing, elevation

- Base radius `--radius: 10px`; controls 8–10px, cards 12px, media 12–16px,
  pills 999px. Do not mix arbitrary radii.
- Spacing follows the 4px Tailwind scale. Page gutters use
  `--page-gutter`; pages use `.container-page` (max 1200px).
- Nav height is `--nav-height: 64px`. Page content offsets with `pt-nav`.
- Elevation tokens: `shadow-xs` (fields), `shadow-sm` (cards), `shadow-md`
  (mock product panel), `shadow-lg` (hero), `shadow-popover` (menus).
- Motion: 0.2s for interaction, 0.35–0.5s for entrance. All entrance motion is
  disabled under `prefers-reduced-motion`.

---

## 4. Primitives

Import from `src/components/ui`:

| Component | Variants / notes |
| --- | --- |
| `Button` | `primary`, `secondary`, `outline`, `ghost`, `danger`, `link`; sizes `sm`, `md`, `lg`, `icon`; supports `as={Link}` |
| `Card` + `CardHeader/Title/Description/Content/Footer` | `interactive` adds a restrained lift |
| `Badge` | `neutral`, `primary`, `success`, `warning`, `danger`, `solid` |
| `Field`, `Label`, `Input`, `Textarea` | field wiring for hint/error and `aria-invalid` |
| `SegmentedControl` | compact view/mode switches |
| `EmptyState` | icon + title + description + action |
| `PageHeader` | eyebrow, title, description, actions |
| `Spinner` | accessible loading indicator |
| `Logo`, `ThemeToggle` | in `components/layout` |

Global component classes (used by product shells): `.btn`, `.btn-*`,
`.card`, `.input-field`, `.label`, `.badge`, `.meter`, `.segmented`,
`.nav-link`, `.menu`, `.eyebrow`, `.section-label`, `.display`.

---

## 5. Theming

`ThemeProvider` (`src/context/ThemeContext.jsx`) supports three modes:
`light`, `dark`, `system`.

- Persisted under `localStorage['hireiq-theme']`.
- Resolved mode is applied as `html.dark` + `html[data-theme]`, and updates
  `color-scheme` plus the `theme-color` meta tag.
- A small inline script in `public/index.html` applies the saved/system theme
  before first paint to avoid a flash.
- The same storage key must be used by any pre-paint logic.
- System changes are observed live with `matchMedia`.

Use `useTheme()` for `mode`, `setMode`, `theme`, `dark`, and `toggle`. Never
theme inside a component.

---

## 6. Product flow

```
/                 Landing — positioning, practice loop, entry points
/upload           Resume upload → profile + ATS analysis → start session
/tech-interview   Language + complexity setup → start session
/interview        Focus mode (no global nav): video, live transcript, controls
/end              Feedback, transcript review, PDF export, restart
/builder          Resume studio: editor / live preview / ATS / PDF
/saved            Local resume library
```

The global navigation (Practice, Technical round, Resume studio, Saved) is
rendered on every route except `/interview`. Footer appears everywhere except
the focus room. Route changes reset scroll.

---

## 7. Interaction and accessibility baseline

- Visible `:focus-visible` ring from `--ring` on every interactive element.
- Minimum target height 32px for compact controls, 40px for standard actions.
- Skip link is the first tab stop.
- Status is never colour-only: it also has text and/or an icon.
- Form errors use `role="alert"`, hints are linked with `aria-describedby`.
- Radios and segmented controls use `aria-checked` / `aria-pressed`.
- Mobile navigation exposes `aria-expanded`, closes on route change and Escape.
- `prefers-reduced-motion` disables entrance and looping animation.
- Contrast targets: 4.5:1 body text, 3:1 large text and UI boundaries, in both
  themes.
