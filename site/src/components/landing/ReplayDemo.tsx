import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Mosaic } from "@/components/landing/Mosaic"
import { cn } from "@/lib/utils"

/**
 * Real-time replay of the one recorded pair: 2817ms miss, then a paraphrase
 * admitted at intent 0.94 and served in 423ms. Timers run at true speed.
 */

const PROMPT_A = "Explain mutexes simply please"
const PROMPT_B = "Please explain mutexes simply"
const ANSWER =
  "A mutex is a lock around shared data. One thread takes it, does its work, then releases it so the next thread can go. Nobody writes at the same time, so nothing gets corrupted."
const MISS_MS = 2817
const HIT_MS = 423

type Req = {
  typed: string
  status: "idle" | "typing" | "running" | "done"
  ms: number
  answer: string
  steps: string[]
}

const empty = (): Req => ({ typed: "", status: "idle", ms: 0, answer: "", steps: [] })

function useReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])
  return reduce
}

export function ReplayDemo() {
  const root = useRef<HTMLDivElement>(null)
  const run = useRef(0)
  const reduce = useReducedMotion()
  const [a, setA] = useState<Req>(empty)
  const [b, setB] = useState<Req>(empty)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [started, setStarted] = useState(false)

  const play = useCallback(async () => {
    const id = ++run.current
    const alive = () => run.current === id
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
    const frame = () => new Promise<number>((r) => requestAnimationFrame(r))

    setStarted(true)
    setFinished(false)
    setScore(0)
    setA(empty())
    setB(empty())

    const type = async (set: typeof setA, text: string) => {
      set((s) => ({ ...s, status: "typing" }))
      for (let i = 1; i <= text.length; i++) {
        if (!alive()) return
        set((s) => ({ ...s, typed: text.slice(0, i) }))
        await sleep(24)
      }
    }

    const timed = async (
      set: typeof setA,
      total: number,
      onTick: (p: number) => Partial<Req>,
    ) => {
      set((s) => ({ ...s, status: "running" }))
      const t0 = performance.now()
      for (;;) {
        if (!alive()) return
        const now = await frame()
        const ms = Math.min(total, now - t0)
        const patch = onTick(ms / total)
        set((s) => ({ ...s, ms: Math.round(ms), ...patch }))
        if (ms >= total) break
      }
      set((s) => ({ ...s, status: "done" }))
    }

    await type(setA, PROMPT_A)
    if (!alive()) return
    await sleep(250)
    setA((s) => ({ ...s, steps: ["exact lookup: no match", "shortlist: empty", "sent to the upstream model"] }))
    // The answer streams in over the second half of the wait, like a real completion.
    await timed(setA, MISS_MS, (p) => ({
      answer: p < 0.45 ? "" : ANSWER.slice(0, Math.round(((p - 0.45) / 0.55) * ANSWER.length)),
    }))
    if (!alive()) return
    setA((s) => ({ ...s, steps: [...s.steps, "final text stored"] }))
    await sleep(700)

    await type(setB, PROMPT_B)
    if (!alive()) return
    await sleep(250)
    await timed(setB, HIT_MS, (p) => {
      const steps = ["exact lookup: no match", "shortlist: 1 candidate proposed"]
      if (p > 0.35) steps.push("adjudicator: same intent, admitted")
      if (p > 0.8) steps.push("served the stored final text")
      setScore(Math.min(0.94, p < 0.35 ? 0 : ((p - 0.35) / 0.4) * 0.94))
      return { steps, answer: p > 0.8 ? ANSWER : "" }
    })
    if (!alive()) return
    setScore(0.94)
    setFinished(true)
  }, [])

  // Final state for reduced motion; otherwise start once the panel is in view.
  useEffect(() => {
    if (reduce) {
      run.current++
      setStarted(true)
      setA({ typed: PROMPT_A, status: "done", ms: MISS_MS, answer: ANSWER, steps: ["exact lookup: no match", "shortlist: empty", "sent to the upstream model", "final text stored"] })
      setB({ typed: PROMPT_B, status: "done", ms: HIT_MS, answer: ANSWER, steps: ["exact lookup: no match", "shortlist: 1 candidate proposed", "adjudicator: same intent, admitted", "served the stored final text"] })
      setScore(0.94)
      setFinished(true)
      return
    }
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          io.disconnect()
          void play()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      run.current++
    }
  }, [play, reduce])

  return (
    <div ref={root} className="grid gap-px border border-line bg-line lg:grid-cols-[1.45fr_1fr]">
      <div className="relative overflow-hidden bg-hit px-4 py-10 sm:px-10 sm:py-14">
        <Mosaic className="absolute inset-0" />
        <div className="window relative mx-auto max-w-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-[11px] text-muted">
            <span>POST 127.0.0.1:8080/v1/chat/completions</span>
            <span className="hidden sm:inline">recorded run</span>
          </div>
          <div className="divide-y divide-line">
            <RequestBlock n="01" req={a} kind="miss" total={MISS_MS} />
            <RequestBlock n="02" req={b} kind="hit" total={HIT_MS} score={score} />
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-10 bg-ink p-6 sm:p-10">
        <div>
          <p className="font-mono text-xs text-muted">Wall-clock, same answer</p>
          <div className="mt-6 space-y-6">
            <Bar label="Miss, model called" ms={a.ms} total={MISS_MS} tone="bg-amber" text="text-amber" />
            <Bar label="Hit, model skipped" ms={b.ms} total={MISS_MS} tone="bg-hit" text="text-hit" />
          </div>
        </div>
        <div>
          <p
            className={cn(
              "h-display text-[clamp(4.5rem,10vw,8rem)] text-hit transition-[opacity,transform] duration-700",
              finished ? "opacity-100" : "translate-y-2 opacity-15",
            )}
          >
            6.7×
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            One recorded paraphrase pair at intent 0.94. Real timings, played back at real speed. Not a benchmark,
            not an SLA.
          </p>
          <button
            type="button"
            onClick={() => void play()}
            disabled={!started || (!finished && !reduce)}
            className="btn-line mt-6 disabled:cursor-default disabled:opacity-40"
          >
            <RotateCcw className="size-4" />
            Replay
          </button>
        </div>
      </div>
    </div>
  )
}

function Bar({ label, ms, total, tone, text }: { label: string; ms: number; total: number; tone: string; text: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-xs">
        <span className="text-body">{label}</span>
        <span className={cn("tabular-nums", text)}>{ms}ms</span>
      </div>
      <div className="mt-2 h-3 bg-elevated">
        <div className={cn("h-full", tone)} style={{ width: `${(ms / total) * 100}%` }} />
      </div>
    </div>
  )
}

function RequestBlock({
  n,
  req,
  kind,
  total,
  score,
}: {
  n: string
  req: Req
  kind: "hit" | "miss"
  total: number
  score?: number
}) {
  const hit = kind === "hit"
  const running = req.status === "running"
  const done = req.status === "done"
  return (
    <div className={cn("px-4 py-4 transition-opacity sm:px-5", req.status === "idle" && "opacity-35")}>
      <div className="flex items-center gap-3 font-mono text-[11px] text-muted">
        <span>{n}</span>
        <span className="h-px flex-1 bg-line" />
        {done ? (
          <span className={cn("rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium text-ink", hit ? "bg-hit" : "bg-amber")}>
            X-Jevcache: {hit ? "HIT" : "MISS"}
          </span>
        ) : running ? (
          <span className="tabular-nums text-bone">{req.ms}ms</span>
        ) : (
          <span>waiting</span>
        )}
      </div>
      <p className="mt-3 min-h-5 font-mono text-[13px] text-bone">
        <span className="text-hit">›</span> {req.typed}
        {req.status === "typing" && <span className="cursor-block" />}
      </p>
      <div className="relative mt-3 h-1 overflow-hidden bg-elevated">
        <div
          className={cn("absolute inset-y-0 left-0", hit ? "bg-hit" : "bg-amber")}
          style={{ width: `${(req.ms / total) * 100}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1 font-mono text-[11px] leading-relaxed">
        {req.steps.map((s) => (
          <li key={s} className={cn(s.startsWith("adjudicator") ? "text-hit" : "text-muted")}>
            {s.startsWith("adjudicator") ? `${s} at ${(score ?? 0).toFixed(2)}` : s}
          </li>
        ))}
      </ul>
      <p className="mt-3 min-h-[3.75rem] text-[13px] leading-relaxed text-body">{req.answer}</p>
    </div>
  )
}
