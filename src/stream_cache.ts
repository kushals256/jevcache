/** SPDX-License-Identifier: MIT */
import { flattenAssistantContent, isStorableCompletion } from "./response_guard.js";

export type StreamAssembleResult =
  | { status: "stored_ready"; completion: Record<string, unknown> }
  | { status: "not_storable"; reason: string; completion?: Record<string, unknown> }
  | { status: "incomplete"; reason: "stream_incomplete" | "stream_too_large" | "upstream_error" | "client_abort" };

type ToolAcc = { id: string; type: string; name: string; arguments: string };

export async function teeAndAssemble(opts: {
  upstreamBody: ReadableStream<Uint8Array>;
  onChunk: (bytes: Uint8Array) => void;
  maxBytes: number;
  signal?: AbortSignal;
}): Promise<StreamAssembleResult> {
  const reader = opts.upstreamBody.getReader();
  const dec = new TextDecoder();
  let pending = "";
  let bytes = 0;
  let tooLarge = false;
  const acc = createAccumulator();
  try {
    for (;;) {
      if (opts.signal?.aborted) {
        return { status: "incomplete", reason: "client_abort" };
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      opts.onChunk(value);
      bytes += value.byteLength;
      if (bytes > opts.maxBytes) {
        tooLarge = true;
        pending = "";
        continue;
      }
      if (tooLarge) continue;
      pending += dec.decode(value, { stream: true });
      const parts = pending.split("\n\n");
      pending = parts.pop() ?? "";
      for (const part of parts) ingestEvent(acc, part);
    }
    if (!tooLarge && pending.trim()) ingestEvent(acc, pending);
  } catch {
    return { status: "incomplete", reason: "upstream_error" };
  } finally {
    reader.releaseLock();
  }
  if (tooLarge) return { status: "incomplete", reason: "stream_too_large" };
  if (!acc.done) return { status: "incomplete", reason: "stream_incomplete" };
  if (acc.sawTools) return { status: "not_storable", reason: "tool_calls", completion: acc.toCompletion() };
  const completion = acc.toCompletion();
  const check = isStorableCompletion(completion);
  if (!check.ok) return { status: "not_storable", reason: check.reason };
  return { status: "stored_ready", completion };
}

export function assembleSseText(sse: string, maxBytes: number): StreamAssembleResult {
  if (new TextEncoder().encode(sse).byteLength > maxBytes) {
    return { status: "incomplete", reason: "stream_too_large" };
  }
  const acc = createAccumulator();
  for (const part of sse.split("\n\n")) ingestEvent(acc, part);
  if (!acc.done) return { status: "incomplete", reason: "stream_incomplete" };
  if (acc.sawTools) return { status: "not_storable", reason: "tool_calls", completion: acc.toCompletion() };
  const completion = acc.toCompletion();
  const check = isStorableCompletion(completion);
  if (!check.ok) return { status: "not_storable", reason: check.reason };
  return { status: "stored_ready", completion };
}

export function synthesizeHitSse(
  completion: Record<string, unknown>,
  meta: { model?: string; id?: string },
): string {
  const created = Math.floor(Date.now() / 1000);
  const id = meta.id ?? "chatcmpl-jevcache";
  const model = meta.model ?? String(completion.model ?? "unknown");
  const msg = ((completion.choices as { message?: unknown }[] | undefined)?.[0]?.message) ?? {};
  const content = flattenAssistantContent(msg);
  const base = { id, object: "chat.completion.chunk", created, model };
  const role = {
    ...base,
    choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
  };
  const delta = {
    ...base,
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  };
  const stop = {
    ...base,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
  return `data: ${JSON.stringify(role)}\n\ndata: ${JSON.stringify(delta)}\n\ndata: ${JSON.stringify(stop)}\n\ndata: [DONE]\n\n`;
}

type Acc = {
  id?: string;
  model?: string;
  content: string;
  finish: string | null;
  tools: Map<number, ToolAcc>;
  sawTools: boolean;
  done: boolean;
  usage?: Record<string, unknown>;
  toCompletion: () => Record<string, unknown>;
};

function createAccumulator(): Acc {
  const tools = new Map<number, ToolAcc>();
  const acc: Acc = {
    content: "",
    finish: null,
    tools,
    sawTools: false,
    done: false,
    toCompletion() {
      const toolCalls = [...tools.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, t]) => ({
          id: t.id,
          type: t.type || "function",
          function: { name: t.name, arguments: t.arguments },
        }));
      const message: Record<string, unknown> = {
        role: "assistant",
        content: acc.content || null,
      };
      if (toolCalls.length) message.tool_calls = toolCalls;
      return {
        id: acc.id ?? "chatcmpl-assembled",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: acc.model ?? "unknown",
        choices: [
          {
            index: 0,
            message,
            finish_reason: acc.sawTools ? "tool_calls" : (acc.finish ?? "stop"),
          },
        ],
        usage: acc.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    },
  };
  return acc;
}

function ingestEvent(acc: Acc, block: string): void {
  const lines = block.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) continue;
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") {
      acc.done = true;
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      continue;
    }
    if (!json || typeof json !== "object") continue;
    const obj = json as {
      id?: string;
      model?: string;
      usage?: Record<string, unknown>;
      choices?: { delta?: Record<string, unknown>; finish_reason?: string | null }[];
    };
    if (obj.id) acc.id = obj.id;
    if (obj.model) acc.model = obj.model;
    if (obj.usage) acc.usage = obj.usage;
    const choice = obj.choices?.[0];
    if (!choice) continue;
    if (choice.finish_reason) acc.finish = choice.finish_reason;
    const delta = choice.delta ?? {};
    if (typeof delta.content === "string") acc.content += delta.content;
    const tc = delta.tool_calls;
    if (Array.isArray(tc)) {
      acc.sawTools = true;
      for (const raw of tc) mergeTool(acc.tools, raw);
    }
    if (delta.function_call) acc.sawTools = true;
  }
}

function mergeTool(map: Map<number, ToolAcc>, raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const d = raw as {
    index?: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  };
  const index = typeof d.index === "number" ? d.index : 0;
  const cur = map.get(index) ?? { id: "", type: "function", name: "", arguments: "" };
  if (d.id && !cur.id) cur.id = d.id;
  if (d.type && !cur.type) cur.type = d.type;
  if (d.function?.name && !cur.name) cur.name = d.function.name;
  if (typeof d.function?.arguments === "string") cur.arguments += d.function.arguments;
  map.set(index, cur);
}
