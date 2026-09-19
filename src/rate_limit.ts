/** SPDX-License-Identifier: MIT */
type Bucket = { tokens: number; updated: number };

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(private rpm: number) {}

  allow(key: string): boolean {
    if (this.rpm <= 0) return true;
    const now = Date.now();
    const rate = this.rpm / 60_000;
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.rpm, updated: now };
      this.buckets.set(key, b);
    }
    const elapsed = now - b.updated;
    b.tokens = Math.min(this.rpm, b.tokens + elapsed * rate);
    b.updated = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }
}
