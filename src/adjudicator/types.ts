/** SPDX-License-Identifier: MIT */
export type Candidate = { id: string; text: string };

export type AdmitResult =
  | {
      ok: true;
      admit: boolean;
      noul: number;
      reuseFresh?: number;
      best: string;
      costUsd: number;
      raw?: unknown;
    }
  | { ok: false; error: string; costUsd: number };

export type AdmitRequest = {
  newText: string;
  candidates: Candidate[];
  threshold: number;
  maxStateChars: number;
  timeoutMs: number;
  /** When true, also require reuse_fresh ≥ threshold (admit-v2). */
  askReuseFresh?: boolean;
};

/**
 * System One / decision-model sensor: should we reuse a cached answer?
 * Default product face is Jev; other backends plug in via the factory.
 */
export interface IntentAdjudicator {
  readonly name: string;
  admit(req: AdmitRequest): Promise<AdmitResult>;
}
