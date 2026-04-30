// ─── Tweakable constants ─────────────────────────────────────────────────────
export const DOC_W        = 160   // SVG viewBox width  (user units)
export const DOC_H        = 200   // SVG viewBox height (user units)
export const OVERSHOOT    = 8     // SVG units the line travels past the doc edges
export const SWEEP_MS     = 2200  // each sweep direction (ms)
export const LINE_HOLD_MS = 80    // pause at bottom before sweeping back (ms)
export const BITS_IN_MS   = 1000  // bits fade-in duration (ms)
export const BITS_HOLD_MS = 700   // bits hold duration (ms)
export const BITS_OUT_MS  = 1000  // bits fade-out duration (ms)
export const BIT_COUNT    = 20    // number of binary digits
export const SCAN_COLOR   = '#7A43E8'
export const BIT_COLOR    = '#7A43E8'

// ─── Shared handle type ──────────────────────────────────────────────────────
export interface PlayHandle {
  play: () => void
  stop: () => void
}

// ─── Bit seed ────────────────────────────────────────────────────────────────
export interface BitSeed {
  x:         number   // SVG user-unit x
  y:         number   // SVG user-unit y
  opacity:   number
  value:     '0' | '1'
  fontSize:  number   // SVG user-units: 7 | 9 | 12
}

// ── Grid layout (honeycomb pattern) ──────────────────────────────────────────
// Even rows: 4 columns, odd rows: 3 columns (offset by half column width).
// This creates visual rhythm without feeling like a table.
const EVEN_XS = [14, 57, 101, 144]
const ODD_XS  = [35, 79, 123]
const ROW_YS  = [32, 62, 92, 122, 152, 178]

const GRID = ROW_YS.flatMap((y, ri) =>
  (ri % 2 === 0 ? EVEN_XS : ODD_XS).map(x => ({ x, y }))
) // 21 positions total

// Three size tiers: [fontSize, probability weight, opacityMin, opacityMax]
const TIERS: Array<[number, number, number, number]> = [
  [12, 0.20, 0.72, 0.88],  // large — few, prominent
  [ 9, 0.50, 0.50, 0.72],  // medium — most common
  [ 7, 0.30, 0.28, 0.50],  // small — subtle texture
]

function pickTier(): (typeof TIERS)[number] {
  const r = Math.random(); let sum = 0
  for (const t of TIERS) { sum += t[1]; if (r < sum) return t }
  return TIERS[TIERS.length - 1]
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function makeBits(count: number): BitSeed[] {
  // Build enough positions by cycling the grid (each cycle adds more jitter).
  // The first 21 positions are nicely structured; beyond that they overlap
  // gently with extra spread, which is fine for counts the UI allows.
  const positions: { x: number; y: number }[] = []
  for (let cycle = 0; positions.length < count; cycle++) {
    const jitter = 6 + cycle * 5   // more spread on repeat cycles
    shuffle([...GRID]).forEach(p => {
      positions.push({
        x: p.x + (Math.random() - 0.5) * jitter,
        y: p.y + (Math.random() - 0.5) * jitter,
      })
    })
  }

  return positions.slice(0, count).map(({ x, y }) => {
    const [fontSize, , opMin, opMax] = pickTier()
    return {
      x: Math.max(10, Math.min(150, x)),   // clamp inside doc bounds
      y: Math.max(18, Math.min(182, y)),
      opacity:  opMin + Math.random() * (opMax - opMin),
      value:    (Math.random() < 0.5 ? '0' : '1') as '0' | '1',
      fontSize,
    }
  })
}

// ─── Invoice mockup (src/assets/Invoice mockup.svg, scaled to fill DOC_W×DOC_H)
export function DefaultDoc() {
  return (
    <svg x="0" y="0" width={DOC_W} height={DOC_H}
      viewBox="0 0 90 112" preserveAspectRatio="xMidYMid meet">
      <rect width="89.5238" height="111.359" rx="8.73403" fill="#E8E6E3"/>
      <rect x="4.71289" y="7.54395" width="31.3463" height="8" rx="4" fill="#8F8C88"/>
      <rect x="4.71289" y="27.5898" width="31.3463" height="4" rx="2" fill="#8F8C88"/>
      <rect x="4.71289" y="35.5898" width="31.3463" height="4" rx="2" fill="#8F8C88"/>
      <rect x="4.38574" y="52.0449" width="20.6687" height="4" rx="2" fill="#8F8C88"/>
      <rect x="77.4624" y="52.0449" width="5.72693" height="4" rx="2" fill="#8F8C88"/>
      <rect x="4.38574" y="60.0449" width="16.3269" height="4" rx="2" fill="#8F8C88"/>
      <rect x="77.4624" y="60.0449" width="5.72693" height="4" rx="2" fill="#8F8C88"/>
      <rect x="4.38574" y="68.0449" width="24.7753" height="4" rx="2" fill="#8F8C88"/>
      <rect x="77.4624" y="68.0449" width="5.72693" height="4" rx="2" fill="#8F8C88"/>
      <rect x="4.38574" y="76.0449" width="30.6418" height="4" rx="2" fill="#8F8C88"/>
      <rect x="77.4624" y="76.0449" width="5.72693" height="4" rx="2" fill="#8F8C88"/>
      <rect x="51.8433" y="94.6748" width="31.3463" height="8" rx="4" fill="#8F8C88"/>
      <rect x="71.1895" y="7.54395" width="12" height="12" rx="6" fill="#8F8C88"/>
    </svg>
  )
}

// ─── SVG glow filter (inline, unique ID per instance via prop) ───────────────
// Filter bounds sized for stdDeviation=3 (spread ≈9 SVG units; element height=1.5).
// y offset: -9/1.5 = -600%, total height: (9+1.5+9)/1.5 = 1300%
export function GlowFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-8%" y="-600%" width="116%" height="1300%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}

// ─── Shared stage + SVG class names ─────────────────────────────────────────
export const stageClass = 'flex-1 flex items-center justify-center relative'
export const svgClass   = 'w-[72%] block overflow-visible'
