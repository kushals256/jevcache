/** Home page FAQ. Also emitted as FAQPage JSON-LD, so keep answers plain text. */
export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "Does it work with OpenRouter or any OpenAI-compatible API?",
    a: "Yes. Point the proxy at your upstream baseURL and your SDK at http://127.0.0.1:8080/v1. Upstream can be OpenAI, OpenRouter, or a local OpenAI-compatible server. Claude works when the client speaks that HTTP API. Chat Completions only: /v1/responses returns 501.",
  },
  {
    q: "Do I need TypeSafe Jev?",
    a: "Jev is the default same-intent judge and needs OPENROUTER_API_KEY. Or set ADJUDICATOR=kev|laya|laya-mlx|systemone for a local System One, and admits need no OpenRouter key. Without a judge ready, the proxy runs exact-only.",
  },
  {
    q: "What if the adjudicator fails?",
    a: "Fail-open. The real model still runs. A miss is always preferred over a wrong hit.",
  },
  {
    q: "Can wrong hits happen? What about streams and tools?",
    a: "Yes, wrong hits can happen. Tune the threshold, respect freshness, and read the X-Jevcache header. Final text can hit, including a later stream of that answer. Tool-call responses are never stored. TURN_CACHE is on by default for agent retries; TURN_CACHE=off restores the 1.x stream/tools bypass.",
  },
  {
    q: "Where do the numbers come from?",
    a: "Stars and npm downloads are fetched live, with a fallback if the fetch fails. 89 is the test count in this repo, not users or a benchmark. 2817ms → 423ms is one recorded run at intent 0.94. The 0.49 false-positive rate is offline word-overlap Jaccard@0.35, n=103: that is the overlap cache, not a MorrowCache rate.",
  },
]
