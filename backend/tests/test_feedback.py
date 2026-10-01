"""Feedback contracts: shared DB quotas, retries, privacy and owner-only operations."""
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from test_api_contract import client, clean_database, auth_headers, seed_admin
from app.core import config
from app.core.database import SessionLocal
from app.models.feedback import Feedback, FeedbackQuota
from app.models.platform import AdminAuditEvent
from app.services.feedback_retention import purge


@pytest.fixture(autouse=True)
def configured_feedback(monkeypatch):
    monkeypatch.setattr(config, 'FEEDBACK_HMAC_SECRET', 'test-only-feedback-secret-at-least-32-bytes')


def payload(**kwargs):
    return {'request_id': str(uuid.uuid4()), 'subject': 'Broken learning link', 'category': 'bug',
            'message': '<script>alert(1)</script> is shown as plain text.', 'page_reference': '/labs', **kwargs}


def test_guest_receipt_retry_and_private_owner_review(client):
    body = payload(reply_email='reply@example.test')
    first = client.post('/api/v1/feedback', json=body)
    assert first.status_code == 201, first.text
    reference = first.json()['reference']
    assert first.json() == {'reference': reference, 'saved': True}
    assert client.post('/api/v1/feedback', json=body).json() == first.json()
    assert client.post('/api/v1/feedback', json={**body, 'message': 'Changed after sending.'}).status_code == 409
    with SessionLocal() as db:
        assert db.query(Feedback).count() == 1
        assert {row.count for row in db.query(FeedbackQuota)} == {1}
        assert all(len(row.key) == 64 and 'testclient' not in row.key for row in db.query(FeedbackQuota))
    for path in ['/api/v1/admin/feedback', f'/api/v1/admin/feedback/{reference}']:
        assert client.get(path).status_code == 401
        assert client.get(path, headers=auth_headers('ordinary')).status_code == 403
    assert client.patch(f'/api/v1/admin/feedback/{reference}', json={'status': 'spam', 'version': 1}).status_code == 401
    seed_admin('owner')
    owner = auth_headers('owner')
    inbox = client.get('/api/v1/admin/feedback', headers=owner).json()
    assert len(inbox['items']) == 1
    assert 'message' not in inbox['items'][0] and 'request_key' not in inbox['items'][0]
    detail = client.get(f'/api/v1/admin/feedback/{reference}', headers=owner).json()
    assert detail['message'] == body['message'] and detail['reply_email'] == body['reply_email']
    assert 'request_key' not in detail and 'payload_hash' not in detail
    changed = client.patch(f'/api/v1/admin/feedback/{reference}', headers=owner, json={'status': 'in_progress', 'internal_note': 'Private triage note', 'version': 1})
    assert changed.status_code == 200, changed.text
    assert changed.json()['version'] == 2
    assert client.patch(f'/api/v1/admin/feedback/{reference}', headers=owner, json={'status': 'resolved', 'version': 1}).status_code == 409
    with SessionLocal() as db:
        audit = db.query(AdminAuditEvent).one()
        assert audit.action == 'feedback.reviewed'
        assert 'Private triage note' not in str(audit.details)
        assert body['message'] not in str(audit.details)


def test_limits_use_shared_db_ignore_spoofed_ip_and_rollback_all_buckets(client):
    for index in range(config.FEEDBACK_GUEST_HOUR):
        assert client.post('/api/v1/feedback', json=payload(), headers={'X-Forwarded-For': f'198.51.100.{index}'}).status_code == 201
    limited = client.post('/api/v1/feedback', json=payload(), headers={'X-Forwarded-For': '1.1.1.1'})
    assert limited.status_code == 429
    assert 0 < int(limited.headers['Retry-After']) <= 3600
    with SessionLocal() as db:
        assert db.query(Feedback).count() == config.FEEDBACK_GUEST_HOUR
        assert {q.count for q in db.query(FeedbackQuota)} == {config.FEEDBACK_GUEST_HOUR}
    # A verified user has a separate account bucket but remains under the shared network ceiling.
    for _ in range(config.FEEDBACK_USER_HOUR):
        assert client.post('/api/v1/feedback', json=payload(), headers=auth_headers('signed-in')).status_code == 201
    assert client.post('/api/v1/feedback', json=payload(), headers=auth_headers('signed-in')).status_code == 429


def test_concurrent_submissions_cannot_exceed_shared_quota(client):
    def submit(_):
        return client.post('/api/v1/feedback', json=payload()).status_code
    with ThreadPoolExecutor(max_workers=8) as workers:
        results = list(workers.map(submit, range(8)))
    assert results.count(201) == config.FEEDBACK_GUEST_HOUR
    assert results.count(429) == 8 - config.FEEDBACK_GUEST_HOUR


def test_concurrent_same_request_is_one_message_and_one_charge(client, monkeypatch):
    monkeypatch.setattr(config, 'FEEDBACK_GUEST_HOUR', 1)
    body = payload()
    with ThreadPoolExecutor(max_workers=5) as workers:
        results = list(workers.map(lambda _: client.post('/api/v1/feedback', json=body), range(5)))
    assert all(result.status_code == 201 for result in results)
    assert len({result.json()['reference'] for result in results}) == 1
    with SessionLocal() as db:
        assert db.query(Feedback).count() == 1
        assert {q.count for q in db.query(FeedbackQuota)} == {1}


def test_validation_and_missing_config_fail_closed(client, monkeypatch):
    assert client.post('/api/v1/feedback', json=payload(), headers={'Authorization': 'Bearer not-a-token'}).status_code == 401
    assert client.post('/api/v1/feedback', json=payload(user_id='forged-owner')).status_code == 422
    for value in ['//evil.test', '/login?token=private', '/labs#private', 'https://example.test']:
        assert client.post('/api/v1/feedback', json=payload(page_reference=value)).status_code == 422
    assert client.post('/api/v1/feedback', json=payload(message=' ' * 20)).status_code == 422
    assert client.post('/api/v1/feedback', json=payload(reply_email='bad\r\nheader@example.test')).status_code == 422
    assert client.post('/api/v1/feedback', json=payload(message='x' * 70000)).status_code == 413
    monkeypatch.setattr(config, 'FEEDBACK_HMAC_SECRET', '')
    assert client.post('/api/v1/feedback', json=payload()).status_code == 503
    with SessionLocal() as db:
        assert db.query(Feedback).count() == 0


def test_pagination_filters_and_retention(client, monkeypatch):
    seed_admin('owner')
    owner = auth_headers('owner')
    for category in ['bug', 'suggestion', 'bug']:
        assert client.post('/api/v1/feedback', json=payload(category=category)).status_code == 201
    first = client.get('/api/v1/admin/feedback?limit=1&category=bug', headers=owner).json()
    second = client.get(f"/api/v1/admin/feedback?limit=1&category=bug&before={first['next_cursor']}", headers=owner).json()
    assert first['items'][0]['id'] != second['items'][0]['id']
    assert second['next_cursor'] is None
    assert client.get('/api/v1/admin/feedback?status=resolved', headers=owner).json()['items'] == []
    assert client.get('/api/v1/admin/feedback?limit=51', headers=owner).status_code == 422
    with SessionLocal.begin() as db:
        oldest = db.scalars(select(Feedback).order_by(Feedback.id)).first()
        oldest.created_at = datetime.now(timezone.utc) - timedelta(days=181)
        for counter in db.query(FeedbackQuota):
            counter.expires_at = 0
    purge()
    with SessionLocal() as db:
        assert db.query(Feedback).count() == 2
        assert db.query(FeedbackQuota).count() == 0


def test_daily_window_and_ipv6_network_keys(client, monkeypatch):
    from app.api.v1 import feedback
    from starlette.requests import Request
    monkeypatch.setattr(config, 'FEEDBACK_GUEST_HOUR', 100)
    monkeypatch.setattr(config, 'FEEDBACK_GUEST_DAY', 2)
    clock = [86400 * 20000 + 60]
    monkeypatch.setattr(feedback.time, 'time', lambda: clock[0])
    assert client.post('/api/v1/feedback', json=payload()).status_code == 201
    clock[0] += 3601
    assert client.post('/api/v1/feedback', json=payload()).status_code == 201
    assert client.post('/api/v1/feedback', json=payload()).status_code == 429
    clock[0] += 86400
    assert client.post('/api/v1/feedback', json=payload()).status_code == 201
    network = lambda ip: feedback.client_network(Request({'type': 'http', 'client': (ip, 9000)}))
    assert network('2001:db8:1:2::123') == network('2001:db8:1:2::456')
    assert network('::ffff:192.0.2.1') == network('192.0.2.1')
