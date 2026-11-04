import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  GITHUB_URL,
  HOME_FAQ,
  NPM_PACKAGE,
  NPM_URL,
  ROUTES,
  SITE_NAME,
  SITE_URL,
  VERSION,
  renderRoute,
} from "../dist-ssr/prerender.js"

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(siteRoot, "dist")

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

const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
const escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
const urlFor = (path) => `${SITE_URL}${path === "/" ? "/" : path}`

const manifest = loadManifest()
const entryKey = Object.keys(manifest).find((key) => key.endsWith("src/content.tsx"))
if (!entryKey) throw new Error("content entry missing from the manifest")

const css = new Set()
const scripts = new Set()
collect(manifest, entryKey, new Set(), css, scripts)
const entryFile = manifest[entryKey].file
scripts.delete(entryFile)

const shell = readFileSync(join(siteRoot, "index.html"), "utf8")
for (const needle of [
  "<title>MorrowCache</title>",
  '<meta name="description" content="',
  '<meta property="og:title" content="MorrowCache" />',
  '<meta property="og:description" content="',
  '<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />',
  '<script type="module" src="/src/main.tsx"></script>',
  '<div id="root"></div>',
]) {
  if (!shell.includes(needle)) throw new Error(`index.html changed; write-routes expects: ${needle}`)
}
if (shell.includes('rel="canonical"') || shell.includes("og:url")) {
  throw new Error("shared shell must not contain a canonical or og:url")
}

// Unknown URLs get the client app with a 404 status and noindex, instead of a soft-404 copy of home.
{
  const spa = readFileSync(join(dist, "index.html"), "utf8")
  if (spa.includes('rel="canonical"')) {
    throw new Error("dist/index.html is already prerendered; run the full `npm run build`")
  }
  writeFileSync(
    join(dist, "404.html"),
    spa
      .replace("<title>MorrowCache</title>", "<title>Page not found · MorrowCache</title>")
      .replace("<head>", '<head>\n    <meta name="robots" content="noindex" />'),
  )
}

cpSync(join(siteRoot, "dist-content/assets"), join(dist, "assets"), { recursive: true })

const person = { "@type": "Person", name: "Kushal S", url: "https://github.com/kushals256" }
const sameAs = [
  GITHUB_URL,
  NPM_URL,
  "https://github.com/kushals256/jevcache/pkgs/container/jevcache",
  "https://www.producthunt.com/products/morrowcache",
]

function jsonLdFor(route) {
  const url = urlFor(route.path)
  const graph = []
  if (route.path === "/") {
    graph.push(
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/` },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        alternateName: [NPM_PACKAGE, "jevcache"],
        url: `${SITE_URL}/`,
        description: route.description,
        applicationCategory: "DeveloperApplication",
        applicationSubCategory: "LLM response cache",
        operatingSystem: "macOS, Linux, Windows",
        softwareVersion: VERSION,
        softwareRequirements: "Node.js 22.5 or later, or Docker",
        downloadUrl: NPM_URL,
        installUrl: `${SITE_URL}/agent-setup`,
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: person,
        sameAs,
      },
      {
        "@type": "SoftwareSourceCode",
        name: SITE_NAME,
        codeRepository: GITHUB_URL,
        programmingLanguage: "TypeScript",
        runtimePlatform: "Node.js",
        license: "https://opensource.org/licenses/MIT",
        author: person,
        targetProduct: { "@id": `${SITE_URL}/#software` },
      },
    )
  }
  graph.push({
    "@type": route.article ? "TechArticle" : "WebPage",
    "@id": `${url}#page`,
    url,
    name: route.title,
    ...(route.article ? { headline: route.heading, author: person } : {}),
    description: route.description,
    dateModified: route.updated,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#software` },
    inLanguage: "en",
  })
  if (route.path !== "/") {
    const trail = [{ name: SITE_NAME, url: `${SITE_URL}/` }]
    if (route.parent) {
      const parent = ROUTES.find((r) => r.path === route.parent)
      trail.push({ name: parent.crumb, url: urlFor(parent.path) })
    }
    trail.push({ name: route.crumb, url })
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: t.url })),
    })
  }
  const faq = route.path === "/" ? HOME_FAQ : route.faq
  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    })
  }
  // Keep "</script>" out of the payload.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")
}

for (const route of ROUTES) {
  const body = renderRoute(route.path).replace(/<link rel="preload" as="image"[^>]*>/g, "")
  if (!body.includes(escapeText(route.heading))) {
    throw new Error(`prerender of ${route.path} did not include its heading`)
  }
  const url = urlFor(route.path)
  const title = escapeAttr(route.title)
  const description = escapeAttr(route.description)
  let html = shell
    .replace("<title>MorrowCache</title>", `<title>${escapeText(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`)
    .replace('<meta property="og:title" content="MorrowCache" />', `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`)
    .replace(
      '<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />',
      [
        '<link rel="describedby" href="https://morrowcache.vercel.app/llms.txt" type="text/plain" />',
        `<link rel="canonical" href="${url}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        `<meta name="twitter:title" content="${title}" />`,
        `<meta name="twitter:description" content="${description}" />`,
        `<script type="application/ld+json">${jsonLdFor(route)}</script>`,
      ].join("\n    "),
    )
    .replace(
      '<script type="module" src="/src/main.tsx"></script>',
      `${[...css].map((file) => `<link rel="stylesheet" href="/${file}" />`).join("\n    ")}\n    ${[...scripts].map((file) => `<link rel="modulepreload" href="/${file}" />`).join("\n    ")}\n    <script type="module" src="/${entryFile}"></script>`,
    )
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

  if (html.includes("/src/main.tsx") || html.split('rel="canonical"').length !== 2) {
    throw new Error(`route ${route.path} was not written as its own page`)
  }
  const file = route.path === "/" ? join(dist, "index.html") : join(dist, route.path.slice(1), "index.html")
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
  console.log("wrote", route.path)
}

// Sitemap from the same route list, with real lastmod dates.
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((r) => `  <url><loc>${urlFor(r.path)}</loc><lastmod>${r.updated}</lastmod></url>`).join("\n")}
</urlset>
`,
)
console.log("wrote sitemap.xml with", ROUTES.length, "urls")

// Keep the robots.txt sitemap pointer in sync with SITE_URL.
copyFileSync(join(siteRoot, "public/robots.txt"), join(dist, "robots.txt"))
writeFileSync(
  join(dist, "robots.txt"),
  readFileSync(join(dist, "robots.txt"), "utf8").replace(/Sitemap: .*/, `Sitemap: ${SITE_URL}/sitemap.xml`),
)

// The SSR bundle can leave timers alive (landing animations); everything is written, so exit.
process.exit(0)
