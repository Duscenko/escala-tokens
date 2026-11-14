#!/usr/bin/env bash
# Unattended Escala refactor loop: one queue task per Claude Code run, one commit per task.
# Usage (from the repo root):  bash refactor/run-loop.sh            # up to 30 iterations
#                              MAX=5 bash refactor/run-loop.sh      # shorter run
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

QUEUE=refactor/QUEUE.md
PROMPT=refactor/LOOP_PROMPT.md
BRANCH=${BRANCH:-refactor/escala-v0.11}
MAX=${MAX:-30}
LOG=refactor/loop.log

git diff --quiet && git diff --cached --quiet || { echo "Working tree not clean. Commit or stash first."; exit 1; }
git switch "$BRANCH" 2>/dev/null || git switch -c "$BRANCH"

for i in $(seq 1 "$MAX"); do
  if ! grep -q '^- \[ \]' "$QUEUE"; then echo "Queue empty. Done."; break; fi
  if grep -q '^- \[!\]' "$QUEUE"; then echo "A task is blocked ([!]). Read $QUEUE, decide, then rerun."; break; fi

  echo "=== Iteration $i — $(grep -m1 '^- \[ \]' "$QUEUE") ===" | tee -a "$LOG"
  claude -p "$(cat "$PROMPT")" \
    --permission-mode acceptEdits \
    --allowedTools "Read,Edit,Write,Grep,Glob,Bash(npm run *),Bash(pnpm *),Bash(npx *),Bash(git add *),Bash(git commit *),Bash(git status*),Bash(git diff*),Bash(git log*),Bash(git checkout -- *)" \
    --max-turns 80 2>&1 | tee -a "$LOG"

  git diff --quiet || { echo "Iteration left uncommitted changes — stopping for review."; break; }
done

echo "Branch: $BRANCH — review with: git log --oneline main..$BRANCH"
