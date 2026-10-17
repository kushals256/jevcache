import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight, Check, Copy } from "lucide-react"
import { Mosaic } from "@/components/landing/Mosaic"
import { SetupPromptButton } from "@/components/SetupPromptButton"
import { AGENT_PROMPT, INSTALL } from "@/content/agentPrompt"

const MODES = [
  {
    title: "Cloud Jev",
    note: "The default",
    body: "Same-intent admits via TypeSafe Jev. Needs OPENROUTER_API_KEY for the judge. Upstream chat still needs its own key.",
    env: ["# .env", "OPENROUTER_API_KEY=sk-or-…", "# leave ADJUDICATOR unset to use Jev"],
  },
  {
    title: "Local System One",
    note: "No OpenRouter",
    body: "Admits stay on your machine. systemone also needs ADJUDICATOR_URL and ADJUDICATOR_MODEL.",
    env: ["# .env", "ADJUDICATOR=kev", "# or laya, laya-mlx, systemone"],
  },
]

const MATRIX = [
  ["Jev (default)", "omit ADJUDICATOR", "Yes"],
  ["Kev", "ADJUDICATOR=kev", "No"],
  ["Laya", "ADJUDICATOR=laya", "No"],
  ["Laya MLX", "ADJUDICATOR=laya-mlx", "No"],
  ["System One", "ADJUDICATOR=systemone + URL + model", "No*"],
]

const CHECKLIST = [
  { t: "Check health", d: "GET http://127.0.0.1:8080/healthz" },
  { t: "Run the live doctor", d: "jevcache doctor --live, or open /stats" },
  { t: "Keep keys local", d: "Secrets stay in .env. Never commit it." },
  { t: "Know the defaults", d: "Freshness and TURN_CACHE are on. Roll back with FRESHNESS_MODE=off or TURN_CACHE=off." },
]

export default function AgentSetup() {
  const [copied, setCopied] = useState<"prompt" | "install" | "body" | null>(null)

  const copy = async (kind: "prompt" | "install" | "body", text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1600)
    } catch {
      /* leave the label unchanged */
    }
  }

  return (
    <main className="relative z-10 text-bone">
      <span className="sr-only" aria-live="polite">
        {copied === "prompt" || copied === "body"
          ? "Agent setup prompt copied"
          : copied === "install"
            ? "Install command copied"
            : ""}
      </span>

      {/* Header */}
      <section className="px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Agent setup</p>
          <h1 className="h-display mt-6 max-w-4xl text-[clamp(2.5rem,6vw,5rem)]">Paste into Cursor. Or any coding agent.</h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-body sm:text-lg">
            One prompt installs MorrowCache 2.0, wires <code className="font-mono text-[0.92em] text-bone">baseURL</code>,
            and proves a miss, then a hit. Final text can hit, including a later stream. Tool calls are never stored.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SetupPromptButton copied={copied === "prompt"} onClick={() => void copy("prompt", AGENT_PROMPT)} />
            <button
              type="button"
              onClick={() => void copy("install", INSTALL)}
              className="group flex h-12 min-w-0 items-center gap-3 border border-line-strong bg-ink/80 pl-4 pr-1.5 font-mono text-[13px] text-body transition-colors hover:border-bone/60"
              aria-label="Copy install command"
            >
              <span className="text-hit">$</span>
              <span className="truncate">{INSTALL}</span>
              <span className="grid size-9 shrink-0 place-items-center bg-elevated text-muted transition-colors group-hover:text-bone">
                {copied === "install" ? <Check className="size-4 text-hit" /> : <Copy className="size-4" />}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* The prompt, framed like a product shot */}
      <section className="px-4 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden bg-hit px-4 py-10 sm:px-12 sm:py-16">
          <Mosaic className="absolute inset-0" speed={0.7} />
          <div className="window relative mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="font-mono text-[11px] text-bone">agent-setup-prompt.md</span>
              <button
                type="button"
                onClick={() => void copy("body", AGENT_PROMPT)}
                className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-white/10 px-2.5 text-xs text-body transition-colors hover:border-white/25 hover:text-bone"
              >
                {copied === "body" ? <Check className="size-3.5 text-hit" /> : <Copy className="size-3.5" />}
                {copied === "body" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[26rem] overflow-auto p-5 font-mono text-[12px] leading-relaxed text-body sm:text-[12.5px]">
              <code>{AGENT_PROMPT}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Judges */}
      <section className="px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Pick a judge</p>
          <h2 className="h-display mt-6 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)]">Cloud or local. Your call.</h2>
          <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-6">
            {MODES.map((m) => (
              <div key={m.title}>
                <div className="rounded-[14px] border border-white/10 p-1.5">
                  <pre className="rounded-[10px] border border-white/[0.08] bg-[#121211] p-5 font-mono text-[12.5px] leading-7">
                    {m.env.map((line) => (
                      <span key={line} className={line.startsWith("#") ? "block text-muted" : "block text-bone"}>
                        {line}
                      </span>
                    ))}
                  </pre>
                </div>
                <p className="mt-8 text-sm text-muted">{m.note}</p>
                <h3 className="mt-2 text-lg font-medium text-bone">{m.title}</h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">{m.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-3 pr-6 font-normal">Judge</th>
                  <th className="py-3 pr-6 font-normal">Set in .env</th>
                  <th className="py-3 font-normal">OpenRouter for admits</th>
                </tr>
              </thead>
              <tbody className="text-body">
                {MATRIX.map(([mode, env, or]) => (
                  <tr key={mode} className="border-b border-line">
                    <td className="py-4 pr-6 text-bone">{mode}</td>
                    <td className="py-4 pr-6 font-mono text-[12.5px] text-hit">{env}</td>
                    <td className="py-4">{or}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
              * Unless your local server needs its own key. Upstream chat still needs a model key (or MOCK_UPSTREAM=1).
              Without a judge ready, the proxy runs exact-only.
            </p>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="border-t border-line px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">After the agent finishes</p>
            <h2 className="h-display mt-6 text-[clamp(2rem,4.5vw,3.5rem)]">Confirm the hit path.</h2>
          </div>
          <ol className="border-t border-line">
            {CHECKLIST.map((c, i) => (
              <li key={c.t} className="flex gap-6 border-b border-line py-6">
                <span className="font-mono text-sm text-muted">{i + 1}</span>
                <div>
                  <p className="text-base text-bone">{c.t}</p>
                  <p className="mt-1.5 font-mono text-[12.5px] leading-relaxed text-muted">{c.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Next */}
      <section className="border-t border-line px-4 sm:px-6">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2">
          <a
            href="https://github.com/kushals256/jevcache/blob/main/AGENT_SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-6 border-b border-line py-10 no-underline md:border-b-0 md:border-r md:pr-10"
          >
            <span>
              <span className="block text-sm text-muted">Canonical file</span>
              <span className="mt-2 block text-xl text-body transition-colors group-hover:text-bone">AGENT_SETUP.md</span>
            </span>
            <ArrowUpRight className="size-5 shrink-0 text-muted transition-[transform,color] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bone" />
          </a>
          <Link to="/compare" className="group flex items-center justify-between gap-6 py-10 no-underline md:pl-10">
            <span>
              <span className="block text-sm text-muted">Still deciding?</span>
              <span className="mt-2 block text-xl text-body transition-colors group-hover:text-bone">Compare approaches</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-muted transition-[transform,color] group-hover:translate-x-1 group-hover:text-bone" />
          </Link>
        </div>
      </section>
    </main>
  )
}
