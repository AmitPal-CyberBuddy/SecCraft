#!/usr/bin/env bash
# Shared, secret-safe PostgreSQL URL helpers for the pre-launch workflow scripts.
#
# The PostgreSQL CLI tools (psql, pg_dump, pg_restore) accept only an ordinary
# postgresql:// connection string: a SQLAlchemy URL such as postgresql+psycopg:// is not a
# valid connection string for them, and libpq never parses PGDATABASE as a URI at all. These
# helpers therefore do exactly three things and nothing else:
#
#   1. reject an unset or empty variable before any PostgreSQL tool or server is touched,
#   2. normalise postgres:// and postgresql+<driver>:// spellings to postgresql:// in memory,
#   3. redact a connection string, and every component of it, from diagnostic text.
#
# A connection string is only ever produced on stdout for the caller to capture; it is never
# echoed into a log, and every diagnostic path that could quote part of one is redacted first.
# The caller must keep `set +x`; these helpers must never be run under shell tracing.

# prelaunch_url_error TITLE MESSAGE — one annotation, never a value. Written to stderr so the
# annotation is still visible when the caller captures a helper's stdout.
prelaunch_url_error() {
  printf '::error title=%s::%s\n' "$1" "$2" >&2
}

# prelaunch_cli_url VARIABLE RAW_VALUE — print the postgresql:// spelling of RAW_VALUE.
# Fails closed, naming only the variable, when the value is empty or uses another scheme.
prelaunch_cli_url() {
  local variable="$1" raw="$2" lowered
  if [[ -z "$raw" ]]; then
    prelaunch_url_error 'Missing database URL' \
      "Required $variable is unset or empty, so the run stops before any PostgreSQL tool or server is contacted; connection strings are never printed."
    return 1
  fi
  lowered="${raw,,}"
  case "$lowered" in
    postgresql://*)
      printf '%s' "$raw"
      ;;
    postgres://*|postgresql+*://*)
      # SQLAlchemy spellings (for example postgresql+psycopg://) are converted entirely in
      # memory to the ordinary postgresql:// scheme the CLI tools require.
      printf 'postgresql://%s' "${raw#*://}"
      ;;
    *)
      prelaunch_url_error 'Unusable database URL' \
        "$variable must use the postgresql:// scheme that pg_dump, pg_restore, and psql accept; other schemes are rejected without printing the value."
      return 1
      ;;
  esac
}

# prelaunch_url_components URL — split URL into PRELAUNCH_URL_* globals for redaction.
# User information is split at the last unescaped '@' inside the authority section, which is
# how libpq itself resolves a URL (a password containing '@' therefore still redacts fully).
prelaunch_url_components() {
  local url="$1" rest authority userinfo
  PRELAUNCH_URL_USER=''
  PRELAUNCH_URL_PASSWORD=''
  PRELAUNCH_URL_HOST=''
  PRELAUNCH_URL_PORT=''
  PRELAUNCH_URL_DATABASE=''
  PRELAUNCH_URL_QUERY=''
  rest="${url#*://}"
  case "$rest" in
    *\?*) PRELAUNCH_URL_QUERY="${rest#*\?}" ;;
  esac
  rest="${rest%%\?*}"
  case "$rest" in
    */*) PRELAUNCH_URL_DATABASE="${rest#*/}" ;;
  esac
  authority="${rest%%/*}"
  case "$authority" in
    *@*)
      userinfo="${authority%@*}"
      authority="${authority##*@}"
      case "$userinfo" in
        *:*) PRELAUNCH_URL_USER="${userinfo%%:*}"; PRELAUNCH_URL_PASSWORD="${userinfo#*:}" ;;
        *) PRELAUNCH_URL_USER="$userinfo" ;;
      esac
      ;;
  esac
  case "$authority" in
    \[*\]*)
      PRELAUNCH_URL_HOST="${authority%%\]*}"
      PRELAUNCH_URL_HOST="${PRELAUNCH_URL_HOST#[}"
      case "$authority" in
        *\]:*) PRELAUNCH_URL_PORT="${authority##*\]:}" ;;
      esac
      ;;
    *)
      PRELAUNCH_URL_HOST="${authority%%:*}"
      case "$authority" in
        *:*) PRELAUNCH_URL_PORT="${authority##*:}" ;;
      esac
      ;;
  esac
}

# prelaunch_redact TEXT URL... — print TEXT with every given connection string, any URI-shaped
# token, and every component of those strings replaced by placeholders. Implemented with bash
# builtins only, so a caller can run it with a hermetic PATH that contains nothing but mocks.
prelaunch_redact() {
  local text="$1"
  shift
  local url component
  for url in "$@"; do
    [[ -n "$url" ]] || continue
    text="${text//"$url"/[REDACTED-CONNECTION-STRING]}"
    prelaunch_url_components "$url"
    for component in \
      "$PRELAUNCH_URL_PASSWORD" \
      "$PRELAUNCH_URL_USER" \
      "$PRELAUNCH_URL_HOST" \
      "$PRELAUNCH_URL_PORT" \
      "$PRELAUNCH_URL_DATABASE" \
      "$PRELAUNCH_URL_QUERY"; do
      [[ ${#component} -ge 3 ]] || continue
      text="${text//"$component"/[REDACTED]}"
    done
  done
  # Any remaining URI-shaped token (a spelling this diagnostic did not receive verbatim) and any
  # remaining user:password@ shape is removed as well.
  while [[ "$text" =~ (postgres(ql)?(\+[A-Za-z0-9_]+)?://[^[:space:]]*) ]]; do
    text="${text/"${BASH_REMATCH[1]}"/[REDACTED-CONNECTION-STRING]}"
  done
  while [[ "$text" =~ ([A-Za-z0-9._%+-]+:[^[:space:]:@/]+@) ]]; do
    text="${text/"${BASH_REMATCH[1]}"/[REDACTED-CREDENTIALS]}"
  done
  # Token shapes: a quoted Supabase JWT, a project/service key, or a bearer header must not
  # survive into a diagnostic either.
  while [[ "$text" =~ (eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}) ]]; do
    text="${text/"${BASH_REMATCH[1]}"/[REDACTED-SECRET]}"
  done
  while [[ "$text" =~ ((sb|sbp)_[A-Za-z0-9_-]{8,}) ]]; do
    text="${text/"${BASH_REMATCH[1]}"/[REDACTED-SECRET]}"
  done
  while [[ "$text" =~ ([Bb]earer[[:space:]]+[A-Za-z0-9._~+/=-]+) ]]; do
    text="${text/"${BASH_REMATCH[1]}"/[REDACTED-SECRET]}"
  done
  printf '%s' "$text"
}

# prelaunch_squeeze_words TEXT — collapse runs of whitespace (including newlines) to single
# spaces and trim the result, using only bash word splitting.
prelaunch_squeeze_words() {
  local text="$1"
  [[ -n "$text" ]] || {
    printf ''
    return 0
  }
  # shellcheck disable=SC2086
  set -- $text
  printf '%s' "$*"
}
