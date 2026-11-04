import { A, Article, H2, P, Table, UL } from "@/components/Article"

export default function GatewayCaches() {
  return (
    <Article
      eyebrow="Compare"
      title="MorrowCache vs gateway caches: Helicone, Portkey, Cloudflare, Bifrost"
      updated="2026-11-04"
      back={{ to: "/compare", label: "All comparisons" }}
      lede={
        <p>
          Most AI gateways include a response cache. Several are exact-match only; the semantic ones use a cosine
          threshold and some sit behind enterprise plans. Here is what each one documents, and where a dedicated
          cache fits.
        </p>
      }
      sources={[
        { label: "Helicone docs: caching", href: "https://docs.helicone.ai/features/advanced-usage/caching" },
        { label: "Portkey docs: simple and semantic cache", href: "https://portkey.ai/docs/product/ai-gateway/cache-simple-and-semantic" },
        { label: "Cloudflare AI Gateway docs: caching", href: "https://developers.cloudflare.com/ai-gateway/features/caching/" },
        { label: "Bifrost docs: semantic caching", href: "https://docs.getbifrost.ai/features/semantic-caching" },
        { label: "Kong docs: AI Semantic Cache plugin", href: "https://developer.konghq.com/plugins/ai-semantic-cache/" },
        { label: "TensorZero docs: inference caching", href: "https://tensorzero.com/docs/gateway/guides/inference-caching" },
      ]}
    >
      <H2 id="table">What each gateway&rsquo;s cache does</H2>
      <Table
        head={["Gateway", "Match type", "Notes from the docs"]}
        rows={[
          ["Helicone", "Exact only", "Opt in with Helicone-Cache-Enabled. TTL defaults to 7 days. Buckets can hold up to 20 responses, picked at random."],
          ["Cloudflare AI Gateway", "Exact only", "SHA-256 of provider, endpoint, model, auth and body. Off by default. Semantic search listed as planned."],
          ["Portkey", "Exact; semantic on select Enterprise plans", "Semantic uses cosine similarity, default 0.95, after an exact miss. Ignores the system prompt; limited to 4 messages and 8,191 tokens."],
          ["Bifrost", "Exact, then semantic", "Cosine default 0.8, TTL 5 minutes, needs a vector store and a cache key header. Skips conversations over 3 messages and tool-call responses by default."],
          ["Kong AI Gateway", "Semantic (Enterprise plugin)", "Redis, Valkey or pgvector. Embeds the last N messages; can stream cached responses."],
          ["TensorZero", "Exact only", "Stored in ClickHouse; default mode is write-only."],
          ["MorrowCache", "Exact, then judged intent", "LLM judge admits; same-prior turn cache for agents; tool-call responses never stored; freshness refusals."],
        ]}
      />

      <H2 id="exact-is-fine">When an exact gateway cache is enough</H2>
      <P>
        Exact caches cannot return a wrong answer for a different question, which is why Helicone, Cloudflare and
        TensorZero stop there. If your prompts are generated from templates and repeat byte for byte, use the cache
        your gateway already has. A semantic layer only pays off when the same question arrives in different words,
        which is common with people typing and with agents retrying.
      </P>

      <H2 id="fit">Where MorrowCache fits</H2>
      <UL>
        <li>In front of a gateway: set MorrowCache&rsquo;s UPSTREAM_BASE_URL to the gateway&rsquo;s OpenAI-compatible endpoint.</li>
        <li>Without a gateway: point your client straight at MorrowCache and let it call OpenRouter, OpenAI or a local model.</li>
        <li>Free and local: no plan tier, and the judge can run on your machine.</li>
      </UL>
      <P>
        MorrowCache is not a gateway. It has no provider routing, budgets or dashboards beyond its <code>/stats</code>{" "}
        page, and it handles Chat Completions only. See <A href="/compare/litellm-cache">LiteLLM</A> for a gateway
        comparison with configuration.
      </P>
    </Article>
  )
}
