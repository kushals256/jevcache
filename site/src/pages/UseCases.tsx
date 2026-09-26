import { Link } from "react-router-dom"
import { TraceTheater } from "@/components/TraceTheater"
import { MetalButton } from "@/components/ui/metal-button"

const INSTALL = "npx @kushalicious/jevcache@latest"

export default function UseCases() {
  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL)
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="fig">FIG · Use</p>
      <h1 className="display mt-3 text-bone">Where MorrowCache earns its keep</h1>
      <p className="mt-4 max-w-xl text-body">
        Same product, different loops. Each case has a receipt and a place we don’t win.
      </p>
      <div className="mt-8 max-w-md">
        <TraceTheater />
      </div>
      <div className="mt-12 space-y-10">
        {[
          {
            title: "Agent retries",
            body: "Coding agents rephrase until the answer looks done. Each try is a chat bill. Same-intent hits cut the loop.",
            receipt: "receipt: agent → rephrase → HIT · skipped upstream",
          },
          {
            title: "Doc / support paraphrases",
            body: "Users ask the same FAQ with different words. Exact caches miss. Intent admit reuses the good answer.",
            receipt: "receipt: FAQ cluster · one completion · many wordings",
          },
          {
            title: "Local Kev / Laya adjudicator",
            body: "Run adjudication locally when you don’t want every decision to leave the machine.",
            receipt: "receipt: local judge · cloud or local completions",
          },
          {
            title: "Freshness-sensitive “latest”",
            body: "When the question depends on time, refuse the stale hit and call the model. Prefer miss over wrong.",
            receipt: 'receipt: "what\'s the latest" · refuse → miss',
          },
        ].map((c) => (
          <article key={c.title} className="border-t border-line pt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-bone">{c.title}</h2>
            <p className="mt-3 text-muted">{c.body}</p>
            <span className="receipt">{c.receipt}</span>
          </article>
        ))}
      </div>
      <div className="mt-14 rounded-2xl border border-line bg-panel/50 p-6">
        <h2 className="text-xl font-semibold tracking-tight text-bone">Who this is for</h2>
        <p className="mt-2 text-sm text-muted">
          Solo builders, agent-assisted engineers, cost-conscious apps on OpenAI-compatible APIs.
        </p>
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-bone">Where we don’t win</h2>
        <p className="mt-2 text-sm text-muted">
          Streaming cache, tool-call side effects, personalized secrets, sites you don’t control.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <MetalButton
            type="button"
            variant="outline"
            preset="chromatic"
            theme="dark"
            strength={1}
            metalFxClassName="!bg-bone !text-ink hover:!bg-bone/90"
            className="rounded-full px-5 font-medium"
            onClick={copyInstall}
          >
            Copy install
          </MetalButton>
          <Link to="/compare" className="text-sm text-hit no-underline hover:underline">
            Compare approaches →
          </Link>
        </div>
      </div>
    </main>
  )
}
