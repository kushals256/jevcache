/** SPDX-License-Identifier: MIT */

export type StoreCheck = { ok: true } | { ok: false; reason: string };

type Choice = {
  message?: {
    content?: unknown;
    refusal?: unknown;
    tool_calls?: unknown;
    function_call?: unknown;
  };
  finish_reason?: string | null;
};

function choicesOf(completion: unknown): Choice[] | null {
  if (!completion || typeof completion !== "object") return null;
  const choices = (completion as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  return choices as Choice[];
}

export function assistantHasToolCalls(completion: unknown): boolean {
  const choices = choicesOf(completion);
  if (!choices) return false;
  for (const ch of choices) {
    const msg = ch.message;
    if (Array.isArray(msg?.tool_calls) && msg.tool_calls.length > 0) return true;
    if (msg?.function_call != null && msg.function_call !== "") return true;
    const fr = ch.finish_reason;
    if (fr === "tool_calls" || fr === "function_call") return true;
  }
  return false;
}

export function flattenAssistantContent(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (content == null) return "";
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && (part as { type?: string }).type === "text") {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function contentHasNonText(message: unknown): boolean {
  if (!message || typeof message !== "object") return false;
  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content)) return false;
  return content.some(
    (part) => part && typeof part === "object" && "type" in part && (part as { type?: string }).type !== "text",
  );
}

export function isStorableCompletion(completion: unknown): StoreCheck {
  if (!completion || typeof completion !== "object") return { ok: false, reason: "not_object" };
  const choices = (completion as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return { ok: false, reason: "no_choices" };
  if (choices.length !== 1) return { ok: false, reason: "n_gt_1" };
  if (assistantHasToolCalls(completion)) return { ok: false, reason: "tool_calls" };
  const ch = choices[0] as Choice;
  if (ch.finish_reason === "content_filter") return { ok: false, reason: "content_filter" };
  const refusal = ch.message?.refusal;
  if (typeof refusal === "string" && refusal.trim()) return { ok: false, reason: "refusal" };
  if (contentHasNonText(ch.message)) return { ok: false, reason: "multimodal_response" };
  if (!flattenAssistantContent(ch.message).trim()) return { ok: false, reason: "empty_content" };
  return { ok: true };
}

export function parseChatCompletionJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
