# Exported Components and IPC: Mechanism and Worked Trace

> **Scope:** original synthetic training files only. The [source case pack](/android-cases/cases.json) is not a compiled APK or a device capture. Download the [Notes Boundary source project](/android-demos/notes-boundary-source.zip) only for the one mock note/URI demo it actually contains. Use an owned emulator and authorized test builds for optional runtime work; no observed runtime result ships here.

## Threat boundary

An exported component is callable only under its installed manifest and permission policy. Trace an untrusted Intent through an entry point to an owned resource before calling it a disclosure.

## Worked observation → interpretation → limit

In the original Notes Boundary project, an exported VIEW Activity accepts an id. In its vulnerable flavor NoteStore returns a synthetic note without checking the mock owner; the fixed flavor checks it. This project has no exported receiver or provider. The separate Receiver.java excerpt in the case pack illustrates the same ownership boundary through a receiver, but is not installed by the demo.

The relevant source excerpt is labeled **Receiver.java (illustrative excerpt)**. In the Lab tab, read the candidate and safer comparison before answering. Identify the source of untrusted input, the sink, and the missing proof. No second-app receiver test, Binder trace or permission enforcement observation exists in this pack.

## A safer decision

Never equate exported=true with exploitation. The default Activity lifecycle can reset the mock account; a successful second-app delivery and observed sensitive sink require separate evidence. A finding requires an exact artifact hash, OS/API and target SDK context where relevant, a controlled positive and negative observation, and a bounded conclusion. In this authored example, the only safe claim is what the named source files express. The distinct Android cases are *not* one deployed application.

**Practice standard:** this unit touches [MASVS-PLATFORM](https://mas.owasp.org/MASVS/), but a thematic alignment is not a completed OWASP verification test. Refer to the applicable MASTG atomic test only when the actual build and method can be matched. No account XP or locally revealed answer proves field skill.
