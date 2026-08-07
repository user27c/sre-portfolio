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
exclude = {"22-7-co.github.io", "sre-portfolio"}
filtered = [r for r in repos if not r.get("fork") and r.get("name") not in exclude]
filtered.sort(key=lambda r: r.get("updated_at", ""), reverse=True)
user_fields = ("login", "html_url", "avatar_url", "bio", "public_repos")
repo_fields = (
    "name", "html_url", "description", "language", "stargazers_count",
    "updated_at", "private", "fork",
)
snapshot = {
    "user": {key: user.get(key) for key in user_fields},
    "repos": [{key: repo.get(key) for key in repo_fields} for repo in filtered[:12]],
}
with open(out_path, "w", encoding="utf-8") as output:
    json.dump(snapshot, output, ensure_ascii=False, indent=2)
    output.write("\n")
print(f"Wrote {out_path} ({len(snapshot['repos'])} repos)")
PY
