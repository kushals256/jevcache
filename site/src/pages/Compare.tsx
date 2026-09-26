import { Link } from "react-router-dom"

const rows = [
  {
    to: "/compare/always-call",
    title: "vs always calling the model",
    take: "Always correct, always expensive. Morrow wins on repeats.",
  },
  {
    to: "/compare/exact-cache",
    title: "vs exact-only cache",
    take: "Exact is safe and narrow. We add same-intent without dropping fail-open.",
  },
  {
    to: "/compare/word-overlap",
    title: "vs word-overlap (Jaccard)",
    take: "Overlap hits paraphrases but lies on freshness. Offline FPR 0.49.",
  },
]

export default function Compare() {
  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Compare</p>
      <h1 className="mt-2 font-semibold tracking-tight text-4xl text-bone">Honest head-to-heads</h1>
      <p className="mt-4 text-muted">
        No named commercial competitors. Just the approaches people actually try before a semantic
        cache.
      </p>
      <ul className="mt-10 space-y-4">
        {rows.map((r) => (
          <li key={r.to}>
            <Link
              to={r.to}
              className="block rounded-2xl border border-line bg-panel/40 p-5 no-underline transition hover:border-bone/30"
            >
              <h2 className="font-semibold tracking-tight text-xl text-bone">{r.title}</h2>
              <p className="mt-2 text-sm text-muted">{r.take}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
