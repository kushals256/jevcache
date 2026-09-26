import { Link } from "react-router-dom"
import { Logo } from "@/components/Logo"

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line px-4 py-14 md:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">
            Skip the model when the question is the same. Prefer a miss over a wrong hit.
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold tracking-tight text-sm text-bone">Product</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <a href="/#start" className="no-underline hover:text-bone">
                Start
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
          <h3 className="mb-3 font-semibold tracking-tight text-sm text-bone">Resources</h3>
          <ul className="space-y-2 text-sm text-muted">
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
          <h3 className="mb-3 font-semibold tracking-tight text-sm text-bone">Project</h3>
          <ul className="space-y-2 text-sm text-muted">
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
              <span className="text-muted">MIT License</span>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-5xl text-xs text-muted">
        Package <code className="text-bone/80">@kushalicious/jevcache</code> · fail-open by design
      </p>
    </footer>
  )
}
