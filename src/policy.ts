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

function isActiveToolChoice(v: unknown): boolean {
  if (v == null) return false;
  if (v === "none") return false;
  return true; // "auto" | "required" | { type: "function", ... }
}

/** True when the request carries real tool surface (empty arrays do not count). */
export function hasActiveTools(body: ChatRequest): boolean {
  if (Array.isArray(body.tools)) {
    if (body.tools.length > 0) return true;
  } else if (body.tools) {
    return true;
  }
  if (Array.isArray(body.functions)) {
    if (body.functions.length > 0) return true;
  } else if (body.functions) {
    return true;
  }
  if (isActiveToolChoice(body.tool_choice)) return true;
  if (isActiveToolChoice(body.function_call)) return true;
  return false;
}

/** Forced tool choice. `"auto"` and `"none"` stay eligible when turn cache is on. */
export function isToolChoiceForced(body: ChatRequest): boolean {
  const tc = body.tool_choice;
  if (tc === "required") return true;
  if (tc && typeof tc === "object") return true;
  const fc = body.function_call;
  if (fc && typeof fc === "object") return true;
  if (typeof fc === "string" && fc !== "none" && fc !== "auto") return true;
  return false;
}

function hasLogprobs(body: ChatRequest): boolean {
  if (body.logprobs === true) return true;
  if (typeof body.top_logprobs === "number" && body.top_logprobs > 0) return true;
  return false;
}

function hasAudio(body: ChatRequest): boolean {
  if (body.audio) return true;
  const mods = body.modalities;
  if (Array.isArray(mods) && mods.some((m) => String(m) === "audio")) return true;
  return false;
}

function hasUserMessage(body: ChatRequest): boolean {
  return (body.messages ?? []).some((m) => m && m.role === "user");
}

export function decidePolicy(
  body: ChatRequest,
  temperatureMax: number,
  opts?: { freshnessMode?: "on" | "off"; turnCache?: boolean },
): PolicyResult {
  const freshnessMode = opts?.freshnessMode ?? "on";
  const turnCache = opts?.turnCache !== false;

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return { mode: "bypass", reason: "empty_messages", freshness: "stable" };
  }
  if (!hasUserMessage(body)) {
    return { mode: "bypass", reason: "no_user_message", freshness: "stable" };
  }
  if (!turnCache && body.stream === true) return { mode: "bypass", reason: "stream", freshness: "stable" };
  if (!turnCache && hasActiveTools(body)) {
    return { mode: "bypass", reason: "tools", freshness: "stable" };
  }
  if (!turnCache && messagesHaveToolRole(body)) {
    return { mode: "bypass", reason: "tool_history", freshness: "stable" };
  }
  if (isToolChoiceForced(body)) {
    return { mode: "bypass", reason: "tool_choice_forced", freshness: "stable" };
  }
  if (hasLogprobs(body)) return { mode: "bypass", reason: "logprobs", freshness: "stable" };
  if (hasAudio(body)) return { mode: "bypass", reason: "audio", freshness: "stable" };
  if ((body.n ?? 1) > 1) return { mode: "bypass", reason: "n_gt_1", freshness: "stable" };
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
