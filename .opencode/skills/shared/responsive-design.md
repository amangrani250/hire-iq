# Responsive Design Skill

## Device Coverage Matrix
| Device | Width Range | Priority | Testing Tool |
|--------|------------|----------|--------------|
| Mobile | 320-480px | Critical | Chrome DevTools iPhone SE |
| Tablet | 768-1024px | High | Chrome DevTools iPad |
| Desktop | 1280-1920px | High | Native resolution |
| Ultra-wide | 1920+px | Medium | Manual |

## Tailwind Breakpoints (used in this project)
```
sm: 640px   → Mobile landscape / small tablet
md: 768px   → Tablet portrait
lg: 1024px  → Tablet landscape / small desktop
xl: 1280px  → Desktop
2xl: 1536px → Large desktop
```

## Rules

### 1. Mobile-First Approach
- Always write base styles for mobile first, then add breakpoints for larger screens
- Example: `className="flex-col md:flex-row"` (column on mobile, row on desktop)
- Never use `hidden` to hide mobile content on desktop; use `hidden md:block` pattern

### 2. Touch Targets
- All interactive elements ≥ 44×44px (WCAG 2.5.5)
- Minimum 8px spacing between touch targets
- Avoid hover-only interactions (not supported on touch devices)

### 3. Text & Typography
- Base font-size: 16px (prevents iOS zoom on input focus)
- Line-height: 1.5 for body text
- Responsive headings: `text-xl md:text-2xl lg:text-3xl`
- Max line length: 65-75 characters

### 4. Images & Media
- `max-width: 100%` on all images
- Use `aspect-ratio` CSS property to prevent layout shift
- Lazy load below-fold images: `loading="lazy"`

### 5. Layout Patterns
- Use CSS Grid for page-level layout, Flexbox for component-level
- Sticky headers: account for mobile browser chrome (use `position: sticky`)
- Bottom navigation for mobile, sidebar for desktop

### 6. Input Handling
- `type="email"`, `type="tel"`, etc. triggers correct mobile keyboard
- `inputMode` attribute for numeric inputs
- Prevent zoom: `<input style="font-size: 16px">`

### 7. Testing Checklist
- [ ] Test on 320px width (iPhone SE)
- [ ] Test on 768px width (iPad)
- [ ] Test on 1440px width (desktop)
- [ ] Test touch interactions (tap, swipe, long-press)
- [ ] Test with zoom at 200%
- [ ] Verify no horizontal scroll on any device
