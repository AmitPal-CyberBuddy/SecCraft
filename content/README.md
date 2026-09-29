# Repository content directory

`content/` holds configuration examples and is reserved for content that may be loaded by the optional local API. The currently shipped learning paths, modules, lessons, challenges, and decoded offline lab datasets live under `frontend/src/content/` and `frontend/public/lab-data/`.

## Capture artifacts

The authoritative PCAPNG files and their corresponding browser-ready decoded datasets are generated together by:

```bash
python3 scripts/generate-lab-artifacts.py
python3 scripts/verify-lab-artifacts.py
```

Do not generate files directly into `content/pcaps/` or hand-edit the generated captures: the artifact manifest, hashes, offline datasets, and challenge-answer checks must remain synchronized. `scripts/wififorge_labkit.py` retains its historical module name for compatibility with the generator, verifier, challenge tooling, and existing curriculum references.
