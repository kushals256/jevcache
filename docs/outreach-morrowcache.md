# MorrowCache outreach packs

Ready-to-paste cold email. Send manually from MorrowCache mail.

## Send rules

- One person per mail. Do not BCC.
- Send **5–8 today**, not the full list at once.
- One follow-up only, **day 4–5**, if no reply. Then stop.
- If someone replies “stop,” stop.
- Confirm addresses still valid before send (especially catch_all).
- Claims allowed only: OpenAI-compatible proxy, same-intent admit, fail-open, freshness refuse, `npx @kushalicious/jevcache@latest`, https://morrowcache.vercel.app, agent-setup page, optional recorded 2817ms → 423ms pair. No guaranteed savings %, no “works with every model.”

**Suggested order today**

1. Pack A: 1 → 3 → 2 → 4 → 5 (pain + proxy)
2. Pack B: Andrii → Aaron → Adam → Abhishyant (then Aditya if bandwidth)
3. Pack A peers 6–8 and Pack B catch_all / health only if you still have room

---

## Mail format (use this structure every time)

Every outbound mail has five blocks. Do not skip **Why** or **How**.

1. **Why I’m writing** — specific hook (their post, product, or role). One short paragraph.
2. **What this is** — MorrowCache in plain English + who it helps.
3. **How to try it** — numbered steps (copy the shared block below; tweak only if needed).
4. **Ask** — one soft question.
5. **Close** — stop line + signature.

### Shared “How to try it” block (paste into every mail)

```
How to try it (about 5 minutes):

1. Need Node.js 22.5+.
2. Start the proxy:
   npx @kushalicious/jevcache@latest start
   (optional demo with no real upstream: MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo)
3. Point your OpenAI-compatible client at:
   baseURL = http://127.0.0.1:8080/v1
   (or set OPENAI_BASE_URL to that value)
4. Keep your usual upstream model/API key for real completions. Default same-intent judge is cloud Jev (needs OPENROUTER_API_KEY). For local judge: ADJUDICATOR=kev|laya …
5. Send a prompt, then a paraphrase of the same question. Expect MISS then HIT (check X-Jevcache headers or http://127.0.0.1:8080/stats). Final text can HIT, including a later stream. tool_calls are never stored or replayed.

Easiest path in Cursor / Claude Code: paste the setup prompt from
https://morrowcache.vercel.app/agent-setup

Site: https://morrowcache.vercel.app
Repo: https://github.com/kushals256/jevcache
```

### Skeleton

```
Hi {First} —

Why I’m writing
{Personalized 2–4 sentences: what you saw, why it maps to same-intent / retry / FAQ spend.}

What this is
MorrowCache is a local OpenAI-compatible proxy. Before your app calls the model, it checks whether this chat request matches a cached answer by intent (exact or paraphrase)—not cosine alone. Same intent → reuse the completion. Unsure or adjudicator error → fail open and call the model. Freshness-sensitive asks refuse a stale hit. Prefer miss over a wrong hit.

{How to try it — paste shared block}

{One soft ask.}

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

---

## Pack A — HN / pain batch

### 1. Sahil Jagtap — AgentBudget / Drums

**Why:** Built AgentBudget after a $187 GPT-4o retry loop in 10 minutes. Now building coding-agent infra ([jagtap.tech](https://jagtap.tech)).

**To:** `sahil.jagtap45@gmail.com`  
**Subject:** AgentBudget and duplicate chat calls — MorrowCache

```
Hi Sahil —

Why I’m writing
I read the AgentBudget Show HN: GPT-4o retrying a failed analysis until it reached $187. You built a guard for runaway spend. I’m writing because the other half of that bill is often the same: the next chat call is a rephrase or retry of something you already paid for.

What this is
MorrowCache is a local OpenAI-compatible proxy. Before your client hits the model, it checks whether this request matches a cached answer by intent (exact or paraphrase). Same intent → reuse the completion and skip the upstream call. Unsure → fail open and call the model. Prefer miss over a wrong hit. Complementary to budget/fuse tools like AgentBudget—not a replacement.

How to try it (about 5 minutes):

1. Need Node.js 22.5+.
2. Start the proxy:
   npx @kushalicious/jevcache@latest start
   (optional demo: MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo)
3. Point your OpenAI-compatible client at:
   baseURL = http://127.0.0.1:8080/v1
   (or set OPENAI_BASE_URL to that value)
4. Keep your usual upstream model/API key for real completions. Default same-intent judge is cloud Jev (OPENROUTER_API_KEY). Local judge: ADJUDICATOR=kev|laya …
5. Send a prompt, then a paraphrase. Expect MISS then HIT (X-Jevcache headers or http://127.0.0.1:8080/stats). Final text can HIT, including a later stream. tool_calls are never stored or replayed.

Easiest path in Cursor / Claude Code: paste the setup prompt from
https://morrowcache.vercel.app/agent-setup

Site: https://morrowcache.vercel.app
Repo: https://github.com/kushals256/jevcache

Would welcome your view on how this sits next to AgentBudget / Drums.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### 2. Aura Guard team — rephrase & retry loops

**Why:** Targets “rephrase & retry” tool loops that burn money.

**To:** `auraguard.dev@gmail.com`  
**Subject:** Rephrase/retry loops — chat-layer same-intent skip

```
Hi —

Why I’m writing
I saw Aura Guard’s Show HN on rephrase/retry tool loops and duplicate side effects. You guard the tool side. I’m reaching out because the chat side has the same pattern: agents rephrase until the answer looks done, and each try is a full chat bill.

What this is
MorrowCache is a local OpenAI-compatible proxy for chat completions. Same intent → reuse the cached answer; if unsure, call the model. Final text can HIT. tool_calls are never stored, so side effects are not replayed. Meant to compose with a tool guard, not replace it.

How to try it (about 5 minutes):

1. Need Node.js 22.5+.
2. Start the proxy:
   npx @kushalicious/jevcache@latest start
   (optional demo: MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo)
3. Point your OpenAI-compatible client at:
   baseURL = http://127.0.0.1:8080/v1
4. Upstream model key as usual. Default judge = cloud Jev (OPENROUTER_API_KEY). Local: ADJUDICATOR=kev|laya …
5. Prompt + paraphrase → MISS then HIT. Check X-Jevcache or http://127.0.0.1:8080/stats.

Setup prompt for agents: https://morrowcache.vercel.app/agent-setup
Site: https://morrowcache.vercel.app
Repo: https://github.com/kushals256/jevcache

Curious whether a chat-layer skip would compose with Aura Guard.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### 3. Simranjeet Singh — AgentCircuit

**Why:** Lost $200+ when an agent node looped the same call.

**To:** `simranmultani197@gmail.com`  
**Subject:** AgentCircuit loop spend — same-intent chat reuse

```
Hi Simranjeet —

Why I’m writing
Your AgentCircuit Show HN described an agent stuck calling the same thing until $200+ was gone. Circuit breakers stop the loop. I’m writing because when the “same thing” is a rephrased chat completion, you can also skip the model call entirely if intent already matched a cached answer.

What this is
MorrowCache sits on baseURL as an OpenAI-compatible proxy. Exact hit or same-intent admit reuses the answer. Freshness refuse and fail-open still call the model when they should. Complementary to a fuse—not a substitute for kill switches.

How to try it (about 5 minutes):

1. Need Node.js 22.5+.
2. npx @kushalicious/jevcache@latest start
   (demo: MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo)
3. baseURL = http://127.0.0.1:8080/v1  (or OPENAI_BASE_URL)
4. Upstream key as usual. Jev default needs OPENROUTER_API_KEY; or ADJUDICATOR=kev|laya for local.
5. Paraphrase pair → MISS then HIT. Stats: http://127.0.0.1:8080/stats

Agent paste setup: https://morrowcache.vercel.app/agent-setup
Site: https://morrowcache.vercel.app
Repo: https://github.com/kushals256/jevcache

If this is useful next to AgentCircuit’s fuse, I would like to hear how it fits.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### 4. Albert M — RunCycles

**Why:** Agents retrying until a quality bar is met → $200 in minutes.

**To:** `info@runcycles.io` (personal alternative: `amavashev@k2n.io`)  
**Subject:** RunCycles budget guard + duplicate chat calls

```
Hi Albert —

Why I’m writing
I read the RunCycles Show HN: reserve budget before the call so a retry or fanout loop cannot burn $200. Pre-execution guards matter. I’m reaching out because once a call is allowed, the next one is often the same intent with different wording—and you still pay full price unless something skips the model.

What this is
MorrowCache is complementary: if the next chat request is the same intent, do not call the model at all. Local OpenAI-compatible proxy, fail-open when unsure, freshness-aware.

How to try it (about 5 minutes):

1. Need Node.js 22.5+.
2. npx @kushalicious/jevcache@latest start
3. Point clients at http://127.0.0.1:8080/v1
4. Upstream key + OPENROUTER_API_KEY for Jev (or ADJUDICATOR=kev|laya)
5. Prompt + paraphrase → MISS then HIT at /stats

Agent setup: https://morrowcache.vercel.app/agent-setup
Site: https://morrowcache.vercel.app
Repo: https://github.com/kushals256/jevcache

Would value a short take from someone shipping pre-execution guards.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### 5. Martin Ortiz — Cursor ↔ Claude OpenAI proxy

**Why:** Already ships a local OpenAI-compatible proxy for Cursor. Natural baseURL neighbor.

**To:** `maol@mail.maol.dev`  
**Subject:** Another local /v1 — same-intent skip before upstream

```
Hi Martin —

Why I’m writing
I have followed your Cursor–Claude OpenAI-compatible proxy work. You already know the drop-in baseURL pattern. I’m writing because many agents still rephrase until the bill hurts—and a second local /v1 can skip the upstream chat call when intent already matched.

What this is
MorrowCache is another local OpenAI-compatible /v1: when the question is the same intent, reuse the completion instead of paying again. Fail-open. Final text can HIT, including a later stream. tool_calls are never replayed.

How to try it (about 5 minutes):

1. Need Node.js 22.5+.
2. npx @kushalicious/jevcache@latest start
3. Point Cursor / client baseURL at http://127.0.0.1:8080/v1 (keep your upstream as MorrowCache’s upstream)
4. OPENROUTER_API_KEY for default Jev admits, or ADJUDICATOR=kev|laya
5. Paraphrase pair → MISS then HIT. http://127.0.0.1:8080/stats

Agent setup: https://morrowcache.vercel.app/agent-setup
Site: https://morrowcache.vercel.app
Repo: https://github.com/kushals256/jevcache

If you try it beside your proxy path, I would value what feels wrong.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### 6. Abhishek Aggarwal — Cachet (peer)

**Why:** Building a local Rust semantic cache. Peer note, not a replacement pitch.

**To:** `aggarwalabhi2112@gmail.com`  
**Subject:** Peer note — intent admit vs embedding cache

```
Hi Abhishek —

Why I’m writing
I saw Cachet on Show HN (local semantic cache in Rust). We are solving the same class of problem with a different admit path. Peer note only—not asking you to switch stacks.

What this is
MorrowCache is an OpenAI-compatible proxy with a same-intent adjudicator (not cosine by default), fail-open. Final text can HIT, including a later stream. tool_calls are never replayed. Precision-first: prefer miss over wrong hit. One recorded pair: 2817ms miss → 423ms hit.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1
4. Jev (OPENROUTER_API_KEY) or ADJUDICATOR=kev|laya
5. /stats or X-Jevcache headers for MISS → HIT

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

Happy to compare notes on wrong hits vs misses if useful.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### 7. Guglielmo Cerri — Khazad (peer)

**Why:** Transparent semantic cache on Redis. Peer.

**To:** `cerriguglielmo@gmail.com`  
**Subject:** Transparent cache peers — intent admit path

```
Hi Guglielmo —

Why I’m writing
I noticed Khazad (semantic cache over Redis vector sets). Same pain, different stack. Peer outreach so you know another admit path exists—not a displace pitch.

What this is
MorrowCache is a local OpenAI-compatible proxy that admits paraphrases via an intent judge and prefers a miss over a wrong hit. Fail-open when the judge flakes.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1
4. OPENROUTER_API_KEY (Jev) or ADJUDICATOR=kev|laya
5. Paraphrase → MISS then HIT at http://127.0.0.1:8080/stats

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

If you are open to a short compare, I am listening.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### 8. Mijo Kristo — SemanticCache (peer)

**Why:** Publicly shipping semantic cache for LLM cost. Peer.

**To:** `mijo@mijokristo.com`  
**Subject:** Semantic cache for agents that rephrase

```
Hi Mijo —

Why I’m writing
I saw SemanticCache (Ruby) aimed at cutting LLM API spend. I’m building in the same space for OpenAI-compatible / agent clients and wanted to share the approach for a peer check.

What this is
MorrowCache: local proxy, same-intent reuse, fail-open. One recorded pair: 2817ms miss → 423ms hit.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1
4. Jev or ADJUDICATOR=kev|laya
5. Prove MISS → HIT via /stats

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

Would value a peer check if you have bandwidth.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### Pack A — find email yourself

| Person | Hook | Where to get mail |
|---|---|---|
| Abdul Basit Ali | AgentFuse — drained OpenAI balance | [GitHub](https://github.com/AbdulBasitA) / LinkedIn |
| Ajeeth Kumar R | ccproxy — OpenAI-compat for Cursor/Codex | [LinkedIn](https://www.linkedin.com/in/ajeethkumar95/) |
| frigosk | simplio.dev gateway (commented on AgentBudget) | [simplio.dev](https://simplio.dev) contact |
| ollybrinkman | Apiosk — agent spend / x402 | [apiosk.com](https://apiosk.com) |

---

## Pack B — Explee-filtered

Triage: keep agent / multi-LLM / support-FAQ loops where a CTO can change `baseURL` this week. Skip megavendors and procurement-heavy seats.

### B1. Andrii Bidochko — UBOS (priority)

**Why:** Low-code multi-LLM workflows — clear OpenAI-compat / baseURL neighbor.

**To:** `andrii.bidochko@ubraine.com`  
**Status:** valid (confirm before send)  
**Subject:** Same-intent skip for multi-LLM workflows on UBOS

```
Hi Andrii —

Why I’m writing
UBOS lets teams wire multiple LLMs into business workflows without writing a full stack. That surface often repeats the same question in different words—and each wording can still mean a full model call. I’m founder of MorrowCache and reaching out because a drop-in baseURL change is the lowest-friction place to test same-intent reuse on agent runs.

What this is
MorrowCache is a local OpenAI-compatible proxy. When the next chat request is the same intent (exact or paraphrase), we reuse the completion instead of calling the model again. Fail-open when unsure. Final text can HIT, including a later stream. tool_calls are never replayed. Prefer miss over a wrong hit.

How to try it (about 5 minutes):

1. Need Node.js 22.5+.
2. Start:
   npx @kushalicious/jevcache@latest start
   (demo without real upstream: MOCK_UPSTREAM=1 npx @kushalicious/jevcache@latest start --demo)
3. Point OpenAI-compatible clients at:
   baseURL = http://127.0.0.1:8080/v1
4. Keep your upstream model key. Default same-intent judge = cloud Jev (OPENROUTER_API_KEY). Local: ADJUDICATOR=kev|laya …
5. Prompt + paraphrase → expect MISS then HIT (X-Jevcache headers or http://127.0.0.1:8080/stats).

Paste setup for Cursor / Claude Code: https://morrowcache.vercel.app/agent-setup
Site: https://morrowcache.vercel.app
Repo: https://github.com/kushals256/jevcache

Open to a short look at whether this belongs under UBOS agent runs?

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### B2. Aaron Murray — Triniti

**Why:** Co-founder & CTO at a small AI stack; can try a local proxy.

**To:** `aaron@createsafe.io`  
**Status:** valid (Createsafe domain vs triniti.plus — confirm still his inbox)  
**Subject:** Why I’m writing — same-intent OpenAI proxy for your stack

```
Hi Aaron —

Why I’m writing
I’m reaching out as co-founder/CTO at Triniti. Teams shipping agents and copilots often pay twice for the same intent when wording changes. I’m Kushal, founder of MorrowCache—a local proxy you can put in front of any OpenAI-compatible client without changing the SDK.

What this is
Same intent → reuse the cached completion; if unsure, call the model. Fail-open. Point baseURL at the proxy and keep your upstream model.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL = http://127.0.0.1:8080/v1
4. Upstream key + OPENROUTER_API_KEY (Jev) or ADJUDICATOR=kev|laya
5. Paraphrase pair → MISS then HIT at /stats

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

If this would help on your stack, a brief reply is enough.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### B3. Adam Carr — BlueOcean

**Why:** CTO at an AI product company; decision seat for infra experiments.

**To:** `adam.carr@blueocean.ai`  
**Status:** valid  
**Subject:** Duplicate LLM chat calls on paraphrases — trial steps included

```
Hi Adam —

Why I’m writing
Writing as CTO at BlueOcean. Product AI surfaces often re-ask the same thing with new wording and pay full price each time. I’m sharing MorrowCache because you can evaluate it this week by changing one baseURL—no procurement path required for a local trial.

What this is
OpenAI-compatible proxy that reuses a completion when intent matches (exact or paraphrase). Prefer miss over wrong hit; fail-open when the adjudicator is unsure. Final text can HIT, including a later stream. tool_calls are never replayed.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1
4. Upstream key; Jev needs OPENROUTER_API_KEY (or ADJUDICATOR=kev|laya)
5. Prove MISS → HIT via http://127.0.0.1:8080/stats

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

Would this be useful under your chat path? Happy to take a no.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### B4. Abhishyant Khare — Cofounder.co / GIC

**Why:** Cofounder/CTO builder seat; likely to try tooling personally.

**To:** `abhishyant@generalintelligencecompany.com`  
**Status:** valid  
**Subject:** Same-intent cache for OpenAI-compatible clients — how to run it

```
Hi Abhishyant —

Why I’m writing
Reaching out as cofounder/CTO. Builders running agents and internal copilots often burn tokens on rephrases of questions already answered. I’m founder of MorrowCache and wanted to give you enough context and steps to try it yourself in one sitting—not a vague partnership ask.

What this is
Local OpenAI-compatible proxy: admit same intent, reuse the answer, fail open when unsure. Freshness-sensitive asks refuse the stale hit and call the model.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1
4. OPENROUTER_API_KEY for Jev, or ADJUDICATOR=kev|laya
5. Prompt + paraphrase → MISS then HIT

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

If you try it for ten minutes, I would value what breaks.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### B5. Aditya Bansod — Luma Health (careful angle)

**Why:** Co-founder & CTO. Use **support / FAQ paraphrase** angle only — not clinical decision caching.

**To:** `aditya.bansod@lumahealth.io`  
**Status:** valid  
**Subject:** FAQ paraphrases — same-intent reuse (not clinical)

```
Hi Aditya —

Why I’m writing
Patient and ops support flows often ask the same FAQ in different words. Exact-match caches miss; embedding caches can merge the wrong pair. I’m reaching out only for high-volume FAQ / docs chat paths—not clinical or personalized answers.

What this is
MorrowCache reuses a chat completion when intent matches, and fails open when unsure. Final text can HIT, including a later stream. tool_calls are never replayed. Personalized or freshness-critical clinical answers should miss; that is by design.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1 on a non-clinical FAQ path only
4. Upstream key + Jev/OpenRouter or local ADJUDICATOR
5. Paraphrase FAQ → MISS then HIT at /stats

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

Only relevant if you have that FAQ path. If not, ignore.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### B6. Abhimanyu Kumbara — Welldoc (lighter priority)

**Why:** VP AI & ML. Larger / health — lower priority than B1–B4.

**To:** `akumbara@welldoc.com`  
**Status:** valid  
**Subject:** Repeated support prompts — same-intent skip (trial steps)

```
Hi Abhimanyu —

Why I’m writing
At Welldoc, repeated coaching or support prompts with different wording can still mean the same intent—and a full model bill each time. I’m sharing a local OpenAI-compatible proxy you can trial on a path you control, without a long vendor cycle.

What this is
Same intent → reuse the completion; fail-open when unsure; freshness refuse when “latest” should not reuse.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1
4. Upstream key + OPENROUTER_API_KEY or ADJUDICATOR=kev|laya
5. /stats for MISS → HIT

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

Only useful if you control an OpenAI-compatible chat path and want a low-risk experiment.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### B7. Aamir Lakdawala — Journey36 (catch_all — optional)

**Why:** CTO. Accept bounce risk.

**To:** `aamir@journey36.com`  
**Status:** catch_all  
**Subject:** Why I’m writing — same-intent chat reuse + how to run it

```
Hi Aamir —

Why I’m writing
Reaching out as CTO at Journey36. If your product or agents re-ask the same question in new words, you may be paying twice for one answer. I’m founder of MorrowCache and including setup steps so you can validate in minutes if it maps to your stack.

What this is
OpenAI-compatible proxy that reuses completions on same-intent paraphrases, fails open when unsure, and refuses stale hits when freshness matters.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. baseURL http://127.0.0.1:8080/v1
4. Upstream key + Jev (OPENROUTER_API_KEY) or local adjudicator
5. Paraphrase → MISS then HIT

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

Open to a short look if this maps to your stack?

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### B8. Amar Bulsara — Andor Health (catch_all / optional)

**Why:** VP Implementation Engineering. Health + catch_all — send only if you still have quota.

**To:** `amar@andorhealth.com`  
**Status:** catch_all  
**Subject:** Implementation trial — same-intent chat cache steps

```
Hi Amar —

Why I’m writing
Writing to implementation engineering at Andor Health. Rollouts of agent or support chat often repeat the same intent across paraphrases and retries. I’m offering a concrete local trial path (change baseURL), not a sales deck.

What this is
Drop-in OpenAI-compatible proxy: reuse when intent matches, fail open when unsure, final text can HIT, including a later stream, and tool_calls are never replayed. Prefer miss over wrong hit.

How to try it (about 5 minutes):

1. Node.js 22.5+
2. npx @kushalicious/jevcache@latest start
3. Point a trial client at http://127.0.0.1:8080/v1
4. Upstream key + OPENROUTER_API_KEY or ADJUDICATOR=kev|laya
5. Confirm MISS → HIT at http://127.0.0.1:8080/stats

https://morrowcache.vercel.app/agent-setup
https://morrowcache.vercel.app
https://github.com/kushals256/jevcache

Relevant only if you own a baseURL you can point at a local proxy for a trial.

Reply stop and I won’t write again.

Kushal
MorrowCache
https://morrowcache.vercel.app
```

### Pack B — find email yourself

Do not invent addresses. Hook + where to look:

| Person | Company | Hook | Where |
|---|---|---|---|
| Aman Sharma | Lamatic.ai | CoFounder & CTO — agent builder platform | LinkedIn / lamatic.ai contact |
| Batuhan T. | fal.ai | Head of Engineering — developer platform, OpenAI-compat adjacent | LinkedIn / fal.ai |
| Alberto González Lizán | InfiniteWatch | Co-Founder & CTO — smaller AI product | LinkedIn / infinitewatch.ai |
| Badr Eddial | lleverage.ai | CTO & Founder — agent/automation stack | LinkedIn / lleverage.ai |
| Ansari Ismail | Botminds | CTO & Co-Founder — document/agent AI | LinkedIn / botminds.ai |
| Avi Singh | Riptide | Co-Founder & CTO | LinkedIn / riptidehq.com |
| Alexander Wurts | Coworker.ai | Head of Engineering — workplace agents | LinkedIn / coworker.ai |

---

## Day-5 bump

Use once per person if no reply. Keep the original subject with `Re:`.

```
Hi {First} —

Following up once. Context: MorrowCache is a local OpenAI-compatible proxy that reuses a chat completion when intent matches (exact or paraphrase), and fails open when unsure.

Quick path:
1. npx @kushalicious/jevcache@latest start
2. baseURL = http://127.0.0.1:8080/v1
3. Or paste setup: https://morrowcache.vercel.app/agent-setup

Site: https://morrowcache.vercel.app

If this is not useful, reply stop and I will close the thread.

Kushal
MorrowCache
```

---

## Skip list (do not cold-email from Explee megavendor pull)

Glean, Dataiku, Writer, Kore.ai, Uniphore, ASAPP, Netomi, Aisera, Digitate, Adept, Contextual AI, Accio, Laiye, Entefy, Calfus, and generally anything ≥150 headcount unless they are clearly OpenAI-compatible infra you can reach a founder on.

Wrong motion for this product: pure enterprise RPA with no public OpenAI-compat surface, clinical decision caching pitches, procurement-led “enterprise AI platform” seats with no builder path to `baseURL`.
