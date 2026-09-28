# Channels, Bands, Bandwidth — 2.4/5/6 GHz Deep Dive

## Learning Objectives
- Master 2.4 GHz channels 1-14, non-overlapping 1/6/11, 40 MHz bad practice
- Master 5 GHz UNII-1/2/2e/3, 20/40/80/160 MHz, DFS radar, power limits
- Master 6 GHz U-NII-5-8, 20/40/80/160/320 MHz, WPA3-only, AFC
- Understand channel width, interference, regulatory domain, evidence
- Learn channel enumeration via beacons and tools

## Theory

### 2.4 GHz — Crowded but Long Range

**Frequency:** 2.400-2.4835 GHz, 83.5 MHz total, ISM band (Industrial, Scientific, Medical)

**Channels (20 MHz each):**
- Ch1 2412 MHz, Ch2 2417, Ch3 2422, Ch4 2427, Ch5 2432, Ch6 2437, Ch7 2442, Ch8 2447, Ch9 2452, Ch10 2457, Ch11 2462, Ch12 2467, Ch13 2472, Ch14 2484 (Japan only, 802.11b only, 11 MHz width)

**Overlapping:** 20 MHz channel overlaps ±2 channels (22 MHz mask) — Ch1 overlaps Ch2-5, Ch6 overlaps Ch2-10, Ch11 overlaps Ch7-13. Only 1,6,11 non-overlapping in US (FCC Ch1-11). In EU/ETSI Ch1-13, 1,5,9,13 non-overlapping with 20 MHz (or 1,6,11 still common).

**Why 1,6,11:**
```
Ch1: 2401-2423 MHz (center 2412)
Ch6: 2426-2448 MHz (center 2437) — 25 MHz from Ch1, non-overlapping
Ch11: 2451-2473 MHz (center 2462) — 25 MHz from Ch6, non-overlapping

Ch1 and Ch6 and Ch11 don't overlap with 20 MHz — good for 3 APs in same area different channels
```

**40 MHz in 2.4 GHz — Bad Practice:**
- Bonds 2× 20 MHz — e.g., Ch6 HT40+ uses Ch6 primary + Ch10 secondary (extension above), Ch6 HT40- uses Ch6 primary + Ch2 secondary (below)
- Doubles rate (150 Mbps → 300 Mbps 2 streams), but causes overlap — Ch6 HT40+ uses Ch6 (2426-2448) + Ch10 (2451-2473) = 2426-2473 MHz, overlaps Ch1 (2401-2423) partially and Ch11 (2451-2473) fully — causes interference, especially in dense environments (office, apartment)
- **For PT:** If beacon shows HT 40 MHz in 2.4 GHz, Medium finding bad practice, interference, should be 20 MHz only. Config `ht_capab=[HT40+][HT40-]` in 2.4 GHz is misconfig. Evidence: Beacon HT capabilities IE, channel, `ht_capab` from hostapd.conf. Recommendation: `ht_capab=[HT20]` for 2.4 GHz, use 5/6 GHz for 40/80/160 MHz.

**Propagation:** Good through walls (12.5 cm wavelength), longer range (~50m indoor, 100m outdoor 2 dBi rubber duck, 200m with 9 dBi panel), but more interference — microwave ovens 2.4 GHz, Bluetooth FHSS 2.4 GHz, Zigbee 2.4 GHz, all share ISM, crowded.

**Power:** Typically 20 dBm (100 mW) EIRP max in US, 20 dBm in EU, varies by regdom, `iw reg get` shows.

**Data Rates:** 802.11b 1/2/5.5/11 Mbps DSSS, 802.11g 6-54 Mbps OFDM, 802.11n up to 150 Mbps 20 MHz 1 stream, 300 Mbps 40 MHz 2 streams, 600 Mbps 40 MHz 4 streams.

**For PT:** 2.4 GHz is crowded, interference, but long range — attacker in parking lot can see 2.4 GHz from far. 40 MHz bad practice. Evidence: Channel, band, width, HT capabilities.

### 5 GHz — More Channels, Less Interference, Shorter Range

**Frequency:** 5.150-5.825 GHz, 675 MHz total, UNII (Unlicensed National Information Infrastructure) bands:

- **UNII-1:** 36-48, 5170-5250 MHz, 200 mW, indoor, no DFS, Ch36 5180, Ch40 5200, Ch44 5220, Ch48 5240
- **UNII-2:** 52-64, 5250-5330 MHz, 200 mW, DFS, radar, Ch52 5260, Ch56 5280, Ch60 5300, Ch64 5320 — DFS, AP must vacate if radar detected
- **UNII-2e:** 100-144, 5490-5730 MHz, 200 mW, DFS, radar, Ch100 5500, Ch104 5520, ..., Ch140 5700, Ch144 5720 — DFS
- **UNII-3:** 149-165, 5735-5835 MHz, 1W (30 dBm) in US, 25 mW in EU, outdoor, no DFS (US), Ch149 5745, Ch153 5765, Ch157 5785, Ch161 5805, Ch165 5825

**Channels:** 25× 20 MHz, 12× 40 MHz, 6× 80 MHz, 2× 160 MHz in US (with DFS, more)

**DFS:** Dynamic Frequency Selection — AP must detect radar in UNII-2/2e and vacate channel within 10 seconds (Channel Availability Check 60 seconds, In-Service Monitoring), switch to another channel. If AP on DFS channel and radar detected, clients disconnect, AP switches channel, may cause disruption. For PT: Recon should monitor multiple channels, AP may change channel if radar, need to scan all channels, not just fixed.

**Propagation:** Less through walls than 2.4 GHz (6 cm wavelength), shorter range (~25m indoor, 50m outdoor 2 dBi, 100m with 9 dBi), less interference (less devices in 5 GHz, but still some), higher rates, more channels, less overlapping.

**Power:** Up to 30 dBm (1W) in UNII-3 US, 23 dBm (200 mW) in UNII-1/2/2e, varies by regdom and band, `iw reg get` shows.

**Data Rates:** 802.11a 6-54 Mbps OFDM, 802.11n up to 600 Mbps 40 MHz 4 streams, 802.11ac up to 6.9 Gbps 160 MHz 8 streams 256-QAM MU-MIMO, 802.11ax up to 9.6 Gbps 160 MHz 8 streams 1024-QAM OFDMA.

**For PT:** 5 GHz has more channels, less interference, but shorter range — attacker needs closer or higher gain antenna. DFS may cause channel switch — recon should monitor. Evidence: Channel, band, width, VHT/HE capabilities, DFS.

### 6 GHz — Cleanest, Shortest Range, WPA3-Only

**Frequency:** 5.925-7.125 GHz, 1200 MHz total, U-NII bands (Wi-Fi 6E/7):

- **U-NII-5:** 1-93, 5925-6425 MHz, 59× 20 MHz, low power indoor 24 dBm (250 mW), standard power 36 dBm (4W) with AFC (Automated Frequency Coordination)
- **U-NII-6:** 95-111, 6425-6525 MHz, 8× 20 MHz, low power indoor only 24 dBm
- **U-NII-7:** 113-173, 6525-6875 MHz, 30× 20 MHz, low power indoor 24 dBm, standard power 36 dBm with AFC
- **U-NII-8:** 175-233, 6875-7125 MHz, 29× 20 MHz, low power indoor 24 dBm, standard power 36 dBm with AFC

**Channels:** 59× 20 MHz, 29× 40 MHz, 14× 80 MHz, 7× 160 MHz, 3× 320 MHz (Wi-Fi 7)

**Only WPA3:** 6 GHz only allows WPA3 — no WPA2, no WEP, no TKIP, open must be OWE (Opportunistic Wireless Encryption, enhanced open) or WPA3 — security benefit: WPA3-only mandates PMF required, no transition downgrade risk if pure 6 GHz (no WPA2). If you see WPA2 on 6 GHz, High finding non-compliant, should be WPA3-only.

**AFC:** Automated Frequency Coordination — database for incumbent users (fixed satellite, etc.) — standard power AP must query AFC database, if no incumbent, allows 36 dBm, else lower or not allowed. Low power indoor (LPI) 24 dBm no AFC needed.

**Propagation:** Even less through walls than 5 GHz (5 cm wavelength), shortest range (~15m indoor, 30m outdoor 2 dBi, 50m with 9 dBi), cleanest spectrum (new band, less interference, less devices), highest rates, 6 GHz has less congestion, good for high density.

**Power:** Low power indoor 24 dBm (250 mW) no AFC, standard power 36 dBm (4W) with AFC.

**Data Rates:** 802.11ax up to 9.6 Gbps 160 MHz, 802.11be up to 46 Gbps 320 MHz MLO 4096-QAM.

**For PT:** 6 GHz only WPA3 — good for security, but transition mode with 2.4/5 GHz may have downgrade risk if same password and PMF optional. Evidence: Beacon band 6 GHz, channel, security WPA3-only, PMF required, OWE for open.

### Channel Width — 20/40/80/160/320 MHz

**20 MHz:** Baseline, 1× 20 MHz, good for 2.4 GHz, always supported, least interference, lowest rate

**40 MHz:** 2× 20 MHz bonded, doubles rate, but 2.4 GHz 40 MHz bad practice (overlaps), 5/6 GHz good — e.g., Ch36 HT40+ uses Ch36+Ch40 = 40 MHz

**80 MHz:** 4× 20 MHz, 5/6 GHz only, good, 802.11ac/ax — e.g., Ch36 80 MHz uses Ch36-48 = 80 MHz

**160 MHz:** 8× 20 MHz, 5/6 GHz, very high rate, but less practical due to interference, DFS, need 8 contiguous channels — e.g., Ch36 160 MHz uses Ch36-64 = 160 MHz (needs UNII-1 + UNII-2 contiguous, DFS)

**320 MHz:** 16× 20 MHz, 6 GHz only, Wi-Fi 7, highest rate, needs 16 contiguous channels, very high rate but rare — e.g., Ch1 320 MHz uses Ch1-31 = 320 MHz (U-NII-5)

**For PT:** Channel width from beacon HT/VHT/HE operation IE — `wlan_mgt.ht.operation`, `wlan_mgt.vht.operation`, `wlan_mgt.he.operation`. If 2.4 GHz AP shows 40 MHz, Medium finding bad practice. Evidence: Beacon HT operation, channel width, config `ht_capab`.

### Regulatory Domain

**Regdom:** Country code determines allowed channels, power, DFS, 6 GHz

- `iw reg get` shows regdom — e.g., `country US: DFS-FCC, (2402-2472 @ 40), (5170-5250 @ 80), (5250-5330 @ 80), (5490-5730 @ 160), (5735-5835 @ 80), (5925-6425 @ 160), (6425-6525 @ 20), (6525-6875 @ 160), (6875-7125 @ 160)`
- `iw reg set US` sets US, `iw reg set DE` sets Germany (EU), `iw reg set BO` sets Bolivia (allows all channels, for scanning all, but respect local regulations)
- **For PT:** Set regdom to US or BO for scanning all channels, but respect local regulations — don't use high power illegally. Evidence: Regdom from `iw reg get`.

**Examples:**
- US FCC: 2.4 GHz Ch1-11, 5 GHz Ch36-165 (with DFS), 6 GHz Ch1-233 with AFC, power 20 dBm 2.4, 23-30 dBm 5, 24/36 dBm 6
- EU ETSI: 2.4 GHz Ch1-13, 5 GHz Ch36-140 (with DFS), 6 GHz Ch1-233 low power indoor only 23 dBm, power 20 dBm 2.4, 23 dBm 5, 23 dBm 6 LPI
- JP: 2.4 GHz Ch1-14 (Ch14 11b only), 5 GHz Ch36-140, etc.

### Interference & Coexistence

**2.4 GHz interference:**
- Microwave ovens 2.4 GHz, Bluetooth FHSS 2.4 GHz, Zigbee 2.4 GHz, cordless phones, etc. — crowded, interference
- 40 MHz in 2.4 GHz causes overlap, interference, bad practice — Medium finding

**5 GHz interference:**
- Less interference than 2.4 GHz, but still radar in DFS, neighboring APs, etc.

**6 GHz interference:**
- Cleanest, new band, less devices, less interference, good for high density, but shortest range

**Coexistence:**
- 802.11n/ac/ax/be have coexistence mechanisms — 20/40 MHz coexistence, OBSS, BSS coloring (802.11ax) — BSS coloring 6-bit color to reduce interference from overlapping BSS

**For PT:** Interference not directly exploitable, but bad practice — 2.4 GHz 40 MHz Medium, 6 GHz clean but short range.

## VAPT Relevance

- **Recon:** Scan all bands — 2.4 GHz Ch1-13, 5 GHz 36-165, 6 GHz 1-233 — `iw dev wlan0 scan` or Kismet or airodump-ng with channel hopping, or PcapInspector filter `wlan_mgt.ds.current_channel`
- **Enum:** Beacon shows channel, band, width, PHY capabilities (HT 20/40, VHT 80/160, HE 20/40/80/160), but security is RSN IE, WPS IE, PMF
- **Evidence:** Channel, band, width, PHY capabilities, MCS, spatial streams, vendor, signal, beacon interval, regdom, frame numbers, filters
- **Misconfig:** 40 MHz in 2.4 GHz Medium bad practice, 6 GHz with WPA2 High non-compliant, DFS without proper handling Low, same SSID on 2.4 and 5 with different security High

## Tools

- `iw reg get` regdom, `iw dev wlan0 info` channel, width, `iwlist wlan0 channel` supported channels, Wireshark filter `wlan_mgt.ds.current_channel` channel, `wlan_mgt.ht.capabilities` HT, `wlan_mgt.vht.capabilities` VHT, `wlan_mgt.he.capabilities` HE, `wlan_mgt.he.operation` HE operation, PcapInspector summary channels, beacons

## Evidence Collection

- Beacon: Channel, band, width, PHY capabilities (HT 20/40, VHT 80/160, HE 20/40/80/160), MCS, spatial streams, vendor, signal, beacon interval, regdom
- Example: `Beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 2.4 GHz 20 MHz HT 20 MHz only MCS 0-7 1 stream WPA2-PSK CCMP -45 dBm`

## Attack → Defense → Retest

- **Attack:** Observe 2.4 GHz AP with HT 40 MHz enabled, causes overlap with Ch1 and Ch11, interference, bad practice
- **Defense:** Use 20 MHz only in 2.4 GHz — `ht_capab=[HT20]`, use 5/6 GHz for 40/80/160 MHz, check regdom, use DFS properly, use 6 GHz for clean spectrum
- **Retest:** New beacon, verify HT capabilities show 20 MHz only, no 40 MHz, `wlan_mgt.ht.capabilities` shows 20 MHz, interference reduced

## Interactive Check

> AP on Ch6 2.4 GHz with HT40+ (Ch6+Ch10) and AP on Ch11 2.4 GHz with HT20. What is issue?

Answer: Ch6 HT40+ uses Ch6 (2426-2448) + Ch10 (2451-2473) = 2426-2473 MHz, overlaps Ch11 (2451-2473) fully — interference, bad practice, Medium finding. Ch11 HT20 uses Ch11 (2451-2473) 20 MHz, overlaps with Ch6 HT40+ secondary Ch10. Should use 20 MHz only in 2.4 GHz — Ch1,6,11 non-overlapping with 20 MHz. Defense: `ht_capab=[HT20]` for 2.4 GHz, use 5/6 GHz for 40/80/160 MHz. Evidence: Beacon HT operation primary channel 6 secondary offset above, channel width 40 MHz, config `ht_capab=[HT40+]`.

## References

- IEEE 802.11-2020 — Channels, bands, HT/VHT/HE/EHT
- FCC/ETSI regulatory — channels, power, DFS, 6 GHz AFC
- Wireshark 802.11 — DS Parameter Set, HT/VHT/HE IEs

---

*Next: WLAN Architecture — Infrastructure, Ad-hoc, Mesh, DS, Portal, CAPWAP, Controller*
