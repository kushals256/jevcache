import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * A statement that lights up word by word as it scrolls through the viewport.
 * Wrap a word in *asterisks* to light it in blue instead of bone.
 */
export function ScrubText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const words = text.split(" ")
  const [lit, setLit] = useState(words.length)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 when the block's top hits 85% of the viewport, 1 when its bottom reaches 45%.
      const start = vh * 0.85
      const end = vh * 0.45
      const p = (start - rect.top) / (start - end + rect.height)
      setLit(Math.round(Math.max(0, Math.min(1, p)) * words.length))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [words.length])

  return (
    <p ref={ref} className={className}>
      {words.map((raw, i) => {
        const accent = raw.startsWith("*")
        const word = raw.replace(/\*/g, "")
        const on = i < lit
        return (
          <span
            key={i}
            className={cn(
              "transition-colors duration-300",
              on ? (accent ? "text-hit" : "text-bone") : "text-bone/[0.13]",
            )}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        )
      })}
    </p>
  )
}
