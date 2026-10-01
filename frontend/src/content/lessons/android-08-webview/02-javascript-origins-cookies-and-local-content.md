# JavaScript, Origins, Cookies & Local Content

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0024](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0025](https://mas.owasp.org/MASTG/)  
**Core Model:** WebSettings Security Directives → Local File Schemes (`file://`) → Universal Access from File URLs → Modern `WebViewAssetLoader`

---

## 1. WebSettings: The Security Configuration Matrix

The security posture of an embedded WebView is governed by its `WebSettings` object:

```kotlin
val settings = webView.settings
settings.javaScriptEnabled = true // Enables JavaScript execution
```

While JavaScript is required for modern web applications, misconfigured file access directives in `WebSettings` can completely undermine the Android sandbox:

| WebSettings Directive | Default (API 30+) | Security Risk | Pentest Verdict |
|---|---|---|---|
| **`setAllowFileAccess(boolean)`** | `false` (API 30+)<br>`true` (API ≤ 29) | Enables loading local files via `file:///` URLs. If an attacker controls the loaded URL, they can load local files from shared storage or cache. | Must be `false` unless explicitly required. |
| **`setAllowFileAccessFromFileURLs(boolean)`** | `false` (API 16+) | If `true`, JavaScript in a local `file:///` page can read other local `file:///` pages via XMLHttpRequest / fetch. | **Critical Finding:** Must strictly be `false`. |
| **`setAllowUniversalAccessFromFileURLs(boolean)`** | `false` (API 16+) | If `true`, JavaScript in a local `file:///` page can make cross-origin requests to **ANY origin**, including reading internal SQLite databases and private SharedPreferences! | **Critical Finding:** Complete sandbox compromise if enabled. |

---

## 2. The Dangerous Local File Scheme (`file://`) Exploit

Historically, developers displayed local bundled assets by loading them with `file:///android_asset/` or `file:///sdcard/`:

```
+──────────────────────────+                        +──────────────────────────+
|  Malicious Local HTML    |                        |    Target Android App    |
|  (file:///sdcard/        |                        |    Private Sandbox       |
|   malicious.html)        |                        |                          |
|                          |  XHR fetch()           |  /data/data/com.bank/    |
|  UniversalAccess=true!   |───────────────────────►|  databases/app_database.db|
|                          |                        |  (Read successfully!)    |
|                          |  Exfiltrates data      |                          |
|                          |───────────────────────►|  https://attacker.com/sink
+──────────────────────────+                        +──────────────────────────+
```

If an application enables `allowUniversalAccessFromFileURLs = true` or `allowFileAccessFromFileURLs = true`:
1. An attacker places an HTML file on shared storage (`/sdcard/Download/exploit.html`) or tricks the app into caching an HTML payload.
2. The attacker triggers the app to load `file:///sdcard/Download/exploit.html` via deep link or intent extra.
3. The embedded JavaScript uses `XMLHttpRequest` to read `/data/data/<package_name>/databases/app.db` or `shared_prefs/session.xml`.
4. The JavaScript exfiltrates the contents to an attacker-controlled HTTP server.

---

## 3. The Modern Solution: `WebViewAssetLoader`

To eliminate the risks of `file:///` URLs while allowing applications to load bundled assets and local HTML, the Android Jetpack library provides **`WebViewAssetLoader`** (`androidx.webkit.WebViewAssetLoader`):

```kotlin
// SECURE: Loading local assets with WebViewAssetLoader
val assetLoader = WebViewAssetLoader.Builder()
    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
    .addPathHandler("/res/", WebViewAssetLoader.ResourcesPathHandler(context))
    .build()

webView.webViewClient = object : WebViewClient() {
    override fun shouldInterceptRequest(
        view: WebView?, 
        request: WebResourceRequest?
    ): WebResourceResponse? {
        // Intercepts requests and serves them from local assets
        // under a virtual HTTPS origin!
        return assetLoader.shouldInterceptRequest(request?.url)
    }
}

// Load content via virtual secure domain
webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
```

### 3.1. Why `WebViewAssetLoader` is Superior
1. **Virtual HTTPS Origin:** Content is served under `https://appassets.androidplatform.net/`, inheriting standard Web Same-Origin Policy protections.
2. **No `file://` URLs:** Completely disables `file://` access (`settings.allowFileAccess = false`).
3. **CORS Compliance:** Enables clean AJAX communication between local assets and remote backend APIs without disabling browser security headers.

---

## 4. Cookie Management & Third-Party Cookies

WebViews maintain their own cookie storage via `CookieManager.getInstance()`:

```kotlin
val cookieManager = CookieManager.getInstance()
cookieManager.setAcceptCookie(true)

// DISABLE THIRD-PARTY TRACKING COOKIES (Default since Android 5.0)
cookieManager.setAcceptThirdPartyCookies(webView, false)
```

- When an app user logs out of their native account, developers frequently forget to clear WebView session cookies:
  ```kotlin
  // Mandatory cleanup on application logout
  CookieManager.getInstance().removeAllCookies(null)
  CookieManager.getInstance().flush()
  ```
- If cookies persist across logouts, subsequent users on the same device can open the embedded WebView and inherit the previous user's authenticated web session.

---

## 5. Defense & Remediation Standards

1. **Disable Local File Access:** Explicitly set `settings.allowFileAccess = false`, `settings.allowFileAccessFromFileURLs = false`, and `settings.allowUniversalAccessFromFileURLs = false`.
2. **Migrate to `WebViewAssetLoader`:** Replace all `file:///android_asset/` and `file:///android_res/` URLs with `WebViewAssetLoader`.
3. **Reject Third-Party Cookies:** Ensure `cookieManager.setAcceptThirdPartyCookies(webView, false)` is active.
4. **Flush Cookies on Session Termination:** Invoke `removeAllCookies()` upon native user logout.
