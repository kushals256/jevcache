import { useEffect, useRef, useState } from "react"

type Props = {
  value: number
  decimals?: number
  suffix?: string
  durationMs?: number
  className?: string
}

/** Lightweight count-up — no motion dependency. */
export function CountUp({ value, decimals = 0, suffix = "", durationMs = 900, className }: Props) {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)

  useEffect(() => {
    shownRef.current = shown
  }, [shown])

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      shownRef.current = value
      setShown(value)
      return
    }

    let frame = 0
    const start = performance.now()
    const from = shownRef.current
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (value - from) * eased
      shownRef.current = next
      setShown(next)
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        shownRef.current = value
        setShown(value)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  const text =
    decimals > 0 ? shown.toFixed(decimals) : Math.round(shown).toLocaleString("en-US")

  return (
    <span className={className}>
      {text}
      {suffix}
    </span>
  )
}
