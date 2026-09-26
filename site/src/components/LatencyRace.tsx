import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const ROWS = [
  { name: "Always call", width: "100%", note: "correct, expensive", tone: "bg-bone/25" },
  { name: "Exact-only", width: "78%", note: "misses the paraphrase", tone: "bg-amber/70" },
  { name: "Word overlap", width: "42%", note: "FPR 0.49 · wrong hits", tone: "bg-amber" },
  { name: "MorrowCache", width: "18%", note: "2817 → 423 on paraphrase", tone: "bg-hit" },
]

export function LatencyRace() {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setOn(true)
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="space-y-4">
      {ROWS.map((row) => (
        <div key={row.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className={row.name === "MorrowCache" ? "text-hit" : "text-bone"}>{row.name}</span>
            <span className="font-mono text-xs text-muted">{row.note}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className={cn("h-full rounded-full transition-[width] duration-1000 ease-out", row.tone)}
              style={{ width: on ? row.width : "100%" }}
            />
          </div>
        </div>
      ))}
      <p className="pt-2 text-sm text-muted">
        Second lane: freshness questions refuse. Prefer a miss over a wrong hit. Where we lose: live
        Jev FPR not refreshed here, personalized secrets, tool side effects.
      </p>
    </div>
  )
}
