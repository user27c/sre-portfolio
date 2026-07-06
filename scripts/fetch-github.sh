#!/usr/bin/env bash
# Refresh data/github_fallback.json from GitHub API (for offline builds / CI without network).
set -euo pipefail

USERNAME="${1:-user27c}"
OUT="data/github_fallback.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

AUTH_HEADER=()
if [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

curl -fsSL "${AUTH_HEADER[@]}" -H "Accept: application/vnd.github+json" -H "User-Agent: hugo-blog" \
  "https://api.github.com/users/${USERNAME}" > "${TMP}/user.json"

curl -fsSL "${AUTH_HEADER[@]}" -H "Accept: application/vnd.github+json" -H "User-Agent: hugo-blog" \
  "https://api.github.com/users/${USERNAME}/repos?per_page=100&type=owner&sort=updated" > "${TMP}/repos.json"

python3 - "${TMP}/user.json" "${TMP}/repos.json" "${OUT}" <<'PY'
import json, sys
user_path, repos_path, out_path = sys.argv[1:4]
user = json.load(open(user_path))
repos = json.load(open(repos_path))
exclude = {"22-7-co.github.io"}
filtered = [r for r in repos if not r.get("fork") and r.get("name") not in exclude]
filtered.sort(key=lambda r: r.get("updated_at", ""), reverse=True)
json.dump({"user": user, "repos": filtered[:50]}, open(out_path, "w"), ensure_ascii=False, indent=2)
print(f"Wrote {out_path} ({len(filtered[:50])} repos)")
PY
