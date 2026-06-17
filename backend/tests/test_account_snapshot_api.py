from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("NARRATIVEOS_CREATOR_DIALOGUE_DIR", str(tmp_path / "creator_dialogue_sessions"))
    monkeypatch.delenv("KIMI_API_KEY", raising=False)
    monkeypatch.delenv("MOONSHOT_API_KEY", raising=False)
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "account_snapshot.db")),
    )
    return TestClient(app)


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
            "provider_event_id": f"p20-test:{account_id}:{checkout_session_id}:completed",
            "event_type": "checkout_session_completed",
            "account_id": account_id,
            "checkout_session_id": checkout_session_id,
            "payload": {"source": "p20_account_snapshot_test"},
        },
    )
    assert completed.status_code == 200


def test_account_snapshot_merges_membership_reader_progress_and_creator_drafts(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    account_id = "p20_reader_account"

    session = client.post(
        "/v1/reader/sessions",
        json={"world_id": "beacon-beyond", "account_id": account_id},
    )
    assert session.status_code == 200

    creator = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": account_id, "seed": "一名守灯人在无月夜收到未来航海日志"},
    )
    assert creator.status_code == 200
    _complete_checkout(client, account_id)

    snapshot = client.get(f"/v1/account/snapshot?account_id={account_id}&creator_id={account_id}")

    assert snapshot.status_code == 200
    payload = snapshot.json()
    assert payload["public_safe"] is True
    assert payload["account"]["account_id"] == account_id
    assert payload["account"]["auth_state"] == "guest_profile"
    assert payload["account"]["requires_login_for_cross_device"] is True
    assert payload["membership"]["status"] == "active"
    assert payload["membership"]["tier_id"] == "play_pass"
    assert payload["membership"]["story_credits"] == 30
    assert payload["reader_progress"]["resume_available"] is True
    assert payload["reader_progress"]["latest"]["world_id"] == "beacon-beyond"
    assert payload["creator_drafts"]
    assert payload["creator_drafts"][0]["session_id"] == creator.json()["session_id"]
    assert payload["story_projects"]["status"] == "not_connected"
    assert payload["local_fallback"]["merge_required"] is False
    assert payload["conflicts"] == []
    assert payload["resume_action"]["type"] == "continue_reading"
    assert "diagnostics" not in payload


def test_account_snapshot_diagnostics_are_opt_in(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    account_id = "p20_diag_account"
    client.post("/v1/reader/sessions", json={"world_id": "beacon-beyond", "account_id": account_id})

    snapshot = client.get(f"/v1/account/snapshot?account_id={account_id}&include_diagnostics=true")

    assert snapshot.status_code == 200
    diagnostics = snapshot.json()["diagnostics"]
    assert diagnostics["reader_session_count"] == 1
    assert diagnostics["creator_draft_count"] == 0


def test_account_snapshot_uses_bearer_identity_when_present(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    registered = client.post(
        "/v1/auth/register",
        json={
            "actor_id": "author_p20",
            "actor_role": "author",
            "password": "correct horse battery staple",
            "account_id": "account_p20_signed_in",
            "display_name": "P20 Author",
        },
    )
    assert registered.status_code == 200
    logged_in = client.post(
        "/v1/auth/login",
        json={"actor_id": "author_p20", "password": "correct horse battery staple"},
    )
    assert logged_in.status_code == 200
    token = logged_in.json()["token"]["access_token"]

    snapshot = client.get("/v1/account/snapshot", headers={"Authorization": f"Bearer {token}"})

    assert snapshot.status_code == 200
    account = snapshot.json()["account"]
    assert account["account_id"] == "account_p20_signed_in"
    assert account["creator_id"] == "author_p20"
    assert account["display_name"] == "P20 Author"
    assert account["auth_state"] == "signed_in"
    assert account["requires_login_for_cross_device"] is False
