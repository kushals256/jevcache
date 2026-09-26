import { ComparePage } from "./ComparePage"

export default function AlwaysCall() {
  return (
    <ComparePage
      title="vs always calling the model"
      lede="The default: every chat request hits the upstream model."
      wins={
        <p>
          Repeated and paraphrased questions stop paying twice. Agents that retry get a HIT instead
          of another full completion.
        </p>
      }
      loses={
        <p>
          Always-call is simplest and always fresh. No cache bugs, no wrong hits, no proxy to run.
          If volume is low, just call the model.
        </p>
      }
      take="Honest take: use always-call until repeats hurt. Then put Morrow on the baseURL."
    />
  )
}
