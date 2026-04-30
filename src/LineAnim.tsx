/*
 * LINE ANIMATION
 *
 * Scan line sweeps over the static document (no masking, no bits).
 * Document is always fully visible.
 *
 *    0 ms  line above doc (hidden)
 *    0 ms  sweep down begins — duration: sweepMs
 * sweepMs  line below doc — hold: holdMs
 * sweepMs + holdMs  sweep up begins — duration: sweepMs
 * complete  line above doc, fades out
 */

import { useRef, useCallback, useEffect, useImperativeHandle, forwardRef, useId } from 'react'
import { useMotionValue, useTransform, animate, motion } from 'framer-motion'
import {
  DOC_W, DOC_H, OVERSHOOT, SWEEP_MS, LINE_HOLD_MS,
  SCAN_COLOR, DefaultDoc, GlowFilter,
  stageClass, svgClass,
} from './shared'
import type { PlayHandle } from './shared'

interface Props {
  sweepMs?:   number
  holdMs?:    number
  overshoot?: number
  autoPlay?:  boolean
  onComplete?: () => void
}

export const LineAnim = forwardRef<PlayHandle, Props>(function LineAnim(
  {
    sweepMs   = SWEEP_MS,
    holdMs    = LINE_HOLD_MS,
    overshoot = OVERSHOOT,
    autoPlay  = true,
    onComplete,
  },
  ref
) {
  const uid      = useId().replace(/:/g, '')
  const progress = useMotionValue(0)  // 0=top, 1=bottom, 2=top
  const animRef  = useRef<ReturnType<typeof animate> | null>(null)

  // Scan line Y: -overshoot → DOC_H+overshoot → -overshoot
  const lineY = useTransform(progress, [0, 1, 2], [
    -overshoot,
    DOC_H + overshoot,
    -overshoot,
  ])

  // Fade in/out at the overshoot edges so it doesn't pop
  const lineOpacity = useTransform(progress, [0, 0.02, 1.98, 2], [0, 1, 1, 0])

  const play = useCallback(() => {
    if (animRef.current) animRef.current.stop()
    progress.set(0)
    animRef.current = animate(progress, 1, { duration: sweepMs / 1000, ease: 'easeInOut' })
    animRef.current.then(() => {
      setTimeout(() => {
        animRef.current = animate(progress, 2, { duration: sweepMs / 1000, ease: 'easeInOut' })
        animRef.current.then(() => onComplete?.())
      }, holdMs)
    })
  }, [progress, sweepMs, holdMs, onComplete])

  useImperativeHandle(ref, () => ({ play }), [play])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progress.set(2); onComplete?.(); return
    }
    if (autoPlay) play()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { animRef.current?.stop() }, [])

  return (
    <div className={stageClass}>
      <svg viewBox={`0 0 ${DOC_W} ${DOC_H}`} className={svgClass}>
        <defs>
          <GlowFilter id={`glow-${uid}`} />
        </defs>

        <DefaultDoc />

        {/* Scan line — extends 4% (≈6 SVG units) past each side of the doc */}
        <motion.rect
          x={-6}
          width={DOC_W + 12}
          height={1.5}
          fill={SCAN_COLOR}
          filter={`url(#glow-${uid})`}
          style={{ y: lineY, opacity: lineOpacity }}
        />
      </svg>
    </div>
  )
})
