import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const WORDS = ["same", "rephrased", "retried"]

export function KineticClaim({ display = false }: { display?: boolean }) {
  const [i, setI] = useState(0)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduce(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), 2400)
    return () => window.clearInterval(id)
  }, [reduce])

  const word = reduce ? "same" : WORDS[i]

  if (display) {
    return (
      <>
        <span className="block">Skip the model</span>
        <span className="block">when the question is</span>
        <span className="mt-2 inline-grid text-hit">
          {WORDS.map((w) => {
            const active = w === word
            return (
              <span
                key={w}
                className={cn(
                  "relative col-start-1 row-start-1 justify-self-center whitespace-nowrap",
                  !active && "invisible",
                )}
                aria-hidden={!active}
              >
                {w}.
                {active && <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-hit" />}
              </span>
            )
          })}
        </span>
      </>
    )
  }

  return (
    <span className="font-sans text-[0.42em] font-semibold tracking-[-0.03em] text-bone sm:text-[0.38em]">
      Skip the model when the question is{" "}
      <span className="relative inline-block text-hit">
        {word}.
        <span className="absolute -bottom-1 left-0 h-px w-full bg-hit" />
      </span>
    </span>
  )
}
