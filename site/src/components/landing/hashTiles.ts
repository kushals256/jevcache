/** Shared Agnost-style hash tile kernel — deterministic, static. */

export const TONE = {
  dim: "rgba(107, 163, 255, 0.1)",
  mid: "rgba(107, 163, 255, 0.38)",
  accent: "#6ba3ff",
  bright: "#eef3fb",
} as const

export type Tone = keyof typeof TONE

export type HashColumn = {
  cells: Tone[]
  height: number
}

export function n(col: number, row: number, salt = 0) {
  const x = Math.sin(col * 127.1 + row * 311.7 + salt * 74.3) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Lit ticks denser on outer columns + top/bottom. Inner columns stay
 * shorter and quieter so openings read like the reference.
 */
function toneAt(col: number, row: number, cols: number, rows: number): Tone {
  const edge = 1 - col / Math.max(cols - 1, 1)
  const fromTop = row / Math.max(rows - 1, 1)
  const fromMid = Math.abs(fromTop - 0.5) * 2
  const corner = Math.pow(edge, 0.9) * (0.22 + 0.78 * fromMid)
  const r = n(col, row)
  const band = n(col, Math.floor(row / 3), 3)

  if (corner < 0.1) {
    if (r > 0.96) return "mid"
    return "dim"
  }

  if (r > 0.97 - corner * 0.06 && band > 0.4) return "bright"
  if (r > 0.8 - corner * 0.3) return "accent"
  if (r > 0.62 - corner * 0.26) return "mid"
  return "dim"
}

function buildColumn(col: number, cols: number, rows: number): Tone[] {
  const cells: Tone[] = []
  for (let row = 0; row < rows; row++) {
    let t = toneAt(col, row, cols, rows)
    if (row > 0 && cells[row - 1] === "accent" && n(col, row, 5) > 0.32 && t === "dim") {
      t = n(col, row, 7) > 0.45 ? "accent" : "mid"
    }
    if (row > 1 && cells[row - 1] === "accent" && cells[row - 2] === "accent" && t === "accent") {
      if (n(col, row, 8) > 0.55) t = "dim"
    }
    cells.push(t)
  }
  return cells
}

/** Outer columns nearly full height; inner ones shorten into the center opening. */
function columnHeightPct(col: number, cols: number, minPct: number, spanPct: number) {
  const edge = 1 - col / Math.max(cols - 1, 1)
  return minPct + edge * spanPct
}

export function buildHashColumns(opts: {
  cols: number
  rows: number
  minHeightPct?: number
  heightSpanPct?: number
  /** Extra salt so rails don’t clone the hero pattern 1:1. */
  salt?: number
}): HashColumn[] {
  const { cols, rows, minHeightPct = 48, heightSpanPct = 52, salt = 0 } = opts
  return Array.from({ length: cols }, (_, col) => {
    const cells = buildColumn(col + salt * 17, cols, rows)
    return {
      cells,
      height: columnHeightPct(col, cols, minHeightPct, heightSpanPct),
    }
  })
}

export function colVisibility(depth: number, total: number) {
  const t = Math.max(total - 1, 1)
  const ratio = depth / t
  if (ratio >= 0.72) return "hidden lg:flex lg:flex-col"
  if (ratio >= 0.5) return "hidden md:flex md:flex-col"
  if (ratio >= 0.28) return "hidden sm:flex sm:flex-col"
  return "flex flex-col"
}
