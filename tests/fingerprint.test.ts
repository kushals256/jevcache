import { describe, expect, it } from "vitest";
import {
  canonicalBody,
  exactKey,
  buildNamespace,
  systemHash,
  lastUserText,
} from "../src/fingerprint.js";
import { decidePolicy } from "../src/policy.js";
import { redactSecrets } from "../src/redact.js";

describe("fingerprint", () => {
  it("stable exact key ignores stream", () => {
    const ns = "t|m|sys|tools|0";
    const a = exactKey(ns, { model: "m", messages: [{ role: "user", content: "hi" }], stream: true });
    const b = exactKey(ns, { model: "m", messages: [{ role: "user", content: "hi" }], stream: false });
    expect(a).toBe(b);
  });

  it("system hash changes with system prompt", () => {
    const a = systemHash([{ role: "system", content: "A" }, { role: "user", content: "q" }]);
    const b = systemHash([{ role: "system", content: "B" }, { role: "user", content: "q" }]);
    expect(a).not.toBe(b);
  });

  it("lastUserText", () => {
    expect(lastUserText([{ role: "user", content: "  hello   world " }])).toBe("hello world");
  });

  it("canonical drops transport keys", () => {
    const c = canonicalBody({ model: "x", stream: true, metadata: { a: 1 }, messages: [] });
    expect(c.stream).toBeUndefined();
    expect(c.metadata).toBeUndefined();
    expect(c.model).toBe("x");
  });

  it("namespace joins parts", () => {
    expect(buildNamespace({ tenant: "t", model: "m", systemHash: "abcdefghijklmnop", toolsHash: "1234567890abcdef", temperatureBucket: "0" })).toContain("t|m|");
  });
});

describe("policy", () => {
  it("bypasses stream and tools", () => {
    expect(decidePolicy({ messages: [{ role: "user", content: "x" }], stream: true }, 0.3).mode).toBe("bypass");
    expect(decidePolicy({ messages: [{ role: "user", content: "x" }], tools: [] }, 0.3).reason).toBe("tools");
  });
  it("exact_only for high temperature", () => {
    const r = decidePolicy({ messages: [{ role: "user", content: "x" }], temperature: 0.9 }, 0.3);
    expect(r.mode).toBe("exact_only");
    expect(r.freshness).toBe("stable");
  });
  it("full for normal", () => {
    const r = decidePolicy({ messages: [{ role: "user", content: "explain sorting" }], temperature: 0 }, 0.3);
    expect(r.mode).toBe("full");
    expect(r.freshness).toBe("stable");
  });
});

describe("redact", () => {
  it("masks sk keys", () => {
    const r = redactSecrets("key sk-abcdefghijklmnopqrstuvwxyz");
    expect(r.redacted).toBe(true);
    expect(r.text).toContain("[REDACTED]");
  });
});
