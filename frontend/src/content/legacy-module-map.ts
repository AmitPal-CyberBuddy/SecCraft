/** Retired wireless module IDs. Keep this mapping for saved local activity and old deep links.
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
