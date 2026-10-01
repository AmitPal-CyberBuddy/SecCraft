#!/usr/bin/env python3
"""Bounded, offline PMKID check of the bundled fictional cases only. No network I/O."""
import argparse
import hashlib
import hmac
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def verify(candidate, record):
    pmk = hashlib.pbkdf2_hmac('sha1', candidate.encode(), record['ssid'].encode(), 4096, 32)
    message = b'PMK Name' + bytes.fromhex(record['ap'].replace(':', '')) + bytes.fromhex(record['station'].replace(':', ''))
    return hmac.compare_digest(hmac.new(pmk, message, hashlib.sha1).digest()[:16].hex(), record['pmkid'])

def run(mode):
    records = json.loads((ROOT / (mode + '.json')).read_text())['records']
    candidates = (ROOT / 'candidates.txt').read_text().splitlines()
    if len(records) > 2 or len(candidates) != 3 or any(not 8 <= len(c.encode()) <= 63 for c in candidates):
        raise ValueError('This exercise allows at most two records and exactly three bounded candidates')
    results = []
    for record in records:
        matches = [i + 1 for i, candidate in enumerate(candidates) if verify(candidate, record)]
        results.append({'id': record['id'], 'candidates_tested': 3, 'matching_candidate_lines': matches,
                        'outcome': 'MATCH' if matches else 'NOT FOUND IN SUPPLIED THREE',
                        'live_association': 'NOT TESTED'})
    return results

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['guided', 'independent'])
    print(json.dumps(run(parser.parse_args().mode), indent=2))
