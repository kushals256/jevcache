import { useEffect, useState } from "react"

const FALLBACK = { stars: 10, downloads: 367 }

export function useStats() {
  const [stars, setStars] = useState(FALLBACK.stars)
  const [downloads, setDownloads] = useState(FALLBACK.downloads)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [gh, npm] = await Promise.all([
          fetch("https://api.github.com/repos/kushals256/jevcache").then((r) =>
            r.ok ? r.json() : null,
          ),
          fetch("https://api.npmjs.org/downloads/point/last-month/@kushalicious/jevcache").then(
            (r) => (r.ok ? r.json() : null),
          ),
        ])
        if (cancelled) return
        if (gh?.stargazers_count != null) setStars(gh.stargazers_count)
        if (npm?.downloads != null) setDownloads(npm.downloads)
      } catch {
        /* keep fallbacks */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { stars, downloads }
}
