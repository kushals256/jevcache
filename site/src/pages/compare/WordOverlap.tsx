import { ComparePage } from "./ComparePage"

export default function WordOverlap() {
  return (
    <ComparePage
      title="vs word-overlap (Jaccard)"
      lede="Treat high token overlap as “the same question.” Cheap, noisy."
      wins={
        <p>
          Intent adjudication plus freshness refuse. Offline Jaccard@0.35 on n=103 showed FPR 0.49 —
          overlap alone is not a safe adjudicator for this product.
        </p>
      }
      loses={
        <p>
          Overlap is local, fast, and needs no model judge. For toy demos or ultra-constrained
          vocabularies it can look fine. It does not know “latest.”
        </p>
      }
      take="Honest take: we measured overlap and rejected it as the primary gate. Prefer miss over wrong hit."
    />
  )
}
