import { useEffect, useRef } from "react"

/**
 * Footer backdrop: grainy columns at stepped heights, brightest at the bottom
 * edge and fading to black upward. Bands drift slowly; the grain flickers like film.
 */

const CELL = 1 // one grain dot per CSS pixel
const FPS = 14
const TINT = [196, 212, 255] // a pale version of the site blue

type Column = { cuts: number[]; levels: number[]; speed: number; phase: number }

export function GrainField({ className, even = false }: { className?: string; even?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let gw = 0
    let gh = 0
    let colW = 0
    let cols: Column[] = []
    let img: ImageData | null = null
    let raf = 0
    let visible = false
    let lastDraw = 0

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      gw = Math.max(1, Math.ceil(w / CELL))
      gh = Math.max(1, Math.ceil(h / CELL))
      canvas.width = gw
      canvas.height = gh
      img = ctx.createImageData(gw, gh)
      const count = Math.max(6, Math.round(w / 110))
      colW = gw / count
      cols = Array.from({ length: count }, () => {
        // Three or four stacked bands per column, each with its own brightness.
        const n = 3 + Math.floor(Math.random() * 2)
        const cuts = Array.from({ length: n - 1 }, () => 0.15 + Math.random() * 0.7).sort((a, b) => a - b)
        const levels = Array.from({ length: n }, () => 0.45 + Math.random() * 0.55)
        return { cuts, levels, speed: 0.02 + Math.random() * 0.05, phase: Math.random() * Math.PI * 2 }
      })
    }

    const draw = (t: number) => {
      if (!img) return
      const d = img.data
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c]!
        const x0 = Math.floor(c * colW)
        const x1 = Math.floor((c + 1) * colW)
        const drift = Math.sin(t * col.speed * 2 * Math.PI + col.phase) * 0.06
        const cuts = col.cuts.map((k) => k + drift)
        for (let y = 0; y < gh; y++) {
          const v = y / gh
          // Which band is this row in, and how far down that band are we?
          let b = 0
          while (b < cuts.length && v > cuts[b]!) b++
          const top = b === 0 ? 0 : cuts[b - 1]!
          const bottom = b === cuts.length ? 1 : cuts[b]!
          const within = (v - top) / Math.max(0.0001, bottom - top)
          const band = col.levels[b]! * (1 - within * 0.6)
          // even: fill the whole height (used inside lettering); otherwise dark at the top, bright at the bottom edge
          const fade = even ? 0.75 + v * 0.25 : Math.min(1, Math.pow(v, 0.9) * 1.25)
          const p = band * fade
          for (let x = x0; x < x1; x++) {
            const i = (y * gw + x) * 4
            const on = Math.random() < p
            const a = on ? 255 * (0.45 + Math.random() * 0.4) * Math.min(1, p + 0.15) : 0
            d[i] = TINT[0]!
            d[i + 1] = TINT[1]!
            d[i + 2] = TINT[2]!
            d[i + 3] = a
          }
        }
      }
      ctx.putImageData(img, 0, 0)
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden || now - lastDraw < 1000 / FPS) return
      lastDraw = now
      draw(now / 1000)
    }

    resize()
    draw(0)
    if (!reduce) raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => {
      resize()
      draw(performance.now() / 1000)
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting)
    })
    io.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [even])

  return <canvas ref={ref} className={className} style={{ imageRendering: "pixelated" }} aria-hidden />
}
