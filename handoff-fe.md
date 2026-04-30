# Scan Dissolve — Web Implementation Guide

**Live demo:** https://scan-demo.netlify.app  
**Source:** https://github.com/alex1lazar/scan-demo

---

## What it is

A looping document scan animation. A glowing sweep line progressively reveals binary digits while masking the document beneath it. Each loop pass reshuffles digit positions so no two sweeps look the same.

---

## Dependencies

One runtime dependency:

```
npm install framer-motion
```

The project uses Tailwind CSS v4. If your stack is different, the handful of layout classes on the wrapper `<div>` are trivial to replace with whatever you use.

---

## Files to copy

```
src/scan-dissolve.tsx   ← the component
src/shared.tsx          ← constants, SVG helpers, bit layout
```

Everything else (`App.tsx`, `bits-anim.tsx`, `LineAnim.tsx`) is demo scaffolding — do not copy it.

---

## Basic usage

```tsx
import { ScanDissolve } from './scan-dissolve'

<ScanDissolve autoPlay loop />
```

With a stop/play toggle:

```tsx
import { useRef, useState } from 'react'
import { ScanDissolve } from './scan-dissolve'
import type { PlayHandle } from './shared'

export function ScanDemo() {
  const ref = useRef<PlayHandle>(null)
  const [running, setRunning] = useState(true)

  const toggle = () => {
    if (running) { ref.current?.stop(); setRunning(false) }
    else         { ref.current?.play(); setRunning(true)  }
  }

  return (
    <>
      <ScanDissolve ref={ref} autoPlay loop={running} />
      <button onClick={toggle}>{running ? 'Stop' : 'Play'}</button>
    </>
  )
}
```

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sweepMs` | `number` | `2200` | Duration of one sweep direction (ms) |
| `holdMs` | `number` | `80` | Pause at bottom before returning (ms) |
| `overshoot` | `number` | `8` | SVG units the line travels past doc edges |
| `bitCount` | `number` | `20` | Number of binary digits |
| `enterMs` | `number` | `720` | Per-digit float-up duration (ms) |
| `bitHoldMs` | `number` | `540` | Per-digit hold at full opacity (ms) |
| `exitMs` | `number` | `800` | Per-digit blur/fade duration (ms) |
| `offsetY` | `number` | `8` | Pixels below target on digit entry |
| `maxDelay` | `number` | `900` | Max random stagger between digits (ms) |
| `exitBlur` | `number` | `8` | Blur radius (px) at digit exit peak |
| `scanColor` | `string` | `'#7A43E8'` | Colour of scan line and corner brackets |
| `loop` | `boolean` | `false` | Loop continuously after each pass |
| `autoPlay` | `boolean` | `true` | Play on mount |
| `onComplete` | `() => void` | — | Called when a single pass finishes (non-loop only) |

---

## Swap the document

`DefaultDoc` in `shared.tsx` renders a placeholder invoice SVG. Replace it with your actual document — it needs to fit a `160 × 200` SVG viewBox. The simplest swap:

```tsx
// shared.tsx
export function DefaultDoc() {
  return (
    <image href={yourDocUrl} x="0" y="0" width={DOC_W} height={DOC_H} />
  )
}
```

Or embed your SVG asset the same way the placeholder does — as a nested `<svg>` with `preserveAspectRatio="xMidYMid meet"`.

---

## Changing default values

All timing and layout defaults are named constants at the top of `shared.tsx`:

```ts
export const SWEEP_MS     = 2200   // each sweep direction (ms)
export const LINE_HOLD_MS = 80     // pause at bottom (ms)
export const BIT_COUNT    = 20     // number of binary digits
export const OVERSHOOT    = 8      // SVG units past doc edge
export const SCAN_COLOR   = '#7A43E8'
```

And in `bits-anim.tsx`:

```ts
export const ENTER_MS    = 720
export const BIT_HOLD_MS = 540
export const EXIT_MS     = 800
export const OFFSET_Y    = 8
export const MAX_DELAY   = 900
export const EXIT_BLUR   = 8
```

---

## Notes

- **`dialkit` is not a production dependency.** It is a dev-only tuning panel used only in the demo's `App.tsx`. Do not install it in your production project.
- The component is fully self-contained — no context providers, no global state, no side effects outside its own DOM node.
- `prefers-reduced-motion` is respected: the animation skips immediately on reduced-motion devices and calls `onComplete` so downstream state stays consistent.
- SVG filter/mask IDs are scoped per instance via `useId()` — safe to render multiple instances on the same page.
