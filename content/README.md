# Content — Source of Truth

This folder mirrors `frontend/src/content/` for future backend-driven content.

Structure:
- `modules/` — module.json, lessons/*.md, labs/*.yaml, quizzes/*.json
- `pcaps/` — self-generated PCAPs (beacon, handshake, etc.)
- `configs/` — hostapd.conf, radius configs
- `reference/` — commands.json, filters.json, terminology.json

For Phase A, content lives in `frontend/src/content/` for fast HMR.
Backend will eventually load from here too.

## Generating PCAPs

Use Scapy on Kali:

```bash
python3 scripts/generate_pcap.py --type beacon --ssid LAB-WIFI --bssid AA:BB:CC:DD:EE:FF --channel 6 -o content/pcaps/wifi-fundamentals/beacon-only.pcapng
```
