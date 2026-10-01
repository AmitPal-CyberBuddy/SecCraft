# APK Analysis with JADX, apktool, apkanalyzer & MobSF

**Standard Alignment:** [OWASP MASTG-TECH-0001](https://mas.owasp.org/MASTG/), [OWASP MASTG-TECH-0002](https://mas.owasp.org/MASTG/)  
**Core Model:** Multi-Tool Static Triage Workflow → Bytecode Decompilation vs. Smali Disassembly → Automated Scanning vs. Manual Code Audit

---

## 1. The Mobile Pentester's Static Toolchain

No single tool provides complete visibility into an Android application. Professional analysts use a complementary toolchain where each utility fulfills a specific analytical purpose:

```
+─────────────────────────────────────────────────────────────+
|               The Android Static Analysis Spectrum          |
|                                                             |
|  [Target APK / AAB]                                         |
|         │                                                   |
|         ├──► apkanalyzer (Rapid CLI metadata & method count)|
|         │                                                   |
|         ├──► MobSF       (Automated baseline & secret scan) |
|         │                                                   |
|         ├──► apktool     (Resource decoding & Smali assembly|
|         │                 for patching / repackaging)       |
|         │                                                   |
|         └──► JADX-GUI    (High-level Java/Kotlin decompiler |
|                           with cross-references & search)   |
+─────────────────────────────────────────────────────────────+
```

| Tool | Core Output | Primary Pentesting Use Case | Limitation |
|---|---|---|---|
| **`apkanalyzer`** | Text metadata, manifest dump, DEX method count. | Rapid pre-installation triage and CI/CD automated gates. | Does not decompile bytecode to readable source code. |
| **`apktool`** | Decoded resources, human-readable XML, and **Smali assembly**. | Modifying manifest attributes, patching bytecode logic, and rebuilding/re-signing APKs. | Smali assembly is verbose and difficult for complex control-flow auditing. |
| **`jadx` / `jadx-gui`** | Reconstructed **Java / Kotlin source code**. | Manual source-to-sink analysis, following call hierarchies (`X`), and auditing business logic. | Can fail on heavily obfuscated or malformed control-flow opcodes. |
| **`MobSF`** | Interactive HTML/JSON security audit report. | Rapid reconnaissance, manifest security scoring, and automated secret discovery. | Prone to false positives; cannot replace human contextual evaluation. |

---

## 2. Deep Dive: `jadx` & `jadx-gui` Workflows

`jadx` is the premier open-source DEX-to-Java decompiler for Android security analysis.

### 2.1. Essential CLI Flags for Large Applications
```bash
# Decompile all DEX files to Java source directory
jadx -d ./jadx_decompiled \
     --deobf \
     --show-bad-code \
     --threads-count 8 \
     target_app.apk
```
- **`--deobf`:** Enables the JADX deobfuscation engine, renaming meaningless obfuscated symbols (e.g., `a.b.c.a()`) to readable deterministic identifiers (e.g., `Class0123.method0456()`).
- **`--show-bad-code`:** Instructs the decompiler to output partially decompiled code or Smali fallbacks even if parsing errors occur, preventing silent method omissions.

### 2.2. Supercharging Analysis in `jadx-gui`
1. **Global Text & Code Search (`Ctrl + Shift + F`):**
   - Search across code, resources, strings, and class names simultaneously.
   - Filter by `Code` or `Strings` to isolate API endpoints, token variables, or intent actions.
2. **Finding Method Usages / Cross-References (`X` Hotkey):**
   - Highlight any method, field, or class name and press `X`.
   - Displays every caller and call site in the application, enabling rapid backwards tracing from a sensitive sink (e.g., `SQLiteDatabase.execSQL()`) to its external entry point.
3. **Exporting as a Gradle Project:**
   - Under `File -> Save as gradle project`, JADX exports the decompiled codebase into an organized project structure that can be opened in Android Studio or VS Code for advanced IDE navigation.

---

## 3. Deep Dive: `apktool` and Smali Disassembly

When an assessment requires modifying application behavior or inspecting raw opcode instructions:

```bash
# 1. Decode APK including resources and Smali bytecode
apktool d target_app.apk -o apk_disassembled

# 2. Inspect generated Smali files
ls apk_disassembled/smali/
# For Multidex apps, additional folders appear: smali_classes2/, smali_classes3/

# 3. Modify AndroidManifest.xml (e.g., set android:debuggable="true")
sed -i 's/android:debuggable="false"/android:debuggable="true"/g' apk_disassembled/AndroidManifest.xml

# 4. Rebuild the modified APK
apktool b apk_disassembled -o modified_app.apk

# 5. Sign the modified APK using your test keystore
zipalign -v 4 modified_app.apk aligned_app.apk
apksigner sign --ks test.keystore --ks-pass pass:password aligned_app.apk
```

### 3.1. Reading Basic Smali Instructions
Smali is an assembler for the Dalvik Virtual Machine register architecture:
- Registers `v0`, `v1`, `v2` represent local function registers.
- Registers `p0`, `p1`, `p2` represent method parameter registers (`p0` is `this` in non-static methods).
- `const-string v0, "secret"` loads a string literal into register `v0`.
- `invoke-virtual {v0, v1}, Lcom/example/Test;->method(...)` executes a virtual method call.

---

## 4. Automated Triage with MobSF

Mobile Security Framework (MobSF) is an automated, all-in-one mobile application testing framework capable of performing static and dynamic analysis:

```bash
# Launch MobSF container via Docker
docker run -it --rm -p 8000:8000 opensecurity/mobsf:latest
```

### 4.1. Navigating MobSF Results with a Critical Mindset
While MobSF accelerates reconnaissance by aggregating permissions, exported components, and hardcoded API keys:
- **Never paste MobSF findings directly into a pentest report.**
- Many automated findings (e.g., "Application uses SQLiteDatabase", "MD5 algorithm referenced") are benign library dependencies rather than exploitable application vulnerabilities.
- Use MobSF to **generate hypotheses**, then verify each finding manually in JADX and on an authorized test device.

---

## 5. Decompilation Failure Modes & Fallback Protocol

Decompilers are heuristics-based; complex Kotlin coroutines, compiler optimizations, or intentional anti-decompilation tricks can cause JADX to emit comments like:
```java
/* JADX WARNING: Code restructure failed: missing block: B:12:0x0034, ... */
```

When JADX fails to decompile a critical security method:
1. **Inspect Smali Directly:** Open the corresponding `.smali` file generated by `apktool`. Smali disassembly is a 1-to-1 reflection of the Dalvik bytecode and never fails to disassemble.
2. **Try Alternative Decompilers:** Run `cfr`, `fernflower`, or `procyon` over classes converted via `dex2jar`.
3. **Verify via Dynamic Analysis:** If static control flow is completely opaque, defer analysis to runtime instrumentation via Frida (Phase 5), observing actual arguments passed to the method during execution.
