#!/usr/bin/env bash
# summary: Interactive setup for Sun Chaser's keys (Sentry, ROADMAP item 21). Shows
# which keys exist in .env.local and in the GitHub Actions secrets, prompts for
# missing/new values with hidden input, writes them to .env.local (gitignored,
# chmod 600) and optionally mirrors them to GitHub Actions secrets via `gh`.
# Usage: npm run setup:keys   (or: bash scripts/setup-keys.sh)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

# KEY|where to get it
KEYS=(
  "VITE_SENTRY_DSN|sentry.io → ainabler → sun-chaser → Settings → Client Keys (DSN). Public, baked into the bundle at build time; empty = Sentry off"
  "SENTRY_AUTH_TOKEN|sentry.io → Settings → Auth Tokens (Organization token, scope project:releases). Secret, build-time only: uploads source maps"
)

GH_SECRETS=""
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  GH_SECRETS=$(gh secret list 2>/dev/null || true)
  HAVE_GH=1
else
  HAVE_GH=0
fi

echo "Sun Chaser key setup — values go to $ENV_FILE (gitignored)."
[ "$HAVE_GH" = 1 ] && echo "GitHub Actions secrets can be updated too (gh is logged in)."
echo "Empty input skips a key."
echo

for entry in "${KEYS[@]}"; do
  key="${entry%%|*}"
  hint="${entry#*|}"

  local_state="missing"
  grep -q "^${key}=" "$ENV_FILE" && local_state="set"
  gh_state="unknown"
  if [ "$HAVE_GH" = 1 ]; then
    if printf '%s\n' "$GH_SECRETS" | grep -q "^${key}[[:space:]]"; then gh_state="set"; else gh_state="missing"; fi
  fi

  echo "── $key"
  echo "   source: $hint"
  echo "   .env.local: $local_state | GitHub secret: $gh_state"
  printf "   new value (empty = keep/skip): "
  read -r -s value || true
  echo
  if [ -z "$value" ]; then
    echo "   skipped."
    echo
    continue
  fi

  # update or append in .env.local
  if grep -q "^${key}=" "$ENV_FILE"; then
    tmp=$(mktemp) && grep -v "^${key}=" "$ENV_FILE" > "$tmp" && mv "$tmp" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
  printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  echo "   written to $ENV_FILE."

  if [ "$HAVE_GH" = 1 ]; then
    printf "   also set as GitHub Actions secret? [y/N] "
    read -r answer || true
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
      if printf '%s' "$value" | gh secret set "$key" >/dev/null 2>&1; then
        echo "   GitHub secret set."
      else
        echo "   WARNING: gh secret set failed — add it manually: repo → Settings → Secrets and variables → Actions."
      fi
    fi
  fi
  echo
done

echo "Done. Restart 'npm run dev' to pick up VITE_SENTRY_DSN; 'npm run build' uploads source maps when SENTRY_AUTH_TOKEN is set."
