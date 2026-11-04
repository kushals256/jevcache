import { A, Article, FAQList, H2, Note, P, Pre, Table, UL } from "@/components/Article"
import { LITELLM_FAQ } from "@/content/pageFaq"

export default function LiteLLMCache() {
  return (
    <Article
      eyebrow="Compare"
      title="MorrowCache vs LiteLLM caching"
      updated="2026-11-04"
      back={{ to: "/compare", label: "All comparisons" }}
      lede={
        <p>
          LiteLLM is an LLM gateway: one OpenAI-style API in front of many providers, with routing, budgets and keys.
          Caching is one of its features, exact or semantic. MorrowCache does one thing, deciding whether a call can be
          skipped, and can sit in front of LiteLLM.
        </p>
      }
      sources={[
        { label: "LiteLLM docs: proxy caching", href: "https://docs.litellm.ai/docs/proxy/caching" },
        { label: "LiteLLM docs: semantic caching", href: "https://docs.litellm.ai/docs/proxy/caching_semantic" },
        { label: "MorrowCache README", href: "https://github.com/kushals256/jevcache#readme" },
      ]}
    >
      <H2 id="at-a-glance">At a glance</H2>
      <Table
        head={["", "LiteLLM proxy caching", "MorrowCache"]}
        rows={[
          ["Product", "Gateway with caching as a feature", "Response cache only"],
          ["Cache backends", "Exact: Redis, S3, GCS, local, disk. Semantic: Redis, Valkey or Qdrant", "SQLite, one process"],
          ["Semantic hit", "Embedding cosine similarity; docs examples use 0.8", "Shortlist proposes, an LLM judge admits"],
          ["Endpoints", "Chat Completions, Responses, Anthropic Messages and more", "Chat Completions only; /v1/responses returns 501"],
          ["Agent traffic", "Docs recommend exact caching, not semantic", "Turn cache scoped to the same prior conversation"],
          ["Tool calls", "Not part of the semantic embedding, per its docs", "Responses with tool_calls are never stored"],
          ["Cache scope", "Shared across end users unless semantic_cache_scope: end_user", "X-Jevcache-Tenant isolates caches"],
          ["Hit header", "x-litellm-semantic-similarity", "X-Jevcache, X-Jevcache-Tier, X-Jevcache-Reason"],
        ]}
      />

      <H2 id="agents">The agent problem, in LiteLLM&rsquo;s words</H2>
      <P>
        LiteLLM&rsquo;s semantic caching page says the feature is designed for single-shot prompts and goes badly
        wrong on agentic traffic: consecutive turns of a conversation embed at around 0.99 similarity, raising the
        threshold does not reliably fix it, and assistant tool calls are not included in the text that gets embedded.
        It recommends exact caching for agents.
      </P>
      <P>
        MorrowCache was built for that case. A turn can only hit against entries with the same prior conversation;
        only the latest ask is judged for intent; and a response that contains tool calls is returned but never
        stored, so a tool step always runs.
      </P>

      <H2 id="where-litellm-wins">Where LiteLLM wins</H2>
      <UL>
        <li>It is a full gateway: 100+ providers, fallbacks, virtual keys, budgets and spend tracking.</li>
        <li>Its caches can live in Redis or Qdrant and serve many proxy replicas. MorrowCache is one SQLite process.</li>
        <li>It covers the Responses API and Anthropic Messages, which MorrowCache does not.</li>
        <li>A semantic hit is a vector lookup, with no judge call.</li>
      </UL>

      <H2 id="together">Using both</H2>
      <P>
        LiteLLM&rsquo;s proxy speaks the OpenAI API, so it can be MorrowCache&rsquo;s upstream. Your app talks to
        MorrowCache; misses go to LiteLLM, which routes them.
      </P>
      <Pre label=".env for MorrowCache">{`UPSTREAM_BASE_URL=http://127.0.0.1:4000/v1   # your LiteLLM proxy
UPSTREAM_API_KEY=sk-litellm-virtual-key
OPENROUTER_API_KEY=sk-or-...                  # for the default cloud judge`}</Pre>
      <Note>
        Use model names your LiteLLM config knows. We have not published a test of this pairing; it relies on both
        sides speaking Chat Completions.
      </Note>

      <H2 id="verdict">Verdict</H2>
      <P>
        If you need a gateway, use LiteLLM, and keep its cache on exact mode for agents as its docs advise. If you want
        paraphrase and retry hits for agents with a judge in the loop, put MorrowCache in front. See also{" "}
        <A href="/compare/gateway-caches">Helicone, Portkey and Cloudflare caching</A>.
      </P>

      <H2 id="faq">FAQ</H2>
      <FAQList items={LITELLM_FAQ} />
    </Article>
  )
}
