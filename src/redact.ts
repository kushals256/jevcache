/** SPDX-License-Identifier: MIT */
const PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{10,}\b/g,
  /\bsk-or-v1-[A-Za-z0-9_-]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9._\-]+/gi,
  /\bapi[_-]?key\s*[:=]\s*['\"]?[A-Za-z0-9._\-]{8,}/gi,
  /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
];

export function redactSecrets(text: string): { text: string; redacted: boolean } {
  let out = text;
  let redacted = false;
  for (const re of PATTERNS) {
    const next = out.replace(re, "[REDACTED]");
    if (next !== out) redacted = true;
    out = next;
  }
  return { text: out, redacted };
}

export function preview(text: string, n = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}
