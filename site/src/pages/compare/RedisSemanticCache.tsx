import { A, Article, H2, P, Table, UL } from "@/components/Article"

export default function RedisSemanticCache() {
  return (
    <Article
      eyebrow="Compare"
      title="MorrowCache vs Redis LangCache and RedisVL"
      updated="2026-11-04"
      back={{ to: "/compare", label: "All comparisons" }}
      lede={
        <p>
          Redis offers two semantic caches: LangCache, a hosted service in preview, and RedisVL&rsquo;s SemanticCache,
          an open-source library. Both are building blocks your code calls before and after the model. MorrowCache is a
          proxy, so your code does not change.
        </p>
      }
      sources={[
        { label: "Redis docs: LangCache", href: "https://redis.io/docs/latest/develop/ai/langcache/" },
        { label: "RedisVL user guide: LLM caching", href: "https://docs.redisvl.com/en/latest/user_guide/03_llmcache.html" },
        { label: "MorrowCache README", href: "https://github.com/kushals256/jevcache#readme" },
      ]}
    >
      <H2 id="at-a-glance">At a glance</H2>
      <Table
        head={["", "Redis LangCache", "RedisVL SemanticCache", "MorrowCache"]}
        rows={[
          ["Form", "Hosted REST API with Python and JS SDKs", "Python library on Redis", "Local proxy"],
          ["Status", "Public preview on Redis Cloud", "Open source (MIT)", "Open source (MIT), 2.0"],
          ["Integration", "Call search before the model, store after", "Call check before, store after", "Change the client's base URL"],
          ["Hit decision", "Embedding similarity, threshold configurable", "Cosine distance; docs example uses 0.1", "LLM judge admits a shortlisted candidate"],
          ["Expiry", "TTL and eviction configurable", "No TTL unless you set one", "TTL by freshness class; time-sensitive asks refused"],
          ["Scale", "Managed Redis", "Your Redis deployment", "One process, one SQLite file"],
        ]}
      />

      <H2 id="where-redis-wins">Where Redis wins</H2>
      <UL>
        <li>It scales. Many app servers can share one cache, which a single-process SQLite proxy cannot do.</li>
        <li>RedisVL supports filterable fields such as a user ID, which makes per-user scoping explicit.</li>
        <li>LangCache manages the embedding model for you.</li>
        <li>If you already run Redis, there is nothing new to operate.</li>
      </UL>

      <H2 id="where-morrowcache-wins">Where MorrowCache wins</H2>
      <UL>
        <li>No code changes: any OpenAI-compatible client works by changing one URL.</li>
        <li>A model judges intent, rather than a distance cut-off deciding alone.</li>
        <li>Agent-aware: hits are scoped to the same prior turns, and tool-call responses are never stored.</li>
        <li>Runs on a laptop with nothing else installed: Node 22.5+ or Docker.</li>
      </UL>

      <H2 id="verdict">Verdict</H2>
      <P>
        For a multi-server production app that already uses Redis, RedisVL or LangCache is the natural fit. For a
        local agent, a script or a single service where you want caching without touching code, MorrowCache is
        simpler. Background: <A href="/guides/semantic-caching">how semantic caches decide a hit</A>.
      </P>
    </Article>
  )
}
