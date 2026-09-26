import { ComparePage } from "./ComparePage"

export default function ExactCache() {
  return (
    <ComparePage
      title="vs exact-only cache"
      lede="Cache only when the request bytes match. Safe, narrow."
      wins={
        <p>
          Paraphrases (“explain mutexes” vs “please explain mutexes”) can HIT via intent
          adjudication instead of missing every time.
        </p>
      }
      loses={
        <p>
          Exact-only has a simpler threat model: no adjudicator, fewer ways to be wrong. If your
          traffic is already normalized to identical prompts, exact is enough.
        </p>
      }
      take="Honest take: Morrow includes exact hits and adds same-intent on top, with fail-open."
    />
  )
}
