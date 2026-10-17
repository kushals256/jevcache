import { useEffect, useState } from "react"

/** Last known good figures — keep close to live npm/GitHub so first paint isn’t stale. */
const FALLBACK = { stars: 12, downloads: 1066 }

export function useStats() {
  const [stars, setStars] = useState(FALLBACK.stars)
  const [downloads, setDownloads] = useState(FALLBACK.downloads)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    ;(async () => {
      try {
        const [gh, npm] = await Promise.all([
          fetch("https://api.github.com/repos/kushals256/jevcache", {
            signal: ctrl.signal,
            cache: "no-store",
          }).then((r) => (r.ok ? r.json() : null)),
          fetch(
            "https://api.npmjs.org/downloads/point/last-month/@kushalicious/jevcache",
            { signal: ctrl.signal, cache: "no-store" },
          ).then((r) => (r.ok ? r.json() : null)),
        ])
        if (cancelled) return
        if (typeof gh?.stargazers_count === "number") setStars(gh.stargazers_count)
        if (typeof npm?.downloads === "number") setDownloads(npm.downloads)
      } catch {
        /* keep fallbacks */
      }
    })()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  return { stars, downloads }
}
