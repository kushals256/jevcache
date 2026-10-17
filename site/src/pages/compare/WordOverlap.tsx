import { ComparePage } from "./ComparePage"

export default function WordOverlap() {
  return (
    <ComparePage
      slug="word-overlap"
      eyebrow="Token overlap"
      title="vs word-overlap (Jaccard)"
      lede="Treat high token overlap as “the same question.” Cheap, local, and noisy, especially on freshness."
      wins={
        <p>
          Intent adjudication plus freshness refuse. Offline Jaccard@0.35 on n=103 showed false-positive rate 0.49,
          that number is the overlap cache, not Morrow. Overlap alone is not a safe primary gate here.
        </p>
      }
      loses={
        <p>
          Overlap is local, fast, and needs no model judge. For toy demos or ultra-constrained vocabularies it can look
          fine. It does not know “what’s the latest,” and it will happily hit the wrong FAQ.
        </p>
      }
      take="We measured overlap and rejected it as the primary gate. Prefer miss over wrong hit."
    />
  )
}
