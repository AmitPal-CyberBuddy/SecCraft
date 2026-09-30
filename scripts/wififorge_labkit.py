"""
WiFiForge Lab Kit — honest 802.11 lab artifact toolkit (pure stdlib).

Why this exists
---------------
The earlier lab captures in this repo were hand-rolled byte blobs that did not
decode as the protocols they claimed to be (no IP/UDP encapsulation for RADIUS,
EAPOL-Key frames without nonces/MIC, RSN capabilities with the wrong bit order,
`.pcapng` files that were actually classic pcap, ...).  Every filter taught in the
labs therefore returned nothing in Wireshark/tshark.

This module builds *structurally valid* 802.11 / EAPOL-Key / 802.1X / RADIUS
frames and writes real PCAPNG files, so that:

  * the display filters in the curriculum actually match frames,
  * EAPOL-Key MICs, PMKIDs and RADIUS authenticators are *cryptographically real*
    (computed from the lab PSK / RADIUS shared secret),
  * the offline-audit labs (hcxpcapngtool + hashcat -m 22000) can be run for real
    against the provided captures.

What is real vs. synthetic is documented per artifact in
`frontend/public/pcaps/MANIFEST.md` — the toolkit never claims cryptographic
validity it does not have (see `sae_commit()`).

Reference points
----------------
* IEEE 802.11-2020 §9.4 (frames), §9.4.2.24 (RSNE), §12.7 (PMF, MFPC/MFPR bits)
* RFC 3394 (NIST key wrap — used for EAPOL-Key data when a GTK is delivered)
* RFC 3748 (EAP), RFC 2865/2866 (RADIUS), RFC 2548 (MS-CHAPv2 vendor attributes)
* IEEE 802.1X-2020 (EAPOL), RFC 2759 (MS-CHAPv2)

Only stdlib is used so the generator runs inside the zero-cost/offline
philosophy of the project (no scapy install required).
"""

from __future__ import annotations

import hashlib
import hmac
import math
import struct
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

# ---------------------------------------------------------------------------
# 802.11 constants (use these instead of magic numbers in lab code)
# ---------------------------------------------------------------------------

# Frame Control: type
TYPE_MGMT = 0
TYPE_CTRL = 1
TYPE_DATA = 2

# Management subtypes
SUBTYPE_ASSOC_REQ = 0
SUBTYPE_ASSOC_RESP = 1
SUBTYPE_REASSOC_REQ = 2
SUBTYPE_REASSOC_RESP = 3
SUBTYPE_PROBE_REQ = 4
SUBTYPE_PROBE_RESP = 5
SUBTYPE_BEACON = 8
SUBTYPE_ATIM = 9
SUBTYPE_DISASSOC = 10
SUBTYPE_AUTH = 11
SUBTYPE_DEAUTH = 12
SUBTYPE_ACTION = 13
SUBTYPE_ACTION_NOACK = 14

# Data subtypes
SUBTYPE_DATA = 0
SUBTYPE_QOS_DATA = 8
SUBTYPE_NULL = 4

MGMT_SUBTYPE_NAMES = {
    SUBTYPE_ASSOC_REQ: "Association Request",
    SUBTYPE_ASSOC_RESP: "Association Response",
    SUBTYPE_REASSOC_REQ: "Reassociation Request",
    SUBTYPE_REASSOC_RESP: "Reassociation Response",
    SUBTYPE_PROBE_REQ: "Probe Request",
    SUBTYPE_PROBE_RESP: "Probe Response",
    SUBTYPE_BEACON: "Beacon",
    SUBTYPE_ATIM: "ATIM",
    SUBTYPE_DISASSOC: "Disassociation",
    SUBTYPE_AUTH: "Authentication",
    SUBTYPE_DEAUTH: "Deauthentication",
    SUBTYPE_ACTION: "Action",
    SUBTYPE_ACTION_NOACK: "Action No Ack",
}

# Information element IDs
IE_SSID = 0
IE_SUPPORTED_RATES = 1
IE_DS_PARAM = 3
IE_TIM = 5
IE_COUNTRY = 7
IE_RSN = 48
IE_HT_CAP = 45
IE_HT_OP = 61
IE_EXT_CAP = 127
IE_VHT_CAP = 191
IE_VHT_OP = 192
IE_VENDOR = 221
IE_RSNXE = 244
IE_EXTENSION = 255

# AKM suites (RSNE, OUI 00-0F-AC) — IEEE 802.11-2020 Table 9-151 / Wireshark
AKM_8021X = 1
AKM_PSK = 2
AKM_FT_8021X = 3
AKM_FT_PSK = 4
AKM_8021X_SHA256 = 5
AKM_PSK_SHA256 = 6
AKM_TDLS = 7
AKM_SAE = 8
AKM_FT_SAE = 9
AKM_AP_PEER_KEY = 10
AKM_8021X_SUITE_B = 11
AKM_8021X_SUITE_B_192 = 12
AKM_FILS_SHA256 = 14
AKM_FILS_SHA384 = 15
AKM_FT_FILS_SHA256 = 16
AKM_FT_FILS_SHA384 = 17
AKM_OWE = 18
AKM_SAE_EXT_KEY = 24
AKM_FT_SAE_EXT_KEY = 25
AKM_8021X_SUITE_B_192_EXT = 26

AKM_NAMES = {
    AKM_8021X: "802.1X (EAP)",
    AKM_PSK: "PSK",
    AKM_FT_8021X: "FT-802.1X",
    AKM_FT_PSK: "FT-PSK",
    AKM_8021X_SHA256: "802.1X-SHA256",
    AKM_PSK_SHA256: "PSK-SHA256",
    AKM_TDLS: "TDLS",
    AKM_SAE: "SAE (WPA3-Personal)",
    AKM_FT_SAE: "FT-SAE",
    AKM_8021X_SUITE_B: "802.1X Suite B",
    AKM_8021X_SUITE_B_192: "802.1X Suite B 192-bit",
    AKM_OWE: "OWE (Enhanced Open)",
    AKM_SAE_EXT_KEY: "SAE-EXT-KEY (WPA3-Personal, 256-bit)",
    AKM_FT_SAE_EXT_KEY: "FT-SAE-EXT-KEY",
}

# Cipher suites (RSNE)
CIPHER_WEP40 = 1
CIPHER_TKIP = 2
CIPHER_CCMP_128 = 4
CIPHER_WEP104 = 5
CIPHER_BIP_CMAC_128 = 6
CIPHER_GCMP_128 = 8
CIPHER_GCMP_256 = 9
CIPHER_CCMP_256 = 10
CIPHER_BIP_GMAC_128 = 11
CIPHER_BIP_GMAC_256 = 12
CIPHER_BIP_CMAC_256 = 13

CIPHER_NAMES = {
    CIPHER_WEP40: "WEP-40",
    CIPHER_TKIP: "TKIP",
    CIPHER_CCMP_128: "CCMP-128",
    CIPHER_WEP104: "WEP-104",
    CIPHER_BIP_CMAC_128: "BIP-CMAC-128",
    CIPHER_GCMP_128: "GCMP-128",
    CIPHER_GCMP_256: "GCMP-256",
    CIPHER_CCMP_256: "CCMP-256",
    CIPHER_BIP_GMAC_256: "BIP-GMAC-256",
}

# RSN Capabilities — IEEE 802.11 RSN capabilities (little-endian 16-bit field).
# Bits 2–3 and 4–5 are two-bit replay counter subfields, not single booleans.
RSNCAP_PREAUTH = 1 << 0
RSNCAP_NO_PAIRWISE = 1 << 1
RSNCAP_PTKSA_REPLAY = 0x000c
RSNCAP_GTKSA_REPLAY = 0x0030
RSNCAP_MFPR = 1 << 6
RSNCAP_MFPC = 1 << 7
RSNCAP_JOINT_MULTIBAND = 1 << 8
RSNCAP_PEERKEY = 1 << 9

# Deauthentication / disassociation reason codes (IEEE 802.11-2020 Table 9-49)
REASON_UNSPECIFIED = 1
REASON_PREV_AUTH_INVALID = 2
REASON_STA_LEAVING = 3
REASON_INACTIVITY = 4
REASON_AP_UNABLE = 5
REASON_CLASS2_FRAME = 6
REASON_CLASS3_FRAME = 7
REASON_ASSOC_LEFT_BSS = 8
REASON_NOT_AUTHENTICATED = 9
REASON_POWER_CAP_BAD = 10
REASON_SUPPORTED_CHANNELS_BAD = 11
REASON_BSS_TRANSITION = 12
REASON_REASON_UNACCEPTABLE = 13
REASON_MIC_FAILURE = 14
REASON_4WAY_TIMEOUT = 15
REASON_GROUP_KEY_UPDATE = 16
REASON_IE_DIFFERENT = 17
REASON_MULTICAST_CIPHER_NOT_VALID = 18
REASON_UNICAST_CIPHER_NOT_VALID = 19
REASON_AKMP_NOT_VALID = 20
REASON_UNSUPPORTED_RSNE = 21
REASON_8021X_AUTH_FAILED = 23
REASON_CIPHER_REJECTED = 29
REASON_SA_QUERY_TIMEOUT = 39

REASON_NAMES = {
    REASON_UNSPECIFIED: "Unspecified",
    REASON_PREV_AUTH_INVALID: "Previous authentication no longer valid",
    REASON_STA_LEAVING: "STA is leaving (disassoc) / no longer valid (deauth)",
    REASON_INACTIVITY: "Disassociated due to inactivity",
    REASON_AP_UNABLE: "Disassociated, AP unable to handle all STAs",
    REASON_CLASS2_FRAME: "Class 2 frame from non-authenticated STA",
    REASON_CLASS3_FRAME: "Class 3 frame from non-associated STA",
    REASON_ASSOC_LEFT_BSS: "Disassociated, STA is leaving BSS",
    REASON_NOT_AUTHENTICATED: "STA not authenticated to this BSS",
    REASON_MIC_FAILURE: "MIC failure (TKIP countermeasures)",
    REASON_4WAY_TIMEOUT: "4-way handshake timeout",
    REASON_GROUP_KEY_UPDATE: "Group key handshake timeout",
    REASON_IE_DIFFERENT: "Information element in 4-way handshake differs",
    REASON_8021X_AUTH_FAILED: "IEEE 802.1X authentication failed",
    REASON_SA_QUERY_TIMEOUT: "SA Query timeout",
}

# EAPOL-Key descriptor types
EAPOL_KEY_DESCRIPTOR_RSN = 2
EAPOL_KEY_DESCRIPTOR_WPA = 254

# EAPOL-Key information field bits (IEEE 802.1X-2020 §11.9.1)
KEYINFO_KEY_TYPE = 1 << 3       # 1 = Pairwise, 0 = Group
KEYINFO_INSTALL = 1 << 6
KEYINFO_ACK = 1 << 7
KEYINFO_MIC = 1 << 8
KEYINFO_SECURE = 1 << 9
KEYINFO_ERROR = 1 << 10
KEYINFO_REQUEST = 1 << 11
KEYINFO_ENCRYPTED_KEY_DATA = 1 << 12
KEYINFO_SMK = 1 << 13

# EAP codes / types
EAP_REQUEST = 1
EAP_RESPONSE = 2
EAP_SUCCESS = 3
EAP_FAILURE = 4
EAP_TYPE_IDENTITY = 1
EAP_TYPE_NAK = 3
EAP_TYPE_MD5 = 4
EAP_TYPE_TLS = 13
EAP_TYPE_LEAP = 17
EAP_TYPE_TTLS = 21
EAP_TYPE_PEAP = 25
EAP_TYPE_MSCHAPV2 = 26
EAP_TYPE_FAST = 43
EAP_TYPE_WSC = 254

# RADIUS codes (RFC 2865 / RFC 5176)
RADIUS_ACCESS_REQUEST = 1
RADIUS_ACCESS_ACCEPT = 2
RADIUS_ACCESS_REJECT = 3
RADIUS_ACCOUNTING_REQUEST = 4
RADIUS_ACCOUNTING_RESPONSE = 5
RADIUS_ACCESS_CHALLENGE = 11
RADIUS_DISCONNECT_REQUEST = 40
RADIUS_COA_REQUEST = 43
RADIUS_COA_ACK = 44

# RADIUS attribute types
ATTR_USER_NAME = 1
ATTR_USER_PASSWORD = 2
ATTR_NAS_IP = 4
ATTR_NAS_PORT = 5
ATTR_SERVICE_TYPE = 6
ATTR_FRAMED_MTU = 12
ATTR_STATE = 24
ATTR_REPLY_MESSAGE = 18
ATTR_CALLED_STATION_ID = 30
ATTR_CALLING_STATION_ID = 31
ATTR_NAS_IDENTIFIER = 32
ATTR_ACCT_STATUS_TYPE = 40
ATTR_ACCT_SESSION_ID = 44
ATTR_NAS_PORT_TYPE = 61
ATTR_TUNNEL_TYPE = 64
ATTR_TUNNEL_MEDIUM_TYPE = 65
ATTR_TUNNEL_PRIVATE_GROUP_ID = 81
ATTR_EAP_MESSAGE = 79
ATTR_MESSAGE_AUTHENTICATOR = 80
ATTR_NAS_PORT_ID = 87
ATTR_VENDOR_SPECIFIC = 26

ATTR_NAMES = {
    ATTR_USER_NAME: "User-Name",
    ATTR_NAS_IP: "NAS-IP-Address",
    ATTR_NAS_PORT: "NAS-Port",
    ATTR_SERVICE_TYPE: "Service-Type",
    ATTR_STATE: "State",
    ATTR_CALLED_STATION_ID: "Called-Station-Id",
    ATTR_CALLING_STATION_ID: "Calling-Station-Id",
    ATTR_NAS_IDENTIFIER: "NAS-Identifier",
    ATTR_TUNNEL_TYPE: "Tunnel-Type",
    ATTR_TUNNEL_MEDIUM_TYPE: "Tunnel-Medium-Type",
    ATTR_TUNNEL_PRIVATE_GROUP_ID: "Tunnel-Private-Group-Id",
    ATTR_EAP_MESSAGE: "EAP-Message",
    ATTR_MESSAGE_AUTHENTICATOR: "Message-Authenticator",
    ATTR_NAS_PORT_ID: "NAS-Port-Id",
    ATTR_VENDOR_SPECIFIC: "Vendor-Specific",
}

# MS-CHAPv2 vendor attributes (RFC 2548), vendor id 311 (Microsoft)
MS_VENDOR_ID = 311
MS_ATTR_MPPE_SEND_KEY = 16
MS_ATTR_MPPE_RECV_KEY = 17
MS_ATTR_CHAP_CHALLENGE = 3
MS_ATTR_CHAP_PASSWORD = 25

# WPS (Wi-Fi Simple Configuration) — vendor IE OUI 00:50:F2, OUI type 0x04
WPS_OUI = b"\x00\x50\xf2"
WPS_OUI_TYPE = b"\x04"
WSC_ATTR_VERSION = 0x104A
WSC_ATTR_CONFIG_METHODS = 0x1008
WSC_ATTR_AP_SETUP_LOCKED = 0x1057
WSC_ATTR_SELECTED_REGISTRAR = 0x1041
WSC_ATTR_DEVICE_PASSWORD_ID = 0x1012
WSC_ATTR_RF_BANDS = 0x103C
WSC_ATTR_WPS_STATE = 0x1044
WSC_ATTR_DEVICE_NAME = 0x1011
WSC_ATTR_MANUFACTURER = 0x1021
WSC_ATTR_MODEL_NAME = 0x1023

WPS_CONFIG_LABEL = 0x0004
WPS_CONFIG_DISPLAY = 0x0008
WPS_CONFIG_PUSHBUTTON = 0x0080


# ---------------------------------------------------------------------------
# Crypto helpers (all values are real, not placeholders)
# ---------------------------------------------------------------------------

def pmk_from_psk(passphrase: str, ssid: str) -> bytes:
    """PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096, 256)  [IEEE 802.11-2020]."""
    return hashlib.pbkdf2_hmac("sha1", passphrase.encode(), ssid.encode(), 4096, 32)


def prf512(pmk: bytes, a: bytes, b: bytes, aa: bytes, spa: bytes,
           anonce: bytes, snonce: bytes) -> bytes:
    """PTK = PRF-512(PMK, "Pairwise key expansion", min(AA,SPA)|max|min(nonces)|max)."""
    data = a + b + min(aa, spa) + max(aa, spa) + min(anonce, snonce) + max(anonce, snonce)
    out = b""
    for i in range(4):
        out += hmac.new(pmk, bytes([i]) + b"Pairwise key expansion" + data, hashlib.sha1).digest()
    return out[:64]


def ptk_from_pmk(pmk: bytes, ap_mac: bytes, sta_mac: bytes,
                 anonce: bytes, snonce: bytes) -> bytes:
    return prf512(pmk, b"", b"", ap_mac, sta_mac, anonce, snonce)


def eapol_key_mic(kck: bytes, eapol_frame: bytes) -> bytes:
    """MIC over the whole EAPOL frame with the MIC field zeroed (WPA2/CCMP)."""
    frame = bytearray(eapol_frame)
    frame[EAPOL_KEY_MIC_OFFSET:EAPOL_KEY_MIC_OFFSET + 16] = b"\x00" * 16
    return hmac.new(kck, bytes(frame), hashlib.sha1).digest()[:16]


def pmkid(ap_mac: bytes, sta_mac: bytes, pmk: bytes) -> bytes:
    """PMKID = HMAC-SHA1-128(PMK, "PMK Name" | AA | SPA)."""
    return hmac.new(pmk, b"PMK Name" + ap_mac + sta_mac, hashlib.sha1).digest()[:16]


def radius_message_authenticator(packet_with_zeroed_ma: bytes, secret: bytes) -> bytes:
    """HMAC-MD5 over the Access-Request with Message-Authenticator zeroed (RFC 3579)."""
    return hmac.new(secret, packet_with_zeroed_ma, hashlib.md5).digest()


def radius_response_authenticator(code: int, identifier: int, length: int,
                                  request_authenticator: bytes, attrs: bytes,
                                  secret: bytes) -> bytes:
    """MD5(Code+ID+Length+RequestAuth+Attributes+Secret) (RFC 2865 §3)."""
    blob = struct.pack("!BBH", code, identifier, length) + request_authenticator + attrs + secret
    return hashlib.md5(blob).digest()


def _md4(data: bytes) -> bytes:
    """Pure-Python MD4 (RFC 1320) — OpenSSL 3 no longer ships MD4, and NT-hash needs it."""
    def lrot(x: int, n: int) -> int:
        x &= 0xFFFFFFFF
        return ((x << n) | (x >> (32 - n))) & 0xFFFFFFFF

    def f(x: int, y: int, z: int) -> int:
        return (x & y) | (~x & z)

    def g(x: int, y: int, z: int) -> int:
        return (x & y) | (x & z) | (y & z)

    def h(x: int, y: int, z: int) -> int:
        return x ^ y ^ z

    msg = bytearray(data)
    bit_len = (8 * len(msg)) & 0xFFFFFFFFFFFFFFFF
    msg.append(0x80)
    while len(msg) % 64 != 56:
        msg.append(0)
    msg += struct.pack("<Q", bit_len)
    a0, b0, c0, d0 = 0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476

    for off in range(0, len(msg), 64):
        x = list(struct.unpack("<16I", msg[off:off + 64]))
        a, b, c, d = a0, b0, c0, d0
        # Round 1
        for i in range(0, 16, 4):
            a = lrot(a + f(b, c, d) + x[i], 3)
            d = lrot(d + f(a, b, c) + x[i + 1], 7)
            c = lrot(c + f(d, a, b) + x[i + 2], 11)
            b = lrot(b + f(c, d, a) + x[i + 3], 19)
        # Round 2
        for i in range(4):
            a = lrot(a + g(b, c, d) + x[i] + 0x5A827999, 3)
            d = lrot(d + g(a, b, c) + x[i + 4] + 0x5A827999, 5)
            c = lrot(c + g(d, a, b) + x[i + 8] + 0x5A827999, 9)
            b = lrot(b + g(c, d, a) + x[i + 12] + 0x5A827999, 13)
        # Round 3
        order = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
        for i in range(4):
            a = lrot(a + h(b, c, d) + x[order[4 * i + 0]] + 0x6ED9EBA1, 3)
            d = lrot(d + h(a, b, c) + x[order[4 * i + 1]] + 0x6ED9EBA1, 9)
            c = lrot(c + h(d, a, b) + x[order[4 * i + 2]] + 0x6ED9EBA1, 11)
            b = lrot(b + h(c, d, a) + x[order[4 * i + 3]] + 0x6ED9EBA1, 15)
        a0 = (a0 + a) & 0xFFFFFFFF
        b0 = (b0 + b) & 0xFFFFFFFF
        c0 = (c0 + c) & 0xFFFFFFFF
        d0 = (d0 + d) & 0xFFFFFFFF
    return struct.pack("<4I", a0, b0, c0, d0)


def mschapv2_challenge_hash(authenticator_challenge: bytes, peer_challenge: bytes,
                            username: str) -> bytes:
    """RFC 2759 §8.1: ChallengeHash = SHA1(PeerChallenge || AuthenticatorChallenge || UserName)[0:8].

    Note the order: the **peer** challenge comes first. Omitting the peer challenge (or the
    username) yields an NT-Response that no standard implementation or hashcat -m 5500 will match.
    """
    return hashlib.sha1(peer_challenge + authenticator_challenge + username.encode()).digest()[:8]


def mschapv2_nt_response(password: str, challenge_hash: bytes) -> Tuple[bytes, bytes]:
    """NT-Response = DESL(NTHash[0:7], c) | DESL(NTHash[7:14], c) | DESL(NTHash[14:16]||0x00*5, c).

    ``challenge_hash`` is the 8-byte output of :func:`mschapv2_challenge_hash`.
    Returns (nt_response, nt_hash).
    """
    nt_hash = _md4(password.encode("utf-16-le"))
    c = challenge_hash[:8]
    response = _desl(nt_hash[:7], c) + _desl(nt_hash[7:14], c) + _desl(nt_hash[14:16] + b"\x00" * 5, c)
    return response, nt_hash


def mschapv2_credentials(password: str, authenticator_challenge: bytes, peer_challenge: bytes,
                         username: str) -> Tuple[bytes, bytes, bytes]:
    """Full RFC 2759 client-side derivation: returns (nt_response, nt_hash, challenge_hash)."""
    challenge_hash = mschapv2_challenge_hash(authenticator_challenge, peer_challenge, username)
    nt_response, nt_hash = mschapv2_nt_response(password, challenge_hash)
    return nt_response, nt_hash, challenge_hash


def mschapv2_challenge(challenge: bytes, name: str = "", identifier: int = 1) -> bytes:
    """MS-CHAPv2 Challenge message: Code, ID, MS-Length, Challenge, Name (RFC 2759 §4.1)."""
    assert len(challenge) == 16
    body = bytes([1, identifier]) + struct.pack("!H", 20 + len(name)) + challenge + name.encode()
    return body


def mschapv2_response(peer_challenge: bytes, nt_response: bytes, name_utf16: bytes = b"",
                      identifier: int = 1, reserved: bytes = b"\x00" * 8,
                      flags: int = 0) -> bytes:
    """MS-CHAPv2 Response message: Code, ID, MS-Length, PeerChallenge, Reserved, NT-Response, Flags, Name."""
    assert len(peer_challenge) == 16 and len(nt_response) == 24 and len(reserved) == 8
    body = bytes([2, identifier]) + struct.pack("!H", 53 + len(name_utf16))
    body += peer_challenge + reserved + nt_response + bytes([flags]) + name_utf16
    return body


def mschapv2_result(opcode: int, message: str = "", identifier: int = 1,
                    utf16_message: bool = False) -> bytes:
    """MS-CHAPv2 Success (3) / Failure (4) message."""
    text = message.encode("utf-16-le") if utf16_message else message.encode()
    return bytes([opcode, identifier]) + struct.pack("!H", 4 + len(text)) + text


def _desl(key7: bytes, data8: bytes) -> bytes:
    """DESL: expand 7-byte key to 8 bytes with parity, single DES ECB encrypt."""
    key = _expand_des_key(key7)
    return _des_ecb_encrypt(key, data8)


def _expand_des_key(key7: bytes) -> bytes:
    k = bytearray(8)
    k[0] = key7[0] & 0xFE
    k[1] = ((key7[0] << 7) | (key7[1] >> 1)) & 0xFE
    k[2] = ((key7[1] << 6) | (key7[2] >> 2)) & 0xFE
    k[3] = ((key7[2] << 5) | (key7[3] >> 3)) & 0xFE
    k[4] = ((key7[3] << 4) | (key7[4] >> 4)) & 0xFE
    k[5] = ((key7[4] << 3) | (key7[5] >> 5)) & 0xFE
    k[6] = ((key7[5] << 2) | (key7[6] >> 6)) & 0xFE
    k[7] = (key7[6] << 1) & 0xFE
    for i in range(8):
        k[i] = _set_odd_parity(k[i])
    return bytes(k)


def _set_odd_parity(b: int) -> int:
    bits = bin(b).count("1") - (b & 1)
    return b | 1 if bits % 2 == 0 else b & 0xFE


_DES_IP = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
           62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
           57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
           61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
_DES_FP = [40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31,
           38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29,
           36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27,
           34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25]
_DES_E = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13,
          12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25,
          24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1]
_DES_P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
          2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25]
_DES_PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18,
            10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36,
            63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22,
            14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4]
_DES_PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10,
            23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
            41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48,
            44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32]
_DES_SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
_DES_SBOX = [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
     0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
     4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
     15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10,
     3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
     0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15,
     13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8,
     13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
     13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7,
     1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15,
     13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
     10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4,
     3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9,
     14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
     4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14,
     11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11,
     10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
     9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6,
     4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1,
     13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
     1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2,
     6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7,
     1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
     7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8,
     2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
]


def _permute(block: int, table: Sequence[int], in_bits: int) -> int:
    out = 0
    for pos in table:
        out = (out << 1) | ((block >> (in_bits - pos)) & 1)
    return out


def _des_subkeys(key: bytes) -> List[int]:
    k = int.from_bytes(key, "big")
    cd = _permute(k, _DES_PC1, 64)
    c, d = cd >> 28, cd & 0x0FFFFFFF
    subkeys = []
    for shift in _DES_SHIFTS:
        c = ((c << shift) | (c >> (28 - shift))) & 0x0FFFFFFF
        d = ((d << shift) | (d >> (28 - shift))) & 0x0FFFFFFF
        subkeys.append(_permute((c << 28) | d, _DES_PC2, 56))
    return subkeys


def _des_ecb_encrypt(key: bytes, block: bytes) -> bytes:
    data = int.from_bytes(block, "big")
    data = _permute(data, _DES_IP, 64)
    left, right = data >> 32, data & 0xFFFFFFFF
    for subkey in _des_subkeys(key):
        expanded = _permute(right, _DES_E, 32) ^ subkey
        out = 0
        for i in range(8):
            chunk = (expanded >> (42 - 6 * i)) & 0x3F
            row = ((chunk & 0x20) >> 4) | (chunk & 1)
            col = (chunk >> 1) & 0x0F
            out = (out << 4) | _DES_SBOX[i][row * 16 + col]
        left, right = right, left ^ _permute(out, _DES_P, 32)
    return _permute((right << 32) | left, _DES_FP, 64).to_bytes(8, "big")


# ---------------------------------------------------------------------------
# Information elements
# ---------------------------------------------------------------------------

def ie(element_id: int, value: bytes) -> bytes:
    if len(value) > 255:
        raise ValueError(f"IE {element_id} too long ({len(value)} bytes)")
    return bytes([element_id, len(value)]) + value


def ie_ssid(ssid: str) -> bytes:
    raw = ssid.encode("utf-8")
    if len(raw) > 32:
        raise ValueError("SSID must be <= 32 bytes (IEEE 802.11-2020 §9.4.2.2)")
    return ie(IE_SSID, raw)


def ie_supported_rates() -> bytes:
    return ie(IE_SUPPORTED_RATES, bytes([0x82, 0x84, 0x8B, 0x96, 0x0C, 0x12, 0x18, 0x24]))


def ie_extended_rates() -> bytes:
    return ie(35, bytes([0x30, 0x48, 0x60, 0x6C]))


def ie_ds_param(channel: int) -> bytes:
    return ie(IE_DS_PARAM, bytes([channel]))


def ie_tim(dtim_period: int = 2, dtim_count: int = 0, bitmap: bytes = b"\x00\x00\x00\x00") -> bytes:
    return ie(IE_TIM, bytes([dtim_count, dtim_period, 0]) + bitmap)


def ie_country(country: str = "DE", first_channel: int = 1, bands: Sequence[Tuple[int, int, int]] = ((1, 13, 20),)) -> bytes:
    body = country.encode("ascii")[:2] + b"\x20" + bytes([first_channel, len(bands)])
    for first, last, power in bands:
        body += bytes([first, last, power]) + b"\x00"  # no environment/DFS byte 0 = unspecified
    return ie(IE_COUNTRY, body)


def ie_ht_cap() -> bytes:
    # HT Capabilities: 26 bytes. LDPC + 20/40 MHz + SGI-20 + MCS 0-15 (1 SS).
    body = struct.pack("<H", 0x016E) + b"\x1b" + b"\x00" * 4 + b"\x00" * 16 + b"\x00"
    return ie(IE_HT_CAP, body[:26])


def ie_ht_op(primary_channel: int, secondary_offset: int = 1, width_40: bool = True) -> bytes:
    # HT Operation: primary channel, HT info, ... (width/offset in "HT information" byte 1)
    info = 0x01 if width_40 else 0x00
    info |= (secondary_offset & 0x03) << 1
    return ie(IE_HT_OP, bytes([primary_channel, info]) + b"\x00" * 20)


def ie_vht_cap() -> bytes:
    return ie(IE_VHT_CAP, struct.pack("<I", 0x0F8250A0) + struct.pack("<HH", 0x03C0, 0x0000) + b"\x00" * 4)


def ie_vht_op(channel_width: int = 1, center_freq_0: int = 42, center_freq_1: int = 0) -> bytes:
    return ie(IE_VHT_OP, bytes([channel_width, center_freq_0, center_freq_1]) + struct.pack("<H", 0x03C0))


def ie_he_cap() -> bytes:
    # HE Capabilities: MAC (6) + PHY (11) + MCS (12) + PPET + device class
    mac = struct.pack("<H", 0x000C) + b"\x00" * 4
    phy = b"\x03" + struct.pack("<I", 0x0010D000)[:4] + b"\x00" * 6
    mcs = bytes([0xFA, 0xF9, 0x02, 0x00]) * 3
    return ie(IE_EXTENSION, bytes([35]) + mac + phy + mcs + b"\x00" * 4)


def ie_ext_cap(byte0: int = 0x04, byte4: int = 0x40, byte7: int = 0x00, byte9: int = 0x00) -> bytes:
    """Extended Capabilities. byte0 B2 = extended channel switching; byte4 B1 = BSS transition."""
    body = bytearray(10)
    body[0] = byte0
    body[4] = byte4
    body[7] = byte7
    body[9] = byte9
    return ie(IE_EXT_CAP, bytes(body))


def ie_rsn(group_cipher: int = CIPHER_CCMP_128,
           pairwise: Sequence[int] = (CIPHER_CCMP_128,),
           akm: Sequence[int] = (AKM_PSK,),
           caps: int = 0,
           pmkids: Sequence[bytes] = ()) -> bytes:
    """Build an RSNE. `caps` uses RSNCAP_* bits (bit 6 = MFPR, bit 7 = MFPC)."""
    body = struct.pack("<H", 1)                       # RSN version
    body += b"\x00\x0f\xac" + bytes([group_cipher])   # group cipher suite
    body += struct.pack("<H", len(pairwise))          # pairwise count
    for c in pairwise:
        body += b"\x00\x0f\xac" + bytes([c])
    body += struct.pack("<H", len(akm))               # AKM count
    for a in akm:
        body += b"\x00\x0f\xac" + bytes([a])
    body += struct.pack("<H", caps)                   # RSN capabilities
    if pmkids:
        body += struct.pack("<H", len(pmkids))
        for p in pmkids:
            body += p
    return ie(IE_RSN, body)


def ie_wps(version: bytes = b"\x10\x4a",
           config_methods: int = WPS_CONFIG_LABEL | WPS_CONFIG_DISPLAY | WPS_CONFIG_PUSHBUTTON,
           setup_locked: bool = False,
           selected_registrar: bool = False,
           device_password_id: int = 0x0000,
           device_name: str = "LAB-DIRECT-AP",
           manufacturer: str = "WiFiForge Labs",
           model: str = "LAB-AP-1",
           wps_state: int = 2) -> bytes:
    """Wi-Fi Simple Configuration IE carried in vendor IE 221 (OUI 00:50:F2, type 04)."""

    def attr(attr_id: int, value: bytes) -> bytes:
        return struct.pack("!HH", attr_id, len(value)) + value

    body = attr(WSC_ATTR_VERSION, version)
    body += attr(WSC_ATTR_CONFIG_METHODS, struct.pack("!H", config_methods))
    body += attr(WSC_ATTR_WPS_STATE, bytes([wps_state]))
    body += attr(WSC_ATTR_DEVICE_PASSWORD_ID, struct.pack("!H", device_password_id))
    if selected_registrar:
        body += attr(WSC_ATTR_SELECTED_REGISTRAR, b"\x01")
    if setup_locked:
        body += attr(WSC_ATTR_AP_SETUP_LOCKED, b"\x01")
    body += attr(WSC_ATTR_DEVICE_NAME, device_name.encode())
    body += attr(WSC_ATTR_MANUFACTURER, manufacturer.encode())
    body += attr(WSC_ATTR_MODEL_NAME, model.encode())
    return ie(IE_VENDOR, WPS_OUI + WPS_OUI_TYPE + body)


def ie_vendor(oui: bytes, payload: bytes) -> bytes:
    return ie(IE_VENDOR, oui + payload)


def ie_bss_load(stations: int = 3, channel_utilization: int = 42, available_admission: int = 200) -> bytes:
    return ie(11, struct.pack("<HBH", stations, channel_utilization, available_admission))


def ie_tx_power(dbm: int = 20) -> bytes:
    return ie(12, bytes([dbm & 0xFF]))


def ie_rm_enabled(caps: int = 0x73) -> bytes:
    return ie(70, struct.pack("<H", caps))


def beacon_body(ssid: str, channel: int, capability: int = 0x0411,
                ies: Sequence[bytes] = (), beacon_interval: int = 100,
                timestamp: int = 0, dtim_period: int = 2) -> bytes:
    """Beacon / Probe Response fixed fields + IEs (IEEE 802.11-2020 §9.4.2.1)."""
    body = struct.pack("<Q", timestamp)
    body += struct.pack("<H", beacon_interval)
    body += struct.pack("<H", capability)
    body += ie_ssid(ssid)
    body += ie_supported_rates()
    body += ie_ds_param(channel)
    body += ie_tim(dtim_period)
    for extra in ies:
        body += extra
    return body


# ---------------------------------------------------------------------------
# Frames
# ---------------------------------------------------------------------------

@dataclass
class LabFrame:
    """One captured frame plus the radio metadata a monitor-mode capture carries."""

    data: bytes
    channel: int = 6
    timestamp_us: int = 0
    rate: int = 2       # 1 Mb/s units -> 2 = 1.0 Mb/s? radiotap rate is 500 kb/s units
    signal_dbm: int = -45
    antenna: int = 0


# Radiotap "Channel" flags (radiotap.org/defined-fields/Channel)
RT_CHAN_2GHZ = 0x0080
RT_CHAN_5GHZ = 0x0010
RT_CHAN_6GHZ = 0x1000
RT_CHAN_OFDM = 0x0004
RT_CHAN_CCK = 0x0002
RT_CHAN_GFSK = 0x0040


def radiotap(freq_mhz: int, signal_dbm: int, rate: int = 2, antenna: int = 0,
             tsft_us: int = 0, flags: int = 0x00, chan_flags: int = 0) -> bytes:
    """Radiotap header: TSFT, Flags, Rate, Channel, dBm Ant Signal, Antenna.

    Present word bits: 0 TSFT, 1 Flags, 2 Rate, 3 Channel, 5 dBm Ant Signal, 11 Antenna.
    The header length is padded to a multiple of 8 because an 8-byte field (TSFT) is
    present — required by the radiotap spec so the 802.11 header stays aligned.
    """
    present = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 5) | (1 << 11)
    if chan_flags == 0:
        if freq_mhz < 2500:
            chan_flags = RT_CHAN_2GHZ | RT_CHAN_CCK | RT_CHAN_OFDM | RT_CHAN_GFSK
        elif freq_mhz < 5895:
            chan_flags = RT_CHAN_5GHZ | RT_CHAN_OFDM
        else:
            chan_flags = RT_CHAN_6GHZ | RT_CHAN_OFDM
    body = bytearray()
    body += struct.pack("<Q", tsft_us)                     # TSFT (8-byte aligned)
    body += bytes([flags & 0xFF])                          # Flags
    body += bytes([rate & 0xFF])                           # Rate (500 kb/s units)
    body += struct.pack("<HH", freq_mhz, chan_flags)       # Channel (2-byte aligned)
    body += struct.pack("<b", signal_dbm)                  # dBm Antenna Signal
    body += bytes([antenna & 0xFF])                        # Antenna index
    while (8 + len(body)) % 8 != 0:
        body += b"\x00"
    return struct.pack("<BBH", 0, 0, 8 + len(body)) + struct.pack("<I", present) + bytes(body)


def _frame_control(type_: int, subtype: int, flags: int = 0) -> bytes:
    fc = (subtype << 4) | (type_ << 2) | 0x00           # protocol version 0
    # Flags byte 1: bit0 ToDS, bit1 FromDS, bit2 MoreFrag, bit3 Retry,
    # bit4 PwrMgmt, bit5 MoreData, bit6 Protected, bit7 Order
    return bytes([fc & 0xFF, flags & 0xFF])


def mgmt_frame(subtype: int, addr1: bytes, addr2: bytes, addr3: bytes,
               body: bytes = b"", seq: int = 0, flags: int = 0, duration: int = 0,
               fragment: int = 0) -> bytes:
    header = _frame_control(TYPE_MGMT, subtype, flags) + struct.pack("<H", duration)
    header += addr1 + addr2 + addr3
    header += struct.pack("<H", ((seq & 0x0FFF) << 4) | (fragment & 0x0F))
    return header + body


def data_frame(addr1: bytes, addr2: bytes, addr3: bytes, payload: bytes,
               seq: int = 0, to_ds: int = 0, from_ds: int = 0, protected: bool = False,
               qos: bool = True, tid: int = 0, duration: int = 0) -> bytes:
    flags = (1 if to_ds else 0) | (2 if from_ds else 0) | (0x40 if protected else 0)
    subtype = SUBTYPE_QOS_DATA if qos else SUBTYPE_DATA
    header = _frame_control(TYPE_DATA, subtype, flags) + struct.pack("<H", duration)
    header += addr1 + addr2 + addr3
    header += struct.pack("<H", ((seq & 0x0FFF) << 4))
    if qos:
        header += struct.pack("<H", tid & 0x0F)     # QoS Control: TID 0, no ack policy
    return header + payload


def llc_snap(ethertype: int, payload: bytes) -> bytes:
    return b"\xaa\xaa\x03\x00\x00\x00" + struct.pack("!H", ethertype) + payload


def eapol_eap(eap_payload: bytes, version: int = 2) -> bytes:
    """EAPOL-Packet carrying an EAP message (EAPOL-Key uses eapol_key instead)."""
    body = bytes([version, 0]) + struct.pack("!H", len(eap_payload)) + eap_payload
    return body


def eap(code: int, identifier: int, type_: int, data: bytes = b"") -> bytes:
    return bytes([code, identifier]) + struct.pack("!H", 4 + len(data)) + bytes([type_]) + data


EAPOL_KEY_MIC_OFFSET = 81        # 4 EAPOL header + 77 descriptor bytes
EAPOL_KEY_FIXED_LEN = 99         # header + descriptor incl. key data length


def eapol_key(replay: int, nonce: bytes, key_info: int, key_data: bytes = b"",
              mic: bytes = b"\x00" * 16, descriptor: int = EAPOL_KEY_DESCRIPTOR_RSN,
              key_length: int = 16, key_iv: bytes = b"\x00" * 16,
              key_rsc: bytes = b"\x00" * 8, reserved: bytes = b"\x00" * 8,
              version: int = 2) -> bytes:
    """EAPOL-Key frame body (IEEE 802.1X-2020 §11.9, Figure 11-13 field order)."""
    assert len(nonce) == 32 and len(mic) == 16 and len(key_iv) == 16
    body = bytes([version, 3])                       # EAPOL v2, type 3 = EAPOL-Key
    body += struct.pack("!H", 0)                     # length patched below
    body += bytes([descriptor])                      # descriptor type
    body += struct.pack(">H", key_info)              # key information
    body += struct.pack(">H", key_length)            # key length
    body += struct.pack(">Q", replay)                # key replay counter
    body += nonce                                    # key nonce
    body += key_iv                                   # EAPOL-Key IV
    body += key_rsc                                  # key RSC
    body += reserved                                 # reserved
    body += mic                                      # EAPOL-Key MIC
    body += struct.pack(">H", len(key_data))         # key data length
    body += key_data
    body = body[:2] + struct.pack("!H", len(body) - 4) + body[4:]
    return body


def key_data_pmkid(pmkid_value: bytes) -> bytes:
    """KDE for PMKID: dd 14 00 0f ac 04 <16-byte PMKID> (IEEE 802.11-2020 §12.7.2)."""
    return b"\xdd\x14\x00\x0f\xac\x04" + pmkid_value


def key_data_gtk(gtk: bytes, key_id: int = 1) -> bytes:
    """KDE for GTK: dd <len> 00 0f ac 01 <keyinfo:2> <gtk>."""
    key_info = (key_id & 0x03) << 6
    payload = b"\xdd" + bytes([4 + 2 + len(gtk)]) + b"\x00\x0f\xac\x01" + struct.pack("!H", key_info) + gtk
    return payload


def ipv4(src: str, dst: str, payload: bytes, protocol: int = 17, ttl: int = 64,
         identification: int = 0x1234, tos: int = 0) -> bytes:
    total_length = 20 + len(payload)
    if protocol == 6 and len(payload) >= 20:
        pseudo = _ip_bytes(src) + _ip_bytes(dst) + b"\x00\x06" + struct.pack("!H", len(payload))
        payload = payload[:16] + struct.pack("!H", _checksum(pseudo + payload)) + payload[18:]
    header = struct.pack("!BBHHHBBH", 0x45, tos, total_length, identification, 0x4000, ttl, protocol, 0)
    header += _ip_bytes(src) + _ip_bytes(dst)
    checksum = _checksum(header)
    header = header[:10] + struct.pack("!H", checksum) + header[12:]
    return header + payload


def udp(sport: int, dport: int, payload: bytes) -> bytes:
    length = 8 + len(payload)
    header = struct.pack("!HHHH", sport, dport, length, 0)
    pseudo = b""  # checksum left as 0 = "not computed", which is legal for IPv4 UDP (RFC 768)
    return header + payload


def _ip_bytes(addr: str) -> bytes:
    return bytes(int(part) for part in addr.split("."))


def _checksum(header: bytes) -> int:
    if len(header) % 2:
        header += b"\x00"
    total = 0
    for i in range(0, len(header), 2):
        total += (header[i] << 8) | header[i + 1]
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)
    return (~total) & 0xFFFF


def radius_packet(code: int, identifier: int, attrs: bytes, authenticator: bytes) -> bytes:
    length = 20 + len(attrs)
    return struct.pack("!BBH", code, identifier, length) + authenticator + attrs


def radius_attr(attr_type: int, value: bytes) -> bytes:
    if len(value) > 253:
        raise ValueError("RADIUS attribute value too long for a single attribute")
    return bytes([attr_type, len(value) + 2]) + value


def radius_vsa(vendor_id: int, vendor_type: int, vendor_value: bytes) -> bytes:
    body = struct.pack("!IB", vendor_id, vendor_type) + vendor_value
    return radius_attr(ATTR_VENDOR_SPECIFIC, body)


def wsc_attr(attr_id: int, value: bytes) -> bytes:
    return struct.pack("!HH", attr_id, len(value)) + value


# ---------------------------------------------------------------------------
# PCAPNG writing / reading
# ---------------------------------------------------------------------------

SECTION_HEADER_BLOCK = 0x0A0D0D0A
INTERFACE_DESCRIPTION_BLOCK = 0x00000001
ENHANCED_PACKET_BLOCK = 0x00000006
LINKTYPE_IEEE802_11_RADIOTAP = 127


def _block(block_type: int, body: bytes) -> bytes:
    length = 12 + len(body)
    return struct.pack("<II", block_type, length) + body + struct.pack("<I", length)


def write_pcapng(path: str, frames: Iterable[LabFrame], snaplen: int = 65535,
                 tsresol: int = 6) -> int:
    """Write a real PCAPNG file (SHB + IDB + one EPB per frame). Returns frame count."""
    out = bytearray()
    # SHB: byte-order magic, version 1.0, section length -1 (unknown)
    shb_body = struct.pack("<IHHq", 0x1A2B3C4D, 1, 0, -1)
    out += _block(SECTION_HEADER_BLOCK, shb_body)
    # IDB: linktype + snaplen + if_tsresol (10^-6 = microseconds)
    idb_body = struct.pack("<HHI", LINKTYPE_IEEE802_11_RADIOTAP, 0, snaplen)
    # PCAPNG option values are padded to a 32-bit boundary (if_tsresol is 1 byte).
    idb_body += struct.pack("<HH", 9, 1) + bytes([tsresol]) + b"\x00" * 3
    idb_body += struct.pack("<HH", 0, 0)                      # opt_endofopt
    out += _block(INTERFACE_DESCRIPTION_BLOCK, idb_body)

    count = 0
    for frame in frames:
        ts = frame.timestamp_us
        epb_body = struct.pack("<IIIII", 0, ts // 1_000_000, ts % 1_000_000, len(frame.data), len(frame.data))
        # EPB fields: interface id, ts high, ts low, captured len, original len
        epb_body = struct.pack("<IIIII", 0, ts // 1_000_000, ts % 1_000_000,
                               len(frame.data), len(frame.data))
        padded = frame.data + b"\x00" * ((4 - len(frame.data) % 4) % 4)
        out += _block(ENHANCED_PACKET_BLOCK, epb_body + padded)
        count += 1
    with open(path, "wb") as fh:
        fh.write(bytes(out))
    return count


def read_pcapng(path: str) -> List[bytes]:
    """Minimal PCAPNG reader (SHB/IDB/EPB) used by the verifier."""
    data = open(path, "rb").read()
    offset = 0
    frames: List[bytes] = []
    while offset + 12 <= len(data):
        block_type, block_len = struct.unpack("<II", data[offset:offset + 8])
        if block_len < 12 or offset + block_len > len(data):
            break
        body = data[offset + 8:offset + block_len - 4]
        if block_type == ENHANCED_PACKET_BLOCK:
            cap_len = struct.unpack("<I", body[12:16])[0]
            frames.append(body[20:20 + cap_len])
        offset += block_len
    return frames


# ---------------------------------------------------------------------------
# Decoder — powers the static lab data consumed by the web app and the verifier
# ---------------------------------------------------------------------------

SUBTYPE_LABELS = {
    (TYPE_MGMT, SUBTYPE_BEACON): "Beacon",
    (TYPE_MGMT, SUBTYPE_PROBE_REQ): "Probe Request",
    (TYPE_MGMT, SUBTYPE_PROBE_RESP): "Probe Response",
    (TYPE_MGMT, SUBTYPE_AUTH): "Authentication",
    (TYPE_MGMT, SUBTYPE_ASSOC_REQ): "Association Request",
    (TYPE_MGMT, SUBTYPE_ASSOC_RESP): "Association Response",
    (TYPE_MGMT, SUBTYPE_REASSOC_REQ): "Reassociation Request",
    (TYPE_MGMT, SUBTYPE_REASSOC_RESP): "Reassociation Response",
    (TYPE_MGMT, SUBTYPE_DEAUTH): "Deauthentication",
    (TYPE_MGMT, SUBTYPE_DISASSOC): "Disassociation",
    (TYPE_MGMT, SUBTYPE_ACTION): "Action",
    (TYPE_DATA, SUBTYPE_DATA): "Data",
    (TYPE_DATA, SUBTYPE_QOS_DATA): "QoS Data",
    (TYPE_DATA, SUBTYPE_NULL): "Null",
}


def _mac(raw: bytes) -> str:
    return ":".join(f"{b:02x}" for b in raw)


def parse_ies(body: bytes, start: int = 0) -> Dict[int, List[bytes]]:
    ies: Dict[int, List[bytes]] = {}
    i = start
    while i + 2 <= len(body):
        eid, elen = body[i], body[i + 1]
        value = body[i + 2:i + 2 + elen]
        if len(value) < elen:
            break
        ies.setdefault(eid, []).append(value)
        i += 2 + elen
    return ies


def parse_rsn(value: bytes) -> Dict[str, object]:
    out: Dict[str, object] = {}
    if len(value) < 8:
        return out
    version, group = struct.unpack("<H", value[0:2])[0], value[4]
    off = 6
    pairwise_count = struct.unpack("<H", value[off:off + 2])[0]; off += 2
    pairwise = []
    for _ in range(pairwise_count):
        pairwise.append(value[off + 3]); off += 4
    akm_count = struct.unpack("<H", value[off:off + 2])[0]; off += 2
    akms = []
    for _ in range(akm_count):
        akms.append(value[off + 3]); off += 4
    caps = struct.unpack("<H", value[off:off + 2])[0] if off + 2 <= len(value) else 0
    out.update(version=version, group=group, pairwise=pairwise, akm=akms, caps=caps,
               mfpc=bool(caps & RSNCAP_MFPC), mfpr=bool(caps & RSNCAP_MFPR))
    return out


def parse_radiotap(pkt: bytes) -> Dict[str, int]:
    info = {"channel": 0, "freq": 0, "signal": 0, "rate": 0}
    if len(pkt) < 8:
        return info
    rt_len = struct.unpack("<H", pkt[2:4])[0]
    present = struct.unpack("<I", pkt[4:8])[0]
    off = 8
    if present & (1 << 0):                      # TSFT
        off += 8
    if present & (1 << 1):                      # Flags
        off += 1
    if present & (1 << 2):                      # Rate
        info["rate"] = pkt[off] * 0.5
        off += 1
    if present & (1 << 3):                      # Channel
        freq, _flags = struct.unpack("<HH", pkt[off:off + 4])
        info["freq"] = freq
        info["channel"] = freq_to_channel(freq)
        off += 4
    if present & (1 << 5):                      # dBm antenna signal
        info["signal"] = struct.unpack("<b", pkt[off:off + 1])[0]
        off += 1
    return info


def freq_to_channel(freq: int) -> int:
    if freq == 2484:
        return 14
    if 2412 <= freq <= 2472:
        return (freq - 2407) // 5
    if 5150 <= freq <= 5895:
        return (freq - 5000) // 5
    if 5925 <= freq <= 7125:
        return (freq - 5950) // 5
    return 0


def channel_to_freq(channel: int, band: str = "2.4") -> int:
    if band == "2.4":
        return 2484 if channel == 14 else 2412 + (channel - 1) * 5
    if band == "5":
        return 5000 + channel * 5
    if band == "6":
        return 5950 + channel * 5
    raise ValueError(band)


def decode(pkt: bytes) -> Dict[str, object]:
    """Decode one radiotap + 802.11 frame into the flat record the web UI uses."""
    radio = parse_radiotap(pkt)
    rt_len = struct.unpack("<H", pkt[2:4])[0] if len(pkt) >= 4 else 0
    frame = pkt[rt_len:]
    if len(frame) < 24:
        return {"frame_type": "malformed", "radio": radio}
    fc = struct.unpack("<H", frame[0:2])[0]
    type_, subtype = (fc >> 2) & 3, (fc >> 4) & 15
    flags = frame[1]
    duration = struct.unpack("<H", frame[2:4])[0]
    addr1, addr2, addr3 = frame[4:10], frame[10:16], frame[16:22]
    seq = struct.unpack("<H", frame[22:24])[0] >> 4
    body = frame[24:]
    rec: Dict[str, object] = {
        "frame_type": "mgmt" if type_ == TYPE_MGMT else ("ctrl" if type_ == TYPE_CTRL else "data"),
        "type": type_,
        "subtype": subtype,
        "subtype_name": SUBTYPE_LABELS.get((type_, subtype), f"type {type_} subtype {subtype}"),
        "addr1": _mac(addr1), "addr2": _mac(addr2), "addr3": _mac(addr3),
        "seq": seq,
        "duration": duration,
        "protected": bool(flags & 0x40),
        "to_ds": bool(flags & 0x01), "from_ds": bool(flags & 0x02),
        "radio": radio,
        "channel": radio["channel"],
    }
    ies: Dict[int, List[bytes]] = {}
    if type_ == TYPE_MGMT and subtype in (SUBTYPE_BEACON, SUBTYPE_PROBE_RESP):
        rec["timestamp"] = struct.unpack("<Q", body[0:8])[0]
        rec["beacon_interval"] = struct.unpack("<H", body[8:10])[0]
        rec["capability"] = struct.unpack("<H", body[10:12])[0]
        ies = parse_ies(body, 12)
    elif type_ == TYPE_MGMT and subtype in (SUBTYPE_ASSOC_REQ, SUBTYPE_REASSOC_REQ):
        rec["capability"] = struct.unpack("<H", body[0:2])[0]
        rec["listen_interval"] = struct.unpack("<H", body[2:4])[0]
        ies = parse_ies(body, 4 if subtype == SUBTYPE_ASSOC_REQ else 10)
    elif type_ == TYPE_MGMT and subtype in (SUBTYPE_ASSOC_RESP, SUBTYPE_REASSOC_RESP):
        rec["capability"] = struct.unpack("<H", body[0:2])[0]
        rec["status_code"] = struct.unpack("<H", body[2:4])[0]
        rec["aid"] = struct.unpack("<H", body[4:6])[0] & 0x3FFF
        ies = parse_ies(body, 6)
    elif type_ == TYPE_MGMT and subtype == SUBTYPE_PROBE_REQ:
        ies = parse_ies(body, 0)
    elif type_ == TYPE_MGMT and subtype == SUBTYPE_AUTH:
        rec["auth_algorithm"] = struct.unpack("<H", body[0:2])[0]
        rec["auth_seq"] = struct.unpack("<H", body[2:4])[0]
        rec["status_code"] = struct.unpack("<H", body[4:6])[0]
        rec["auth_payload"] = body[6:]
    elif type_ == TYPE_MGMT and subtype in (SUBTYPE_DEAUTH, SUBTYPE_DISASSOC):
        rec["reason"] = struct.unpack("<H", body[0:2])[0]
        rec["reason_name"] = REASON_NAMES.get(rec["reason"], "Reserved")
    elif type_ == TYPE_MGMT and subtype in (SUBTYPE_ACTION, SUBTYPE_ACTION_NOACK):
        rec["action_category"] = body[0] if body else None

    if ies:
        if IE_SSID in ies:
            rec["ssid"] = ies[IE_SSID][0].decode("utf-8", "replace")
            rec["ssid_len"] = len(ies[IE_SSID][0])
        if IE_DS_PARAM in ies:
            rec["ds_channel"] = ies[IE_DS_PARAM][0][0]
        if IE_RSN in ies:
            rsn = parse_rsn(ies[IE_RSN][0])
            rec["rsn"] = {k: v for k, v in rsn.items()}
            rec["akm_names"] = [AKM_NAMES.get(a, f"AKM {a}") for a in rsn.get("akm", [])]  # type: ignore[union-attr]
            rec["cipher_names"] = [CIPHER_NAMES.get(c, f"Cipher {c}") for c in rsn.get("pairwise", [])]  # type: ignore[union-attr]
            rec["mfpc"] = rsn.get("mfpc")
            rec["mfpr"] = rsn.get("mfpr")
        for value in ies.get(IE_VENDOR, []):
            if value[:4] == WPS_OUI + WPS_OUI_TYPE:
                rec["wps"] = True
                rec["wps_attrs"] = parse_wsc_attrs(value[4:])
        if IE_HT_CAP in ies:
            rec["ht"] = True
        if IE_VHT_CAP in ies:
            rec["vht"] = True
        if IE_EXTENSION in ies and any(v[:1] == b"\x23" for v in ies[IE_EXTENSION]):
            rec["he"] = True

    # Data frames: LLC/SNAP + EAPOL / IP
    if type_ == TYPE_DATA:
        payload = body[2:] if subtype == SUBTYPE_QOS_DATA else body
        if len(payload) >= 8 and payload[:6] == b"\xaa\xaa\x03\x00\x00\x00":
            ethertype = struct.unpack("!H", payload[6:8])[0]
            upper = payload[8:]
            rec["ethertype"] = f"0x{ethertype:04x}"
            if rec["protected"]:
                rec["payload_note"] = "encrypted (CCMP) — no plaintext available"
                rec["encrypted"] = True
            elif ethertype == 0x888E:
                rec["eapol"] = True
                rec.update(_decode_eapol(upper))
            elif ethertype == 0x0800:
                rec.update(_decode_ip(upper))
            elif ethertype == 0x0806:
                rec["protocol"] = "ARP"
                rec["summary_extra"] = "ARP"
    # Convenience aliases used by the UI
    rec["bssid"] = rec.get("addr3")
    rec["sa"] = rec.get("addr2")
    rec["da"] = rec.get("addr1")
    return rec


def parse_wsc_attrs(body: bytes) -> Dict[str, object]:
    out: Dict[str, object] = {}
    i = 0
    while i + 4 <= len(body):
        attr_id, length = struct.unpack("!HH", body[i:i + 4])
        value = body[i + 4:i + 4 + length]
        if attr_id == WSC_ATTR_AP_SETUP_LOCKED:
            out["setup_locked"] = bool(value and value[0])
        elif attr_id == WSC_ATTR_SELECTED_REGISTRAR:
            out["selected_registrar"] = bool(value and value[0])
        elif attr_id == WSC_ATTR_CONFIG_METHODS:
            methods = struct.unpack("!H", value)[0]
            out["config_methods"] = {
                "label": bool(methods & WPS_CONFIG_LABEL),
                "display": bool(methods & WPS_CONFIG_DISPLAY),
                "push_button": bool(methods & WPS_CONFIG_PUSHBUTTON),
            }
        elif attr_id == WSC_ATTR_VERSION:
            out["version"] = value.hex()
        elif attr_id == WSC_ATTR_DEVICE_PASSWORD_ID:
            out["device_password_id"] = struct.unpack("!H", value)[0]
        elif attr_id == WSC_ATTR_DEVICE_NAME:
            out["device_name"] = value.decode("utf-8", "replace")
        i += 4 + length
    return out


def decode_eap(eap_pkt: bytes) -> Dict[str, object]:
    """Decode an EAP packet (RFC 3748) into the flat fields the labs reference."""
    out: Dict[str, object] = {"eap": True}
    if len(eap_pkt) < 4:
        return out
    code, identifier, eap_len = eap_pkt[0], eap_pkt[1], struct.unpack("!H", eap_pkt[2:4])[0]
    eap_type = eap_pkt[4] if len(eap_pkt) > 4 else None
    out.update(eap_code=code, eap_identifier=identifier, eap_length=eap_len, eap_type=eap_type)
    out["eap_code_name"] = {1: "Request", 2: "Response", 3: "Success", 4: "Failure"}.get(code, f"code {code}")
    out["eap_type_name"] = {
        EAP_TYPE_IDENTITY: "Identity",
        EAP_TYPE_NAK: "NAK",
        EAP_TYPE_MD5: "EAP-MD5",
        EAP_TYPE_TLS: "EAP-TLS",
        EAP_TYPE_LEAP: "LEAP",
        EAP_TYPE_TTLS: "EAP-TTLS",
        EAP_TYPE_PEAP: "PEAP",
        EAP_TYPE_MSCHAPV2: "MS-CHAPv2",
        EAP_TYPE_FAST: "EAP-FAST",
        EAP_TYPE_WSC: "EAP-WSC (WPS)",
    }.get(eap_type, f"type {eap_type}")
    payload = eap_pkt[5:4 + eap_len]
    if eap_type == EAP_TYPE_IDENTITY and payload:
        out["eap_identity"] = payload.decode("utf-8", "replace")
    if eap_type == EAP_TYPE_PEAP and payload:
        out["peap_flags"] = payload[0]
        if len(payload) > 5 and payload[1:2] == b"\x16":
            out["tls_record"] = {"content_type": payload[1], "version": f"{payload[2]}.{payload[3]}",
                                 "length": struct.unpack("!H", payload[4:6])[0]}
    if eap_type == EAP_TYPE_TLS and payload and payload[0] == 0x0D:
        out["tls_certificate_request"] = True
    if eap_type == EAP_TYPE_MSCHAPV2 and payload:
        # RFC 2759 §4: Code(1), MS-CHAPv2 ID(1), MS-Length(2), then message fields.
        out["mschapv2_opcode"] = payload[0]
        out["mschapv2_opcode_name"] = {1: "Challenge", 2: "Response", 3: "Success", 4: "Failure"}.get(payload[0])
        if len(payload) >= 4:
            out["mschapv2_id"] = payload[1]
            out["mschapv2_message_length"] = struct.unpack("!H", payload[2:4])[0]
        if payload[0] == 1 and len(payload) >= 20:
            out["mschapv2_challenge"] = payload[4:20].hex()
            out["mschapv2_name"] = payload[20:].decode("utf-8", "replace")
        if payload[0] == 2 and len(payload) >= 53:
            out["mschapv2_peer_challenge"] = payload[4:20].hex()
            out["mschapv2_reserved"] = payload[20:28].hex()
            out["mschapv2_nt_response"] = payload[28:52].hex()
            out["mschapv2_flags"] = payload[52]
            out["mschapv2_username"] = payload[53:].decode("utf-16-le", "replace").rstrip("\x00")
        if payload[0] == 3:
            out["mschapv2_success"] = True
            out["mschapv2_message"] = payload[4:].decode("utf-16-le", "replace").rstrip("\x00") or payload[4:].decode("utf-8", "replace")
        if payload[0] == 4:
            out["mschapv2_failure"] = True
    return out


def _decode_eapol(upper: bytes) -> Dict[str, object]:
    out: Dict[str, object] = {"protocol": "EAPOL"}
    if len(upper) < 4:
        return out
    version, packet_type, length = upper[0], upper[1], struct.unpack("!H", upper[2:4])[0]
    out["eapol_version"] = version
    out["eapol_type"] = packet_type
    if packet_type == 3 and len(upper) >= EAPOL_KEY_FIXED_LEN:
        descriptor, key_info = upper[4], struct.unpack("!H", upper[5:7])[0]
        out["eapol_key"] = True
        out["key_descriptor"] = descriptor
        out["key_info"] = key_info
        out["replay_counter"] = struct.unpack("!Q", upper[9:17])[0]
        out["nonce"] = upper[17:49].hex()
        out["mic"] = upper[EAPOL_KEY_MIC_OFFSET:EAPOL_KEY_MIC_OFFSET + 16].hex()
        out["key_data_len"] = struct.unpack("!H", upper[97:99])[0]
        pairwise = bool(key_info & KEYINFO_KEY_TYPE)
        ack, mic, install, secure = (bool(key_info & KEYINFO_ACK), bool(key_info & KEYINFO_MIC),
                                     bool(key_info & KEYINFO_INSTALL), bool(key_info & KEYINFO_SECURE))
        if pairwise and ack and not mic:
            out["key_message"] = "M1 (AP → STA, ANonce, unauthenticated)"
        elif pairwise and not ack and mic and not secure:
            out["key_message"] = "M2 (STA → AP, SNonce + MIC)"
        elif pairwise and ack and mic and install:
            out["key_message"] = "M3 (AP → STA, GTK delivery + MIC)"
        elif pairwise and not ack and mic and secure:
            out["key_message"] = "M4 (STA → AP, MIC + Secure; final message)"
        key_data = upper[99:99 + out["key_data_len"]]
        if key_data:
            out["key_data_hex"] = key_data.hex()
            if key_data[:4] == b"\xdd\x14\x00\x0f":
                out["pmkid"] = key_data[6:22].hex()
    elif packet_type == 0 and len(upper) >= 9:
        # EAPOL-Packet: 4-byte EAPOL header, then the EAP packet (RFC 3748 §4).
        out.update(decode_eap(upper[4:]))
    return out


def _decode_ip(upper: bytes) -> Dict[str, object]:
    out: Dict[str, object] = {"protocol": "IPv4"}
    if len(upper) < 20:
        return out
    ihl = (upper[0] & 0x0F) * 4
    proto = upper[9]
    src = ".".join(str(b) for b in upper[12:16])
    dst = ".".join(str(b) for b in upper[16:20])
    out.update(ip_src=src, ip_dst=dst, ip_proto=proto)
    payload = upper[ihl:]
    if proto == 17 and len(payload) >= 8:
        sport, dport, length = struct.unpack("!HHH", payload[0:6])
        body = payload[8:]
        out.update(udp_src=sport, udp_dst=dport)
        if {sport, dport} == {67, 68} and len(body) >= 240:
            out["protocol"] = "DHCP"
            out["dhcp_op"] = body[0]
            out["dhcp_xid"] = struct.unpack("!I", body[4:8])[0]
            out["dhcp_yiaddr"] = ".".join(str(b) for b in body[16:20])
            out["dhcp_client_mac"] = ":".join(f"{b:02x}" for b in body[28:34])
            if body[236:240] == b"\x63\x82\x53\x63":
                i = 240
                while i < len(body) and body[i] != 255:
                    code = body[i]
                    if code == 0:
                        i += 1
                        continue
                    if i + 1 >= len(body):
                        break
                    size = body[i + 1]
                    value = body[i + 2:i + 2 + size]
                    if code == 53 and value:
                        out["dhcp_message_type"] = {1: "Discover", 2: "Offer", 3: "Request", 5: "ACK"}.get(value[0], str(value[0]))
                    i += 2 + size
        elif dport in (1812, 1813, 1645, 1646) or sport in (1812, 1813, 1645, 1646):
            out["protocol"] = "RADIUS"
            out.update(_decode_radius(body))
        elif sport == 53 or dport == 53:
            out["protocol"] = "DNS"
    elif proto == 6 and len(payload) >= 20:
        sport, dport = struct.unpack("!HH", payload[:4])
        header_len = ((payload[12] >> 4) & 0x0f) * 4
        tcp_payload = payload[header_len:]
        out.update(tcp_src=sport, tcp_dst=dport, protocol="TCP")
        if tcp_payload.startswith((b"GET ", b"POST ", b"HEAD ", b"PUT ", b"DELETE ", b"HTTP/")):
            out["protocol"] = "HTTP"
            text = tcp_payload.decode("latin-1", "replace")
            lines = text.split("\r\n")
            first = lines[0].split(" ", 2) if lines else []
            if first and first[0].startswith("HTTP/"):
                out["http_status"] = first[1] if len(first) > 1 else ""
            elif len(first) >= 2:
                out["http_method"], out["http_uri"] = first[0], first[1]
            for line in lines[1:]:
                if ":" in line:
                    key, value = line.split(":", 1)
                    out["http_" + key.strip().lower().replace("-", "_")] = value.strip()
            if "\r\n\r\n" in text:
                out["http_body"] = text.split("\r\n\r\n", 1)[1]
    elif proto == 1:
        out["protocol"] = "ICMP"
        if len(payload) >= 1:
            out["icmp_type"] = payload[0]
    return out


def _decode_radius(payload: bytes) -> Dict[str, object]:
    out: Dict[str, object] = {"radius": True}
    if len(payload) < 20:
        return out
    code, identifier, length = struct.unpack("!BBH", payload[0:4])
    out.update(radius_code=code, radius_id=identifier, radius_length=length,
               radius_authenticator=payload[4:20].hex())
    out["radius_code_name"] = {
        RADIUS_ACCESS_REQUEST: "Access-Request",
        RADIUS_ACCESS_ACCEPT: "Access-Accept",
        RADIUS_ACCESS_REJECT: "Access-Reject",
        RADIUS_ACCESS_CHALLENGE: "Access-Challenge",
        RADIUS_ACCOUNTING_REQUEST: "Accounting-Request",
        RADIUS_ACCOUNTING_RESPONSE: "Accounting-Response",
    }.get(code, f"code {code}")
    attrs: Dict[str, object] = {}
    i = 20
    while i + 2 <= min(len(payload), length):
        attr_type, attr_len = payload[i], payload[i + 1]
        value = payload[i + 2:i + attr_len]
        name = ATTR_NAMES.get(attr_type, f"Attribute {attr_type}")
        if attr_type == ATTR_USER_NAME:
            attrs[name] = value.decode("utf-8", "replace")
        elif attr_type == ATTR_EAP_MESSAGE:
            attrs.setdefault(name, []).append(value.hex())
        elif attr_type == ATTR_MESSAGE_AUTHENTICATOR:
            attrs[name] = value.hex()
        elif attr_type == ATTR_TUNNEL_PRIVATE_GROUP_ID:
            attrs[name] = value.decode("utf-8", "replace")
        elif attr_type == ATTR_NAS_IDENTIFIER:
            attrs[name] = value.decode("utf-8", "replace")
        elif attr_type == ATTR_CALLING_STATION_ID:
            attrs[name] = value.decode("utf-8", "replace")
        elif attr_type == ATTR_VENDOR_SPECIFIC:
            if len(value) >= 6 and struct.unpack("!I", value[:4])[0] == MS_VENDOR_ID:
                vtype = value[4]
                salt = value[5:5 + 2]
                vlen = len(value) - 7
                label = {MS_ATTR_MPPE_SEND_KEY: "MS-MPPE-Send-Key",
                         MS_ATTR_MPPE_RECV_KEY: "MS-MPPE-Recv-Key",
                         MS_ATTR_CHAP_CHALLENGE: "MS-CHAP-Challenge"}.get(vtype, f"MS attr {vtype}")
                attrs[label] = {"salt": salt.hex(), "length": vlen}
        else:
            attrs[name] = value.hex()
        i += attr_len if attr_len >= 2 else 2
    out["radius_attributes"] = attrs
    # EAP-Message may span several attributes (RFC 3579 §3.1) — concatenate in order
    # and decode the resulting EAP packet, so RADIUS-borne EAP is analysable.
    eap_values = attrs.get("EAP-Message")
    if eap_values:
        joined = b"".join(bytes.fromhex(str(v)) for v in eap_values)  # type: ignore[union-attr]
        if joined:
            out.update(decode_eap(joined))
    return out


def analyze(frames: Sequence[bytes], pcap_id: str, filter_text: str = "") -> Dict[str, object]:
    """Build the `PcapData` JSON document consumed by the web app (offline-first)."""
    records = [decode(f) for f in frames]
    for number, record in enumerate(records, start=1):
        record["number"] = number
    ssids = sorted({r["ssid"] for r in records if r.get("ssid")})
    bssids = sorted({r["bssid"] for r in records if r.get("bssid") and r["frame_type"] == "mgmt" and r.get("subtype") in (8, 5)})
    clients = sorted({r["sa"] for r in records if r.get("frame_type") == "mgmt" and r.get("subtype") in (SUBTYPE_PROBE_REQ, SUBTYPE_ASSOC_REQ, SUBTYPE_REASSOC_REQ) and r.get("sa")})
    channel_list = sorted({r["channel"] for r in records if r.get("channel")})
    summary = {
        "total_frames": len(records),
        "ssids": ssids,
        "bssids": bssids,
        "clients": clients,
        "channels": channel_list,
        "beacons": sum(1 for r in records if r.get("frame_type") == "mgmt" and r.get("subtype") == SUBTYPE_BEACON),
        "probes": sum(1 for r in records if r.get("frame_type") == "mgmt" and r.get("subtype") in (SUBTYPE_PROBE_REQ, SUBTYPE_PROBE_RESP)),
        "eapol": sum(1 for r in records if r.get("eapol")),
        "deauth": sum(1 for r in records if r.get("frame_type") == "mgmt" and r.get("subtype") == SUBTYPE_DEAUTH),
        "disassoc": sum(1 for r in records if r.get("frame_type") == "mgmt" and r.get("subtype") == SUBTYPE_DISASSOC),
        "assoc": sum(1 for r in records if r.get("frame_type") == "mgmt" and r.get("subtype") in (SUBTYPE_ASSOC_REQ, SUBTYPE_ASSOC_RESP)),
        "wps": sum(1 for r in records if r.get("wps")),
    }
    return {"pcap_id": pcap_id, "method": "platform-labkit", "legacyMethod": "wififorge-labkit", "filter": filter_text,
            "frames": records, "summary": summary}
