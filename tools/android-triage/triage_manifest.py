#!/usr/bin/env python3
"""
SecCraft — Android Manifest Security Triage Utility
Parses AndroidManifest.xml (from apktool or decoded text) and flags:
- Debuggable / Backup flags
- Exported Activities, BroadcastReceivers, Services, ContentProviders
- Implicit intent filters lacking permissions
- Deep link custom URI schemes lacking App Link verification
- Network Security Config references
"""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID_NS = "{http://schemas.android.com/apk/res/android}"

def triage_manifest(manifest_path: str):
    path = Path(manifest_path)
    if not path.is_file():
        print(f"[!] Error: File '{manifest_path}' does not exist.")
        sys.exit(1)

    try:
        tree = ET.parse(path)
        root = tree.getroot()
    except Exception as e:
        print(f"[!] Error parsing XML: {e}")
        sys.exit(1)

    package = root.attrib.get("package", "unknown")
    print(f"==================================================")
    print(f"Android Manifest Security Triage: {package}")
    print(f"==================================================")

    # Check targetSdkVersion
    uses_sdk = root.find("uses-sdk")
    target_sdk = "Unknown"
    if uses_sdk is not None:
        target_sdk = uses_sdk.attrib.get(f"{ANDROID_NS}targetSdkVersion", "Unknown")
    print(f"[*] targetSdkVersion: {target_sdk}")

    app = root.find("application")
    if app is None:
        print("[!] No <application> element found.")
        return

    # Check Application Flags
    debuggable = app.attrib.get(f"{ANDROID_NS}debuggable") == "true"
    allow_backup = app.attrib.get(f"{ANDROID_NS}allowBackup") != "false"
    uses_cleartext = app.attrib.get(f"{ANDROID_NS}usesCleartextTraffic") == "true"
    net_sec_config = app.attrib.get(f"{ANDROID_NS}networkSecurityConfig")

    print("\n[+] Application Configuration:")
    print(f"    - debuggable:           {'[!] TRUE (Vulnerable)' if debuggable else '[+] false'}")
    print(f"    - allowBackup:          {'[!] TRUE (Inspect exclusion rules)' if allow_backup else '[+] false'}")
    print(f"    - usesCleartextTraffic: {'[!] TRUE (Insecure)' if uses_cleartext else '[+] false'}")
    print(f"    - networkSecurityConfig:{f'[+] Defined ({net_sec_config})' if net_sec_config else '[-] Not specified (Platform default)'}")

    # Inspect Components
    components = [
        ("activity", "Activities"),
        ("receiver", "BroadcastReceivers"),
        ("service", "Services"),
        ("provider", "ContentProviders"),
    ]

    print("\n[+] Component Surface Triage:")
    total_exported = 0
    findings = []

    for tag, label in components:
        elements = app.findall(tag)
        print(f"    - {label}: {len(elements)} found")
        for elem in elements:
            name = elem.attrib.get(f"{ANDROID_NS}name", "unnamed")
            exported_attr = elem.attrib.get(f"{ANDROID_NS}exported")
            intent_filters = elem.findall("intent-filter")
            has_filter = len(intent_filters) > 0
            perm = elem.attrib.get(f"{ANDROID_NS}permission")

            # Determination of exported state
            is_exported = False
            if exported_attr is not None:
                is_exported = exported_attr.lower() == "true"
            elif has_filter:
                # Pre-API 31 defaulted to true if intent-filter was present
                is_exported = True

            if is_exported:
                total_exported += 1
                perm_str = f" [Permission: {perm}]" if perm else " [!] NO PERMISSION (Open IPC)"
                findings.append((tag.upper(), name, perm_str))

                # Deep link inspection
                for f in intent_filters:
                    for data in f.findall("data"):
                        scheme = data.attrib.get(f"{ANDROID_NS}scheme")
                        host = data.attrib.get(f"{ANDROID_NS}host")
                        if scheme and scheme not in ("http", "https"):
                            findings.append(("CUSTOM SCHEME", f"{name} handles '{scheme}://{host or ''}'", " [!] Ambiguous intent resolution"))

    print(f"\n[*] Total Exported Components: {total_exported}")
    if findings:
        print("\n[!] Triage Highlights:")
        for kind, comp_name, note in findings:
            print(f"    [{kind:14}] {comp_name}{note}")

    print("\n==================================================")
    print("Triage Complete.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 triage_manifest.py <path_to_AndroidManifest.xml>")
        sys.exit(1)
    triage_manifest(sys.argv[1])
