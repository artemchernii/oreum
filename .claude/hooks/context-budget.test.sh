#!/usr/bin/env bash
# Tests for context-budget.sh — the UserPromptSubmit hook that warns when the
# session's context has grown expensive enough to be worth a /handoff.
set -uo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/context-budget.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

export CONTEXT_BUDGET_WARN=100000
export CONTEXT_BUDGET_URGENT=160000
export CONTEXT_BUDGET_STATE_DIR="$WORK/state"

pass=0
fail=0

# Writes a transcript whose final assistant turn reports the given context size,
# split across the three fields that actually make up the context window.
make_transcript() {
  local path="$1" total="$2"
  local read=$(( total - 20000 ))
  {
    printf '{"type":"user","message":{"role":"user","content":"hi"}}\n'
    printf '{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":2,"cache_creation_input_tokens":10,"cache_read_input_tokens":10}}}\n'
    printf '{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":2,"cache_creation_input_tokens":19998,"cache_read_input_tokens":%d}}}\n' "$read"
    printf '{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"no usage here"}]}}\n'
  } > "$path"
}

run_hook() {
  local transcript="$1" session="$2"
  printf '{"session_id":"%s","transcript_path":"%s","hook_event_name":"UserPromptSubmit"}' \
    "$session" "$transcript" | bash "$HOOK"
}

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    pass=$((pass + 1)); printf 'ok   %s\n' "$name"
  else
    fail=$((fail + 1)); printf 'FAIL %s\n     expected to contain: %s\n     got: %s\n' "$name" "$expected" "$actual"
  fi
}

check_empty() {
  local name="$1" actual="$2"
  if [[ -z "$actual" ]]; then
    pass=$((pass + 1)); printf 'ok   %s\n' "$name"
  else
    fail=$((fail + 1)); printf 'FAIL %s\n     expected no output, got: %s\n' "$name" "$actual"
  fi
}

check_absent() {
  local name="$1" unexpected="$2" actual="$3"
  if [[ "$actual" != *"$unexpected"* ]]; then
    pass=$((pass + 1)); printf 'ok   %s\n' "$name"
  else
    fail=$((fail + 1)); printf 'FAIL %s\n     expected NOT to contain: %s\n     got: %s\n' "$name" "$unexpected" "$actual"
  fi
}

# --- a small session says nothing ------------------------------------------
make_transcript "$WORK/small.jsonl" 40000
check_empty "silent below the warn threshold" "$(run_hook "$WORK/small.jsonl" small)"

# --- exactly at the threshold warns (the boundary, where >= vs > goes wrong) -
make_transcript "$WORK/exact.jsonl" 100000
check "warns at exactly the warn threshold" "handoff" "$(run_hook "$WORK/exact.jsonl" exact)"

# --- the warning reaches the user on every channel the event supports -------
# systemMessage alone was silent in practice, so the hook now also injects the
# same warning into Claude's context and rings the terminal. One channel being
# dropped by the client must not make the whole warning disappear again.
make_transcript "$WORK/warn.jsonl" 120000
out="$(run_hook "$WORK/warn.jsonl" warn)"
check "emits systemMessage JSON" '"systemMessage"' "$out"
check "reports the rounded context size" "120k" "$out"
check "injects the warning into Claude's context" '"additionalContext"' "$out"
check "tags additionalContext with its event name" '"hookEventName":"UserPromptSubmit"' "$out"
check "repeats the context size in additionalContext" "120k" \
  "$(printf '%s' "$out" | jq -r '.hookSpecificOutput.additionalContext')"
check "rings the terminal so the warning survives a silent transcript" '"terminalSequence"' "$out"
check_absent "drops suppressOutput, which the client ignores anyway" '"suppressOutput"' "$out"
check "stays valid JSON" "ok" "$(printf '%s' "$out" | jq -e . >/dev/null 2>&1 && echo ok)"

# --- it does not nag: same band, second prompt, silence ---------------------
check_empty "stays quiet on a repeat prompt in the same band" "$(run_hook "$WORK/warn.jsonl" warn)"

# --- crossing into the urgent band speaks up again --------------------------
make_transcript "$WORK/urgent.jsonl" 170000
check "warns again when the session crosses into the urgent band" "170k" "$(run_hook "$WORK/urgent.jsonl" warn)"
check_empty "then goes quiet again inside the urgent band" "$(run_hook "$WORK/urgent.jsonl" warn)"

# --- after a compaction drops the context, the warning arms itself again -----
make_transcript "$WORK/postcompact.jsonl" 40000
check_empty "silent again once compaction drops the context" "$(run_hook "$WORK/postcompact.jsonl" warn)"
check "re-warns when the context climbs back after a compaction" "120k" "$(run_hook "$WORK/warn.jsonl" warn)"

# --- sessions are tracked independently -------------------------------------
check "a different session gets its own first warning" "120k" "$(run_hook "$WORK/warn.jsonl" other)"

# --- a transcript with no usage at all must not crash or speak ---------------
printf '{"type":"user","message":{"role":"user","content":"hi"}}\n' > "$WORK/nousage.jsonl"
check_empty "silent when no assistant turn has reported usage yet" "$(run_hook "$WORK/nousage.jsonl" nousage)"

# --- a missing transcript must not crash or speak ---------------------------
check_empty "silent when the transcript path does not exist" "$(run_hook "$WORK/gone.jsonl" gone)"

# --- a payload without transcript_path must not crash or speak --------------
check_empty "silent when the payload has no transcript_path" \
  "$(printf '{"session_id":"x","hook_event_name":"UserPromptSubmit"}' | bash "$HOOK")"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
