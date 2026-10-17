import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { BorderBeam } from "border-beam"
import { SetupPromptButton } from "@/components/SetupPromptButton"
import { Button } from "@/components/ui/button"
import { TraceTheater } from "@/components/TraceTheater"
import { AGENT_PROMPT, INSTALL } from "@/content/agentPrompt"

const CASES = [
  {
    n: "01",
    title: "Agent retries",
    body: "Coding agents retry the same job and rephrase until the answer looks done. Final text for that job can hit. Tool-call steps still run.",
    receipt: "same job → final text HIT · tool_calls not stored",
  },
  {
    n: "02",
    title: "Doc / support paraphrases",
    body: "Users ask the same FAQ with different words. Exact caches miss. Intent admit reuses the good answer.",
    receipt: "FAQ cluster · one completion · many wordings",
  },
  {
    n: "03",
    title: "Local Kev / Laya adjudicator",
    body: "Run adjudication locally when you don’t want every decision to leave the machine.",
    receipt: "local judge · cloud or local completions",
  },
  {
    n: "04",
    title: "Freshness-sensitive “latest”",
    body: "When the question depends on time, refuse the stale hit and call the model. Prefer miss over wrong.",
    receipt: '"what\'s the latest" · refuse → miss',
  },
]

export default function UseCases() {
  const [copied, setCopied] = useState<"install" | "prompt" | null>(null)

  const copy = async (kind: "install" | "prompt", text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="relative z-10 text-bone">
      <span className="sr-only" aria-live="polite">
        {copied === "install"
          ? "Install command copied"
          : copied === "prompt"
            ? "Agent setup prompt copied"
            : ""}
      </span>

      <section className="px-6 pb-12 pt-14 sm:pt-20">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">Use cases</p>
          <h1 className="font-pixel-square mt-4 max-w-3xl text-balance text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.04em]">
            Where MorrowCache earns its keep
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-body sm:text-lg">
            Same product, different loops. Each case has a receipt — and a place we don’t win.
          </p>
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="mx-auto max-w-5xl">
          <BorderBeam
            borderRadius={16}
            brightness={1.3}
            className="max-w-lg"
            colorVariant="ocean"
            hueRange={16}
            size="md"
            staticColors
            strength={0.9}
            theme="dark"
          >
            <TraceTheater className="w-full border-0 bg-panel shadow-none" />
          </BorderBeam>
        </div>
      </section>

      <section className="px-6 py-8 sm:py-12">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
          {CASES.map((c) => (
            <article
              key={c.n}
              className="flex flex-col rounded-2xl border border-line bg-panel/40 p-6 transition-colors hover:border-hit/30 hover:bg-panel/60"
            >
              <span className="font-mono text-xs tabular-nums text-hit">{c.n}</span>
              <h2 className="font-pixel-square mt-3 text-[clamp(1.2rem,2vw,1.55rem)] leading-[1.1] tracking-[-0.03em]">
                {c.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-body">{c.body}</p>
              <p className="mt-5 border-t border-line pt-4 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                receipt · {c.receipt}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-hit/25 bg-panel/50 p-6 sm:p-8">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-hit">Who this is for</p>
            <p className="mt-3 text-sm leading-relaxed text-body sm:text-base">
              Solo builders, agent-assisted engineers, cost-conscious apps on OpenAI-compatible APIs.
            </p>
          </div>
          <div className="rounded-2xl border border-amber/25 bg-panel/40 p-6 sm:p-8">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-amber">Where we don’t win</p>
            <p className="mt-3 text-sm leading-relaxed text-body sm:text-base">
              Replaying tool calls, personalized secrets, live answers that must stay fresh, sites you don’t control.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-5xl flex-wrap gap-3">
          <SetupPromptButton
            copied={copied === "prompt"}
            label="Copy agent setup"
            onClick={() => void copy("prompt", AGENT_PROMPT)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void copy("install", INSTALL)}
            className="h-11 rounded-full border-border/40 bg-panel px-6 text-bone hover:bg-elevated"
          >
            {copied === "install" ? "Copied" : "Copy install"}
          </Button>
          <Link
            to="/compare"
            className="inline-flex h-11 items-center gap-1.5 px-2 text-sm text-hit no-underline hover:underline"
          >
            Compare approaches
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </main>
  )
}
