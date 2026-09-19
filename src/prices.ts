/** SPDX-License-Identifier: MIT */
/** Estimated USD per 1M tokens. Overlay with prices.local.json if present. */
export type Price = { in: number; out: number };

const DEFAULTS: Record<string, Price> = {
  "openai/gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "openai/gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o": { in: 2.5, out: 10 },
  "anthropic/claude-3.5-sonnet": { in: 3, out: 15 },
  "anthropic/claude-sonnet-4": { in: 3, out: 15 },
  default: { in: 0.5, out: 1.5 },
};

let overlay: Record<string, Price> = {};

export function loadPriceOverlay(json?: string): void {
  if (!json) return;
  try {
    overlay = JSON.parse(json) as Record<string, Price>;
  } catch {
    /* ignore */
  }
}

export function priceFor(model: string): Price {
  return overlay[model] ?? DEFAULTS[model] ?? DEFAULTS.default;
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const p = priceFor(model);
  return (promptTokens / 1_000_000) * p.in + (completionTokens / 1_000_000) * p.out;
}

/** Jev on OpenRouter listing ~$0.042 / M input */
export function estimateJevCostUsd(inputTokens: number): number {
  return (inputTokens / 1_000_000) * 0.042;
}
