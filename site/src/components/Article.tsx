import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** Long-form page: guides, named comparisons, integrations and the benchmark. */
export function Article({
  eyebrow,
  title,
  lede,
  updated,
  back,
  sources,
  children,
}: {
  eyebrow: string
  title: string
  lede: ReactNode
  /** ISO date shown as "Updated …". Keep in sync with routes.ts. */
  updated: string
  back?: { to: string; label: string }
  sources?: { label: string; href: string }[]
  children: ReactNode
}) {
  const date = new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
  return (
    <main className="relative z-10 text-bone">
      <section className="px-4 pb-12 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl">
          {back && (
            <div className="mb-10">
              <Link
                to={back.to}
                className="group inline-flex items-center gap-2 text-sm text-muted no-underline transition-colors hover:text-bone"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                {back.label}
              </Link>
            </div>
          )}
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="h-display mt-6 text-[clamp(2.2rem,5vw,3.75rem)]">{title}</h1>
          <div className="mt-6 text-pretty text-base leading-relaxed text-body sm:text-lg">{lede}</div>
          <p className="mt-6 font-mono text-xs text-muted">
            Updated <time dateTime={updated}>{date}</time>
          </p>
        </div>
      </section>

      <article className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl border-t border-line pt-4">{children}</div>
      </article>

      {sources && sources.length > 0 && (
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-3xl border-t border-line pt-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Sources</h2>
            <ol className="mt-4 space-y-2 text-sm text-muted">
              {sources.map((s, i) => (
                <li key={s.href} className="flex gap-3">
                  <span className="font-mono text-xs leading-6">{String(i + 1).padStart(2, "0")}</span>
                  <a href={s.href} className="leading-6 text-body underline decoration-line-strong underline-offset-4 hover:text-bone">
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section className="px-4 pb-24 sm:px-6 sm:pb-32">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="h-display text-[clamp(1.4rem,2.6vw,2rem)]">Try it on your own traffic.</p>
            <p className="mt-2 font-mono text-sm text-muted">npx @kushalicious/jevcache@latest start --demo</p>
          </div>
          <a href="/agent-setup" className="btn-line w-fit">
            Set it up
            <ArrowRight className="size-4" />
          </a>
        </div>
      </section>
    </main>
  )
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="section-anchor mt-14 text-2xl font-medium tracking-tight text-bone sm:text-[1.75rem]">
      {children}
    </h2>
  )
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 text-lg font-medium text-bone">{children}</h3>
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-5 text-[16px] leading-[1.75] text-body", className)}>{children}</p>
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-5 list-disc space-y-2 pl-5 text-[16px] leading-[1.7] text-body marker:text-muted">{children}</ul>
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.88em] text-bone">{children}</code>
}

export function Pre({ label, children }: { label?: string; children: string }) {
  return (
    <figure className="mt-6 overflow-hidden rounded-lg border border-line bg-panel">
      {label && (
        <figcaption className="border-b border-line px-4 py-2 font-mono text-[11px] text-muted">{label}</figcaption>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-bone">
        <code>{children}</code>
      </pre>
    </figure>
  )
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-panel">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium text-bone">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line last:border-b-0">
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 align-top font-medium text-bone">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3 align-top leading-relaxed text-body">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <aside className="mt-6 border-l-2 border-hit/60 bg-panel px-5 py-4 text-[15px] leading-relaxed text-body">
      {children}
    </aside>
  )
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const internal = href.startsWith("/")
  const cls = "text-bone underline decoration-line-strong underline-offset-4 hover:decoration-hit"
  return internal ? (
    <Link to={href} className={cls}>
      {children}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {children}
    </a>
  )
}

/** Visible FAQ. Pass the same array to the route's `faq` so JSON-LD matches the page. */
export function FAQList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <dl className="mt-6 border-t border-line">
      {items.map((f) => (
        <div key={f.q} className="border-b border-line py-6">
          <dt className="text-base font-medium text-bone sm:text-lg">{f.q}</dt>
          <dd className="mt-3 text-[15px] leading-relaxed text-body">{f.a}</dd>
        </div>
      ))}
    </dl>
  )
}
