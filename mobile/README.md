# Mobile — Planned

This folder is reserved for future mobile work.

Current platform is:

- Frontend: Vite + React + TS + Tailwind + Zustand + React Router — static, offline-capable, local-first
- Backend: FastAPI + SQLite — optional local parser (tshark/scapy), not required for hosted build
- Content: JSON + Markdown + 16 verified PCAPNG artefacts (SHA-256 verified)
- Deployment: GitHub Pages (static), Docker optional

The mobile implementation is not yet built. When it is, it will reuse:

- Same content model: LearningPath → Module → Lesson → Lab → Challenge → Assessment
- Same evidence model: artifact hash, filter, frame numbers, chain of custody
- Same progress model: local-first, platform-progress key with legacy wififorge-progress fallback
- Same methodology: Learn → Observe → Test → Report, Forge. Break. Fix. Retest.

No fabricated capabilities are claimed here: no realtime leaderboard, no biometric auth, no CRDT sync, no push notifications, no JWT/OAuth, no teams/classrooms — those would need explicit implementation and verification.

See `docs/PLATFORM_REPOSITIONING.md` for platform repositioning and `docs/ARCHITECTURE_AND_ROADMAP.md` for roadmap.

*Forge. Break. Fix. Retest. — Hands-on Cybersecurity Learning Platform*
