/** SPDX-License-Identifier: MIT */
export type UpstreamResult =
  | { ok: true; status: number; body: Record<string, unknown>; raw: string }
  | { ok: false; status: number; body: unknown; raw: string };

export async function forwardChatCompletions(opts: {
  baseUrl: string;
  apiKey: string;
  body: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<UpstreamResult> {
  if (process.env.MOCK_UPSTREAM === "1") {
    const b = opts.body as { model?: string; messages?: { role: string; content?: unknown }[] };
    const last = [...(b.messages ?? [])].reverse().find((m) => m.role === "user");
    const content = typeof last?.content === "string" ? last.content : "ok";
    const body = {
      id: "chatcmpl-mock",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: b.model ?? "mock",
      choices: [{ index: 0, message: { role: "assistant", content: `MOCK_ANSWER:${content}` }, finish_reason: "stop" }],
      usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
    };
    return { ok: true, status: 200, body, raw: JSON.stringify(body) };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`${opts.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts.body),
      signal: controller.signal,
    });
    const raw = await res.text();
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* keep raw */
    }
    if (!res.ok) {
      return { ok: false, status: res.status, body: parsed, raw };
    }
    return { ok: true, status: res.status, body: parsed as Record<string, unknown>, raw };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

export async function forwardModels(opts: {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}): Promise<UpstreamResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(`${opts.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${opts.apiKey}` },
      signal: controller.signal,
    });
    const raw = await res.text();
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* */
    }
    if (!res.ok) return { ok: false, status: res.status, body: parsed, raw };
    return { ok: true, status: res.status, body: parsed as Record<string, unknown>, raw };
  } finally {
    clearTimeout(timer);
  }
}

export function usageFromBody(body: Record<string, unknown>): {
  prompt: number;
  completion: number;
} {
  const u = (body.usage ?? {}) as Record<string, unknown>;
  return {
    prompt: Number(u.prompt_tokens ?? u.input_tokens ?? 0),
    completion: Number(u.completion_tokens ?? u.output_tokens ?? 0),
  };
}
