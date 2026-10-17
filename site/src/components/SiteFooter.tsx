import { Link } from "react-router-dom"
import { GrainField } from "@/components/GrainField"
import { Logo } from "@/components/Logo"

export function SiteFooter() {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-line bg-ink px-4 pt-16 text-muted md:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm">
            Skip the model when the question is the same, or the same job is retried. Final text only. Prefer a miss over a wrong hit.
          </p>
          <a
            href="https://www.producthunt.com/products/morrowcache?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-morrowcache"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block"
          >
            <img
              alt="MorrowCache - Skip the chat call when the question is the same | Product Hunt"
              width={250}
              height={54}
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1264480&theme=dark&t=1790775288397"
            />
          </a>
        </div>
        <div>
          <h3 className="mb-3 font-mono text-xs text-bone">Product</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/#agent" className="no-underline hover:text-bone">
                Get started
              </a>
            </li>
            <li>
              <Link to="/agent-setup" className="no-underline hover:text-bone">
                Agent setup
              </Link>
            </li>
            <li>
              <Link to="/use-cases" className="no-underline hover:text-bone">
                Use cases
              </Link>
            </li>
            <li>
              <Link to="/compare" className="no-underline hover:text-bone">
                Compare
              </Link>
            </li>
            <li>
              <a href="/#benchmark" className="no-underline hover:text-bone">
                Benchmark
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-mono text-xs text-bone">Resources</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://github.com/kushals256/jevcache#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline hover:text-bone"
              >
                README
              </a>
            </li>
            <li>
              <Link to="/agent-setup" className="no-underline hover:text-bone">
                Agent setup
              </Link>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/@kushalicious/jevcache"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline hover:text-bone"
              >
                npm
              </a>
            </li>
            <li>
              <a
                href="https://github.com/kushals256/jevcache/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline hover:text-bone"
              >
                Issues
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-mono text-xs text-bone">Project</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://github.com/kushals256/jevcache"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline hover:text-bone"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://github.com/kushals256/jevcache/blob/main/SECURITY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline hover:text-bone"
              >
                Security
              </a>
            </li>
            <li>
              <a
                href="https://github.com/kushals256/jevcache/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline hover:text-bone"
              >
                Changelog
              </a>
            </li>
            <li>
              <span>MIT License</span>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-14 flex max-w-6xl flex-wrap justify-between gap-2 border-t border-line pt-6 font-mono text-xs">
        <span>
          Package <code className="text-bone">@kushalicious/jevcache</code>, fail-open by design
        </span>
        <span>© {new Date().getFullYear()} MorrowCache</span>
      </p>
      {/* The wordmark is a window onto the grain: white letters on ink, multiplied over the canvas. */}
      <div className="relative isolate mx-auto -mb-[0.18em] mt-8 w-fit overflow-hidden bg-ink" aria-hidden>
        <GrainField even className="absolute inset-0 size-full" />
        <p className="h-display pointer-events-none relative select-none whitespace-nowrap bg-ink text-center text-[clamp(3rem,13.5vw,12.5rem)] leading-none text-white mix-blend-multiply">
          MorrowCache
        </p>
      </div>
    </footer>
  )
}
