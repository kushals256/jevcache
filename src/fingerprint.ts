/** SPDX-License-Identifier: MIT */
import { createHash } from "node:crypto";

const TRANSPORT_ONLY = new Set(["stream", "cache", "cache_control", "metadata"]);

export type ChatMessage = {
  role: string;
  content?: unknown;
  name?: string;
  tool_calls?: unknown;
  tool_call_id?: string;
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

export function toolsHash(body: ChatRequest): string {
  return sha256(stableStringify({ tools: body.tools ?? null, tool_choice: body.tool_choice ?? null, functions: body.functions ?? null }));
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
