import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { scrollToSection } from "@/components/SiteNav"

/** New pages open at the top; links with a #section land on that section once it has rendered. */
export function RouteScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    let raf = 0
    const attempt = () => {
      if (scrollToSection(id) || ++tries > 60) return
      raf = requestAnimationFrame(attempt)
    }
    raf = requestAnimationFrame(attempt)
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])

  return null
}
