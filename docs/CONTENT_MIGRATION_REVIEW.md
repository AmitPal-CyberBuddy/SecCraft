# Content migration owner-review package

*Status: decision package · 2 October 2026 · architecture only, no implementation. This package makes no production import, database/Storage write, content conversion, hosting change, visibility change, or infrastructure upgrade.*

The source of truth for item mapping remains [`../content/migration/CONTENT_MIGRATION_MANIFEST.json`](../content/migration/CONTENT_MIGRATION_MANIFEST.json). The table in §1 is generated from its 159 `REVIEW_CLASSIFY` entries. The existing SecCraft repository remains the sole repository.

## 1. Manual-review decision table (159 items)

**Default proposal:** classify conservatively as `MOVE_TO_PROTECTED_CONTENT` and place the binary/text object in private Supabase Storage, with metadata in PostgreSQL. An owner may instead approve a file as a hash-pinned public resource, or designate answer/verification material as server-only. “Storage” below means a future private bucket—not an upload performed now.

<!-- REVIEW_TABLE_START -->

| # | Source path | Type | Size | Path / module | Stable content ID | Proposed classification | Destination | Why review | Exact owner decision |
|---:|---|---|---:|---|---|---|---|---|---|
| 1 | `frontend/public/android-cases/SHA256SUMS` | artifact | 77 B | android-pentesting | `frontend-public-android-cases-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 2 | `frontend/public/android-cases/cases.json` | artifact | 14,706 B | android-pentesting | `frontend-public-android-cases-cases-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Android source/pack; current public location does not prove intended audience. | Approve public source or protected learner lab input. |
| 3 | `frontend/public/android-demos/SHA256SUMS` | artifact | 92 B | android-pentesting | `frontend-public-android-demos-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 4 | `frontend/public/android-demos/notes-boundary-source.zip` | artifact | 6,395 B | android-pentesting | `frontend-public-android-demos-notes-boundary-source-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 5 | `frontend/public/android-foundations/AndroidManifest.xml` | artifact | 1,354 B | android-pentesting | `frontend-public-android-foundations-androidmanifest-xml` | Move to protected (default) | Private Storage + PostgreSQL metadata | Android source/pack; current public location does not prove intended audience. | Approve public source or protected learner lab input. |
| 6 | `frontend/public/android-foundations/LinkActivity.kt` | artifact | 548 B | android-pentesting | `frontend-public-android-foundations-linkactivity-kt` | Move to protected (default) | Private Storage + PostgreSQL metadata | Android source/pack; current public location does not prove intended audience. | Approve public source or protected learner lab input. |
| 7 | `frontend/public/android-foundations/NoteStore.kt` | artifact | 374 B | android-pentesting | `frontend-public-android-foundations-notestore-kt` | Move to protected (default) | Private Storage + PostgreSQL metadata | Android source/pack; current public location does not prove intended audience. | Approve public source or protected learner lab input. |
| 8 | `frontend/public/android-foundations/README.md` | artifact | 911 B | android-pentesting | `frontend-public-android-foundations-readme-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Android source/pack; current public location does not prove intended audience. | Approve public source or protected learner lab input. |
| 9 | `frontend/public/android-foundations/SHA256SUMS` | artifact | 323 B | android-pentesting | `frontend-public-android-foundations-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 10 | `frontend/public/android-practice/REFERENCE_GUIDE.md` | artifact | 5,341 B | android-pentesting | `frontend-public-android-practice-reference-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | reference guide; current public location does not prove intended audience. | Approve public reference or protect as learner guide. |
| 11 | `frontend/public/android-practice/SHA256SUMS` | artifact | 179 B | android-pentesting | `frontend-public-android-practice-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 12 | `frontend/public/android-practice/android-pentest-toolkit.zip` | artifact | 2,780 B | android-pentesting | `frontend-public-android-practice-android-pentest-toolkit-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 13 | `frontend/public/lab-data/beacon-only.json` | artifact | 4,126 B | wireless-pentesting | `frontend-public-lab-data-beacon-only-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 14 | `frontend/public/lab-data/capstone-baseline.json` | artifact | 10,614 B | wireless-pentesting | `frontend-public-lab-data-capstone-baseline-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 15 | `frontend/public/lab-data/capstone-retest.json` | artifact | 3,623 B | wireless-pentesting | `frontend-public-lab-data-capstone-retest-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 16 | `frontend/public/lab-data/captive-portal.json` | artifact | 13,744 B | wireless-pentesting | `frontend-public-lab-data-captive-portal-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 17 | `frontend/public/lab-data/corporate-attacks.json` | artifact | 17,545 B | wireless-pentesting | `frontend-public-lab-data-corporate-attacks-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 18 | `frontend/public/lab-data/deauth.json` | artifact | 15,379 B | wireless-pentesting | `frontend-public-lab-data-deauth-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 19 | `frontend/public/lab-data/eap.json` | artifact | 11,833 B | wireless-pentesting | `frontend-public-lab-data-eap-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 20 | `frontend/public/lab-data/enterprise.json` | artifact | 10,817 B | wireless-pentesting | `frontend-public-lab-data-enterprise-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 21 | `frontend/public/lab-data/methodology.json` | artifact | 27,512 B | wireless-pentesting | `frontend-public-lab-data-methodology-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 22 | `frontend/public/lab-data/pmkid.json` | artifact | 5,573 B | wireless-pentesting | `frontend-public-lab-data-pmkid-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 23 | `frontend/public/lab-data/radius.json` | artifact | 14,498 B | wireless-pentesting | `frontend-public-lab-data-radius-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 24 | `frontend/public/lab-data/recon-lab.json` | artifact | 14,257 B | wireless-pentesting | `frontend-public-lab-data-recon-lab-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 25 | `frontend/public/lab-data/rogue-ap.json` | artifact | 17,907 B | wireless-pentesting | `frontend-public-lab-data-rogue-ap-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 26 | `frontend/public/lab-data/traffic-analysis.json` | artifact | 18,037 B | wireless-pentesting | `frontend-public-lab-data-traffic-analysis-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 27 | `frontend/public/lab-data/wpa2-handshake.json` | artifact | 11,825 B | wireless-pentesting | `frontend-public-lab-data-wpa2-handshake-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 28 | `frontend/public/lab-data/wpa3-only.json` | artifact | 5,424 B | wireless-pentesting | `frontend-public-lab-data-wpa3-only-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 29 | `frontend/public/lab-data/wpa3-transition.json` | artifact | 10,197 B | wireless-pentesting | `frontend-public-lab-data-wpa3-transition-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 30 | `frontend/public/lab-data/wps-beacon.json` | artifact | 8,401 B | wireless-pentesting | `frontend-public-lab-data-wps-beacon-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | lab JSON; current public location does not prove intended audience. | Decide learner evidence input vs server-only/model data. |
| 31 | `frontend/public/pcaps/MANIFEST.md` | artifact | 6,872 B | wireless-pentesting | `frontend-public-pcaps-manifest-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | other artifact; current public location does not prove intended audience. | Choose public, protected learner, or server-only access. |
| 32 | `frontend/public/pcaps/capstone/CASE_NOTES.md` | artifact | 3,882 B | wireless-pentesting | `frontend-public-pcaps-capstone-case-notes-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | other artifact; current public location does not prove intended audience. | Choose public, protected learner, or server-only access. |
| 33 | `frontend/public/pcaps/capstone/capstone-baseline.pcapng` | artifact | 1,912 B | wireless-pentesting | `frontend-public-pcaps-capstone-capstone-baseline-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 34 | `frontend/public/pcaps/capstone/capstone-retest.pcapng` | artifact | 720 B | wireless-pentesting | `frontend-public-pcaps-capstone-capstone-retest-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 35 | `frontend/public/pcaps/captive/captive-portal.pcapng` | artifact | 3,552 B | wireless-pentesting | `frontend-public-pcaps-captive-captive-portal-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 36 | `frontend/public/pcaps/corporate/corporate-attacks.pcapng` | artifact | 3,132 B | wireless-pentesting | `frontend-public-pcaps-corporate-corporate-attacks-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 37 | `frontend/public/pcaps/deauth/deauth.pcapng` | artifact | 2,160 B | wireless-pentesting | `frontend-public-pcaps-deauth-deauth-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 38 | `frontend/public/pcaps/eap/eap.pcapng` | artifact | 1,660 B | wireless-pentesting | `frontend-public-pcaps-eap-eap-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 39 | `frontend/public/pcaps/enterprise/enterprise.pcapng` | artifact | 1,796 B | wireless-pentesting | `frontend-public-pcaps-enterprise-enterprise-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 40 | `frontend/public/pcaps/methodology/methodology.pcapng` | artifact | 4,856 B | wireless-pentesting | `frontend-public-pcaps-methodology-methodology-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 41 | `frontend/public/pcaps/radius/radius.pcapng` | artifact | 2,260 B | wireless-pentesting | `frontend-public-pcaps-radius-radius-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 42 | `frontend/public/pcaps/recon/recon-lab.pcapng` | artifact | 2,596 B | wireless-pentesting | `frontend-public-pcaps-recon-recon-lab-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 43 | `frontend/public/pcaps/rogue/rogue-ap.pcapng` | artifact | 4,156 B | wireless-pentesting | `frontend-public-pcaps-rogue-rogue-ap-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 44 | `frontend/public/pcaps/traffic/traffic-analysis.pcapng` | artifact | 4,048 B | wireless-pentesting | `frontend-public-pcaps-traffic-traffic-analysis-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 45 | `frontend/public/pcaps/wifi-fundamentals/beacon-only.pcapng` | artifact | 864 B | wireless-pentesting | `frontend-public-pcaps-wifi-fundamentals-beacon-only-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 46 | `frontend/public/pcaps/wpa2/pmkid.pcapng` | artifact | 876 B | wireless-pentesting | `frontend-public-pcaps-wpa2-pmkid-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 47 | `frontend/public/pcaps/wpa2/wpa2-handshake.pcapng` | artifact | 2,016 B | wireless-pentesting | `frontend-public-pcaps-wpa2-wpa2-handshake-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 48 | `frontend/public/pcaps/wpa3/wpa3-only.pcapng` | artifact | 1,056 B | wireless-pentesting | `frontend-public-pcaps-wpa3-wpa3-only-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 49 | `frontend/public/pcaps/wpa3/wpa3-transition.pcapng` | artifact | 1,932 B | wireless-pentesting | `frontend-public-pcaps-wpa3-wpa3-transition-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 50 | `frontend/public/pcaps/wps/wps-beacon.pcapng` | artifact | 1,372 B | wireless-pentesting | `frontend-public-pcaps-wps-wps-beacon-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 51 | `frontend/public/wireless-foundations/WF-FND-01.zip` | artifact | 9,339 B | wireless-pentesting | `frontend-public-wireless-foundations-wf-fnd-01-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 52 | `frontend/public/wireless-foundations/WF-FND-01/SHA256SUMS` | artifact | 742 B | wireless-pentesting / 01-intro-wireless | `frontend-public-wireless-foundations-wf-fnd-01-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 53 | `frontend/public/wireless-foundations/WF-FND-01/baseline-frames.json` | artifact | 5,260 B | wireless-pentesting / 01-intro-wireless | `frontend-public-wireless-foundations-wf-fnd-01-baseline-frames-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | other artifact; current public location does not prove intended audience. | Choose public, protected learner, or server-only access. |
| 54 | `frontend/public/wireless-foundations/WF-FND-01/baseline.pcapng` | artifact | 1,624 B | wireless-pentesting / 01-intro-wireless | `frontend-public-wireless-foundations-wf-fnd-01-baseline-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 55 | `frontend/public/wireless-foundations/WF-FND-01/follow-up-frames.json` | artifact | 1,489 B | wireless-pentesting / 01-intro-wireless | `frontend-public-wireless-foundations-wf-fnd-01-follow-up-frames-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | other artifact; current public location does not prove intended audience. | Choose public, protected learner, or server-only access. |
| 56 | `frontend/public/wireless-foundations/WF-FND-01/follow-up.pcapng` | artifact | 504 B | wireless-pentesting / 01-intro-wireless | `frontend-public-wireless-foundations-wf-fnd-01-follow-up-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 57 | `frontend/public/wireless-foundations/WF-FND-01/self-review.md` | artifact | 3,889 B | wireless-pentesting / 01-intro-wireless | `frontend-public-wireless-foundations-wf-fnd-01-self-review-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | self-review material; current public location does not prove intended audience. | Choose after-attempt learner reveal or server/instructor only. |
| 58 | `frontend/public/wireless-practice/REFERENCE_GUIDE.md` | artifact | 6,445 B | wireless-pentesting | `frontend-public-wireless-practice-reference-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | reference guide; current public location does not prove intended audience. | Approve public reference or protect as learner guide. |
| 59 | `frontend/public/wireless-practice/WF-AUTH-03.zip` | artifact | 13,997 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 60 | `frontend/public/wireless-practice/WF-AUTH-03/SHA256SUMS` | artifact | 1,236 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 61 | `frontend/public/wireless-practice/WF-AUTH-03/audit.py` | artifact | 1,590 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-audit-py` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 62 | `frontend/public/wireless-practice/WF-AUTH-03/candidates.txt` | artifact | 45 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-candidates-txt` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 63 | `frontend/public/wireless-practice/WF-AUTH-03/guided.json` | artifact | 279 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-guided-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 64 | `frontend/public/wireless-practice/WF-AUTH-03/independent.json` | artifact | 468 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-independent-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 65 | `frontend/public/wireless-practice/WF-AUTH-03/reference-results.json` | artifact | 182 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-reference-results-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | self-review material; current public location does not prove intended audience. | Choose after-attempt learner reveal or server/instructor only. |
| 66 | `frontend/public/wireless-practice/WF-AUTH-03/review-guide.md` | artifact | 3,256 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-review-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 67 | `frontend/public/wireless-practice/WF-AUTH-03/scope.md` | artifact | 2,057 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-scope-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 68 | `frontend/public/wireless-practice/WF-AUTH-03/worksheet.md` | artifact | 2,449 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-worksheet-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 69 | `frontend/public/wireless-practice/WF-AUTH-03/wpa3-only.json` | artifact | 5,424 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-wpa3-only-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 70 | `frontend/public/wireless-practice/WF-AUTH-03/wpa3-only.pcapng` | artifact | 1,056 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-wpa3-only-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 71 | `frontend/public/wireless-practice/WF-AUTH-03/wpa3-transition.json` | artifact | 10,197 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-wpa3-transition-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 72 | `frontend/public/wireless-practice/WF-AUTH-03/wpa3-transition.pcapng` | artifact | 1,932 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-wpa3-transition-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 73 | `frontend/public/wireless-practice/WF-AUTH-03/wps-beacon.json` | artifact | 8,401 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-wps-beacon-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 74 | `frontend/public/wireless-practice/WF-AUTH-03/wps-beacon.pcapng` | artifact | 1,372 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-wps-beacon-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 75 | `frontend/public/wireless-practice/WF-AUTH-03/wps-observations.json` | artifact | 741 B | wireless-pentesting | `frontend-public-wireless-practice-wf-auth-03-wps-observations-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 76 | `frontend/public/wireless-practice/WF-BOUND-06.zip` | artifact | 14,208 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 77 | `frontend/public/wireless-practice/WF-BOUND-06/SHA256SUMS` | artifact | 1,190 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 78 | `frontend/public/wireless-practice/WF-BOUND-06/authorization.json` | artifact | 1,609 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-authorization-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 79 | `frontend/public/wireless-practice/WF-BOUND-06/baseline-observations.json` | artifact | 2,477 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-baseline-observations-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 80 | `frontend/public/wireless-practice/WF-BOUND-06/baseline-policy.json` | artifact | 641 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-baseline-policy-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 81 | `frontend/public/wireless-practice/WF-BOUND-06/corporate-attacks.json` | artifact | 17,545 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-corporate-attacks-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 82 | `frontend/public/wireless-practice/WF-BOUND-06/corporate-attacks.pcapng` | artifact | 3,132 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-corporate-attacks-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 83 | `frontend/public/wireless-practice/WF-BOUND-06/flows.json` | artifact | 1,750 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-flows-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 84 | `frontend/public/wireless-practice/WF-BOUND-06/hardened-observations.json` | artifact | 2,467 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-hardened-observations-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 85 | `frontend/public/wireless-practice/WF-BOUND-06/hardened-policy.json` | artifact | 496 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-hardened-policy-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 86 | `frontend/public/wireless-practice/WF-BOUND-06/reference-results.json` | artifact | 621 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-reference-results-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | self-review material; current public location does not prove intended audience. | Choose after-attempt learner reveal or server/instructor only. |
| 87 | `frontend/public/wireless-practice/WF-BOUND-06/review-guide.md` | artifact | 2,924 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-review-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 88 | `frontend/public/wireless-practice/WF-BOUND-06/review-policy.py` | artifact | 2,793 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-review-policy-py` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 89 | `frontend/public/wireless-practice/WF-BOUND-06/scope.md` | artifact | 2,866 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-scope-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 90 | `frontend/public/wireless-practice/WF-BOUND-06/topology.json` | artifact | 797 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-topology-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 91 | `frontend/public/wireless-practice/WF-BOUND-06/worksheet.md` | artifact | 2,695 B | wireless-pentesting | `frontend-public-wireless-practice-wf-bound-06-worksheet-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 92 | `frontend/public/wireless-practice/WF-ENT-05.zip` | artifact | 21,381 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 93 | `frontend/public/wireless-practice/WF-ENT-05/SHA256SUMS` | artifact | 1,645 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 94 | `frontend/public/wireless-practice/WF-ENT-05/check-certificates.py` | artifact | 1,649 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-check-certificates-py` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 95 | `frontend/public/wireless-practice/WF-ENT-05/client-only.pem` | artifact | 579 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-client-only-pem` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 96 | `frontend/public/wireless-practice/WF-ENT-05/eap.json` | artifact | 11,833 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-eap-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 97 | `frontend/public/wireless-practice/WF-ENT-05/eap.pcapng` | artifact | 1,660 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-eap-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 98 | `frontend/public/wireless-practice/WF-ENT-05/enterprise.json` | artifact | 10,817 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-enterprise-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 99 | `frontend/public/wireless-practice/WF-ENT-05/enterprise.pcapng` | artifact | 1,796 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-enterprise-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 100 | `frontend/public/wireless-practice/WF-ENT-05/method-cases.json` | artifact | 1,000 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-method-cases-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 101 | `frontend/public/wireless-practice/WF-ENT-05/other-root.pem` | artifact | 538 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-other-root-pem` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 102 | `frontend/public/wireless-practice/WF-ENT-05/policy-model.json` | artifact | 1,498 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-policy-model-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 103 | `frontend/public/wireless-practice/WF-ENT-05/radius.json` | artifact | 14,498 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-radius-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 104 | `frontend/public/wireless-practice/WF-ENT-05/radius.pcapng` | artifact | 2,260 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-radius-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 105 | `frontend/public/wireless-practice/WF-ENT-05/reference-results.json` | artifact | 474 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-reference-results-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | self-review material; current public location does not prove intended audience. | Choose after-attempt learner reveal or server/instructor only. |
| 106 | `frontend/public/wireless-practice/WF-ENT-05/review-guide.md` | artifact | 3,313 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-review-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 107 | `frontend/public/wireless-practice/WF-ENT-05/scope.md` | artifact | 2,873 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-scope-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 108 | `frontend/public/wireless-practice/WF-ENT-05/server-expired.pem` | artifact | 583 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-server-expired-pem` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 109 | `frontend/public/wireless-practice/WF-ENT-05/server-good.pem` | artifact | 583 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-server-good-pem` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 110 | `frontend/public/wireless-practice/WF-ENT-05/server-untrusted.pem` | artifact | 595 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-server-untrusted-pem` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 111 | `frontend/public/wireless-practice/WF-ENT-05/server-wrong-name.pem` | artifact | 583 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-server-wrong-name-pem` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 112 | `frontend/public/wireless-practice/WF-ENT-05/trusted-root.pem` | artifact | 522 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-trusted-root-pem` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 113 | `frontend/public/wireless-practice/WF-ENT-05/worksheet.md` | artifact | 2,569 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ent-05-worksheet-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 114 | `frontend/public/wireless-practice/WF-OPS-02.zip` | artifact | 14,095 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 115 | `frontend/public/wireless-practice/WF-OPS-02/README.md` | artifact | 1,636 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-readme-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 116 | `frontend/public/wireless-practice/WF-OPS-02/SHA256SUMS` | artifact | 903 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 117 | `frontend/public/wireless-practice/WF-OPS-02/capability-cases.json` | artifact | 1,187 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-capability-cases-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 118 | `frontend/public/wireless-practice/WF-OPS-02/client-log.csv` | artifact | 334 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-client-log-csv` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 119 | `frontend/public/wireless-practice/WF-OPS-02/clock-note.md` | artifact | 1,270 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-clock-note-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 120 | `frontend/public/wireless-practice/WF-OPS-02/recon-lab.json` | artifact | 14,257 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-recon-lab-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 121 | `frontend/public/wireless-practice/WF-OPS-02/recon-lab.pcapng` | artifact | 2,596 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-recon-lab-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 122 | `frontend/public/wireless-practice/WF-OPS-02/review-guide.md` | artifact | 3,665 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-review-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 123 | `frontend/public/wireless-practice/WF-OPS-02/scope.md` | artifact | 1,858 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-scope-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 124 | `frontend/public/wireless-practice/WF-OPS-02/traffic-analysis.json` | artifact | 18,037 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-traffic-analysis-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 125 | `frontend/public/wireless-practice/WF-OPS-02/traffic-analysis.pcapng` | artifact | 4,048 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-traffic-analysis-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 126 | `frontend/public/wireless-practice/WF-OPS-02/worksheet.md` | artifact | 2,354 B | wireless-pentesting | `frontend-public-wireless-practice-wf-ops-02-worksheet-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 127 | `frontend/public/wireless-practice/WF-REVIEW-07.zip` | artifact | 12,470 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 128 | `frontend/public/wireless-practice/WF-REVIEW-07/CASE_NOTES.md` | artifact | 3,882 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-case-notes-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 129 | `frontend/public/wireless-practice/WF-REVIEW-07/SHA256SUMS` | artifact | 844 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 130 | `frontend/public/wireless-practice/WF-REVIEW-07/capstone-baseline.json` | artifact | 10,614 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-capstone-baseline-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 131 | `frontend/public/wireless-practice/WF-REVIEW-07/capstone-baseline.pcapng` | artifact | 1,912 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-capstone-baseline-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 132 | `frontend/public/wireless-practice/WF-REVIEW-07/capstone-retest.json` | artifact | 3,623 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-capstone-retest-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 133 | `frontend/public/wireless-practice/WF-REVIEW-07/capstone-retest.pcapng` | artifact | 720 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-capstone-retest-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 134 | `frontend/public/wireless-practice/WF-REVIEW-07/client-handoff.md` | artifact | 1,626 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-client-handoff-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 135 | `frontend/public/wireless-practice/WF-REVIEW-07/reference-review.json` | artifact | 1,820 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-reference-review-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 136 | `frontend/public/wireless-practice/WF-REVIEW-07/review-guide.md` | artifact | 2,592 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-review-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 137 | `frontend/public/wireless-practice/WF-REVIEW-07/scope.md` | artifact | 2,007 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-scope-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 138 | `frontend/public/wireless-practice/WF-REVIEW-07/worksheet.md` | artifact | 2,183 B | wireless-pentesting | `frontend-public-wireless-practice-wf-review-07-worksheet-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 139 | `frontend/public/wireless-practice/WF-TRUST-04.zip` | artifact | 17,419 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-zip` | Move to protected (default) | Private Storage + PostgreSQL metadata | archive; current public location does not prove intended audience. | Approve whole archive or reject; per-file decisions must control. |
| 140 | `frontend/public/wireless-practice/WF-TRUST-04/SHA256SUMS` | artifact | 1,167 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-sha256sums` | Move to protected (default) | Private Storage + PostgreSQL metadata | checksum manifest; current public location does not prove intended audience. | Follow parent pack access; approve any public checksum. |
| 141 | `frontend/public/wireless-practice/WF-TRUST-04/captive-portal.json` | artifact | 13,744 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-captive-portal-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 142 | `frontend/public/wireless-practice/WF-TRUST-04/captive-portal.pcapng` | artifact | 3,552 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-captive-portal-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 143 | `frontend/public/wireless-practice/WF-TRUST-04/client-cases.json` | artifact | 1,041 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-client-cases-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 144 | `frontend/public/wireless-practice/WF-TRUST-04/deauth.json` | artifact | 15,379 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-deauth-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 145 | `frontend/public/wireless-practice/WF-TRUST-04/deauth.pcapng` | artifact | 2,160 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-deauth-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 146 | `frontend/public/wireless-practice/WF-TRUST-04/management-outcomes.json` | artifact | 1,124 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-management-outcomes-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 147 | `frontend/public/wireless-practice/WF-TRUST-04/owner-inventory.csv` | artifact | 334 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-owner-inventory-csv` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 148 | `frontend/public/wireless-practice/WF-TRUST-04/portal-observations.json` | artifact | 1,043 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-portal-observations-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 149 | `frontend/public/wireless-practice/WF-TRUST-04/portal-policy.json` | artifact | 1,799 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-portal-policy-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 150 | `frontend/public/wireless-practice/WF-TRUST-04/review-guide.md` | artifact | 4,234 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-review-guide-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 151 | `frontend/public/wireless-practice/WF-TRUST-04/rogue-ap.json` | artifact | 17,907 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-rogue-ap-json` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 152 | `frontend/public/wireless-practice/WF-TRUST-04/rogue-ap.pcapng` | artifact | 4,156 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-rogue-ap-pcapng` | Move to protected (default) | Private Storage + PostgreSQL metadata | PCAP; current public location does not prove intended audience. | Approve as public teaching capture or protected learner artifact. |
| 153 | `frontend/public/wireless-practice/WF-TRUST-04/scope.md` | artifact | 2,334 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-scope-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 154 | `frontend/public/wireless-practice/WF-TRUST-04/worksheet.md` | artifact | 2,745 B | wireless-pentesting | `frontend-public-wireless-practice-wf-trust-04-worksheet-md` | Move to protected (default) | Private Storage + PostgreSQL metadata | Wireless practice component; current public location does not prove intended audience. | Choose public resource, learner-only input, or server-only answer material. |
| 155 | `content/configs/hostapd-wpa2-bad.conf` | lab-config-artifact | 228 B | wireless-pentesting | `content-configs-hostapd-wpa2-bad-conf` | Move to protected (default) | Private Storage + PostgreSQL metadata | Teaching config intent is ambiguous; it may be reference material or lab input. | Approve public reference or protected learner lab input. |
| 156 | `content/configs/hostapd-wpa2-good.conf` | lab-config-artifact | 219 B | wireless-pentesting | `content-configs-hostapd-wpa2-good-conf` | Move to protected (default) | Private Storage + PostgreSQL metadata | Teaching config intent is ambiguous; it may be reference material or lab input. | Approve public reference or protected learner lab input. |
| 157 | `content/configs/hostapd-wpa3-only-good.conf` | lab-config-artifact | 176 B | wireless-pentesting | `content-configs-hostapd-wpa3-only-good-conf` | Move to protected (default) | Private Storage + PostgreSQL metadata | Teaching config intent is ambiguous; it may be reference material or lab input. | Approve public reference or protected learner lab input. |
| 158 | `content/configs/hostapd-wpa3-transition-bad.conf` | lab-config-artifact | 195 B | wireless-pentesting | `content-configs-hostapd-wpa3-transition-bad-conf` | Move to protected (default) | Private Storage + PostgreSQL metadata | Teaching config intent is ambiguous; it may be reference material or lab input. | Approve public reference or protected learner lab input. |
| 159 | `content/configs/hostapd-wps-enabled.conf` | lab-config-artifact | 206 B | wireless-pentesting | `content-configs-hostapd-wps-enabled-conf` | Move to protected (default) | Private Storage + PostgreSQL metadata | Teaching config intent is ambiguous; it may be reference material or lab input. | Approve public reference or protected learner lab input. |

<!-- REVIEW_TABLE_END -->

## 2. The 197 review-required findings grouped

A source item may create a second finding when copied to `dist`, so finding counts exceed the 159 decisions. Every finding remains linked to its item-level manifest entry.

| Group | Findings | Source decisions | Common decision |
|---|---:|---:|---|
| PCAPs | 68 | 34 | Public teaching capture or authenticated learner artifact? Default: private Storage. A capture cannot be server-only grading evidence if learners must inspect it. |
| Wireless practice packs | 67 | 67 | Is each unpacked exercise component learner-only, public reference, or server-only answer material? Split mixed packs; do not publish an entire directory by convenience. |
| Lab JSON | 18 | 18 | Learner evidence representation or answer-bearing/model data? Default: authenticated content or private Storage, never public merely because paired with a PCAP. |
| Downloadable archives | 18 | 9 | May the complete archive be public? Default: no. Archive publication must never bypass per-file decisions; `WF-FND-01.zip` is specifically not approved. |
| Checksums | 11 | 11 | Follow the access class of the protected object/pack, or publish only checksums for deliberately public samples. A checksum must not advertise a private object key. |
| Android packs/source | 5 | 5 | Public educational source or authenticated lab input? Default: private Storage; approve public source only deliberately. |
| Self-review material | 4 | 4 | Learner-visible after attempt or server/instructor-only? Default: protected and released only at the configured post-submission point. |
| Reference guides | 2 | 2 | General public reference or learner-only guide containing workflow/answers? Requires content review; default protected. |
| Other | 4 | 9 | Includes manifests/case notes and five authored hostapd configs (the configs are decisions but are not current leak findings). Decide public reference versus learner lab input/server-only material. |
| **Total** | **197** | **159** | Zero unintended exposure, not zero legitimate public files. |

## 3. Proposed runtime content schema

This is a logical model, not a migration.

```text
content_release
  1 ── * career_path_version
            1 ── * learning_path_version
                      1 ── * module_version
                                1 ── * lesson_version
                                1 ── * activity_version (lab | scenario | challenge)
                                          1 ── * item_version (practice | assessment | verification)
                                                    1 ── 1 item_private_key
                                                    0 ── * item_solution
                                * ── * artifact_version

stable identity tables                  immutable release-version tables
career_path(id, canonical_slug)         *_version(release_id, stable_id, public metadata/content)
learning_path(id, career_path_id)       release_relationship(release_id, parent_id, child_id, position)
module(id, learning_path_id)            public_sample(release_id, content_kind, stable_id, projection/hash)
lesson/activity/item/artifact(id, …)    instructor_material(release_id, stable_id, body, access_policy)
```

### Core entities

| Entity | Stable identity and relationship | Versioned fields |
|---|---|---|
| Career Path | `career_path.id`; parent of Learning Paths | title, description, maturity, display slug |
| Learning Path | `learning_path.id`; FK to Career Path | title, catalogue metadata, objectives, prerequisites, duration, skills, display slug |
| Module | `module.id`; FK to Learning Path | title, description, objectives, prerequisites, duration, skills, ordering |
| Lesson | `lesson.id`; FK to Module | public metadata plus protected body; content access class |
| Activity | stable ID; FK to Module; kind `lab`, `scenario`, or `challenge` | learner instructions, sequencing, artifact links |
| Item | stable ID; FK to Activity/Module; kind and grading class | learner-visible prompt/options; attempt policy |
| Private key | release + item, server-only | expected answer/digest/grader config; never serialized by learner APIs |
| Solution | release + item, policy-gated | explanation/model solution and reveal policy (`never`, `after_attempt`, `after_close`, `instructor`) |
| Instructor material | stable ID + release | server/owner-only notes and keys, separately authorized |
| Artifact | stable ID; linked through release-scoped join | object key, bucket/profile, media type, bytes, SHA-256, access class |

### Release lifecycle

`content_release(id, version, source_revision, schema_version, status, created_at, validated_at, activated_at, retired_at, previous_release_id)` has status constrained to:

* **staged:** immutable candidate; not used by normal learner reads. Validation and authorized staging smoke tests may address it explicitly.
* **current:** exactly one release per environment, selected by a single transactional pointer. Normal API reads resolve through this pointer.
* **retired:** immutable prior release retained for rollback/history. Not selectable by ordinary learner requests.

A release owns all version rows and relationship rows. Stable identity rows survive releases. A changed body creates a new version row under a new release, not a new stable ID. Display/public slugs live in versioned alias records and may change without changing progress IDs. `android-pentesting` therefore remains stable even if `android-security` becomes its public slug.

### Public samples and field separation

`public_sample` explicitly names an approved lesson/activity/artifact version and its public projection. Maturity never implies public access. Public sample artifacts are hash-pinned. Catalogue projection queries whitelist metadata fields; they cannot join private keys, solutions, or instructor tables.

Learner-visible prompt and instructions live in API-readable content tables. Keys/grader configuration use a separate table readable only by the grading service role. Solutions use a separate policy-gated endpoint. Instructor material has an owner/instructor role check and is never joined to normal learner responses.

Storage objects are private by default. PostgreSQL stores the opaque object key and integrity metadata; it does not store a permanent public URL. Public sample objects use a distinct approved-public projection or controlled endpoint.

## 4. Authorization model

| Layer | Responsibility | Authoritative? |
|---|---|---|
| Frontend | Route UX, sign-in/status messaging, and rendering only. It does not bundle protected content and cannot grant access. | **No** |
| FastAPI | Validate JWT, load account status/role, resolve current release, enforce content access and path entitlement, filter fields, and broker artifact access. | **Primary application authority** |
| PostgreSQL | Private `content` schema, revoked `anon`/`authenticated`/`PUBLIC` grants, foreign keys and release constraints; only restricted backend/importer roles can read/write. | **Authoritative data backstop** |
| Supabase Storage | Private buckets and object policies; no public protected objects. Signed access only after FastAPI authorization, or backend-streamed download. | **Authoritative object backstop** |

### Request behavior

```text
Unauthenticated
  GET catalogue / approved sample ──► allowed public projection
  GET protected ID ─────────────────► 401 (no lookup/body disclosure)

Authenticated + pending/rejected/suspended
  GET catalogue/status/sample ──────► allowed
  GET protected ID ─────────────────► 403 account_status code; no content/object existence leak

Authenticated + active
  GET protected ID ─────────────────► validate account + current release + access class + path entitlement
                                      then return learner-safe fields only
  GET artifact ID ──────────────────► same checks, then short-lived object grant/backend stream
```

Direct-ID controls:

1. FastAPI never accepts a client-selected release for normal reads; it resolves the current pointer server-side.
2. Protected routes depend on verified identity and `active_profile`; pending users fail before content lookup.
3. IDs are resolved with `(current_release_id, stable_id, parent ownership)` so cross-path/module substitution fails.
4. Response schemas whitelist learner fields. Key, grader, solution, and instructor relations are absent from repository methods used by learner endpoints.
5. Artifact lookup checks release, access class, path entitlement, and expected object metadata. FastAPI generates a short-lived, single-object signed URL only after authorization (or streams it); clients cannot turn an object key into public access.
6. Storage policies deny anonymous/authenticated direct bucket listing and reads. The public browser key has no read grant to protected buckets.
7. Public samples use a separate explicit allow-list by stable ID/version/hash—not “anything under a folder.”
8. Anonymous, pending, active, cross-path, key-field, bucket-policy, and build-output sweeps run before activation.

## 5. Demonstration: splitting a real mixed source

Real source: `frontend/src/content/quizzes.json`, module `01-intro-wireless`, item `q1`.

Current single object contains:

* learner data: `question` and `options`;
* server-only answer: `correct: 1`;
* solution/model feedback: `explanation`.

Proposed representation:

```text
content.item_version
  release_id       = <release>
  stable_item_id   = 01-intro-wireless/q1
  module_id        = 01-intro-wireless
  kind             = practice
  grading_class    = practice
  prompt            = "A capture is requested … What comes first?"
  options_json      = [four learner-visible choices]

content.item_private_key                 -- grading-service role only
  release_id/item_id = <release>/01-intro-wireless/q1
  answer_json        = {"option_index": 1}
  grader_type        = exact_choice

content.item_solution                    -- policy-gated
  release_id/item_id = <release>/01-intro-wireless/q1
  body                = "Passive collection can include personal data …"
  reveal_policy       = after_attempt

content.instructor_material              -- none for this item today
  future rubric/coaching notes would live here, never in item payloads
```

`GET /items/...` returns prompt/options only. Submission goes to a server grader that can read `item_private_key`. The response may fetch `item_solution` only when reveal policy permits. Instructor APIs require a distinct role. The importer must split this JSON object; moving the entire existing file into learner-readable Storage would expose the answer and is explicitly rejected.

## 6. Practice versus Verified migration

Three current labs are labelled `grading: verified` in `labs.json`:

* `lab-02-beacon`
* `lab-05-recon`
* `lab-06-traffic`

All three become **Practice (answer-checked)** because their captures, expected outputs, and checking behavior have been public. The other 26 labs remain Practice (self-review). Existing quizzes, challenges, scenarios, and Android cases are also Practice. Nothing currently public is eligible to create new Verified evidence.

Only newly authored private verification items, with server-side grading/evidence rules approved in the competency phase, are eligible for `grading_class=verified`. “Verified capture integrity” or “answer-checked” never means learner competence is Verified.

### Historical records and compatibility

* Do not rewrite or delete progress now.
* Preserve `path_id`, `module_id`, `activity_type`, and `activity_id`; these are already the progress uniqueness dimensions together with `content_version`.
* Map old content versions to a release alias rather than changing activity IDs.
* Existing local imports and practice completions remain `verified=false`; current import code already enforces this.
* Existing server records marked verified are preserved as historical records during migration but require provenance review. They are not automatically promoted into the new competency/evidence tables.
* Add an explicit `evidence_class`/`grading_class` and trusted `grader_event` linkage. Only a server grader acting on a private verification item may append a Verified evidence event.
* Practice completion updates progress state only. Database constraints/triggers reject a Verified evidence row whose item version is not `grading_class=verified` or whose grader event is absent.

Thus progress IDs remain compatible while the meaning of Practice, Completed, Demonstrated, and Verified stays separate.

## 7. Stable Career Path ID: `cybersecurity`

`cybersecurity` is not currently an application data ID. Current repository references are product prose (“cybersecurity learning”), the proposed migration manifest/generator, and the pending decision in `CONTENT_MIGRATION_PLAN.md`. There is no existing frontend route, progress record, backend FK, or catalogue object using it today.

**Proposal:** approve `cybersecurity` as the stable parent Career Path ID because both current Learning Paths belong under it and the value is domain-stable. Impact:

* one new stable `career_path` identity;
* `wireless-pentesting` and `android-pentesting` point to it without changing their IDs;
* future progress continues to key on Learning Path/module/activity IDs, so no current progress key changes;
* public display slug/title may evolve independently (`cybersecurity`, `security-practice`, etc.); URL aesthetics never rename the ID;
* accepting it now removes null/assumed parent mappings from the migration manifest.

Owner decision: approve stable ID `cybersecurity`, or provide a different stable machine ID before schema/import implementation.

## 8. Release and artifact retention proposal

### Versioning and activation

* Release version: immutable monotonic identifier such as `2026.10.02.1`, plus source commit SHA and schema version. IDs are never reused.
* Import creates **staged** only. It validates counts, ownership, references, split fields, hashes, authorization probes, and public projection diff.
* Activation is one transaction: lock current pointer, mark old current retired, mark staged current, update pointer, record actor/time. Partial activation is impossible.
* Rollback is the same pointer operation to a validated retained release; no re-import or backend deployment is required.

### Artifact objects

* Content-addressed immutable key: `releases/<release-id>/<sha256>/<safe-filename>` in a private bucket.
* Verify SHA-256 and byte count before upload, after upload, and when staging is validated. PostgreSQL metadata and object metadata must agree.
* Replacement means a new object/hash in a new release. Never overwrite an object referenced by any release.
* Identical bytes may be deduplicated physically by hash while retaining release-scoped references.
* Public sample promotion requires an explicit public-sample record and approved hash; replacing bytes requires owner review of the new hash.

### Retention and deletion

Concrete proposal for approval:

* retain current plus the **five most recent retired releases** for immediate rollback;
* retain every retired release for at least **180 days**;
* retain release metadata/manifests indefinitely for audit, even after payload deletion;
* retain artifacts while referenced by current, staged, any release inside retention, any learner attempt/evidence record, or legal/incident hold;
* after both thresholds are met, a report-only garbage-collection plan lists unreferenced hashes; owner approval is required before deletion;
* deletion is two-step: mark `pending_delete`, wait 30 days, re-check references/holds, then delete object and record tombstone/hash/time;
* instructor keys and verification material follow the same release retention, with no public cache;
* failed staged releases may be purged after 30 days only if never activated and unreferenced.

## 9. Approval gates and assessment

Still required before implementation:

1. Decide all 159 table rows (group decisions may be applied only with explicit listed exceptions).
2. Approve or replace stable Career Path ID `cybersecurity`.
3. Approve mixed-source reveal policies and instructor role semantics.
4. Approve the Practice-only treatment and historical verified-record provenance policy.
5. Approve release/artifact retention and deletion periods.
6. Later, separately approve schema implementation, staging import, Render migration, repository privacy, and production import in the required order.

# NOT READY FOR MIGRATION

The architecture is reviewable, but 159 content classifications and the policy decisions above remain unresolved. No production migration is authorized.
