## One-command for users

```bash
npx jevcache@latest
# or until npm publish:
npx --yes github:kushals256/jevcache
```

# Launch checklist

## Pre-tweet uniqueness re-check
```bash
gh search repos "jevcache"
gh search code "same_intent" "chat/completions" jev --limit 20
```
If a clone appeared, sharpen README first sentence before posting.

## Assets
1. Run demo burn → screenshot `/stats`
2. One false-HIT story: cosine/Jaccard would merge “explain quicksort” vs “explain mergesort”; Jev should not
3. `results/eval.json` from `LIVE=1 npm run eval`

## Tweet draft
> Routers pick a model. jevcache decides whether to call one.
>
> OpenAI-compatible proxy: TypeSafe Jev admits same-intent cache hits (not cosine). Exact tier + fail-open.
>
> docker compose up → change baseURL → watch /stats $ saved
>
> github.com/kushals256/jevcache

Optional soft tags: TypeSafe / OpenRouter.

## Do not claim
- Guaranteed 0 false hits
- “Better than GPTCache at everything”
- Unmeasured dollar amounts
