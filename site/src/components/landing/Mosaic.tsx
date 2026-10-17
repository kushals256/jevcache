import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/** Slowly drifting blue pixel mosaic. Pauses offscreen; static under reduced motion. */

const PALETTE = ["#7397e0", "#83a6ee", "#94b8ff", "#a9c6ff", "#bfd4ff"]

export function Mosaic({ className, cell = 30, speed = 1 }: { className?: string; cell?: number; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let cols = 0
    let rows = 0
    let w = 0
    let h = 0
    let seeds = new Float32Array(0)
    let raf = 0
    let visible = false
    const t0 = performance.now()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = rect.width
      h = rect.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / cell)
      rows = Math.ceil(h / cell)
      seeds = new Float32Array(cols * rows)
      for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random() * Math.PI * 2
    }

    const draw = (now: number) => {
      const t = ((now - t0) / 1000) * speed
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const s = seeds[r * cols + c]!
          const v =
            Math.sin(c * 0.33 + t * 0.7 + Math.sin(r * 0.21 + t * 0.4) * 1.4) * 0.45 +
            Math.sin(r * 0.27 - t * 0.5 + c * 0.11) * 0.35 +
            Math.sin(s + t * 1.3) * 0.2
          const idx = Math.max(0, Math.min(PALETTE.length - 1, Math.floor(((v + 1) / 2) * PALETTE.length)))
          ctx.fillStyle = PALETTE[idx]!
          ctx.fillRect(c * cell, r * cell, cell, cell)
        }
      }
    }

    let lastDraw = 0
    const loop = (now: number) => {
      // ~20fps is plenty for a slow drift and keeps CPU low.
      if (visible && !document.hidden && now - lastDraw > 50) {
        lastDraw = now
        draw(now)
      }
      raf = requestAnimationFrame(loop)
    }

    resize()
    draw(performance.now())
    if (!reduce) raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => {
      resize()
      draw(performance.now())
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
  }, [cell, speed])

  return <canvas ref={ref} className={cn("block size-full", className)} aria-hidden />
}
