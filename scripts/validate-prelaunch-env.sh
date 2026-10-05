#!/usr/bin/env bash
# Fail closed before dependency setup, authentication requests, or any external writes.
# This validates presence only; configured values are never printed.
set -euo pipefail

required=(
  'PLATFORM_DATABASE_URL|prelaunch environment secret PRELAUNCH_DATABASE_URL'
  'CONTENT_MIGRATION_DATABASE_URL|prelaunch environment secret PRELAUNCH_MIGRATION_DATABASE_URL'
  'CONTENT_BACKUP_DATABASE_URL|prelaunch environment secret PRELAUNCH_BACKUP_DATABASE_URL'
  'CONTENT_DATABASE_RUNTIME_ROLE|prelaunch environment variable CONTENT_DATABASE_RUNTIME_ROLE'
  'SUPABASE_URL|prelaunch environment variable SUPABASE_URL'
  'SUPABASE_ANON_KEY|prelaunch environment secret SUPABASE_ANON_KEY'
  'SUPABASE_SERVICE_ROLE_KEY|prelaunch environment secret SUPABASE_SERVICE_ROLE_KEY'
  'PENDING_EMAIL|prelaunch environment secret PRELAUNCH_PENDING_EMAIL'
  'PENDING_PASSWORD|prelaunch environment secret PRELAUNCH_PENDING_PASSWORD'
  'APPROVED_NEW_EMAIL|prelaunch environment secret PRELAUNCH_APPROVED_NEW_EMAIL'
  'APPROVED_NEW_PASSWORD|prelaunch environment secret PRELAUNCH_APPROVED_NEW_PASSWORD'
  'APPROVED_PROGRESS_EMAIL|prelaunch environment secret PRELAUNCH_APPROVED_PROGRESS_EMAIL'
  'APPROVED_PROGRESS_PASSWORD|prelaunch environment secret PRELAUNCH_APPROVED_PROGRESS_PASSWORD'
  'CONTENT_RELEASE_ID|workflow_dispatch input release_id'
)

for requirement in "${required[@]}"; do
  runtime_name="${requirement%%|*}"
  source_name="${requirement#*|}"
  if [[ -z "${!runtime_name:-}" ]]; then
    printf '::error title=Missing prelaunch configuration::Required %s is unset; configure the %s Values are never printed.\n' \
      "$runtime_name" "$source_name"
    exit 1
  fi
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
bash "$repo_root/scripts/verify-no-sensitive-files-tracked.sh"
