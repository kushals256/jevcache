import { Link } from "react-router-dom"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { RequestWindow } from "@/components/landing/RequestWindow"
import { COMPARISONS } from "@/pages/Compare"

export function ComparePage({
  slug,
  eyebrow,
  title,
  lede,
  wins,
  loses,
  take,
}: {
  slug: string
  eyebrow?: string
  title: string
  lede: string
  wins: ReactNode
  loses: ReactNode
  take: string
}) {
  const current = COMPARISONS.find((c) => c.to === `/compare/${slug}`)
  const others = COMPARISONS.filter((c) => c.to !== `/compare/${slug}`)

  return (
    <main className="relative z-10 text-bone">
      <section className="px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/compare"
            className="group inline-flex items-center gap-2 text-sm text-muted no-underline transition-colors hover:text-bone"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            All comparisons
          </Link>
          <div className="mt-10 grid items-end gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h1 className="h-display mt-6 text-[clamp(2.4rem,5.5vw,4.5rem)]">{title}</h1>
              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-body sm:text-lg">{lede}</p>
            </div>
            {current && <RequestWindow {...current.window} className="w-full max-w-md lg:justify-self-end" />}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6">
        <div className="mx-auto grid max-w-6xl border-y border-line md:grid-cols-2">
          <article className="py-10 md:border-r md:border-line md:pr-10">
            <h2 className="flex items-center gap-3 text-lg font-medium text-bone">
              <span aria-hidden className="size-2 bg-hit" />
              Where MorrowCache wins
            </h2>
            <div className="mt-4 max-w-md text-[15px] leading-relaxed text-body">{wins}</div>
          </article>
          <article className="border-t border-line py-10 md:border-t-0 md:pl-10">
            <h2 className="flex items-center gap-3 text-lg font-medium text-bone">
              <span aria-hidden className="size-2 bg-amber" />
              Where they win
            </h2>
            <div className="mt-4 max-w-md text-[15px] leading-relaxed text-body">{loses}</div>
          </article>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">The honest take</p>
          <p className="h-display mt-6 max-w-4xl text-[clamp(1.8rem,3.6vw,3rem)]">{take}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="/#agent"
              className="group inline-flex h-11 items-center gap-2 bg-bone px-5 text-sm font-medium text-ink no-underline transition-colors hover:bg-hit active:translate-y-px"
            >
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link to="/agent-setup" className="btn-line">
              Full agent guide
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-line px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-muted">Other comparisons</p>
          <ul className="mt-4">
            {others.map((o) => (
              <li key={o.to} className="border-b border-line">
                <Link
                  to={o.to}
                  className="group flex items-center justify-between gap-6 py-5 no-underline outline-none focus-visible:bg-white/[0.03]"
                >
                  <span className="text-lg text-body transition-colors group-hover:text-bone">{o.name}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-[transform,color] group-hover:translate-x-1 group-hover:text-bone" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
