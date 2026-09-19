import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CacheStore } from "../src/store/sqlite.js";
import { SingleFlight } from "../src/singleflight.js";

describe("CacheStore", () => {
  let dir: string;
  let store: CacheStore;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jevcache-"));
    store = new CacheStore(dir);
  });
  afterEach(() => {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("roundtrips exact key", () => {
    const e = store.upsert(
      {
        namespace: "ns",
        exact_key: "k1",
        user_text: "hello",
        response_json: "{\"ok\":true}",
        model: "m",
        prompt_tokens: 1,
        completion_tokens: 2,
        est_cost_usd: 0.01,
        created_at: Date.now(),
        expires_at: Date.now() + 60_000,
      },
      100,
    );
    expect(store.getByExactKey("k1")?.id).toBe(e.id);
  });

  it("expires", () => {
    store.upsert(
      {
        namespace: "ns",
        exact_key: "k2",
        user_text: "x",
        response_json: "{}",
        model: "m",
        prompt_tokens: 0,
        completion_tokens: 0,
        est_cost_usd: 0,
        created_at: Date.now(),
        expires_at: Date.now() - 1,
      },
      100,
    );
    expect(store.getByExactKey("k2")).toBeNull();
  });
});

describe("SingleFlight", () => {
  it("coalesces concurrent work", async () => {
    const sf = new SingleFlight();
    let n = 0;
    const work = () =>
      new Promise<number>((r) =>
        setTimeout(() => {
          n += 1;
          r(n);
        }, 50),
      );
    const [a, b] = await Promise.all([sf.do("k", work), sf.do("k", work)]);
    expect(a.value).toBe(1);
    expect(b.value).toBe(1);
    expect(a.shared || b.shared).toBe(true);
  });
});
