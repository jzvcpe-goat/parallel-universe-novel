from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path) -> TestClient:
    app = create_app(repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "harness_narrow.db")))
    return TestClient(app)


def test_harness_auth_register_login_me_logout(tmp_path: Path):
    client = _client(tmp_path)

    register = client.post(
        "/v1/auth/register",
        json={
            "actor_id": "harness_reader",
            "actor_role": "reader",
            "account_id": "harness_reader",
            "password": "secret123",
            "display_name": "Harness Reader",
        },
    )
    assert register.status_code == 200
    assert register.json()["identity"]["actor_id"] == "harness_reader"

    login = client.post("/v1/auth/login", json={"actor_id": "harness_reader", "password": "secret123"})
    assert login.status_code == 200
    token = login.json()["token"]["access_token"]

    me = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["identity"]["actor_id"] == "harness_reader"

    logout = client.post("/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout.status_code == 200


def test_harness_reader_and_billing_core_routes(tmp_path: Path):
    client = _client(tmp_path)

    worlds = client.get("/v1/reader/library/worlds")
    assert worlds.status_code == 200
    world_payload = worlds.json()
    assert world_payload["worlds"]
    world_id = world_payload["worlds"][0]["world_id"]

    detail = client.get(f"/v1/reader/library/worlds/{world_id}")
    assert detail.status_code == 200
    assert detail.json()["world_id"] == world_id

    reader_session = client.post(
        "/v1/reader/sessions",
        json={"world_id": world_id, "account_id": "harness_reader"},
    )
    assert reader_session.status_code == 200
    session_id = reader_session.json()["session_id"]

    quote = client.get(f"/v1/reader/sessions/{session_id}/quote")
    assert quote.status_code == 200
    assert "required" in quote.json()

    continue_response = client.post(
        "/v1/reader/continue",
        json={"session_id": session_id, "account_id": "harness_reader", "freeform_intent": "继续读下去。"},
    )
    assert continue_response.status_code == 200
    assert continue_response.json()["status"] in {"ok", "payment_required"}

    replay = client.get(f"/v1/reader/sessions/{session_id}/replay")
    assert replay.status_code == 200
    assert "session" in replay.json()

    prefill = client.get(f"/v1/reader/sessions/{session_id}/prefill")
    assert prefill.status_code == 200
    assert prefill.json()

    subscription = client.get("/v1/reader/subscription", params={"account_id": "harness_reader"})
    assert subscription.status_code == 200
    assert [tier["tier_id"] for tier in subscription.json()["tiers"]] == ["play_pass", "creator_pass", "studio_pass"]

    checkout = client.post(
        "/v1/reader/checkout/start",
        json={"account_id": "harness_reader", "tier_id": "play_pass", "provider": "web_stub"},
    )
    assert checkout.status_code == 200
    assert checkout.json()["checkout"]["provider"] == "web_stub"

    trends = client.get("/v1/market/trends", params={"cadence": "weekly"})
    assert trends.status_code == 200
    assert trends.json()["function_call"]["name"] == "scan_market_trends"


def test_current_frontend_world_ids_create_real_reader_sessions(tmp_path: Path):
    client = _client(tmp_path)

    worlds = client.get("/v1/reader/library/worlds")
    assert worlds.status_code == 200
    world_ids = {world["world_id"] for world in worlds.json()["worlds"]}
    assert {
        "beacon-beyond",
        "rain-bridge",
        "jade-contract",
        "lotus-lane",
        "frontier-edict",
        "algorithm-city",
    }.issubset(world_ids)

    reader_session = client.post(
        "/v1/reader/sessions",
        json={"world_id": "beacon-beyond", "account_id": "web_reader_demo"},
    )
    assert reader_session.status_code == 200
    session_payload = reader_session.json()
    assert session_payload["world_id"] == "beacon-beyond"
    assert session_payload["world_version_id"] == "beacon-beyond@0.1.0"

    continued = client.post(
        "/v1/reader/continue",
        json={
            "session_id": session_payload["session_id"],
            "account_id": "web_reader_demo",
            "choice_id": "publish-signal",
            "freeform_intent": "公开灯码",
        },
    )
    assert continued.status_code == 200
    assert continued.json()["world_id"] == "beacon-beyond"
