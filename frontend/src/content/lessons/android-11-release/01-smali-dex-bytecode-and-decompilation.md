# Smali, DEX Bytecode & Decompilation

**Standard Alignment:** [OWASP MASVS-CODE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0001](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0002](https://mas.owasp.org/MASVS/)  
**Core Model:** Dalvik/ART Register Architecture → DEX File Layout → Smali Syntax Mechanics → Binary Bytecode Patching & Repackaging

---

## 1. The Dalvik & ART Register-Based Execution Model

Unlike standard Java Virtual Machines (JVM) which utilize a stack-based execution model, Android's Dalvik and Android Runtime (ART) virtual machines use a **register-based architecture**:

```
+───────────────────────────────────+     +───────────────────────────────────+
|      Standard Java JVM (Stack)    |     |      Android Dalvik / ART (Reg)   |
|                                   |     |                                   |
|  iload_1         ; Push arg 1     |     |  add-int v0, v1, v2               |
|  iload_2         ; Push arg 2     |     |  ; Directly computes v1 + v2 and  |
|  iadd            ; Pop 2, Add     |     |  ; stores result in register v0!  |
|  istore_3        ; Pop into var 3 |     |                                   |
|  (Requires 4 instructions)        |     |  (Single concise instruction)     |
+───────────────────────────────────+     +───────────────────────────────────+
```

---

## 2. Smali Syntax Fundamentals

Smali is the human-readable intermediate assembly representation of Android DEX bytecode produced by disassemblers like `baksmali` and `apktool`:

### 2.1. Register Naming Conventions
1. **Local Registers (`v0`, `v1`, `v2`, ...):** Used for local variables and intermediate arithmetic inside a method.
2. **Parameter Registers (`p0`, `p1`, `p2`, ...):** Used for incoming method arguments.
   - For **non-static (instance) methods**, register `p0` is always the `this` reference! `p1` is the first parameter.
   - For **static methods**, `p0` is the first parameter.

### 2.2. Common Dalvik Opcode Families

| Dalvik Instruction | Description |
|---|---|
| `const-string v0, "secret"` | Loads a string literal into register `v0`. |
| `const/4 v0, 0x1` | Loads literal integer/boolean `1` (`true`) into `v0`. |
| `const/4 v0, 0x0` | Loads literal integer/boolean `0` (`false`) into `v0`. |
| `iget-object v0, p0, Lcom/pkg/User;->token:Ljava/lang/String;` | Reads instance field `token` from `p0` into `v0`. |
| `invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z` | Calls virtual method on `v0` passing `v1`. |
| `move-result v0` | Captures the return value of the previous method invocation into `v0`. |
| `if-eqz v0, :cond_0` | Branching jump: if register `v0 == 0`, jump to label `:cond_0`. |
| `if-nez v0, :cond_0` | Branching jump: if register `v0 != 0`, jump to label `:cond_0`. |
| `return v0` | Returns the primitive or object reference in `v0`. |

---

## 3. Bytecode Patching: Disassembly, Modification & Reassembly

Bytecode patching allows security analysts to test hypotheses about application logic by altering binary control flow without access to original source code:

```
+────────────────+     +─────────────────+     +─────────────────+     +────────────────+
|   Target APK   |────►|    apktool d    |────►|   Edit Smali    |────►|    apktool b   |
|   (Production) |     |  (Disassemble)  |     |   (Invert Jump) |     |  (Reassemble)  |
+────────────────+     +─────────────────+     +─────────────────+     +────────┬───────+
                                                                                │
+────────────────+     +─────────────────+                                      │
|  Device Retest |◄────|  apksigner sign |◄─────────────────────────────────────+
|  (Patched APK) |     |  (Sign Package) |
+────────────────+     +─────────────────+
```

### 3.1. Step-by-Step Patching Example: Inverting a License / Root Check

1. **Disassemble the APK:**
   ```bash
   apktool d targetapp.apk -o targetapp_src
   ```

2. **Locate and Inspect Target Method in Smali (`RootChecker.smali`):**
   ```smali
   .method public static isDeviceRooted()Z
       .registers 2

       invoke-static {}, Lcom/example/targetapp/RootChecker;->checkSuBinary()Z
       move-result v0

       # VULNERABLE BRANCH: If v0 != 0 (su exists), jump to :rooted
       if-nez v0, :rooted

       const/4 v1, 0x0
       return v1

       :rooted
       const/4 v1, 0x1
       return v1
   .end method
   ```

3. **Apply the Patch:**
   Force the method to always return `false` (`0x0`) immediately:
   ```smali
   .method public static isDeviceRooted()Z
       .registers 1

       # PATCHED: Force return false unconditionally
       const/4 v0, 0x0
       return v0
   .end method
   ```

4. **Reassemble, Align, and Sign:**
   ```bash
   # 1. Rebuild APK
   apktool b targetapp_src -o patched_unsigned.apk

   # 2. Zipalign to 4-byte boundaries (required for Android execution)
   zipalign -p -f -v 4 patched_unsigned.apk patched_aligned.apk

   # 3. Sign using test keystore
   apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android patched_aligned.apk

   # 4. Install on test device
   adb install -r patched_aligned.apk
   ```
