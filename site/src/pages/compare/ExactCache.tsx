import { ComparePage } from "./ComparePage"

export default function ExactCache() {
  return (
    <ComparePage
      slug="exact-cache"
      eyebrow="Exact bytes"
      title="vs exact-only cache"
      lede="Cache only when the request bytes match. Safe, narrow, and blind to “please explain mutexes.”"
      wins={
        <p>
          Paraphrases can HIT via intent adjudication instead of missing every time. Morrow still keeps an exact path
          for identical bytes, same-intent sits on top, fail-open if the judge fails.
        </p>
      }
      loses={
        <p>
          Exact-only has a simpler threat model: no adjudicator, fewer ways to be wrong. If traffic is already
          normalized to identical prompts, exact is enough and cheaper to reason about.
        </p>
      }
      take="Morrow includes exact hits and adds same-intent on top. Prefer a miss over a wrong hit."
    />
  )
}
