# WebView Architecture & Navigation

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0023](https://mas.owasp.org/MASTG/)  
**Core Model:** Embedded Chromium Engine → URL Loading Lifecycles (`shouldOverrideUrlLoading`) → Navigation Interception → External Intent URL Injection

---

## 1. The Android WebView Architecture

A **WebView** (`android.webkit.WebView`) is an embedded browser component based on the open-source Chromium rendering engine. It allows Android applications to render web pages, display hybrid HTML5 interfaces, and execute JavaScript directly within the native application layout:

```
+─────────────────────────────────────────────────────────────+
|               Android WebView Component Layers              |
|                                                             |
|  [Android Native Host Application]                          |
|         │                                                   |
|         ├── Configures WebSettings                          |
|         ├── Attaches WebViewClient (Navigation events)      |
|         ├── Attaches WebChromeClient (UI, alerts, console)  |
|         │                                                   |
|         ▼ JNI Bridge                                        |
|  [Chromium Content Module]                                  |
|         ├── Blink Rendering Engine                          |
|         ├── V8 JavaScript Engine                            |
|         └── Sandboxed GPU & Network Processes               |
+─────────────────────────────────────────────────────────────+
```

When an application integrates a WebView, it bridges two fundamentally different security models: the **Android native sandbox (Linux UID isolation)** and the **Web security model (Same-Origin Policy)**.

---

## 2. Navigation Control via `WebViewClient`

By default, when a user clicks a link inside a standard WebView without a custom `WebViewClient`, the Android operating system intercepts the URL and launches the external system web browser (e.g., Chrome).

To render pages within the app, developers attach a custom `WebViewClient` and override `shouldOverrideUrlLoading()`:

```kotlin
webView.webViewClient = object : WebViewClient() {
    override fun shouldOverrideUrlLoading(
        view: WebView?, 
        request: WebResourceRequest?
    ): Boolean {
        val url = request?.url?.toString() ?: return false
        
        // Return false to let the WebView load the URL internally
        // Return true to cancel navigation or handle externally
        return false 
    }
}
```

### 2.1. The Missing Navigation Validation Trap
A common vulnerability occurs when an application loads an initial trusted page (e.g., `https://trusted.example/help`), but `shouldOverrideUrlLoading()` fails to validate subsequent clicks or server-side HTTP 302 redirects:
- If `shouldOverrideUrlLoading()` returns `false` unconditionally, **the user can navigate to any external domain** (e.g., via a link posted on a community forum or an attacker-controlled ad).
- If native JavaScript bridges are attached, the external malicious site inherits those native capabilities!

---

## 3. Untrusted URL Loading via External Intents

A high-severity vulnerability occurs when an exported Activity extracts a URL from an incoming Intent and passes it directly to `WebView.loadUrl()`:

```java
// CRITICAL VULNERABILITY: Arbitrary URL Loading in Exported Activity
public class InAppBrowserActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        
        // SOURCE: Untrusted URL from external Intent extra
        String targetUrl = getIntent().getStringExtra("target_url");
        
        // CRITICAL SINK: Loading untrusted URL directly!
        if (targetUrl != null) {
            webView.loadUrl(targetUrl);
        }
        
        setContentView(webView);
    }
}
```

### 3.1. Exploitation via ADB
If `InAppBrowserActivity` has `android:exported="true"`, any rogue app on the device can force it to load malicious sites:

```bash
# 1. Force target app to load an attacker phishing page
adb shell am start -n com.example.targetapp/.ui.InAppBrowserActivity \
    --es "target_url" "https://attacker-phishing.com/login"

# 2. Force target app to execute JavaScript directly via javascript: pseudoprotocol
adb shell am start -n com.example.targetapp/.ui.InAppBrowserActivity \
    --es "target_url" "javascript:alert(document.cookie)"
```

---

## 4. Pentester's Operational Checklist: WebView Navigation

1. **Locate All WebView Instantiations in JADX:**
   Search the codebase for `new WebView(` or layout XMLs containing `<WebView>`.
2. **Audit `loadUrl()` Invocations:**
   Trace where the URL parameter originates. Does it come from:
   - A hardcoded constant string? (Safe baseline)
   - An Intent extra (`intent.getStringExtra()`)? (High risk if exported!)
   - A deep-link query parameter (`uri.getQueryParameter("url")`)? (High risk!)
3. **Inspect `WebViewClient` Implementation:**
   - Does it override `shouldOverrideUrlLoading()`?
   - Does it enforce strict hostname allowlisting across all navigation requests and redirects?
4. **Test Scheme Handling:**
   Verify whether custom schemes (e.g., `intent://`, `tel:`, `sms:`) are handled safely without unintended dialer or activity dispatch.

---

## 5. Defense & Remediation Standards

1. **Validate All URLs Against Strict Allowlists:** Never load arbitrary URLs from Intent extras. Validate the scheme and host against an approved domain whitelist:
   ```kotlin
   fun isApprovedUrl(url: String?): Boolean {
       val uri = Uri.parse(url ?: return false)
       return uri.scheme == "https" && 
              (uri.host == "trusted.example" || uri.host?.endsWith(".trusted.example") == true)
   }
   ```
2. **Enforce Navigation Allowlists in `shouldOverrideUrlLoading()`:** Inspect every requested URL in `shouldOverrideUrlLoading()`. If the URL belongs to an external domain, either block it or launch it in the external system browser via an explicit `Intent(Intent.ACTION_VIEW)`.
3. **Block the `javascript:` Pseudoprotocol:** Never allow untrusted inputs starting with `javascript:` to reach `WebView.loadUrl()`.
