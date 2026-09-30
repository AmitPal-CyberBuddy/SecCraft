# Deep Links and App Links: Mechanism and Worked Trace

> **Scope:** original synthetic training files only. The [source case pack](/android-cases/cases.json) is not a compiled APK or a device capture. Download the [Notes Boundary source project](/android-demos/notes-boundary-source.zip) only for the one mock note/URI demo it actually contains. Use an owned emulator and authorized test builds for optional runtime work; no observed runtime result ships here.

## Threat boundary

Custom schemes route intents without proving domain ownership. HTTPS App Links additionally need an installed manifest, Digital Asset Links and device verification state. Parse scheme, host, path and parameters before any sensitive action.

## Worked observation → interpretation → limit

The case excerpt accepts a host ending in trusted.example; attackertrusted.example also passes that suffix check. The Notes Boundary demo uses a custom scheme and does not implement Android App Link verification. Inspect whether a competing app could register the scheme and whether the demo’s account guard is checked after routing.

The relevant source excerpt is labeled **LinkRouter.kt (illustrative excerpt)**. In the Lab tab, read the candidate and safer comparison before answering. Identify the source of untrusted input, the sink, and the missing proof. The snippet has no app association JSON, installed domain verification result or privileged sink implementation.

## A safer decision

A string comparison alone is not proof of a verified App Link or action execution. Query and fragment parsing, redirects and version-specific resolver state matter; do not invent domain ownership. A finding requires an exact artifact hash, OS/API and target SDK context where relevant, a controlled positive and negative observation, and a bounded conclusion. In this authored example, the only safe claim is what the named source files express. The distinct Android cases are *not* one deployed application.

**Practice standard:** this unit touches [MASVS-PLATFORM](https://mas.owasp.org/MASVS/), but a thematic alignment is not a completed OWASP verification test. Refer to the applicable MASTG atomic test only when the actual build and method can be matched. No account XP or locally revealed answer proves field skill.
