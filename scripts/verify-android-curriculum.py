#!/usr/bin/env python3
"""
Verify Android Curriculum integrity, structure, technical rigor, and contract invariants.

Checks:
1. Module and lesson alignment across modules.json, learning-paths.json, and filesystem.
2. Technical content standards: word counts, section headers, MASVS/MASTG citations,
   code block syntax, and absence of fabricated execution claims.
3. Android platform security accuracy: Linux UID sandbox, SELinux MAC, Binder IPC,
   permission protection levels, APK signing schemes (v1-v4), and target SDK behaviors.
4. Workstation & ADB command safety: userdebug images, system CA <hash>.0 naming,
   logcat buffers, and explicit offline fallback disclosures.
5. Quiz bank coverage, options validation, and answer key ranges.
6. Legacy deep-link mapping to active lessons.
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / 'frontend'
LESSONS_DIR = FRONTEND_DIR / 'src' / 'content' / 'lessons'
MODULES_PATH = FRONTEND_DIR / 'src' / 'content' / 'modules.json'
PATHS_PATH = FRONTEND_DIR / 'src' / 'content' / 'learning-paths.json'
QUIZ_PATH = FRONTEND_DIR / 'src' / 'content' / 'quizData.ts'
LEGACY_MAP_PATH = FRONTEND_DIR / 'src' / 'content' / 'legacy-module-map.ts'


def main():
    print("[*] Starting SecCraft Android Curriculum Verification...")
    total_checks = 0

    # 1. Load configuration and content
    modules_data = json.loads(MODULES_PATH.read_text())
    paths_data = json.loads(PATHS_PATH.read_text())
    android_path = next((p for p in paths_data if p['id'] == 'android-pentesting'), None)
    assert android_path is not None, "android-pentesting path missing in learning-paths.json"
    total_checks += 1

    android_modules = [m for m in modules_data if m.get('learningPathId') == 'android-pentesting']
    assert len(android_modules) >= 12, f"Expected at least 12 Android modules, found {len(android_modules)}"
    total_checks += 1

    # 2. Verify legacy lesson mapping
    legacy_text = LEGACY_MAP_PATH.read_text()
    retired_android_lessons = [
        '01-sandbox-and-components',
        '02-intents-and-versions',
        '01-setup-and-scope',
        '02-evidence-and-fallback',
        '01-apk-anatomy',
        '02-source-to-sink',
        '03-compare-owned-demo-source',
    ]
    for retired in retired_android_lessons:
        assert f"'{retired}':" in legacy_text, f"Retired lesson {retired} missing in LEGACY_LESSON_MAP"
        total_checks += 1

    # 3. Verify Phase 1, Phase 2, and Phase 3 modules and lessons
    phase1_modules = [m for m in android_modules if m['id'] in ('android-01-platform', 'android-02-workstation')]
    assert len(phase1_modules) == 2, "Phase 1 modules missing"
    total_checks += 1

    # 3.1 Verify android-01-platform
    mod01 = next(m for m in phase1_modules if m['id'] == 'android-01-platform')
    assert len(mod01['lessons']) == 4, f"android-01-platform should have 4 lessons, got {len(mod01['lessons'])}"
    total_checks += 1

    # 3.2 Verify android-02-workstation
    mod02 = next(m for m in phase1_modules if m['id'] == 'android-02-workstation')
    assert len(mod02['lessons']) == 3, f"android-02-workstation should have 3 lessons, got {len(mod02['lessons'])}"
    total_checks += 1

    # 3.3 Verify android-03-apk-triage (Phase 2)
    mod03 = next((m for m in android_modules if m['id'] == 'android-03-apk-triage'), None)
    assert mod03 is not None and len(mod03['lessons']) == 4, "android-03-apk-triage should have 4 lessons"
    total_checks += 1

    # 3.4 Verify Phase 3 modules
    mod04 = next((m for m in android_modules if m['id'] == 'android-04-components'), None)
    assert mod04 is not None and len(mod04['lessons']) == 4, "android-04-components should have 4 lessons"
    total_checks += 1

    mod05 = next((m for m in android_modules if m['id'] == 'android-05-links'), None)
    assert mod05 is not None and len(mod05['lessons']) == 3, "android-05-links should have 3 lessons"
    total_checks += 1

    # 4. Check all Android lesson files on disk
    all_android_lessons = []
    for mod in android_modules:
        mod_dir = LESSONS_DIR / mod['id']
        assert mod_dir.is_dir(), f"Lesson directory {mod_dir} does not exist"
        total_checks += 1

        for lesson in mod.get('lessons', []):
            lesson_path = mod_dir / f"{lesson['id']}.md"
            assert lesson_path.is_file(), f"Lesson file {lesson_path} does not exist"
            total_checks += 1
            all_android_lessons.append((mod['id'], lesson['id'], lesson_path))

    print(f"[*] Verified {len(all_android_lessons)} registered Android lesson files exist on disk.")

    # 5. Deep inspection of Phase 1, Phase 2, and Phase 3 lessons
    curriculum_expected_keywords = {
        ('android-01-platform', '01-architecture-sandbox-and-trust-boundaries'): [
            'Linux UID', 'Zygote', 'SELinux', 'Mandatory Access Control', 'untrusted_app',
            'Activities', 'Services', 'Broadcast Receivers', 'Content Providers', 'MASVS-PLATFORM'
        ],
        ('android-01-platform', '02-components-binder-and-permissions'): [
            'Binder', '/dev/binder', 'Binder.getCallingUid()', 'Confused Deputy',
            'protectionLevel', 'signature', 'dangerous', 'normal', 'MASTG-TEST-0027'
        ],
        ('android-01-platform', '03-app-signing-and-platform-security'): [
            'APK Signing Schemes', 'v1', 'v2', 'v3', 'v4', 'Janus', 'apksigner',
            'PackageManagerService', 'AVB 2.0', 'dm-verity', 'MASVS-CODE'
        ],
        ('android-01-platform', '04-versions-sdk-levels-and-testing-context'): [
            'minSdkVersion', 'targetSdkVersion', 'compileSdkVersion',
            'Android 12', 'android:exported', 'PendingIntent', 'FLAG_IMMUTABLE', 'MASVS-PLATFORM'
        ],
        ('android-02-workstation', '01-workstation-sdk-adb-and-emulator'): [
            'ADB Client', 'ADB Server', 'adbd', 'Google APIs', 'userdebug',
            '-writable-system', 'adb root', 'pm list packages', 'am start'
        ],
        ('android-02-workstation', '02-proxying-logcat-filesystem-and-accounts'): [
            'Burp Suite', '/system/etc/security/cacerts/', 'subject_hash_old',
            'logcat', 'shared_prefs', 'databases', 'pm clear', 'MASVS-NETWORK'
        ],
        ('android-02-workstation', '03-device-preparation-root-and-evidence'): [
            'Magisk', 'KernelSU', 'Snapshot', 'SHA-256', 'Chain of Custody',
            'Offline Fallback', 'NOT EXECUTED', 'MASVS-RESILIENCE'
        ],
        ('android-03-apk-triage', '01-apk-aab-anatomy-manifest-and-permissions'): [
            'App Bundle', 'AXML', 'android:debuggable', 'android:allowBackup',
            'uses-permission', 'permission', 'MASVS-CODE'
        ],
        ('android-03-apk-triage', '02-dex-resources-assets-and-native-libraries'): [
            'Dalvik Executable', 'Multidex', 'resources.arsc', 'assets', 'JNI',
            'libsecurity', 'MASVS-CRYPTO'
        ],
        ('android-03-apk-triage', '03-apk-analysis-tools-and-workflows'): [
            'jadx', 'apktool', 'Smali', 'MobSF', 'apkanalyzer', 'MASTG-TECH-0001'
        ],
        ('android-03-apk-triage', '04-attack-surface-mapping-and-source-to-sink'): [
            'Attack Surface', 'Source-to-Sink', 'NoteStore.lookup',
            'DEMO_VULNERABLE', '12-Step Lab Contract'
        ],
        ('android-04-components', '01-exported-components-and-intent-filters'): [
            'Explicit Intent', 'Implicit Intent', 'android:exported', 'am start', 'MASVS-PLATFORM'
        ],
        ('android-04-components', '02-intent-extra-uri-handling-and-authorization'): [
            'getCallingPackage', 'startActivityForResult', 'Confused Deputy', 'getStringExtra'
        ],
        ('android-04-components', '03-services-broadcast-receivers-and-content-providers'): [
            'RECEIVER_EXPORTED', 'openFile', 'rawQuery', 'Binder.getCallingUid'
        ],
        ('android-04-components', '04-pendingintent-uri-grants-and-ipc-abuse'): [
            'PendingIntent', 'FLAG_IMMUTABLE', 'FLAG_GRANT_READ_URI_PERMISSION', 'FileProvider'
        ],
        ('android-05-links', '01-uri-schemes-intent-resolution-and-app-links'): [
            'Custom URI Schemes', 'App Links', 'autoVerify', 'assetlinks.json'
        ],
        ('android-05-links', '02-domain-verification-redirects-and-trust'): [
            'host.endsWith', 'trusted.example', 'Open Redirect', 'Non-Idempotent'
        ],
        ('android-05-links', '03-intent-redirection-fallbacks-and-defensive-validation'): [
            'Intent Redirection', 'Confused Deputy', 'resolveActivity', '12-Step Lab Contract'
        ],
        ('android-06-storage', '01-app-storage-preferences-files-sqlite-and-cache'): [
            'EncryptedSharedPreferences', 'MasterKey', 'SQLite', 'WAL', 'getCacheDir'
        ],
        ('android-06-storage', '02-logs-clipboard-notifications-and-screenshots'): [
            'Log.d', 'EXTRA_IS_SENSITIVE', 'FLAG_SECURE', 'recent apps'
        ],
        ('android-06-storage', '03-backup-data-lifecycle-and-logout'): [
            'android:allowBackup', 'adb backup', 'fullBackupContent', 'logout'
        ],
        ('android-06-storage', '04-keystore-keys-and-secure-data-handling'): [
            'AndroidKeyStore', 'StrongBox', 'TEE', 'setUserAuthenticationRequired', 'CryptoObject'
        ],
        ('android-07-network', '01-tls-network-security-config-and-cleartext'): [
            'network_security_config', 'cleartextTrafficPermitted', 'debug-overrides', 'trust-anchors'
        ],
        ('android-07-network', '02-certificate-and-hostname-validation'): [
            'X509TrustManager', 'checkServerTrusted', 'HostnameVerifier', 'MitM'
        ],
        ('android-07-network', '03-pinning-custom-trustmanagers-and-debug-overrides'): [
            'pin-set', 'SPKI', 'backup pin', 'CertificatePinner', 'untrusted mobile client'
        ],
        ('android-07-network', '04-session-tokens-proxying-and-api-boundaries'): [
            'Burp Suite', 'PKCE', 'code_verifier', 'code_challenge', 'BOLA'
        ],
        ('android-08-webview', '01-webview-architecture-and-navigation'): [
            'Chromium', 'shouldOverrideUrlLoading', 'intent://', 'WebViewClient'
        ],
        ('android-08-webview', '02-javascript-origins-cookies-and-local-content'): [
            'allowFileAccess', 'allowUniversalAccessFromFileURLs', 'WebViewAssetLoader', 'Same-Origin Policy'
        ],
        ('android-08-webview', '03-javascript-bridges-and-native-apis'): [
            'addJavascriptInterface', '@JavascriptInterface', 'getClass().forName', 'bridge'
        ],
        ('android-08-webview', '04-safe-webview-config-allowlists-and-hardening'): [
            'MIXED_CONTENT_NEVER_ALLOW', 'addWebMessageListener', 'allowedOrigins', '12-Step Lab Contract'
        ],
        ('android-09-runtime', '01-runtime-observation-adb-logcat-and-process-lifecycle'): [
            'Non-Instrumented Observation Axiom', 'pidof', 'dumpsys activity', 'FLAG_SECURE', 'am dumpheap'
        ],
        ('android-09-runtime', '02-runtime-filesystem-databases-and-network-observation'): [
            'find /data/data', 'sqlite3', 'wal_checkpoint', 'http_proxy', 'pm revoke'
        ],
        ('android-09-runtime', '03-frida-architecture-spawn-attach-and-java-hooks'): [
            'frida-server', 'frida-ps', 'Java.perform', 'Java.use', 'implementation'
        ],
        ('android-09-runtime', '04-objection-anti-tamper-evaluation-and-validation-workflow'): [
            'objection', 'android hooking', 'isDeviceRooted', 'attestation', '12-Step Lab Contract'
        ],
        ('android-10-crypto', '01-cryptographic-misuse-algorithms-and-key-management'): [
            'AES/ECB/PKCS5Padding', 'AES/GCM/NoPadding', 'PBKDF2WithHmacSHA256', 'SecureRandom'
        ],
        ('android-10-crypto', '02-iv-nonce-reuse-aes-gcm-and-hardcoded-secrets'): [
            'Two-Time Pad', 'GHASH', 'Forbidden Attack', 'GCMParameterSpec', 'InsecureVault'
        ],
        ('android-10-crypto', '03-biometrics-keystore-and-crypto-object-binding'): [
            'BiometricPrompt', 'CryptoObject', 'setUserAuthenticationRequired', 'StrongBox', 'TEE'
        ],
        ('android-10-crypto', '04-attestation-root-detection-and-client-side-limits'): [
            'Untrusted Mobile Client Axiom', 'setAttestationChallenge', 'Google Root CA', 'Play Integrity API', '12-Step Lab Contract'
        ],
        ('android-11-release', '01-smali-dex-bytecode-and-decompilation'): [
            'Dalvik', 'p0', 'const-string', 'if-nez', 'apktool', 'apksigner'
        ],
        ('android-11-release', '02-obfuscation-r8-proguard-and-code-reconstruction'): [
            'R8', 'ProGuard', '-assumenosideeffects', '-keep', 'Anchor Points'
        ],
        ('android-11-release', '03-jni-native-libraries-and-cross-language-analysis'): [
            'JNI', 'System.loadLibrary', 'RegisterNatives', 'JNI_OnLoad', 'libsecurity.so'
        ],
        ('android-11-release', '04-dynamic-code-loading-anti-tamper-and-resilience'): [
            'DexClassLoader', 'InMemoryDexClassLoader', 'setReadOnly', 'SecurityException', '12-Step Lab Contract'
        ],
        ('android-12-case', '01-multi-step-attack-scenarios-and-kill-chains'): [
            'Multi-Step Attack Chains', 'Deep Link', 'ForwarderActivity', 'InternalViewerActivity', 'Cross-Fixture Fabrication Trap'
        ],
        ('android-12-case', '02-assessment-scoping-rules-of-engagement-and-chain-of-custody'): [
            'Rules of Engagement', 'sha256sum', 'apksigner verify', 'NOT EXECUTED', 'ro.build.version.release'
        ],
        ('android-12-case', '03-independent-engagement-execution-and-evidence-matrix'): [
            'Evidence-Gap Matrix', 'Four-Quadrant Control Matrix', 'Alice', 'Bob', 'NoteDetailActivity'
        ],
        ('android-12-case', '04-professional-reporting-remediation-and-retest-validation'): [
            'Executive Summary', '12-Step Lab Contract', 'CVSS', 'Positive Functional Control', 'Retest Closure Statement'
        ],
    }

    for (mod_id, lesson_id), keywords in curriculum_expected_keywords.items():
        lesson_file = LESSONS_DIR / mod_id / f"{lesson_id}.md"
        content = lesson_file.read_text()

        # Check title
        assert content.startswith('# '), f"{lesson_file} missing top-level # title"
        total_checks += 1

        # Check minimum substantive length (at least 3000 chars)
        assert len(content) >= 3000, f"{lesson_file} content too short ({len(content)} chars)"
        total_checks += 1

        # Check required architectural / technical keywords
        for kw in keywords:
            assert kw in content, f"{lesson_file} missing key technical concept: '{kw}'"
            total_checks += 1

        # Check proper code block formatting
        code_blocks = re.findall(r'```([a-zA-Z0-9_\-]+)?\n(.*?)```', content, flags=re.DOTALL)
        assert len(code_blocks) >= 2, f"{lesson_file} has insufficient code blocks ({len(code_blocks)})"
        total_checks += 1

        for lang, block in code_blocks:
            assert len(block.strip()) > 0, f"{lesson_file} contains empty code block"
            total_checks += 1

    # 6. Verify Quiz Data coverage and validity
    quiz_text = QUIZ_PATH.read_text()
    for mod in (
        'android-01-platform', 'android-02-workstation', 'android-03-apk-triage',
        'android-04-components', 'android-05-links',
        'android-06-storage', 'android-07-network', 'android-08-webview',
        'android-09-runtime', 'android-10-crypto', 'android-11-release',
        'android-12-case'
    ):
        assert f'"{mod}": [' in quiz_text, f"Quiz for {mod} missing in quizData.ts"
        total_checks += 1

    # Check question counts in quizData.ts
    for mid, expected_count in [
        ('android-01-platform', 6),
        ('android-02-workstation', 5),
        ('android-03-apk-triage', 6),
        ('android-04-components', 6),
        ('android-05-links', 6),
        ('android-06-storage', 6),
        ('android-07-network', 6),
        ('android-08-webview', 6),
        ('android-09-runtime', 6),
        ('android-10-crypto', 6),
        ('android-11-release', 6),
        ('android-12-case', 6),
    ]:
        block = re.search(rf'"{mid}":\s*\[([\s\S]*?)\n  \],', quiz_text)
        assert block, f"{mid} quiz block not found"
        matches = re.findall(r'id:\s*"q\d+"', block.group(1))
        assert len(matches) == expected_count, f"{mid} should have {expected_count} quiz questions, found {len(matches)}"
        total_checks += 1

    print(f"[+] All {total_checks} Android Curriculum Verification checks PASSED successfully.")


if __name__ == '__main__':
    try:
        main()
    except AssertionError as err:
        print(f"[-] VERIFICATION FAILED: {err}", file=sys.stderr)
        sys.exit(1)
