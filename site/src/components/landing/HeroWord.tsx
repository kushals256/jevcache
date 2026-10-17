import { useEffect, useState } from "react"

const WORDS = ["rephrased", "retried", "same"]

/** Types each word out, holds, deletes it, then moves to the next. */
export function HeroWord() {
  const [i, setI] = useState(0)
  const [len, setLen] = useState(WORDS[0]!.length)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const word = WORDS[i]!
    if (reduce) {
      const t = window.setTimeout(() => setI((n) => (n + 1) % WORDS.length), 2600)
      setLen(WORDS[i]!.length)
      return () => window.clearTimeout(t)
    }
    let t: number
    if (!deleting && len === word.length) t = window.setTimeout(() => setDeleting(true), 2000)
    else if (deleting && len === 0) {
      t = window.setTimeout(() => {
        setDeleting(false)
        setI((n) => (n + 1) % WORDS.length)
      }, 220)
    } else t = window.setTimeout(() => setLen((l) => l + (deleting ? -1 : 1)), deleting ? 45 : 85)
    return () => window.clearTimeout(t)
  }, [i, len, deleting])

  return (
    <>
      <span className="sr-only">rephrased, retried, or the same.</span>
      <span aria-hidden className="text-hit">
        {WORDS[i]!.slice(0, len)}
        <span className="cursor-block" />
      </span>
    </>
  )
}
