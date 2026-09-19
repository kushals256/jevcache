/** SPDX-License-Identifier: MIT */
type Entry<T> = {
  promise: Promise<T>;
};

export class SingleFlight {
  private inflight = new Map<string, Entry<unknown>>();

  async do<T>(key: string, fn: () => Promise<T>): Promise<{ value: T; shared: boolean }> {
    const existing = this.inflight.get(key) as Entry<T> | undefined;
    if (existing) {
      return { value: await existing.promise, shared: true };
    }
    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, { promise });
    return { value: await promise, shared: false };
  }

  size(): number {
    return this.inflight.size;
  }
}
