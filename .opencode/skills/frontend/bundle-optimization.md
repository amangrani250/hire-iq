# Bundle Optimization Skill

## Current Bundle (426 KB gzipped — target: <300 KB)

### High-Impact Optimization Recommendations

#### 1. Replace `html2pdf.js` with lighter alternatives
**Current**: 40 KB gzipped  
**Replace with**: `jspdf` + `html2canvas` directly (~15 KB combined)  
**Saves**: ~25 KB  
**Change**: In `usePdfExport.ts`:

```typescript
// Instead of: import html2pdf from 'html2pdf.js'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
```

#### 2. Audit framer-motion usage
**Current**: ~90 KB gzipped  
**Consider**: 
- Only import variants/motion components actually used
- Or replace simple CSS transitions (fade, slide) with Tailwind + CSS animations
- Keep for page transitions but replace stagger animations with CSS alternatives
- **Potential save**: 30-40 KB

#### 3. Code splitting at route level
Add `React.lazy()` for all page components in `App.tsx`:

```typescript
const BuilderPage = React.lazy(() => import('./pages/BuilderPage'));
const SavedPage = React.lazy(() => import('./pages/SavedPage'));
// ... etc
```

Wrap with `<Suspense fallback={<LoadingSpinner />}>`.

#### 4. Remove unused dependencies
- Check `react-use-websocket`: if WebSocket is only in `useInterviewSocket`, it's needed — but verify the `fetch` usage tracks
- `html2pdf.js` brings `html2canvas` + `jspdf` transitively; direct imports avoid duplication

#### 5. CRA → Vite migration (medium-term)
**Benefit**: 
- 2-3x faster dev server (HMR)
- Better tree shaking
- Native ESM bundling
- Smaller production builds
- **Plan**: Create a Vite config + migrate during a dedicated session

### Quick Wins
- [ ] Remove `html2pdf.js`, use `jspdf` + `html2canvas` directly
- [ ] Add `React.lazy()` for all routes
- [ ] Tree-shake unused framer-motion features
- [ ] Analyze bundle: `npx source-map-explorer build/static/js/*.js`
