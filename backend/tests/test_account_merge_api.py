from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("NARRATIVEOS_CREATOR_DIALOGUE_DIR", str(tmp_path / "creator_dialogue_sessions"))
    monkeypatch.delenv("KIMI_API_KEY", raising=False)
    monkeypatch.delenv("MOONSHOT_API_KEY", raising=False)
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "account_merge.db")),
    )
    return TestClient(app)


def _auth_headers(client: TestClient, *, actor_id: str, account_id: str) -> dict[str, str]:
    registered = client.post(
        "/v1/auth/register",
        json={
            "actor_id": actor_id,
            "actor_role": "customer",
            "password": "correct horse battery staple",
            "account_id": account_id,
            "display_name": "合并测试用户",
        },
    )
    assert registered.status_code == 200
    logged_in = client.post(
        "/v1/auth/login",
        json={"actor_id": actor_id, "password": "correct horse battery staple"},
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
            "provider_event_id": f"p22-test:{account_id}:{checkout_session_id}:completed",
            "event_type": "checkout_session_completed",
            "account_id": account_id,
            "checkout_session_id": checkout_session_id,
            "payload": {"source": "p22_account_merge_test"},
        },
    )
    assert completed.status_code == 200


def _seed_guest_profile(client: TestClient, *, reader_id: str, creator_id: str) -> dict[str, str]:
    reader = client.post(
        "/v1/reader/sessions",
        json={"world_id": "beacon-beyond", "reader_id": reader_id},
    )
    assert reader.status_code == 200
    draft = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": creator_id, "seed": "边境少年收到一封互相矛盾的密诏"},
    )
    assert draft.status_code == 200
    return {
        "reader_session_id": reader.json()["session_id"],
        "creator_session_id": draft.json()["session_id"],
    }


def test_account_merge_requires_sign_in_for_confirm(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    preview = client.post(
        "/v1/account/merge/preview",
        json={"guest_reader_id": "guest_reader", "guest_creator_id": "guest_creator"},
    )
    assert preview.status_code == 200
    assert preview.json()["public_state"] == "requires_login"

    confirmed = client.post(
        "/v1/account/merge/confirm",
        json={"guest_reader_id": "guest_reader", "guest_creator_id": "guest_creator"},
    )

    assert confirmed.status_code == 401
    assert confirmed.json()["detail"]["code"] == "sign_in_required"


def test_account_merge_preview_and_confirm_moves_browser_profile_to_signed_account(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    guest_reader_id = "guest_p22_reader"
    guest_creator_id = "guest_p22_creator"
    actor_id = "author_p22@example.test"
    account_id = "account_p22_signed"
    seeded = _seed_guest_profile(client, reader_id=guest_reader_id, creator_id=guest_creator_id)
    headers = _auth_headers(client, actor_id=actor_id, account_id=account_id)
    _complete_checkout(client, account_id)

    signed_snapshot = client.get("/v1/account/snapshot", headers=headers)
    assert signed_snapshot.status_code == 200
    assert signed_snapshot.json()["account"]["auth_state"] == "signed_in"
    assert signed_snapshot.json()["reader_progress"]["session_count"] == 0

    preview = client.post(
        "/v1/account/merge/preview",
        headers=headers,
        json={"guest_reader_id": guest_reader_id, "guest_creator_id": guest_creator_id},
    )

    assert preview.status_code == 200
    preview_payload = preview.json()
    assert preview_payload["public_safe"] is True
    assert preview_payload["public_state"] == "ready_to_merge"
    assert preview_payload["summary"]["reader_progress_count"] == 1
    assert preview_payload["summary"]["creator_draft_count"] == 1
    assert preview_payload["summary"]["membership_status"] == "active"
    assert "diagnostics" not in preview_payload

    confirmed = client.post(
        "/v1/account/merge/confirm",
        headers=headers,
        json={"guest_reader_id": guest_reader_id, "guest_creator_id": guest_creator_id},
    )

    assert confirmed.status_code == 200
    merged = confirmed.json()
    assert merged["public_state"] == "merged"
    assert merged["summary"]["reader_progress_merged"] == 1
    assert merged["summary"]["creator_drafts_merged"] == 1
    assert merged["summary"]["membership_status"] == "active"
    assert merged["snapshot"]["account"]["account_id"] == account_id
    assert merged["snapshot"]["account"]["creator_id"] == actor_id
    assert merged["snapshot"]["membership"]["status"] == "active"
    assert merged["snapshot"]["reader_progress"]["latest"]["session_id"] == seeded["reader_session_id"]
    assert merged["snapshot"]["creator_drafts"][0]["session_id"] == seeded["creator_session_id"]
    assert merged["resume_action"]["type"] == "continue_reading"

    guest_snapshot = client.get(
        f"/v1/account/snapshot?account_id={guest_reader_id}&creator_id={guest_creator_id}",
    )
    assert guest_snapshot.status_code == 200
    assert guest_snapshot.json()["reader_progress"]["session_count"] == 0
    assert guest_snapshot.json()["creator_drafts"] == []


def test_account_merge_preview_reports_public_conflicts_without_diagnostics(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    guest_reader_id = "guest_p22_conflict_reader"
    guest_creator_id = "guest_p22_conflict_creator"
    actor_id = "author_p22_conflict@example.test"
    account_id = "account_p22_conflict"
    _seed_guest_profile(client, reader_id=guest_reader_id, creator_id=guest_creator_id)
    headers = _auth_headers(client, actor_id=actor_id, account_id=account_id)

    account_reader = client.post(
        "/v1/reader/sessions",
        json={"world_id": "beacon-beyond", "reader_id": account_id},
    )
    assert account_reader.status_code == 200
    account_draft = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": actor_id, "seed": "边境少年收到一封互相矛盾的密诏"},
    )
    assert account_draft.status_code == 200

    preview = client.post(
        "/v1/account/merge/preview",
        headers=headers,
        json={"guest_reader_id": guest_reader_id, "guest_creator_id": guest_creator_id},
    )

    assert preview.status_code == 200
    payload = preview.json()
    assert payload["public_state"] == "needs_review"
    assert payload["recommended_action"] == "review_and_confirm"
    assert payload["conflicts"]
    assert {item["type"] for item in payload["conflicts"]} == {"reader_progress", "creator_draft"}
    assert all("label" in item and "resolution" in item for item in payload["conflicts"])
    assert "diagnostics" not in payload
