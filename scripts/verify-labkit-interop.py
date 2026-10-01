#!/usr/bin/env python3
"""Literal wire-format and export regressions, independent of the labkit reader.
--scapy additionally checks all published PCAPNGs with Scapy 2.7 (QA-only).
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
from decimal import Decimal
import tempfile
from wififorge_labkit import ie_extended_rates, parse_rsn, radiotap, write_pcapng, LabFrame

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('seccraft_artifact_builders',ROOT/'scripts/generate-lab-artifacts.py')
builders=importlib.util.module_from_spec(spec);sys.modules[spec.name]=builders;spec.loader.exec_module(builders)
assert ie_extended_rates()==bytes.fromhex('32043048606c'), 'Extended Supported Rates IE must be ID 50'
# Not just CCMP: make sure the decoder reads suite type, not OUI byte AC.
for cipher in (2,4,8,9):
    rsn=bytes.fromhex('0100000fac040100000fac040100000fac028000')
    rsn=rsn[:5]+bytes([cipher])+rsn[6:]
    assert parse_rsn(rsn)['group']==cipher
for freq,rate,flags in [(2437,2,0xa0),(2437,12,0xc0),(5180,12,0x140),(5955,12,0x40)]:
    packet=radiotap(freq,-40,rate=rate)
    assert struct.unpack_from('<HH',packet,18)==(freq,flags), 'literal radiotap frequency/modulation masks'

with tempfile.TemporaryDirectory() as directory:
    probe=Path(directory)/'clock.pcapng'
    write_pcapng(str(probe),[LabFrame(b'1234',timestamp_us=t) for t in (0xffffffff,0x100000000,1700000000002000)])
    raw=probe.read_bytes();cursor=0;words=[]
    while cursor<len(raw):
        kind,length=struct.unpack_from('<II',raw,cursor)
        if kind==6:words.append(struct.unpack_from('<II',raw,cursor+12))
        cursor+=length
    assert words==[(0,0xffffffff),(1,0),(395812,404637648)], 'literal clock rollover and contemporary epoch'
    try:
        write_pcapng(str(probe),[],tsresol=9)
    except ValueError:
        pass
    else:
        raise AssertionError('writer must reject non-microsecond interface clocks')

inventory=json.loads((ROOT/'frontend/src/content/lab-artifacts.json').read_text())['artifacts']
packet_count=0
for factory in builders.BUILDERS:
    lab=factory();meta=inventory[lab.pcap_id];path=ROOT/'frontend/public/pcaps'/meta['path']
    data=path.read_bytes();assert hashlib.sha256(data).hexdigest()==meta['sha256']
    offset=0;packets=[];ticks=[]
    while offset<len(data):
        kind,size=struct.unpack_from('<II',data,offset)
        assert size>=12 and size%4==0 and offset+size<=len(data)
        assert struct.unpack_from('<I',data,offset+size-4)[0]==size
        body=data[offset+8:offset+size-4]
        if kind==1:
            assert struct.unpack_from('<H',body)[0]==127
            assert body[8:16]==bytes.fromhex('0900010006000000'), 'interface clock is microseconds'
        if kind==6:
            interface,hi,lo,length,original=struct.unpack_from('<IIIII',body)
            assert interface==0 and length==original
            ticks.append((hi<<32)|lo);packets.append(body[20:20+length])
        offset+=size
    assert packets==[frame.data for frame in lab.frames],lab.pcap_id+' bytes'
    assert ticks==[frame.timestamp_us for frame in lab.frames],lab.pcap_id+' absolute clock'
    assert all(a<b for a,b in zip(ticks,ticks[1:])),lab.pcap_id+' monotonic clock'
    exported=json.loads((ROOT/'frontend/public/lab-data'/f'{lab.pcap_id}.json').read_text())
    expected=builders.analyze(packets,lab.pcap_id)
    # Normalise non-JSON byte fields exactly as the public export contract specifies.
    expected=json.loads(json.dumps(expected,default=lambda o:o.hex() if isinstance(o,(bytes,bytearray)) else str(o)))
    for row,decoded,time in zip(exported['frames'],expected['frames'],ticks):
        assert row['capture_timestamp_us']==time
        assert row['relative_time_ms']==(time-ticks[0])/1000
        assert {k:v for k,v in row.items() if k not in ('capture_timestamp_us','relative_time_ms')}==decoded
    assert len(exported['frames'])==len(packets)==meta['frames']
    if '--scapy' in sys.argv:
        from scapy.all import rdpcap, Dot11, Dot11EltRSN, RadioTap
        external=rdpcap(str(path));assert len(external)==len(packets)
        for i,p in enumerate(external):
            assert int(Decimal(str(p.time))*1000000)==ticks[i],lab.pcap_id+' external absolute clock'
            assert p.haslayer(Dot11) and p.haslayer(RadioTap)
            if p.haslayer(Dot11EltRSN):
                assert p[Dot11EltRSN].group_cipher_suite.cipher==exported['frames'][i]['rsn']['group']
    packet_count+=len(packets)
print(f'PASS: {len(inventory)} regenerated captures / {packet_count} packets: clock words, IE ID, RSN group suite, radiotap flags, hashes and decoded exports'+(' plus independent Scapy timestamps/RSN' if '--scapy' in sys.argv else ''))
