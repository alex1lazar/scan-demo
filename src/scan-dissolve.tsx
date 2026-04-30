/*
 * SCAN DISSOLVE — Combined animation
 *
 *    0 ms  document fully visible, bits hidden
 *    0 ms  sweep down begins — sweepMs
 * sweepMs  doc hidden, bits fully visible — hold: holdMs
 * sweepMs+holdMs  sweep up begins — sweepMs
 * complete  loops back to start with freshly shuffled bit positions
 *
 * MASK LOGIC
 * ----------
 * lineYMask: clamped lineY → 0..DOC_H — pixel-perfect behind the visual line.
 *   docMask: y=lineYMask, h=DOC_H-lineYMask → doc visible BELOW line
 *   bitMask: y=0,         h=lineYMask        → bits visible ABOVE line
 *
 * PER-BIT LIFECYCLE
 * -----------------
 * Bits are reshuffled on every play() so no two sweeps look the same.
 * Each digit: appear → hold → exit (independent keyframe animation).
 * The mask handles spatial clipping; keyframes own opacity/blur.
 */

import {
  useRef, useCallback, useEffect, useImperativeHandle,
  forwardRef, useId, useState,
} from 'react'
import { useMotionValue, useTransform, animate, motion } from 'framer-motion'
import {
  DOC_W, DOC_H, OVERSHOOT, SWEEP_MS, LINE_HOLD_MS, BIT_COUNT,
  BIT_COLOR, SCAN_COLOR, DefaultDoc, GlowFilter, makeBits,
  stageClass, svgClass,
} from './shared'
import type { PlayHandle } from './shared'
import { ENTER_MS, OFFSET_Y, EXIT_BLUR, MAX_DELAY, BIT_HOLD_MS, EXIT_MS } from './bits-anim'

function freshBits(count: number) {
  return makeBits(count).map(b => ({ ...b, delayFraction: Math.random() }))
}

interface Props {
  sweepMs?:    number
  holdMs?:     number
  overshoot?:  number
  bitCount?:   number
  enterMs?:    number
  bitHoldMs?:  number
  exitMs?:     number
  offsetY?:    number
  maxDelay?:   number
  exitBlur?:   number
  scanColor?:  string
  loop?:       boolean
  autoPlay?:   boolean
  onComplete?: () => void
}

export const ScanDissolve = forwardRef<PlayHandle, Props>(function ScanDissolve(
  {
    sweepMs   = SWEEP_MS,
    holdMs    = LINE_HOLD_MS,
    overshoot = OVERSHOOT,
    bitCount  = BIT_COUNT,
    enterMs   = ENTER_MS,
    bitHoldMs = BIT_HOLD_MS,
    exitMs    = EXIT_MS,
    offsetY   = OFFSET_Y,
    maxDelay  = MAX_DELAY,
    exitBlur  = EXIT_BLUR,
    scanColor = SCAN_COLOR,
    loop      = false,
    autoPlay  = true,
    onComplete,
  },
  ref
) {
  const uid      = useId().replace(/:/g, '')
  const progress = useMotionValue(0)
  const animRef  = useRef<ReturnType<typeof animate> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Bits are state so they reshuffle on every play()
  const [bits, setBits] = useState(() => freshBits(bitCount))
  const [playKey, setPlayKey] = useState(-1)

  // Stable refs for values consumed inside callbacks / transforms
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const loopRef = useRef(loop)
  useEffect(() => { loopRef.current = loop }, [loop])

  const overshootRef = useRef(overshoot)
  useEffect(() => { overshootRef.current = overshoot }, [overshoot])

  // playRef lets the completion callback call the latest play() without
  // the closure going stale between Dialkit-triggered rebuilds
  const playRef = useRef<() => void>()

  const lineY = useTransform(progress, p => {
    const ov = overshootRef.current
    const range = DOC_H + 2 * ov
    return p <= 1
      ? -ov + range * p
      : DOC_H + ov - range * (p - 1)
  })

  const lineYMask  = useTransform(lineY, ly => Math.max(0, Math.min(DOC_H, ly)))
  const docMaskH   = useTransform(lineYMask, ly => DOC_H - ly)
  const lineOpacity = useTransform(progress, [0, 0.02, 1.98, 2], [0, 1, 1, 0])

  const play = useCallback(() => {
    if (animRef.current) animRef.current.stop()
    if (timerRef.current) clearTimeout(timerRef.current)

    // New positions + delays every sweep so the layout never repeats
    setBits(freshBits(bitCount))
    progress.set(0)
    setPlayKey(k => k + 1)

    animRef.current = animate(progress, 1, { duration: sweepMs / 1000, ease: 'easeInOut' })
    animRef.current.then(() => {
      timerRef.current = setTimeout(() => {
        animRef.current = animate(progress, 2, { duration: sweepMs / 1000, ease: 'easeInOut' })
        animRef.current.then(() => {
          if (loopRef.current) {
            playRef.current?.()
          } else {
            onCompleteRef.current?.()
          }
        })
      }, holdMs)
    })
  }, [progress, sweepMs, holdMs, enterMs, bitHoldMs, exitMs, offsetY, bitCount, maxDelay, exitBlur])

  // Keep playRef current so the loop callback always calls the latest version
  useEffect(() => { playRef.current = play }, [play])

  const stop = useCallback(() => {
    if (animRef.current) animRef.current.stop()
    if (timerRef.current) clearTimeout(timerRef.current)
    progress.set(0)
    setPlayKey(-1)
  }, [progress])

  useImperativeHandle(ref, () => ({ play, stop }), [play, stop])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progress.set(2); onCompleteRef.current?.(); return
    }
    if (autoPlay) play()
  }, [play, autoPlay]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    animRef.current?.stop()
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const total = enterMs + bitHoldMs + exitMs
  const t1 = enterMs / total
  const t2 = (enterMs + bitHoldMs) / total

  return (
    <div className={stageClass}>
      <svg viewBox={`0 0 ${DOC_W} ${DOC_H}`} className={svgClass}>
        <defs>
          <GlowFilter id={`glow-${uid}`} />

          <mask id={`docMask-${uid}`}>
            <motion.rect x={0} width={DOC_W} fill="white"
              style={{ y: lineYMask, height: docMaskH }} />
          </mask>

          <mask id={`bitMask-${uid}`}>
            <motion.rect x={0} y={0} width={DOC_W} fill="white"
              style={{ height: lineYMask }} />
          </mask>
        </defs>

        <g mask={`url(#docMask-${uid})`}>
          <DefaultDoc />
        </g>

        <g mask={`url(#bitMask-${uid})`}>
          {playKey >= 0 && bits.map((bit, i) => {
            const delayMs = bit.delayFraction * maxDelay

            return (
              <motion.g
                key={`${playKey}-${i}`}
                initial={{ translateY: offsetY, opacity: 0, filter: 'blur(0px)' }}
                animate={{
                  translateY: [offsetY, 0,           0,           0          ],
                  opacity:    [0,       bit.opacity, bit.opacity, 0          ],
                  filter:     ['blur(0px)', 'blur(0px)', 'blur(0px)', `blur(${exitBlur}px)`],
                }}
                transition={{
                  delay:    delayMs / 1000,
                  duration: total / 1000,
                  times:    [0, t1, t2, 1],
                  ease:     ['easeOut', 'linear', 'easeIn'],
                }}
              >
                <text
                  x={bit.x}
                  y={bit.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={bit.fontSize}
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={BIT_COLOR}
                >
                  {bit.value}
                </text>
              </motion.g>
            )
          })}
        </g>

        <motion.rect
          x={-6} width={DOC_W + 12} height={1.5}
          fill={scanColor}
          filter={`url(#glow-${uid})`}
          style={{ y: lineY, opacity: lineOpacity }}
        />

        {/* Corner brackets */}
        {(() => {
          const pad = 14
          const arm = 22
          const r   = 6
          const lx  = -6 - pad
          const rx  = DOC_W + 6 + pad
          const ty  = -overshoot - pad
          const by  = DOC_H + overshoot + pad
          const paths = [
            `M ${lx + arm},${ty} L ${lx + r},${ty} Q ${lx},${ty} ${lx},${ty + r} L ${lx},${ty + arm}`,
            `M ${rx - arm},${ty} L ${rx - r},${ty} Q ${rx},${ty} ${rx},${ty + r} L ${rx},${ty + arm}`,
            `M ${lx + arm},${by} L ${lx + r},${by} Q ${lx},${by} ${lx},${by - r} L ${lx},${by - arm}`,
            `M ${rx - arm},${by} L ${rx - r},${by} Q ${rx},${by} ${rx},${by - r} L ${rx},${by - arm}`,
          ]
          return paths.map((d, i) => (
            <path key={i} d={d}
              fill="none" stroke={scanColor} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" />
          ))
        })()}
      </svg>
    </div>
  )
})
