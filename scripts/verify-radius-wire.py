#!/usr/bin/env python3
"""Check raw PCAPNG RADIUS transactions without the labkit encoder/decoder."""
import hashlib, hmac, json, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def packets():
    meta=json.loads((ROOT/'frontend/src/content/lab-artifacts.json').read_text())['artifacts']['radius']
    raw=(ROOT/'frontend/public/pcaps'/meta['path']).read_bytes();offset=0
    while offset<len(raw):
        kind,size=struct.unpack_from('<II',raw,offset)
        if kind==6:
            length=struct.unpack_from('<I',raw,offset+20)[0];p=raw[offset+28:offset+28+length]
            radio=struct.unpack_from('<H',p,2)[0];dot=p[radio:]
            if (dot[0]>>2)&3==2:
                llc=dot[26:] if dot[0]>>4==8 else dot[24:]
                if llc[:8]==bytes.fromhex('aaaa030000000800'):
                    ip=llc[8:];udp=ip[(ip[0]&15)*4:];sport,dport,length=struct.unpack_from('!HHH',udp)
                    if sport in (1812,1813) or dport in (1812,1813):
                        yield (ip[12:16],ip[16:20],sport,dport),udp[8:length]
        offset+=size

def attributes(p):
    out=[];off=20
    assert len(p)==int.from_bytes(p[2:4],'big')
    while off<len(p):
        kind,length=p[off:off+2];assert length>=2 and off+length<=len(p)
        out.append((kind,off+2,p[off+2:off+length]));off+=length
    assert off==len(p)
    return out

def verify(items=None):
    secret=b'testing123';requests={};valid_requests=0;responses=0;bad=0
    for flow,p in (packets() if items is None else items):
        code,id=p[:2];attrs=attributes(p);ma=[(off,v) for typ,off,v in attrs if typ==80]
        eaps=[v for typ,off,v in attrs if typ==79]
        if code in (1,4):
            if code==4:
                assert p[4:20]==hashlib.md5(p[:4]+bytes(16)+p[20:]+secret).digest()
                assert flow[3]==1813
            else:
                assert p[4:20]!=bytes(16) and len(ma)==1
                off,value=ma[0];zeroed=p[:off]+bytes(16)+p[off+16:]
                valid=hmac.compare_digest(hmac.new(secret,zeroed,hashlib.md5).digest(),value)
                if flow[0]==bytes([10,20,30,99]):
                    assert not valid;bad+=1;continue
                assert valid
                assert hmac.new(b'wrong-secret',zeroed,hashlib.md5).digest()!=value
            key=(*flow,id);assert key not in requests;requests[key]=p;valid_requests+=1
        else:
            key=(flow[1],flow[0],flow[3],flow[2],id);assert key in requests,'unmatched reply identifier/flow'
            request=requests.pop(key)
            assert (code==5)==(request[0]==4)
            assert p[4:20]==hashlib.md5(p[:4]+request[4:20]+p[20:]+secret).digest()
            assert p[4:20]!=hashlib.md5(p[:4]+bytes(16)+p[20:]+secret).digest(),'wrong request nonce must fail'
            if eaps:
                assert len(ma)==1;off,value=ma[0]
                expected=hmac.new(secret,p[:4]+request[4:20]+p[20:off]+bytes(16)+p[off+16:],hashlib.md5).digest()
                assert value==expected
            if code==2:
                assert b''.join(eaps)==bytes.fromhex('03040004')
                assert any(t==81 and v==b'100' for t,_,v in attrs)
            responses+=1
    assert not requests and (valid_requests,responses,bad)==(4,4,1)
    return responses

if __name__=='__main__':
    print(f'PASS: {verify()} matched RADIUS request/reply pairs, exact authenticators, EAP-bearing response HMACs, accounting and invalid-secret control')
