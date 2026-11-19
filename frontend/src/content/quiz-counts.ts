/** Public question counts only; prompts, choices, keys, and explanations stay out of the app bundle. */
export const QUIZ_COUNTS = {
  '01-intro-wireless': 5,
  '02-wifi-fundamentals': 5,
  '03-80211-architecture': 5,
  '04-kali-wireless-setup': 5,
  '05-wireless-recon': 5,
  '06-traffic-analysis': 5,
  '07-wep-legacy': 5,
  '08-wpa-wpa2': 5,
  '10-wps': 5,
  '11-wpa3': 5,
  '12-deauth-disassoc': 5,
  '14-captive-portals': 5,
  '15-enterprise-fundamentals': 5,
  '18-corporate-attacks': 5,
  '20-final-assessment': 5,
  'android-01-platform': 6,
  'android-02-workstation': 5,
  'android-03-apk-triage': 6,
  'android-04-components': 6,
  'android-05-links': 6,
  'android-06-storage': 6,
  'android-07-network': 6,
  'android-08-webview': 6,
  'android-09-runtime': 6,
  'android-10-crypto': 6,
  'android-11-release': 6,
  'android-12-case': 6,
} as const

export const TOTAL_QUIZZES = Object.keys(QUIZ_COUNTS).length
export const TOTAL_QUIZ_QUESTIONS = Object.values(QUIZ_COUNTS).reduce((sum, count) => sum + count, 0)
