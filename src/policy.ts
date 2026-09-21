/** SPDX-License-Identifier: MIT */
import type { ChatRequest } from "./fingerprint.js";
import { normalizeContent } from "./fingerprint.js";
import { classifyFreshness, type FreshnessClass } from "./freshness.js";

export type PolicyMode = "bypass" | "exact_only" | "full";

export type PolicyResult = {
  mode: PolicyMode;
  reason: string;
  freshness: FreshnessClass;
};

/** Rollback path when FRESHNESS_MODE=off */
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

export function decidePolicy(
  body: ChatRequest,
  temperatureMax: number,
  opts?: { freshnessMode?: "on" | "off" },
): PolicyResult {
  const freshnessMode = opts?.freshnessMode ?? "on";

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return { mode: "bypass", reason: "empty_messages", freshness: "stable" };
  }
  if (body.stream === true) return { mode: "bypass", reason: "stream", freshness: "stable" };
  if (body.tools || body.functions || body.tool_choice || body.function_call) {
    return { mode: "bypass", reason: "tools", freshness: "stable" };
  }
  if ((body.n ?? 1) > 1) return { mode: "bypass", reason: "n_gt_1", freshness: "stable" };
  if (messagesHaveToolRole(body)) return { mode: "bypass", reason: "tool_history", freshness: "stable" };
  if (hasNonTextParts(body.messages)) return { mode: "bypass", reason: "multimodal", freshness: "stable" };

  const last = [...(body.messages ?? [])].reverse().find((m) => m.role === "user");
  const lastText = last ? normalizeContent(last.content) : "";

  let freshness: FreshnessClass = "stable";
  if (freshnessMode === "off") {
    if (last && VOLATILE.test(lastText)) {
      return { mode: "bypass", reason: "volatile", freshness: "stable" };
    }
  } else {
    freshness = classifyFreshness(lastText);
    // Live wins over exact_only (high temperature)
    if (freshness === "live") {
      return { mode: "bypass", reason: "freshness_live", freshness };
    }
  }

  const temp = body.temperature;
  if (typeof temp === "number" && temp > temperatureMax) {
    return { mode: "exact_only", reason: "high_temperature", freshness };
  }

  return { mode: "full", reason: "ok", freshness };
}

function messagesHaveToolRole(body: ChatRequest): boolean {
  return (body.messages ?? []).some((m) => m.role === "tool" || m.role === "function");
}
