import { useRef, useCallback, useState } from 'react'
import { useDialKit } from 'dialkit'
import { ScanDissolve } from './scan-dissolve'
import type { PlayHandle } from './shared'
import { SWEEP_MS, LINE_HOLD_MS, OVERSHOOT, BIT_COUNT } from './shared'
import { ENTER_MS, BIT_HOLD_MS, EXIT_MS, OFFSET_Y, EXIT_BLUR, MAX_DELAY } from './bits-anim'

const DEFAULT_HUE = 260

function lineColor(hue: number) {
  return `hsl(${Math.round(hue)}, 76%, 59%)`
}

export default function App() {
  const dissolveRef = useRef<PlayHandle>(null)
  const [running, setRunning] = useState(true)

  const handleToggle = useCallback(() => {
    if (running) {
      dissolveRef.current?.stop()
      setRunning(false)
    } else {
      setRunning(true)
      dissolveRef.current?.play()
    }
  }, [running])

  const params = useDialKit('Scan Demo', {
    digits: {
      enterMs:  [ENTER_MS,    100, 2000] as [number, number, number],
      holdMs:   [BIT_HOLD_MS, 0,   2000] as [number, number, number],
      exitMs:   [EXIT_MS,     100, 2000] as [number, number, number],
      delay:    [MAX_DELAY,   0,   3000] as [number, number, number],
      offsetY:  [OFFSET_Y,    2,   40]   as [number, number, number],
      exitBlur: [EXIT_BLUR,   0,   20]   as [number, number, number],
      count:    [BIT_COUNT,   4,   48]   as [number, number, number],
    },
    line: {
      sweepMs:   [SWEEP_MS,     200, 4000] as [number, number, number],
      holdMs:    [LINE_HOLD_MS, 0,   3000] as [number, number, number],
      overshoot: [OVERSHOOT,    0,   40]   as [number, number, number],
      hue:       [DEFAULT_HUE,  0,   360]  as [number, number, number],
    },
    replay: { type: 'action' as const },
  }, {
    onAction: (action) => {
      if (action === 'replay') handleToggle()
    },
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white py-10 px-8">
      <div className="w-[300px] h-[440px] flex flex-col">
        <ScanDissolve
          ref={dissolveRef}
          autoPlay
          loop={running}
          sweepMs={params.line.sweepMs}
          holdMs={params.line.holdMs}
          overshoot={params.line.overshoot}
          bitCount={Math.round(params.digits.count)}
          enterMs={params.digits.enterMs}
          bitHoldMs={params.digits.holdMs}
          exitMs={params.digits.exitMs}
          offsetY={params.digits.offsetY}
          maxDelay={params.digits.delay}
          exitBlur={params.digits.exitBlur}
          scanColor={lineColor(params.line.hue)}
        />
      </div>

      <button
        className="cursor-pointer rounded-[20px] border border-[1.5px] border-[rgba(122,67,232,0.5)] bg-transparent px-9 py-[9px] font-sans text-[13px] font-semibold tracking-[0.04em] text-[#7A43E8]"
        onClick={handleToggle}
      >
        {running ? 'Stop' : 'Play'}
      </button>
    </div>
  )
}
