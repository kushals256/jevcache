import { A, Article, FAQList, H2, Note, P, Table } from "@/components/Article"
import { PROMPT_VS_RESPONSE_FAQ } from "@/content/pageFaq"

export default function PromptVsResponse() {
  return (
    <Article
      eyebrow="Guide"
      title="Prompt caching vs response caching"
      updated="2026-11-04"
      lede={
        <p>
          &ldquo;Caching&rdquo; means two different things for LLM APIs. Prompt caching, offered by OpenAI and
          Anthropic, makes a repeated input prefix cheaper to process. Response caching skips the model call and
          returns an answer you already paid for. They save money in different places and work well together.
        </p>
      }
      sources={[
        { label: "OpenAI docs: prompt caching", href: "https://developers.openai.com/api/docs/guides/prompt-caching" },
        { label: "Anthropic docs: prompt caching", href: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching" },
        { label: "Vercel AI Gateway: automatic caching", href: "https://vercel.com/docs/ai-gateway/models-and-providers/automatic-caching" },
      ]}
    >
      <H2 id="prompt-caching">What prompt caching does</H2>
      <P>
        When many requests start with the same long prefix, such as a system prompt, tool definitions or a block of
        repo context, the provider can keep the processed prefix and reuse it. OpenAI applies this automatically once
        the prefix reaches 1,024 tokens. Anthropic lets you mark breakpoints with <code>cache_control</code>.
      </P>
      <P>
        The model still runs. OpenAI&rsquo;s documentation says prompt caching does not change how the model
        generates output tokens, and Anthropic&rsquo;s says output is generated fresh each time. You pay less for the
        cached input; output tokens cost the same.
      </P>

      <H2 id="response-caching">What response caching does</H2>
      <P>
        A response cache sits in front of the model. If a request matches one it has seen, exactly or by meaning, it
        returns the stored answer and the model is never called. There are no input or output tokens to pay for, and
        the answer arrives in milliseconds to a few hundred milliseconds instead of seconds.
      </P>

      <Table
        head={["", "Prompt caching", "Response caching"]}
        rows={[
          ["Who runs it", "The model provider", "You, in your app or a proxy"],
          ["Does the model run?", "Yes", "No, on a hit"],
          ["Saves on", "Input tokens of a shared prefix", "The whole call: input, output and latency"],
          ["Helps when", "Many calls share a long prefix", "The same question or job repeats"],
          ["Risk", "None to correctness", "A wrong hit returns the wrong answer"],
          ["Examples", "OpenAI, Anthropic, Vercel AI Gateway caching: 'auto'", "MorrowCache, GPTCache, LiteLLM cache, Helicone"],
        ]}
      />

      <Note>
        Vercel AI Gateway&rsquo;s <code>caching: &apos;auto&apos;</code> option turns on provider prompt caching. It
        does not return stored responses.
      </Note>

      <H2 id="together">Using both</H2>
      <P>
        A coding agent is a good example. Every turn carries the same large system prompt and repo context, so prompt
        caching cuts the input cost of every call. When the agent retries the same step with a reworded instruction,
        a response cache can return the final answer without a call at all.{" "}
        <A href="/">MorrowCache</A> does the second part for any OpenAI-compatible client. Calls that miss still go to the
        provider, so its prompt caching applies to them as usual.
      </P>
      <P>
        If you are choosing a response cache, read{" "}
        <A href="/guides/semantic-caching">semantic caching and where it goes wrong</A> first.
      </P>

      <H2 id="faq">FAQ</H2>
      <FAQList items={PROMPT_VS_RESPONSE_FAQ} />
    </Article>
  )
}
