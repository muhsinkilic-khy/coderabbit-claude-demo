#!/usr/bin/env bash
set -euo pipefail

repo_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}"
pr_url="${repo_url}/pull/${PR_NUMBER}"

if [ "$JOB_STATUS" != "success" ]; then
  text="❌ PR #${PR_NUMBER} — Claude fix başarısız. <${RUN_URL}|Run log> · <${pr_url}|PR>"
elif [ "$SHA_BEFORE" = "$SHA_AFTER" ]; then
  text="ℹ️ PR #${PR_NUMBER} — Claude düzeltecek bir şey bulamadı. <${RUN_URL}|Run log> · <${pr_url}|PR>"
else
  text="✅ PR #${PR_NUMBER} düzeltildi → <${repo_url}/commit/${SHA_AFTER}|${SHA_AFTER:0:7}> · <${pr_url}|PR>"
fi

jq -n --arg t "$text" '{text: $t}' \
  | curl -sS --fail-with-body -X POST -H 'Content-Type: application/json' -d @- "$SLACK_WEBHOOK_URL"
