# WiFiForge — Technical Review and Disposition of Suggestions

**Date:** 2026-09-28 · **Scope:** the repository at `AmitPal-CyberBuddy/WiFiForge` (commit `6a6c678`),
reviewed against the 22-point suggestion list. The list was treated as **proposals to evaluate**, not a
specification: each item was checked against the actual code, artefacts and content before deciding
**implement / modify / merge / defer / reject**.

The engineering standard applied throughout: *a claim in a lesson, a challenge answer or a report template is
only acceptable if an artefact in this repository can be used to verify it.*

---

## 0. What was found (the honest baseline)

| # | Finding | Evidence |
| --- | --- | --- |
| F1 | **The 80 lesson files were substitution-templated, not authored.** Numbered lessons were ~620 lines each with a fixed 11-section skeleton, and 217 identical padding comment blocks; `01-intro-wireless/01-what-is-wireless.md` was a different (self-duplicating) hand-written file. | line counts + grep of padding markers before this work |
| F2 | **Severity was hard-coded per technique** (WEP 7.5, WPA2-PSK weak 8.2, PMKID 6.5, WPS 7.4, deauth 6.5, rogue AP 8.1, RADIUS secret 9.8, transition 6.8, PMF off 6.5, PEAP-MSCHAPv2 8.0, EAP-TLS 7.5, no-isolation 8.5) across lessons and components. | `grep -n "CVSS"` on lesson §1/§4.2 |
| F3 | **Offline-guessing guidance treated the 4-way handshake as the prerequisite**: PMKID was presented as a variant rather than the clientless collection path it is. Legacy hashcat modes were quoted alongside the unified mode. | module 09 lessons (old), `TerminalEmulator.tsx` |
| F4 | **Deprecated Wireshark field namespace** `wlan_mgt.*` used in lessons, components and the backend parser (`wlan_mgt.ds.current_channel`, `wlan_mgt.fixed.beacon`, `wlan_mgt.rsn.*`). | repo-wide grep |
| F5 | **Regulatory guidance** directed learners to set a domain (`iw reg set …`, 162 occurrences) as generic preparation instead of reading it (`iw reg get`) and treating domain choice as jurisdictional. | repo-wide grep |
| F6 | **The captures could not support the exercises.** All 16 `frontend/public/pcaps/**` files were 129–1 900 byte classic libpcap files with the `.pcapng` extension, hand-built frames, **no real EAPOL/RADIUS structure** (RADIUS payloads were not even encapsulated in IP/UDP), and no valid MIC/PMKID/authenticator material. Challenge answers referenced frames that did not contain the claimed values (e.g. a hidden SSID "revealed" in a frame whose SSID IE was empty). | byte-level inventory of all 16 files; decode of every frame |
| F7 | **Claims misaligned with data**: `Reference.tsx` advertised 50+ commands / 20+ filters while shipping 6 and 8; the static feature roadmap was platform-heavy (leaderboards, XP shop, marketplace, mobile apps) and contradicted the zero-cost learning goal. | `Reference.tsx`, the superseded feature-roadmap document |
| F8 | **Existing systems were sound and worth keeping**: routing (10 routes), visual identity, zustand progress store, `PcapInspector`/`ReconMap`/`HandshakeDiagram`/`ConfigViewer`/`AttackDefenseRetest`, `EvidenceVault`, the GitHub Pages workflow, and the tshark→scapy parser chain (its third fallback is now the verified offline dataset, not fabricated frames — see §6). | `App.tsx`, component inventory, `.github/workflows/pages.yml` |

---

## 1. Disposition table

Legend: **Implemented** (in this pass) · **Modified** (kept, changed) · **Merged** (folded into an existing system) · **Deferred** (agreed, scheduled) · **Rejected** (with reason).

| # | Suggestion | Disposition | What was done / why |
| --- | --- | --- | --- |
| 1 | Prioritise learning value; demote social features, leaderboards, mentor matching, XP shop, seasonal events, mobile/desktop apps, plugin marketplace, GraphQL, LTI/SCORM, AI tutor, advanced analytics | **Implemented** | Removed the real-time leaderboard from the Labs tabs and the Dashboard; XP/points and badges stay as quiet progress *feedback*, not the product. The superseded platform-feature roadmap was replaced by this document and a learning roadmap. Social/mentor/marketplace/LTI items are **rejected for this repository** (no server, zero-cost, local-first). The AI tutor and voice assistant were later deleted as part of the no-dummy-data pass (§6). |
| 2 | Teach a decision loop (Observe→Interpret→Hypothesise→Test→Evidence→Conclude) | **Implemented** | `frontend/src/content/scenarios.json` (35 scenarios) + `DecisionPractice` component rendered inside each module's Lab tab and in the engagement pack; the loop is also the spine of `docs/VAPT_METHODOLOGY.md`. Used only where it materially helps (analysis, evidence, severity, retest decisions) — not bolted onto every lesson. |
| 3 | More scenario-based exercises (what to investigate, what counts as evidence, which tool, what the result means) | **Implemented** | The 35 scenarios are typed `choice` / `evidence` / `free` (written answer + model answer + rubric); they are attached to modules via `decision_practice` and are distinct from the 15 artefact challenges. |
| 4 | Clear SIMULATION / HYBRID / RF_REQUIRED distinction, never implying PCAP simulation = RF testing | **Implemented** | `lab_requirement` is now authoritative in `modules.json`; `TierBadge`/`TierLegend` render 🟢/🟡/🔴 with the explicit limit of each tier; `docs/SIMULATION_VS_HARDWARE.md` rewritten; per-capture "real vs synthetic" lists live in `lab-artifacts.json`/`MANIFEST.md`. |
| 5 | Final assessment as a real engagement package (client, scope, RoE, targets, diagram, inventory, PCAPs, logs, configs, limited creds, restrictions) with objectives that do not reveal vulnerabilities | **Implemented** | `frontend/src/content/engagements.json` → `/engagement` (`ENG-01`, Northwind Retail): brief, objectives, in/out-of-scope, prohibited techniques, windows, RoE clauses, target table, artefact bundle, 8 tasks, deliverables, marking guide, red-herring warning. Grading reference is kept out of the shipped app (`docs/instructors/ENG-01_answer_key.md`). Module 20 now points at it. |
| 6 | "Engagement Mode" bridging Academy → Guided Labs → Challenges → Independent Engagement | **Implemented** | The `/engagement` route is that mode: module → guided lab → challenge → engagement package, all sharing one evidence standard. The progression is also encoded in challenge levels (guided → semi-guided → assessment). |
| 7 | Reusable professional wireless PT master checklist | **Implemented** | `frontend/src/content/reference/checklist.json` (9 groups, 42 items, each naming its required evidence) rendered by `ChecklistPanel` in Reference and Engagement, mirrored to `docs/WIRELESS_VAPT_CHECKLIST.md`. Compared with the existing 12-step methodology first and *reused* it rather than creating a parallel system. |
| 8 | Technical accuracy audit (terminology, frames, RSN, WPA/WPA2/WPA3/SAE, PMF, WPS, EAP/PEAP/TLS/TTLS, RADIUS, channels/bands, regulatory, filters, aircrack/hashcat modes, hostapd configs, rogue/evil twin, segmentation, isolation) | **Implemented** (targeted) | Corrected: `wlan_mgt.*` → `wlan.*` everywhere (component, backend parser, challenges); hashcat guidance moved to the unified **22000** format with PMKID/EAPOL in one file; RSN capability bits corrected to MFPR bit 6 / MFPC bit 7, with negotiated-state caveats; AKM/cipher suite numbers tabulated; SAE described as a PAKE with forward secrecy, groups 19–21, plus SAE-EXT-KEY; MS-CHAPv2 NT-Response derivation rewritten to RFC 2759 (peer challenge first) and now checked against the published test vector; PMKID formula and KDE layout documented; EAP method table; per-capture real/synthetic notes; `hostapd-wpa3-only-good.conf` corrected (sae_pwe, sae_groups, group_mgmt_cipher, wps_state=0). **Not rewritten:** content verified correct (OUI/type values, RADIUS ports, EAPOL ethertype, PMKID/hcxpcapngtool guidance). |
| 9 | Stop presenting fixed CVSS per technique; explain context and label examples | **Implemented** | `CvssCalculator` reimplemented as a **specification-accurate CVSS 3.1** calculator (validated against the CVSS 3.1 published examples, including `AV:A/…/S:C` wireless cases) with per-metric justification prompts, scope handling, and an explicit "do not do this" panel (including the removed fixed scores). `docs/VAPT_METHODOLOGY.md` now derives severity before quoting any vector. **Deferred:** machine-checking that no lesson reintroduces a fixed score — the audit grep is documented below and easy to re-run. |
| 10 | Regulatory-domain guidance: prefer `iw reg get` over blind `iw reg set` | **Implemented** | Module 04 lesson rewritten around reading the domain and the jurisdictional decision; `iw reg set` is no longer presented as preparation anywhere in the current content; hardware configs carry a country-code note. |
| 11 | Reduce command memorisation; teach "what does this prove?"; keep command references | **Implemented** | `reference/commands.json` (35 entries) is organised by category with a mandatory **proves** field; `reference/filters.json` (30 filters) explains each filter's purpose; Reference.tsx renders them searchably instead of the previous 6-item hard-coded list. |
| 12 | Review lesson length/density; move large reference material out; preserve genuine depth | **Implemented** | The 80 padded lessons (~49 600 lines) were replaced by **27 authored lessons** (~2 000 lines) that are concept-dense and artefact-linked; bulk reference material moved to `reference/*.json` and the checklist. Depth was deliberately raised (not diluted) in WPA2/PMKID, WPA3, enterprise, RADIUS and methodology. **Deferred:** re-authoring optional "appendix" depth for modules 07/10 to the same level, tracked in the roadmap. |
| 13 | Deepen Enterprise Wi-Fi using the Client→802.11→AP→802.1X→RADIUS→Identity model, without padding module counts | **Implemented** | Modules 15–17 rewritten with the five-link chain, trust-boundary table, MSK→PMK→PTK explanation, EAP method table, certificate-validation controls (`ca_cert`, `domain_suffix_match`), RADIUS integrity verification (Message-Authenticator/Response Authenticator, BlastRADIUS reasoning), RadSec, monitoring. Module 18 rewrites the chain + segmentation/isolation test design. Module count unchanged (20). |
| 14 | Progressive de-guiding Beginner→Intermediate→Advanced→Professional | **Implemented** | Challenge levels are now a pipeline (4 guided / 5 semi-guided / 6 assessment, enforced by the challenge generator) and modules carry `difficulty` + prerequisites; scenarios move from "pick an action" to "write the section". |
| 15 | Evidence as a first-class skill (PCAP, filters, tshark output, config, auth exchange, RADIUS log, screenshot, hash, timestamp, BSSID/SSID/client, reproduction steps) | **Implemented** | `EvidenceVault` rewritten: real SHA-256 computed in-browser, artefact type, claim, filter, frames, copy/export, and a warning when a claim has no hash. Every module declares an `evidence_focus`; every challenge declares a `deliverable`; the checklist demands evidence per item. |
| 16 | Retesting beyond a text section, only where the lab can truly validate | **Implemented** | Each module carries a `retest_focus` stating the *same-test-repeated* comparison (PMF deauth, WPS IE removal, PSK rotation vs. old capture, certificate validation vs. TLS alert, secret rotation, isolation/segmentation re-test). `AttackDefenseRetest` is reused rather than duplicated. |
| 17 | "Professional Reasoning" prompt layer with non-trivia questions | **Implemented** | The scenario set includes exactly the suggested class of questions: MFPC-without-MFPR, AKM choice before test selection, rogue vs. legitimate neighbour, password recovery ≠ compromise, what to do after PEAP, what evidence a segmentation claim needs — plus severity and retest judgement calls. |
| 18 | Do not let gamification become the product | **Implemented** | Leaderboard removed (Labs, Dashboard); the XP shop and CTF tabs have since been removed entirely (§6); points remain as light feedback. This document records the intent so future work does not reintroduce it as a headline feature. |
| 19 | Evaluate the name against the existing "WifiForge" project; no automatic rename | **Evaluated — no change** | No rename performed, per the instruction. A name collision with the existing open-source WifiForge project is plausible and matters only for distribution/branding, not for learning value. If the maintainer wants separation, options to put to the owner: keep "WiFiForge" with a distinguishing subtitle ("Wireless PT Academy"), or rename the display title/logo string only (no route/URL changes) after checking the Pages URL. Recorded in the roadmap as an owner decision. |
| 20 | Do not rebuild working systems; reuse; no duplicate content; no unnecessary dependencies; preserve identity, routes, content structure, Pages deploy, local-first/zero-cost | **Implemented** | Reused: routes, theme/identity, progress store, PcapInspector/ReconMap/HandshakeDiagram/ConfigViewer/AttackDefenseRetest, EvidenceVault (extended, not replaced), tshark→scapy→mock backend chain, Pages workflow. No new runtime dependency added (build uses the existing Vite/React stack); artefacts are static files, so local-first and zero-cost are unchanged. The only structural change is that lessons are now generated from `modules.json` metadata instead of a duplicated inline map. |
| 21 | Add important improvements the user missed | **Implemented** (see §2) | The artefact pipeline (real cryptographic captures + a 142-check verifier), generated-and-verified challenge answers, RFC-2759-correct MS-CHAPv2 material, hashcat 22000 unification, per-capture real/synthetic honesty, a build-green TypeScript contract for content (`lib/api.ts`), and an instructor answer key separated from learner content. |
| 22 | Priority order 1 correctness → 7 UX/platform | **Respected** | Correctness work (F4–F6, MS-CHAPv2, CVSS) came first and is machine-checked; learning effectiveness (scenarios, de-guiding) second; lab realism (real PCAPNG with real crypto) third; professional workflow (checklist, engagement, retest) fourth; enterprise depth fifth; assessment quality (challenges + rubric) sixth; UX last and minimal (tier badges, checklists, engagement page). |

---

## 2. Improvements beyond the list

1. **Real artefact pipeline** — `scripts/generate-lab-artifacts.py` writes 16 true PCAPNG captures with
   radiotap + 802.11 structure and genuine key material: PMK/PTK/MIC for handshake captures, PMKID KDE in a
   real M1, RADIUS packets with verifiable Message-Authenticator/Response Authenticator (including a
   deliberately wrong-secret rogue NAS as a negative control), and MS-CHAPv2 challenge/response derived per
   RFC 2759 and cross-checked against the published `clientPass`/`User` vector.
2. **A verifier as the content contract** — `scripts/verify-lab-artifacts.py` runs **206 checks** (hashes vs.
   manifest, RSNE/PMF bits, EAPOL MIC recomputation with a wrong-PSK negative control, PMKID recomputation,
   RADIUS authenticators, MS-CHAPv2 re-derivation, stale-capture detection, and challenge-answer spot checks
   against the captures). If a capture changes and a challenge or lesson reference goes stale, the run fails.
3. **Challenge answers that cannot drift** — `scripts/generate-challenges.py` computes every answer from the
   capture it points at (BSS counts, hidden-SSID frames, M1–M4 frame numbers, PMKID value, WPS states, reason
   codes), so a learner's tool output must match the recorded answer.
4. **Honesty about synthesis** — every capture's manifest entry names what is cryptographically real and what
   is structural (TLS records, SAE scalars, BIP MICs), so nothing overstates a simulation.
5. **Engagement/instructor separation** — learner pack in `engagements.json`; grading reference in
   `docs/instructors/ENG-01_answer_key.md` (not imported by the app).

## 3. What was deliberately *not* done

* **No rename** (owner decision, item 19).
* **No new modules or module count inflation** — depth was added inside the existing 20-module structure.
* **No social/platform features** (mentor matching, marketplace, LTI, GraphQL, mobile apps) — rejected: they
  conflict with local-first, zero-cost, single-repo delivery.
* **No plugin system or AI dependency** — the AI tutor/voice components stay unreferenced.
* **No deletion of working UI systems** — only the leaderboard was removed, because it directly contradicts
  item 1.
* **Style-only edits** were avoided; every content rewrite was tied to a factual correction, a missing skill
  (decision/evidence/retest), or a de-duplication need.

## 4. Verification and how to re-run it

```bash
python3 scripts/generate-lab-artifacts.py     # regenerate captures + lab data + manifest + inventory
python3 scripts/generate-challenges.py        # regenerate challenges (answers computed from captures)
python3 scripts/verify-lab-artifacts.py       # 206 checks, exit 1 on any failure
cd frontend && npm install && npm run build    # tsc -b && vite build (green)
```

Useful spot checks (the same ones used during the review):

```bash
grep -rn "wlan_mgt" frontend/src backend docs | grep -v "namespace is gone" | grep -v "answer key"
grep -rn "iw reg set" frontend/src docs        # should show only jurisdictional warnings
python3 - <<'PY'                                # every lesson referenced by modules.json exists
import json,os
mods=json.load(open('frontend/src/content/modules.json'))
print([f"{m['id']}/{l['id']}" for m in mods for l in m['lessons']
       if not os.path.exists(f"frontend/src/content/lessons/{m['id']}/{l['id']}.md")])
PY
```

## 5. Roadmap (learning-first, in priority order)

1. **Depth parity for modules 07 (WEP) and 10 (WPS)** — current lessons are correct but shorter than the
   WPA2/enterprise set; add lab-data rich examples (IV reuse statistics, WSC exchange details).
2. **Second engagement pack (`ENG-02`)** — a different estate profile (multi-site, WPA3-only core with a
   legacy guest) so the assessment cannot be pattern-matched from `ENG-01`.
3. **Scenario coverage for modules 04 and 18** — add two more `free`-type scenarios (interface-capability
   decision, rogue-authenticator evidence chain).
4. **Machine-checked severity language** — extend the verifier with a check that no lesson content contains a
   fixed CVSS score without an "example" label.
5. **Wireshark-compatibility smoke test in CI** — run `tshark -r` over the captures in the Pages workflow when
   a runner with tshark is available, so dissection regressions are caught at build time.
6. **Accessibility pass** on the new components (keyboard traversal for the scenario cards and checklist,
   ARIA labels on the evidence vault).
7. **Owner decision on naming** (item 19) and on removing the dormant AI/voice components.

---

## 6. Round 3 — "no dummy data on the hosted build" + extra security (owner request)

Requirement, verbatim: *"Also make sure I don't want any dummy data on the hosted one, if nothing is
there then use proper msg for that scenario specific. also take extra messaures regarding security."*

### 6.1 What was removed or replaced

| Hosted surface | Before | Now |
| --- | --- | --- |
| Analytics / activity feed | seeded XP, fake module table, leaderboard-style rows | every number derived from local completion records; empty state names what to complete first |
| Notification centre | pre-written feed | derived from your completions, achievements and their timestamps; explicit "nothing recorded yet" state |
| Audit trail panel | "entries" describing work that never happened | panel deleted; Settings → Security posture + Local data & privacy show what is actually stored |
| Certificate / completion record | "verified", QR claims, fixed XP ceiling | `CERT_*` thresholds, `LOCAL-<progress>-<xp>-<date>` id, print/clipboard, "not accredited" |
| Report PDF export | random 64-hex digest, eight sample findings, a flag | exports **your** evidence-vault records and finding draft; the SHA-256 shown is of the exported file itself |
| Team/classroom, forum, CTF board, XP shop, AI tutor, voice assistant, API/SDK docs, 2FA, OAuth | fabricated data or claims for features that do not exist | components deleted; routes/tabs removed |
| Achievement definitions | "complete all 80 lessons" | thresholds reference `TOTAL_LESSONS`/`TOTAL_MODULES` from content |
| Lab scoring | three WPS answers shown for every lab, invented score % | objective/artefact/prompts come from that lab's catalogue entry; completion XP goes through the real progress store |
| Compliance/CVSS/percentages | fixed numbers in copy | CVSS 3.1 calculator, derived stats only |
| Backend `/api/*` | mock frames, mock analytics, "verified" certificates, fake PDF jobs, printed demo passwords | offline-dataset decoding, derived counts from SQLite, explicit 404/501/503 with the reason, PBKDF2 demo accounts behind `WIFIFORGE_DEMO_USERS=1` |
| Static shell | Google Fonts, "Enterprise v2.1" title, 80-lesson description | own font stack (zero third-party requests), content-derived title/description/manifest |

Empty states were written per scenario, not generically: no parser and no dataset (inspector),
no local API running (Labs list), no evidence records (vault, PDF export, timeline), no progress yet
(dashboard, analytics, notifications, badges), no labs for a module (module view).

### 6.2 Security measures added

1. **Content-Security-Policy in the shipped HTML** (`default-src 'self'`, `object-src 'none'`,
   `frame-ancestors 'none'`, `script-src 'self'`, `connect-src 'self'`, no inline scripts) — GitHub
   Pages cannot send headers, so the policy travels with the document; `dist/_headers` carries the full
   header set for hosts that can, and `nginx.conf` does the same for self-hosting
   (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP/CORP,
   HSTS, `server_tokens off`).
2. **Zero third-party requests**: Google Fonts removed; the build **fails** if any external request
   pattern (link/script/img/CSS `url()`/`fetch`/`import`/`Worker`) appears in `dist`.
3. **Backend CORS narrowed** to an explicit allowlist from `WIFIFORGE_ALLOWED_ORIGINS` (no wildcard
   origins, no wildcard methods/headers) and the `https://*.e2b.app` wildcard is gone.
4. **Auth hardened**: no default/persisted secret (503 without `WIFIFORGE_JWT_SECRET`), PBKDF2-SHA256
   password hashing with constant-time comparison, short token TTL, honest 501 for OAuth.
5. **Uploads**: size cap, extension + magic-number check, hashed; parsing happens locally and a file
   that only matches a bundled dataset is reported as *not parsed* rather than described by proxy.
6. **Supply chain**: GitHub Actions pinned to commit SHAs, `npm ci` from the lockfile, `npm audit`
   in CI, `permissions: contents: read` for CI jobs, and a hygiene job that fails if a `.env` is
   tracked. `docker-compose.yml` no longer ships a default JWT secret.
7. **Automated guarantee**: `scripts/verify-no-dummy-data.py` (wired into CI and the Pages deploy)
   fails the build on mock datasets, placeholder hashes, unearned claims ("production-ready",
   "enterprise-ready", SSO/SAML/LDAP, blockchain) or any third-party request.
8. **Data handling**: all learner data stays in `localStorage`; the panel in Settings lists each key
   with its measured size and can clear it; no analytics, no telemetry, no server-side profile.
9. **SECURITY.md** documents the guarantees, the non-claims, the reporting route and a self-hosting
   hardening checklist.

### 6.3 Verification for this round

```bash
python3 scripts/verify-lab-artifacts.py      # 206/206
python3 scripts/verify-no-dummy-data.py      # no dummy data, no external requests, no unearned claims
cd frontend && npx tsc -p tsconfig.app.json --noEmit && npm run build
grep -rn "fonts.googleapis\|Sentry\|leaderboard" frontend/src frontend/index.html   # expect nothing
```
