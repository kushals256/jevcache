/** SPDX-License-Identifier: MIT */
import { estimateJevCostUsd } from "../prices.js";
import { buildQuestions, buildState } from "./schema.js";
import type { AdmitRequest, AdmitResult, IntentAdjudicator } from "./types.js";

export type JevBackendOpts = {
  apiKey: string;
  model: string;
  /** Override Decisions API URL (alias for future System One hosts). */
  decisionsUrl?: string;
};

/**
 * TypeSafe Jev via OpenRouter Decisions API.
 * EMBEDDING_MODE must never call this path as a cosine-alone HIT — only this adjudicator admits.
 */
export function createJevAdjudicator(opts: JevBackendOpts): IntentAdjudicator {
  const url = opts.decisionsUrl || "https://openrouter.ai/api/alpha/decisions";
  return {
    name: "jev",
    async admit(req: AdmitRequest): Promise<AdmitResult> {
      if (!req.candidates.length) {
        return { ok: true, admit: false, noul: 0, best: "none", costUsd: 0 };
      }
      const askReuseFresh = !!req.askReuseFresh;
      const state = buildState(req.newText, req.candidates, req.maxStateChars);
      const questions = buildQuestions(req.candidates, askReuseFresh);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), req.timeoutMs);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/kushals256/jevcache",
            "X-Title": "jevcache",
          },
          body: JSON.stringify({
            model: opts.model,
            state,
            questions,
          }),
          signal: controller.signal,
        });
        const text = await res.text();
        if (!res.ok) {
          return { ok: false, error: `jev_http_${res.status}:${text.slice(0, 200)}`, costUsd: 0 };
        }
        const data = JSON.parse(text) as {
          answers?: {
            same_intent?: { noul?: number };
            reuse_fresh?: { noul?: number };
            best?: { choice?: string };
          };
          usage?: { input_tokens?: number; cost?: number };
        };
        const noul = Number(data.answers?.same_intent?.noul ?? 0);
        const reuseFresh = askReuseFresh ? Number(data.answers?.reuse_fresh?.noul ?? 0) : undefined;
        const best = String(data.answers?.best?.choice ?? "none");
        const ids = new Set(req.candidates.map((c) => c.id));
        const costUsd =
          typeof data.usage?.cost === "number"
            ? data.usage.cost
            : estimateJevCostUsd(data.usage?.input_tokens ?? Math.ceil(state.length / 4));
        const admit =
          noul >= req.threshold &&
          best !== "none" &&
          ids.has(best) &&
          (!askReuseFresh || (reuseFresh ?? 0) >= req.threshold);
        return { ok: true, admit, noul, reuseFresh, best, costUsd, raw: data };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg, costUsd: 0 };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
