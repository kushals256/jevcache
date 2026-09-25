/** SPDX-License-Identifier: MIT */

/**
 * Normalize a System One base URL to end with `/v1/systemone`.
 * Accepts host-only, trailing slash, `/v1`, or already `/v1/systemone`.
 */
export function normalizeSystemOneUrl(input: string): string {
  let u = (input || "").trim();
  if (!u) return "";
  // Allow host:port without scheme → assume http for local
  if (!/^https?:\/\//i.test(u)) {
    u = `http://${u}`;
  }
  u = u.replace(/\/+$/, "");
  if (/\/v1\/systemone$/i.test(u)) return u;
  if (/\/v1$/i.test(u)) return `${u}/systemone`;
  return `${u}/v1/systemone`;
}
