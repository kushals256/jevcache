import { useEffect, useRef, useState, type ReactNode } from "react"
import { Mosaic } from "@/components/landing/Mosaic"
import { cn } from "@/lib/utils"

function Win({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <div className="window relative w-full max-w-[34rem] text-left">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 font-mono text-[11px]">
        <span className="text-bone">{title}</span>
        {meta && <span className="text-muted">{meta}</span>}
      </div>
      {children}
    </div>
  )
}

function Tag({ tone, children }: { tone: "hit" | "miss" | "dim"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-[3px] px-1.5 py-0.5 font-mono text-[11px] font-medium",
        tone === "hit" && "bg-hit text-ink",
        tone === "miss" && "bg-amber text-ink",
        tone === "dim" && "border border-line-strong text-muted",
      )}
    >
      {children}
    </span>
  )
}

function ExactMock() {
  const rows = [
    { h: "9f2c…a71e", p: "explain mutexes simply please", m: true },
    { h: "41d0…07bb", p: "write a regex for iso dates", m: false },
    { h: "c3a8…5e19", p: "summarize this stack trace", m: false },
    { h: "77be…d204", p: "what does EADDRINUSE mean", m: false },
  ]
  return (
    <Win title="Exact cache" meta="sha-256 of request bytes">
      <div className="px-4 py-3 font-mono text-[12px]">
        <p className="text-muted">incoming</p>
        <p className="mt-1 text-bone">
          <span className="text-hit">›</span> explain mutexes simply please
        </p>
      </div>
      <table className="w-full border-t border-line font-mono text-[11px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.h} className={cn("border-b border-line last:border-0", r.m && "bg-hit/10")}>
              <td className={cn("py-2 pl-4 pr-2", r.m ? "text-hit" : "text-muted")}>{r.h}</td>
              <td className={cn("py-2 pr-2", r.m ? "text-bone" : "text-body/60")}>{r.p}</td>
              <td className="py-2 pr-4 text-right">{r.m ? <Tag tone="hit">match</Tag> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-[11px]">
        <span className="text-muted">upstream</span>
        <span className="text-bone">not called</span>
        <Tag tone="hit">X-Jevcache: HIT</Tag>
      </div>
    </Win>
  )
}

function IntentMock() {
  const cands = [
    { p: "Explain mutexes simply please", v: "same intent", admit: true },
    { p: "Explain semaphores simply", v: "different intent", admit: false },
    { p: "Mutex vs spinlock in Rust?", v: "different intent", admit: false },
  ]
  return (
    <Win title="Adjudicator" meta="shortlist proposes, judge admits">
      <div className="px-4 py-3 font-mono text-[12px]">
        <p className="text-muted">incoming</p>
        <p className="mt-1 text-bone">
          <span className="text-hit">›</span> Please explain mutexes simply
        </p>
      </div>
      <div className="border-t border-line px-4 py-2 font-mono text-[11px] text-muted">
        shortlist
      </div>
      <ul className="font-mono text-[11px]">
        {cands.map((c) => (
          <li
            key={c.p}
            className={cn(
              "flex items-center justify-between gap-3 border-t border-line px-4 py-2.5",
              c.admit && "bg-hit/10",
            )}
          >
            <span className={c.admit ? "text-bone" : "text-body/60"}>{c.p}</span>
            {c.admit ? <Tag tone="hit">admit 0.94</Tag> : <Tag tone="dim">reject</Tag>}
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-2.5 font-mono text-[11px] text-muted">
        similarity only proposes. it never admits alone.
      </div>
    </Win>
  )
}

function JobMock() {
  return (
    <Win title="Agent Turn Cache" meta="X-Jevcache-Job-Id: refactor-17">
      <div className="grid grid-cols-2 divide-x divide-line font-mono text-[11px]">
        {[
          { t: "attempt 1", ask: "add tests for parser.ts", res: <Tag tone="miss">miss, model called</Tag> },
          { t: "attempt 2, a retry", ask: "write tests for parser.ts", res: <Tag tone="hit">hit, final text</Tag> },
        ].map((col) => (
          <div key={col.t} className="px-4 py-3">
            <p className="text-muted">{col.t}</p>
            <div className="mt-3 space-y-1.5">
              <p className="border border-line px-2 py-1.5 text-body/70">system: repo context</p>
              <p className="border border-line px-2 py-1.5 text-body/70">user: earlier turns</p>
              <p className="border border-hit/40 px-2 py-1.5 text-bone">user: {col.ask}</p>
            </div>
            <div className="mt-3">{col.res}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 border-t border-line font-mono text-[11px]">
        <div className="border-r border-line px-4 py-2.5">
          <p className="text-muted">prior</p>
          <p className="mt-0.5 text-hit">identical</p>
        </div>
        <div className="border-r border-line px-4 py-2.5">
          <p className="text-muted">latest ask</p>
          <p className="mt-0.5 text-hit">same intent</p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-muted">stream</p>
          <p className="mt-0.5 text-hit">replayed</p>
        </div>
      </div>
    </Win>
  )
}

function RefuseMock() {
  const rows = [
    { ask: "what's the latest node release?", why: "freshness question, refused", tag: <Tag tone="miss">refuse</Tag> },
    { ask: "response carries tool_calls", why: "never stored, the tool step still runs", tag: <Tag tone="miss">miss</Tag> },
    { ask: "adjudicator unreachable", why: "fails open, the real model answers", tag: <Tag tone="miss">miss</Tag> },
    { ask: "please explain mutexes simply", why: "same intent, admitted", tag: <Tag tone="hit">hit</Tag> },
  ]
  return (
    <Win title="Decision log" meta="prefer a miss over a wrong hit">
      <ul className="font-mono text-[11px]">
        {rows.map((r) => (
          <li key={r.ask} className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
            <span>
              <span className="block text-bone">{r.ask}</span>
              <span className="mt-0.5 block text-muted">{r.why}</span>
            </span>
            {r.tag}
          </li>
        ))}
      </ul>
    </Win>
  )
}

const STEPS = [
  {
    key: "EXACT",
    title: "The exact repeat",
    body: "Same request bytes, same stored completion. The cheapest hit there is, and the model is never called.",
    points: ["Hash the request", "Serve the stored completion", "Upstream never sees it"],
    mock: <ExactMock />,
  },
  {
    key: "INTENT",
    title: "Same question, new words",
    body: "A shortlist proposes candidates. An adjudicator decides whether they really mean the same thing. Similarity never admits on its own.",
    points: ["Shortlist proposes", "Judge admits or rejects", "Cloud Jev or a local judge"],
    mock: <IntentMock />,
  },
  {
    key: "JOB",
    title: "The agent retries the job",
    body: "Agent Turn Cache: same prior turns plus a same-intent latest ask returns the stored final text, including a later stream of that answer.",
    points: ["Same prior", "Same-intent latest ask", "Final text, streamed or not"],
    mock: <JobMock />,
  },
  {
    key: "REFUSE",
    title: "Knows when to say no",
    body: "Freshness questions refuse. Tool-call responses are never stored, so tool steps still run. If the judge is down, it fails open.",
    points: ["Refuse stale answers", "Never replay tool calls", "Fail open, always"],
    mock: <RefuseMock />,
  },
]

export function HowSteps() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const nodes = refs.current.filter((n): n is HTMLDivElement => n !== null)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(nodes.indexOf(e.target as HTMLDivElement))
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    for (const n of nodes) io.observe(n)
    return () => io.disconnect()
  }, [])

  const go = (i: number) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    refs.current[i]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-12">
      <div className="hidden lg:block">
        <ol className="sticky top-28 border border-line">
          {STEPS.map((s, i) => (
            <li key={s.key} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => go(i)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors",
                  active === i ? "bg-elevated text-bone" : "text-muted hover:text-body",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center text-[11px]",
                    active === i ? "bg-hit text-ink" : "border border-line-strong",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.key.charAt(0) + s.key.slice(1).toLowerCase()}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="border border-line">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            ref={(n) => {
              refs.current[i] = n
            }}
            className="grid border-b border-line last:border-0 xl:grid-cols-[1.35fr_1fr]"
          >
            <div className="relative flex min-h-[24rem] items-center justify-center overflow-hidden bg-hit px-4 py-10 sm:px-8 sm:py-14">
              <Mosaic className="absolute inset-0" speed={0.8 + i * 0.1} />
              <div className="relative flex w-full justify-center">{s.mock}</div>
            </div>
            <div className="flex flex-col justify-center bg-ink p-6 sm:p-10">
              <h3 className="h-display text-[clamp(1.75rem,2.6vw,2.4rem)] text-bone">{s.title}</h3>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-body">{s.body}</p>
              <ul className="mt-8 space-y-3">
                {s.points.map((p, j) => (
                  <li key={p} className="flex gap-4 text-sm text-bone">
                    <span className="font-mono text-xs text-muted">{String(j + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
