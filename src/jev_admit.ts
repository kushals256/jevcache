/** SPDX-License-Identifier: MIT
 * Compatibility facade — prefer createAdjudicator() from ./adjudicator/index.js
 */
import { createAdjudicator, createMockAdjudicator, createJevAdjudicator } from "./adjudicator/index.js";
import type { AdmitResult, Candidate } from "./adjudicator/types.js";
import { loadConfig } from "./config.js";

export { ADMIT_SCHEMA_VERSION } from "./adjudicator/schema.js";
export type { AdmitResult, Candidate } from "./adjudicator/types.js";

/**
 * @deprecated Prefer createAdjudicator(cfg).admit(...) — kept for eval/scripts.
 * When MOCK_JEV=1 uses mock; otherwise builds from loadConfig() so ADJUDICATOR=* is honored
 * if opts are omitted-compatible. Explicit apiKey+model still create Jev for LIVE eval.
 */
export async function admitSameIntent(opts: {
  apiKey: string;
  model: string;
  newText: string;
  candidates: Candidate[];
  threshold: number;
  maxStateChars: number;
  timeoutMs: number;
  askReuseFresh?: boolean;
}): Promise<AdmitResult> {
  const backend =
    process.env.MOCK_JEV === "1"
      ? createMockAdjudicator()
      : process.env.ADJUDICATOR &&
          process.env.ADJUDICATOR !== "jev" &&
          process.env.ADJUDICATOR !== "mock"
        ? createAdjudicator(loadConfig())
        : createJevAdjudicator({ apiKey: opts.apiKey, model: opts.model });
  return backend.admit({
    newText: opts.newText,
    candidates: opts.candidates,
    threshold: opts.threshold,
    maxStateChars: opts.maxStateChars,
    timeoutMs: opts.timeoutMs,
    askReuseFresh: opts.askReuseFresh,
  });
}
