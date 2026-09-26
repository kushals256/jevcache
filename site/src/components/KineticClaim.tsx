import { useEffect, useState } from "react"

const WORDS = ["same", "rephrased", "retried"]

export function KineticClaim() {
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
