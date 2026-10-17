import { useEffect, useRef } from "react"

/** Full entrance (stagger + rise/hash). */
const PLAY_CLEAR_MS = 1500
/** Soft return settle after scrolling back. */
const RETURN_CLEAR_MS = 900
/** Ignore stacked triggers. */
const COOLDOWN_MS = 1800
/** Hero must be mostly gone before we arm a return. */
const LEFT_RATIO = 0.08
/** Hero must be mostly back before a return can fire. */
const RETURN_RATIO = 0.62
/** Wait for scroll to settle before return animation. */
const SCROLL_IDLE_MS = 140

type EnterMode = "play" | "return"

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isTopHashTarget(hash: string) {
  return hash === "#top" || hash === "#" || hash === ""
}

function linkTargetsTop(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href")
  if (!href) return false
  if (href === "#top" || href === "/#top") return true
  try {
    const url = new URL(href, window.location.origin)
    return (
      (url.pathname === "/" || url.pathname === "") &&
      (url.hash === "#top" || url.hash === "")
    )
  } catch {
    return false
  }
}

/**
 * Full hero entrance on mount / Start; soft settle when scrolling back to top.
 */
export function useHomeEnter(heroId = "top") {
  const playingRef = useRef(false)
  const lastPlayAtRef = useRef(0)
  const armedRef = useRef(false)
  const heroVisibleRef = useRef(true)
  const clearTimerRef = useRef(0)
  const idleTimerRef = useRef(0)

  useEffect(() => {
    const root = document.documentElement
    let cancelled = false

    const clearEnter = () => {
      delete root.dataset.homeEnter
      playingRef.current = false
    }

    const playEnter = (mode: EnterMode, opts?: { force?: boolean }) => {
      if (cancelled || prefersReducedMotion()) return
      const now = Date.now()
      if (playingRef.current) return
      if (!opts?.force && now - lastPlayAtRef.current < COOLDOWN_MS) return

      playingRef.current = true
      lastPlayAtRef.current = now
      window.clearTimeout(clearTimerRef.current)

      delete root.dataset.homeEnter
      void root.offsetWidth
      root.dataset.homeEnter = mode

      clearTimerRef.current = window.setTimeout(
        () => {
          if (cancelled) return
          clearEnter()
        },
        mode === "play" ? PLAY_CLEAR_MS : RETURN_CLEAR_MS,
      )
    }

    const scheduleReturn = () => {
      if (!armedRef.current || !heroVisibleRef.current) return
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(() => {
        if (cancelled || !armedRef.current || !heroVisibleRef.current) return
        armedRef.current = false
        playEnter("return")
      }, SCROLL_IDLE_MS)
    }

    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        playEnter("play", { force: true })
      })
    })

    const hero = document.getElementById(heroId)
    let observer: IntersectionObserver | undefined
    if (hero) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return
          const ratio = entry.intersectionRatio
          if (ratio <= LEFT_RATIO) {
            armedRef.current = true
            heroVisibleRef.current = false
            window.clearTimeout(idleTimerRef.current)
            return
          }
          if (ratio >= RETURN_RATIO) {
            heroVisibleRef.current = true
            if (armedRef.current) scheduleReturn()
          } else {
            heroVisibleRef.current = false
            window.clearTimeout(idleTimerRef.current)
          }
        },
        { threshold: [0, LEFT_RATIO, 0.25, RETURN_RATIO, 0.85, 1] },
      )
      observer.observe(hero)
    }

    const onScroll = () => {
      if (armedRef.current && heroVisibleRef.current) scheduleReturn()
    }

    const onHashChange = () => {
      if (isTopHashTarget(window.location.hash)) {
        armedRef.current = false
        playEnter("play")
      }
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!linkTargetsTop(anchor)) return
      armedRef.current = false
      playEnter("play")
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("hashchange", onHashChange)
    document.addEventListener("click", onClick)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      window.clearTimeout(clearTimerRef.current)
      window.clearTimeout(idleTimerRef.current)
      observer?.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("hashchange", onHashChange)
      document.removeEventListener("click", onClick)
      clearEnter()
      lastPlayAtRef.current = 0
      armedRef.current = false
      heroVisibleRef.current = true
    }
  }, [heroId])
}
