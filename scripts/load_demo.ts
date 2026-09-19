/**
 * Burns paraphrases through a running jevcache to populate /stats.
 * Usage: UPSTREAM_API_KEY=... OPENROUTER_API_KEY=... npm run demo
 * Assumes jevcache on localhost:8080
 */
const BASE = process.env.JEVCACHE_URL || "http://127.0.0.1:8080";
const KEY = process.env.UPSTREAM_API_KEY || process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("Set UPSTREAM_API_KEY or OPENROUTER_API_KEY");
  process.exit(1);
}

const prompts = [
  ["Explain quicksort in plain English", "Can you explain quicksort simply?", "quicksort please, simple words"],
  ["What is a mutex?", "Explain mutexes", "Describe what a mutex is"],
  ["How does DNS work?", "Explain DNS briefly", "What is DNS in simple terms?"],
  ["List 3 sorting algorithms", "Name three sorts", "Give me 3 sorting algos"],
  ["Define REST", "What is REST?", "Explain REST APIs"],
  ["Convert 10 miles to km", "10 miles in kilometers?", "How many km is 10 miles?"],
  ["Pros of SQLite", "Why use SQLite?", "SQLite advantages"],
  ["What is a closure in JS?", "Explain JS closures", "JavaScript closure meaning"],
];

async function chat(content: string) {
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEMO_MODEL || "openai/gpt-4o-mini",
      temperature: 0,
      seed: 42,
      messages: [{ role: "user", content }],
    }),
  });
  const cache = res.headers.get("X-Jevcache");
  const text = await res.text();
  console.log(cache, content.slice(0, 40), res.status);
  if (!res.ok) console.log(text.slice(0, 200));
}

async function main() {
  for (const group of prompts) {
    for (const p of group) {
      await chat(p);
    }
  }
  console.log(`Done. Open ${BASE}/stats`);
}

main();
