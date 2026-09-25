/** SPDX-License-Identifier: MIT */
import {
  buildQuestions,
  buildState,
  SYSTEMONE_MAX_CHOICE_CANDIDATES,
} from "./schema.js";
import type { AdmitRequest, AdmitResult, IntentAdjudicator } from "./types.js";

export type SystemOneBackendOpts = {
  /** Display name (laya, kev, systemone, …). */
  name: string;
  /** Full POST URL ending in /v1/systemone. */
  url: string;
  model: string;
  /** Optional Bearer token; omit header when empty (typical localhost). */
  apiKey?: string;
};

/**
 * Local / self-hosted System One (Kev, Laya, generic).
 * Fail-open: never throws into the request path.
 */
export function createSystemOneAdjudicator(opts: SystemOneBackendOpts): IntentAdjudicator {
  const url = opts.url;
  const model = opts.model;
  const apiKey = (opts.apiKey || "").trim();
  return {
    name: opts.name,
    async admit(req: AdmitRequest): Promise<AdmitResult> {
      if (!req.candidates.length) {
        return { ok: true, admit: false, noul: 0, best: "none", costUsd: 0 };
      }
      const askReuseFresh = !!req.askReuseFresh;
      const capped = req.candidates.slice(0, SYSTEMONE_MAX_CHOICE_CANDIDATES);
      const state = buildState(req.newText, capped, req.maxStateChars);
      const questions = buildQuestions(capped, askReuseFresh, {
        noulStyle: "criteria",
        choiceLabel: "text",
        maxCandidates: SYSTEMONE_MAX_CHOICE_CANDIDATES,
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), req.timeoutMs);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Title": "jevcache",
        };
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ model, state, questions }),
          signal: controller.signal,
        });
        const text = await res.text();
        if (!res.ok) {
          return {
            ok: false,
            error: `systemone_http_${res.status}:${text.slice(0, 200)}`,
            costUsd: 0,
          };
        }
        let data: {
          answers?: {
            same_intent?: { noul?: number };
            reuse_fresh?: { noul?: number };
            best?: { choice?: string };
          };
        };
        try {
          data = JSON.parse(text) as typeof data;
        } catch {
          return { ok: false, error: "systemone_bad_json", costUsd: 0 };
        }
        if (!data.answers || typeof data.answers !== "object") {
          return { ok: false, error: "systemone_missing_answers", costUsd: 0 };
        }
        const noul = Number(data.answers.same_intent?.noul ?? 0);
        const reuseFresh = askReuseFresh
          ? Number(data.answers.reuse_fresh?.noul ?? 0)
          : undefined;
        const best = String(data.answers.best?.choice ?? "none");
        const ids = new Set(capped.map((c) => c.id));
        const admit =
          Number.isFinite(noul) &&
          noul >= req.threshold &&
          best !== "none" &&
          ids.has(best) &&
          (!askReuseFresh || (reuseFresh ?? 0) >= req.threshold);
        return {
          ok: true,
          admit,
          noul: Number.isFinite(noul) ? noul : 0,
          reuseFresh,
          best,
          costUsd: 0,
          raw: data,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg, costUsd: 0 };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Always fail-open with a fixed error (misconfigured / unknown kind). */
export function createBrokenAdjudicator(name: string, error: string): IntentAdjudicator {
  return {
    name,
    async admit(): Promise<AdmitResult> {
      return { ok: false, error, costUsd: 0 };
    },
  };
}
