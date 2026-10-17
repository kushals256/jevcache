import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { RequestWindow, type RequestWindowProps } from "@/components/landing/RequestWindow"

export const COMPARISONS: {
  to: string
  title: string
  name: string
  take: string
  window: RequestWindowProps
}[] = [
  {
    to: "/compare/always-call",
    title: "vs always calling the model",
    name: "Always calling the model",
    take: "Always correct, always expensive. Morrow wins on repeats and paraphrases.",
    window: {
      rows: [
        { label: "Request 1", text: "explain mutexes" },
        { label: "Request 2", text: "explain mutexes" },
      ],
      check: "Same question, paid twice",
      header: "Model called",
      tone: "miss",
    },
  },
  {
    to: "/compare/exact-cache",
    title: "vs exact-only cache",
    name: "Exact-only cache",
    take: "Exact is safe and narrow. We keep exact hits and add same-intent, fail-open.",
    window: {
      rows: [
        { label: "Request 1", text: "explain mutexes" },
        { label: "Request 2", text: "please explain mutexes" },
      ],
      check: "Hashes differ",
      header: "X-Jevcache: MISS",
      tone: "miss",
    },
  },
  {
    to: "/compare/word-overlap",
    title: "vs word-overlap (Jaccard)",
    name: "Word overlap",
    take: "Overlap catches paraphrases but lies on freshness. Offline FPR 0.49 at Jaccard@0.35.",
    window: {
      rows: [
        { label: "Asked", text: "latest node release?" },
        { label: "Matched on shared words", text: "node release notes" },
      ],
      check: "Shared words, different question",
      header: "Wrong hit",
      tone: "miss",
    },
  },
]

export default function Compare() {
  return (
    <main className="relative z-10 text-bone">
      <section className="px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Compare</p>
          <h1 className="h-display mt-6 max-w-4xl text-[clamp(2.5rem,6vw,5rem)]">Honest head-to-heads</h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-body sm:text-lg">
            No named commercial competitors. Just the approaches people actually try before a semantic cache, and
            where Morrow wins or loses.
          </p>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 sm:pb-32">
        <ul className="mx-auto grid max-w-6xl gap-12 md:grid-cols-3 md:gap-6">
          {COMPARISONS.map((c, i) => (
            <li key={c.to}>
              <Link
                to={c.to}
                className="group block rounded-[16px] no-underline outline-none focus-visible:ring-1 focus-visible:ring-hit/70 focus-visible:ring-offset-8 focus-visible:ring-offset-ink"
              >
                <RequestWindow {...c.window} className="group-hover:border-white/25" />
                <p className="mt-8 font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 text-lg font-medium text-bone">{c.name}</h2>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{c.take}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-bone">
                  Read the comparison
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-24 flex max-w-6xl flex-col gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="h-display text-[clamp(1.6rem,3vw,2.4rem)]">Prefer a miss over a wrong hit.</p>
          <a href="/#agent" className="btn-line w-fit">
            Get started
            <ArrowRight className="size-4" />
          </a>
        </div>
      </section>
    </main>
  )
}
