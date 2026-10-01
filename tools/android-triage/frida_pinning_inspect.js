/**
 * SecCraft — Educational TLS TrustManager Instrumentation Script
 * Demonstrates how client-side TrustManager validation hooks operate
 * and logs certificate verification attempts with full caller context.
 *
 * For educational testing in authorized environments.
 */

Java.perform(function () {
    console.log("[*] SecCraft TLS Instrumentation Hook initialized.");

    try {
        var TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
        var ArrayList = Java.use('java.util.ArrayList');

        // Hook checkTrustedRecursive to trace certificate chain evaluations
        TrustManagerImpl.checkTrustedRecursive.overload(
            '[Ljava.security.cert.X509Certificate;',
            'java.lang.String',
            'java.lang.String',
            'boolean',
            'java.util.ArrayList',
            'java.util.ArrayList'
        ).implementation = function (certs, authType, host, clientAuth, untrustedChain, trustAnchorChain) {
            console.log("[+] Conscrypt checkTrustedRecursive called for host: " + host);
            console.log("    - Certificate chain length: " + certs.length);
            console.log("    - Subject: " + certs[0].getSubjectDN().getName());
            console.log("    - Issuer:  " + certs[0].getIssuerDN().getName());

            // Educational bypass: returns empty trust list satisfying verification
            return ArrayList.$new();
        };
        console.log("[+] Hooked Conscrypt TrustManagerImpl.checkTrustedRecursive");
    } catch (err) {
        console.log("[-] Conscrypt hook not applicable or failed: " + err);
    }

    try {
        var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');

        console.log("[*] Monitoring javax.net.ssl.TrustManager implementations.");
    } catch (err) {
        console.log("[-] X509TrustManager hook error: " + err);
    }
});
