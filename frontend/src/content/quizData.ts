// Module knowledge checks. Each bank is authored content; presentation shuffles option order.
export const quizData: Record<string, any[]> = {
  "01-intro-wireless": [
    { id: "q1", question: "A capture is requested for a named SSID, but the RoE never authorizes collecting client traffic. What comes first?", options: ["Capture beacons and assume consent", "Confirm collection authority, boundaries and handling with the accountable signatory", "Capture everything and redact later", "Send a deauth to shorten the capture"], correct: 1, explanation: "Passive collection can include personal data and out-of-scope devices; stop and clarify authorization and retention before recording." },
    { id: "q2", question: "A beacon advertises CCMP. Which claim is supported without client-side evidence?", options: ["Every station used encryption", "The AP advertises CCMP; negotiated use and forwarding need other evidence", "The guest VLAN is isolated", "The passphrase cannot be guessed"], correct: 1, explanation: "An advertisement is a policy clue, not proof of each association or network control." },
    { id: "q3", question: "A monitor capture has no frames for a named client. What is the safest conclusion?", options: ["The client never joined", "The client is secure", "It was not observed under these channel, time and receiver conditions", "The SSID is hidden"], correct: 2, explanation: "Channel selection, range, interference and capture window constrain negative observations." },
    { id: "q4", question: "An assessment finds a vulnerable AP but no client profiles were reviewed. What scope limitation belongs in the report?", options: ["No limitation", "Client behavior and enterprise certificate validation were not tested", "All client devices are exploitable", "RADIUS must be weak"], correct: 1, explanation: "AP, clients, authentication infrastructure and RF availability are distinct surfaces; report what was tested." },
    { id: "q5", question: "An engineer asks you to disrupt nearby stations to capture handshakes outside the approved window. What do you do?", options: ["Proceed if the target SSID matches", "Proceed with low transmit power", "Wait for explicit technique, client and time authorization; otherwise use existing captures", "Change the regulatory domain"], correct: 2, explanation: "Disruptive transmission needs explicit scoped authorization and a stop condition, not merely technical feasibility." },
  ],
  "02-wifi-fundamentals": [
    { id: "q1", question: "What does a BSSID identify?", options: ["A basic service set (often one AP interface, not necessarily one physical AP)", "Wireless network name only", "A VLAN", "Encryption algorithm"], correct: 0, explanation: "A BSSID identifies a particular BSS and is commonly an AP interface MAC; one physical AP can advertise multiple BSSIDs, and an ESS can span multiple APs." },
    { id: "q2", question: "For 20 MHz Wi-Fi in the US 2.4 GHz band, which is the common non-overlapping channel set?", options: ["1, 5 and 9", "2, 7 and 12", "1, 6 and 11", "Every channel is non-overlapping"], correct: 2, explanation: "Channels 1, 6 and 11 are the common 20 MHz plan; regulatory domains and channel widths differ, and real RF interference is environment-dependent." },
    { id: "q3", question: "Why might 40 MHz operation be a poor choice in a crowded 2.4 GHz deployment?", options: ["It is required for WPA3", "It may increase channel overlap/contention; assess the local RF and regulatory plan", "It disables encryption", "It is only allowed on 6 GHz"], correct: 1, explanation: "Wider channels can consume more spectrum and increase contention in crowded 2.4 GHz environments; measure and plan rather than assuming a universal severity." },
    { id: "q4", question: "A beacon has SSID IE length zero and an RSNE. Which inventory entry is defensible?", options: ["Hidden BSS with advertised RSN policy; identity may emerge in later client exchanges", "The SSID is securely encrypted", "It must be WEP", "No BSSID exists"], correct: 0, explanation: "A zero-length SSID hides the name in that beacon, not the BSSID or RSN policy; inspect later probes/associations." },
    { id: "q5", question: "Probe request can leak:", options: ["Preferred networks (PNL)", "AP password", "RADIUS secret", "Nothing"], correct: 0, explanation: "Directed probe requests can reveal some remembered SSIDs; clients may suppress them or use wildcard probes, and MAC randomization can limit attribution." },
  ],
  "03-80211-architecture": [
    { id: "q1", question: "A WPA2-Enterprise station has associated but EAP has not succeeded. Which 802.11 MAC state is it in?", options: ["State 1", "State 2", "State 3, although the controlled port is not yet authorized", "State 4"], correct: 2, explanation: "802.11 has three classic authentication/association states. 802.1X/EAP runs after association; key setup does not create State 4." },
    { id: "q2", question: "A beacon offers PSK and SAE with MFPC but not MFPR. What can you infer about one client's protection?", options: ["Every client negotiated SAE", "PMF is advertised as optional; inspect that client's association and logs", "PMF is required", "The beacon proves deauth acceptance"], correct: 1, explanation: "Advertised policy does not establish a particular station's negotiated AKM or PMF state." },
    { id: "q3", question: "A probe request advertises an SSID. Which conclusion is bounded by the evidence?", options: ["The client trusted and joined the AP", "The AP authenticated the client", "The address probed for that name; association and identity remain unproven", "A four-way handshake completed"], correct: 2, explanation: "A probe expresses interest but is not authentication, association or a stable device identifier." },
    { id: "q4", question: "Which order is consistent with an 802.1X WLAN?", options: ["EAP then association then open-system authentication", "802.11 authentication, association, EAP, successful EAP then four-way key handshake", "Four-way key handshake before EAP and association", "Probe directly authorizes the controlled port"], correct: 1, explanation: "MAC-layer authentication and association precede 802.1X/EAP; keys follow successful EAP." },
    { id: "q5", question: "A capture has a valid M1/M2 pair but no M3/M4. What does it permit?", options: ["Proof of a completed association", "Offline candidate verification for a PSK, but no proof the full handshake completed", "Proof of VLAN reachability", "No inference at all"], correct: 1, explanation: "The M2 MIC can check a candidate PMK when inputs match; completion and receiver acceptance require other evidence." },
  ],
  "04-kali-wireless-setup": [
    { id: "q1", question: "A USB adapter reports monitor mode but no injection capability test has run. What can you claim?", options: ["Injection works", "It can capture under supported conditions; injection remains unverified", "A client associated", "All channels are legal"], correct: 1, explanation: "Driver-reported modes and actual injection behavior are separate; test only on an owned, scoped AP." },
    { id: "q2", question: "You have only deauth.pcapng and no receiver log. Which task can you complete?", options: ["Prove client disconnection", "Decode reason codes and frame timing; mark impact unproven", "Prove RF delivery", "Determine legal transmit power"], correct: 1, explanation: "Stored synthetic frames can be dissected; delivery and effect require independent real-client evidence." },
    { id: "q3", question: "A requested channel is blocked by your regulatory domain. What is the right next step?", options: ["Set another country's domain", "Increase power and retry", "Do not transmit; check authorized local channel plan and hardware", "Skip authorization"], correct: 2, explanation: "Regulatory limits are constraints, not troubleshooting obstacles to bypass." },
    { id: "q4", question: "Which tool choice best answers 'what AKM and PMF does this stored beacon advertise'?", options: ["A targeted Wireshark/tshark decode", "An RF injection test", "A RADIUS password guess", "A rogue AP"], correct: 0, explanation: "Prefer offline frame decoding for an advertisement claim; intrusive methods are unnecessary." },
    { id: "q5", question: "A monitor adapter leaves your assessment laptop without connectivity. What is a safe plan?", options: ["Use another managed interface for ordinary connectivity and keep the test adapter isolated", "Set the monitor adapter to a foreign region", "Assume injection also works", "Send deauth to restart networking"], correct: 0, explanation: "Separate managed connectivity from monitor tasks; document hardware limitations instead of fabricating results." },
  ],
  "05-wireless-recon": [
    { id: "q1", question: "In the bundled recon-lab capture, the hidden BSS beacon uses SSID IE length:", options: ["32", "6", "0", "11"], correct: 2, explanation: "This fixture uses a zero-length SSID IE; implementations may also use a zero-filled IE. Hidden SSIDs are not an authentication control." },
    { id: "q2", question: "In a capture, where can a hidden SSID appear in the clear?", options: ["Deauth AP", "Probe response or assoc request contains SSID", "Brute force", "Cannot be revealed"], correct: 1, explanation: "Probe responses and association requests can reveal the SSID in some client/AP exchanges; this is not guaranteed in every capture." },
    { id: "q3", question: "A locally administered address probes for Corp-WLAN twice. How many physical devices does that establish?", options: ["Exactly one", "Exactly two", "No device exists", "At least one observed address; physical device count and randomisation are unconfirmed"], correct: 3, explanation: "Addresses are observations, not device identities; local administration and repeated probes alone do not establish a randomisation policy or physical count." },
    { id: "q4", question: "A globally administered MAC OUI can indicate:", options: ["An assigned vendor prefix (not reliable for locally administered/randomized MACs)", "Channel", "Security", "Signal strength"], correct: 0, explanation: "The first 24 bits usually identify an assigned vendor prefix; locally administered/randomized addresses do not reliably identify hardware vendor." },
    { id: "q5", question: "Two BSSIDs advertise the same SSID. What can you conclude from that alone?", options: ["They are in the same ESS", "One must be a rogue AP", "They may be related or a look-alike; SSID alone does not establish ESS membership", "They use the same security settings"], correct: 2, explanation: "A shared SSID is not proof of common administration or ESS membership. Compare authorized BSSID inventory, security/profile details and deployment context." },
  ],
  "06-traffic-analysis": [
    { id: "q1", question: "Wireshark filter for beacons:", options: ["wlan.fc.type==0", "wlan.fc.type_subtype==8", "eapol", "wlan.ssid==\"\""], correct: 1, explanation: "Type_subtype 8 = beacon." },
    { id: "q2", question: "The four WPA-Personal key-exchange messages are carried in:", options: ["Beacons", "Probe requests", "Deauthentication frames", "EAPOL-Key frames"], correct: 3, explanation: "The four-way pairwise-key handshake uses EAPOL-Key messages; EAPOL also carries other packet types, so not every EAPOL frame is one of M1–M4." },
    { id: "q3", question: "Which sequence is a common example of discovery through WPA-Personal key setup? (Scanning order can vary.)", options: ["Beacon/probe discovery → authentication → association → EAPOL-Key handshake", "EAPOL-Key → beacon → probe", "Association → beacon → authentication", "Probe → EAPOL-Key → beacon"], correct: 0, explanation: "Discovery may use passive beacons, active probes, or both in varying order. Open-system authentication and association precede the WPA-Personal EAPOL-Key handshake." },
    { id: "q4", question: "The fixture advertises CCMP, but the data frames after its handshake have Protected=0. What do you report?", options: ["A proved production encryption bypass", "A synthetic plaintext fixture; no evidence a real CCMP AP accepted those frames", "No handshake exists", "The AP uses WEP"], correct: 1, explanation: "Differentiate advertised policy, observed bytes and real receiver acceptance; module 06 deliberately includes unprotected payload examples." },
    { id: "q5", question: "A directed probe request may reveal:", options: ["AP password", "Client PNL", "RADIUS secret", "Nothing"], correct: 1, explanation: "Some directed probes expose remembered SSIDs; wildcard probes do not list the PNL, and clients may suppress probes or randomize MACs." },
  ],
  "07-wep-legacy": [
    { id: "q1", question: "A WEP BSS exposes IVs in protected frames. Why cannot switching from a 40-bit to a 104-bit shared key repair its design?", options: ["Only the AP knows the key", "The IV remains short and RC4 key scheduling/integrity flaws remain; replace WEP", "Key length makes CRC cryptographic", "WEP then becomes CCMP"], correct: 1, explanation: "The shared key size does not remove IV collisions, RC4 attacks, malleable CRC-32 or missing replay protection." },
    { id: "q2", question: "WEP uses:", options: ["RC4", "AES", "ChaCha20", "DES"], correct: 0, explanation: "RC4 stream cipher with weak scheduling." },
    { id: "q3", question: "PTW WEP key recovery commonly needs roughly what order of magnitude of useful IV-bearing frames?", options: ["A few frames", "Several million in every case", "Tens of thousands (capture-dependent)", "Exactly ten"], correct: 2, explanation: "Frame requirements and time depend on key length, traffic/IV quality and implementation; tens of thousands is an order-of-magnitude teaching estimate, not a guarantee." },
    { id: "q4", question: "WEP ICV is:", options: ["HMAC-SHA1", "CRC32", "AES-CMAC", "MD5"], correct: 1, explanation: "CRC32 not cryptographic, malleable." },
    { id: "q5", question: "How should a WEP finding be rated?", options: ["Critical in every environment", "Always informational", "Severity is determined only by packet count", "Urgent replacement, with severity derived from exposure, reachable assets and impact"], correct: 3, explanation: "WEP is obsolete and should be urgently replaced, but severity must reflect exposure, reachable assets, constraints and impact; a technique alone does not determine a rating." },
  ],
  "08-wpa-wpa2": [
    { id: "q1", question: "For a strong modern WPA2 configuration, which data cipher is preferred?", options: ["CCMP with AES", "TKIP with RC4", "DES", "ChaCha20"], correct: 0, explanation: "CCMP uses AES (CTR encryption plus CBC-MAC authentication). TKIP is legacy and should not be selected for a modern profile." },
    { id: "q2", question: "In WPA-Personal passphrase mode, how is the PMK derived?", options: ["BSSID only", "A random nonce", "PBKDF2-HMAC-SHA1 from passphrase and SSID (4096 iterations); a 256-bit PSK is used directly", "ANonce"], correct: 2, explanation: "A human passphrase is converted with PBKDF2-HMAC-SHA1(passphrase, SSID, 4096, 256 bits); a 64-hex-digit PSK supplies the 256-bit key directly." },
    { id: "q3", question: "PTK derived from:", options: ["PMK only", "PMK + ANonce + SNonce + BSSID + Client MAC", "Password only", "GTK only"], correct: 1, explanation: "PRF with PMK, nonces, MACs." },
    { id: "q4", question: "4-way handshake messages:", options: ["2", "3", "5", "4"], correct: 3, explanation: "M1 sets the ACK bit; M4 is sent by the client with MIC and Secure bits set. M4 is not an ACK frame." },
    { id: "q5", question: "After a security association, PMF protects which frame classes?", options: ["Robust management frames such as deauthentication/disassociation, not ordinary data frames", "All management frames including beacons", "Data frames only", "Nothing"], correct: 0, explanation: "802.11w protects robust management frames, including deauthentication/disassociation; it does not encrypt ordinary data or protect every management subtype/beacon." },
  ],
  "10-wps": [
    { id: "q1", question: "A beacon advertises a WPS PIN method and the setup-locked flag is clear. What can you claim?", options: ["That the full online PIN attack succeeded", "That PIN is advertised and lockout state warrants authorized verification; exploitability is not proven", "That WPS is disabled", "That the AP passphrase is known"], correct: 1, explanation: "Beacon attributes describe advertised configuration, not live registrar behavior, rate limits or a completed PIN attack." },
    { id: "q2", question: "The classic WPS PIN split reduces the worst-case search to about:", options: ["100 million", "100", "1 million", "11,000 guesses (implementation/lockout dependent)"], correct: 3, explanation: "The checksum and split validation yield roughly 10,000 first-half plus 1,000 second-half guesses in the classic attack model. Actual exploitability depends on implementation, rate limiting and lockout; the advertised PIN alone does not prove vulnerability." },
    { id: "q3", question: "Which vendor-specific OUI/type bytes identify the WPS information element?", options: ["00:50:F2:04", "00:11:22:33", "AA:BB:CC:DD", "FF:FF:FF:FF"], correct: 0, explanation: "The vendor OUI is 00:50:F2 and the WPS vendor type is 04; seeing the IE alone does not prove a PIN attack is exploitable." },
    { id: "q4", question: "A WPS audit is requested, but only a stored beacon fixture and no owned RF hardware are available. What can you deliver?", options: ["Proof of a successful PIN attack", "A valid lockout bypass report", "Frame-numbered WPS IE/lock-state analysis with an explicit RF-testing limitation", "A captured full M1\u2013M8 exchange"], correct: 2, explanation: "The fixture has WPS IE and abbreviated EAP-WSC identity/M1 only; real PIN/lockout outcomes require authorization and hardware." },
    { id: "q5", question: "Defense for WPS:", options: ["Enable WPS", "Disable WPS (wps_state=0)", "Use WEP", "Use open"], correct: 1, explanation: "Disable WPS." },
  ],
  "11-wpa3": [
    { id: "q1", question: "WPA3-Personal uses:", options: ["PSK", "WEP", "TKIP", "SAE Dragonfly"], correct: 3, explanation: "SAE = Simultaneous Authentication of Equals." },
    { id: "q2", question: "WPA3 requires:", options: ["PMF required (802.11w=2)", "PMF disabled", "WPS enabled", "TKIP"], correct: 0, explanation: "PMF required for WPA3." },
    { id: "q3", question: "SAE provides:", options: ["No forward secrecy", "Identical behavior to a WPA2-PSK handshake", "Forward secrecy and resistance to passive offline dictionary verification", "WEP compatibility"], correct: 2, explanation: "SAE is designed to prevent passive capture followed by ordinary offline PSK guessing and provides forward secrecy. This does not eliminate online guessing, implementation flaws or side-channel risks." },
    { id: "q4", question: "Transition mode AKMs:", options: ["PSK only", "PSK+SAE", "SAE only", "WEP"], correct: 1, explanation: "Transition has both PSK(2) and SAE(8)." },
    { id: "q5", question: "In a WPA2/WPA3 transition deployment with PMF optional, which risk should be assessed?", options: ["No risk", "WPS risk", "WEP risk", "Downgrade to WPA2 + deauth possible"], correct: 3, explanation: "A compatible client may choose the PSK AKM; PMF optional and client policy can leave downgrade/management-frame paths. Verify the actual client/AP negotiation rather than assume it." },
  ],
  "12-deauth-disassoc": [
    { id: "q1", question: "Deauth subtype:", options: ["12", "0", "8", "4"], correct: 0, explanation: "Subtype 12 = deauth, 10 = disassoc." },
    { id: "q2", question: "Without PMF, a receiver may accept spoofed deauthentication frames because they lack cryptographic protection:", options: ["Encrypted", "Protected", "Unauthenticated, spoofable", "WPA3 only"], correct: 2, explanation: "Management-frame spoofing may cause disruption or reconnection on susceptible devices; actual acceptance and impact require a controlled test." },
    { id: "q3", question: "PMF required is:", options: ["ieee80211w=0", "ieee80211w=2", "ieee80211w=1", "wps_state=0"], correct: 1, explanation: "ieee80211w=2 = PMF required, 1 = capable optional, 0 = disabled." },
    { id: "q4", question: "WPA3 mandates PMF:", options: ["Disabled", "Optional", "No PMF", "Required"], correct: 3, explanation: "WPA3 requires PMF required." },
    { id: "q5", question: "Deauth flood detection:", options: ["A burst of deauthentication frames warrants investigation, but does not alone prove malicious activity", "1 deauth per hour", "Beacon only", "EAPOL only"], correct: 0, explanation: "Correlate source, reason codes, timing, client behavior, RF context and authorized testing before attributing intent." },
  ],
  "14-captive-portals": [
    { id: "q1", question: "A common legacy captive-portal guest design uses which link-layer access before portal authorization?", options: ["WEP", "Open association", "WPA3-only", "Always WPA2-Enterprise"], correct: 1, explanation: "Open pre-auth association is common, but captive portals can also sit behind encrypted Wi-Fi. A portal does not itself encrypt open-link traffic; HTTPS still matters." },
    { id: "q2", question: "Open network risk:", options: ["No risk", "WPS risk", "PMF required", "Traffic sniffable, no encryption"], correct: 3, explanation: "Open = no TK, traffic sniffable unless HTTPS." },
    { id: "q3", question: "To claim a portal can be bypassed by cloning a client MAC, what evidence is needed?", options: ["A documented authorization policy plus a controlled cloned-MAC test and server-side logs showing unauthorized access", "Not possible", "Requires WPS", "Requires deauth only"], correct: 0, explanation: "A visible MAC address alone does not prove the service trusts it. Verify policy, perform a scoped negative/positive test, and inspect server-side logs." },
    { id: "q4", question: "In a hostapd setup that supports this setting, which option requests AP client isolation?", options: ["ap_isolate=0", "wps_state=2", "ap_isolate=1", "ieee80211w=0"], correct: 2, explanation: "`ap_isolate=1` requests client isolation in hostapd; verify implementation, bridges/VLANs and actual forwarding with a controlled two-client test." },
    { id: "q5", question: "Better than pure open for guest:", options: ["WEP", "Enhanced Open (OWE) or an appropriately configured protected WLAN, with portal + isolation + HTTPS", "Open with no portal", "WPS"], correct: 1, explanation: "OWE (Enhanced Open, not WPA3-Personal) adds unauthenticated link encryption; it does not replace portal TLS/session controls or network isolation. Choose the approved deployment profile for the client fleet." },
  ],
  "15-enterprise-fundamentals": [
    { id: "q1", question: "Enterprise vs Personal difference:", options: ["Same PSK for all", "No auth", "WEP only", "Per-user credentials via 802.1X/RADIUS, PMK from MSK"], correct: 3, explanation: "Enterprise uses 802.1X, per-user, PMK from MSK not PBKDF2." },
    { id: "q2", question: "802.1X roles:", options: ["Supplicant (client), Authenticator (AP), Authentication Server (RADIUS)", "Only AP", "Only RADIUS", "Only client"], correct: 0, explanation: "Supplicant → Authenticator → Authentication Server." },
    { id: "q3", question: "PEAP client lacks trusted-server certificate and server-name validation. What is the risk?", options: ["No risk", "WPS risk", "A rogue authenticator may terminate an unvalidated outer TLS tunnel and expose inner credentials; verify both CA trust and expected server identity.", "WEP risk"], correct: 2, explanation: "Missing or incomplete server validation can let a client establish TLS to an attacker-controlled authenticator; outcomes depend on profile, certificate checks and EAP method." },
    { id: "q4", question: "RADIUS shared secret should be:", options: ["testing123", "High-entropy, unique secret per NAS; length should follow current policy and operational limits", "password", "secret"], correct: 1, explanation: "Use high-entropy, unique per-NAS secrets and protect/rotate them; 22 characters is a policy heuristic, not a protocol requirement." },
    { id: "q5", question: "Enterprise benefit:", options: ["No benefit", "WPS only", "Open only", "Per-user revocation, VLAN, accounting, no shared PSK"], correct: 3, explanation: "Per-user, revocation, VLAN, accounting." },
  ],
  "18-corporate-attacks": [
    { id: "q1", question: "What does the corporate-attacks capture actually contain?", options: ["A complete PEAP/RADIUS/DHCP chain", "Management frames, a WPA-Personal look-alike/handshake, direct EAP-MSCHAPv2 fixture packets, and an ICMP pair", "A live VLAN ACL test", "A validated certificate failure"], correct: 1, explanation: "The 19-frame fixture is synthetic and contains no DHCP, PEAP/TLS transcript, RADIUS packets or ACL configuration. Its direct EAP-MSCHAPv2 packets are not a faithful PEAP tunnel." },
    { id: "q2", question: "Does one deauthentication frame prove a successful attack?", options: ["Yes, it proves the client was disconnected", "Yes, if reason code 7", "Only on 2.4 GHz", "No; source, PMF behavior, receiver acceptance and client outcome need separate evidence"], correct: 3, explanation: "A capture records a frame, not successful delivery or impact. Confirm source/authenticity, protection, client response and authorized scope." },
    { id: "q3", question: "What does the ICMP pair in this fixture prove?", options: ["Only that the synthetic PCAP contains an echo request/reply; no real VLAN/ACL was tested", "A production ACL is absent", "Domain compromise", "Guest-to-client isolation is disabled"], correct: 0, explanation: "The packets do not establish a real network path or the control that permitted it. A real segmentation finding needs scoped endpoint, route/VLAN, enforcement and repeatability evidence." },
    { id: "q4", question: "A matching SSID on an additional BSSID is enough to call it a rogue AP:", options: ["True", "Only when signal is stronger", "False; compare an authorized inventory and corroborating infrastructure evidence", "Only on channel 11"], correct: 2, explanation: "SSID/BSSID/signal clues alone do not establish ownership or maliciousness. Correlate the authorized BSS list, profile, site context and wired-side evidence." },
    { id: "q5", question: "Which test is needed to substantiate a client-isolation failure?", options: ["A beacon from the guest AP", "A controlled two-client forwarding test plus relevant AP/config evidence", "A RADIUS shared secret", "A single ICMP packet in an unrelated capture"], correct: 1, explanation: "Client isolation is distinct from inter-VLAN segmentation. Test it using controlled clients and establish what the AP forwarded." },
  ],
  "20-final-assessment": [
    { id: "q1", question: "In independent Case C-20, what does the baseline M2 MIC checked with the disclosed lab candidate prove?", options: ["The fictional packet math matches the lab candidate; it does not establish a production secret or network access", "The same-name unlisted BSS uses that candidate", "The client successfully accessed the corporate VLAN", "Northwind uses that password"], correct: 0, explanation: "The baseline fixture has an independently checked teaching handshake. Ownership, other BSS credentials, access and production impact are separate claims." },
    { id: "q2", question: "The staged post-change C-20 capture advertises SAE-only/MFPR on the owned BSSID but includes no client exchange. What is the defensible retest result?", options: ["All clients were migrated", "The unknown same-name BSS must be malicious", "Advertised policy changed on one BSSID; client negotiation and full retest remain NOT TESTED", "PSK can no longer appear anywhere"], correct: 2, explanation: "A post-change beacon supports a bounded advertisement comparison. The same-name PSK BSS still needs ownership correlation, and client policy/enforcement needs controlled tests." },
    { id: "q3", question: "The C-20 inventory lists only two of three observed BSSIDs. What should you do with the unlisted same-name BSS?", options: ["Immediately call it a malicious rogue", "Ignore it because its MAC is locally administered", "Treat ownership as unknown and seek authorized inventory and wired correlation", "Assume it belongs to Northwind"], correct: 2, explanation: "An unlisted, same-name BSS is an investigation lead. Neither a local MAC nor the SSID establishes owner or intent." },
    { id: "q4", question: "Which first step is allowed by C-20’s offline-only scope?", options: ["Deauthenticate a client", "Read and hash the supplied captures, then decode beacon and EAPOL frames", "Scan an unlisted AP", "Try the lab passphrase on a real network"], correct: 1, explanation: "Only local reading of the fictional supplied artifacts is authorized in this teaching case." },
    { id: "q5", question: "What additional evidence would establish an actual client accepted the staged SAE-only policy?", options: ["The after-file’s name", "One beacon advertising SAE", "A published wordlist", "A controlled client association with selected AKM/PMF and corresponding client/AP logs"], correct: 3, explanation: "The staged three-beacon file establishes an advertised change, not negotiated client behavior or installed protection." },
  ],
  "android-01-platform": [
    { id: "q1", question: "How does Android enforce process isolation between two standard third-party applications?", options: ["By assigning each installed application a distinct Linux UID/GID at install time", "By running each application in a separate virtual machine hypervisor", "By restricting network ports via iptables", "Through Java language private access modifiers alone"], correct: 0, explanation: "Android sandboxes apps at the Linux kernel level by assigning each package a unique UID (e.g., u0_a182), preventing other apps from accessing its private /data/data/ directory via kernel DAC and SELinux." },
    { id: "q2", question: "Why is SELinux (MAC) required on Android even though Linux file permissions (DAC) already isolate UIDs?", options: ["DAC cannot protect network sockets", "Even if a process escalates to root (UID 0), SELinux type enforcement restricts unauthorized domain actions", "SELinux is only used for encrypting user passwords", "DAC permissions are ignored by the ART runtime"], correct: 1, explanation: "SELinux enforces Mandatory Access Control. Even if an attacker gains root privileges, SELinux policy prevents the untrusted_app domain from tampering with block devices or system services." },
    { id: "q3", question: "When an application receives an IPC call via Binder, how does it securely identify the calling process?", options: ["By parsing an intent extra called 'caller_package'", "By reading the HTTP user-agent header", "By invoking Binder.getCallingUid(), which is kernel-injected by the /dev/binder driver", "By querying the Linux /proc filesystem"], correct: 2, explanation: "The Binder kernel driver intercepts transactions and injects verified calling UID and PID; the caller cannot spoof the return value of Binder.getCallingUid()." },
    { id: "q4", question: "What is the primary security advantage of declaring a custom permission with android:protectionLevel='signature'?", options: ["It requires the user to grant permission at runtime", "Only applications signed with the exact same developer certificate can hold the permission", "It encrypts all data sent across the component", "It allows any app on Google Play to invoke the component"], correct: 1, explanation: "A signature-level permission is granted automatically by the platform only to apps signed with the identical cryptographic key, making it ideal for private inter-app suites." },
    { id: "q5", question: "Why is APK Signature Scheme v2/v3 superior to legacy v1 JAR signing?", options: ["v1 signing did not support RSA keys", "v2/v3 signs the entire binary payload via an APK Signing Block, protecting ZIP metadata and preventing Janus-style container tampering", "v1 signing required an internet connection to install", "v2/v3 removes the need for developer certificates"], correct: 1, explanation: "v1 only verified individual file hashes, leaving zip metadata vulnerable to tampering (e.g., Janus vulnerability CVE-2017-13156). v2/v3 protects the entire file and adds key rotation lineage in v3." },
    { id: "q6", question: "Starting with Android 12 (API 31), what manifest requirement is strictly enforced for components with intent filters?", options: ["They must be written in Kotlin", "They must declare an explicit android:exported attribute ('true' or 'false')", "They must request the INTERNET permission", "They must use biometric authentication"], correct: 1, explanation: "Android 12 makes explicit declaration of android:exported mandatory for any activity, service, or receiver that includes an <intent-filter>, preventing accidental exposure." },
  ],
  "android-02-workstation": [
    { id: "q1", question: "Which Android Virtual Device (AVD) system image type is recommended for security assessments and why?", options: ["Google Play image, because it allows adb root out of the box", "AOSP image, because it includes proprietary banking apps", "Google APIs (userdebug) image, because it permits 'adb root' and '-writable-system' while supporting Google Play Services", "Any production release build"], correct: 2, explanation: "Google APIs userdebug builds allow adb root and partition remounting (-writable-system) required for CA injection, while maintaining full Google Play Services support." },
    { id: "q2", question: "Why must a Burp Suite CA certificate installed into /system/etc/security/cacerts/ be named in the format <hash>.0?", options: ["Android's BoringSSL crypto library indexes system certificates by the old subject hash followed by .0", "It is an arbitrary naming convention that helps developers locate certificates", "The .0 extension indicates that the certificate is encrypted", "ADB rejects files without a numerical extension"], correct: 0, explanation: "Android locates system CA certificates using OpenSSL/BoringSSL subject hash indexing (openssl x509 -subject_hash_old), appending an integer (.0) to handle hash collisions." },
    { id: "q3", question: "When monitoring real-time application behavior, which ADB logcat command captures only messages from the target application's process?", options: ["adb logcat --pid=$(adb shell pidof -s <package_name>) -v time", "adb logcat --all-users", "adb logcat -d /data/data", "adb shell cat /dev/log/all"], correct: 0, explanation: "Filtering logcat by the target application's PID (--pid) isolates output specifically generated by that process across log buffers." },
    { id: "q4", question: "In a professional security assessment, how should a static code review finding be reported if dynamic testing was unavailable?", options: ["Fabricate an ADB execution log to show the client", "Report it as a confirmed high-severity exploit without qualification", "Document the finding as a static code vulnerability hypothesis and explicitly note that dynamic verification was NOT EXECUTED", "Ignore the finding completely"], correct: 2, explanation: "Professional pentesting strictly separates static hypotheses from observed runtime behavior. If dynamic validation could not be executed, it must be explicitly labeled NOT EXECUTED." },
    { id: "q5", question: "What is the primary operational reason to revert to a clean emulator snapshot or run 'adb shell pm clear' between test scenarios?", options: ["To prevent residual session tokens, cached state, or file artifacts from corrupting positive and negative test controls", "To bypass Android Verified Boot", "To regenerate the app's signing key", "To reset the host computer's IP address"], correct: 0, explanation: "Clean baselines ensure test reproducibility and prevent false positives/negatives caused by lingering credentials or cached data." },
  ],
  "android-03-apk-triage": [
    { id: "q1", question: "Why is an APK with android:debuggable='true' considered a critical security finding in production?", options: ["It prevents the app from connecting to Wi-Fi", "It exposes JDWP debugging ports, allows memory inspection via ADB without root, and enables arbitrary code execution within the app UID", "It forces the app to use HTTP instead of HTTPS", "It disables all screen rendering on the device"], correct: 1, explanation: "Setting android:debuggable='true' allows any attacker with local or physical ADB access to attach a Java debugger (JDWP), inspect in-memory secrets, and run shell commands as the application user via 'run-as'." },
    { id: "q2", question: "Why must a mobile security analyst inspect all DEX files (classes.dex, classes2.dex, etc.) in a Multidex APK?", options: ["Only classes.dex contains readable strings", "A single DEX file has a 64K method reference limit; business logic and security controls are frequently partitioned across secondary DEX files", "Secondary DEX files only contain images and layouts", "Android ignores classes2.dex at runtime"], correct: 1, explanation: "Due to the 65,536 method reference limit in Dalvik bytecode, modern apps split compiled classes across multiple DEX files. Auditing only classes.dex misses classes located in secondary DEX files." },
    { id: "q3", question: "In JADX-GUI, what is the fastest way to trace backwards from a sensitive sink (e.g., SQLiteDatabase.rawQuery) to its external entry point?", options: ["Opening the AndroidManifest.xml file", "Selecting the method and pressing 'X' to view all cross-references and call sites", "Running apktool to decompile resources", "Searching for the word 'SELECT' in strings.xml"], correct: 1, explanation: "The 'X' hotkey in JADX-GUI opens the Cross-References (XRef) dialog, displaying every method that invokes the highlighted function, allowing analysts to trace backwards to external callers." },
    { id: "q4", question: "When would an analyst choose apktool over JADX during an assessment?", options: ["When they want to read clean, high-level Kotlin code", "When modifying binary XML attributes (e.g., enabling debugging) or patching Smali instructions before rebuilding and re-signing the APK", "When inspecting network traffic via a proxy", "When generating automated CVSS scores"], correct: 1, explanation: "apktool disassembles bytecode into Smali and decodes resources into editable XML, making it the standard tool for patching, modifying, and rebuilding APKs." },
    { id: "q5", question: "In source-to-sink analysis, what defines a 'critical sink'?", options: ["The user interface button where input is entered", "A function that executes an operation with security or privacy implications (e.g., executing SQL, writing private files, or transmitting data)", "The manifest <application> tag", "A comment left by the developer"], correct: 1, explanation: "A sink is the terminal execution point where data is consumed. Sinks become vulnerable when untrusted data from an external source reaches them without passing through adequate security guards." },
    { id: "q6", question: "In the SecCraft Notes Boundary demo, how does the fixed flavor prevent cross-account note exposure?", options: ["By encrypting the phone's SD card", "By checking that the note owner matches the active session user before returning data (!owner.equals(activeUser))", "By deleting the MainActivity component", "By requiring an internet connection"], correct: 1, explanation: "The vulnerable flavor returns the requested note regardless of ownership, while the fixed flavor enforces an authorization guard ensuring the caller's session matches the record's owner." },
  ],
  "android-04-components": [
    { id: "q1", question: "In Android versions prior to Android 12 (API 31), what was the default export behavior for a component declaring an <intent-filter>?", options: ["It defaulted to android:exported='false'", "It defaulted to android:exported='true', making it globally callable by any third-party app on the device", "The app was prevented from compiling", "It was only callable by system apps"], correct: 1, explanation: "Prior to Android 12, declaring an intent filter implicitly exported the component (defaulting to exported='true'), causing widespread accidental exposure of internal activities and receivers." },
    { id: "q2", question: "Why is checking 'getCallingPackage()' in an exported Activity's onCreate() insufficient on its own for caller authorization?", options: ["getCallingPackage() always returns the target app's own name", "getCallingPackage() returns null if the caller launched the Activity using standard startActivity() rather than startActivityForResult()", "getCallingPackage() requires root privileges", "Only system services can call getCallingPackage()"], correct: 1, explanation: "getCallingPackage() only returns a valid package name if the caller used startActivityForResult(). If launched via standard startActivity(), it evaluates to null and can fail open if not checked." },
    { id: "q3", question: "How does an attacker exploit path traversal in a Content Provider's openFile() method?", options: ["By modifying the AndroidManifest.xml file on the device", "By passing encoded directory traversal sequences (e.g., ..%2F) in the URI path segment to access files outside the intended base directory", "By using a brute-force PIN attack", "By sending an implicit broadcast"], correct: 1, explanation: "If openFile() constructs file paths using uri.getLastPathSegment() without canonical path validation, an attacker can traverse up into /data/data/<pkg>/ to read private databases or SharedPreferences." },
    { id: "q4", question: "What vulnerability occurs when an application creates a mutable PendingIntent with an unfilled base Intent?", options: ["The app's certificate is revoked", "A malicious recipient app can use Intent.fillIn() to overwrite the target component or action, executing arbitrary commands with the creator's UID and permissions", "The app cannot connect to Wi-Fi", "The device reboots into recovery mode"], correct: 1, explanation: "Because PendingIntents execute with the creator's identity and privileges, an untrusted recipient can rewrite mutable fields via fillIn() to invoke private internal components as a Confused Deputy." },
    { id: "q5", question: "How does accidental URI grant leakage occur in exported components?", options: ["By declaring android:allowBackup='false'", "When an exported component receives a sensitive content:// URI with FLAG_GRANT_READ_URI_PERMISSION and blindly forwards it to an untrusted external app", "By using SQLiteQueryBuilder", "By registering a dynamic receiver"], correct: 1, explanation: "If a component receives temporary URI read/write permissions and forwards the intent to external apps without stripping grant flags, untrusted third parties gain access to the underlying private file." },
    { id: "q6", question: "What is the secure implementation standard for dynamic broadcast receivers registered on Android 13+ (API 33)?", options: ["Always pass ContextCompat.RECEIVER_EXPORTED", "Explicitly pass ContextCompat.RECEIVER_NOT_EXPORTED unless cross-app communication is strictly required", "Omit all flags", "Use only implicit intents"], correct: 1, explanation: "Android 13 requires developers to specify either RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED; internal receivers must use RECEIVER_NOT_EXPORTED to prevent broadcast injection from external apps." },
  ],
  "android-05-links": [
    { id: "q1", question: "Why are custom URI schemes (e.g., myapp://) inherently vulnerable to Intent Hijacking on Android?", options: ["Custom schemes only work over 4G/5G networks", "The Android platform does not verify domain ownership for custom schemes; any rogue application can declare the exact same scheme in its manifest", "Custom schemes cannot pass query parameters", "Google Play bans apps using custom schemes"], correct: 1, explanation: "Android has no registration authority or domain verification for custom schemes. If multiple apps register the same scheme, Android shows a chooser dialog and the user may route sensitive tokens to malware." },
    { id: "q2", question: "How does Android cryptographically verify domain ownership for Android App Links?", options: ["By requiring the user to type a CAPTCHA", "By fetching /.well-known/assetlinks.json from the HTTPS domain host and matching the declared SHA-256 certificate fingerprint against the installed APK's signing certificate", "By checking DNS TXT records", "Through Bluetooth beaconing"], correct: 1, explanation: "Android App Links use Digital Asset Links. The OS verifies that the domain's assetlinks.json lists the exact SHA-256 fingerprint of the app's signing key before granting exclusive automatic link handling." },
    { id: "q3", question: "Why is the validation check 'uri.host.endsWith(\"trusted.example\")' insecure?", options: ["It crashes on uppercase domain names", "An attacker can register 'attackertrusted.example' or 'phishingtrusted.example', which both pass the suffix check unexpectedly", "endsWith() is deprecated in Kotlin", "It rejects subdomains of trusted.example"], correct: 1, explanation: "Without a leading dot check (e.g., host == 'trusted.example' || host.endsWith('.trusted.example')), attacker-controlled domains containing the suffix string pass the check completely." },
    { id: "q4", question: "What makes an Open Redirect in a mobile deep link dangerous?", options: ["It reduces mobile battery life", "An attacker can manipulate the redirect destination (e.g., ?next=https://evil.com) to steal OAuth tokens appended by the app or escape into an embedded WebView with native bridge access", "It deletes the app's cache directory", "It blocks push notifications"], correct: 1, explanation: "Open redirects allow attackers to steal authorization codes and tokens appended to the redirect URL, or trick the application into loading attacker-controlled web content in privileged WebViews." },
    { id: "q5", question: "Why should deep links never trigger state-changing actions (e.g., money transfers or password changes) automatically upon launch?", options: ["Deep links cannot carry data", "An attacker can trigger the deep link automatically from an invisible iframe or image tag on a malicious website visited in the mobile browser", "Android closes the app if a deep link takes more than 1 second", "Deep links only work when the app is already open"], correct: 1, explanation: "External websites visited in mobile browsers can dispatch deep links without user awareness. State-changing actions must require explicit interactive user confirmation (e.g., biometric prompt)." },
    { id: "q6", question: "In an Intent Redirection attack, how does an attacker access an unexported internal activity (android:exported='false')?", options: ["By cracking the device encryption key", "By passing an explicit intent targeting the unexported activity inside an extra (e.g., 'next_intent') to an exported forwarder activity, which launches it with the app's own UID", "By modifying the kernel bootloader", "By using ADB without USB debugging"], correct: 1, explanation: "The exported forwarder acts as a Confused Deputy. Because the forwarder launches the target intent from within the application process, the platform allows the unexported component to be reached." },
  ],
  "android-06-storage": [
    {
      id: "q1",
      question: "During an assessment of an unencrypted SQLite database (finance.db), transaction records were deleted but the table shows 0 rows. Which companion file frequently retains the deleted records in plaintext until a checkpoint merges it?",
      options: [
        "finance.db-wal (Write-Ahead Logging journal), which retains uncheckpointed pages and deleted records",
        "finance.db.apk in Dalvik bytecode",
        "/system/etc/hosts system configuration",
        "finance.db.keystore hardware enclave"
      ],
      correct: 0,
      explanation: "SQLite with WAL logging appends transactions to a database-wal file. Deleted rows and superseded records remain recoverable in plaintext within the WAL file until a database checkpoint operation truncates it."
    },
    {
      id: "q2",
      question: "On Android 13 (API 33) and above, which metadata flag must an application attach to ClipData to suppress the system clipboard overlay preview and prevent cross-device clipboard sync for sensitive tokens or OTPs?",
      options: [
        "ClipDescription.EXTRA_IS_SENSITIVE set to true",
        "WindowManager.LayoutParams.FLAG_SECURE",
        "android:allowBackup='false'",
        "android:exported='false'"
      ],
      correct: 0,
      explanation: "Android 13 introduced ClipDescription.EXTRA_IS_SENSITIVE. Tagging ClipData with this boolean extra instructs the system UI to obscure the visual clipboard preview overlay and suppresses clipboard content synchronization across devices."
    },
    {
      id: "q3",
      question: "When an application enables android:allowBackup='true', an analyst executes 'adb backup -f backup.ab -noapk <package>'. How can the contents of backup.ab be extracted on an analysis workstation?",
      options: [
        "Strip the 24-byte Android backup header, decompress the remaining zlib stream, and untar the resulting archive",
        "Rename backup.ab to backup.apk and open it in JADX-GUI",
        "Import backup.ab directly into Burp Suite as a client certificate",
        "Execute fastboot oem unlock backup.ab"
      ],
      correct: 0,
      explanation: "Android backup (.ab) archives feature a 24-byte magic/metadata header followed by a zlib-compressed tar stream. Stripping the header and uncompressing the zlib stream yields the tar archive containing private sandbox files."
    },
    {
      id: "q4",
      question: "Which window attribute must be set on an Activity to prevent sensitive account numbers or banking balances from appearing in the Android task switcher (recents) thumbnail and block user screenshots?",
      options: [
        "window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)",
        "android:windowSoftInputMode='adjustResize'",
        "SharedPreferences.Editor.clear() in onPause()",
        "android:screenOrientation='portrait'"
      ],
      correct: 0,
      explanation: "WindowManager.LayoutParams.FLAG_SECURE directs the Android Window Manager to treat the window surface as secure, masking it from the recent apps switcher, screenshot tools, and screen mirroring utilities."
    },
    {
      id: "q5",
      question: "What primary architectural security guarantee distinguishes Android Keystore keys generated with setUserAuthenticationRequired(true) combined with BiometricPrompt.CryptoObject?",
      options: [
        "Key material remains in hardware (TEE or StrongBox) and operations fail unless the system validates biometric or lock-screen authentication within the authorization window",
        "The cryptographic key is automatically mirrored to Google Drive",
        "The private key is converted into an exported plaintext string in Dalvik memory",
        "The key automatically bypasses TLS certificate pinning"
      ],
      correct: 0,
      explanation: "Android Keystore keys with user authentication requirements enforce custody in hardware. The TEE or StrongBox will refuse cryptographic signing or decryption unless an authorized BiometricPrompt.CryptoObject authentication token is presented."
    },
    {
      id: "q6",
      question: "During an audit, pressing 'Log Out' navigates to LoginActivity and clears access_token from SharedPreferences, but trip history and personal addresses remain visible offline. What vulnerability does this demonstrate?",
      options: [
        "Incomplete logout data lifecycle: local SQLite databases, HTTP disk caches, and in-memory caches were not purged alongside the token",
        "Android kernel forbids deleting files created by prior process UIDs",
        "ADB USB debugging was enabled, which forces local data caching",
        "The application was compiled without ProGuard obfuscation"
      ],
      correct: 0,
      explanation: "Comprehensive logout requires both remote session revocation and complete local state destruction, including clearing SQLite databases, wiping cached files, evicting disk caches, and zeroizing in-memory singleton state."
    }
  ],
  "android-07-network": [
    {
      id: "q1",
      question: "An application manifest specifies targetSdkVersion='34' and references a network_security_config.xml with <debug-overrides><trust-anchors><certificates src='user'/></trust-anchors></debug-overrides>. How does Android handle this configuration?",
      options: [
        "Debug builds (android:debuggable='true') trust user-installed root CAs, while production release builds (android:debuggable='false') completely ignore debug-overrides and trust only system CAs",
        "All production release builds will automatically trust user-installed proxy CAs for all hostnames",
        "The application fails to compile because debug-overrides was removed in Android 7",
        "The application transmits all HTTP traffic in unencrypted cleartext"
      ],
      correct: 0,
      explanation: "Android's Network Security Config parser activates <debug-overrides> strictly when android:debuggable is true. In production release builds, user CAs are not trusted unless explicitly permitted under base-config or domain-config."
    },
    {
      id: "q2",
      question: "You identify a custom X509TrustManager where checkServerTrusted(chain: Array<X509Certificate>?, authType: String?) is empty. What is the immediate consequence in production?",
      options: [
        "The app accepts ANY TLS certificate, allowing an attacker on the network to perform Machine-in-the-Middle decryption using a self-signed or invalid certificate",
        "The application throws an SSLException and aborts all network communication",
        "The application activates StrongBox hardware certificate pinning",
        "The application blocks JavaScript execution inside embedded WebViews"
      ],
      correct: 0,
      explanation: "An empty checkServerTrusted implementation never throws a CertificateException. As a result, the TLS stack accepts any certificate presented by any peer, completely destroying TLS integrity and confidentiality."
    },
    {
      id: "q3",
      question: "An application validates that a server certificate chains to a trusted public Root CA, but implements HostnameVerifier { _, _ -> true }. How can an attacker execute a Machine-in-the-Middle attack?",
      options: [
        "The attacker presents a valid certificate issued by any trusted CA for their own domain (attacker.com); because hostname matching is disabled, the app accepts it for api.targetbank.com",
        "The attacker must factor an RSA-4096 modulus",
        "The attacker must compromise the target bank's private TLS signing key",
        "The attack is impossible because the CA root certificate chain was verified"
      ],
      correct: 0,
      explanation: "TLS verification requires two independent checks: CA chain trust and Subject Alternative Name (SAN) hostname matching. A hostname verifier that always returns true allows any valid certificate for any domain to impersonate the target server."
    },
    {
      id: "q4",
      question: "Why does RFC 7469 and OWASP MASVS-NETWORK mandate that applications utilizing SPKI certificate pinning configure backup pins (e.g., intermediate CA or disaster recovery key)?",
      options: [
        "If a single pinned leaf certificate is compromised or expires before an app update is installed, all client connections are permanently bricked without a valid backup pin",
        "SPKI certificate pinning only functions over unencrypted HTTP",
        "A single leaf pin triggers a Dalvik OutOfMemoryError crash",
        "Android 14 removed support for SHA-256 certificate hashes"
      ],
      correct: 0,
      explanation: "Pinning only a single leaf certificate creates a critical availability risk. If the leaf certificate expires or requires emergency revocation, clients without an update cannot connect. Backup pins provide operational resilience."
    },
    {
      id: "q5",
      question: "A security analyst hooks SSL_CTX_set_custom_verify using Frida on a rooted device to intercept HTTPS requests in Burp Suite, then reports 'Critical Vulnerability: Certificate Pinning Broken'. Why is this finding classification incorrect?",
      options: [
        "Dynamic instrumentation on an owned test device is a diagnostic testing technique, not an app vulnerability; the client is in the user's control and cannot defend against its own execution environment",
        "Frida hooks only operate on Android 4.4 and earlier versions",
        "Burp Suite cannot parse mobile TLS records",
        "Certificate pinning is required by international law on all mobile applications"
      ],
      correct: 0,
      explanation: "The untrusted mobile client axiom states that the device owner controls the runtime environment. Defeating pinning via Frida on an owned device allows inspection of traffic but does not constitute a remote vulnerability in the application."
    },
    {
      id: "q6",
      question: "Why must native Android applications implement OAuth 2.0 with Proof Key for Code Exchange (PKCE, RFC 7636) instead of the standard Authorization Code Flow with a static client_secret?",
      options: [
        "Mobile apps are public clients and cannot protect hardcoded client secrets from static decompilation; PKCE uses dynamic code_verifier and code_challenge tokens per session to prevent code interception",
        "PKCE encrypts the entire SQLite database on disk",
        "Standard authorization code flows are blocked by Android SELinux",
        "PKCE allows mobile applications to bypass HTTPS requirements"
      ],
      correct: 0,
      explanation: "Mobile apps cannot safeguard confidential client secrets. PKCE eliminates the need for client secrets in public clients by generating dynamic cryptographically random verifiers per authorization request."
    }
  ],
  "android-08-webview": [
    {
      id: "q1",
      question: "Which WebViewClient callback must an application implement to intercept and filter outgoing URL navigations, preventing an embedded WebView from navigating to untrusted external domains?",
      options: [
        "shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean",
        "onPageFinished(view: WebView, url: String)",
        "onReceivedError(view: WebView, errorCode: Int, description: String, failingUrl: String)",
        "WebChromeClient.onProgressChanged()"
      ],
      correct: 0,
      explanation: "shouldOverrideUrlLoading intercepts URL navigation attempts. Returning true prevents the WebView from executing navigation internally, allowing the application to validate hostnames or redirect external links to the system browser."
    },
    {
      id: "q2",
      question: "What severe vulnerability occurs when an application sets settings.allowUniversalAccessFromFileURLs = true on an embedded WebView?",
      options: [
        "Scripts executed from a local file:// URL can violate Same-Origin Policy to read arbitrary private files, preferences, and databases in /data/data/<package>/ and exfiltrate them",
        "The WebView permanently disables hardware acceleration",
        "The device cellular modem is disconnected",
        "The application cannot be signed with APK Signature Scheme v2"
      ],
      correct: 0,
      explanation: "allowUniversalAccessFromFileURLs disables Same-Origin Policy protections for file:// URLs, enabling local or downloaded HTML/JS to read any file in the app's sandboxed private storage and exfiltrate it over the network."
    },
    {
      id: "q3",
      question: "Which AndroidX WebKit component provides a secure mechanism for serving bundled HTML, CSS, and JavaScript assets without enabling dangerous file:// schemes?",
      options: [
        "androidx.webkit.WebViewAssetLoader, which intercepts requests to a virtual HTTPS domain (https://appassets.androidplatform.net/) to enforce Same-Origin Policy",
        "setAllowFileAccess(true) pointing to file:///android_asset/",
        "Runtime.getRuntime().exec('chmod 777 /data/data/')",
        "Storing HTML files in public SD card /sdcard/Download/"
      ],
      correct: 0,
      explanation: "WebViewAssetLoader routes local asset requests through a virtual HTTPS origin, preventing file:// scheme vulnerabilities while preserving Same-Origin Policy, CORS, and mixed-content restrictions."
    },
    {
      id: "q4",
      question: "Prior to Android 4.2 (API 17), calling webView.addJavascriptInterface(InjectedObject(), 'bridge') allowed remote code execution because:",
      options: [
        "Untrusted JavaScript could use Java reflection via getClass().forName() on the injected bridge object to access java.lang.Runtime and execute arbitrary system shell commands",
        "Dalvik bytecode was converted into raw x86 assembly without sandbox constraints",
        "The Dalvik runtime allowed direct memory pointer manipulation via CSS stylesheets",
        "WebViews executed all JavaScript as Linux root (UID 0)"
      ],
      correct: 0,
      explanation: "In Android < 4.2, all public methods of the exposed Java object—including inherited Object.getClass()—were callable from JavaScript. Attackers used reflection to instantiate Runtime and invoke exec(). API 17+ requires the @JavascriptInterface annotation."
    },
    {
      id: "q5",
      question: "On Android 14, an Activity exposes @JavascriptInterface fun transferFunds(amount: Double, recipient: String) via a bridge. If the WebView navigates to an attacker-controlled external URL, what is the impact?",
      options: [
        "Logical bridge abuse: the external webpage inherits window.bridge and can call transferFunds() to execute unauthorized transactions with native app privileges",
        "@JavascriptInterface automatically disables TLS encryption on all HTTP requests",
        "The method requires ProGuard obfuscation to be disabled",
        "Android 14 blocks Double primitive parameters in JavaScript interfaces"
      ],
      correct: 0,
      explanation: "Even with @JavascriptInterface, any webpage loaded into the WebView has access to the injected JavaScript object. If the WebView can be navigated to an untrusted domain, that domain can execute privileged native methods."
    },
    {
      id: "q6",
      question: "What primary architectural security benefit does WebViewCompat.addWebMessageListener() provide over legacy addJavascriptInterface()?",
      options: [
        "It accepts an explicit set of allowed origins, and the Android framework itself validates that the sending page's origin matches before dispatching messages to native code",
        "It replaces HTTPS with Bluetooth Low Energy packets",
        "It allows WebViews to run Python scripts without a browser engine",
        "It strips all Content Security Policy (CSP) headers"
      ],
      correct: 0,
      explanation: "WebViewCompat.addWebMessageListener binds native message listeners to an explicit set of allowed origins. The underlying Chromium engine verifies the frame's origin before delivering messages, preventing off-domain bridge inheritance."
    }
  ],
  "android-09-runtime": [
    {
      id: "q1",
      question: "Why must a mobile security tester establish a non-instrumented runtime observation baseline (using ADB and Logcat) before introducing Frida or Objection hooks?",
      options: [
        "Dynamic instrumentation tools alter runtime timing and memory state and can inadvertently bypass or trigger anti-tamper logic, obscuring genuine baseline application behavior",
        "Non-instrumented observation encrypts the Dalvik bytecode on disk",
        "ADB cannot communicate with the device once Frida is installed",
        "Non-instrumented testing is required by the Linux kernel license"
      ],
      correct: 0,
      explanation: "Instrumenting an application introduces significant observer effects by altering execution timing and memory layouts. Establishing an uninstrumented baseline ensures the tester observes authentic application behavior on unmodified devices."
    },
    {
      id: "q2",
      question: "You want to dynamically verify whether an active payment screen enforces FLAG_SECURE at the Android Window Manager level. Which command and flag value confirms that window screen captures and task switcher thumbnails are actively blocked?",
      options: [
        "Execute 'adb shell dumpsys window windows | grep -E \"mCurrentFocus|flags=\"' and verify that the focused window flags include 0x00002000",
        "Execute 'adb shell getprop ro.build.type' and check for userdebug",
        "Execute 'adb shell am force-stop <package>'",
        "Inspect res/values/strings.xml in JADX-GUI"
      ],
      correct: 0,
      explanation: "dumpsys window windows queries the Window Manager Service directly. The flag bit 0x00002000 corresponds to WindowManager.LayoutParams.FLAG_SECURE, confirming that hardware-level capture protection is currently enforced for that window surface."
    },
    {
      id: "q3",
      question: "An authentication token is never written to disk or logs, but you suspect it lingers in process memory after logout. How can an analyst extract and analyze the volatile Dalvik/ART heap on a test device?",
      options: [
        "Execute 'adb shell am dumpheap <pkg> /data/local/tmp/app.hprof', pull the file, convert it using hprof-conv, and search for tokens using strings or Eclipse Memory Analyzer",
        "Run 'adb backup -all -noapk'",
        "Execute 'adb shell pm path <pkg>'",
        "Decompile the APK using apktool d"
      ],
      correct: 0,
      explanation: "am dumpheap triggers an immediate ART memory dump. Because Android's HPROF format differs slightly from standard Java HPROF, hprof-conv converts it so tools like MAT or strings can locate lingering secrets and object references."
    },
    {
      id: "q4",
      question: "You are writing a Frida script to intercept certificate pinning checks that initialize during Application.onCreate(). Why must you execute Frida in Spawn mode (frida -U -f <pkg> --no-pause) rather than Attach mode?",
      options: [
        "Attach mode hooks an already running process, meaning early lifecycle methods like Application.onCreate() have already finished executing before Frida can inject hooks",
        "Spawn mode only operates on non-rooted production devices",
        "Attach mode disables the JavaScript V8 engine",
        "Spawn mode automatically re-signs the APK with a custom certificate"
      ],
      correct: 0,
      explanation: "In Attach mode, the process is already running, so static initializers and onCreate() have already executed. Spawn mode instructs frida-server to launch the process suspended, inject Frida runtime hooks, and resume execution."
    },
    {
      id: "q5",
      question: "You are hooking a method TokenValidator.verify(String token, int timeout) where another overload TokenValidator.verify(String token) exists in the same class. How do you specify the correct method overload in Frida?",
      options: [
        "TokenValidator.verify.overload('java.lang.String', 'int').implementation = function(token, timeout) { ... }",
        "TokenValidator.verify['String, int'].hook(function(token, timeout) { ... })",
        "TokenValidator.verify.args(2).implementation = function(token, timeout) { ... }",
        "Java.override('TokenValidator.verify', ['String', 'int'])"
      ],
      correct: 0,
      explanation: "Frida requires the .overload() method chained to the method name, passing the fully qualified Java class names (e.g. 'java.lang.String', 'int') as arguments to unambiguously select the desired method signature."
    },
    {
      id: "q6",
      question: "An application contains local Java checks that search for /system/bin/su and test-keys build tags. An analyst uses Frida to hook these methods and bypass root detection. Why is client-side heuristic root detection fundamentally limited?",
      options: [
        "The client runs in an untrusted environment where the device owner controls the kernel, runtime, and memory, allowing trivial hooking of user-space checks; true integrity requires server-verified hardware attestation (e.g., Google Play Integrity API)",
        "Heuristic checks only function on x86 processors",
        "Root detection is illegal under OWASP MASVS guidelines",
        "Root checks cannot run if the device has an active Wi-Fi connection"
      ],
      correct: 0,
      explanation: "The untrusted mobile client axiom dictates that any code running entirely client-side on a device controlled by an adversary can be hooked or modified. Server-side validation of cryptographically signed hardware attestation tokens from the TEE/StrongBox is necessary for resilient trust."
    }
  ],
  "android-10-crypto": [
    {
      id: "q1",
      question: "During static analysis of a local document vault, you observe Cipher.getInstance(\"AES/ECB/PKCS5Padding\"). Why is Electronic Codebook (ECB) mode forbidden for encrypting multi-block data?",
      options: [
        "ECB encrypts each 16-byte block independently under the same key without an IV, causing identical plaintext blocks to produce identical ciphertext blocks and preserving data patterns",
        "ECB mode requires internet connectivity to generate keys",
        "ECB only operates on 56-bit DES keys",
        "ECB mode automatically disables Android SELinux"
      ],
      correct: 0,
      explanation: "In ECB mode, block encryption is deterministic and independent. Identical plaintext blocks produce identical ciphertext blocks, leaking structural patterns and enabling block manipulation attacks."
    },
    {
      id: "q2",
      question: "What critical cryptographic vulnerabilities occur when two distinct documents are encrypted using AES-GCM under the same encryption key and the same 12-byte initialization vector (IV)?",
      options: [
        "Loss of confidentiality (XOR of ciphertexts equals XOR of plaintexts) and loss of authenticity (allows recovering the GHASH subkey H to forge authentication tags)",
        "The Android Keystore automatically revokes the application's package signature",
        "The encryption speed drops by a factor of 1024",
        "The device immediately triggers a factory reset"
      ],
      correct: 0,
      explanation: "GCM mode uses counter mode keystreams. Reusing an IV destroys the one-time pad property (C1 ⊕ C2 = P1 ⊕ P2) and allows the Forbidden Attack to compute the GHASH key H, forging valid tags for arbitrary payloads."
    },
    {
      id: "q3",
      question: "When deriving an AES-256 encryption key from a user-supplied password using PBEKeySpec, which parameters are required to prevent precomputation and rainbow table attacks?",
      options: [
        "A cryptographically random unique per-user salt generated via SecureRandom combined with a high iteration count (e.g., 120,000+ iterations of PBKDF2WithHmacSHA256)",
        "A static hardcoded salt array shared across all installations",
        "Single-iteration MD5 hashing",
        "Converting the password string directly to UTF-8 bytes without hashing"
      ],
      correct: 0,
      explanation: "Password-based key derivation requires a unique, high-entropy cryptographic salt per user to defeat precomputed rainbow tables, along with sufficient iterations to resist high-speed GPU dictionary attacks."
    },
    {
      id: "q4",
      question: "An application gates access to confidential notes by calling BiometricPrompt.authenticate(promptInfo) without passing a CryptoObject. Why is this implementation insecure against an adversary with a rooted device?",
      options: [
        "The authentication is purely a client-side boolean control-flow callback; an attacker can hook onAuthenticationSucceeded() with Frida to bypass authentication without providing any biometric input",
        "BiometricPrompt cannot be used on devices with fingerprint sensors",
        "It disables Android hardware encryption",
        "It sends the user's raw biometric image to the server in cleartext"
      ],
      correct: 0,
      explanation: "Without a CryptoObject, no cryptographic operation depends on the biometric verification. Hooking onAuthenticationSucceeded() allows an attacker to execute the downstream navigation logic without touching the sensor."
    },
    {
      id: "q5",
      question: "How does binding a Cipher to BiometricPrompt.CryptoObject prevent runtime hook bypasses on rooted devices?",
      options: [
        "The underlying AES key is held inside hardware (TEE/StrongBox) with setUserAuthenticationRequired(true); even if the callback is hooked, calling cipher.doFinal() throws UserNotAuthenticatedException because hardware refused to unlock the key",
        "The CryptoObject re-compiles the Dalvik VM into native assembly",
        "The CryptoObject takes a photo of the attacker using the front camera",
        "It forces the Android kernel to reboot into safe mode"
      ],
      correct: 0,
      explanation: "With CryptoObject, the hardware Keystore physically enforces that cryptographic operations fail unless an authenticated biometric verification signal was provided to the TEE/StrongBox for that specific operation."
    },
    {
      id: "q6",
      question: "Why does server-side Key Attestation (or Google Play Integrity API) provide stronger security guarantees than local checks for /system/bin/su?",
      options: [
        "Local checks run on an untrusted client controlled by the user, whereas Key Attestation generates an X.509 certificate chain signed by Google's Root CA inside the hardware TEE, certifying verified boot and patch status directly to the server",
        "The su binary is required on all Android production builds",
        "Key Attestation disables cellular networking",
        "Local checks are encrypted with SHA-1"
      ],
      correct: 0,
      explanation: "Under the Untrusted Mobile Client Axiom, purely client-side heuristic checks can be intercepted and forged. Key Attestation uses silicon-embedded hardware private keys in the TEE to sign attestation records verifiable by the backend."
    }
  ],
  "android-11-release": [
    {
      id: "q1",
      question: "In a non-static instance method in Smali assembly, which register convention is strictly enforced by the Dalvik/ART virtual machine?",
      options: [
        "Register p0 always holds the this reference to the current object instance, while p1, p2, ... hold the incoming method arguments",
        "Register v0 holds the return value of all future methods",
        "Register p0 is reserved exclusively for Linux kernel system calls",
        "Instance methods cannot access local registers"
      ],
      correct: 0,
      explanation: "In non-static instance methods in Dalvik/Smali, p0 is implicitly assigned to this. Local variables use registers v0, v1, ..., and method parameters start at p1."
    },
    {
      id: "q2",
      question: "You are analyzing a method .method public isLicensed()Z. It executes a validation check and branches with if-eqz v0, :not_licensed. How can you patch this bytecode using apktool to make the app always report a valid license?",
      options: [
        "Replace the method body with const/4 v0, 0x1 followed by return v0, then rebuild and re-sign the APK",
        "Delete the AndroidManifest.xml file",
        "Run zipalign -c 4 on the source folder",
        "Rename the APK file to license.patch"
      ],
      correct: 0,
      explanation: "In Smali, const/4 v0, 0x1 loads boolean true (integer 1) into register v0, and return v0 returns it immediately, bypassing all license checks and branching logic."
    },
    {
      id: "q3",
      question: "You decompile an APK obfuscated with R8 where all business classes are renamed (a.a, b.c). Why are Android framework SDK calls (such as SharedPreferences.getString() or Cipher.getInstance()) still visible in plaintext?",
      options: [
        "Android OS framework classes and standard runtime SDK signatures cannot be renamed by R8 because the Android operating system expects exact symbol names at runtime",
        "R8 is unable to process Java strings",
        "Obfuscation only applies to AndroidManifest.xml",
        "ProGuard only runs on debug builds"
      ],
      correct: 0,
      explanation: "R8 can only rename internal application symbols. External framework libraries and Android SDK classes must retain their exact method signatures so the Dalvik/ART VM can link and execute them at runtime."
    },
    {
      id: "q4",
      question: "In a compiled native shared library (libsecurity.so), you find no exported functions matching Java_com_example_*, yet the Java class calls external fun checkLicense(). How was this native function bound?",
      options: [
        "Dynamic registration via JNI_OnLoad() using env->RegisterNatives(), which programmatically maps Java method names to C function pointers at runtime",
        "The native library was compiled for iOS rather than Android",
        "Dalvik bytecode does not support JNI",
        "The function was converted into a JavaScript interface"
      ],
      correct: 0,
      explanation: "JNI supports dynamic registration via RegisterNatives called inside JNI_OnLoad. This allows developers to map internal C function pointers without exposing standard mangled symbol names in .dynsym."
    },
    {
      id: "q5",
      question: "An exported BroadcastReceiver extracts intent.getStringExtra(\"plugin_url\"), downloads a .dex file to external storage, and passes the path to DexClassLoader. What is the primary security flaw?",
      options: [
        "Arbitrary Dynamic Code Execution: any app on the device can supply a path or malicious payload to execute untrusted code with the permissions and UID of the host application",
        "DexClassLoader causes the device battery to drain instantly",
        "BroadcastReceivers cannot receive string extras",
        "External storage automatically encrypts all DEX files"
      ],
      correct: 0,
      explanation: "Loading unverified DEX code from caller-controlled paths or writable external storage allows local or network adversaries to inject arbitrary code directly into the target app process."
    },
    {
      id: "q6",
      question: "Starting in Android 14 (API 34), what security restriction is enforced by the operating system when an application attempts to dynamically load code files via DexClassLoader?",
      options: [
        "The dynamically loaded file must be marked strictly read-only (e.g. via file.setReadOnly() or permissions 0400) before loading; otherwise, Android throws a SecurityException",
        "Dynamic code loading is completely banned and unsupported on all Android devices",
        "The DEX file must be signed with a hardware RSA-8192 key",
        "The app must have android.permission.INTERNET"
      ],
      correct: 0,
      explanation: "Android 14 mandates that files loaded dynamically must be read-only to prevent other processes or threads from tampering with or swapping the bytecode (TOCTOU attacks) while it is being loaded."
    }
  ],
  "android-12-case": [
    {
      id: "q1",
      question: "During an audit, an analyst notices that InAppBrowserActivity uses a WebView and an unrelated PluginLoader helper uses DexClassLoader. Why is it an assessment error to report 'Critical Remote Code Execution via WebView Plugin Loading' without further static or dynamic proof?",
      options: [
        "Cross-fixture evidence fabrication: unless static cross-references or dynamic execution traces prove that the WebView or its bridge actually passes attacker input to DexClassLoader, the two components are unrelated and the claimed kill chain is an unverified hypothesis",
        "DexClassLoader is blocked by Google Play",
        "WebViews cannot execute JavaScript",
        "Multiple findings must always be combined into a single CVE"
      ],
      correct: 0,
      explanation: "In professional assessment methodology, each step of an attack chain requires verifiable source-to-sink reachability. Fabricating links between disparate components without evidence undermines audit integrity and client trust."
    },
    {
      id: "q2",
      question: "When conducting an authorized penetration test of an Android banking app, which activity constitutes a violation of standard Rules of Engagement (ROE)?",
      options: [
        "Sending volumetric fuzzing payloads or denial-of-service traffic directly against production backend APIs without explicit out-of-band authorization and scheduled maintenance windows",
        "Decompiling the APK using JADX-GUI on a local workstation",
        "Analyzing local SQLite databases in /data/data/<pkg>/ on an owned test device",
        "Disassembling native .so files using Ghidra"
      ],
      correct: 0,
      explanation: "Mobile application ROEs strictly delineate local client testing from backend infrastructure. Attacking production APIs without written authorization risks service outages and violates testing agreements."
    },
    {
      id: "q3",
      question: "What two cryptographic values must a penetration tester record and include in the Assessment Scope table to definitively identify the exact target build evaluated?",
      options: [
        "The SHA-256 digest of the APK file (sha256sum app.apk) and the SHA-256 fingerprint of the developer's signing certificate (apksigner verify --print-certs app.apk)",
        "The user's Google Play password and device IMEI",
        "The Wi-Fi router BSSID and WPA2 passphrase",
        "The local IP address of the ADB workstation"
      ],
      correct: 0,
      explanation: "The package SHA-256 hash guarantees exact binary immutability, while the signing certificate fingerprint proves the APK was signed by the authorized entity, preventing confusion with re-signed or debug builds."
    },
    {
      id: "q4",
      question: "When verifying an authorization fix in a mobile app where Alice was previously able to view Bob's notes, why is testing ONLY the negative control (confirming Alice cannot access Bob's note) insufficient?",
      options: [
        "A positive control (confirming Alice can still successfully access Alice's own notes) is essential to prove that the authorization patch did not introduce a regression that breaks legitimate application functionality",
        "Negative controls are forbidden by OWASP MASVS",
        "Positive controls automatically generate a retest certificate",
        "The Android kernel requires two requests per process"
      ],
      correct: 0,
      explanation: "Robust retesting requires both positive controls (legitimate workflows still succeed) and negative controls (unauthorized actions are blocked), preventing regressions that break core functionality."
    },
    {
      id: "q5",
      question: "In the 12-Step Lab Evidence Contract, what is the critical difference between Step 5 (Static Evidence) and Step 7 (Observation)?",
      options: [
        "Static Evidence documents code patterns and decompiled source excerpts that form the vulnerability hypothesis, whereas Observation records the exact command transcript, output, or file-system proof witnessed on an actual device during execution",
        "Static Evidence is written in English, while Observation must be in binary machine code",
        "Observation is only performed by automated scanners",
        "Static Evidence requires a physical hardware security key"
      ],
      correct: 0,
      explanation: "Static analysis only indicates potential risk or reachable sinks. Step 7 (Observation) provides concrete proof that the vulnerability was triggered, capturing reproducible terminal commands and device responses."
    },
    {
      id: "q6",
      question: "A development team informs you that an IDOR vulnerability has been resolved in Git and sends you a pull request link. What must the security analyst do before updating the finding status to 'Remediated'?",
      options: [
        "Obtain the newly compiled release APK, verify its SHA-256 digest, install it on an owned test device, and execute both positive and negative controls to observe that the exploit vector is eliminated without side effects",
        "Immediately close the finding and sign the final report",
        "Retest using the original vulnerable APK from the initial test",
        "Delete the vulnerability finding from the report without notice"
      ],
      correct: 0,
      explanation: "A code commit in source control does not prove a fix works in production. The analyst must test the newly compiled binary artifact to confirm the remediation is effective and does not cause regressions."
    }
  ],
}
