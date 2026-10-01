# WPS: Decide Whether a Test Applies Before Counting Guesses

> **Available now: offline observation and planning.** WPS PIN execution, actual lockout measurement and client effects are **NOT TESTED**. Hosted live labs are unavailable; no radio is required to finish this lesson.

## Start with the evidence you actually have

Use the [WF-AUTH-03 ZIP](/wireless-practice/WF-AUTH-03.zip), [scope](/wireless-practice/WF-AUTH-03/scope.md), [WPS capture](/wireless-practice/WF-AUTH-03/wps-beacon.pcapng) and [decoded WPS evidence](/wireless-practice/WF-AUTH-03/wps-beacon.json). Keep file hashes and frame numbers in the [worksheet](/wireless-practice/WF-AUTH-03/worksheet.md).

Frames 1–2 encode different advertised setup-lock states. Inspect config methods, selected registrar and device-password ID as well as the WPS presence flag. A vendor IE is an advertisement, not proof a registrar is reachable or accepting PIN attempts. An unset setup-lock flag is not a measured absence of rate limiting. A set flag does not prove every enrollment path is disabled forever.

Use the previous lesson's local `tshark -r` example or review the decoded JSON. Neither route sends enrollment messages. The teaching capture is not the source of the separate hypothetical log below.

## Separate the mechanisms

| Observation or method | What it supports | What it does not establish |
| --- | --- | --- |
| WPS IE / version / method bits | advertised enrollment capability | PIN reachability, vulnerable implementation or a recovered credential |
| Split PIN validation | conditional reduction to roughly 10^4 + 10^3 candidates | guaranteed completion in that many network attempts or any fixed duration |
| Setup locked advertised | state reported in that frame | persistence, cooldown, alternate interfaces or resistance to bypass |
| Pixie Dust applicability | requires specific implementation/randomness evidence | every WPS-enabled AP is vulnerable |
| PBC | a distinct enrollment mode/window | immunity to nearby unauthorized enrollment or the same PIN search model |

The checksum reduces the unknown digits, while distinguishable half-validation feedback enables the split search. Transport failures, retransmissions, lockout and firmware behavior are additional constraints. Do not multiply a guessed attempt rate by 11,000 and present it as an empirical recovery time.

## Apply a hard authorization budget

Open the [hypothetical W2 observations](/wireless-practice/WF-AUTH-03/wps-observations.json). They are authored examples, not a real device test. The window is 600 seconds, the limit three attempts, and a lock or service impact requires immediate stop.

1. Identify the first event that requires stopping. Does the count ceiling independently require the same decision?
2. A planning note assumes a 900-second cooldown. Is that a measured property? Can waiting that long justify another request inside this authorization window?
3. Which missing evidence prevents reporting a durable lockout control? Distinguish configuration, a reported state and actual behavior over time.
4. Propose a next owner-approved validation request. Do not power-cycle, bypass a lock or extend the window merely to finish a search.

A good result may be **insufficient evidence; no further attempts permitted**. That is a successful scope decision, not a failed attack to conceal.

## Recommend and retest without inventing execution

Where enrollment is unnecessary, recommend removing WPS exposure, including PIN. If a product retains PBC or has separately configurable PIN/registrar interfaces, verify the actual configuration and supported controls rather than assuming one setting covers all paths.

A future controlled retest needs an owner-approved device/firmware matrix, bounded attempts, lockout/impact stop conditions, AP/client logs, monitored service continuity and a restoration plan. Check intended enrollment still works and prohibited paths fail. Re-enumerating an IE alone cannot validate all of that. Record these as **proposed**, not executed.

Use the [public self-review guide](/wireless-practice/WF-AUTH-03/review-guide.md) after writing your decisions. The original capture, hypothetical log and proposed retest must remain clearly separated in your report. Offline completion does not establish WPS exploitation or physical-device competence.
