"""Guest intake with optional verified identity; all inbox operations require an owner."""
import hashlib
import hmac
import ipaddress
import json
import re
import time
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.api.v1.dependencies import bearer, current_identity, admin_identity
from app.core import config
from app.core.database import get_db
from app.models.feedback import Feedback, FeedbackQuota
from app.models.platform import AdminAuditEvent

router = APIRouter()
Category = Literal['bug', 'content', 'suggestion', 'general']
Status = Literal['new', 'in_progress', 'resolved', 'spam']


class Submission(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: UUID
    category: Category
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=5000)
    reply_email: str | None = Field(default=None, max_length=320)
    page_reference: str = Field(default='', max_length=300)

    @field_validator('reply_email')
    @classmethod
    def email(cls, value):
        if not value:
            return None
        if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', value):
            raise ValueError('Enter a valid reply email address')
        return value

    @field_validator('page_reference')
    @classmethod
    def local_reference(cls, value):
        # No query strings/fragments: they can carry auth tokens or private search text.
        if value and (not value.startswith('/') or value.startswith('//') or any(c in value for c in '?#\\\r\n')):
            raise ValueError('Use a local page path without query strings or fragments')
        return value


class Review(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    status: Status
    internal_note: str = Field(default='', max_length=3000)
    version: int = Field(ge=1)


async def optional_identity(request: Request):
    # Invalid supplied credentials are never silently downgraded to a guest.
    if not request.headers.get('authorization'):
        return None
    credentials = await bearer(request)
    return await current_identity(credentials)


def digest(value: str) -> str:
    if len(config.FEEDBACK_HMAC_SECRET.encode()) < 32:
        raise HTTPException(503, 'Feedback is not configured. Please try again later.')
    return hmac.new(config.FEEDBACK_HMAC_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()


def client_network(request: Request) -> str:
    # ASGI server must trust only explicit ingress peers. Never parse arbitrary forwarding headers.
    host = request.client.host if request.client else ''
    try:
        address = ipaddress.ip_address(host)
        if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
            address = address.ipv4_mapped
        # IPv6 privacy-address rotation must not trivially reset limits.
        return str(ipaddress.ip_network(f'{address}/64', strict=False)) if address.version == 6 else str(address)
    except ValueError:
        return 'unknown-client'  # shared fail-conservative bucket, including local TestClient


def consume(db: Session, network: str, user_id: str | None, now: int):
    insert = pg_insert if db.bind.dialect.name == 'postgresql' else sqlite_insert
    quotas = [('ip', network, 3600, config.FEEDBACK_IP_HOUR), ('ip', network, 86400, config.FEEDBACK_IP_DAY)]
    if user_id:
        quotas += [('user', user_id, 3600, config.FEEDBACK_USER_HOUR), ('user', user_id, 86400, config.FEEDBACK_USER_DAY)]
    else:
        quotas += [('guest', network, 3600, config.FEEDBACK_GUEST_HOUR), ('guest', network, 86400, config.FEEDBACK_GUEST_DAY)]
    # Every worker increments the same unique DB rows atomically; no process-local fallback.
    db.execute(delete(FeedbackQuota).where(FeedbackQuota.expires_at <= now))
    entries = sorted((digest(f'quota:{kind}:{value}:{seconds}:{now // seconds}'), seconds, limit) for kind, value, seconds, limit in quotas)
    for key, seconds, limit in entries:
        expires = (now // seconds + 1) * seconds
        statement = insert(FeedbackQuota).values(key=key, count=1, expires_at=expires)
        statement = statement.on_conflict_do_update(index_elements=['key'], set_={'count': FeedbackQuota.count + 1}, where=FeedbackQuota.count < limit).returning(FeedbackQuota.count)
        if db.execute(statement).scalar_one_or_none() is None:
            db.rollback()  # all dimensions and the message commit together, or none do
            raise HTTPException(429, 'Feedback limit reached. Keep your message and try later.', headers={'Retry-After': str(max(1, expires - now))})


def receipt(existing, payload_hash, user_id):
    if existing.payload_hash != payload_hash or existing.user_id != user_id:
        raise HTTPException(409, 'This submission identifier was already used. Start a new submission for changed text.')
    return {'reference': existing.id, 'saved': True}


@router.post('/feedback', status_code=201)
def submit(body: Submission, request: Request, identity=Depends(optional_identity), db: Session = Depends(get_db)):
    user_id = identity.user_id if identity else None
    data = body.model_dump(mode='json', exclude={'request_id'})
    key = digest(f'request:{body.request_id}')
    payload_hash = digest('payload:' + json.dumps(data, sort_keys=True))
    existing = db.query(Feedback).filter_by(request_key=key).first()
    if existing:
        return receipt(existing, payload_hash, user_id)
    try:
        consume(db, client_network(request), user_id, int(time.time()))
    except HTTPException as exc:
        # A concurrent retry may have waited behind the original transaction at the final quota.
        existing = db.query(Feedback).filter_by(request_key=key).first() if exc.status_code == 429 else None
        if existing:
            return receipt(existing, payload_hash, user_id)
        raise
    item = Feedback(request_key=key, payload_hash=payload_hash, user_id=user_id, **data)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Feedback).filter_by(request_key=key).first()
        if not existing:
            raise
        return receipt(existing, payload_hash, user_id)
    return {'reference': item.id, 'saved': True}


def summary(item):
    return {key: getattr(item, key) for key in ('id', 'category', 'subject', 'status', 'created_at', 'updated_at')}


@router.get('/admin/feedback')
def inbox(status: Status | None = None, category: Category | None = None,
          before: int | None = Query(default=None, ge=1), limit: int = Query(default=25, ge=1, le=50),
          identity=Depends(admin_identity), db: Session = Depends(get_db)):
    query = db.query(Feedback)
    if status:
        query = query.filter(Feedback.status == status)
    if category:
        query = query.filter(Feedback.category == category)
    if before:
        query = query.filter(Feedback.id < before)
    rows = query.order_by(Feedback.id.desc()).limit(limit + 1).all()
    return {'items': [summary(row) for row in rows[:limit]], 'next_cursor': rows[limit - 1].id if len(rows) > limit else None}


@router.get('/admin/feedback/{feedback_id}')
def detail(feedback_id: int, identity=Depends(admin_identity), db: Session = Depends(get_db)):
    item = db.get(Feedback, feedback_id)
    if not item:
        raise HTTPException(404, 'Feedback not found')
    return {**summary(item), **{key: getattr(item, key) for key in ('message', 'reply_email', 'user_id', 'page_reference', 'internal_note', 'version')}}


@router.patch('/admin/feedback/{feedback_id}')
def review(feedback_id: int, body: Review, identity=Depends(admin_identity), db: Session = Depends(get_db)):
    # Conditional update also protects SQLite tests; stale browser tabs cannot overwrite another owner.
    item = db.query(Feedback).filter_by(id=feedback_id).with_for_update().first()
    if not item:
        raise HTTPException(404, 'Feedback not found')
    old_status = item.status
    changed = db.query(Feedback).filter_by(id=feedback_id, version=body.version).update({
        'status': body.status, 'internal_note': body.internal_note, 'version': body.version + 1,
    }, synchronize_session=False)
    if not changed:
        db.rollback()
        raise HTTPException(409, 'Another review changed this entry. Reload it before saving.')
    db.add(AdminAuditEvent(actor_user_id=identity.user_id, action='feedback.reviewed', details={
        'feedback_id': feedback_id, 'from': old_status, 'to': body.status, 'note_changed': item.internal_note != body.internal_note,
    }))
    db.commit()
    db.expire_all()
    return detail(feedback_id, identity, db)
