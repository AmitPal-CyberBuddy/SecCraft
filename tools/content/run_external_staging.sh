#!/usr/bin/env bash
# Executes the external staging sequence. It intentionally fails before any write if required staging configuration is absent.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
required=(PLATFORM_ENV PLATFORM_DATABASE_URL CONTENT_MIGRATION_DATABASE_URL CONTENT_DATABASE_RUNTIME_ROLE CONTENT_STORAGE_BACKEND SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY CONTENT_STORAGE_BUCKET CONTENT_RELEASE_ID STAGING_API_URL STAGING_PENDING_JWT STAGING_APPROVED_JWT STAGING_APPROVED_WITH_PROGRESS_JWT)
for name in "${required[@]}"; do [[ -n "${!name:-}" ]] || { echo "missing required staging variable: $name" >&2; exit 2; }; done
[[ "$PLATFORM_ENV" == prelaunch ]] || { echo "PLATFORM_ENV must be prelaunch" >&2; exit 2; }
[[ "$CONTENT_STORAGE_BACKEND" == supabase ]] || { echo "external staging requires CONTENT_STORAGE_BACKEND=supabase" >&2; exit 2; }
case "${PLATFORM_DATABASE_URL,,}${CONTENT_MIGRATION_DATABASE_URL,,}${SUPABASE_URL,,}" in *prod*|*production*) echo "refusing production-looking target" >&2; exit 2;; esac
[[ "$PLATFORM_DATABASE_URL" == postgresql* && "$CONTENT_MIGRATION_DATABASE_URL" == postgresql* ]] || { echo "external staging requires PostgreSQL" >&2; exit 2; }

# Create/verify the private bucket with the trusted service role. Public clients receive no bucket/object policy.
curl --fail --silent --show-error -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  --data "{\"id\":\"$CONTENT_STORAGE_BUCKET\",\"name\":\"$CONTENT_STORAGE_BUCKET\",\"public\":false,\"file_size_limit\":52428800}" >/dev/null \
  || curl --fail --silent --show-error "$SUPABASE_URL/storage/v1/bucket/$CONTENT_STORAGE_BUCKET" \
       -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" >/dev/null

(cd "$ROOT/backend" && PLATFORM_DATABASE_URL="$CONTENT_MIGRATION_DATABASE_URL" alembic -c alembic.ini upgrade head)
python "$ROOT/tools/content/bootstrap_synthetic_profiles.py"
python "$ROOT/tools/content/verify_external_staging.py" database
python "$ROOT/tools/content/import_content.py" stage --release "$CONTENT_RELEASE_ID" --database-url "$PLATFORM_DATABASE_URL"
# Mandatory idempotency proof.
python "$ROOT/tools/content/import_content.py" stage --release "$CONTENT_RELEASE_ID" --database-url "$PLATFORM_DATABASE_URL" | tee /tmp/seccraft-staging-idempotency.json
grep -q '"idempotent": true' /tmp/seccraft-staging-idempotency.json
python "$ROOT/tools/content/import_content.py" activate --release "$CONTENT_RELEASE_ID" --database-url "$PLATFORM_DATABASE_URL"
python "$ROOT/tools/content/verify_external_staging.py" storage
python "$ROOT/tools/content/verify_external_staging.py" authorization
CONTENT_BOUNDARY_BUILD=1 npm run build --prefix "$ROOT/frontend"
node "$ROOT/scripts/verify-public-boundary-build.mjs"
echo "External staging release $CONTENT_RELEASE_ID passed import, activation, Storage, authorization, and public-boundary checks."
