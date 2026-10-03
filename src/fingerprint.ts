/** SPDX-License-Identifier: MIT */
import { createHash } from "node:crypto";

const TRANSPORT_ONLY = new Set([
  "stream",
  "cache",
  "cache_control",
  "metadata",
  "stream_options",
  "prompt_cache_key",
  "prompt_cache_retention",
  "prompt_cache_options",
  "store",
]);

export type ChatMessage = {
  role: string;
  content?: unknown;
  name?: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  function_call?: unknown;
};

export type ChatRequest = {
  model?: string;
  messages?: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: unknown;
  max_tokens?: number;
  max_completion_tokens?: number;
  seed?: number;
  tools?: unknown;
  functions?: unknown;
  tool_choice?: unknown;
  function_call?: unknown;
  parallel_tool_calls?: unknown;
  response_format?: unknown;
  logit_bias?: unknown;
  user?: string;
  [key: string]: unknown;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function canonicalBody(body: ChatRequest): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    if (TRANSPORT_ONLY.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function systemHash(messages: ChatMessage[] | undefined): string {
  const systems = (messages ?? [])
    .filter((m) => m.role === "system")
    .map((m) => normalizeContent(m.content));
  return sha256(stableStringify(systems));
}

/** Empty tools/functions arrays hash like omit/null so SDKs sending `tools: []` share namespace. */
function normalizeToolsField(v: unknown): unknown {
  if (Array.isArray(v) && v.length === 0) return null;
  return v ?? null;
}

export function toolsHash(body: ChatRequest): string {
  return sha256(
    stableStringify({
      tools: normalizeToolsField(body.tools),
      tool_choice: body.tool_choice ?? null,
      functions: normalizeToolsField(body.functions),
      function_call: body.function_call ?? null,
      parallel_tool_calls: body.parallel_tool_calls ?? null,
    }),
  );
}

export function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content.trim().replace(/\s+/g, " ");
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in (part as object)) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join(" ")
      .trim()
      .replace(/\s+/g, " ");
  }
  if (content == null) return "";
  return String(content);
}

export function lastUserText(messages: ChatMessage[] | undefined): string {
  if (!messages?.length) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return normalizeContent(messages[i].content);
  }
  return "";
}

export function temperatureBucket(temp: number | undefined, max: number): string {
  if (temp == null) return "default";
  if (temp > max) return `high:${temp}`;
  return String(Math.round(temp * 100) / 100);
}

export type NamespaceParts = {
  tenant: string;
  model: string;
  systemHash: string;
  toolsHash: string;
  temperatureBucket: string;
};

export function buildNamespace(parts: NamespaceParts): string {
  return [parts.tenant, parts.model, parts.systemHash.slice(0, 16), parts.toolsHash.slice(0, 16), parts.temperatureBucket].join("|");
}

export function exactKey(namespace: string, body: ChatRequest): string {
  return sha256(`${namespace}\n${stableStringify(canonicalBody(body))}`);
}

/** Messages before the last user turn, then the newest `maxMessages` of that prefix. */
export function priorMessages(messages: ChatMessage[] | undefined, maxMessages: number): ChatMessage[] {
  const list = messages ?? [];
  let lastUser = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i] && list[i].role === "user") {
      lastUser = i;
      break;
    }
  }
  const prior = lastUser === -1 ? list.slice() : list.slice(0, lastUser);
  const cap = Math.max(0, maxMessages);
  if (prior.length <= cap) return prior;
  return prior.slice(prior.length - cap);
}

function normalizePriorMessage(m: ChatMessage): Record<string, unknown> {
  return {
    role: m.role,
    name: m.name ?? null,
    tool_call_id: m.tool_call_id ?? null,
    tool_calls: m.tool_calls ?? null,
    function_call: m.function_call ?? null,
    content: normalizeContent(m.content),
  };
}

export function priorDigest(
  messages: ChatMessage[] | undefined,
  opts: { maxMessages: number; maxBytes: number },
): { digest: string; priorEmpty: boolean } {
  const windowed = priorMessages(messages, opts.maxMessages);
  const priorEmpty = windowed.length === 0;
  let prior = windowed;
  while (prior.length > 0 && stableStringify(prior.map(normalizePriorMessage)).length > opts.maxBytes) {
    prior = prior.slice(1);
  }
  if (prior.length === 0) {
    return {
      digest: sha256(priorEmpty ? "__empty_prior__" : "__truncated_prior__"),
      priorEmpty,
    };
  }
  return { digest: sha256(stableStringify(prior.map(normalizePriorMessage))), priorEmpty: false };
}

export function normalizeJobId(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t.length < 1 || t.length > 128) return null;
  if (!/^[A-Za-z0-9._:/-]+$/.test(t)) return null;
  return t;
}

export function turnNamespace(
  baseNs: string,
  priorDigestHex: string,
  jobId: string | null,
  opts: { crossPrior: boolean },
): string {
  const prior16 = priorDigestHex.slice(0, 16);
  if (opts.crossPrior && jobId) return `${baseNs}|job:${jobId}`;
  if (jobId) return `${baseNs}|job:${jobId}|td:${prior16}`;
  return `${baseNs}|td:${prior16}|job:${prior16}`;
}

export function isTurnTier(priorEmpty: boolean): boolean {
  return !priorEmpty;
}

/** Last prior message is an assistant turn still waiting on tool results. */
export function priorEndsWithPendingToolCalls(
  messages: ChatMessage[] | undefined,
  maxMessages: number,
): boolean {
  const prior = priorMessages(messages, maxMessages);
  const last = prior[prior.length - 1];
  if (!last || last.role !== "assistant") return false;
  return Array.isArray(last.tool_calls) && last.tool_calls.length > 0;
}
