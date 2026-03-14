# Phase 4: Frontend Shell - Research

**Researched:** 2026-03-14
**Domain:** Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion (motion)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Overall Visual Direction**
- Industry-level, satisfying, clean, and professional interface — interactive and reactive
- Dark theme with TWO theme options: cool electric accents (blue/cyan/purple) and warm forge accents (amber/orange/gold)
- Customizable accent colors within each theme
- Subtle dot-grid background pattern (fading toward edges) for depth

**Input Experience (Hero Landing)**
- Hero landing layout: large centered input with bold headline, subtitle explaining value prop, generous whitespace
- Multi-line textarea (~3-4 rows default), auto-expands as user types
- Glowing border on focus: border transitions to accent color with soft box-shadow glow (~4-6px)
- Magnetic hover effect on Forge button: button physically follows cursor when nearby (~50px), springs back on leave, press-down scale on click

**Column Transition**
- Shrink left + reveal: centered input smoothly slides/shrinks to become column 1, columns 2+3 slide in from right
- Staggered slide-in: col 2 first (~300ms), col 3 follows with ~150ms stagger, each fades in as it slides
- Smooth total duration: ~700ms for full transition (input shrinks ~400ms, columns stagger ~300ms)
- Gap-only column separation: no divider lines, each column is its own rounded card panel with gap between (~16-24px)
- Solid elevated cards: opaque background one shade lighter than page, subtle shadow, faint border, rounded corners (12px)
- Input card distinction: faint accent-colored outer glow/shadow to signal "this is the active panel"
- Result cards: neutral dark shadow only
- Auto-adjusting column widths based on content length
- "New Forge" reset button in input card header — animates back to centered hero state

**Loading State**
- Transition happens AFTER results arrive (hero stays visible during the 3-8s wait)
- Spinner on Forge button + cycling status text below with smooth fade crossfade (~200ms transitions)
- Status text stages (timed, not real): "Detecting category..." -> "Crafting expert prompt..." -> "Executing with IBM Granite..." -> "Almost there..."
- Cancel button: Forge button transforms into Cancel during loading, aborts request and returns to ready state
- Progressive result reveal: columns slide in, col 2 crafted prompt types out (typewriter ~15ms/char), col 3 results begin fading in when typewriter is ~75% done
- No sound effects

**Error Presentation**
- All errors as toast notifications, positioned top-right
- Technical but clear tone: includes status code + human-readable explanation
- Inform only — no retry button in toast, user manually clicks Forge again
- 5-second auto-dismiss
- Multiple toasts stack vertically, max 3 visible, oldest dismissed when 4th arrives
- Toast slides in with animation, dismiss on X click or auto-timeout

### Claude's Discretion
- Placeholder text for textarea
- Exact typography choices and spacing
- Exact dot-grid pattern density and fade
- Card shadow depth and border opacity values
- Toast animation direction (slide from right, fade in, etc.)
- Exact status text timing intervals during loading

### Deferred Ideas (OUT OF SCOPE)
- Chat-like forge history (session management — own phase)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Main page shows three-column layout (input / crafted prompt/anatomy / results) after forge | Framer Motion layout animations handle column reveal; CSS grid for three-column structure |
| UX-02 | Before first forge, page shows centered single-column input | Conditional render + Framer Motion AnimatePresence for enter/exit |
| UX-03 | Columns 2+3 animate in with slide/fade transition after forge completes | Framer Motion `motion.div` with `initial/animate` + staggered `delay` props |
| UX-06 | Loading state shows spinner + "Forging with IBM Granite..." during pipeline execution | React state machine (idle/loading/done/error); Lucide spinner icon; cycling text with setInterval |
| UX-07 | Error states show useful messages when pipeline fails | Sonner toast (shadcn/ui replacement for deprecated Toast); parse HTTP status codes into human-readable messages |
</phase_requirements>

---

## Summary

The frontend is a greenfield Next.js 14 App Router project with TypeScript strict mode, Tailwind CSS v3 (locked by shadcn/ui compatibility), and shadcn/ui component library. The main UI is a single-page application with two macro states: **hero** (centered single-column) and **result** (three-column layout). The transition between states is purely client-side — all data fetches happen against `http://localhost:8000` (or `NEXT_PUBLIC_API_URL`) via a thin API client module.

The key interactive complexity is in three areas: (1) the magnetic Forge button using Framer Motion's `useMotionValue` + `useSpring`, (2) the layout transition using `AnimatePresence` and staggered `motion.div` slides, and (3) the typewriter effect for the crafted prompt using `setInterval` with character accumulation. All other UI elements (toasts, loading spinner, textarea auto-resize) have well-established React/shadcn patterns with minimal custom code required.

Tailwind v3 (not v4) is the right choice here because shadcn/ui's CLI defaults to v3 and all existing component code is written for it. Using v4 introduces CSS-first config breakage with shadcn until all components are verified.

**Primary recommendation:** Bootstrap with `create-next-app` (TypeScript, Tailwind, App Router, ESLint), then `npx shadcn@latest init`, then add components incrementally. Use Framer Motion (`motion` package) for all state-transition animations. Use Sonner for toasts. Keep the API client as a single `lib/api.ts` file.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.x | App framework, routing, SSR shell | Locked in CLAUDE.md |
| typescript | ~5.x | Type safety across all files | Locked in CLAUDE.md — strict mode |
| tailwindcss | 3.4.x | Utility CSS | Locked in CLAUDE.md; shadcn/ui v3 compatible |
| shadcn/ui | latest CLI | Component library (copy-paste architecture) | Locked in CLAUDE.md |
| motion (framer-motion) | ^11.x | Layout animations, spring physics | Needed for magnetic button + column transitions |
| next-themes | ^0.3.x | Dark/light/custom theme switching | shadcn/ui official recommendation |
| sonner | ^1.x | Toast notifications | shadcn/ui official replacement for deprecated Toast |
| react-textarea-autosize | ^8.x | Auto-expanding textarea | Eliminates imperative resize logic entirely |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss-animate | ^1.x | CSS animate-in/out utilities | Included automatically by shadcn/ui init (v3 projects) |
| lucide-react | ^0.4xx | Icon set | Bundled with shadcn/ui; use for spinner, X, arrow icons |
| clsx + tailwind-merge | latest | Conditional className merging | Included by shadcn/ui; use in all custom components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion (framer-motion) | CSS transitions only | CSS cannot do layout animations or spring physics without JS; magnetic button requires motion values |
| react-textarea-autosize | Custom useRef resize hook | Library is battle-tested across iOS/Android quirks; 30-line custom impl breaks on mobile zoom |
| sonner | shadcn/ui Toast (deprecated) | Toast component deprecated in favor of Sonner per official shadcn changelog |
| Tailwind v3 | Tailwind v4 | v4 requires CSS-first config; shadcn/ui CLI generates v3 code by default; mixing versions causes class breakage |

### Installation
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd frontend
npx shadcn@latest init
npx shadcn@latest add button textarea card badge separator
npm install motion next-themes sonner react-textarea-autosize
```

shadcn components to add for this phase:
```bash
npx shadcn@latest add button card badge separator
# sonner is added via: npx shadcn@latest add sonner
```

---

## Architecture Patterns

### Recommended Project Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # ThemeProvider + Toaster mount here
│   │   ├── page.tsx            # Single-page app — ForgeApp component
│   │   └── globals.css         # Tailwind directives + CSS vars for themes
│   ├── components/
│   │   ├── ui/                 # shadcn copy-paste components (DO NOT EDIT)
│   │   ├── forge/
│   │   │   ├── ForgeApp.tsx    # Top-level state machine (idle/loading/done/error)
│   │   │   ├── HeroInput.tsx   # Hero landing: textarea + magnetic button
│   │   │   ├── InputCard.tsx   # Col 1 after transition
│   │   │   ├── CraftedCard.tsx # Col 2 — typewriter reveal
│   │   │   └── ResultCard.tsx  # Col 3 — before/after panels
│   │   ├── layout/
│   │   │   ├── DotGridBackground.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── shared/
│   │       ├── MagneticButton.tsx
│   │       ├── TypewriterText.tsx
│   │       └── LoadingStatus.tsx
│   ├── lib/
│   │   ├── api.ts              # Typed fetch wrappers for /api/forge, /api/library
│   │   └── utils.ts            # cn() helper (auto-created by shadcn)
│   ├── hooks/
│   │   └── useCancelableForge.ts  # forge() + AbortController cancel logic
│   └── types/
│       └── api.ts              # ForgeRequest, ForgeResponse types
├── public/
├── next.config.ts
├── tailwind.config.ts
└── components.json             # shadcn config
```

### Pattern 1: State Machine — ForgeApp
**What:** Single enum-based state drives what is visible on screen. No prop-drilling of booleans.
**When to use:** Any component with 3+ mutually exclusive visual states.
```typescript
// Source: standard React pattern
type ForgeState = 'idle' | 'loading' | 'done' | 'error'

export function ForgeApp() {
  const [state, setState] = useState<ForgeState>('idle')
  const [result, setResult] = useState<ForgeResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleForge = async (input: string) => {
    abortRef.current = new AbortController()
    setState('loading')
    try {
      const data = await forgeApi(input, abortRef.current.signal)
      setResult(data)
      setState('done')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState('idle') // user cancelled
      } else {
        toast.error(formatApiError(err))
        setState('error') // or back to 'idle' — then toast is sufficient
      }
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
  }

  const handleReset = () => {
    setResult(null)
    setState('idle')
  }

  return (
    <AnimatePresence mode="wait">
      {state === 'idle' || state === 'loading' ? (
        <HeroInput key="hero" onSubmit={handleForge} onCancel={handleCancel} isLoading={state === 'loading'} />
      ) : (
        <ThreeColumnLayout key="results" result={result!} onReset={handleReset} />
      )}
    </AnimatePresence>
  )
}
```

### Pattern 2: Staggered Column Reveal
**What:** Columns 2 and 3 animate in from the right with staggered delay using Framer Motion.
**When to use:** After forge completes, transitioning from hero to three-column.
```typescript
// Source: motion.dev React docs
import { motion } from 'motion/react'

const COLUMN_VARIANTS = {
  hidden: { opacity: 0, x: 60 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, delay: i * 0.15, ease: 'easeOut' }
  })
}

function ThreeColumnLayout({ result, onReset }: Props) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <InputCard onReset={onReset} />
      {[CraftedCard, ResultCard].map((Col, i) => (
        <motion.div
          key={i}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={COLUMN_VARIANTS}
        >
          <Col result={result} />
        </motion.div>
      ))}
    </div>
  )
}
```

### Pattern 3: Magnetic Button
**What:** Button physically follows cursor when mouse is within ~50px radius, springs back on leave.
**When to use:** Forge button only — do not apply to other buttons.
```typescript
// Source: blog.olivierlarose.com/tutorials/magnetic-button (verified pattern)
import { motion, useMotionValue, useSpring } from 'motion/react'
import { useRef } from 'react'

export function MagneticButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { damping: 10, stiffness: 150 })
  const springY = useSpring(y, { damping: 10, stiffness: 150 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY)
    if (dist < 50) {
      x.set((e.clientX - centerX) * 0.35)
      y.set((e.clientY - centerY) * 0.35)
    }
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <motion.button style={{ x: springX, y: springY }} whileTap={{ scale: 0.95 }} {...props}>
        {children}
      </motion.button>
    </div>
  )
}
```

### Pattern 4: Typewriter Effect (custom hook)
**What:** Reveals a string character-by-character at a configurable speed; notifies caller at 75% completion.
**When to use:** CraftedCard column — starts on mount, triggers ResultCard fade-in at 75%.
```typescript
// Source: standard React pattern (no library needed)
function useTypewriter(text: string, speedMs = 15, onSeventyFivePercent?: () => void) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const triggered75 = useRef(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    triggered75.current = false
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (!triggered75.current && i / text.length >= 0.75) {
        triggered75.current = true
        onSeventyFivePercent?.()
      }
      if (i >= text.length) {
        clearInterval(id)
        setDone(true)
      }
    }, speedMs)
    return () => clearInterval(id)
  }, [text])

  return { displayed, done }
}
```

### Pattern 5: Themed Dot Grid Background
**What:** Pure CSS radial gradient dot pattern with radial mask fade to edges — zero dependencies.
**When to use:** `app/globals.css` or as a fixed background div behind all content.
```css
/* Source: ibelick.com/blog/create-grid-and-dot-backgrounds-with-css-tailwind-css */
.dot-grid-bg {
  background-image: radial-gradient(circle, rgb(var(--dot-color) / 0.35) 1px, transparent 1px);
  background-size: 24px 24px;
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
}
```
Define `--dot-color` as a CSS variable in the theme. Cool theme: `37 99 235` (blue-600). Warm theme: `217 119 6` (amber-600).

### Pattern 6: API Client with AbortController
**What:** Single typed function for forge endpoint, accepts signal for cancel.
**When to use:** Only touch `lib/api.ts` for backend calls — never inline fetch in components.
```typescript
// Source: standard browser API pattern
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface ForgeRequest { input: string }
export interface ForgeResponse {
  category: string
  crafted_prompt: string
  crafted_result: string
  raw_result: string
  call_timings: Record<string, number>
  total_latency_ms: number
}

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail)
  }
}

export async function forgeApi(input: string, signal?: AbortSignal): Promise<ForgeResponse> {
  const res = await fetch(`${API_BASE}/api/forge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    signal,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.detail ?? 'Unknown error')
  }
  return res.json()
}
```

### Pattern 7: Dark/Theme Setup
**What:** next-themes ThemeProvider with two named themes (cool, warm); CSS variables map accent colors.
**When to use:** `app/layout.tsx` as outermost wrapper.
```typescript
// Source: ui.shadcn.com/docs/dark-mode/next
// app/layout.tsx
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" themes={['cool', 'warm']}>
          {children}
          <Toaster position="top-right" richColors closeButton duration={5000} expand={false} />
        </ThemeProvider>
      </body>
    </html>
  )
}
```
Theme CSS classes applied to `<html>` — define accent color CSS variables in `globals.css` under `.cool` and `.warm` selectors.

### Anti-Patterns to Avoid
- **Inline fetch in components:** Every backend call must go through `lib/api.ts`. Components call the api module, not `fetch()` directly.
- **Multiple AbortControllers:** Only one ref in ForgeApp. Cancel always goes through `abortRef.current.abort()`.
- **AnimatePresence without `key` changes:** `AnimatePresence` only triggers exit animations when the child's `key` changes. Missing `key` = no exit animation.
- **Skipping `suppressHydrationWarning`:** Without it on `<html>`, next-themes causes a hydration mismatch error in Next.js App Router.
- **Calling `motion` from `framer-motion`:** The package is now `motion/react` — import from `'motion/react'`, not `'framer-motion'` for new code.
- **Typewriter on SSR:** `useTypewriter` must only run client-side. Mark parent with `'use client'` or wrap in a client component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast context + portal | Sonner via `npx shadcn@latest add sonner` | Stacking, auto-dismiss, animation, a11y all handled |
| Auto-expanding textarea | `useRef` + `scrollHeight` manual resize | `react-textarea-autosize` | iOS zoom quirks, resize observer edge cases |
| Theme persistence across reload | `localStorage` wrapper | `next-themes` | SSR flash prevention, system preference sync |
| Spring physics on button | `useEffect` + `transform` string math | `useSpring` from `motion/react` | Overshooting, damping, interruptible mid-animation |
| Component class merging | custom `cx()` function | `cn()` from `lib/utils.ts` (Tailwind Merge + clsx) | Conflicting Tailwind classes need merge — `cn('px-2', 'px-4')` → `px-4` |

**Key insight:** The premium "feel" (magnetic button, spring physics, smooth layout transitions) requires Framer Motion — CSS transitions alone cannot animate layout changes or apply spring damping on arbitrary values.

---

## Common Pitfalls

### Pitfall 1: CORS — Backend Not Allowing Frontend Origin
**What goes wrong:** Browser blocks `fetch('http://localhost:8000/api/forge')` with CORS error even though backend is running.
**Why it happens:** FastAPI CORS middleware must explicitly allow the Next.js dev origin (`http://localhost:3000`).
**How to avoid:** Confirm `backend/main.py` has `allow_origins=["http://localhost:3000", "*"]` in `CORSMiddleware`. During dev, `*` is acceptable.
**Warning signs:** Browser console shows "Cross-Origin Request Blocked" or OPTIONS request returns 400.

### Pitfall 2: next-themes Hydration Flash
**What goes wrong:** Page flashes white (light mode) for one frame before dark theme applies.
**Why it happens:** Server renders without knowing the client's preferred theme; `<html>` class mismatches.
**How to avoid:** Add `suppressHydrationWarning` to `<html>` tag in `layout.tsx`. This suppresses the React warning for the theme class mismatch — it is expected and correct.
**Warning signs:** `Warning: Extra attributes from the server: class` in console.

### Pitfall 3: AnimatePresence Not Triggering Exit Animations
**What goes wrong:** `animate-out` doesn't play — component unmounts instantly.
**Why it happens:** `AnimatePresence` only detects unmounts when the direct child's `key` prop changes. If you conditionally render with `{condition && <Component />}` without a key, React may reuse the component.
**How to avoid:** Always give `AnimatePresence` children a stable, unique `key` that changes with the state: `<motion.div key={state === 'done' ? 'result' : 'hero'}>`.
**Warning signs:** Columns appear instantly without animation on transition.

### Pitfall 4: Framer Motion Import from Wrong Package
**What goes wrong:** `import { motion } from 'framer-motion'` works but uses the old package name.
**Why it happens:** Package rebranded to `motion`; `framer-motion` still installs but is the legacy name.
**How to avoid:** Install `npm install motion` and import from `'motion/react'`. Do not mix both in the same project.
**Warning signs:** ESLint may flag this if configured; no runtime error.

### Pitfall 5: Typewriter `useEffect` Stale Closure
**What goes wrong:** Typewriter re-triggers on every render instead of only when `text` changes; or cleans up incorrectly leaving orphan intervals.
**Why it happens:** Missing or wrong dependency array in `useEffect`; not returning the cleanup function.
**How to avoid:** `useEffect` dependency is `[text]` only. Always `return () => clearInterval(id)` from the effect.
**Warning signs:** Text re-animates on hover or unrelated state changes.

### Pitfall 6: `NEXT_PUBLIC_` Env Variable Missing on Client
**What goes wrong:** `process.env.NEXT_PUBLIC_API_URL` is `undefined` in the browser even though it's in `.env.local`.
**Why it happens:** Only vars prefixed with `NEXT_PUBLIC_` are inlined at build time. Variables without this prefix are server-only.
**How to avoid:** Use `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`. Provide a fallback in `lib/api.ts`: `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'`.
**Warning signs:** API calls go to `undefined/api/forge` — visible in Network tab.

### Pitfall 7: shadcn/ui Components Need `'use client'`
**What goes wrong:** Runtime error "cannot use hooks in server component" when adding shadcn components.
**Why it happens:** Next.js App Router defaults to Server Components; shadcn interactive components require `'use client'`.
**How to avoid:** Any file that uses `useState`, `useEffect`, shadcn interactive components, or `motion` must have `'use client'` as the first line.
**Warning signs:** Error: `You're importing a component that needs ... It only works in a Client Component`.

---

## Code Examples

Verified patterns from official sources:

### Sonner Toast — Error Formatting
```typescript
// Source: ui.shadcn.com/docs/components/radix/sonner
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return `Invalid input (422). Your text may be empty or too short.`
    if (err.status === 502) return `Granite API error (502). The upstream service is unavailable. Retry in a few seconds.`
    return `Error (${err.status}): ${err.detail}`
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred.'
}

// Usage: toast.error(formatApiError(err)) — auto-dismisses after 5s via Toaster duration prop
```

### shadcn/ui Init and Component Add
```bash
# Source: ui.shadcn.com/docs/installation/next
npx shadcn@latest init          # choose: New York, CSS variables ON, no Tailwind prefix
npx shadcn@latest add sonner    # adds Toaster wrapper + re-exports sonner toast()
npx shadcn@latest add button card badge separator
```

### Tailwind v3 Dark Mode Config
```typescript
// tailwind.config.ts — Source: tailwindcss.com/docs/dark-mode
import type { Config } from 'tailwindcss'
export default {
  darkMode: ['class'],          // class strategy — required for next-themes
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
```

### Loading Status Cycler
```typescript
// Pure React — no external dependency
const STATUS_STAGES = [
  { text: 'Detecting category...', ms: 1200 },
  { text: 'Crafting expert prompt...', ms: 2500 },
  { text: 'Executing with IBM Granite...', ms: 3500 },
  { text: 'Almost there...', ms: Infinity },
]

export function LoadingStatus({ isLoading }: { isLoading: boolean }) {
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    if (!isLoading) { setStageIdx(0); return }
    const timers = STATUS_STAGES.slice(0, -1).map((s, i) =>
      setTimeout(() => setStageIdx(i + 1), s.ms)
    )
    return () => timers.forEach(clearTimeout)
  }, [isLoading])

  return (
    <p className="text-sm text-muted-foreground transition-opacity duration-200">
      {isLoading ? STATUS_STAGES[stageIdx].text : ''}
    </p>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` | Late 2024 | Package renamed; `framer-motion` still works as alias |
| shadcn Toast component | Sonner via shadcn | Mid 2024 | Toast deprecated; sonner is the new standard in shadcn |
| `tailwind.config.js` (JS) | `tailwind.config.ts` (TS) | Tailwind 3.3+ | TypeScript config is now the default from create-next-app |
| CSS-only column reveal | Framer Motion layout + AnimatePresence | 2023+ | Layout animations need JS measurement; AnimatePresence handles unmount |
| `tw-animate-css` | `tailwindcss-animate` | Tailwind v4 only | `tw-animate-css` is the v4 replacement; v3 still uses `tailwindcss-animate` |

**Deprecated/outdated:**
- `shadcn/ui Toast`: replaced by Sonner — do NOT add the `toast` component, add `sonner` instead
- `framer-motion` import path: works but the canonical import is now `motion/react`
- Tailwind v4 CSS-first config: NOT applicable here — locked to v3 for shadcn compatibility

---

## Open Questions

1. **CORS Configuration in Existing Backend**
   - What we know: FastAPI backend exists and runs; Phase 2 added CORS middleware
   - What's unclear: Whether `allow_origins` includes `http://localhost:3000` specifically
   - Recommendation: Verify `backend/main.py` CORSMiddleware before first API call; add `http://localhost:3000` if missing

2. **Tailwind v3 vs v4 in `create-next-app` Default**
   - What we know: As of late 2024, `create-next-app --tailwind` may install either v3 or v4 depending on Next.js version
   - What's unclear: Exact default in Next.js 14 CLI as of March 2026
   - Recommendation: After `create-next-app`, check installed tailwind version. If v4, downgrade: `npm install tailwindcss@^3.4 tailwindcss-animate@^1` before `npx shadcn@latest init`

3. **next.config for API Proxy vs Direct Fetch**
   - What we know: Direct fetch with `NEXT_PUBLIC_API_URL` works; Next.js rewrites can proxy to avoid CORS
   - What's unclear: Whether rewrites are needed or CORS header fix is sufficient
   - Recommendation: Start with direct fetch + CORS fix. Only add `next.config.ts` rewrites if CORS issues persist in deployed Vercel environment.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for new Next.js frontend — no Babel config, native TS/JSX) |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Three-column grid renders when `state === 'done'` | unit | `npm run test -- --run src/components/forge/ForgeApp.test.tsx` | ❌ Wave 0 |
| UX-02 | Hero single-column renders when `state === 'idle'` | unit | `npm run test -- --run src/components/forge/ForgeApp.test.tsx` | ❌ Wave 0 |
| UX-03 | CraftedCard and ResultCard have `motion.div` with correct initial/animate | unit | `npm run test -- --run src/components/forge/ThreeColumnLayout.test.tsx` | ❌ Wave 0 |
| UX-06 | Loading state text cycles through status stages | unit | `npm run test -- --run src/components/shared/LoadingStatus.test.tsx` | ❌ Wave 0 |
| UX-07 | `formatApiError` returns human-readable messages for 422, 502, network errors | unit | `npm run test -- --run src/lib/api.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run` (all unit tests, no watch)
- **Per wave merge:** `npm run test -- --run` + `npm run lint` + `npx tsc --noEmit`
- **Phase gate:** Full suite green + no TypeScript errors before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/vitest.config.ts` — Vitest configuration with jsdom environment
- [ ] `frontend/src/test/setup.ts` — `@testing-library/jest-dom` matchers setup
- [ ] `frontend/src/components/forge/ForgeApp.test.tsx` — covers UX-01, UX-02
- [ ] `frontend/src/components/forge/ThreeColumnLayout.test.tsx` — covers UX-03
- [ ] `frontend/src/components/shared/LoadingStatus.test.tsx` — covers UX-06
- [ ] `frontend/src/lib/api.test.ts` — covers UX-07

Framework install:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

---

## Sources

### Primary (HIGH confidence)
- `ui.shadcn.com/docs/installation/next` — shadcn/ui Next.js installation steps verified
- `ui.shadcn.com/docs/dark-mode/next` — ThemeProvider setup, suppressHydrationWarning requirement
- `ui.shadcn.com/docs/components/radix/sonner` — Sonner toast API, Toaster placement
- `motion.dev/docs/react-upgrade-guide` — Package rename from framer-motion to motion
- `ibelick.com/blog/create-grid-and-dot-backgrounds-with-css-tailwind-css` — CSS radial gradient dot pattern
- `blog.olivierlarose.com/tutorials/magnetic-button` — Magnetic button useMotionValue + useSpring pattern

### Secondary (MEDIUM confidence)
- WebSearch + official shadcn changelog: Toast → Sonner migration verified
- WebSearch + official Tailwind docs: v3 vs v4 shadcn compatibility verified
- WebSearch + motion.dev: `useMotionValue` / `useSpring` API for magnetic button

### Tertiary (LOW confidence)
- `create-next-app` default Tailwind version as of March 2026 — could not confirm definitively; treat as Wave 0 verification step

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs and shadcn changelog
- Architecture: HIGH — standard Next.js App Router patterns, no experimental APIs
- Animations (Framer Motion): HIGH — motion.dev official docs confirm API
- Pitfalls: HIGH — CORS, hydration, AnimatePresence key all verified from official sources
- Test framework: MEDIUM — Vitest recommended for new Vite-adjacent TS projects; Next.js supports both Jest and Vitest officially

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable stack — shadcn/ui + Next.js 14 changes slowly)
