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
      `<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />\n    <link rel="canonical" href="${canonical}" />\n    <meta property="og:site_name" content="MorrowCache" />`,
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

// The home page renders client-side, so give crawlers its own title, canonical,
// site name and a text version of the hero. React replaces #root on load.
{
  const file = join(siteRoot, "dist/index.html")
  let html = readFileSync(file, "utf8")
  const homeUrl = "https://morrowcache.vercel.app/"
  const homeTitle = "MorrowCache: skip the model when the question is the same"
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "MorrowCache", url: homeUrl },
      {
        "@type": "SoftwareApplication",
        name: "MorrowCache",
        url: homeUrl,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "macOS, Linux, Windows",
        description: homeDescription,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  }
  const staticHome = `<main class="sr-only">
      <h1>Skip the model when the question is rephrased, retried, or the same.</h1>
      <p>MorrowCache is a local OpenAI-compatible proxy. When a request means the same thing, or your agent retries the same job, MorrowCache returns the stored final answer. Tool calls never replay. Fail-open by design.</p>
      <p>Install: <code>npx @kushalicious/jevcache@latest</code>, then point your client's baseURL at http://127.0.0.1:8080/v1.</p>
      <nav>
        <a href="/agent-setup">Agent setup</a>
        <a href="/use-cases">Use cases</a>
        <a href="/compare">Compare</a>
        <a href="https://github.com/kushals256/jevcache">GitHub</a>
      </nav>
    </main>`
  if (!html.includes('<div id="root"></div>')) throw new Error("home shell changed; update the home SEO step")
  html = html
    .replace("<title>MorrowCache</title>", `<title>${homeTitle}</title>`)
    .replace('<meta property="og:title" content="MorrowCache" />', `<meta property="og:title" content="${homeTitle}" />`)
    .replace(
      '<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />',
      `<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />\n    <link rel="canonical" href="${homeUrl}" />\n    <meta property="og:url" content="${homeUrl}" />\n    <meta property="og:site_name" content="MorrowCache" />\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    )
    .replace('<div id="root"></div>', `<div id="root">${staticHome}</div>`)
  writeFileSync(file, html)
  console.log("wrote / (seo)")
}
