import { A, Article, FAQList, H2, P, Table, UL } from "@/components/Article"
import { GPTCACHE_FAQ } from "@/content/pageFaq"

export default function GPTCache() {
  return (
    <Article
      eyebrow="Compare"
      title="MorrowCache vs GPTCache"
      updated="2026-11-04"
      back={{ to: "/compare", label: "All comparisons" }}
      lede={
        <p>
          GPTCache is the best-known open-source semantic cache: a Python library that embeds prompts and returns a
          stored answer when a new prompt is similar enough. MorrowCache is a local HTTP proxy that an LLM judge
          gates. Here is how they differ and when to pick each.
        </p>
      }
      sources={[
        { label: "GPTCache on GitHub (zilliztech/GPTCache)", href: "https://github.com/zilliztech/GPTCache" },
        { label: "Thoughtworks Technology Radar: GPTCache (Assess, 2023)", href: "https://www.thoughtworks.com/radar/languages-and-frameworks/gptcache" },
        { label: "MorrowCache README", href: "https://github.com/kushals256/jevcache#readme" },
      ]}
    >
      <H2 id="at-a-glance">At a glance</H2>
      <Table
        head={["", "GPTCache", "MorrowCache"]}
        rows={[
          ["Form", "Python library (optional server image)", "Local proxy: npx or Docker"],
          ["Languages", "Python in-process; others via its server", "Any client that can set an OpenAI base URL"],
          ["Hit decision", "Embedding search, then an evaluator against similarity_threshold (default 0.8)", "Exact hash, then a shortlist an LLM judge must admit"],
          ["Storage", "Pluggable: SQLite, MySQL, Postgres and vector stores such as Milvus or FAISS", "SQLite via Node's built-in node:sqlite, one process"],
          ["Freshness", "Eviction policies you configure; no time-sensitivity check documented", "Time-sensitive questions refused; TTL by freshness class"],
          ["Tool calls", "Not covered in its docs", "Responses with tool_calls are never stored"],
          ["Agent retries", "Not a documented feature", "Turn cache: same prior turns plus same-intent latest ask"],
          ["Extra cost per check", "Local embedding", "A judge call (about $0.00002 with the cloud judge) or a local judge"],
          ["License", "MIT", "MIT"],
          ["Release activity", "Last tagged release 0.1.44, August 2024", "2.0.1, November 2026"],
        ]}
      />

      <H2 id="where-gptcache-wins">Where GPTCache wins</H2>
      <UL>
        <li>It runs in your Python process, so a hit costs a local embedding and a vector lookup, not a network call.</li>
        <li>Storage and embedding backends are pluggable, including vector databases that scale past one machine.</li>
        <li>It has a larger community, about 8,000 GitHub stars, and years of examples.</li>
        <li>With no judge, there is no per-check model cost.</li>
      </UL>

      <H2 id="where-morrowcache-wins">Where MorrowCache wins</H2>
      <UL>
        <li>
          It does not need to live in your code. Point any OpenAI-compatible client at{" "}
          <code>http://127.0.0.1:8080/v1</code>: Node, Python, Go, curl or a coding agent.
        </li>
        <li>
          Similarity only proposes candidates. A judge decides whether two prompts ask the same thing, which is aimed
          at the near-miss problem that Thoughtworks flagged as false positives during cache hits.
        </li>
        <li>It refuses time-sensitive questions and never replays tool calls.</li>
        <li>It handles agent retries and streams a stored final answer.</li>
      </UL>

      <H2 id="verdict">Verdict</H2>
      <P>
        Pick GPTCache if you are in Python, want everything in-process and are comfortable tuning a similarity
        threshold. Pick MorrowCache if you want a drop-in proxy for any client, or your traffic includes agents and
        tool calls where a wrong hit is expensive. For the background, read{" "}
        <A href="/guides/semantic-caching">where semantic caches go wrong</A>.
      </P>

      <H2 id="faq">FAQ</H2>
      <FAQList items={GPTCACHE_FAQ} />
    </Article>
  )
}
