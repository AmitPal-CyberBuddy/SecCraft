# Multi-Step Attack Scenarios & Android Kill Chains

**Standard Alignment:** [OWASP MASVS-ALL](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0001](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0027](https://mas.owasp.org/MASVS/)  
**Core Model:** Multi-Surface Threat Modeling → End-to-End Attack Chains → The Cross-Fixture Fabrication Hazard → Paired Source-to-Sink Verification

---

## 1. Multi-Surface Attack Modeling in Android

Real-world Android security compromises rarely stem from an isolated bug. Attackers link multiple low- or medium-severity misconfigurations across different platform layers into high-impact **multi-step attack chains**:

```
+─────────────────────────────────────────────────────────────────────────────+
|                     Android Multi-Step Attack Chains                        |
|                                                                             |
|  [CHAIN 1: Deep Link to Sandbox Compromise]                                 |
|  Untrusted Deep Link ──► Exported Forwarder ──► Unexported Activity         |
|                                                 └──► Database Exfiltration  |
|                                                                             |
|  [CHAIN 2: WebView Native Bridge Escalation]                                |
|  External Web Page ──► Unrestricted WebView ──► Exposed Native Bridge       |
|                                                 └──► Shell Execution / Auth |
|                                                                             |
|  [CHAIN 3: Dynamic Code Loading Injection]                                  |
|  Unvalidated Intent Extra ──► DexClassLoader ──► Writable Storage DEX       |
|                                                 └──► Arbitrary Code Exec    |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Walkthrough of Representative Kill Chains

### 2.1. Chain 1: Intent Redirection to Private Data Theft
1. **Initial Vector:** A malicious third-party app installed on the device crafts an implicit Intent targeting an exported forwarder activity:
   ```bash
   adb shell am start -a android.intent.action.VIEW \
       -d "app://auth/forward" \
       --es next_intent "intent:#Intent;component=com.example.targetapp/.ui.InternalViewerActivity;S.query=SELECT%20*%20FROM%20users;end"
   ```
2. **Confused Deputy Execution:** The exported `ForwarderActivity` extracts the nested Intent extra without validating its component destination and calls `startActivity(nextIntent)`.
3. **Privilege Escalation:** Because `ForwarderActivity` launches the Intent from within the target application's own process UID, Android permits navigation to the unexported `InternalViewerActivity` (`android:exported="false"`).
4. **Impact:** The internal activity executes the attacker's SQL query and renders the private user table to disk or UI.

### 2.2. Chain 2: Open Redirect to JavaScript Bridge Abuse
1. **Initial Vector:** The victim clicks an `https://example.com/login?redirect=https://evil.com` link.
2. **Navigation Validation Failure:** The embedded WebView validates that the initial URL begins with `https://example.com`, but fails to intercept HTTP 302 redirects in `shouldOverrideUrlLoading()`.
3. **Bridge Inheritance:** The WebView navigates to `https://evil.com`. Because the developer bound a native bridge using `addJavascriptInterface(NativeBridge(), "AndroidBridge")`, the attacker's webpage executes:
   ```javascript
   window.AndroidBridge.getUserSessionToken();
   ```
4. **Impact:** Total account compromise via cross-context token exfiltration.

---

## 3. The Cross-Fixture Fabrication Hazard

In professional security auditing, an analyst must never fabricate an attack chain by conjoining independent, unrelated code snippets:

```
+─────────────────────────────────────────────────────────────────────────────+
|                    The Cross-Fixture Fabrication Trap                       |
|                                                                             |
|  [UNACCEPTABLE AUDIT ERROR]                                                 |
|  "The app uses DexClassLoader in PluginLoader.kt and also has a WebView in  |
|   InAppBrowser.kt, so an attacker can load arbitrary DEX bytecode through   |
|   the browser bridge to take over the device."                              |
|                                                                             |
|  [PROFESSIONAL BOUNDARY CRITIQUE]                                           |
|  • Does InAppBrowser.kt actually invoke PluginLoader.kt?                    |
|  • Is the bridge method connected to the ClassLoader sink?                 |
|  • Are both components present in the same installed build flavor?          |
|  • If there is no reachable code path between them, claiming a combined     |
|    kill chain is a FABRICATION OF EVIDENCE.                                 |
+─────────────────────────────────────────────────────────────────────────────+
```

Every link in an attack chain requires verifiable source-to-sink evidence or reproducible dynamic execution proof on an authorized test device.
