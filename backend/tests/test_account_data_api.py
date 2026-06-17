from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


PASSWORD = "correct horse battery staple"


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("NARRATIVEOS_CREATOR_DIALOGUE_DIR", str(tmp_path / "creator_dialogue_sessions"))
    monkeypatch.delenv("KIMI_API_KEY", raising=False)
    monkeypatch.delenv("MOONSHOT_API_KEY", raising=False)
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "account_data.db")),
    )
    return TestClient(app)


def _auth_headers(client: TestClient, *, actor_id: str, account_id: str) -> dict[str, str]:
    registered = client.post(
        "/v1/auth/register",
        json={
            "actor_id": actor_id,
            "actor_role": "customer",
            "password": PASSWORD,
            "account_id": account_id,
            "display_name": "数据治理测试用户",
        },
    )
    assert registered.status_code == 200
    logged_in = client.post(
        "/v1/auth/login",
        json={"actor_id": actor_id, "password": PASSWORD},
    )
    assert logged_in.status_code == 200
    return {"Authorization": "Bearer %s" % logged_in.json()["token"]["access_token"]}


def _complete_checkout(client: TestClient, account_id: str) -> None:
    started = client.post(
        "/v1/reader/checkout/start",
        json={"account_id": account_id, "tier_id": "play_pass"},
    )
    assert started.status_code == 200
    checkout = started.json()["checkout"]
    checkout_session_id = checkout.get("checkout_session_id") or checkout["session_id"]
    completed = client.post(
        "/v1/reader/checkout/webhook",
        json={
            "provider": checkout.get("provider") or "web_stub",
            "provider_event_id": f"p23-test:{account_id}:{checkout_session_id}:completed",
            "event_type": "checkout_session_completed",
            "account_id": account_id,
            "checkout_session_id": checkout_session_id,
            "payload": {"source": "p23_account_data_test"},
        },
    )
    assert completed.status_code == 200


def _seed_account_data(client: TestClient, *, account_id: str, actor_id: str) -> dict[str, str]:
    reader = client.post(
        "/v1/reader/sessions",
        json={"world_id": "beacon-beyond", "reader_id": account_id},
    )
    assert reader.status_code == 200
    draft = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": actor_id, "seed": "一名守灯人在无月夜收到未来航海日志"},
    )
    assert draft.status_code == 200
    _complete_checkout(client, account_id)
    return {
        "reader_session_id": reader.json()["session_id"],
        "creator_session_id": draft.json()["session_id"],
    }


def test_account_data_requires_sign_in(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    exported = client.get("/v1/account/data/export")
    preview = client.post("/v1/account/delete/preview")
    confirmed = client.post("/v1/account/delete/confirm", json={"confirmation": "删除账号"})

    assert exported.status_code == 401
    assert preview.status_code == 401
    assert confirmed.status_code == 401


def test_account_data_export_is_owned_and_redacted(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    headers = _auth_headers(client, actor_id="p23_author@example.test", account_id="p23_account")
    seeded = _seed_account_data(client, account_id="p23_account", actor_id="p23_author@example.test")
    other = _seed_account_data(client, account_id="other_account", actor_id="other_author")

    exported = client.get("/v1/account/data/export", headers=headers)

    assert exported.status_code == 200
    payload = exported.json()
    assert payload["public_safe"] is True
    assert payload["public_state"] == "ready"
    assert payload["summary"]["reader_session_count"] == 1
    assert payload["summary"]["creator_draft_count"] == 1
    package = payload["package"]
    assert package["account"]["account_id"] == "p23_account"
    assert package["reader_sessions"][0]["session_id"] == seeded["reader_session_id"]
    assert package["creator_drafts"][0]["session_id"] == seeded["creator_session_id"]
    assert other["reader_session_id"] not in str(package)
    assert other["creator_session_id"] not in str(package)
    assert "password_hash" not in str(payload)
    assert "password_salt" not in str(payload)
    assert "token_hash" not in str(payload)
    assert "access_token" not in str(payload)


def test_account_delete_preview_and_confirm_closes_account_data(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    actor_id = "p23_delete@example.test"
    account_id = "p23_delete_account"
    headers = _auth_headers(client, actor_id=actor_id, account_id=account_id)
    _seed_account_data(client, account_id=account_id, actor_id=actor_id)

    preview = client.post("/v1/account/delete/preview", headers=headers)

    assert preview.status_code == 200
    preview_payload = preview.json()
    assert preview_payload["public_state"] == "requires_confirmation"
    assert preview_payload["summary"]["reader_session_count"] == 1
    assert preview_payload["summary"]["creator_draft_count"] == 1
    assert preview_payload["summary"]["active_subscription_count"] == 1
    assert preview_payload["confirmation_required"] == "删除账号"

    rejected = client.post(
        "/v1/account/delete/confirm",
        headers=headers,
        json={"confirmation": "no"},
    )
    assert rejected.status_code == 400

    confirmed = client.post(
        "/v1/account/delete/confirm",
        headers=headers,
        json={"confirmation": "删除账号"},
    )

    assert confirmed.status_code == 200
    deleted = confirmed.json()
    assert deleted["public_state"] == "deleted"
    assert deleted["summary"]["reader_sessions_deleted"] == 1
    assert deleted["summary"]["creator_drafts_deleted"] == 1
    assert deleted["summary"]["subscriptions_marked_for_closure"] == 1
    assert deleted["summary"]["sessions_revoked"] >= 1

    token_check = client.get("/v1/auth/me", headers=headers)
    assert token_check.status_code == 401

    subscription = client.get(f"/v1/reader/subscription?account_id={account_id}")
    assert subscription.status_code == 200
    assert subscription.json()["subscription"]["status"] == "account_closure_pending"

    snapshot = client.get(f"/v1/account/snapshot?account_id={account_id}&creator_id={actor_id}")
    assert snapshot.status_code == 200
    assert snapshot.json()["reader_progress"]["session_count"] == 0
    assert snapshot.json()["creator_drafts"] == []
