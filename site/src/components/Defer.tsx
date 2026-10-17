import { type ReactNode, useEffect, useRef, useState } from "react"

/** Mount children only when near the viewport — keeps below-fold JS off the critical path. */
export function Defer({
  children,
  rootMargin = "280px 0px",
  fallback = null,
  className,
}: {
  children: ReactNode
  rootMargin?: string
  fallback?: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || ready) return
    if (typeof IntersectionObserver === "undefined") {
      setReady(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReady(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [ready, rootMargin])

  return (
    <div ref={ref} className={className}>
      {ready ? children : fallback}
    </div>
  )
}
