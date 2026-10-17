import { useEffect, useRef } from "react"

/**
 * Hero canvas. Requests fall as pixel streams. At the cache plane a stream is
 * either admitted (blue burst, answer returns upward) or passes through to the
 * model (pink, continues down). The cursor paints blue into the grid.
 */

const PITCH = 12
const SIZE = 9
const PLANE = 0.7
const HIT_RATE = 0.58

type Stream = {
  col: number
  row: number
  speed: number
  hit: boolean
  dir: 1 | -1
  stopAt: number
}

type Burst = { col: number; row: number; t: number }

const WHITE = [243, 243, 239]
const LIME = [148, 184, 255]
const ORANGE = [255, 182, 208]
const LEVELS = 12

export function CacheField({ className, onPlane }: { className?: string; onPlane?: (y: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const onPlaneRef = useRef(onPlane)
  onPlaneRef.current = onPlane

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let cols = 0
    let rows = 0
    let plane = 0
    let white = new Float32Array(0)
    let lime = new Float32Array(0)
    let orange = new Float32Array(0)
    let cursor = new Float32Array(0)
    let mask = new Float32Array(0)
    let base: HTMLCanvasElement | null = null
    let streams: Stream[] = []
    let bursts: Burst[] = []
    let pointer: { x: number; y: number } | null = null
    let raf = 0
    let last = performance.now()
    let spawnAcc = 0
    let visible = true
    let w = 0
    let h = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = rect.width
      h = rect.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / PITCH)
      rows = Math.ceil(h / PITCH)
      plane = Math.round(rows * PLANE)
      onPlaneRef.current?.(plane * PITCH)
      const n = cols * rows
      white = new Float32Array(n)
      lime = new Float32Array(n)
      orange = new Float32Array(n)
      cursor = new Float32Array(n)
      mask = new Float32Array(n)
      // Keep the headline column quiet: elliptical hole, open at the sides.
      const narrow = w < 768
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = (c * PITCH - w / 2) / (w * (narrow ? 0.62 : 0.34))
          const dy = (r * PITCH - h * 0.42) / (h * 0.4)
          const d = Math.sqrt(dx * dx + dy * dy)
          const m = Math.min(1, Math.max(0, (d - 0.75) / 0.55))
          mask[r * cols + c] = narrow ? m * 0.55 : m
        }
      }
      // Static dim grid, drawn once.
      base = document.createElement("canvas")
      base.width = canvas.width
      base.height = canvas.height
      const b = base.getContext("2d")!
      b.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const m = mask[r * cols + c]!
          const a = (0.016 + Math.random() * 0.02) * (0.35 + m)
          b.fillStyle = `rgba(243,243,239,${a})`
          b.fillRect(c * PITCH, r * PITCH, SIZE, SIZE)
        }
      }
    }

    const spawn = () => {
      // Bias spawns toward the edges where the mask is open.
      let col = Math.floor(Math.random() * cols)
      if (Math.random() < 0.7) {
        const side = Math.random() < 0.5 ? 0 : 1
        const band = Math.max(4, Math.floor(cols * 0.3))
        col = side === 0 ? Math.floor(Math.random() * band) : cols - 1 - Math.floor(Math.random() * band)
      }
      streams.push({
        col,
        row: -Math.random() * 6,
        speed: 13 + Math.random() * 18,
        hit: Math.random() < HIT_RATE,
        dir: 1,
        stopAt: rows + 2,
      })
    }

    const paint = (arr: Float32Array, c: number, r: number, v: number) => {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return
      const i = r * cols + c
      arr[i] = Math.max(arr[i]!, v)
    }

    const step = (dt: number) => {
      spawnAcc += dt * (cols / 30)
      while (spawnAcc > 1) {
        spawnAcc -= 1
        spawn()
      }

      const next: Stream[] = []
      for (const s of streams) {
        const before = Math.floor(s.row)
        s.row += s.speed * dt * s.dir
        const after = Math.floor(s.row)
        const lo = Math.min(before, after)
        const hi = Math.max(before, after)
        let alive = true
        for (let r = lo; r <= hi; r++) {
          if (s.dir === 1 && s.hit && r >= plane) {
            bursts.push({ col: s.col, row: plane, t: 0 })
            // the stored answer travels back up, fast, in blue
            next.push({ col: s.col, row: plane - 1, speed: s.speed * 2.2, hit: true, dir: -1, stopAt: plane - 9 - Math.floor(Math.random() * 8) })
            alive = false
            break
          }
          if (s.dir === -1) paint(lime, s.col, r, 1)
          else if (r > plane) paint(orange, s.col, r, 0.9)
          else paint(white, s.col, r, 0.5)
        }
        if (!alive) continue
        if (s.dir === 1 && s.row > rows + 1) continue
        if (s.dir === -1 && s.row < s.stopAt) continue
        next.push(s)
      }
      streams = next

      const liveBursts: Burst[] = []
      for (const b of bursts) {
        b.t += dt
        const reach = Math.floor(b.t * 40)
        for (let k = -reach; k <= reach; k++) {
          const v = Math.max(0, 1 - Math.abs(k) / 5) * Math.max(0, 1 - b.t * 1.6)
          if (v <= 0) continue
          paint(lime, b.col + k, b.row, v)
          if (Math.abs(k) < 3) {
            paint(lime, b.col + k, b.row - 1, v * 0.55)
            paint(lime, b.col + k, b.row + 1, v * 0.35)
          }
        }
        if (b.t < 0.7) liveBursts.push(b)
      }
      bursts = liveBursts

      if (pointer) {
        const pc = pointer.x / PITCH
        const pr = pointer.y / PITCH
        const R = 7
        for (let r = Math.floor(pr - R); r <= Math.ceil(pr + R); r++) {
          for (let c = Math.floor(pc - R); c <= Math.ceil(pc + R); c++) {
            const d = Math.hypot(c - pc, r - pr)
            if (d > R) continue
            paint(cursor, c, r, (1 - d / R) ** 1.6 * 0.9)
          }
        }
      }

      const kw = Math.pow(0.004, dt)
      const kl = Math.pow(0.03, dt)
      const kc = Math.pow(0.0009, dt)
      for (let i = 0; i < white.length; i++) {
        white[i]! *= kw
        orange[i]! *= kw
        lime[i]! *= kl
        cursor[i]! *= kc
      }
    }

    const buckets: number[][] = Array.from({ length: LEVELS * 3 }, () => [])

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      if (base) ctx.drawImage(base, 0, 0, w, h)
      for (const b of buckets) b.length = 0
      for (let i = 0; i < white.length; i++) {
        const m = mask[i]!
        const wv = white[i]! * m
        const ov = orange[i]! * m
        const lv = Math.max(lime[i]! * m, cursor[i]! * Math.max(m, 0.35))
        const top = Math.max(wv, ov, lv)
        if (top < 0.04) continue
        const kind = lv >= top ? 0 : ov >= top ? 1 : 2
        const level = Math.min(LEVELS - 1, Math.floor(top * LEVELS))
        buckets[kind * LEVELS + level]!.push(i)
      }
      for (let k = 0; k < 3; k++) {
        const rgb = k === 0 ? LIME : k === 1 ? ORANGE : WHITE
        for (let l = 0; l < LEVELS; l++) {
          const list = buckets[k * LEVELS + l]!
          if (!list.length) continue
          ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${((l + 1) / LEVELS) * 0.8})`
          for (const i of list) {
            const c = i % cols
            const r = (i - c) / cols
            ctx.fillRect(c * PITCH, r * PITCH, SIZE, SIZE)
          }
        }
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (visible && !document.hidden) {
        step(dt)
        draw()
      }
      raf = requestAnimationFrame(loop)
    }

    resize()
    if (reduce) {
      for (let i = 0; i < 260; i++) step(1 / 30)
      draw()
    } else {
      // Pre-warm so the first frame is already alive.
      for (let i = 0; i < 90; i++) step(1 / 60)
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (reduce) {
        for (let i = 0; i < 260; i++) step(1 / 30)
        draw()
      }
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting)
    })
    io.observe(canvas)

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      pointer = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null
    }
    const onLeave = () => {
      pointer = null
    }
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true })
      document.addEventListener("pointerleave", onLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden />
}
