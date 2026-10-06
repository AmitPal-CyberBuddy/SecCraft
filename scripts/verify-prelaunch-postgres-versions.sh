#!/usr/bin/env bash
# Fail-closed PostgreSQL major-version diagnostic for the pre-launch backup/restore run.
#
# Verifies that the pg_dump, pg_restore, and psql clients resolved from PATH all report the
# expected major version (17 by default, overridable through the first argument) and that the
# external staging database (backup source, CONTENT_BACKUP_DATABASE_URL) and the disposable
# recovery database (restore target, CONTENT_RECOVERY_DATABASE_URL) report the same major
# version. A missing tool, unset or unusable URL, unreachable server, unparsable version, or
# mismatch exits non-zero before a backup is attempted; nothing is ever written to either
# database, so existing pre-launch releases stay immutable.
#
# Connection strings are secrets. Each value is normalised in memory (see
# scripts/lib/prelaunch-db-url.sh) to the ordinary postgresql:// spelling the PostgreSQL CLI
# tools accept, then handed to psql as its connection argument. PGDATABASE is deliberately not
# used: libpq treats that variable as a literal database name and never parses it as a URI, so
# an earlier version of this diagnostic silently connected to the local socket and reported
# both servers as unreachable. psql output is captured and redacted before any of it is
# printed, so a URL -- or its user, password, host, port, or database name -- cannot reach the
# log. Server probes are read-only (`SHOW server_version_num`).
set -euo pipefail
set +x

# Resolve the shared helper directory with bash builtins only: the diagnostic must keep working
# under a hermetic PATH where only the PostgreSQL tools resolve.
source_path="${BASH_SOURCE[0]}"
[[ "$source_path" == /* ]] || source_path="$PWD/$source_path"
script_dir="${source_path%/*}"
# shellcheck source=scripts/lib/prelaunch-db-url.sh
. "$script_dir/lib/prelaunch-db-url.sh"

expected_major="${1:-17}"
if ! [[ "$expected_major" =~ ^[0-9]+$ ]]; then
  prelaunch_url_error 'Invalid expected PostgreSQL major version' \
    'The expected major version must be a non-negative integer; arguments and connection strings are never printed.'
  exit 1
fi

pg_dump_major=''
pg_restore_major=''
psql_major=''
source_major=''
recovery_major=''
status=0

check_client_tool() {
  local tool="$1" resolved version major
  if ! resolved="$(command -v "$tool" 2>/dev/null)" || [[ -z "$resolved" ]]; then
    prelaunch_url_error 'Missing PostgreSQL client tool' \
      "$tool is not on PATH; add /usr/lib/postgresql/$expected_major/bin to GITHUB_PATH before the backup step."
    return 1
  fi
  if ! version="$("$resolved" --version 2>/dev/null)"; then
    prelaunch_url_error "Unusable PostgreSQL client tool" \
      "$tool --version failed; no further client diagnostics are printed."
    return 1
  fi
  # Accepts shapes such as "pg_dump (PostgreSQL) 17.5" or "psql (PostgreSQL) 16.8 (Ubuntu ...)".
  if [[ "$version" =~ \(PostgreSQL\)[[:space:]]+([0-9]+)(\.[0-9]+)* ]]; then
    major="${BASH_REMATCH[1]}"
  else
    prelaunch_url_error 'Unparsable PostgreSQL client version' \
      "$tool reported a version string that could not be parsed."
    return 1
  fi
  if (( major != expected_major )); then
    prelaunch_url_error 'PostgreSQL client/server major-version mismatch' \
      "$tool resolves to major $major but this run requires major $expected_major; prepend /usr/lib/postgresql/$expected_major/bin to GITHUB_PATH before the backup step."
    return 1
  fi
  case "$tool" in
    pg_dump) pg_dump_major="$major" ;;
    pg_restore) pg_restore_major="$major" ;;
    psql) psql_major="$major" ;;
  esac
  printf 'client %s: major %s (resolved from %s)\n' "$tool" "$major" "$resolved"
}

# Print the sanitised libpq/psql diagnostic, bounded to a few lines, so a failure names its real
# cause (refused connection, authentication failure, missing database, timeout) without ever
# quoting the connection string or any part of it.
report_psql_diagnostic() {
  local output="$1" raw_url="$2" cli_url="$3" sanitised bounded
  sanitised="$(prelaunch_redact "$output" "$raw_url" "$cli_url")"
  sanitised="$(prelaunch_squeeze_words "$sanitised")"
  bounded="${sanitised:0:300}"
  [[ -n "$bounded" ]] || bounded='no diagnostic text was produced'
  printf 'psql reported: %s\n' "$bounded"
}

check_server_major() {
  local label="$1" variable="$2" cli_url="$3" raw_url="${!2:-}" output probe_status server_version_num major
  set +e
  # The connection string is psql's connection argument (never PGDATABASE, which libpq treats as
  # a plain database name). Output and diagnostics are captured, sanitised, then summarised.
  output="$(PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}" psql --no-psqlrc --no-align --tuples-only --quiet \
    --command 'SHOW server_version_num' --dbname "$cli_url" 2>&1)"
  probe_status=$?
  set -e
  if (( probe_status != 0 )); then
    prelaunch_url_error 'Unreachable PostgreSQL server' \
      "The $label database did not report its server version (psql exit $probe_status); the connection string is never printed."
    report_psql_diagnostic "$output" "$raw_url" "$cli_url"
    return 1
  fi
  server_version_num="${output//[[:space:]]/}"
  if ! [[ "$server_version_num" =~ ^[0-9]+$ ]]; then
    prelaunch_url_error 'Unparsable PostgreSQL server version' \
      "The $label database reported a server version that could not be parsed."
    report_psql_diagnostic "$output" "$raw_url" "$cli_url"
    return 1
  fi
  # server_version_num is MAJOR*10000+minor for PostgreSQL 10+ (and MAJOR*10000+MINOR*100+patch
  # for legacy releases, whose computed major still cannot equal the expected modern major).
  major=$(( 10#$server_version_num / 10000 ))
  if (( major != expected_major )); then
    prelaunch_url_error 'PostgreSQL client/server major-version mismatch' \
      "The $label server is major $major but this run requires major $expected_major; the connection string is never printed."
    return 1
  fi
  printf 'server %s: major %s (server_version_num %s)\n' "$label" "$major" "$server_version_num"
  case "$label" in
    source*) source_major="$major" ;;
    recovery*) recovery_major="$major" ;;
  esac
}

# Preflight both connection strings before anything else: an unset, empty, or unusable URL must
# stop the run before a single PostgreSQL tool or server is invoked.
source_cli_url=''
recovery_cli_url=''
source_cli_url="$(prelaunch_cli_url CONTENT_BACKUP_DATABASE_URL "${CONTENT_BACKUP_DATABASE_URL:-}")" || status=1
recovery_cli_url="$(prelaunch_cli_url CONTENT_RECOVERY_DATABASE_URL "${CONTENT_RECOVERY_DATABASE_URL:-}")" || status=1
if (( status )); then
  prelaunch_url_error 'PostgreSQL major-version diagnostic failed' \
    "Backup and restore are blocked because a required database URL is missing or unusable; no PostgreSQL tool or server was contacted and connection strings are never printed."
  exit 1
fi

for tool in pg_dump pg_restore psql; do
  check_client_tool "$tool" || status=1
done
if (( status )); then
  # Fail before contacting any external server: the clients must be correct first.
  prelaunch_url_error 'PostgreSQL major-version diagnostic failed' \
    "Backup and restore are blocked because the client toolchain does not report major $expected_major; database URLs are never printed."
  exit 1
fi

check_server_major 'source (CONTENT_BACKUP_DATABASE_URL)' CONTENT_BACKUP_DATABASE_URL "$source_cli_url" || status=1
check_server_major 'recovery (CONTENT_RECOVERY_DATABASE_URL)' CONTENT_RECOVERY_DATABASE_URL "$recovery_cli_url" || status=1
if (( status )); then
  prelaunch_url_error 'PostgreSQL major-version diagnostic failed' \
    "Backup and restore are blocked until every client and server reports major $expected_major; database URLs are never printed."
  exit 1
fi

printf 'PostgreSQL compatibility verified: pg_dump=%s, pg_restore=%s, psql=%s, source=%s, recovery=%s\n' \
  "$pg_dump_major" "$pg_restore_major" "$psql_major" "$source_major" "$recovery_major"
