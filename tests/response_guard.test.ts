import { describe, expect, it } from "vitest";
import { isStorableCompletion } from "../src/response_guard.js";
import { assembleSseText, synthesizeHitSse } from "../src/stream_cache.js";

describe("response guard", () => {
  it("rejects tool_calls and empty content", () => {
    expect(
      isStorableCompletion({
        choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "1" }] }, finish_reason: "tool_calls" }],
      }).ok,
    ).toBe(false);
    expect(
      isStorableCompletion({
        choices: [{ message: { role: "assistant", content: "hello" }, finish_reason: "stop" }],
      }).ok,
    ).toBe(true);
  });

  it("rejects refusal, content_filter, function_call, and empty content", () => {
    expect(
      isStorableCompletion({
        choices: [{ message: { role: "assistant", content: "no", refusal: "nope" }, finish_reason: "stop" }],
      }).ok,
    ).toBe(false);
    expect(
      isStorableCompletion({
        choices: [{ message: { role: "assistant", content: "x" }, finish_reason: "content_filter" }],
      }).ok,
    ).toBe(false);
    expect(
      isStorableCompletion({
        choices: [{ message: { role: "assistant", content: "x", function_call: { name: "f", arguments: "{}" } }, finish_reason: "function_call" }],
      }).ok,
    ).toBe(false);
    expect(
      isStorableCompletion({
        choices: [{ message: { role: "assistant", content: "   " }, finish_reason: "stop" }],
      }).ok,
    ).toBe(false);
  });
});

describe("stream cache", () => {
  it("assembles DONE and synthesizes HIT sse", () => {
    const sse =
      'data: {"choices":[{"index":0,"delta":{"content":"hi"},"finish_reason":null}]}\n\ndata: [DONE]\n\n';
    const assembled = assembleSseText(sse, 10000);
    expect(assembled.status).toBe("stored_ready");
    if (assembled.status !== "stored_ready") return;
    const hit = synthesizeHitSse(assembled.completion, { id: "id", model: "m" });
    expect(hit).toContain("data: [DONE]");
    expect(hit).toContain("hi");
  });

  it("does not store tool deltas", () => {
    const sse =
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c","function":{"name":"f","arguments":"{}"}}]}}]}\n\ndata: [DONE]\n\n';
    expect(assembleSseText(sse, 10000).status).toBe("not_storable");
  });

  it("does not store a stream that never finishes", () => {
    const sse = 'data: {"choices":[{"delta":{"content":"hi"},"finish_reason":null}]}\n\n';
    expect(assembleSseText(sse, 10000).status).toBe("incomplete");
  });

  it("does not let an empty tool id wipe the real id", () => {
    const sse = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_real","function":{"name":"search","arguments":""}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"","function":{"arguments":"{}"}}]}}]}',
      "data: [DONE]",
    ].join("\n\n");
    const assembled = assembleSseText(sse + "\n\n", 10000);
    expect(assembled.status).toBe("not_storable");
    if (assembled.status !== "not_storable") return;
    const calls = (assembled.completion?.choices as { message?: { tool_calls?: { id: string }[] } }[] | undefined)?.[0]
      ?.message?.tool_calls;
    expect(calls?.[0]?.id).toBe("call_real");
  });

  it("synthesized HIT has one role chunk, one content chunk, and DONE", () => {
    const hit = synthesizeHitSse(
      { model: "m", choices: [{ message: { role: "assistant", content: "hello there" } }] },
      { id: "id", model: "m" },
    );
    const events = hit.split("\n\n").filter((p) => p.startsWith("data:") && !p.includes("[DONE]"));
    expect(events).toHaveLength(3);
    expect(hit).toContain('"role":"assistant"');
    expect(hit).toContain("hello there");
    expect(hit.endsWith("data: [DONE]\n\n") || hit.includes("data: [DONE]\n\n")).toBe(true);
  });
});
