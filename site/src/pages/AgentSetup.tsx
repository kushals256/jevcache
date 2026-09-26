import { useState } from "react"
import { Link } from "react-router-dom"
import { MetalButton } from "@/components/ui/metal-button"
import { AGENT_PROMPT, INSTALL } from "@/content/agentPrompt"

export default function AgentSetup() {
  const [copied, setCopied] = useState<"prompt" | "install" | null>(null)

  const copy = async (kind: "prompt" | "install", text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:px-6">
      <span className="sr-only" aria-live="polite">
        {copied === "prompt"
          ? "Agent setup prompt copied"
          : copied === "install"
            ? "Install command copied"
            : ""}
      </span>

      <p className="fig">FIG · Agent</p>
      <h1 className="display mt-3 text-bone">Paste into Cursor (or any coding agent)</h1>
      <p className="mt-4 max-w-xl text-body">
        One prompt installs MorrowCache, wires <code className="font-mono text-hit">baseURL</code>, and proves
        MISS→HIT. Package stays <code className="font-mono text-sm text-muted">@kushalicious/jevcache</code>.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel/40 p-5">
          <h2 className="text-base font-semibold text-bone">Cloud Jev (default)</h2>
          <p className="mt-2 text-sm text-body">
            Same-intent admits via TypeSafe Jev. Needs <span className="font-mono text-xs">OPENROUTER_API_KEY</span>.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel/40 p-5">
          <h2 className="text-base font-semibold text-bone">Local System One</h2>
          <p className="mt-2 text-sm text-body">
            <span className="font-mono text-xs">ADJUDICATOR=kev|laya|laya-mlx|systemone</span> — no OpenRouter for
            admits.
          </p>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-line bg-panel/60 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Env</th>
              <th className="px-4 py-3 font-medium">OpenRouter for admits?</th>
            </tr>
          </thead>
          <tbody className="text-body">
            {[
              ["Jev (default)", "omit ADJUDICATOR", "Yes"],
              ["Kev", "ADJUDICATOR=kev", "No"],
              ["Laya", "ADJUDICATOR=laya", "No"],
              ["Laya MLX", "ADJUDICATOR=laya-mlx", "No"],
              ["System One", "ADJUDICATOR=systemone + URL + model", "No*"],
            ].map(([mode, env, or]) => (
              <tr key={mode} className="border-b border-line/80">
                <td className="px-4 py-3 text-bone">{mode}</td>
                <td className="px-4 py-3 font-mono text-xs">{env}</td>
                <td className="px-4 py-3">{or}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-muted">* Unless your local server requires its own key. Upstream chat still needs a model key (or MOCK_UPSTREAM=1).</p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <MetalButton
          type="button"
          variant="outline"
          preset="chromatic"
          theme="dark"
          strength={1}
          metalFxClassName="!bg-bone !text-ink hover:!bg-bone/90"
          className="min-h-11 rounded-full px-6 font-medium"
          onClick={() => void copy("prompt", AGENT_PROMPT)}
        >
          {copied === "prompt" ? "Copied" : "Copy setup prompt"}
        </MetalButton>
        <MetalButton
          type="button"
          variant="outline"
          preset="chromatic"
          theme="dark"
          strength={0.7}
          metalFxClassName="!bg-transparent !text-bone"
          className="min-h-11 rounded-full border border-line-strong px-6 font-medium"
          onClick={() => void copy("install", INSTALL)}
        >
          {copied === "install" ? "Copied" : "Copy install"}
        </MetalButton>
      </div>

      <pre className="mt-6 max-h-[28rem] overflow-auto rounded-xl border border-line bg-ink p-4 font-mono text-[12px] leading-relaxed text-body md:text-[13px]">
        <code>{AGENT_PROMPT}</code>
      </pre>

      <h2 className="mt-12 text-xl font-semibold tracking-tight text-bone">After the agent finishes</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-body">
        <li>
          Confirm <code className="font-mono text-xs">GET http://127.0.0.1:8080/healthz</code>
        </li>
        <li>
          Open <code className="font-mono text-xs">/stats</code> or run{" "}
          <code className="font-mono text-xs">jevcache doctor --live</code>
        </li>
        <li>Keep keys in local .env only — never commit</li>
        <li>
          Freshness on by default; rollback with <code className="font-mono text-xs">FRESHNESS_MODE=off</code>
        </li>
      </ul>

      <p className="mt-10 text-sm text-muted">
        Canonical file:{" "}
        <a
          href="https://github.com/kushals256/jevcache/blob/main/AGENT_SETUP.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-hit no-underline hover:underline"
        >
          AGENT_SETUP.md
        </a>
        {" · "}
        <Link to="/#start" className="text-hit no-underline hover:underline">
          Back to Start on Home
        </Link>
      </p>
    </main>
  )
}
