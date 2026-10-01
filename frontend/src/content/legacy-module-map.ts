/** Retired module and lesson IDs. Keep this mapping for saved local activity and old deep links.
 * Account-backed rows remain server-held under their original IDs; never claim this map
 * upgrades them to verified credit or mutates backend records.
 */
export const LEGACY_MODULE_MAP: Record<string, string> = {
  '09-wpa2-practical': '08-wpa-wpa2',
  '13-rogue-ap': '12-deauth-disassoc',
  '16-eap': '15-enterprise-fundamentals',
  '17-radius': '15-enterprise-fundamentals',
  '19-methodology': '20-final-assessment',
}

export const currentModuleId = (id: string): string => LEGACY_MODULE_MAP[id] ?? id

/** Retired lesson IDs redirected for deep links while keeping historical records separate. */
export const LEGACY_LESSON_MAP: Record<string, string> = {
  // Wireless retired lessons
  '02-evidence-severity-reporting': '04-findings-non-findings-and-review',
  '01-final-engagement': '02-independent-capture-case',
  // Android Phase 1 upgraded lessons
  '01-sandbox-and-components': '01-architecture-sandbox-and-trust-boundaries',
  '02-intents-and-versions': '02-components-binder-and-permissions',
  '01-setup-and-scope': '01-workstation-sdk-adb-and-emulator',
  '02-evidence-and-fallback': '03-device-preparation-root-and-evidence',
  // Android Phase 2 upgraded lessons
  '01-apk-anatomy': '01-apk-aab-anatomy-manifest-and-permissions',
  '02-source-to-sink': '04-attack-surface-mapping-and-source-to-sink',
  '03-compare-owned-demo-source': '04-attack-surface-mapping-and-source-to-sink',
  // Android Phase 3 upgraded lessons (module-scoped)
  'android-04-components:01-mechanism-and-worked-trace': '01-exported-components-and-intent-filters',
  'android-04-components:02-independent-decision': '02-intent-extra-uri-handling-and-authorization',
  'android-05-links:01-mechanism-and-worked-trace': '01-uri-schemes-intent-resolution-and-app-links',
  'android-05-links:02-independent-decision': '02-domain-verification-redirects-and-trust',
  // Android Phase 4 upgraded lessons (module-scoped)
  'android-06-storage:01-mechanism-and-worked-trace': '01-app-storage-preferences-files-sqlite-and-cache',
  'android-06-storage:02-independent-decision': '02-logs-clipboard-notifications-and-screenshots',
  'android-07-network:01-mechanism-and-worked-trace': '01-tls-network-security-config-and-cleartext',
  'android-07-network:02-independent-decision': '02-certificate-and-hostname-validation',
  'android-08-webview:01-mechanism-and-worked-trace': '01-webview-architecture-and-navigation',
  'android-08-webview:02-independent-decision': '02-javascript-origins-cookies-and-local-content',
  // Android Phase 5 upgraded lessons (module-scoped)
  'android-09-runtime:01-mechanism-and-worked-trace': '01-runtime-observation-adb-logcat-and-process-lifecycle',
  'android-09-runtime:02-independent-decision': '02-runtime-filesystem-databases-and-network-observation',
  // Android Phase 6 upgraded lessons (module-scoped)
  'android-10-crypto:01-mechanism-and-worked-trace': '01-cryptographic-misuse-algorithms-and-key-management',
  'android-10-crypto:02-independent-decision': '02-iv-nonce-reuse-aes-gcm-and-hardcoded-secrets',
  'android-11-release:01-mechanism-and-worked-trace': '01-smali-dex-bytecode-and-decompilation',
  'android-11-release:02-independent-decision': '02-obfuscation-r8-proguard-and-code-reconstruction',
  // Android Phase 7 & 8 upgraded lessons (module-scoped)
  'android-12-case:01-mechanism-and-worked-trace': '01-multi-step-attack-scenarios-and-kill-chains',
  'android-12-case:02-independent-decision': '02-assessment-scoping-rules-of-engagement-and-chain-of-custody',
}

export const currentLessonId = (id: string, moduleId?: string): string => {
  if (moduleId && LEGACY_LESSON_MAP[`${moduleId}:${id}`]) {
    return LEGACY_LESSON_MAP[`${moduleId}:${id}`]
  }
  return LEGACY_LESSON_MAP[id] ?? id
}
