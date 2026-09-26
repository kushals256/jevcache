import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const PROMPT_A = "Explain mutexes simply please"
const PROMPT_B = "Please explain mutexes simply"

type Phase = "typeA" | "miss" | "typeB" | "judge" | "hit"

const ORDER: Phase[] = ["typeA", "miss", "typeB", "judge", "hit"]

export function TraceTheater({ className }: { className?: string }) {
  const [reduce, setReduce] = useState(false)
  const [phase, setPhase] = useState<Phase>("hit")
  const [typed, setTyped] = useState(PROMPT_B)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduce(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (reduce) {
      setPhase("hit")
      setTyped(PROMPT_B)
      return
    }
    let cancelled = false
    let timer = 0
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms)
      })

    const type = async (text: string) => {
      setTyped("")
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return
        setTyped(text.slice(0, i))
        await sleep(28)
      }
    }

    const run = async () => {
      while (!cancelled) {
        setPhase("typeA")
        await type(PROMPT_A)
        if (cancelled) return
        setPhase("miss")
        await sleep(900)
        setPhase("typeB")
        await type(PROMPT_B)
        if (cancelled) return
        setPhase("judge")
        await sleep(700)
        setPhase("hit")
        await sleep(1600)
      }
    }
    void run()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [reduce])

  const chip =
    phase === "miss" || phase === "typeA"
      ? { label: "MISS · 2817ms", tone: "text-amber" }
      : phase === "judge" || phase === "typeB"
        ? { label: "adjudicating · 0.94", tone: "text-bone" }
        : { label: "HIT · 423ms · 6.7×", tone: "text-hit" }

  return (
    <div
      className={cn(
        "rounded-xl border border-hit/30 bg-ink/80 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md",
        className,
      )}
      data-phase={ORDER.includes(phase) ? phase : "hit"}
    >
      <p className="fig mb-3">Trace</p>
      <p className="min-h-[2.6rem] font-mono text-[13px] leading-snug text-bone">
        {typed}
        {!reduce && (phase === "typeA" || phase === "typeB") && (
          <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-hit" />
        )}
      </p>
      <div
        className={cn(
          "mt-3 inline-flex rounded-full border border-line-strong bg-elevated px-3 py-1 font-mono text-xs",
          chip.tone,
          phase === "hit" && "scale-105",
        )}
      >
        {chip.label}
      </div>
    </div>
  )
}
