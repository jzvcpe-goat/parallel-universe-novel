import hashlib
import hmac
import json
from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path, name: str) -> tuple[TestClient, SQLAlchemyRepository]:
    repository = SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / name))
    return TestClient(create_app(repository=repository)), repository


def _signed_body(payload: dict, secret: str) -> tuple[bytes, str]:
    body = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    signature = "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return body, signature


def test_checkout_return_refreshes_membership_snapshot_without_public_provider_leak(tmp_path: Path):
    client, repository = _client(tmp_path, "p21_checkout_return.db")

    started = client.post(
        "/v1/reader/checkout/start",
        json={"account_id": "acct_p21_return", "tier_id": "play_pass"},
    )
    assert started.status_code == 200
    checkout = started.json()["checkout"]
    checkout_session_id = checkout["checkout_session_id"]

    pending = client.get(
        f"/v1/reader/checkout/{checkout_session_id}/status",
        params={"account_id": "acct_p21_return"},
    )
    assert pending.status_code == 200
    pending_payload = pending.json()
    assert pending_payload["public_state"] == "processing"
    assert "provider" not in json.dumps(pending_payload, ensure_ascii=False)
    assert "idempotency_key" not in json.dumps(pending_payload, ensure_ascii=False)

    returned = client.post(
        "/v1/reader/checkout/return",
        json={"account_id": "acct_p21_return", "checkout_session_id": checkout_session_id},
    )
    assert returned.status_code == 200
    returned_payload = returned.json()
    assert returned_payload["public_state"] == "active"
    assert returned_payload["subscription"]["status"] == "active"
    assert returned_payload["checkout"]["status"] == "completed"
    assert "provider" not in json.dumps(returned_payload, ensure_ascii=False)

    snapshot = client.get(
        "/v1/account/snapshot",
        params={"account_id": "acct_p21_return", "reader_id": "acct_p21_return", "creator_id": "acct_p21_return"},
    )
    assert snapshot.status_code == 200
    assert snapshot.json()["membership"]["status"] == "active"

    returned_again = client.post(
        "/v1/reader/checkout/return",
        json={"account_id": "acct_p21_return", "checkout_session_id": checkout_session_id},
    )
    assert returned_again.status_code == 200
    assert returned_again.json()["public_state"] == "active"
    assert len(repository.list_subscriptions(account_id="acct_p21_return")) == 1


def test_checkout_provider_callback_requires_valid_signature_and_is_idempotent(tmp_path: Path, monkeypatch):
    secret = "p21-local-secret"
    monkeypatch.setenv("NARRATIVEOS_BILLING_WEBHOOK_SECRET", secret)
    client, repository = _client(tmp_path, "p21_provider_callback.db")

    started = client.post(
        "/v1/reader/checkout/start",
        json={"account_id": "acct_p21_callback", "tier_id": "creator_pass"},
    )
    assert started.status_code == 200
    checkout_session_id = started.json()["checkout"]["checkout_session_id"]

    payload = {
        "provider": "web_stub",
        "provider_event_id": "evt_p21_checkout_complete",
        "event_type": "checkout_session_completed",
        "account_id": "acct_p21_callback",
        "checkout_session_id": checkout_session_id,
        "payload": {"source": "provider_callback_test"},
    }
    raw_body, signature = _signed_body(payload, secret)

    unsigned = client.post("/v1/reader/checkout/provider-callback", content=raw_body, headers={"content-type": "application/json"})
    assert unsigned.status_code == 403

    forged = client.post(
        "/v1/reader/checkout/provider-callback",
        content=raw_body,
        headers={"content-type": "application/json", "x-narrativeos-signature": "sha256=bad"},
    )
    assert forged.status_code == 403

    accepted = client.post(
        "/v1/reader/checkout/provider-callback",
        content=raw_body,
        headers={"content-type": "application/json", "x-narrativeos-signature": signature},
    )
    assert accepted.status_code == 200
    assert accepted.json()["verification"]["verified"] is True
    event_id = accepted.json()["event"]["event_id"]
    assert accepted.json()["event"]["processing_result"]["signature_verified"] is True

    replayed = client.post(
        "/v1/reader/checkout/provider-callback",
        content=raw_body,
        headers={"content-type": "application/json", "x-narrativeos-signature": signature},
    )
    assert replayed.status_code == 200
    assert replayed.json()["event"]["event_id"] == event_id
    assert len(repository.list_subscriptions(account_id="acct_p21_callback")) == 1

    status = client.get(
        f"/v1/reader/checkout/{checkout_session_id}/status",
        params={"account_id": "acct_p21_callback"},
    )
    assert status.status_code == 200
    assert status.json()["public_state"] == "active"
