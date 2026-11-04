/**
 * One list drives prerendering, <head> tags, JSON-LD, the sitemap and llms.txt links.
 * Change SITE_URL here when the site moves to its own domain.
 */
import { GPTCACHE_FAQ, INTEGRATIONS_FAQ, LITELLM_FAQ, PROMPT_VS_RESPONSE_FAQ, SEMANTIC_CACHE_FAQ } from "@/content/pageFaq"

export const SITE_URL = "https://morrowcache.vercel.app"
export const SITE_NAME = "MorrowCache"
export const NPM_PACKAGE = "@kushalicious/jevcache"
export const NPM_URL = "https://www.npmjs.com/package/@kushalicious/jevcache"
export const GITHUB_URL = "https://github.com/kushals256/jevcache"
export const VERSION = "2.0.1"

export type RouteMeta = {
  path: string
  /** <title>, also og:title. Lead with the words people search for. */
  title: string
  /** meta description, also og:description. ~150 characters. */
  description: string
  /** Visible <h1>; the build fails if the prerendered page lacks it. */
  heading: string
  /** Breadcrumb label. Omitted for the home page. */
  crumb?: string
  /** Parent path for breadcrumbs, when not the home page. */
  parent?: string
  /** ISO date of the last meaningful content change, for sitemap lastmod. */
  updated: string
  /** Question/answer pairs rendered on the page, emitted as FAQPage JSON-LD. */
  faq?: { q: string; a: string }[]
  /** Emit TechArticle JSON-LD (guides and explainers). */
  article?: boolean
}

export const ROUTES: RouteMeta[] = [
  {
    path: "/",
    title: "MorrowCache: open-source semantic cache for OpenAI-compatible LLM APIs",
    description:
      "Local OpenAI-compatible proxy that reuses an LLM answer when the question is rephrased or an agent retries the same job. MIT, fail-open, never replays tool calls.",
    heading: "Skip the model",
    updated: "2026-11-04",
  },
  {
    path: "/agent-setup",
    title: "Set up an LLM response cache with one prompt in Cursor or Claude Code · MorrowCache",
    description:
      "One prompt installs MorrowCache, wires baseURL, and proves a miss then a hit. Tool calls are never stored. Package @kushalicious/jevcache.",
    heading: "Paste into Cursor. Or any coding agent.",
    crumb: "Agent setup",
    updated: "2026-11-04",
  },
  {
    path: "/use-cases",
    title: "LLM caching use cases: agent retries, FAQ paraphrases, local judges · MorrowCache",
    description:
      "Where a same-intent LLM cache helps: coding-agent retries, support questions asked in new words, local adjudication. And where it doesn't.",
    heading: "Where MorrowCache helps",
    crumb: "Use cases",
    updated: "2026-11-04",
  },
  {
    path: "/compare",
    title: "Semantic cache comparisons: GPTCache, LiteLLM, Redis, exact caches · MorrowCache",
    description:
      "How MorrowCache compares with exact-match caches, word-overlap caches and always calling the model. Where it wins and where it loses.",
    heading: "Head-to-heads",
    crumb: "Compare",
    updated: "2026-11-04",
  },
  {
    path: "/compare/exact-cache",
    title: "Semantic cache vs exact-match LLM cache · MorrowCache",
    description:
      "Exact-match caching is safe and narrow: a rephrased prompt always misses. MorrowCache keeps exact hits and adds same-intent hits, fail-open.",
    heading: "vs exact-only cache",
    crumb: "vs exact-only cache",
    parent: "/compare",
    updated: "2026-11-04",
  },
  {
    path: "/compare/word-overlap",
    title: "Word-overlap (Jaccard) LLM cache vs intent judging · MorrowCache",
    description:
      "Matching prompts by shared words is cheap and noisy: offline Jaccard@0.35 had a 0.49 false-positive rate (n=103). Why overlap is not the admit decision.",
    heading: "vs word-overlap (Jaccard)",
    crumb: "vs word overlap",
    parent: "/compare",
    updated: "2026-11-04",
  },
  {
    path: "/compare/always-call",
    title: "Should you cache LLM responses or always call the model? · MorrowCache",
    description:
      "Always calling the model is simple and fresh. A response cache skips repeats and paraphrases. When each one is the right call.",
    heading: "vs always calling the model",
    crumb: "vs always calling the model",
    parent: "/compare",
    updated: "2026-11-04",
  },
  {
    path: "/compare/gptcache",
    title: "MorrowCache vs GPTCache: a GPTCache alternative for any language · MorrowCache",
    description:
      "GPTCache is a Python semantic cache with a similarity threshold. MorrowCache is a local OpenAI-compatible proxy with an LLM judge. Differences, trade-offs and when to pick each.",
    heading: "MorrowCache vs GPTCache",
    crumb: "vs GPTCache",
    parent: "/compare",
    updated: "2026-11-04",
    faq: GPTCACHE_FAQ,
  },
  {
    path: "/compare/litellm-cache",
    title: "MorrowCache vs LiteLLM caching (semantic cache for agents) · MorrowCache",
    description:
      "LiteLLM's docs recommend exact caching for agent traffic. How MorrowCache's same-prior turn cache differs, and how to run it in front of a LiteLLM proxy.",
    heading: "MorrowCache vs LiteLLM caching",
    crumb: "vs LiteLLM caching",
    parent: "/compare",
    updated: "2026-11-04",
    faq: LITELLM_FAQ,
  },
  {
    path: "/compare/redis-semantic-cache",
    title: "MorrowCache vs Redis LangCache and RedisVL SemanticCache · MorrowCache",
    description:
      "Redis LangCache (hosted, preview) and RedisVL SemanticCache (library) compared with MorrowCache, a no-code-change local proxy. Scale, hit decisions and expiry.",
    heading: "MorrowCache vs Redis LangCache and RedisVL",
    crumb: "vs Redis semantic cache",
    parent: "/compare",
    updated: "2026-11-04",
  },
  {
    path: "/compare/gateway-caches",
    title: "LLM gateway caching compared: Helicone, Portkey, Cloudflare AI Gateway, Bifrost · MorrowCache",
    description:
      "Which AI gateways cache exactly and which semantically, their thresholds, TTLs and plan limits, from their docs. Where a dedicated response cache fits.",
    heading: "MorrowCache vs gateway caches: Helicone, Portkey, Cloudflare, Bifrost",
    crumb: "vs gateway caches",
    parent: "/compare",
    updated: "2026-11-04",
  },
  {
    path: "/guides/semantic-caching",
    title: "Semantic caching for LLMs: how it works and where it goes wrong · MorrowCache",
    description:
      "How semantic caches decide a hit, why thresholds return wrong answers, why agent traffic breaks them, and how to measure false hits before you trust one.",
    heading: "Semantic caching for LLMs, and where it goes wrong",
    crumb: "Semantic caching guide",
    updated: "2026-11-04",
    faq: SEMANTIC_CACHE_FAQ,
    article: true,
  },
  {
    path: "/guides/prompt-caching-vs-response-caching",
    title: "Prompt caching vs response caching for OpenAI and Anthropic APIs · MorrowCache",
    description:
      "OpenAI and Anthropic prompt caching makes repeated input cheaper; the model still runs. Response caching skips the call. How they differ and how to use both.",
    heading: "Prompt caching vs response caching",
    crumb: "Prompt vs response caching",
    updated: "2026-11-04",
    faq: PROMPT_VS_RESPONSE_FAQ,
    article: true,
  },
  {
    path: "/integrations",
    title: "Cache OpenAI SDK, Vercel AI SDK and LangChain calls with one base URL · MorrowCache",
    description:
      "Copy-paste setup for the OpenAI Node and Python SDKs, Vercel AI SDK, LangChain, curl and local models like Ollama and vLLM. Change one line, read X-Jevcache.",
    heading: "Add an LLM response cache to the OpenAI SDK, Vercel AI SDK or LangChain",
    crumb: "Integrations",
    updated: "2026-11-04",
    faq: INTEGRATIONS_FAQ,
    article: true,
  },
  {
    path: "/benchmark",
    title: "LLM cache benchmark: false-hit rate, recall, latency and cost · MorrowCache",
    description:
      "Live judge eval: 0 false positives on 50 traps, recall 0.38. Word-overlap baseline: 0.48 false-positive rate. Hits in about 400 ms vs seconds for a miss.",
    heading: "MorrowCache benchmark: false hits, recall, latency and cost",
    crumb: "Benchmark",
    updated: "2026-11-04",
    article: true,
  },
]
