/** SPDX-License-Identifier: MIT */
import type { ChatRequest } from "./fingerprint.js";
import { normalizeContent } from "./fingerprint.js";

export type PolicyMode = "bypass" | "exact_only" | "full";

export type PolicyResult = {
  mode: PolicyMode;
  reason: string;
};

const VOLATILE = /\b(right now|as of today|current price|latest news|live score)\b/i;

function hasNonTextParts(messages: ChatRequest["messages"]): boolean {
  for (const m of messages ?? []) {
    const c = m.content;
    if (Array.isArray(c)) {
      for (const part of c) {
        if (part && typeof part === "object" && "type" in part) {
          const t = String((part as { type: string }).type);
          if (t !== "text") return true;
        }
      }
    }
  }
  return false;
}

export function decidePolicy(body: ChatRequest, temperatureMax: number): PolicyResult {
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return { mode: "bypass", reason: "empty_messages" };
  }
  if (body.stream === true) return { mode: "bypass", reason: "stream" };
  if (body.tools || body.functions || body.tool_choice || body.function_call) {
    return { mode: "bypass", reason: "tools" };
  }
  if ((body.n ?? 1) > 1) return { mode: "bypass", reason: "n_gt_1" };
  if ((messagesHaveToolRole(body))) return { mode: "bypass", reason: "tool_history" };
  if (hasNonTextParts(body.messages)) return { mode: "bypass", reason: "multimodal" };
  const temp = body.temperature;
  if (typeof temp === "number" && temp > temperatureMax) {
    return { mode: "exact_only", reason: "high_temperature" };
  }
  const last = [...(body.messages ?? [])].reverse().find((m) => m.role === "user");
  if (last && VOLATILE.test(normalizeContent(last.content))) {
    return { mode: "bypass", reason: "volatile" };
  }
  return { mode: "full", reason: "ok" };
}

function messagesHaveToolRole(body: ChatRequest): boolean {
  return (body.messages ?? []).some((m) => m.role === "tool" || m.role === "function");
}
