import { useState } from "react"
import { ArrowUpRight, Check, Copy } from "lucide-react"
import { Link } from "react-router-dom"
import { HeroField } from "@/components/landing/HeroField"
import { HeroWord } from "@/components/landing/HeroWord"
import { HowSteps } from "@/components/landing/HowSteps"
import { Mosaic } from "@/components/landing/Mosaic"
import { RequestWindow } from "@/components/landing/RequestWindow"
import { ReplayDemo } from "@/components/landing/ReplayDemo"
import { ScrubText } from "@/components/landing/ScrubText"
import { CountUp } from "@/components/CountUp"
import { SetupPromptButton } from "@/components/SetupPromptButton"
import { AGENT_PROMPT, BASE_URL_SNIPPET, INSTALL } from "@/content/agentPrompt"
import { useStats } from "@/hooks/useStats"
import { cn } from "@/lib/utils"

type CopyKind = "prompt" | "install" | "base"

const UNIT_TESTS = 89
const GITHUB = "https://github.com/kushals256/jevcache"

const FAQ = [
  {
    q: "Does it work with OpenRouter or any OpenAI-compatible API?",
    a: "Yes. Point the proxy at your upstream baseURL and your SDK at http://127.0.0.1:8080/v1. Upstream can be OpenAI, OpenRouter, or a local OpenAI-compatible server. Claude works when the client speaks that HTTP API. Chat Completions only: /v1/responses returns 501.",
  },
  {
    q: "Do I need TypeSafe Jev?",
    a: "Jev is the default same-intent judge and needs OPENROUTER_API_KEY. Or set ADJUDICATOR=kev|laya|laya-mlx|systemone for a local System One, and admits need no OpenRouter key. Without a judge ready, the proxy runs exact-only.",
  },
  {
    q: "What if the adjudicator fails?",
    a: "Fail-open. The real model still runs. A miss is always preferred over a wrong hit.",
  },
  {
    q: "Can wrong hits happen? What about streams and tools?",
    a: "Yes, wrong hits can happen. Tune the threshold, respect freshness, and read the X-Jevcache header. Final text can hit, including a later stream of that answer. Tool-call responses are never stored. TURN_CACHE is on by default for agent retries; TURN_CACHE=off restores the 1.x stream/tools bypass.",
  },
  {
    q: "Where do the numbers come from?",
    a: "Stars and npm downloads are fetched live, with a fallback if the fetch fails. 89 is the test count in this repo, not users or a benchmark. 2817ms → 423ms is one recorded run at intent 0.94. The 0.49 false-positive rate is offline word-overlap Jaccard@0.35, n=103: that is the overlap cache, not a MorrowCache rate.",
  },
]

const CONTRAST = [
  {
    title: "Exact cache misses rephrases",
    note: "Safe, but blind to wording. Every rephrase pays the model again.",
    rows: [
      { label: "Request 1", text: "explain mutexes" },
      { label: "Request 2", text: "please explain mutexes" },
    ],
    check: "Hashes differ",
    header: "X-Jevcache: MISS",
    tone: "miss" as const,
  },
  {
    title: "Word overlap serves wrong answers",
    note: "Fast and noisy. Offline Jaccard@0.35 false-positive rate: 0.49 (n=103).",
    rows: [
      { label: "Asked", text: "latest node release?" },
      { label: "Matched on shared words", text: "node release notes" },
    ],
    check: "Shared words, different question",
    header: "Wrong hit",
    tone: "miss" as const,
  },
  {
    title: "MorrowCache checks the intent",
    note: "A judge admits same intent. Freshness refuses. Unsure means miss.",
    rows: [
      { label: "Request 1", text: "Explain mutexes simply please" },
      { label: "Request 2", text: "Please explain mutexes simply" },
    ],
    check: "Same intent, 0.94",
    header: "X-Jevcache: HIT",
    tone: "hit" as const,
  },
]

const UPSTREAMS = ["OpenAI", "OpenRouter", "Cursor", "Claude*", "Local OpenAI-compat"]
const JUDGES = ["Jev (cloud)", "Kev (local)", "Laya (local)", "Laya MLX", "Any System One"]

export default function Home() {
  const { stars, downloads } = useStats()
  const [copied, setCopied] = useState<CopyKind | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const copyText = async (kind: CopyKind, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1600)
    } catch {
      /* leave the label unchanged */
    }
  }

  return (
    <main id="top" className="relative z-10 text-bone">
      <span className="sr-only" aria-live="polite">
        {copied === "prompt"
          ? "Agent setup prompt copied"
          : copied === "install"
            ? "Install command copied"
            : copied === "base"
              ? "Base URL copied"
              : ""}
      </span>

      {/* ───── Hero ───── */}
      <section className="relative -mt-[calc(3.75rem+env(safe-area-inset-top,0px))] flex min-h-[100svh] flex-col overflow-hidden">
        <HeroField className="absolute inset-0 size-full" />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-32 pt-36 text-center sm:px-6">
          <a
            href={`${GITHUB}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="rise group inline-flex items-center gap-2 border border-line-strong bg-ink/70 py-1 pl-1 pr-3 font-mono text-xs text-body no-underline backdrop-blur-sm transition-colors hover:border-hit/60"
          >
            <span className="bg-hit px-1.5 py-0.5 text-[10px] font-medium text-ink">2.0</span>
            Agent Turn Cache is live
            <ArrowUpRight className="size-3.5 text-muted transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-hit" />
          </a>

          <h1 className="h-display rise mt-12 text-[clamp(1.9rem,8.2vw,5.25rem)] leading-[1.15] [animation-delay:80ms]">
            Skip the model
            <span className="block whitespace-nowrap">when the question is</span>
            <HeroWord />
          </h1>

          <p className="rise mx-auto mt-12 max-w-xl text-pretty text-base leading-relaxed text-body [animation-delay:160ms] sm:text-lg">
            A local OpenAI-compatible proxy. When a request means the same thing, or your agent retries the same
            job, MorrowCache returns the stored final answer. Tool calls never replay.
          </p>

          <div className="rise mt-12 flex w-full flex-col items-stretch justify-center gap-3 [animation-delay:240ms] sm:w-auto sm:flex-row sm:items-center">
            <SetupPromptButton copied={copied === "prompt"} onClick={() => void copyText("prompt", AGENT_PROMPT)} />
            <button
              type="button"
              onClick={() => void copyText("install", INSTALL)}
              className="group flex h-12 min-w-0 items-center gap-3 border border-line-strong bg-ink/80 pl-4 pr-1.5 font-mono text-[13px] text-body backdrop-blur-sm transition-colors hover:border-bone/60"
              aria-label="Copy install command"
            >
              <span className="text-hit">$</span>
              <span className="truncate">{INSTALL}</span>
              <span className="grid size-9 shrink-0 place-items-center bg-elevated text-muted transition-colors group-hover:text-bone">
                {copied === "install" ? <Check className="size-4 text-hit" /> : <Copy className="size-4" />}
              </span>
            </button>
          </div>
          <p className="rise mt-6 font-mono text-xs text-muted [animation-delay:300ms]">
            No account. Keys stay in .env.{" "}
            <Link to="/agent-setup" className="text-bone underline decoration-line-strong underline-offset-4 hover:decoration-hit">
              Full guide
            </Link>
          </p>
        </div>

        <dl className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-2 border-x border-t border-line bg-ink/85 backdrop-blur-md sm:grid-cols-4">
          {[
            { label: "GitHub stars", value: stars, link: GITHUB },
            { label: "npm downloads, last 30 days", value: downloads },
            { label: "Tests in repo", value: UNIT_TESTS },
            { label: "Miss vs hit, in ms", text: "2817 → 423" },
          ].map((m, i) => (
            <div
              key={m.label}
              className={cn("border-line px-5 py-5 text-left", i % 2 === 0 && "border-r", i < 2 && "border-b sm:border-b-0", i === 1 && "sm:border-r", i === 2 && "sm:border-r")}
            >
              <dt className="font-mono text-[11px] text-muted">{m.label}</dt>
              <dd className="h-display mt-2 text-3xl tabular-nums text-bone sm:text-4xl">
                {"text" in m ? m.text : <CountUp value={m.value!} />}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ───── Problem ───── */}
      <section id="problem" className="section-anchor border-t border-line px-4 py-28 sm:px-6 sm:py-40">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">The bill</p>
          <ScrubText
            className="h-display mt-8 max-w-5xl text-[clamp(2rem,5.2vw,4.6rem)]"
            text="Your agents ask the *same* *thing* in different words, retry the *same* *job,* and pay the model every single time."
          />

          <div className="mt-20 grid gap-12 md:grid-cols-3 md:gap-6">
            {CONTRAST.map((c, i) => {
              return (
                <div key={c.title}>
                  <RequestWindow rows={c.rows} check={c.check} header={c.header} tone={c.tone} />
                  <p className="mt-8 font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-lg font-medium text-bone">{c.title}</h3>
                  <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{c.note}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───── Replay ───── */}
      <section id="benchmark" className="section-anchor border-t border-line px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Replay</p>
              <h2 className="h-display mt-6 max-w-3xl text-[clamp(2.25rem,5vw,4rem)]">
                Watch a paraphrase skip the model.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              The first ask pays the full round trip. The rephrase is judged, admitted and served from the cache.
              The model never hears about it.
            </p>
          </div>
          <div className="mt-12">
            <ReplayDemo />
          </div>
        </div>
      </section>

      {/* ───── How ───── */}
      <section id="how" className="section-anchor border-t border-line px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">How Morrow decides</p>
          <h2 className="h-display mt-6 max-w-4xl text-[clamp(2.25rem,5vw,4rem)]">
            Four checks between your agent and the bill.
          </h2>
          <div className="mt-14">
            <HowSteps />
          </div>
        </div>
      </section>

      {/* ───── Start (light) ───── */}
      <section id="agent" className="section-anchor bg-paper px-4 py-24 text-ink sm:px-6 sm:py-32">
        <div id="start" className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow eyebrow-dark text-ink/60">Get started</p>
            <h2 className="h-display mt-6 text-[clamp(2.25rem,5vw,4rem)]">Running in minutes.</h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink/70">
              Paste one prompt into Cursor, Claude Code or Codex. Your agent installs MorrowCache 2.0, writes .env,
              points baseURL at the proxy and proves a miss, then a hit. Your keys never leave your machine.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void copyText("prompt", AGENT_PROMPT)}
                className="inline-flex h-12 items-center gap-3 bg-ink px-5 text-sm font-medium text-bone transition-colors hover:bg-black"
              >
                {copied === "prompt" ? <Check className="size-4 text-hit" /> : <Copy className="size-4" />}
                {copied === "prompt" ? "Copied" : "Copy agent setup prompt"}
              </button>
              <Link
                to="/agent-setup"
                className="text-sm font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
              >
                Full agent guide →
              </Link>
            </div>
          </div>

          <ol className="overflow-hidden rounded-[10px] border border-ink/15 bg-white">
            {[
              {
                t: "Install and check",
                d: "Node 22.5+. The doctor checks your environment.",
                code: `${INSTALL} doctor`,
                kind: "install" as const,
                copy: INSTALL,
              },
              {
                t: "Point your client",
                d: "Keep your model. Change one line.",
                code: BASE_URL_SNIPPET,
                kind: "base" as const,
                copy: BASE_URL_SNIPPET,
              },
              {
                t: "Read the header",
                d: "Ask twice in different words.",
                code: "X-Jevcache: MISS   →   X-Jevcache: HIT",
              },
            ].map((s, i) => (
              <li key={s.t} className="border-b border-ink/10 p-6 last:border-0 sm:p-8">
                <div className="flex items-start gap-5">
                  <span className="grid size-7 shrink-0 place-items-center bg-ink font-mono text-xs text-hit">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.t}</p>
                    <p className="mt-1 text-sm text-ink/60">{s.d}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-ink/12 bg-white/70 px-3 py-2.5 font-mono text-[12.5px]">
                      <code className="min-w-0 truncate">{s.code}</code>
                      {s.kind && (
                        <button
                          type="button"
                          onClick={() => void copyText(s.kind, s.copy)}
                          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-ink/60 hover:text-ink"
                        >
                          {copied === s.kind ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          {copied === s.kind ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── Stack ───── */}
      <section className="border-t border-line px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Your stack</p>
          <h2 className="h-display mt-6 max-w-3xl text-[clamp(2.25rem,5vw,4rem)]">
            Sits in front of what you already use.
          </h2>
          <div className="mt-14 border border-line">
            {[
              { k: "Upstream", items: UPSTREAMS },
              { k: "Judge", items: JUDGES },
            ].map((row) => (
              <div key={row.k} className="grid border-b border-line last:border-0 md:grid-cols-[10rem_1fr]">
                <p className="border-b border-line px-5 py-4 font-mono text-xs text-muted md:border-b-0 md:border-r">
                  {row.k}
                </p>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  {row.items.map((name) => (
                    <li
                      key={name}
                      className="group relative -mb-px -mr-px overflow-hidden border-b border-r border-line px-5 py-7 text-[15px] text-bone transition-colors hover:bg-panel"
                    >
                      <span className="absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-hit transition-transform duration-300 group-hover:scale-x-100" />
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-xs text-muted">
            * Claude, when the client speaks an OpenAI-compatible HTTP API. Not a customer logo row.
          </p>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="section-anchor border-t border-line px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="h-display mt-6 text-[clamp(2.25rem,5vw,4rem)]">Straight answers.</h2>
          </div>
          <div className="border-t border-line">
            {FAQ.map((item, i) => {
              const open = openFaq === i
              return (
                <div key={item.q} className="border-b border-line">
                  <button
                    type="button"
                    className="group flex w-full items-center gap-6 py-6 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span className={cn("flex-1 text-base transition-colors sm:text-lg", open ? "text-bone" : "text-body group-hover:text-bone")}>
                      {item.q}
                    </span>
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center font-mono text-sm transition-colors",
                        open ? "border border-hit/60 text-hit" : "border border-line-strong text-muted",
                      )}
                      aria-hidden
                    >
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pb-7 pr-12 text-[15px] leading-relaxed text-body">{item.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───── Close ───── */}
      <section className="relative overflow-hidden bg-hit text-ink">
        <Mosaic className="absolute inset-0" cell={36} speed={0.7} />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-28 text-center sm:px-6 sm:py-40">
          <h2 className="h-display text-[clamp(3rem,10vw,9rem)]">
            Skip the
            <br />
            model.
          </h2>
          <p className="mt-6 max-w-md text-base text-ink/75">
            Paste the prompt. Ask twice. Read the header. Prefer a miss over a wrong hit.
          </p>
          <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => void copyText("prompt", AGENT_PROMPT)}
              className="inline-flex h-12 items-center justify-center gap-3 bg-ink px-6 text-sm font-medium text-bone transition-colors hover:bg-black"
            >
              {copied === "prompt" ? <Check className="size-4 text-hit" /> : <Copy className="size-4" />}
              {copied === "prompt" ? "Copied" : "Copy setup prompt"}
            </button>
            <a
              href={GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 border border-ink bg-hit/40 px-6 text-sm font-medium text-ink no-underline backdrop-blur-sm transition-colors hover:bg-ink hover:text-bone"
            >
              Star on GitHub
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
