import { useEffect, useRef } from "react"

/**
 * Hero canvas. Mirrored columns of short dashes frame the headline. Request
 * bands flow down each column: mostly blue for answers served from the cache,
 * some white for fresh requests. On load the
 * columns light up from the outer edges inward, then settle into the flow.
 */

const ROW = 12
const DASH_H = 3
const DASH_W = 38
const COL = 50

const BLUE = [148, 184, 255]
const WHITE = [243, 243, 239]

type Band = { pos: number; len: number; speed: number; rgb: number[]; gap: number }

export function HeroField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let w = 0
    let h = 0
    let rows = 0
    let cols = 0
    let dashW = DASH_W
    let pitch = COL
    let bands: Band[][] = []
    let vis: Float32Array = new Float32Array(0)
    let raf = 0
    let visible = true
    let start = performance.now()
    let last = start

    const pick = () => {
      const r = Math.random()
      return r < 0.8 ? BLUE : WHITE
    }
    const band = (pos: number): Band => ({
      pos,
      len: 5 + Math.random() * 12,
      speed: 7 + Math.random() * 11,
      rgb: pick(),
      gap: 8 + Math.random() * 26,
    })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      rows = Math.ceil(h / ROW)
      // Columns per side: about a third of the width on wide screens, fewer on phones.
      // Phones: two thin columns in each side gutter so nothing runs behind the text.
      const narrow = w < 640
      dashW = narrow ? 4 : DASH_W
      pitch = narrow ? 6 : COL
      cols = narrow ? 2 : Math.max(2, Math.floor((w * 0.34) / COL))
      bands = Array.from({ length: cols }, () => {
        const list: Band[] = []
        let y = -Math.random() * rows
        while (y < rows) {
          list.push(band(y))
          y += 18 + Math.random() * 30
        }
        return list
      })
      // Keep an oval around the headline clear; inner columns only show near the top and bottom.
      vis = new Float32Array(cols * rows)
      const cx = w / 2
      const cy = h * 0.46
      for (let c = 0; c < cols; c++) {
        const x = c * pitch + 6 + dashW / 2
        for (let r = 0; r < rows; r++) {
          const y = r * ROW
          const d = ((x - cx) / (w * 0.37)) ** 2 + ((y - cy) / (h * 0.56)) ** 2
          vis[c * rows + r] = Math.max(0, Math.min(1, (d - 0.72) / 0.45))
        }
      }
    }

    // Each column's bands are ordered top to bottom; new ones enter above the top once there's a gap.
    const step = (dt: number) => {
      for (const list of bands) {
        for (const b of list) b.pos += b.speed * dt
        while (list.length && list[list.length - 1]!.pos - list[list.length - 1]!.len > rows) list.pop()
        const top = list[0]
        if (!top || top.pos - top.len > top.gap) list.unshift(band(-1))
      }
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (let c = 0; c < cols; c++) {
        // Intro: each column switches on from the outer edge inward, flashes, then settles.
        const delay = (c / cols) * 0.55
        const on = Math.max(0, Math.min(1, (t - delay) / 0.25))
        const flash = Math.max(0, Math.min(1, 1 - (t - delay - 0.35) / 0.9))
        const edge = 1 - (c / cols) * 0.45
        const level = new Float32Array(rows)
        const tint: (number[] | null)[] = new Array(rows).fill(null)
        for (const b of bands[c]!) {
          const head = Math.floor(b.pos)
          for (let k = 0; k < b.len; k++) {
            const r = head - k
            if (r < 0 || r >= rows) continue
            const a = k < 2 ? 1 : 0.95 * (1 - k / b.len) + 0.2
            if (a > level[r]!) {
              level[r] = a
              tint[r] = b.rgb
            }
          }
        }
        const xl = c * pitch + (w < 640 ? 2 : 6)
        const xr = w - xl - dashW
        for (let r = 0; r < rows; r++) {
          const m = vis[c * rows + r]! * on * edge
          if (m <= 0.01) continue
          const y = r * ROW + (ROW - DASH_H) / 2
          const lv = level[r]!
          const rgb = tint[r] ?? BLUE
          const a = Math.max(0.06, lv, flash * 0.45) * m
          ctx.fillStyle = lv > 0 ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})` : `rgba(${BLUE[0]},${BLUE[1]},${BLUE[2]},${a})`
          ctx.fillRect(xl, y, dashW, DASH_H)
          ctx.fillRect(xr, y, dashW, DASH_H)
        }
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (visible && !document.hidden) {
        step(dt)
        draw((now - start) / 1000)
      }
      raf = requestAnimationFrame(loop)
    }

    resize()
    if (reduce) {
      for (let i = 0; i < 120; i++) step(1 / 30)
      draw(10)
    } else {
      start = performance.now()
      last = start
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (reduce) draw(10)
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
  }, [])

  return <canvas ref={ref} className={className} aria-hidden />
}
