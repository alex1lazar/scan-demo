# Scan Dissolve

A document scan animation prototype — a glowing sweep line travels over a document, progressively replacing it with binary digits before restoring it. Designed as a visual metaphor for OCR or data extraction moments in a product.

**Live demo:** [https://scan-demo.netlify.app](https://helpful-tulumba-a4d2bd.netlify.app/)

---

## What it does

A single sweep pass works in two movements:

1. **Down stroke** — the scan line travels from top to bottom. Everything above the line reveals binary digits; everything below stays as the original document. The document and the digit layer are masked against each other using the line's position, so there is never a visible seam.

2. **Up stroke** — the line returns. The masks invert back, restoring the document as the line passes.

The loop runs continuously. Each new pass generates a fresh set of digit positions, sizes, and stagger delays so no two sweeps look the same.

Each binary digit has its own independent lifecycle: it floats up from slightly below its target position, holds at full opacity, then blurs and fades out. The timing is randomised per digit within a configurable window, which creates organic-looking entropy rather than a uniform wave.

Corner brackets frame the document in the accent colour and scale with the overshoot value so the composition stays balanced regardless of sweep depth.

---

## Why it was built

The animation serves as a handoff artefact — a browser prototype that can be evaluated by design, shared with engineers as a live spec, and ported to production without ambiguity. All timing values are named constants that were tuned live using a control panel (Dialkit) during design exploration and then baked into the component defaults.

The goal was to avoid the usual gap between a Figma mockup and a production animation: instead of describing motion in static frames, this *is* the motion.

---

## How it's built

The entire animation runs off a single `progress` motion value that moves `0 → 1 → 2`:

```
0 → 1   sweep down     (easeInOut, sweepMs)
        hold at bottom (holdMs)
1 → 2   sweep up       (easeInOut, sweepMs)
        → restart
```

**Masking** is done with two SVG `<mask>` elements driven by a clamped version of the line's Y position. The document mask shows everything below the line; the digit mask shows everything above it. Because they're derived from the same value, the transition is pixel-perfect with no crossfade or opacity trick.

**Per-digit animation** uses Framer Motion keyframes with a `times` array that encodes the three phases (appear, hold, exit) as proportions of the total duration. Each digit gets a random delay fraction multiplied by `maxDelay` — changing the delay slider in the demo doesn't reshuffle positions because the fraction is generated once and the multiplier is applied at render time.

**The loop** is handled by a `playRef` pattern: the animation completion callback holds a ref to the latest version of `play()`, not a closure-captured copy, so Dialkit param changes mid-animation don't cause the next loop to run with stale values.

---

## Stack

- **React 19** + **TypeScript**
- **Framer Motion v12** — motion values, transforms, keyframe animations
- **Tailwind CSS v4** — layout only
- **Vite 8**

No animation-specific build config required. The SVG masks, filters, and per-element transforms are all handled at runtime by Framer Motion and the browser's SVG renderer.

---

## Implementation guides

- [`handoff-fe.md`](./handoff-fe.md) — drop-in guide for a React/web engineer
- [`handoff-mobile.md`](./handoff-mobile.md) — React Native port guide (Reanimated, react-native-svg)
