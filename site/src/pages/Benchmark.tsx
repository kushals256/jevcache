import { A, Article, H2, Note, P, Pre, Table, UL } from "@/components/Article"

export default function Benchmark() {
  return (
    <Article
      eyebrow="Benchmark"
      title="MorrowCache benchmark: false hits, recall, latency and cost"
      updated="2026-11-04"
      lede={
        <p>
          Every number MorrowCache publishes, where it came from, and what it does not show. The short version: the
          judge has not admitted a wrong pair in our live test, it also misses many real paraphrases, and a hit takes
          about 400 ms instead of several seconds.
        </p>
      }
      sources={[
        { label: "Offline eval, current: results/eval.json", href: "https://github.com/kushals256/jevcache/blob/main/results/eval.json" },
        { label: "Live judge eval, 19 Sep 2026: commit 2e81134", href: "https://github.com/kushals256/jevcache/commit/2e81134" },
        { label: "Eval script: scripts/eval.ts", href: "https://github.com/kushals256/jevcache/blob/main/scripts/eval.ts" },
      ]}
    >
      <H2 id="accuracy">Accuracy: does it admit the wrong question?</H2>
      <P>
        The eval set is labelled prompt pairs: real paraphrases that should hit, and look-alikes that should not, such
        as negations and different entities. We compare the judge with a word-overlap matcher (Jaccard similarity at
        0.35), a common cheap baseline.
      </P>
      <Table
        head={["Matcher", "Pairs", "False-positive rate", "Precision", "Recall"]}
        rows={[
          ["LLM judge (Jev, live, admit-v1)", "100", "0.00 (0 of 50 traps)", "1.00", "0.38 (19 of 50)"],
          ["Word overlap, Jaccard 0.35", "100", "0.48", "0.33", "0.24"],
          ["Word overlap, Jaccard 0.35", "103", "0.49", "0.32", "0.24"],
        ]}
      />
      <UL>
        <li>The live judge run was on 19 September 2026 against the admit-v1 gate, and cost $0.0017 for 100 pairs.</li>
        <li>The current 103-pair set adds negation and entity traps. Its live judge numbers have not been re-run yet, so we do not quote them.</li>
        <li>
          Recall of 0.38 means the judge let 31 of 50 real paraphrases miss. That is the price of preferring a miss
          to a wrong hit: those requests go to the model as usual.
        </li>
        <li>Zero false positives on 50 traps is not a guarantee of zero in production.</li>
      </UL>

      <H2 id="latency">Latency and cost: three scripted sessions</H2>
      <P>
        Each session sent a fixed list of questions and their paraphrases through the proxy with the default cloud
        judge and real upstream calls via OpenRouter. These are scripted demos, not production traffic, so the hit
        rate reflects how many paraphrases the script contained.
      </P>
      <Table
        head={["Session", "Requests", "Hits", "Median hit", "Median miss", "Judge cost"]}
        rows={[
          ["Broad", "20", "8", "399 ms", "4,328 ms", "$0.00039"],
          ["Raw", "17", "8", "389 ms", "2,702 ms", "$0.00031"],
          ["Tight", "12", "9", "369 ms", "5,722 ms", "$0.00020"],
        ]}
      />
      <P>
        Judge cost works out to roughly $0.00002 per request. With a cheap upstream model, that can be a real share of
        the saving; on the broad session the judge cost $0.00039 against $0.00128 saved. The saving grows with the
        price of the upstream model and the length of its answers. A local judge removes the judge cost.
      </P>
      <Note>
        The replay on the <A href="/">home page</A> is a separate recorded pair: 2,817 ms for the miss and 423 ms for
        the paraphrase hit, at a judge score of 0.94.
      </Note>

      <H2 id="reproduce">Reproduce it</H2>
      <Pre label="terminal">{`git clone https://github.com/kushals256/jevcache && cd jevcache && npm install
npm run eval                                   # offline, Jaccard baseline
LIVE=1 OPENROUTER_API_KEY=sk-or-... npm run eval   # adds the live judge`}</Pre>

      <H2 id="not-measured">Not measured yet</H2>
      <UL>
        <li>Hit rate on real coding-agent sessions over days.</li>
        <li>False hits in production traffic.</li>
        <li>Local judges (Kev, Laya) on the same eval set.</li>
        <li>Throughput under concurrency. The cache is one SQLite process.</li>
      </UL>
      <P>
        If you run MorrowCache on real traffic, the <code>/stats</code> page reports hit rate, latency
        percentiles and estimated savings. Sharing those numbers in a{" "}
        <A href="https://github.com/kushals256/jevcache/issues">GitHub issue</A> helps more than anything else.
      </P>
    </Article>
  )
}
