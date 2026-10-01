# SecCraft — Android Application Security Curriculum Redesign Plan

**Date:** 2026-10-01  
**Scope:** Complete architectural overhaul and implementation roadmap for the `android-pentesting` path on SecCraft.  
**Standard Alignment:** OWASP MASVS v2.1.0, OWASP MASTG v2, Google Android Developer Security Framework, HackTricks Android Pentesting Methodology.

---

## 1. Executive Summary & Problem Statement

The legacy Android learning path in SecCraft consisted of 12 shallow modules (25 lessons total) dominated by repetitive boilerplate (`01-mechanism-and-worked-trace.md`, `02-independent-decision.md`). It relied heavily on disconnected, static text snippets without clear runtime verification bridges, lacked dedicated modules for instrumentation (Frida/Objection) and multi-step attack scenarios, and offered no structured vulnerable-to-fixed build lifecycle.

This redesign establishes a rigorous **14-module, 8-phase curriculum** grounded in 10 architectural principles, standardizing the distinction between static hypotheses and dynamic verification, mandating a 12-step lab contract, and pairing vulnerable and fixed implementation baselines.

---

## 2. The 10 Core Architectural & Pedagogical Principles

1. **Maintain Exactly 14 Modules:**  
   Retain a tight, coherent 14-module scope across 8 phases. Avoid bloating into 18–20 single-API modules.
2. **Combine Related Concepts Inside Lessons:**  
   The **lesson is the conceptual unit**; the **lab is the practical unit**. Group related components and mechanisms (e.g., Activities, Services, Receivers, Providers, Binder, PendingIntents, and URI Grants in Module A04) rather than fragmenting them into superficial one-page files.
3. **Module A13 (Attack Scenarios) is Non-Negotiable:**  
   Attack scenarios are not optional side exercises. In A13, learners prove the complete practitioner chain:  
   $$\text{Knowledge} \longrightarrow \text{Technique} \longrightarrow \text{Combination} \longrightarrow \text{Decision} \longrightarrow \text{Impact}$$  
   Scenarios present unfamiliar, multi-step vulnerabilities requiring independent triage, exploitation, and mitigation verification.
4. **Module A14 Requires Genuine Dynamic Verification:**  
   Source-first analysis supports early foundations, but capstone professional completion requires genuine dynamic execution on an authorized emulator or physical device. A source snippet marked `NOT EXECUTED` can never count as completed dynamic testing.
5. **Static Analysis Generates Hypotheses; Dynamic Analysis Verifies Behavior:**  
   This core distinction must be reinforced across every module. Code review identifies candidate sources and sinks; runtime observation and traffic analysis verify whether boundaries can be breached in a running system.
6. **Frida/Objection Teaches Validation, Not "Bypass Recipes":**  
   "The hook fired" is evidence of execution inside an instrumented process, **not proof of an application vulnerability**. Learners must answer: *What security boundary was changed, and what backend or business impact can be demonstrated?*
7. **The 12-Step Lab Contract:**  
   Every practical Android lab adheres to a unified rubric:
   $$\text{Prerequisites} \to \text{Scope} \to \text{Target Build} \to \text{Hypothesis} \to \text{Static Evidence} \to \text{Test} \to \text{Observation} \to \text{Evaluation} \to \text{Impact} \to \text{Remediation} \to \text{Retest} \to \text{Limitations}$$
8. **Paired Vulnerable + Fixed Builds:**  
   For all core attack surfaces, provide matching vulnerable and fixed source/build variants:  
   $$\text{Vulnerable Build} \longrightarrow \text{Exploit / Validate} \longrightarrow \text{Evidence} \longrightarrow \text{Fixed Build} \longrightarrow \text{Retest}$$  
   Retesting confirmed remediations is essential to professional pentesting.
9. **One Reusable Multi-Surface Lab Application:**  
   Consolidate disparate sample snippets into a unified, realistic application (`NoteVault` / `InsecureBank`) featuring exported components, deep links, insecure local storage, WebView bridges, custom network configurations, and local authentication checks. Learners encounter each surface in isolation during Phases 2–6, then evaluate the entire application in Phases 7 and 8.
10. **Structured Learner Progression:**  
    The curriculum builds systematically toward independent evaluation:  
    $$\text{Understand Android} \to \text{Analyze APK} \to \text{Map Trust Boundaries} \to \text{Form Hypothesis} \to \text{Test on Device} \to \text{Instrument Runtime} \to \text{Validate Behavior} \to \text{Prove Impact} \to \text{Remediate} \to \text{Retest} \to \text{Assess Unfamiliar Targets}$$

---

## 3. Industry Standards & External Resource Integration

### 3.1. OWASP MASVS v2.1.0 & MASTG v2
The curriculum explicitly cross-references the 8 MASVS categories and atomic MASTG test profiles:
- **`MASVS-STORAGE`:** SharedPreferences, SQLite databases, internal/external storage, system logs, cache files, and auto-backup policies.
- **`MASVS-CRYPTO`:** Symmetric/asymmetric encryption, AES-GCM nonce reuse, hardcoded keys, PRNG predictability, and hardware-backed Android Keystore (TEE/StrongBox).
- **`MASVS-AUTH`:** Biometric authentication (`BiometricPrompt` with `CryptoObject`), session tokens, OAuth token lifecycle, local authentication bypass vs backend authorization.
- **`MASVS-NETWORK`:** TLS configuration, Network Security Config XML, cleartext traffic policies, custom `X509TrustManager` pitfalls, and certificate pinning validation.
- **`MASVS-PLATFORM`:** IPC security, component export audits, intent filter vulnerabilities, PendingIntent mutability, content provider path traversal/SQLi, custom URI schemes vs Android App Links, and WebView JavaScript bridges.
- **`MASVS-CODE`:** Compiler mitigations, code obfuscation (ProGuard/R8), sensitive string exposure, and third-party SDK attack surfaces.
- **`MASVS-RESILIENCE`:** Root detection, emulator detection, integrity attestation (Play Integrity API / SafetyNet), anti-debugging, and anti-Frida controls.
- **`MASVS-PRIVACY`:** Sensitive data in system clipboard, notification leaks, background screen caching (`FLAG_SECURE`), and runtime permission scopes.

### 3.2. Android Platform Version Security Matrix
Security controls vary drastically across Android versions; learners must interpret findings in OS context:
- **Android 7.0 (API 24):** User-installed CA certificates are untrusted by default for apps targeting API 24+; introduction of Network Security Config XML.
- **Android 8.0/8.1 (API 26/27):** Strict background execution limits; removal of implicit broadcast delivery for most system intents.
- **Android 9.0 (API 28):** Cleartext HTTP traffic is blocked by default (`cleartextTrafficPermitted="false"`).
- **Android 10 (API 29):** Scoped Storage introduced; MAC address randomization enforced.
- **Android 11 (API 30):** Package visibility restricted via `<queries>` declarations; `/sdcard` direct filesystem access further constrained.
- **Android 12/12L (API 31/32):** Explicit `android:exported` attribute is **mandatory** for all components with intent filters; PendingIntents **must** specify `FLAG_IMMUTABLE` or `FLAG_MUTABLE`.
- **Android 13 (API 33):** Granular media permissions (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`) replace broad storage; `POST_NOTIFICATIONS` runtime permission; dynamic receiver registration requires explicit `RECEIVER_EXPORTED` or `RECEIVER_NOT_EXPORTED`.
- **Android 14 (API 34):** Safer intent redirection (implicit intents strictly delivered to exported components only); dynamic code loading (DCL) files **must be marked read-only** (`chmod 0444`) before loading.
- **Android 15 (API 35):** Private Spaces sandboxing; edge-to-edge layout enforcement; enhanced Binder security transactions.

### 3.3. HackTricks & Community Pentesting Best Practices
- Static inspection workflows: `apkanalyzer`, `apktool`, `jadx-gui`, `dex2jar`, `MobSF`.
- Dynamic testing workflows: `adb shell`, `logcat`, `pidcat`, Burp Suite with Magisk Trust User Certs / AlwaysTrustUserCerts, Frida scripts, `objection`.
- Surface-to-impact methodology: mapping entry points, constructing payload intents via `am start` / `am broadcast` / `am startservice` / `content query`, verifying backend privilege boundaries.

---

## 4. Complete 14-Module Curriculum Map (8 Phases / 53 Lessons)

```
Android Application Security
│
├── Phase 1 — Foundations
│   ├── A01 — Android Architecture & Security Model (android-01-platform)
│   │   ├── 01 Android Architecture, Sandbox & Trust Boundaries
│   │   ├── 02 Components, Binder/IPC & Permissions
│   │   ├── 03 App Signing, Installation & Platform Security
│   │   └── 04 Android Versions, SDK Levels & Testing Context
│   │
│   └── A02 — Android Pentesting Setup (android-02-workstation)
│       ├── 01 Android Pentesting Workstation: SDK, ADB & Emulator
│       ├── 02 Proxying, Logcat, Filesystem & Test Accounts
│       └── 03 Device Preparation, Root/Non-Root, Snapshots & Evidence
│
├── Phase 2 — Application Reconnaissance
│   └── A03 — APK/AAB Reconnaissance & Static Triage (android-03-apk-triage)
│       ├── 01 APK/AAB Anatomy, Manifest & Permissions
│       ├── 02 DEX, Resources, Assets & Native Libraries
│       ├── 03 APK Analysis with JADX, apktool, apkanalyzer & MobSF
│       └── 04 Attack-Surface Mapping & Source-to-Sink Analysis
│
├── Phase 3 — Android Platform Attack Surface
│   ├── A04 — Components, IPC & Intent Security (android-04-components)
│   │   ├── 01 Exported Components & Intent Filters
│   │   ├── 02 Intent/Extra/URI Handling & Component Authorization
│   │   ├── 03 Services, Broadcast Receivers & Content Providers
│   │   └── 04 PendingIntent, URI Grants & IPC Abuse
│   │
│   └── A05 — Deep Links, App Links & Intent Hijacking (android-05-links)
│       ├── 01 URI Schemes, Intent Resolution & App Links
│       ├── 02 Domain Verification, Redirects & Trust Decisions
│       └── 03 Intent Redirection, Fallbacks & Defensive Validation
│
├── Phase 4 — Data & Network Security
│   ├── A06 — Local Storage, Secrets & Data Leakage (android-06-storage)
│   │   ├── 01 App Storage: Preferences, Files, SQLite & Cache
│   │   ├── 02 Logs, Clipboard, Notifications & Screenshots
│   │   ├── 03 Backup, Data Lifecycle & Logout
│   │   └── 04 Keystore, Keys & Secure Data Handling
│   │
│   ├── A07 — Android Network Security (android-07-network)
│   │   ├── 01 TLS, Network Security Config & Cleartext Traffic
│   │   ├── 02 Certificate & Hostname Validation
│   │   ├── 03 Pinning, Custom TrustManagers & Debug Overrides
│   │   └── 04 Session Tokens, Proxying & Client-vs-API Boundaries
│   │
│   └── A08 — WebView & Embedded Content Security (android-08-webview)
│       ├── 01 WebView Architecture & Navigation
│       ├── 02 JavaScript, Origins, Cookies & Local Content
│       ├── 03 JavaScript Bridges & Native APIs
│       └── 04 Safe WebView Configuration, Origin Allowlists & Bridge Hardening
│
├── Phase 5 — Dynamic Analysis
│   ├── A09 — Dynamic Android Analysis (android-09-runtime)
│   │   ├── 01 Runtime Observation with ADB & Logcat
│   │   ├── 02 Filesystem, Processes, Activities & Runtime State
│   │   ├── 03 Burp + Runtime Traffic Observation
│   │   └── 04 Static-to-Dynamic Validation Workflow
│   │
│   └── A10 — Frida, Objection & Instrumentation (android-10-instrumentation)
│       ├── 01 Frida Architecture, Spawn & Attach
│       ├── 02 Java Method Hooks, Arguments & Return Values
│       ├── 03 Objection & Runtime Inspection
│       └── 04 Instrumentation for Security Validation
│
├── Phase 6 — Advanced Android Security
│   ├── A11 — Cryptography, Authentication & Device Security (android-11-crypto)
│   │   ├── 01 Cryptographic Misuse & Key Management
│   │   ├── 02 IV/Nonce, AES-GCM & Hardcoded Secrets
│   │   ├── 03 Biometrics, Device Identity & Authorization
│   │   └── 04 Attestation, Root Detection & Client-Side Security Controls
│   │
│   └── A12 — Reverse Engineering, Native Code & App Resilience (android-12-release)
│       ├── 01 Smali, DEX & Decompilation
│       ├── 02 Obfuscation, R8/ProGuard & Code Reconstruction
│       ├── 03 JNI, Native Libraries & Cross-Language Analysis
│       └── 04 Dynamic Code Loading, Anti-Tamper & Resilience
│
├── Phase 7 — Attack Scenarios
│   └── A13 — Android Security Attack Scenarios (android-13-scenarios)
│       ├── 01 Component & IPC Attack Scenario
│       ├── 02 Deep-Link Attack Scenario
│       ├── 03 WebView Attack Scenario
│       ├── 04 Storage / Credential Exposure Scenario
│       └── 05 Runtime Manipulation Scenario
│
└── Phase 8 — Professional Assessment
    └── A14 — Independent Android Penetration Test (android-14-case)
        ├── 01 Assessment Methodology, Scoping & Evidence Framework
        └── 02 Independent Target Engagement, Reporting & Retest Validation
```

---

## 5. Phase-by-Phase Implementation Roadmap & Migration Strategy

To guarantee stability, progress continuity, and zero broken links, the redesign executes phase by phase:

| Phase | Modules Covered | Primary Focus | Key Deliverables |
|---|---|---|---|
| **Phase 1** | `android-01-platform`, `android-02-workstation` | Foundations, Architecture, Sandbox, IPC model, SDK levels, Workstation, ADB, Proxy, Evidence | 7 comprehensive lessons, 14-module catalogue contract, legacy URL redirects, verification script |
| **Phase 2** | `android-03-apk-triage` + Lab Project | Multi-surface vulnerable/fixed demo project, APK/AAB anatomy, JADX/apktool triage | 4 lessons, updated `NoteVault` source project with vulnerable/fixed flavors |
| **Phase 3** | `android-04-components`, `android-05-links` | Exported components, intent filters, PendingIntents, URI grants, deep links, App Links | 7 lessons, component/link exploit & hardening exercises |
| **Phase 4** | `android-06-storage`, `android-07-network`, `android-08-webview` | Data at rest, Keystore, TLS, NSC, cert pinning, WebView bridge attacks & defense | 12 lessons, storage/network/WebView verification rubrics |
| **Phase 5** | `android-09-runtime`, `android-10-instrumentation` | Pure dynamic observation vs Frida/Objection instrumentation; verifying boundary shifts | 8 lessons, non-instrumented runtime traces, Frida hook templates |
| **Phase 6** | `android-11-crypto`, `android-12-release` | Cryptographic misuse, AES-GCM nonce reuse, Biometrics, Attestation, Smali, JNI, DCL | 8 lessons, cryptographic audit lab, native library triage |
| **Phase 7** | `android-13-scenarios` | Full multi-step attack chains with vulnerable and fixed build pairs | 5 end-to-end scenario walkthroughs and retest suites |
| **Phase 8** | `android-14-case` | Full-scope independent penetration test engagement | 2 capstone lessons, comprehensive audit report template, retest validation |

---

## 6. Backward Compatibility & Verification Guardrails

1. **Legacy Module & Lesson Mapping:**
   `frontend/src/content/legacy-module-map.ts` maps retired/renamed IDs to their modern counterparts, preserving bookmarks and deep links without granting unearned dynamic or scenario XP.
2. **Deterministic Verification:**
   A dedicated Python verifier `scripts/verify-android-curriculum.py` continuously audits all lesson structures, headings, code blocks, technical accuracy, ADB commands, and MASVS citations.
3. **Progress Invariants:**
   `scripts/verify-learning-data.mjs` and `scripts/verify-progress-state.mjs` validate catalogue integrity, ensuring that adding content expands the curriculum denominator without altering historical learner state or awarding unearned XP.
