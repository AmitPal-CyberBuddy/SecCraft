#!/usr/bin/env bash
# Bounded readiness probe for the disposable PostgreSQL recovery service.
#
# The recovery database is a throwaway service container. Its published port can lag behind the
# container health check, so before the version diagnostic and the restore run this script waits
# for the server to accept connections. It retries for a bounded period (attempts x interval,
# 24 x 5s by default, both overridable through PRELAUNCH_RECOVERY_READINESS_ATTEMPTS and
# PRELAUNCH_RECOVERY_READINESS_INTERVAL), then fails clearly.
#
# The connection string is a secret: it is normalised in memory and handed to pg_isready as its
# connection argument, and nothing from it is ever printed. Only the attempt count and, on
# failure, the annotated cause are reported. Shell tracing stays off so no invocation is echoed.
set -euo pipefail
set +x

# Resolve the shared helper directory with bash builtins only: the diagnostic must keep working
# under a hermetic PATH where only the PostgreSQL tools resolve.
source_path="${BASH_SOURCE[0]}"
[[ "$source_path" == /* ]] || source_path="$PWD/$source_path"
script_dir="${source_path%/*}"
# shellcheck source=scripts/lib/prelaunch-db-url.sh
. "$script_dir/lib/prelaunch-db-url.sh"

variable="${1:-CONTENT_RECOVERY_DATABASE_URL}"
attempts="${PRELAUNCH_RECOVERY_READINESS_ATTEMPTS:-24}"
interval="${PRELAUNCH_RECOVERY_READINESS_INTERVAL:-5}"
raw_url="${!variable:-}"
cli_url=''

if ! [[ "$attempts" =~ ^[0-9]+$ ]] || (( attempts < 1 )); then
  prelaunch_url_error 'Invalid recovery readiness budget' \
    'PRELAUNCH_RECOVERY_READINESS_ATTEMPTS must be a positive integer; no value is printed.'
  exit 1
fi
if ! [[ "$interval" =~ ^[0-9]+$ ]]; then
  prelaunch_url_error 'Invalid recovery readiness interval' \
    'PRELAUNCH_RECOVERY_READINESS_INTERVAL must be a non-negative number of seconds; no value is printed.'
  exit 1
fi
if ! cli_url="$(prelaunch_cli_url "$variable" "$raw_url")"; then
  exit 1
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  prelaunch_url_error 'Missing PostgreSQL readiness tool' \
    'pg_isready is not on PATH; add the PostgreSQL client bin directory to GITHUB_PATH before this step.'
  exit 1
fi

attempt=0
while (( attempt < attempts )); do
  attempt=$(( attempt + 1 ))
  # pg_isready only reports whether the server accepts connections; its diagnostics can quote the
  # host and port, so they are discarded and replaced by the annotated failure below.
  if pg_isready --dbname "$cli_url" --timeout 5 >/dev/null 2>&1; then
    printf 'recovery PostgreSQL service is accepting connections (attempt %s of %s)\n' "$attempt" "$attempts"
    exit 0
  fi
  if (( attempt < attempts )); then
    sleep "$interval"
  fi
done

prelaunch_url_error 'Disposable recovery PostgreSQL unavailable' \
  "The disposable recovery database did not accept connections within $attempts attempts; the connection string is never printed."
exit 1
