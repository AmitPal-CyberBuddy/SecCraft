# Runtime Observation and Instrumentation: Mechanism and Worked Trace

> **Scope:** original synthetic training files only. The [source case pack](/android-cases/cases.json) is not a compiled APK or a device capture. Download the [Notes Boundary source project](/android-demos/notes-boundary-source.zip) only for the one mock note/URI demo it actually contains. Use an owned emulator and authorized test builds for optional runtime work; no observed runtime result ships here.

## Threat boundary

A dynamic test combines built artifact identity, controlled accounts, observations and reproducibility. ADB, logs, Frida and debuggers are tools; a hook firing only proves the method executed in an instrumented environment.

## Worked observation → interpretation → limit

For the buildable Notes Boundary source, hypothesize that handleIntent calls NoteStore.lookup with caller-supplied id. The code’s two flavors predict different responses for Alice requesting Bob’s mock note. Source inspection alone cannot demonstrate that Android delivered an Intent or that a screen showed the note.

The relevant source excerpt is labeled **InstrumentationPlan.txt (authored plan)**. In the Lab tab, read the candidate and safer comparison before answering. Identify the source of untrusted input, the sink, and the missing proof. An instrumentation transcript cannot be generated or graded in a browser-only course without an independently run device and trusted test harness.

## A safer decision

Emulators, debugging, instrumentation, lifecycle and anti-tamper can change behavior. Hook success is not a professional exploit or production account leak. No Frida trace is provided or machine graded. A finding requires an exact artifact hash, OS/API and target SDK context where relevant, a controlled positive and negative observation, and a bounded conclusion. In this authored example, the only safe claim is what the named source files express. The distinct Android cases are *not* one deployed application.

**Practice standard:** this unit touches [MASVS-RESILIENCE](https://mas.owasp.org/MASVS/), but a thematic alignment is not a completed OWASP verification test. Refer to the applicable MASTG atomic test only when the actual build and method can be matched. No account XP or locally revealed answer proves field skill.
