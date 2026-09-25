/** SPDX-License-Identifier: MIT */
import { describe, expect, it, vi, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import {
  createAdjudicator,
  createMockAdjudicator,
  createSystemOneAdjudicator,
  resolveAdjudicatorKind,
  resolveSystemOneEndpoint,
  adjudicatorReady,
  normalizeSystemOneUrl,
  ADMIT_SCHEMA_VERSION,
  buildState,
  buildQuestions,
  SYSTEMONE_MAX_CHOICE_CANDIDATES,
} from "../src/adjudicator/index.js";
import { loadConfig, type Config } from "../src/config.js";

function tmpCfg(over: Partial<Config> = {}): Config {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jev-adj-"));
  return {
    ...loadConfig(),
    dataDir: dir,
    mockJev: false,
    mockUpstream: true,
    openrouterApiKey: "",
    adjudicator: "jev",
    adjudicatorUrl: "",
    adjudicatorModel: "",
    adjudicatorApiKey: "",
    embeddingMode: "off",
    ...over,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adjudicator factory", () => {
  it("defaults to jev", () => {
    expect(resolveAdjudicatorKind(tmpCfg({ adjudicator: "jev" }))).toBe("jev");
    expect(resolveAdjudicatorKind(tmpCfg({ adjudicator: "" }))).toBe("jev");
  });

  it("MOCK_JEV / adjudicator=mock → mock", () => {
    expect(resolveAdjudicatorKind(tmpCfg({ mockJev: true }))).toBe("mock");
    expect(resolveAdjudicatorKind(tmpCfg({ adjudicator: "mock" }))).toBe("mock");
  });

  it("laya / kev resolve as System One kinds (no silent Jev)", () => {
    expect(resolveAdjudicatorKind(tmpCfg({ adjudicator: "laya" }))).toBe("laya");
    expect(resolveAdjudicatorKind(tmpCfg({ adjudicator: "kev" }))).toBe("kev");
    expect(resolveAdjudicatorKind(tmpCfg({ adjudicator: "systemone" }))).toBe("systemone");
  });

  it("unknown kind → unknown, not ready", () => {
    expect(resolveAdjudicatorKind(tmpCfg({ adjudicator: "ollama" }))).toBe("unknown");
    expect(adjudicatorReady(tmpCfg({ adjudicator: "ollama" }))).toBe(false);
    expect(createAdjudicator(tmpCfg({ adjudicator: "ollama" })).name).toBe("unknown");
  });

  it("kev ready without OpenRouter key", () => {
    const cfg = tmpCfg({ adjudicator: "kev", openrouterApiKey: "" });
    expect(adjudicatorReady(cfg)).toBe(true);
    expect(createAdjudicator(cfg).name).toBe("kev");
  });

  it("jev not ready without OpenRouter key", () => {
    const cfg = tmpCfg({ adjudicator: "jev", openrouterApiKey: "" });
    expect(adjudicatorReady(cfg)).toBe(false);
  });

  it("systemone requires URL + model", () => {
    expect(
      adjudicatorReady(tmpCfg({ adjudicator: "systemone", adjudicatorUrl: "" })),
    ).toBe(false);
    expect(
      adjudicatorReady(
        tmpCfg({
          adjudicator: "systemone",
          adjudicatorUrl: "http://127.0.0.1:9000",
          adjudicatorModel: "my-model",
        }),
      ),
    ).toBe(true);
  });

  it("createAdjudicator(mock) admits paraphrases", async () => {
    const adj = createAdjudicator(tmpCfg({ adjudicator: "mock" }));
    expect(adj.name).toBe("mock");
    const r = await adj.admit({
      newText: "Explain mutexes simply please",
      candidates: [{ id: "a", text: "Please explain mutexes simply" }],
      threshold: 0.5,
      maxStateChars: 8000,
      timeoutMs: 1000,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.admit).toBe(true);
  });

  it("state is DATA-only admit-v2", () => {
    const s = buildState("hello", [{ id: "a", text: "hi" }], 8000);
    expect(s).toContain(`SCHEMA=${ADMIT_SCHEMA_VERSION}`);
    expect(s).toContain("DATA only");
  });

  it("S1 questions use noul criteria + text labels", () => {
    const q = buildQuestions(
      [{ id: "a", text: "Please explain mutexes simply" }],
      true,
      { noulStyle: "criteria", choiceLabel: "text", maxCandidates: 7 },
    ) as {
      same_intent: { criteria?: { true?: string } };
      best: { criteria: Record<string, string> };
      reuse_fresh: { criteria?: { true?: string } };
    };
    expect(q.same_intent.criteria?.true).toBeTruthy();
    expect(q.reuse_fresh.criteria?.true).toBeTruthy();
    expect(q.best.criteria.a).toContain("mutexes");
    expect(q.best.criteria.none).toBe("No safe match");
  });

  it("EMBEDDING_MODE does not change adjudicator kind", () => {
    expect(resolveAdjudicatorKind(tmpCfg({ embeddingMode: "openai" }))).toBe("jev");
  });

  it("pivot: stub third backend is just another IntentAdjudicator", async () => {
    const stub = {
      name: "stub",
      admit: async () =>
        ({ ok: true, admit: false, noul: 0, best: "none", costUsd: 0 }) as const,
    };
    const r = await stub.admit({
      newText: "x",
      candidates: [],
      threshold: 0.85,
      maxStateChars: 100,
      timeoutMs: 1,
    });
    expect(r.ok).toBe(true);
    expect(createMockAdjudicator().name).toBe("mock");
  });
});

describe("normalizeSystemOneUrl", () => {
  it("normalizes host, /v1, and full path", () => {
    expect(normalizeSystemOneUrl("127.0.0.1:8008")).toBe(
      "http://127.0.0.1:8008/v1/systemone",
    );
    expect(normalizeSystemOneUrl("http://127.0.0.1:8000/v1")).toBe(
      "http://127.0.0.1:8000/v1/systemone",
    );
    expect(normalizeSystemOneUrl("http://127.0.0.1:8000/v1/systemone/")).toBe(
      "http://127.0.0.1:8000/v1/systemone",
    );
  });
});

describe("resolveSystemOneEndpoint", () => {
  it("defaults kev/laya ports and models", () => {
    const kev = resolveSystemOneEndpoint(tmpCfg({ adjudicator: "kev" }), "kev");
    expect(kev?.url).toContain(":8008");
    expect(kev?.model).toBe("kev-latest");
    const laya = resolveSystemOneEndpoint(tmpCfg({ adjudicator: "laya" }), "laya");
    expect(laya?.url).toContain(":8000");
    expect(laya?.model).toBe("laya-latest");
  });
});

describe("System One HTTP client", () => {
  it("admits when mock S1 returns same_intent + best", async () => {
    const server = http.createServer((req, res) => {
      expect(req.method).toBe("POST");
      expect(req.url).toBe("/v1/systemone");
      expect(req.headers["x-title"]).toBe("jevcache");
      expect(req.headers.authorization).toBeUndefined();
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const parsed = JSON.parse(body) as {
          questions: {
            same_intent: { criteria?: unknown };
            best: { criteria: Record<string, string> };
          };
        };
        expect(parsed.questions.same_intent.criteria).toBeTruthy();
        expect(parsed.questions.best.criteria.a).toContain("mutexes");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            answers: {
              same_intent: { noul: 0.95 },
              best: { choice: "a" },
            },
          }),
        );
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as { port: number };
    const adj = createSystemOneAdjudicator({
      name: "kev",
      url: `http://127.0.0.1:${port}/v1/systemone`,
      model: "kev-latest",
    });
    const r = await adj.admit({
      newText: "Explain mutexes simply please",
      candidates: [{ id: "a", text: "Please explain mutexes simply" }],
      threshold: 0.85,
      maxStateChars: 8000,
      timeoutMs: 5000,
    });
    server.close();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.admit).toBe(true);
      expect(r.best).toBe("a");
      expect(r.costUsd).toBe(0);
    }
  });

  it("fail-open on connection refused", async () => {
    const adj = createSystemOneAdjudicator({
      name: "kev",
      url: "http://127.0.0.1:1/v1/systemone",
      model: "kev-latest",
    });
    const r = await adj.admit({
      newText: "x",
      candidates: [{ id: "a", text: "y" }],
      threshold: 0.85,
      maxStateChars: 100,
      timeoutMs: 500,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.costUsd).toBe(0);
  });

  it("caps candidates at SYSTEMONE_MAX_CHOICE_CANDIDATES", () => {
    expect(SYSTEMONE_MAX_CHOICE_CANDIDATES).toBe(7);
  });
});
