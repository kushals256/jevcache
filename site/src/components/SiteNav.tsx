import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react"
import { ArrowRight, Menu, X } from "lucide-react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useContentMode } from "@/contentMode"
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
  match?: string
}[] = [
  { to: "/#problem", label: "Why", hash: true, match: "#problem" },
  { to: "/#how", label: "How", hash: true, match: "#how" },
  { to: "/#benchmark", label: "Replay", hash: true, match: "#benchmark" },
  { to: "/agent-setup", label: "Agent", match: "/agent-setup" },
  { to: "/compare", label: "Compare", match: "/compare" },
]

const SECTIONS = ["problem", "how", "benchmark"]

/** Smooth-scroll to a section on the home page, leaving room for the sticky nav. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return false
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  // Land on the section's label, not its top padding, so the content fills the screen.
  const anchor = el.querySelector<HTMLElement>(".eyebrow") ?? el
  const top = anchor.getBoundingClientRect().top + window.scrollY - 88
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" })
  return true
}

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [section, setSection] = useState<string | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const contentMode = useContentMode()
  const onHome = pathname === "/"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname, hash])

  // Scroll spy: on the home page, light up the link for the section in the middle of the screen.
  useEffect(() => {
    if (!onHome) {
      setSection(null)
      return
    }
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => e !== null)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSection(e.target.id)
      },
      { rootMargin: "-45% 0px -50% 0px" },
    )
    for (const el of els) io.observe(el)
    const onTop = () => {
      if (window.scrollY < window.innerHeight * 0.5) setSection(null)
    }
    window.addEventListener("scroll", onTop, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener("scroll", onTop)
    }
  }, [onHome])

  const isActive = (link: (typeof links)[number]) => {
    if (link.hash) return onHome && section === link.match?.slice(1)
    return Boolean(link.match && pathname.startsWith(link.match))
  }
  const activeIndex = links.findIndex(isActive)
  const target = hovered ?? (activeIndex >= 0 ? activeIndex : null)

  // Slide the highlight under whichever link is hovered, or the active one.
  useLayoutEffect(() => {
    const el = target === null ? null : itemRefs.current[target]
    const rail = railRef.current
    if (!el || !rail) {
      setPill(null)
      return
    }
    const r = el.getBoundingClientRect()
    const base = rail.getBoundingClientRect()
    setPill({ left: r.left - base.left, width: r.width })
  }, [target, pathname])

  const goSection = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    setOpen(false)
    if (onHome) {
      e.preventDefault()
      if (scrollToSection(id)) window.history.replaceState(null, "", `#${id}`)
      return
    }
    // The prerendered pages don't include the home page, so let the browser load it.
    if (contentMode) return
    e.preventDefault()
    navigate(`/#${id}`)
  }

  const solid = scrolled || open

  return (
    <header className="sticky top-0 z-50 px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:px-6">
      <div
        className={cn(
          "relative mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 border pl-3 pr-1.5 transition-[background-color,border-color,backdrop-filter] duration-300",
          solid ? "border-line-strong bg-[#111110]/90 backdrop-blur-md" : "border-transparent bg-transparent",
        )}
      >
        <Logo />

        <nav className="hidden md:block" aria-label="Primary">
          <div ref={railRef} className="relative flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1/2 h-8 -translate-y-1/2 rounded-md bg-white/[0.07] transition-[left,width,opacity] duration-300 ease-out motion-reduce:transition-none",
                pill ? "opacity-100" : "opacity-0",
              )}
              style={pill ? { left: pill.left, width: pill.width } : undefined}
            />
            {links.map((l, i) => {
              const active = isActive(l)
              const cls = cn(
                "relative z-10 flex h-8 items-center gap-2 rounded-md px-3 text-[13px] no-underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-hit/70",
                active ? "text-bone" : "text-body/75 hover:text-bone",
              )
              const dot = (
                <span
                  aria-hidden
                  className={cn("size-1 rounded-full bg-hit transition-opacity duration-300", active ? "opacity-100" : "opacity-0")}
                />
              )
              const common = {
                ref: (n: HTMLElement | null) => {
                  itemRefs.current[i] = n
                },
                onMouseEnter: () => setHovered(i),
                onFocus: () => setHovered(i),
                onBlur: () => setHovered(null),
                "aria-current": active ? ("page" as const) : undefined,
              }
              return l.hash ? (
                <a key={l.label} href={l.to} className={cls} onClick={(e) => goSection(e, l.match!.slice(1))} {...common}>
                  {dot}
                  {l.label}
                </a>
              ) : (
                <NavLink
                  key={l.label}
                  to={l.to}
                  className={cls}
                  {...common}
                >
                  {dot}
                  {l.label}
                </NavLink>
              )
            })}
            <a
              href="https://github.com/kushals256/jevcache"
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 ml-1 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] text-body/75 no-underline transition-colors hover:bg-white/[0.07] hover:text-bone"
            >
              <GitHubIcon className="size-3.5" />
              GitHub
            </a>
          </div>
        </nav>

        <div className="flex items-center gap-1">
          <a
            href="/#agent"
            onClick={(e) => goSection(e, "agent")}
            className="group inline-flex h-9 items-center gap-1.5 bg-bone px-3.5 text-[13px] font-medium text-ink no-underline transition-colors hover:bg-hit active:translate-y-px"
          >
            Get started
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
          </a>
          <button
            type="button"
            className="grid size-9 place-items-center text-bone md:hidden"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div className="absolute inset-x-[-1px] top-full border border-t-0 border-line-strong bg-[#111110] p-2 md:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              {links.map((l) =>
                l.hash ? (
                  <a
                    key={l.label}
                    href={l.to}
                    className={cn("px-3 py-3 text-sm no-underline hover:bg-elevated", isActive(l) ? "text-hit" : "text-bone")}
                    onClick={(e) => goSection(e, l.match!.slice(1))}
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={cn("px-3 py-3 text-sm no-underline hover:bg-elevated", isActive(l) ? "text-hit" : "text-bone")}
                  >
                    {l.label}
                  </Link>
                ),
              )}
              <a
                href="https://github.com/kushals256/jevcache"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-3 text-sm text-bone no-underline hover:bg-elevated"
                onClick={() => setOpen(false)}
              >
                <GitHubIcon className="size-3.5" />
                Star on GitHub
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
