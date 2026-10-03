import { describe, expect, it } from "vitest";
import {
  canonicalBody,
  exactKey,
  buildNamespace,
  systemHash,
  lastUserText,
  toolsHash,
  priorDigest,
  turnNamespace,
  normalizeJobId,
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

  it("toolsHash treats empty tools array like omit", () => {
    expect(toolsHash({ tools: [] })).toBe(toolsHash({}));
    expect(toolsHash({ functions: [] })).toBe(toolsHash({}));
  });

  it("priorDigest sentinel and job isolation", () => {
    const empty = priorDigest([{ role: "user", content: "hi" }], { maxMessages: 64, maxBytes: 10000 });
    expect(empty.priorEmpty).toBe(true);
    const withPrior = priorDigest(
      [
        { role: "user", content: "first" },
        { role: "assistant", content: "ok" },
        { role: "user", content: "second" },
      ],
      { maxMessages: 64, maxBytes: 10000 },
    );
    expect(withPrior.priorEmpty).toBe(false);
    expect(withPrior.digest).not.toBe(empty.digest);
    const a = turnNamespace("base", withPrior.digest, "job1", { crossPrior: false });
    const b = turnNamespace("base", "f".repeat(64), "job1", { crossPrior: false });
    expect(a).not.toBe(b);
    expect(a).toContain("|td:");
    const cross = turnNamespace("base", withPrior.digest, "job1", { crossPrior: true });
    expect(cross).toBe("base|job:job1");
    expect(normalizeJobId("bad id")).toBeNull();
    expect(normalizeJobId("ok.job")).toBe("ok.job");
  });

  it("parallel_tool_calls changes toolsHash", () => {
    expect(toolsHash({ parallel_tool_calls: true })).not.toBe(toolsHash({}));
  });

  it("digest byte cap drops a whole older message", () => {
    const messages = [
      { role: "user", content: "old ".repeat(40) },
      { role: "assistant", content: "kept" },
      { role: "user", content: "latest" },
    ];
    const tight = priorDigest(messages, { maxMessages: 64, maxBytes: 80 });
    const loose = priorDigest(messages, { maxMessages: 64, maxBytes: 100_000 });
    expect(tight.digest).toHaveLength(64);
    expect(tight.digest).not.toBe(loose.digest);
    expect(tight.priorEmpty).toBe(false);
  });
});

describe("policy", () => {
  it("turn cache allows stream and tools schema", () => {
    expect(decidePolicy({ messages: [{ role: "user", content: "x" }], stream: true }, 0.3).mode).toBe("full");
    expect(
      decidePolicy(
        {
          messages: [{ role: "user", content: "x" }],
          tools: [{ type: "function", function: { name: "x", parameters: {} } }],
        },
        0.3,
      ).mode,
    ).toBe("full");
  });
  it("TURN_CACHE off restores stream and tools bypass", () => {
    expect(
      decidePolicy({ messages: [{ role: "user", content: "x" }], stream: true }, 0.3, { turnCache: false }).reason,
    ).toBe("stream");
    expect(
      decidePolicy(
        {
          messages: [{ role: "user", content: "x" }],
          tools: [{ type: "function", function: { name: "x", parameters: {} } }],
        },
        0.3,
        { turnCache: false },
      ).reason,
    ).toBe("tools");
  });
  it("forced tool choice and logprobs bypass", () => {
    expect(
      decidePolicy({ messages: [{ role: "user", content: "x" }], tool_choice: "required" }, 0.3).reason,
    ).toBe("tool_choice_forced");
    expect(decidePolicy({ messages: [{ role: "user", content: "x" }], logprobs: true }, 0.3).reason).toBe("logprobs");
  });
  it("empty tools/functions arrays do not bypass", () => {
    expect(decidePolicy({ messages: [{ role: "user", content: "x" }], tools: [] }, 0.3).mode).toBe(
      "full",
    );
    expect(
      decidePolicy({ messages: [{ role: "user", content: "x" }], functions: [] }, 0.3).mode,
    ).toBe("full");
  });
  it("tool_choice none alone does not bypass; auto does", () => {
    expect(
      decidePolicy({ messages: [{ role: "user", content: "x" }], tool_choice: "none" }, 0.3).mode,
    ).toBe("full");
    expect(decidePolicy({ messages: [{ role: "user", content: "x" }], tool_choice: "auto" }, 0.3).mode).toBe(
      "full",
    );
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
