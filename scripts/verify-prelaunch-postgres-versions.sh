#!/usr/bin/env bash
# Fail-closed PostgreSQL major-version diagnostic for the pre-launch backup/restore run.
#
# Verifies that the pg_dump, pg_restore, and psql clients resolved from PATH all report the
# expected major version (17 by default, overridable via the first argument), and that both
# the external staging database (backup source, CONTENT_BACKUP_DATABASE_URL) and the
# disposable recovery database (restore target, CONTENT_RECOVERY_DATABASE_URL) report the
# same major version. Any missing tool, unreachable server, unparsable version, or mismatch
# exits non-zero before a backup is attempted; nothing is ever written to either database.
#
# Connection strings are secrets: they reach psql only through PGDATABASE (never process
# arguments or shell traces), driver diagnostics are discarded because they can quote host
# and port details from the connection string, and only version numbers, target labels, and
# resolved client binary paths are printed. Database URLs must never appear in the output.
set -euo pipefail
set +x

expected_major="${1:-17}"
if ! [[ "$expected_major" =~ ^[0-9]+$ ]]; then
  printf '::error title=Invalid expected PostgreSQL major version::The expected major version must be a non-negative integer; arguments and connection strings are never printed.\n'
  exit 1
fi

check_client_tool() {
  local tool="$1" resolved version major
  if ! resolved="$(command -v "$tool" 2>/dev/null)" || [[ -z "$resolved" ]]; then
    printf '::error title=Missing PostgreSQL client tool::%s is not on PATH; add /usr/lib/postgresql/%s/bin to GITHUB_PATH before the backup step.\n' \
      "$tool" "$expected_major"
    return 1
  fi
  if ! version="$("$resolved" --version 2>/dev/null)"; then
    printf '::error title=Unusable PostgreSQL client tool::%s --version failed; no further client diagnostics are printed.\n' "$tool"
    return 1
  fi
  # Accepts shapes such as "pg_dump (PostgreSQL) 17.5" or "psql (PostgreSQL) 16.8 (Ubuntu ...)".
  if [[ "$version" =~ \(PostgreSQL\)[[:space:]]+([0-9]+)(\.[0-9]+)* ]]; then
    major="${BASH_REMATCH[1]}"
  else
    printf '::error title=Unparsable PostgreSQL client version::%s reported a version string that could not be parsed.\n' "$tool"
    return 1
  fi
  if (( major != expected_major )); then
    printf '::error title=PostgreSQL client/server major-version mismatch::%s resolves to major %s but this run requires major %s; prepend /usr/lib/postgresql/%s/bin to GITHUB_PATH before the backup step.\n' \
      "$tool" "$major" "$expected_major" "$expected_major"
    return 1
  fi
  printf 'client %s: major %s (resolved from %s)\n' "$tool" "$major" "$resolved"
}

check_server_major() {
  local label="$1" url_variable="$2" server_version_num major
  if [[ -z "${!url_variable:-}" ]]; then
    printf '::error title=Missing database URL::Required %s is unset; connection strings are never printed.\n' "$url_variable"
    return 1
  fi
  # PGDATABASE carries the connection string so the URL never appears in process arguments,
  # shell traces, or step logs; psql stderr is discarded because driver diagnostics can
  # quote host and port details taken from that connection string. Read-only by design:
  # SHOW server_version_num cannot mutate releases or any other staging state.
  if ! server_version_num="$(PGDATABASE="${!url_variable}" PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}" \
    psql -X -A -t -c 'SHOW server_version_num' 2>/dev/null)"; then
    printf '::error title=Unreachable PostgreSQL server::The %s database did not report its server version; the connection string is never printed.\n' "$label"
    return 1
  fi
  server_version_num="${server_version_num//[[:space:]]/}"
  if ! [[ "$server_version_num" =~ ^[0-9]+$ ]]; then
    printf '::error title=Unparsable PostgreSQL server version::The %s database reported a server version that could not be parsed.\n' "$label"
    return 1
  fi
  # server_version_num is MAJOR*10000+minor for PostgreSQL 10+ (and MAJOR*10000+MINOR*100+patch
  # for legacy releases, whose computed major still cannot equal the expected modern major).
  major=$(( 10#$server_version_num / 10000 ))
  if (( major != expected_major )); then
    printf '::error title=PostgreSQL client/server major-version mismatch::The %s server is major %s but this run requires major %s; the connection string is never printed.\n' \
      "$label" "$major" "$expected_major"
    return 1
  fi
  printf 'server %s: major %s (server_version_num %s)\n' "$label" "$major" "$server_version_num"
}

status=0
for tool in pg_dump pg_restore psql; do
  check_client_tool "$tool" || status=1
done
if (( status )); then
  # Fail before contacting any external server: the clients must be correct first.
  printf '::error title=PostgreSQL major-version diagnostic failed::Backup and restore are blocked because the client toolchain does not report major %s; database URLs are never printed.\n' "$expected_major"
  exit 1
fi

check_server_major 'external staging backup source' CONTENT_BACKUP_DATABASE_URL || status=1
check_server_major 'disposable recovery restore target' CONTENT_RECOVERY_DATABASE_URL || status=1
if (( status )); then
  printf '::error title=PostgreSQL major-version diagnostic failed::Backup and restore are blocked until every client and server reports major %s; database URLs are never printed.\n' "$expected_major"
  exit 1
fi

printf 'PostgreSQL major-version diagnostic passed: pg_dump, pg_restore, and psql clients plus both servers report major %s.\n' "$expected_major"
