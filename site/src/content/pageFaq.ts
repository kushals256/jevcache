/**
 * FAQs shown on guide and comparison pages. routes.ts emits the same arrays as FAQPage JSON-LD,
 * so the structured data always matches the visible text. Plain text only.
 */
type QA = { q: string; a: string }

export const SEMANTIC_CACHE_FAQ: QA[] = [
  {
    q: "What is a semantic cache for LLMs?",
    a: "A cache that returns a stored model answer when a new prompt means the same thing as an earlier one, even if the words differ. An exact cache only hits when the request bytes are identical.",
  },
  {
    q: "Why do semantic caches return wrong answers?",
    a: "Most decide a hit with one embedding-similarity threshold. Questions that share most of their words but differ in a key detail, such as a negation, an entity or a date, can score above the threshold. A threshold low enough to catch real paraphrases also admits some of these near misses.",
  },
  {
    q: "Is semantic caching safe for AI agents?",
    a: "Only with guards. Consecutive agent turns embed almost identically, and replaying a stored tool call can run an action with the wrong arguments. Scope hits to the same prior conversation, never replay tool calls, and prefer a miss when unsure.",
  },
  {
    q: "How should I measure a semantic cache?",
    a: "Track the false-hit rate first, then the hit rate. A cache with a high hit rate and a few percent wrong answers can cost more in bad output than it saves in tokens.",
  },
]

export const PROMPT_VS_RESPONSE_FAQ: QA[] = [
  {
    q: "Is OpenAI prompt caching the same as caching responses?",
    a: "No. Prompt caching reuses the provider's computation for a repeated input prefix, so input tokens are cheaper. The model still generates a new answer and you still pay for every output token. A response cache skips the model call and returns a stored answer.",
  },
  {
    q: "Can I use prompt caching and a response cache together?",
    a: "Yes. They work at different layers. A response cache in front of the model removes repeat calls; prompt caching makes the calls that still go through cheaper when they share a long prefix.",
  },
  {
    q: "Which saves more money?",
    a: "It depends on the traffic. Prompt caching helps every call with a long shared prefix, such as a big system prompt or repo context. A response cache helps only when the same question or the same job repeats, but then it saves the whole call, output tokens and latency included.",
  },
]

export const GPTCACHE_FAQ: QA[] = [
  {
    q: "Is there a GPTCache alternative for Node.js or any language?",
    a: "MorrowCache runs as a local HTTP proxy that speaks the OpenAI Chat Completions API, so any language or SDK that lets you set a base URL can use it. GPTCache is a Python library.",
  },
  {
    q: "Is GPTCache still maintained?",
    a: "Its last tagged release is 0.1.44 from August 2024, and its README says it is no longer adding new API or model adapters. The repository has still received commits since then.",
  },
]

export const LITELLM_FAQ: QA[] = [
  {
    q: "Can I use MorrowCache with LiteLLM?",
    a: "Yes. LiteLLM's proxy exposes an OpenAI-compatible API, so you can set MorrowCache's UPSTREAM_BASE_URL to your LiteLLM proxy and keep LiteLLM's routing, budgets and keys behind the cache.",
  },
  {
    q: "Does LiteLLM semantic caching work for agents?",
    a: "LiteLLM's own documentation says its semantic cache is designed for single-shot prompts and recommends exact caching for agentic traffic, because consecutive turns embed almost identically.",
  },
]

export const INTEGRATIONS_FAQ: QA[] = [
  {
    q: "Why does the Vercel AI SDK return a 501 from MorrowCache?",
    a: "Recent AI SDK versions call the OpenAI Responses API by default. MorrowCache only serves Chat Completions, so create the model with openai.chat('model-id') instead of openai('model-id').",
  },
  {
    q: "Which API key does my client send?",
    a: "Your client's Authorization header is forwarded to the upstream. If the client sends none, MorrowCache uses UPSTREAM_API_KEY. The default upstream is OpenRouter.",
  },
  {
    q: "Can the upstream be a local model?",
    a: "Yes. Set UPSTREAM_BASE_URL to any OpenAI-compatible server, such as Ollama, vLLM or llama.cpp's server, and MorrowCache caches its answers the same way.",
  },
]
