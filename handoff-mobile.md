# Scan Dissolve — React Native Implementation Guide

**Reference demo:** https://scan-demo.netlify.app  
**Reference source (web):** https://github.com/alex1lazar/scan-demo

Watch the demo first — it is the spec.

---

## Dependencies

| Web (reference) | React Native replacement |
|---|---|
| `framer-motion` | `react-native-reanimated` + `moti` |
| `<svg>` / `<mask>` / `<rect>` / `<g>` / `<text>` | `react-native-svg` |
| Tailwind classes | NativeWind or `StyleSheet` |

```
npm install react-native-reanimated moti react-native-svg
```

Reanimated requires a Babel plugin — follow the [official setup guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) before anything else.

---

## How the animation works

Everything runs off a single `progress` value that goes `0 → 1 → 2`:

- `0 → 1` — scan line sweeps **down**; bits reveal above it
- `1 → 2` — scan line sweeps **up**; bits clear above it
- At `2` — restart with fresh random digit positions

Two SVG masks clip the scene. Both are driven by `lineYMask` — a clamped version of the line's Y position (clamped to `0..DOC_H` so the mask never goes negative):

| Mask | Rect spec | Effect |
|---|---|---|
| `docMask` | `y=lineYMask, height=DOC_H−lineYMask` | Document visible **below** the line |
| `bitMask` | `y=0, height=lineYMask` | Digits visible **above** the line |

Each digit is an independent animation with three phases: appear → hold → exit. The mask handles spatial ordering; the keyframes own opacity and blur.

---

## Motion value translation

**Progress driver:**

```ts
// Web (Framer Motion)
const progress = useMotionValue(0)
animate(progress, 1, { duration: sweepMs / 1000, ease: 'easeInOut' })
  .then(() => nextPhase())

// React Native (Reanimated)
import { useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated'

const progress = useSharedValue(0)
progress.value = withTiming(1, {
  duration: sweepMs,
  easing: Easing.inOut(Easing.ease),
}, (finished) => { if (finished) runOnJS(nextPhase)() })
```

**Derived line position:**

```ts
// Web
const lineY = useTransform(progress, p => {
  const range = DOC_H + 2 * overshoot
  return p <= 1 ? -overshoot + range * p : DOC_H + overshoot - range * (p - 1)
})

// React Native
import { useDerivedValue } from 'react-native-reanimated'

const lineY = useDerivedValue(() => {
  const range = DOC_H + 2 * overshoot
  return progress.value <= 1
    ? -overshoot + range * progress.value
    : DOC_H + overshoot - range * (progress.value - 1)
})

const lineYMask = useDerivedValue(() =>
  Math.max(0, Math.min(DOC_H, lineY.value))
)
```

---

## SVG mask setup

`react-native-svg` supports `<Mask>` — the technique is identical to web:

```tsx
import { Svg, Defs, Mask, Rect, G } from 'react-native-svg'
import Animated, { useAnimatedProps } from 'react-native-reanimated'

const AnimatedRect = Animated.createAnimatedComponent(Rect)

const docMaskProps = useAnimatedProps(() => ({
  y: lineYMask.value,
  height: Math.max(0, DOC_H - lineYMask.value),
}))

const bitMaskProps = useAnimatedProps(() => ({
  height: lineYMask.value,
}))

<Svg width={DOC_W} height={DOC_H} viewBox={`0 0 ${DOC_W} ${DOC_H}`}>
  <Defs>
    <Mask id="docMask">
      <AnimatedRect x={0} width={DOC_W} fill="white" animatedProps={docMaskProps} />
    </Mask>
    <Mask id="bitMask">
      <AnimatedRect x={0} y={0} width={DOC_W} fill="white" animatedProps={bitMaskProps} />
    </Mask>
  </Defs>

  <G mask="url(#docMask)">
    {/* document */}
  </G>

  <G mask="url(#bitMask)">
    {/* digit layer */}
  </G>
</Svg>
```

---

## Per-digit keyframe animations

Each digit has a 3-phase lifecycle. Use `withSequence` in Reanimated for clean multi-segment control:

```ts
import { withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated'

// For each digit, run on mount:
translateY.value = withDelay(delayMs,
  withSequence(
    withTiming(0,        { duration: enterMs,   easing: Easing.out(Easing.ease) }),  // enter
    withTiming(0,        { duration: bitHoldMs, easing: Easing.linear }),             // hold
    withTiming(0,        { duration: exitMs,    easing: Easing.in(Easing.ease) }),    // exit (translateY stays 0)
  )
)
opacity.value = withDelay(delayMs,
  withSequence(
    withTiming(bit.opacity, { duration: enterMs }),
    withTiming(bit.opacity, { duration: bitHoldMs }),
    withTiming(0,           { duration: exitMs }),
  )
)
```

Alternatively, `moti` (built on Reanimated) gives a Framer Motion-like API and is more readable for multi-prop animations. The tradeoff is less control over per-segment easing.

---

## The hard part: animated blur

Exit blur (`filter: blur(Xpx)` per digit on web) is the most involved piece on RN.

In `react-native-svg`, blur is a `<FEGaussianBlur>` filter applied per element. Animating `stdDeviation` requires `useAnimatedProps`:

```tsx
import { FEGaussianBlur, Filter, G } from 'react-native-svg'
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'

const AnimatedBlur = Animated.createAnimatedComponent(FEGaussianBlur)

// blurAmount drives 0 → exitBlur during the exit phase
const blurAmount = useSharedValue(0)

const blurProps = useAnimatedProps(() => ({
  stdDeviation: blurAmount.value,
}))

<Defs>
  <Filter id={`blur-${digitId}`}>
    <AnimatedBlur animatedProps={blurProps} />
  </Filter>
</Defs>
<G filter={`url(#blur-${digitId})`}>
  <Text ...>{digit.value}</Text>
</G>
```

Budget **2–3 hours** on this piece. It works, but `useAnimatedProps` on SVG filter primitives is not well-documented and will need iteration.

---

## Effort estimate

| Area | Effort |
|---|---|
| Reanimated setup + progress driver | ~1h |
| SVG structure and masks | ~2h |
| Per-digit keyframe animations | ~2h |
| Exit blur animation | ~2–3h |
| Digit layout, glow line, corner brackets | ~2h |
| **Total** | **~9–10h** |

---

## What you do not need to port

- **Dialkit** — dev-only tuning panel, not part of the component
- **`BitsAnim`** and **`LineAnim`** — standalone demo components, not used in production
- **`App.tsx`** — demo shell only

The only file that matters is `scan-dissolve.tsx`. Use it as the logic reference throughout.
