import { useEffect, useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

const links: {
  to: string
  label: string
  hash?: boolean
  external?: boolean
}[] = [
  { to: "/#start", label: "Start", hash: true },
  { to: "/#problem", label: "Why", hash: true },
  { to: "/agent-setup", label: "Agent setup" },
  { to: "/use-cases", label: "Use cases" },
  { to: "/compare", label: "Compare" },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 items-center gap-4 px-4 backdrop-blur-md md:px-6",
        "bg-ink/90 pt-[env(safe-area-inset-top,0px)]",
        scrolled && "shadow-[inset_0_-1px_0_var(--color-line)]",
      )}
      style={{ height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <Logo />
      <nav className="ml-auto hidden items-center gap-5 md:flex">
        {links.map((l) =>
          l.external ? (
            <a
              key={l.label}
              href={l.to}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted no-underline hover:text-bone"
            >
              {l.label}
            </a>
          ) : l.hash ? (
            <a key={l.label} href={l.to} className="text-sm text-muted no-underline hover:text-bone">
              {l.label}
            </a>
          ) : (
            <NavLink
              key={l.label}
              to={l.to}
              className={({ isActive }) =>
                cn("text-sm no-underline", isActive ? "text-hit" : "text-muted hover:text-bone")
              }
            >
              {l.label}
            </NavLink>
          ),
        )}
        <a
          href="https://github.com/kushals256/jevcache"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-hit/30 bg-panel px-3 py-1 text-sm text-bone no-underline hover:border-hit/50"
        >
          <GitHubIcon className="size-3.5" />
          Star
        </a>
        <a
          href="/#start"
          className="rounded-full bg-hit px-3.5 py-1.5 text-sm font-medium text-ink no-underline"
        >
          Start
        </a>
      </nav>
      <button
        type="button"
        className="ml-auto rounded-md p-2 text-bone md:hidden"
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-14 flex flex-col gap-1 border-b border-line bg-ink p-4 md:hidden">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.label}
                href={l.to}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-2 text-bone no-underline hover:bg-panel"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ) : l.hash ? (
              <a
                key={l.label}
                href={l.to}
                className="rounded-md px-3 py-2 text-bone no-underline hover:bg-panel"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-bone no-underline hover:bg-panel"
              >
                {l.label}
              </Link>
            ),
          )}
          <a href="/#start" className="rounded-md bg-hit px-3 py-2 text-center font-medium text-ink no-underline" onClick={() => setOpen(false)}>
            Start
          </a>
        </div>
      )}
    </header>
  )
}
