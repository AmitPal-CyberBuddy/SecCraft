#!/usr/bin/env bash
set -euo pipefail
bad="$(git ls-files | grep -E '(^|/)(\.env($|\.)|.*\.(db|sqlite|sqlite3|dump|backup|bak|sql\.gz|dump\.gz)$|staging-backup|prelaunch-backup|storage-export|recovery-export)' | grep -vE '(^|/)\.env\.example$|\.env\.example$' || true)"
if [[ -n "$bad" ]]; then
  echo "Sensitive/runtime files are tracked:" >&2
  echo "$bad" >&2
  exit 1
fi
# Detect common live credential shapes. Placeholder examples intentionally use REPLACE.
matches="$(git grep -I -n -E '(postgres(ql)?(\+psycopg)?://[^:/[:space:]]+:[^@[:space:]]+@|SUPABASE_SERVICE_ROLE_KEY=[^[:space:]]+|STAGING_(PENDING|APPROVED)_JWT=[^[:space:]]+)' -- ':!*.env.example' ':!scripts/verify-no-sensitive-files-tracked.sh' || true)"
matches="$(printf '%s\n' "$matches" | grep -vE 'disposable-ci-only@localhost|@(db|pooler)\.example\.test' || true)"
if [[ -n "$matches" ]]; then
  echo "$matches" >&2
  echo "Possible embedded database/service-role/token credential found." >&2
  exit 1
fi
echo "No tracked environment files, runtime databases, backups, exports, or embedded staging credentials."
