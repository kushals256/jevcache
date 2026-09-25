/** SPDX-License-Identifier: MIT */
import type { AdmitRequest, AdmitResult, IntentAdjudicator } from "./types.js";

/** Synthetic same-intent for demos / tests (MOCK_JEV=1 or ADJUDICATOR=mock). */
export function createMockAdjudicator(): IntentAdjudicator {
  return {
    name: "mock",
    async admit(req: AdmitRequest): Promise<AdmitResult> {
      if (!req.candidates.length) {
        return { ok: true, admit: false, noul: 0, best: "none", costUsd: 0 };
      }
      const askReuseFresh = !!req.askReuseFresh;
      const norm = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(Boolean));
      const A = norm(req.newText);
      let best = "none";
      let bestScore = 0;
      for (const c of req.candidates) {
        const B = norm(c.text);
        let inter = 0;
        for (const t of A) if (B.has(t)) inter++;
        const score = inter / (A.size + B.size - inter || 1);
        if (score > bestScore) {
          bestScore = score;
          best = c.id;
        }
      }
      const noul = bestScore;
      const reuseFresh = askReuseFresh ? noul : undefined;
      const admit =
        noul >= req.threshold &&
        best !== "none" &&
        (!askReuseFresh || (reuseFresh ?? 0) >= req.threshold);
      return {
        ok: true,
        admit,
        noul,
        reuseFresh,
        best: admit ? best : "none",
        costUsd: 0,
      };
    },
  };
}
