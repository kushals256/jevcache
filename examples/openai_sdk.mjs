import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.UPSTREAM_API_KEY || process.env.OPENROUTER_API_KEY,
  baseURL: process.env.JEVCACHE_URL || "http://127.0.0.1:8080/v1",
});

const r = await client.chat.completions.create({
  model: "openai/gpt-4o-mini",
  temperature: 0,
  messages: [{ role: "user", content: "Explain quicksort simply" }],
});
console.log(r.choices[0].message.content);
