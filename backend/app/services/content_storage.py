"""Private content-object storage adapters used by the importer and API.

Supabase access always uses the backend-only service role. Object keys are never returned
to browser clients and the bucket must remain private.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen


def _supabase_config() -> tuple[str, str, str] | None:
    if os.getenv("CONTENT_STORAGE_BACKEND", "local").lower() != "supabase":
        return None
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    bucket = os.getenv("CONTENT_STORAGE_BUCKET", "")
    if not any((url, key, bucket)):
        return None
    if not all((url, key, bucket)):
        raise RuntimeError("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CONTENT_STORAGE_BUCKET must be set together")
    return url, key, bucket


def using_supabase() -> bool:
    return _supabase_config() is not None


def _request(method: str, object_key: str, data: bytes | None = None, media_type: str = "application/octet-stream") -> bytes:
    config = _supabase_config()
    if config is None:
        raise RuntimeError("Supabase content storage is not configured")
    url, key, bucket = config
    object_url = f"{url}/storage/v1/object/{quote(bucket, safe='')}/{quote(object_key, safe='/')}"
    headers = {"Authorization": f"Bearer {key}", "apikey": key}
    if data is not None:
        headers.update({"Content-Type": media_type, "x-upsert": "false"})
    try:
        with urlopen(Request(object_url, data=data, headers=headers, method=method), timeout=60) as response:
            return response.read()
    except HTTPError as exc:
        # An existing immutable object is acceptable only after download/hash verification.
        if method == "POST" and exc.code in {400, 409}:
            return b""
        raise RuntimeError(f"private Storage request failed with HTTP {exc.code}") from exc


def put_verified(object_key: str, data: bytes, expected_sha256: str, media_type: str, local_root: Path) -> None:
    if hashlib.sha256(data).hexdigest() != expected_sha256:
        raise ValueError(f"refusing object with invalid digest: {object_key}")
    if using_supabase():
        _request("POST", object_key, data, media_type)
        stored = _request("GET", object_key)
        if hashlib.sha256(stored).hexdigest() != expected_sha256:
            raise ValueError(f"stored object has wrong digest: {object_key}")
        return
    destination = local_root / object_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() != expected_sha256:
        raise ValueError(f"existing staged object has wrong digest: {object_key}")
    if not destination.exists():
        destination.write_bytes(data)


def get_verified(object_key: str, expected_sha256: str, expected_size: int, local_root: Path) -> bytes:
    data = _request("GET", object_key) if using_supabase() else (local_root / object_key).read_bytes()
    if len(data) != expected_size or hashlib.sha256(data).hexdigest() != expected_sha256:
        raise ValueError("artifact integrity validation failed")
    return data
