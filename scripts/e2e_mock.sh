#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export MOCK_UPSTREAM=1 MOCK_JEV=1 INTENT_THRESHOLD=0.4 HOST=127.0.0.1 PORT=8799 DATA_DIR=./data/e2e
rm -rf "$DATA_DIR"
mkdir -p "$DATA_DIR"
npm run build >/dev/null
node dist/cli.js &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf "http://127.0.0.1:8799/healthz" >/dev/null && break
  sleep 0.2
done

chat() {
  local label="$1"; shift
  curl -sS -D /tmp/jev_hdrs.txt -o /tmp/jev_body.json \
    -X POST "http://127.0.0.1:8799/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer mock" \
    -d "{\"model\":\"mock-model\",\"temperature\":0,\"messages\":[{\"role\":\"user\",\"content\":\"$1\"}]}"
  local cache
  cache=$(grep -i '^X-Jevcache:' /tmp/jev_hdrs.txt | tr -d '\r' | awk '{print tolower($2)}')
  local tier
  tier=$(grep -i '^X-Jevcache-Tier:' /tmp/jev_hdrs.txt | tr -d '\r' | awk '{print tolower($2)}')
  echo "$label => cache=$cache tier=${tier:-none}"
  echo "$cache" > "/tmp/jev_expect_$label"
}

chat miss1 "What is a mutex lock in operating systems?"
chat exact "What is a mutex lock in operating systems?"
chat paraphrase "Can you explain what a mutex lock is in OS?"
chat different "How does DNS resolution work on the internet?"

# assertions
test "$(cat /tmp/jev_expect_miss1)" = "miss"
test "$(cat /tmp/jev_expect_exact)" = "hit"
test "$(cat /tmp/jev_expect_paraphrase)" = "hit"
test "$(cat /tmp/jev_expect_different)" = "miss"

curl -sS "http://127.0.0.1:8799/stats.json" | python3 -c "import sys,json; s=json.load(sys.stdin); assert s['hits_exact']>=1 and s['hits_jev']>=1 and s['misses']>=2; print('stats', {k:s[k] for k in ['requests','hits_exact','hits_jev','misses']})"
echo E2E_OK
