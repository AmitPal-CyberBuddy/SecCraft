# WF-OPS-02 — Readiness, reconnaissance and evidence

Available now: offline evidence practice for Modules 04–06. No account, radio or cloud VM is needed to read these files. The public review guide is self-review, not independent grading.

This case reuses SecCraft's generated recon-lab (17 frames) and traffic-analysis (21 frames) captures. Each is a separate constructed scene, not successive captures of one session. The Unix dates, signal values and rapid channel changes are authored teaching metadata, not measurements or realistic dwell coverage. Do not merge their clocks or frame numbers.

Start with scope.md and capability-cases.json. Complete worksheet.md before reading review-guide.md. Use decoded JSON when Wireshark/TShark cannot be installed. Commands in the lessons run on your own computer, not in the SecCraft command simulator.

The PCAPNG files retain source bytes. SHA256SUMS covers every other case file; verify with `sha256sum -c SHA256SUMS` from this directory (or Get-FileHash on Windows). A matching hash establishes byte consistency, not truthful collection or chain of custody. File hashes changed in this release to repair timestamp and radio/IE metadata; older copies must not be cited with the new hashes.

The client-log.csv and clock-note.md are fictional sidecars created for this case, not logs recovered from a real endpoint. Neither validates a live connection, exploit, injection or client response. Live hosted labs are not available. Optional RF validation requires your own isolated, authorized equipment and a separate bounded test plan; it is not needed to finish the offline lessons.
