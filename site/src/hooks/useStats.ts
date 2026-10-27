import { useEffect, useState } from "react"

/** Last known good figures — keep close to live npm/GitHub so first paint isn’t stale. */
const FALLBACK = { stars: 12, downloads: 1172 }

/** Package first published 2026-09-19; npm range queries cap at 18 months, so sum yearly chunks. */
const NPM_START = "2026-09-01"

async function totalDownloads(signal: AbortSignal): Promise<number | null> {
  const today = new Date().toISOString().slice(0, 10)
  const ranges: [string, string][] = []
  for (let y = Number(NPM_START.slice(0, 4)); `${y}` <= today.slice(0, 4); y++) {
    const start = y === Number(NPM_START.slice(0, 4)) ? NPM_START : `${y}-01-01`
    const end = `${y}-12-31` < today ? `${y}-12-31` : today
    ranges.push([start, end])
  }
  const parts = await Promise.all(
    ranges.map(([a, b]) =>
      fetch(`https://api.npmjs.org/downloads/range/${a}:${b}/@kushalicious/jevcache`, {
        signal,
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
    ),
  )
  if (parts.some((p) => !Array.isArray(p?.downloads))) return null
  return parts.reduce(
    (sum, p) => sum + p.downloads.reduce((s: number, d: { downloads: number }) => s + d.downloads, 0),
    0,
  )
}

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
          totalDownloads(ctrl.signal),
        ])
        if (cancelled) return
        if (typeof gh?.stargazers_count === "number") setStars(gh.stargazers_count)
        if (typeof npm === "number") setDownloads(npm)
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
