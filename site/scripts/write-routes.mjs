import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { renderRoute } from "../dist-ssr/prerender.js"

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)))

const routes = [
  {
    path: "/agent-setup",
    title: "Paste into Cursor. Or any coding agent. · MorrowCache",
    description:
      "One prompt installs MorrowCache, wires baseURL, and proves a miss then a hit. Tool calls are never stored. Package @kushalicious/jevcache.",
    heading: "Paste into Cursor. Or any coding agent.",
  },
  {
    path: "/use-cases",
    title: "Where MorrowCache earns its keep · MorrowCache",
    description: "Same product, different loops. Agent retries, paraphrases, and a local judge.",
    heading: "Where MorrowCache earns its keep",
  },
  {
    path: "/compare",
    title: "Honest head-to-heads · MorrowCache",
    description:
      "Always calling the model, exact-only cache, and word overlap. Where Morrow wins or loses.",
    heading: "Honest head-to-heads",
  },
  {
    path: "/compare/exact-cache",
    title: "vs exact-only cache · MorrowCache",
    description:
      "Exact is safe and narrow. Morrow keeps exact hits and adds same-intent, fail-open.",
    heading: "vs exact-only cache",
  },
  {
    path: "/compare/word-overlap",
    title: "vs word-overlap (Jaccard) · MorrowCache",
    description:
      "High token overlap is cheap and noisy. Overlap is not the admit decision.",
    heading: "vs word-overlap (Jaccard)",
  },
  {
    path: "/compare/always-call",
    title: "vs always calling the model · MorrowCache",
    description:
      "Always calling the model is simple and fresh. Morrow skips repeats and paraphrases.",
    heading: "vs always calling the model",
  },
]

function loadManifest() {
  const candidates = [
    join(siteRoot, "dist-content/.vite/manifest.json"),
    join(siteRoot, "dist-content/manifest.json"),
  ]
  for (const file of candidates) {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"))
  }
  throw new Error("Vite manifest was not written")
}

function collect(manifest, key, seen, css, scripts) {
  if (seen.has(key)) return
  const item = manifest[key]
  if (!item) return
  seen.add(key)
  if (item.file) scripts.add(item.file)
  for (const file of item.css ?? []) css.add(file)
  for (const child of item.imports ?? []) collect(manifest, child, seen, css, scripts)
}

const manifest = loadManifest()
const entryKey = Object.keys(manifest).find((key) => key.endsWith("src/content.tsx"))
if (!entryKey) throw new Error("content entry missing from the manifest")

const css = new Set()
const scripts = new Set()
collect(manifest, entryKey, new Set(), css, scripts)
const entryFile = manifest[entryKey].file
scripts.delete(entryFile)

const shell = readFileSync(join(siteRoot, "index.html"), "utf8")
const homeDescription =
  "MorrowCache is an OpenAI-compatible proxy that reuses final text when the question is the same intent or an agent retries the same job. Fail-open. Tool calls are never stored."
if (shell.includes('rel="canonical"') || shell.includes("og:url")) {
  throw new Error("shared shell must not contain a canonical or og:url")
}

cpSync(join(siteRoot, "dist-content/assets"), join(siteRoot, "dist/assets"), { recursive: true })

for (const route of routes) {
  const body = renderRoute(route.path).replace(/<link rel="preload" as="image"[^>]*>/g, "")
  if (!body.includes(route.heading)) {
    throw new Error(`prerender of ${route.path} did not include its heading`)
  }
  const canonical = `https://morrowcache.vercel.app${route.path}`
  let html = shell
    .replace("<title>MorrowCache</title>", `<title>${route.title}</title>`)
    .replace(`content="${homeDescription}"`, `content="${route.description}"`)
    .replace(
      '<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />',
      `<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />\n    <link rel="canonical" href="${canonical}" />`,
    )
    .replace(
      '<script type="module" src="/src/main.tsx"></script>',
      `${[...css].map((file) => `<link rel="stylesheet" href="/${file}" />`).join("\n    ")}\n    ${[...scripts].map((file) => `<link rel="modulepreload" href="/${file}" />`).join("\n    ")}\n    <script type="module" src="/${entryFile}"></script>`,
    )
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

  if (html.includes("/src/main.tsx") || html.includes("og:url") || !html.includes(route.heading)) {
    throw new Error(`route ${route.path} was not written as its own page`)
  }
  const file = join(siteRoot, "dist", route.path.slice(1), "index.html")
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
  console.log("wrote", route.path)
}
