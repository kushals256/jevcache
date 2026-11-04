import { A, Article, Code, FAQList, H2, Note, P, Table, UL } from "@/components/Article"
import { SEMANTIC_CACHE_FAQ } from "@/content/pageFaq"

export default function SemanticCaching() {
  return (
    <Article
      eyebrow="Guide"
      title="Semantic caching for LLMs, and where it goes wrong"
      updated="2026-11-04"
      lede={
        <p>
          A semantic cache returns a stored model answer when a new prompt means the same thing as an old one. It can
          cut cost and latency on repeated questions. It can also return a confident wrong answer. This guide covers
          how these caches decide a hit, the known failure modes, and how to measure one before you trust it.
        </p>
      }
      sources={[
        { label: "vCache: verified semantic prompt caching (ICLR 2026), arXiv 2502.03771", href: "https://arxiv.org/abs/2502.03771" },
        { label: "Krites: semantic caching with an asynchronous LLM judge, arXiv 2602.13165", href: "https://arxiv.org/abs/2602.13165" },
        { label: "LiteLLM docs: semantic caching and agentic traffic", href: "https://docs.litellm.ai/docs/proxy/caching_semantic" },
        { label: "GPTCache configuration (default similarity_threshold)", href: "https://github.com/zilliztech/GPTCache" },
        { label: "Portkey docs: simple and semantic cache", href: "https://portkey.ai/docs/product/ai-gateway/cache-simple-and-semantic" },
        { label: "Thoughtworks Technology Radar: GPTCache", href: "https://www.thoughtworks.com/radar/languages-and-frameworks/gptcache" },
        { label: "MorrowCache offline eval, results/eval.json", href: "https://github.com/kushals256/jevcache/blob/main/results/eval.json" },
      ]}
    >
      <H2 id="exact-vs-semantic">Exact caching and semantic caching</H2>
      <P>
        An exact cache hashes the request and returns the stored response only when the hash matches. It is safe:
        identical bytes, identical answer. It also misses every rephrase. <Code>explain mutexes</Code> and{" "}
        <Code>please explain mutexes</Code> are different keys.
      </P>
      <P>
        A semantic cache tries to catch those rephrases. The common design embeds the prompt, searches a vector store
        for the nearest stored prompt, and calls it a hit when the similarity clears a threshold.
      </P>
      <Table
        head={["Tool", "How a hit is decided", "Threshold (documented)"]}
        rows={[
          ["GPTCache", "Embedding search plus a pluggable evaluator", "similarity_threshold default 0.8"],
          ["Portkey semantic cache", "Cosine similarity after an exact miss", "Default 0.95"],
          ["Bifrost", "Exact hash, then cosine similarity", "Default 0.8"],
          ["LiteLLM redis-semantic", "Cosine similarity", "Docs examples use 0.8"],
          ["MorrowCache", "Exact hash, then a shortlist that an LLM judge must admit", "Judge score 0.85 (INTENT_THRESHOLD)"],
        ]}
      />

      <H2 id="failure-modes">Four ways a semantic cache goes wrong</H2>
      <P>
        <strong className="text-bone">1. The threshold trade-off.</strong> A single cut-off has to separate real
        paraphrases from near misses that share most of their words. The vCache paper (ICLR 2026) found that a static
        threshold gives either a low hit rate or a high error rate, and proposed learning a threshold per cached entry.
        Questions that differ by a negation, an entity or a version number are the usual casualties.
      </P>
      <P>
        <strong className="text-bone">2. Agent traffic.</strong> LiteLLM's documentation warns that its semantic
        cache is designed for single-shot prompts. In agent loops, consecutive turns embed at around 0.99 similarity,
        raising the threshold does not reliably fix it, and assistant tool calls are not part of the embedded text.
        LiteLLM recommends exact caching for agents.
      </P>
      <P>
        <strong className="text-bone">3. Replayed tool calls.</strong> If a cached response contains a tool call, a
        hit replays that call, possibly with arguments meant for a different request. Bifrost skips caching tool-call
        responses by default for this reason. MorrowCache never stores them.
      </P>
      <P>
        <strong className="text-bone">4. Freshness and scope.</strong> &ldquo;What&rsquo;s the latest Node
        release?&rdquo; has the same meaning next month and a different answer. Personal questions have the same
        wording for every user and a different answer for each. A cache needs time limits and tenant boundaries, not
        only a similarity score.
      </P>

      <H2 id="measure">How to measure a semantic cache</H2>
      <P>Hit rate is the number vendors lead with. The number that matters first is the false-hit rate.</P>
      <UL>
        <li>Build a labelled set of prompt pairs: real paraphrases, and traps that look alike but are not.</li>
        <li>Report precision, recall and the false-positive rate on the traps, not only overall hits.</li>
        <li>Replay a slice of real traffic with the cache in shadow mode before serving hits.</li>
        <li>Log every hit with the stored prompt it matched, so a wrong hit can be traced.</li>
      </UL>
      <Note>
        On MorrowCache&rsquo;s 103-pair offline set, a word-overlap (Jaccard 0.35) matcher had a false-positive rate
        of 0.49 and a recall of 0.24. See the <A href="/benchmark">benchmark page</A> for the full numbers, including
        the judge&rsquo;s.
      </Note>

      <H2 id="judge">Using an LLM judge instead of a threshold</H2>
      <P>
        One answer to the threshold problem is to let similarity only propose candidates and have a model decide.
        The Krites paper (arXiv 2602.13165) uses an asynchronous LLM judge for near-threshold neighbours and reports
        up to 3.9 times more curated hits. MorrowCache puts the judge on the request path: a shortlist proposes up to
        five candidates, the judge admits or rejects, and if the judge errors or times out the request goes to the
        model.
      </P>
      <P>
        The cost is a judge call on each candidate check, about $0.00002 per request in MorrowCache&rsquo;s recorded
        sessions with the default cloud judge, and a semantic hit takes roughly 350 to 450 ms instead of the few
        milliseconds of a vector lookup. The judge can also run locally. Whether that trade is worth it depends on how
        expensive a wrong answer is for you.
      </P>
      <P>
        Compare specific tools: <A href="/compare/gptcache">GPTCache</A>,{" "}
        <A href="/compare/litellm-cache">LiteLLM caching</A>, <A href="/compare/redis-semantic-cache">Redis LangCache
        and RedisVL</A>, and <A href="/compare/gateway-caches">gateway caches</A> such as Helicone, Portkey and
        Cloudflare AI Gateway.
      </P>

      <H2 id="faq">FAQ</H2>
      <FAQList items={SEMANTIC_CACHE_FAQ} />
    </Article>
  )
}
