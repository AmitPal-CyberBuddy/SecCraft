# Safe WebView Configuration, Origin Allowlists & Bridge Hardening

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0023](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0026](https://mas.owasp.org/MASVS/)  
**Core Model:** Defense-in-Depth Configuration Blueprint → Navigation & Redirect Filtering → Modern `addWebMessageListener` Origin Rules → The 12-Step Lab Contract

---

## 1. The Hardened WebView Configuration Blueprint

Securing an embedded WebView requires establishing a comprehensive defense-in-depth baseline across its configuration properties:

```kotlin
// HARDENED SECURE WEBVIEW CONFIGURATION BLUEPRINT
fun configureSecureWebView(webView: WebView, context: Context) {
    val settings = webView.settings

    // 1. JavaScript Execution (Enable ONLY if strictly required)
    settings.javaScriptEnabled = true

    // 2. Disable Local Filesystem Schemes (Eliminate file:// attacks)
    settings.allowFileAccess = false
    settings.allowContentAccess = false
    settings.allowFileAccessFromFileURLs = false
    settings.allowUniversalAccessFromFileURLs = false

    // 3. Block Mixed Content (Enforce pure HTTPS; block plaintext HTTP subresources)
    settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW

    // 4. Secure Geolocation & Storage
    settings.setGeolocationEnabled(false)
    settings.databaseEnabled = false
    settings.domStorageEnabled = true // Enable only if web application requires local storage

    // 5. Restrict Cookie Scope
    val cookieManager = CookieManager.getInstance()
    cookieManager.setAcceptCookie(true)
    cookieManager.setAcceptThirdPartyCookies(webView, false)
}
```

---

## 2. Enforcing Strict Navigation & Redirect Allowlists

Hardening settings is insufficient if the user or a server-side redirect can steer the WebView to an arbitrary external website. The application must enforce an origin allowlist in its `WebViewClient`:

```kotlin
class SecureWebViewClient(private val context: Context) : WebViewClient() {
    
    // Strict Hostname Validation
    private fun isAllowedHost(host: String?): Boolean {
        if (host == null) return false
        val normalized = host.lowercase()
        return normalized == "trusted.example" || 
               normalized.endsWith(".trusted.example")
    }

    override fun shouldOverrideUrlLoading(
        view: WebView?, 
        request: WebResourceRequest?
    ): Boolean {
        val uri = request?.url ?: return true
        
        // 1. Enforce HTTPS scheme
        if (uri.scheme != "https") {
            return true // Reject plaintext http, file, or custom schemes
        }

        // 2. Enforce Approved Hostname
        if (isAllowedHost(uri.host)) {
            return false // Permit navigation within trusted boundary
        }

        // 3. Launch External Browser for Off-Domain Links
        val externalIntent = Intent(Intent.ACTION_VIEW, uri)
        externalIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(externalIntent)
        } catch (e: ActivityNotFoundException) {
            // Handle missing browser
        }
        return true // Block WebView from loading external page internally
    }
}
```

---

## 3. The Modern Bridge Standard: `addWebMessageListener`

In modern Android development, the legacy `addJavascriptInterface` mechanism is superseded by **`WebViewCompat.addWebMessageListener()`** (available via AndroidX Webkit):

```
+─────────────────────────────────────────────────────────────+
|               addWebMessageListener Security Model          |
|                                                             |
|  • Replaces legacy addJavascriptInterface()                 |
|  • Binds message listener to an EXPLICIT SET OF ORIGINS     |
|  • The Android Framework validates the web page's origin    |
|    before dispatching messages to native code!              |
|  • Completely immune to off-domain bridge inheritance!      |
+─────────────────────────────────────────────────────────────+
```

```kotlin
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
    val allowedOrigins = setOf("https://trusted.example", "https://auth.trusted.example")
    
    WebViewCompat.addWebMessageListener(
        webView,
        "NativeBridge",
        allowedOrigins
    ) { view, message, sourceOrigin, isMainFrame, replyProxy ->
        // Native code receives structured text messages ONLY from allowed origins!
        val request = message.data
        if ("GET_STATUS" == request) {
            replyProxy.postMessage("STATUS_ACTIVE")
        }
    }
}
```

---

## 4. Applying the 12-Step Lab Contract to WebView Security

When reporting WebView vulnerabilities during an assessment:

1. **Prerequisites:** JADX-GUI, Android test device, Burp Suite / ADB.
2. **Scope:** Target package `com.example.targetapp`, component `InAppBrowserActivity`.
3. **Target / Build Identity:** SHA-256 digest of target APK verified.
4. **Hypothesis:** An external attacker can invoke `InAppBrowserActivity` via intent with an arbitrary URL and access sensitive bridge methods.
5. **Static Evidence:** Manifest declares `InAppBrowserActivity` exported; `onCreate()` attaches `addJavascriptInterface(Bridge(), "Native")` and calls `webView.loadUrl(intent.getStringExtra("url"))` without hostname allowlists.
6. **Test Plan:** Launch activity via `am start` passing an attacker-controlled HTTPS URL hosting a script that calls `window.Native.getAuthToken()`.
7. **Observation:** Attacker page loads; JavaScript invokes bridge method and receives active authentication token.
8. **Evaluation:** Confirms Critical Privilege Escalation via Unrestricted WebView Bridge (MASVS-PLATFORM-2).
9. **Impact:** Critical: total account compromise via credential theft.
10. **Remediation:** Remove bridge, enforce strict navigation allowlisting in `shouldOverrideUrlLoading()`, and migrate to `addWebMessageListener` with explicit origin sets.
11. **Retest:** Build fixed flavor; re-trigger launch; confirm WebView rejects loading external domain and opens external browser.
12. **Limitations:** Requires victim to invoke deep link or malicious app to dispatch intent on the device.
