## One-command for users

```bash
npx @kushalicious/jevcache@latest
npx @kushalicious/jevcache@latest start --demo
```

npm: https://www.npmjs.com/package/@kushalicious/jevcache  
Docker: `ghcr.io/kushals256/jevcache:latest`

# Launch checklist

## Pre-tweet uniqueness re-check
```bash
gh search repos "jevcache"
gh search code "same_intent" "chat/completions" jev --limit 20
```
If a clone appeared, sharpen README first sentence before posting.

## Assets
1. Run `npx @kushalicious/jevcache@latest start --demo` → screenshot `/stats`
2. One false-HIT story: cosine/Jaccard would merge “explain quicksort” vs “explain mergesort”; Jev should not
3. `results/eval.json` from `LIVE=1 npm run eval`

## Tweet draft
> Routers pick a model. jevcache decides whether to call one.
>
> OpenAI-compatible proxy: TypeSafe Jev admits same-intent cache hits (not cosine). Exact tier + fail-open.
>
> npx @kushalicious/jevcache@latest → change baseURL → watch /stats $ saved
>
> github.com/kushals256/jevcache

Optional soft tags: TypeSafe / OpenRouter.

## Do not claim
- Guaranteed 0 false hits
- “Better than GPTCache at everything”
- Unmeasured dollar amounts
