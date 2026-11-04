import { A, Article, FAQList, H2, Note, P, Pre } from "@/components/Article"
import { INTEGRATIONS_FAQ } from "@/content/pageFaq"

export default function Integrations() {
  return (
    <Article
      eyebrow="Integrations"
      title="Add an LLM response cache to the OpenAI SDK, Vercel AI SDK or LangChain"
      updated="2026-11-04"
      lede={
        <p>
          MorrowCache speaks the OpenAI Chat Completions API on <code>http://127.0.0.1:8080/v1</code>. Any client that
          lets you set a base URL can use it. Start the proxy, change one line, and read the{" "}
          <code>X-Jevcache</code> response header to see HIT or MISS.
        </p>
      }
      sources={[
        { label: "MorrowCache README: wire your app", href: "https://github.com/kushals256/jevcache#wire-your-app-one-line-change" },
        { label: "AI SDK: OpenAI provider", href: "https://ai-sdk.dev/providers/ai-sdk-providers/openai" },
        { label: "Ollama: OpenAI compatibility", href: "https://docs.ollama.com/api/openai-compatibility" },
      ]}
    >
      <H2 id="start">1. Start the proxy</H2>
      <Pre label="terminal">{`npx @kushalicious/jevcache@latest init    # writes OPENAI_BASE_URL into ./.env
npx @kushalicious/jevcache@latest start   # serves http://127.0.0.1:8080/v1`}</Pre>
      <P>
        Node.js 22.5 or later, or Docker (<code>ghcr.io/kushals256/jevcache:latest</code>). The default upstream is
        OpenRouter, so the examples use OpenRouter model IDs such as <code>openai/gpt-4o-mini</code>.
      </P>

      <H2 id="openai-node">OpenAI Node SDK</H2>
      <Pre label="app.mjs">{`import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "http://127.0.0.1:8080/v1", // was https://openrouter.ai/api/v1
})

const r = await client.chat.completions.create({
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Explain quicksort simply" }],
})
console.log(r.choices[0].message.content)`}</Pre>

      <H2 id="openai-python">OpenAI Python SDK</H2>
      <Pre label="app.py">{`import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="http://127.0.0.1:8080/v1",
)

r = client.chat.completions.create(
    model="openai/gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain quicksort simply"}],
)
print(r.choices[0].message.content)`}</Pre>
      <P>
        Both SDKs also read <code>OPENAI_BASE_URL</code> from the environment, which is what <code>init</code> writes.
      </P>

      <H2 id="vercel-ai-sdk">Vercel AI SDK</H2>
      <Pre label="app.ts">{`import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

const openai = createOpenAI({
  baseURL: "http://127.0.0.1:8080/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

const { text } = await generateText({
  model: openai.chat("openai/gpt-4o-mini"), // .chat = Chat Completions
  prompt: "Explain quicksort simply",
})`}</Pre>
      <Note>
        Use <code>openai.chat(&hellip;)</code>. Plain <code>openai(&hellip;)</code> calls the Responses API in recent
        AI SDK versions, and MorrowCache answers <code>/v1/responses</code> with 501.
      </Note>

      <H2 id="langchain">LangChain</H2>
      <Pre label="JavaScript">{`import { ChatOpenAI } from "@langchain/openai"

const llm = new ChatOpenAI({
  model: "openai/gpt-4o-mini",
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: { baseURL: "http://127.0.0.1:8080/v1" },
})`}</Pre>
      <Pre label="Python">{`import os
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="openai/gpt-4o-mini",
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="http://127.0.0.1:8080/v1",
)`}</Pre>

      <H2 id="curl">curl</H2>
      <Pre label="terminal">{`curl -si http://127.0.0.1:8080/v1/chat/completions \\
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"Explain mutexes simply"}]}' \\
  | grep -i x-jevcache`}</Pre>

      <H2 id="local-models">Local models: Ollama, vLLM, llama.cpp</H2>
      <P>
        Set the upstream to any OpenAI-compatible server. Run the judge locally too (<code>ADJUDICATOR=kev</code> or{" "}
        <code>laya</code>) and nothing leaves your machine.
      </P>
      <Pre label=".env">{`UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1   # Ollama
# UPSTREAM_BASE_URL=http://127.0.0.1:8000/v1   # vLLM (Laya also defaults to :8000)
# llama.cpp's server also defaults to :8080, so move one of them:
# PORT=8090`}</Pre>

      <H2 id="agents">Coding agents</H2>
      <P>
        To install MorrowCache into a project with Cursor, Claude Code or Codex, paste the{" "}
        <A href="/agent-setup">agent setup prompt</A>. The agent installs the proxy, writes <code>.env</code>, wires
        the base URL in your app and proves a MISS then a HIT. It caches your app&rsquo;s model calls, not the
        agent&rsquo;s own.
      </P>

      <H2 id="faq">FAQ</H2>
      <FAQList items={INTEGRATIONS_FAQ} />
    </Article>
  )
}
