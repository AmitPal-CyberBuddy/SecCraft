#!/usr/bin/env python3
"""Guard rails for the "no invented data" rule.

The hosted build must never present fabricated content: no mock learners, no synthetic activity
feeds, no placeholder hashes, no "verified" badges that nothing verified, and no third-party requests
(which would leak the fact that a learner opened the academy). This script fails the build when one of
those patterns comes back.

It is deliberately a *pattern* check, not a semantic proof: it catches the specific regressions that
already happened once, plus the generic markers ("mock", "lorem", "fake", "dummy", "TODO data").
Anything it cannot decide is reported as a warning so a human can look.

Usage:  python3 scripts/verify-no-dummy-data.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
SRC = FRONTEND / "src"
PUBLIC = FRONTEND / "public"

failures: list[str] = []
warnings: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def source_files() -> list[Path]:
    files: list[Path] = []
    for pattern in ("**/*.tsx", "**/*.ts"):
        for path in SRC.glob(pattern):
            if "node_modules" in path.parts:
                continue
            files.append(path)
    return files


# 1 ── Fabricated-data markers in shipped source ------------------------------------------------
# Words that may legitimately appear: "mock" in a comment describing what was removed,
# "fake" inside a "no fake" statement. Those are checked by looking at the line's context.
BANNED_LINE_PATTERNS = [
    (re.compile(r"\bmock(Api|Data|Frames?|Users?|Leaderboard|Feed)?\b", re.I), "mock data marker"),
    (re.compile(r"\blorem ipsum\b", re.I), "lorem ipsum text"),
    (re.compile(r"\bTODO:?\s*(data|content|fix later|placeholder)", re.I), "placeholder TODO"),
    (re.compile(r"\b(dummy|sample|example) (users?|students?|operators?|findings?|captures?|pcaps?)\b", re.I), "placeholder dataset"),
]

ALLOWED_CONTEXTS = (
    "no mock", "not a mock", "never", "removed", "previously", "used to", "instead of", "rather than",
    "deliberately", "would", "must never", "no fake", "not fake", "verify-no-dummy-data",
    "not evidence", "no sample", "never pre-written", "you are not shown",
)

for path in source_files():
    for number, line in enumerate(read(path).splitlines(), start=1):
        lowered = line.lower()
        for pattern, label in BANNED_LINE_PATTERNS:
            if pattern.search(line) and not any(ctx in lowered for ctx in ALLOWED_CONTEXTS):
                # comments explaining history are fine; JSX/code is not
                stripped = line.strip()
                is_comment = stripped.startswith(("//", "*", "/*"))
                entry = f"{path.relative_to(ROOT)}:{number} {label}: {stripped[:100]}"
                (warn if is_comment else fail)(entry)

# 2 ── Randomly generated hashes presented as evidence -----------------------------------------
RANDOM_HASH = re.compile(r"(sha256|hash)\s*[:=]\s*[`'\"][^`'\"]*(\$\{|\bMath\.random\b|\.random\(\))", re.I)
for path in source_files():
    for number, line in enumerate(read(path).splitlines(), start=1):
        if RANDOM_HASH.search(line) and "compute" not in line.lower():
            warn(f"{path.relative_to(ROOT)}:{number} generated hash value in code — make sure it is a real digest")

# 3 ── Third-party requests anywhere in the app shell -------------------------------------------
EXTERNAL = re.compile(r"https?://(?!localhost|127\.0\.0\.1)([a-z0-9.-]+)", re.I)
html = read(FRONTEND / "index.html")
for match in EXTERNAL.finditer(html):
    fail(f"frontend/index.html references {match.group(0)} — the shell must stay origin-free")

for path in (SRC / "index.css",):
    for match in EXTERNAL.finditer(read(path)):
        if not match.group(1).startswith(("w3.org", "schema.org")):
            fail(f"{path.relative_to(ROOT)} references {match.group(0)}")

# 4 ── The lab datasets must exist and be non-trivial ------------------------------------------
LAB_DATA = PUBLIC / "lab-data"
PCAPS = PUBLIC / "pcaps"

manifest_path = PUBLIC / "pcaps" / "MANIFEST.md"
if not LAB_DATA.exists():
    fail("frontend/public/lab-data is missing — the offline datasets are what make the hosted build work")
else:
    datasets = sorted(LAB_DATA.glob("*.json"))
    if len(datasets) < 16:
        fail(f"only {len(datasets)} offline datasets found; the catalogue ships 16")
    for dataset in datasets:
        try:
            data = json.loads(dataset.read_text())
        except json.JSONDecodeError:
            fail(f"{dataset.name} is not valid JSON")
            continue
        frames = data.get("frames") or []
        if not frames:
            fail(f"{dataset.name} contains no frames")
        if data.get("method") in (None, "", "mock"):
            fail(f"{dataset.name} has no real decoding method recorded")
    captured = {p.stem for p in PCAPS.rglob("*.pcapng")}
    missing = {p.stem for p in datasets} - captured
    if missing:
        warn(f"datasets without a matching capture file: {sorted(missing)}")
    if not manifest_path.exists():
        warn("frontend/public/pcaps/MANIFEST.md is missing")

# 5 ── Fabricated responses in the optional backend ---------------------------------------------
BACKEND = ROOT / "backend"
for path in BACKEND.rglob("*.py"):
    text = read(path)
    if re.search(r"def mock_frames|SCAPY_AVAILABLE\s*else\s*\(\"mock\"\)", text):
        fail(f"{path.relative_to(ROOT)} reintroduced a mock frame path")
    if 'method = "mock' in text:
        fail(f"{path.relative_to(ROOT)} labels a response as mock")

# 6 ── Copy that claims a feature the build does not have ----------------------------------------
CLAIM_PATTERNS = [
    (re.compile(r"\bproduction[- ]ready\b", re.I), "production-ready claim"),
    (re.compile(r"\benterprise[- ](ready|grade|platform)\b", re.I), "enterprise-ready claim"),
    (re.compile(r"\b(chatgpt|gpt-4|openai)\b", re.I), "AI service claim"),
    (re.compile(r"\b(sso|saml|ldap)\b", re.I), "identity-provider claim"),
    (re.compile(r"\b(blockchain|web3)\b", re.I), "blockchain claim"),
]
for path in source_files():
    for number, line in enumerate(read(path).splitlines(), start=1):
        for pattern, label in CLAIM_PATTERNS:
            if pattern.search(line):
                fail(f"{path.relative_to(ROOT)}:{number} {label}: {line.strip()[:100]}")

# ── Report -------------------------------------------------------------------------------------
for warning in warnings:
    print(f"  warn  {warning}")

if failures:
    print(f"\n{len(failures)} problem(s) found:\n")
    for failure in failures:
        print(f"  FAIL  {failure}")
    print("\nThese patterns mean the hosted build would show content that was not earned or measured.")
    sys.exit(1)

print("no dummy data, no external requests, no unearned claims")
