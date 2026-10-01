# Independent Engagement Execution & Evidence Matrix

**Standard Alignment:** [OWASP MASVS-ALL](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0001](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0012](https://mas.owasp.org/MASVS/)  
**Core Model:** The Evidence-Gap Matrix → Four-Quadrant Control Testing → Paired Build Execution (`NoteVault`) → Exact Command Transcripts

---

## 1. The Evidence-Gap Matrix

An assessment finding is only as credible as the evidence supporting each link in the vulnerability hypothesis:

```
+─────────────────────────────────────────────────────────────────────────────+
|                          The Evidence-Gap Matrix                            |
|                                                                             |
|  Hypothesis Component     | Source-Level Clue      | Verified Runtime Proof |
|───────────────────────────┼────────────────────────┼────────────────────────|
|  1. Entry Point Reachable | Manifest exported=true | adb am start succeeds  |
|  2. Input Reaches Sink    | intent.getStringExtra  | Logcat / Frida trace   |
|  3. Sink Misconfiguration | No authorization check | Bob's note displayed   |
|  4. Exploitable Impact    | Plaintext data leak    | SQLite WAL record dump |
+─────────────────────────────────────────────────────────────────────────────+
```

If any link in the matrix lacks verified dynamic proof, it remains a **static hypothesis**, not an established security finding.

---

## 2. Four-Quadrant Control Testing on Paired Builds

Using the buildable `NoteVault` (or `Notes Boundary`) demonstration project, execute a comprehensive four-quadrant test matrix comparing the `vulnerable` and `fixed` build flavors:

```
+─────────────────────────────────────────────────────────────────────────────+
|                        Four-Quadrant Control Matrix                         |
|                                                                             |
|  Test Case                   | Vulnerable Flavor    | Fixed Flavor          |
|──────────────────────────────┼──────────────────────┼───────────────────────|
|  1. Positive Control:        | Note 1 loads properly| Note 1 loads properly |
|     Alice requests Alice's   | (Validates base      | (Validates base       |
|     mock note (ID: 1)        |  app functionality)  |  app functionality)   |
|                              |                      |                       |
|  2. Negative Control:        | Note 2 loads!        | Access Denied!        |
|     Alice requests Bob's     | (CRITICAL FLAW:      | (SECURE: Cross-user   |
|     mock note (ID: 2)        |  IDOR / Auth Bypass) |  isolation enforced)  |
|                              |                      |                       |
|  3. Boundary Input:          | Unhandled exception  | Clean error dialog    |
|     Non-existent ID ("9999") | or SQLite crash      | (Resilient handling)  |
|                              |                      |                       |
|  4. Injection Payload:       | SQL Syntax Error /   | Rejected by Room DAO  |
|     `1' OR '1'='1`           | Raw query leak       | Parameterized query   |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Capturing Verifiable Command Transcripts

Every finding must include exact terminal command transcripts and reproducible outputs:

### 3.1. Testing the Vulnerable Flavor
```bash
# 1. Launch vulnerable flavor as user "Alice"
adb shell am start -n com.seccraft.notevault.vulnerable/.MainActivity

# 2. Trigger cross-account note lookup via intent extra
adb shell am start -n com.seccraft.notevault.vulnerable/.NoteDetailActivity \
    --es note_id "2"

# 3. Capture logcat output
adb logcat -d -v time -s NoteDetailActivity:V
```

Output:
```
03-15 14:10:02.120 D NoteDetailActivity: Loading noteId=2 for activeSessionUser=Alice
03-15 14:10:02.145 D NoteDetailActivity: Note found: owner=Bob, title="Bob's Secret Credentials", body="..."
```

*Observation:* Confirmed that the vulnerable flavor displays Bob's private note to Alice without authorization verification.

### 3.2. Testing the Fixed Flavor (Positive & Negative Controls)
```bash
# 1. Launch fixed flavor
adb shell am start -n com.seccraft.notevault.fixed/.MainActivity

# 2. Negative Control: Attempt cross-account note lookup
adb shell am start -n com.seccraft.notevault.fixed/.NoteDetailActivity \
    --es note_id "2"

# 3. Capture logcat output
adb logcat -d -v time -s NoteDetailActivity:V
```

Output:
```
03-15 14:12:05.412 D NoteDetailActivity: Checking authorization: activeSessionUser=Alice, noteOwner=Bob
03-15 14:12:05.415 W NoteDetailActivity: SecurityViolation: User Alice is not authorized to view note 2. Aborting display.
```

*Observation:* Confirmed that the fixed flavor successfully rejects the unauthorized access request while preserving legitimate note access for the owner.
