#!/usr/bin/env bash
# UserPromptSubmit hook: warn once when this session's context has grown large
# enough that every further turn is expensive, and a /handoff into a fresh
# session would be cheaper than continuing here.
#
# Context size is read from the transcript rather than guessed from file size:
# the last assistant turn reports exactly what was sent to the model.
# Anything unexpected — no transcript, no usage yet, no jq — exits silently.
# A hook that fails loudly on every prompt is worse than one that misses a warning.
set -uo pipefail

WARN="${CONTEXT_BUDGET_WARN:-100000}"
URGENT="${CONTEXT_BUDGET_URGENT:-160000}"
STATE_DIR="${CONTEXT_BUDGET_STATE_DIR:-${TMPDIR:-/tmp}/claude-context-budget}"

command -v jq >/dev/null 2>&1 || exit 0

payload="$(cat)"
transcript="$(printf '%s' "$payload" | jq -r '.transcript_path // empty' 2>/dev/null)"
session="$(printf '%s' "$payload" | jq -r '.session_id // "unknown"' 2>/dev/null)"
[[ -n "$transcript" && -f "$transcript" ]] || exit 0

# The context window is the sum of the three input fields: fresh input, what was
# written to cache this turn, and what was read back from cache.
context="$(jq -r '
    .message.usage
    | select(. != null)
    | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)
  ' "$transcript" 2>/dev/null | tail -1)"
[[ "$context" =~ ^[0-9]+$ ]] || exit 0

if   (( context >= URGENT )); then band=2
elif (( context >= WARN ));   then band=1
else band=0
fi

# Warn once per band. Crossing into a higher band speaks up again; staying put
# stays quiet, so the reminder never becomes noise you learn to ignore.
mkdir -p "$STATE_DIR" 2>/dev/null || exit 0
state_file="$STATE_DIR/$(printf '%s' "$session" | tr -c 'A-Za-z0-9._-' '_')"
last="$(cat "$state_file" 2>/dev/null)"
[[ "$last" =~ ^[0-9]+$ ]] || last=0

# A compaction drops the context back down. Re-arm, so the session that grows
# expensive a second time gets warned a second time.
if (( band == 0 )); then
  (( last == 0 )) || printf '0' > "$state_file"
  exit 0
fi
(( band > last )) || exit 0
printf '%s' "$band" > "$state_file"

k=$(( (context + 500) / 1000 ))
if (( band == 2 )); then
  message="Context is ~${k}k tokens — each turn now re-sends all of it, and compaction is close. Run /handoff and continue in a fresh session."
else
  message="Context is ~${k}k tokens and every turn re-sends it. If you are switching to a different task, /handoff into a fresh session is cheaper than continuing here."
fi

jq -nc --arg m "$message" '{systemMessage: $m, suppressOutput: true}'
