#!/usr/bin/env python3
"""Reproducible PUBLIC certificate fixtures. QA dependency: cryptography 46.0.5.
Keys derive from public fixture seeds; never trusted or used outside teaching.
No private keys are written. --check compares bytes without rewriting.
"""
import argparse, hashlib
from datetime import datetime, timezone
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
ROOT=Path(__file__).resolve().parents[1]/'frontend/public/wireless-practice/WF-ENT-05'
def key(label):return Ed25519PrivateKey.from_private_bytes(hashlib.sha256(('PUBLIC TEACHING KEY:'+label).encode()).digest())
def dn(label):return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,label)])
def make(label,issuer,ca=False,name=None,expired=False,client_only=False):
    private=key(label);issuer_key=key(issuer)
    builder=(x509.CertificateBuilder().subject_name(dn(label)).issuer_name(dn(issuer))
        .public_key(private.public_key()).serial_number(int.from_bytes(hashlib.sha256(label.encode()).digest()[:16],'big'))
        .not_valid_before(datetime(2025,1,1,tzinfo=timezone.utc))
        .not_valid_after(datetime(2026,1,1,tzinfo=timezone.utc) if expired else datetime(2030,1,1,tzinfo=timezone.utc))
        .add_extension(x509.BasicConstraints(ca=ca,path_length=0 if ca else None),critical=True)
        .add_extension(x509.KeyUsage(digital_signature=not ca,content_commitment=False,key_encipherment=False,data_encipherment=False,key_agreement=False,key_cert_sign=ca,crl_sign=ca,encipher_only=None,decipher_only=None),critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(private.public_key()),critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(issuer_key.public_key()),critical=False))
    if not ca:
        builder=builder.add_extension(x509.SubjectAlternativeName([x509.DNSName(name or 'aaa.lab.example')]),critical=False).add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CLIENT_AUTH if client_only else ExtendedKeyUsageOID.SERVER_AUTH]),critical=False)
    return builder.sign(issuer_key,algorithm=None).public_bytes(Encoding.PEM)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    files={'trusted-root.pem':make('Teaching Root','Teaching Root',ca=True),'other-root.pem':make('Other Teaching Root','Other Teaching Root',ca=True)}
    for filename,label,issuer,kwargs in [
        ('server-good.pem','Good Server','Teaching Root',{}),
        ('server-wrong-name.pem','Wrong Name','Teaching Root',{'name':'other.lab.example'}),
        ('server-untrusted.pem','Untrusted Server','Other Teaching Root',{}),
        ('server-expired.pem','Expired Server','Teaching Root',{'expired':True}),
        ('client-only.pem','Client Only','Teaching Root',{'client_only':True}),
    ]:files[filename]=make(label,issuer,**kwargs)
    for name,data in files.items():
        path=ROOT/name
        if args.check:assert path.read_bytes()==data,'stale '+name
        else:path.write_bytes(data)
    print('PASS: seven deterministic public certificate fixtures '+('match' if args.check else 'generated'))
if __name__=='__main__':main()
