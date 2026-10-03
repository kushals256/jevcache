# SCRIPT — on-screen captions only (no VO)

Times are master clock. Hook uses rows with `t < 15.00`.

## Caption list

| In | Out | Text | Notes |
|----|-----|------|-------|
| 2.20 | 3.40 | Same **intent**. Skip the call. | Invert-pill on *intent* |
| 3.50 | 4.20 | explain merge sort | Reel slot |
| 4.20 | 4.80 | walk me through mergesort | Reel |
| 4.80 | 5.40 | how does mergesort work | Reel |
| 5.40 | 6.00 | same question, new words | Reel |
| 6.00 | 7.00 | Same intent. | Anchor hold under reel |
| 7.10 | 8.40 | MISS 2817ms | Odometer land |
| 8.40 | 10.20 | HIT 423ms · 6.7× · intent 0.94 | Accent on × |
| 10.40 | 15.00 | Change baseURL. Keep your model. | Over expanding proxy UI |
| 15.20 | 19.20 | Word overlap lies. | Jaccard board |
| 16.00 | 19.20 | Jaccard FPR 0.49 · n=103 | Scan highlight |
| 19.80 | 23.80 | Stale “latest”? REFUSE. | Amber pill |
| 21.00 | 23.80 | Fail-open when unsure. | Sub line |
| 24.20 | 28.80 | npx @kushalicious/jevcache@latest | Mono lock |
| 29.20 | 34.80 | Routers pick a model. | End |
| 30.40 | 34.80 | This decides whether to **call** one. | Accent *call* |
| 31.60 | 34.80 | morrowcache.vercel.app | End card |

## Paraphrase reel strings (cycle order)

1. explain merge sort  
2. walk me through mergesort  
3. how does mergesort work  
4. same question, new words  

Hold cadence ≈ 0.55–0.65s per swap to match ~100 BPM.

## Alt text (upload)

`Same-intent cache: 2817ms miss → 423ms hit at intent 0.94. Drop-in OpenAI-compatible proxy.`

## X / Reddit copy (from LAUNCH.md)

**Post 1 (hook):** Same question. Different words. You still pay twice — unless the proxy admits same intent.

**Reply 2 (story):** How it works — (1) Same-intent HIT 2817→423ms @ 0.94 (~6.7×) (2) Drop-in OpenAI-compatible proxy (3) Fail-open + freshness refuse.

**Reply 3:** `npx @kushalicious/jevcache@latest` · https://morrowcache.vercel.app · https://github.com/kushals256/jevcache
