#!/usr/bin/env bash
# Obtain short-lived Supabase access tokens for the three synthetic pre-launch fixtures.
# Credential values and provider responses are never written to the job log.
set -euo pipefail
set +x

fixtures=(
  pending PENDING_EMAIL PENDING_PASSWORD
  approved-new APPROVED_NEW_EMAIL APPROVED_NEW_PASSWORD
  approved-progress APPROVED_PROGRESS_EMAIL APPROVED_PROGRESS_PASSWORD
)

# Validate the complete set before making any authentication request. This keeps a partial
# configuration from authenticating some fixtures before failing on a later one.
missing_credentials=0
for ((index = 0; index < ${#fixtures[@]}; index += 3)); do
  fixture="${fixtures[index]}"
  for offset in 1 2; do
    variable_name="${fixtures[index + offset]}"
    if [[ -z "${!variable_name:-}" ]]; then
      printf '::error title=Missing pre-launch account credential::Fixture %s is missing required credential %s; values are never printed.\n' \
        "$fixture" "$variable_name"
      missing_credentials=1
    fi
  done
done
if (( missing_credentials )); then
  exit 1
fi

for variable_name in SUPABASE_URL SUPABASE_ANON_KEY GITHUB_ENV; do
  if [[ -z "${!variable_name:-}" ]]; then
    printf '::error title=Missing pre-launch runtime setting::Required %s is unset; values are never printed.\n' \
      "$variable_name"
    exit 1
  fi
done

fail_fixture() {
  printf '::error title=Pre-launch fixture login failed::Fixture %s could not obtain an access token; credentials and provider response are never printed.\n' \
    "$1"
}

fetch_token() {
  local fixture="$1" email_name="$2" password_name="$3" output_name="$4"
  local email="${!email_name}" password="${!password_name}"
  local payload response access

  if ! payload="$(PRELAUNCH_TOKEN_EMAIL="$email" PRELAUNCH_TOKEN_PASSWORD="$password" \
    jq -cn '{email:env.PRELAUNCH_TOKEN_EMAIL,password:env.PRELAUNCH_TOKEN_PASSWORD}' 2>/dev/null)"; then
    fail_fixture "$fixture"
    return 1
  fi

  if ! response="$(printf '%s' "$payload" | curl --fail --silent --show-error --request POST \
    "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    --header "apikey: $SUPABASE_ANON_KEY" \
    --header 'Content-Type: application/json' \
    --data-binary @- 2>/dev/null)"; then
    fail_fixture "$fixture"
    return 1
  fi

  if ! access="$(jq -er '.access_token | select(type == "string" and length > 0)' \
    <<<"$response" 2>/dev/null)" || [[ -z "$access" ]]; then
    fail_fixture "$fixture"
    return 1
  fi

  # Register only a verified, non-empty value as a workflow mask. Store it in the named
  # shell variable without writing the token itself to the log.
  printf '::add-mask::%s\n' "$access"
  printf -v "$output_name" '%s' "$access"
}

pending=''
approved=''
progress=''
if ! fetch_token pending PENDING_EMAIL PENDING_PASSWORD pending; then
  exit 1
fi
if ! fetch_token approved-new APPROVED_NEW_EMAIL APPROVED_NEW_PASSWORD approved; then
  exit 1
fi
if ! fetch_token approved-progress APPROVED_PROGRESS_EMAIL APPROVED_PROGRESS_PASSWORD progress; then
  exit 1
fi

# Export only after all three logins returned non-empty access tokens.
printf 'STAGING_PENDING_JWT=%s\n' "$pending" >> "$GITHUB_ENV"
printf 'STAGING_APPROVED_JWT=%s\n' "$approved" >> "$GITHUB_ENV"
printf 'STAGING_APPROVED_WITH_PROGRESS_JWT=%s\n' "$progress" >> "$GITHUB_ENV"
