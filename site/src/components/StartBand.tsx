import { useState } from "react"
import { Link } from "react-router-dom"
import { MetalButton } from "@/components/ui/metal-button"
import {
  AGENT_PROMPT,
  AGENT_PROMPT_PREVIEW,
  BASE_URL_SNIPPET,
  INSTALL,
} from "@/content/agentPrompt"
import { cn } from "@/lib/utils"

type Copied = "install" | "base" | "prompt" | null

export function StartBand({ className }: { className?: string }) {
  const [copied, setCopied] = useState<Copied>(null)

  const copy = async (kind: Exclude<Copied, null>, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <section id="start" className={cn("section-anchor px-6 py-16 lg:px-8 lg:py-20", className)}>
      <span className="sr-only" aria-live="polite">
        {copied === "install"
          ? "Install command copied"
          : copied === "base"
            ? "Base URL copied"
            : copied === "prompt"
              ? "Agent setup prompt copied"
              : ""}
      </span>

      <div className="mx-auto max-w-[1200px]">
        <p className="fig">FIG 02 · Start</p>
        <h2 className="display mt-3 max-w-2xl text-bone">Running in one paste.</h2>
        <p className="mt-3 max-w-xl text-body">
          Terminal, or your coding agent. Same proxy. Default port 8080.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="flex flex-col rounded-xl border border-line bg-panel/40 p-5 md:p-6">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">Terminal</p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-bone">One command. Point baseURL.</h3>
            <p className="mt-2 text-sm text-body">Install the proxy, then point your SDK at it.</p>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-line bg-ink px-4 py-3 font-mono text-sm text-bone">
              <code>{INSTALL}</code>
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <MetalButton
                type="button"
                variant="outline"
                preset="chromatic"
                theme="dark"
                strength={1}
                metalFxClassName="!bg-bone !text-ink hover:!bg-bone/90"
                className="min-h-10 rounded-full px-5 text-sm font-medium"
                onClick={() => void copy("install", INSTALL)}
              >
                {copied === "install" ? "Copied" : "Copy install"}
              </MetalButton>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-ink px-4 py-3 font-mono text-[13px] text-hit">
              <code>{BASE_URL_SNIPPET}</code>
            </pre>
            <button
              type="button"
              className="mt-3 self-start text-sm text-muted underline-offset-4 hover:text-bone hover:underline"
              onClick={() => void copy("base", BASE_URL_SNIPPET)}
            >
              {copied === "base" ? "Copied baseURL" : "Copy baseURL"}
            </button>
          </div>

          <div className="flex flex-col rounded-xl border border-line bg-panel/40 p-5 md:p-6">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              Cursor / Claude / any agent
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-bone">Paste once. Agent wires it.</h3>
            <p className="mt-2 text-sm text-body">
              Copy the setup prompt into a new chat. It installs, asks Jev vs local Kev/Laya, and proves MISS→HIT.
            </p>
            <pre
              className="relative mt-5 max-h-[9.5rem] overflow-hidden rounded-lg border border-line bg-ink px-4 py-3 font-mono text-[12px] leading-relaxed text-muted"
              tabIndex={0}
            >
              <code>{AGENT_PROMPT_PREVIEW}…</code>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink to-transparent"
              />
            </pre>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <MetalButton
                type="button"
                variant="outline"
                preset="chromatic"
                theme="dark"
                strength={1}
                metalFxClassName="!bg-bone !text-ink hover:!bg-bone/90"
                className="min-h-10 rounded-full px-5 text-sm font-medium"
                onClick={() => void copy("prompt", AGENT_PROMPT)}
              >
                {copied === "prompt" ? "Copied" : "Copy setup prompt"}
              </MetalButton>
              <Link to="/agent-setup" className="text-sm text-hit no-underline hover:underline">
                Full guide →
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 font-mono text-[0.7rem] leading-relaxed text-muted md:text-xs">
          Default judge: cloud Jev · or{" "}
          <span className="text-bone/80">ADJUDICATOR=kev|laya</span> for local System One (no OpenRouter for
          admits)
        </p>
      </div>
    </section>
  )
}
