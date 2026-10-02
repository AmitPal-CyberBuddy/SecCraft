#!/usr/bin/env python3
"""Create/update only the three synthetic pre-launch profiles from short-lived JWT subjects."""
from __future__ import annotations
import base64, json, os
from sqlalchemy import create_engine, text

def claims(token):
    payload=token.split('.')[1]; payload += '='*(-len(payload)%4)
    data=json.loads(base64.urlsafe_b64decode(payload))
    subject=data.get('sub'); email=data.get('email')
    if not subject or not email: raise RuntimeError('synthetic token lacks subject/email')
    return subject,email

profiles=[
    (*claims(os.environ['STAGING_PENDING_JWT']),'pending'),
    (*claims(os.environ['STAGING_APPROVED_JWT']),'active'),
    (*claims(os.environ['STAGING_APPROVED_WITH_PROGRESS_JWT']),'active'),
]
if len({subject for subject,_,_ in profiles}) != 3: raise RuntimeError('three distinct synthetic accounts are required')
engine=create_engine(os.environ['CONTENT_MIGRATION_DATABASE_URL'])
with engine.begin() as connection:
    for subject,email,status in profiles:
        connection.execute(text("""INSERT INTO user_profiles (user_id,email,account_status)
            VALUES (:subject,:email,:status)
            ON CONFLICT (user_id) DO UPDATE SET email=EXCLUDED.email, account_status=EXCLUDED.account_status"""),
            {'subject':subject,'email':email,'status':status})
print('synthetic profiles: one pending and two active accounts prepared')
