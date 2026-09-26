import { useEffect, useRef } from "react"
import rough from "roughjs"

const strokes = {
  amber: "#f0a45c",
  hit: "#6ba3ff",
  bone: "#e8eef8",
} as const

type Kind = "exact" | "intent" | "fresh"

export function RoughDoodle({ kind }: { kind: Kind }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    svg.replaceChildren()
    const rc = rough.svg(svg)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const opts = { roughness: reduced ? 0.4 : 1.2, strokeWidth: 1.6 }

    if (kind === "exact") {
      svg.appendChild(
        rc.rectangle(28, 36, 88, 48, { ...opts, stroke: strokes.bone, fill: "rgba(236,231,220,0.04)", fillStyle: "solid" }),
      )
      svg.appendChild(rc.rectangle(48, 56, 88, 48, { ...opts, stroke: strokes.hit }))
      svg.appendChild(rc.line(72, 60, 112, 100, { ...opts, stroke: strokes.hit }))
    } else if (kind === "intent") {
      svg.appendChild(rc.circle(72, 60, 54, { ...opts, stroke: strokes.amber }))
      svg.appendChild(rc.circle(72, 60, 28, { ...opts, stroke: strokes.hit }))
      svg.appendChild(rc.line(72, 60, 98, 42, { ...opts, stroke: strokes.hit }))
    } else {
      svg.appendChild(rc.circle(52, 70, 36, { ...opts, stroke: strokes.amber, strokeLineDash: [4, 4] }))
      svg.appendChild(rc.path("M78 40 C 100 48, 108 78, 92 98", { ...opts, stroke: strokes.hit }))
      svg.appendChild(rc.line(96, 92, 110, 108, { ...opts, stroke: strokes.bone }))
    }
  }, [kind])

  return <svg ref={ref} viewBox="0 0 144 120" className="h-28 w-full" aria-hidden />
}
