/*
 * BITS ANIMATION — per-bit float-up entrance, hold, blur-out exit
 *
 * Each digit independently:
 *   start:   offsetY px below target, opacity 0
 *   → enter: float up to target position, opacity → per-bit max   (ease-out, enterMs)
 *   → hold:  stays at target, full opacity                         (holdMs)
 *   → exit:  blurs + fades to 0                                    (ease-in, exitMs)
 *
 * Digits are staggered by a random fraction of maxDelay.
 * The document crossfades with the bit layer so the overall scene
 * looks like "document transforms into binary".
 *
 * playKey remounts <motion.g> elements to restart all animations cleanly.
 */

import {
  useRef, useCallback, useEffect, useImperativeHandle,
  forwardRef, useMemo, useState,
} from 'react'
import { useMotionValue, useTransform, animate, motion } from 'framer-motion'
import {
  DOC_W, DOC_H, BIT_COUNT,
  BIT_COLOR, DefaultDoc, makeBits,
  stageClass, svgClass,
} from './shared'
import type { PlayHandle } from './shared'

// ─── Default prop values (also exported for Dialkit defaults in App) ─────────
export const ENTER_MS   = 720   // float-up duration per bit
export const BIT_HOLD_MS = 540  // hold at full opacity
export const EXIT_MS    = 800   // blur + fade duration
export const OFFSET_Y   = 8    // CSS px below start position
export const MAX_DELAY  = 900   // max random stagger delay (ms)
export const EXIT_BLUR  = 8    // px blur radius at exit peak

interface Props {
  enterMs?:   number
  holdMs?:    number
  exitMs?:    number
  offsetY?:   number
  maxDelay?:  number
  exitBlur?:  number
  bitCount?:  number
  autoPlay?:  boolean
  onComplete?: () => void
}

export const BitsAnim = forwardRef<PlayHandle, Props>(function BitsAnim(
  {
    enterMs  = ENTER_MS,
    holdMs   = BIT_HOLD_MS,
    exitMs   = EXIT_MS,
    offsetY  = OFFSET_Y,
    maxDelay = MAX_DELAY,
    exitBlur = EXIT_BLUR,
    bitCount = BIT_COUNT,
    autoPlay = true,
    onComplete,
  },
  ref
) {
  const [playKey, setPlayKey] = useState(-1)   // -1 = idle (no bits shown yet)
  const animRef     = useRef<ReturnType<typeof animate> | null>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docProgress = useMotionValue(0)         // drives doc crossfade

  // Bit positions + values are stable. delayFraction (0–1) × maxDelay = actual delay.
  // Separating fraction from maxDelay means dragging the delay slider doesn't
  // shuffle the spatial layout of the digits.
  const bits = useMemo(
    () => makeBits(bitCount).map(b => ({ ...b, delayFraction: Math.random() })),
    [bitCount]
  )

  // Doc opacity: fades out as bits enter, holds, fades back in as bits exit
  const docOpacity = useTransform(docProgress, [0, 1, 1, 2], [1, 0, 0, 1])

  const play = useCallback(() => {
    // Cancel any in-flight animations
    if (animRef.current) animRef.current.stop()
    if (timerRef.current) clearTimeout(timerRef.current)

    // Remount all <motion.g> bits so keyframe animations restart fresh
    setPlayKey(k => k + 1)
    docProgress.set(0)

    // Doc fades out over (enterMs + half of maxDelay): rough visual sync
    const fadeOutDur = (enterMs + maxDelay * 0.5) / 1000
    animRef.current = animate(docProgress, 1, { duration: fadeOutDur, ease: 'easeInOut' })

    animRef.current.then(() => {
      // Hold while bits are at peak opacity
      timerRef.current = setTimeout(() => {
        // Doc fades back in during the exit phase
        animRef.current = animate(docProgress, 2, { duration: exitMs / 1000, ease: 'easeInOut' })
        animRef.current.then(() => onComplete?.())
      }, holdMs)
    })
  }, [enterMs, holdMs, exitMs, maxDelay, docProgress, onComplete])

  const stop = useCallback(() => {
    if (animRef.current) animRef.current.stop()
    if (timerRef.current) clearTimeout(timerRef.current)
    docProgress.set(0)
    setPlayKey(-1)
  }, [docProgress])

  useImperativeHandle(ref, () => ({ play, stop }), [play, stop])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      docProgress.set(2); onComplete?.(); return
    }
    if (autoPlay) play()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    animRef.current?.stop()
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  // Keyframe timing split points (0–1 within each bit's total duration)
  const total = enterMs + holdMs + exitMs
  const t1    = enterMs / total          // enter → hold transition
  const t2    = (enterMs + holdMs) / total  // hold → exit transition

  return (
    <div className={stageClass}>
      <svg viewBox={`0 0 ${DOC_W} ${DOC_H}`} className={svgClass}>

        {/* Document — crossfades with the bit layer */}
        <motion.g style={{ opacity: docOpacity }}>
          <DefaultDoc />
        </motion.g>

        {/* Per-bit float-up animations — only rendered after first play() */}
        {playKey >= 0 && bits.map((bit, i) => (
          <motion.g
            key={`${playKey}-${i}`}
            // Entry state: below target position, transparent
            initial={{ translateY: offsetY, opacity: 0, filter: 'blur(0px)' }}
            animate={{
              // Phase 0→t1 (enter):  float up, opacity rises    — ease-out
              // Phase t1→t2 (hold):  stays at target             — linear
              // Phase t2→1  (exit):  blurs and fades away        — ease-in
              translateY: [offsetY, 0,           0,           0          ],
              opacity:    [0,       bit.opacity, bit.opacity, 0          ],
              filter:     ['blur(0px)', 'blur(0px)', 'blur(0px)', `blur(${exitBlur}px)`],
            }}
            transition={{
              delay:    (bit.delayFraction * maxDelay) / 1000,
              duration: total / 1000,
              times:    [0, t1, t2, 1],
              // Per-segment easing: ease-out enter, linear hold, ease-in exit
              ease: ['easeOut', 'linear', 'easeIn'],
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
        ))}
      </svg>
    </div>
  )
})
