import { Link } from "react-router-dom"
import type { ReactNode } from "react"

export function ComparePage({
  title,
  lede,
  wins,
  loses,
  take,
}: {
  title: string
  lede: string
  wins: ReactNode
  loses: ReactNode
  take: string
}) {
  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:px-6">
      <Link to="/compare" className="text-sm text-muted no-underline hover:text-bone">
        ← Compare
      </Link>
      <h1 className="mt-4 font-semibold tracking-tight text-4xl text-bone">{title}</h1>
      <p className="mt-4 text-muted">{lede}</p>
      <section className="mt-10">
        <h2 className="font-semibold tracking-tight text-2xl text-hit">Where Morrow wins</h2>
        <div className="mt-3 text-muted">{wins}</div>
      </section>
      <section className="mt-10">
        <h2 className="font-semibold tracking-tight text-2xl text-amber">Where the other approach wins</h2>
        <div className="mt-3 text-muted">{loses}</div>
      </section>
      <p className="mt-10 rounded-xl border border-line bg-panel/50 p-4 text-sm text-bone">{take}</p>
    </main>
  )
}
