import { ComparePage } from "./ComparePage"

export default function AlwaysCall() {
  return (
    <ComparePage
      slug="always-call"
      eyebrow="The baseline"
      title="vs always calling the model"
      lede="The default: every chat request hits the upstream model. Simple, fresh, and expensive on repeats."
      wins={
        <p>
          Repeated and paraphrased questions stop paying twice. Agents that retry the same job can HIT on final text
          instead of another full completion. Tool-call steps still run, we never store those.
        </p>
      }
      loses={
        <p>
          Always-call is simplest and always fresh. No cache bugs, no wrong hits, no proxy to run. If volume is low or
          every answer must be live, just call the model.
        </p>
      }
      take="Use always-call until repeats hurt. Then point baseURL at Morrow and keep fail-open on."
    />
  )
}
