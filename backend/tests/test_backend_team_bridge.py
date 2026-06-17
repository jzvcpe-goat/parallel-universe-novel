from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


class FakeBackendTeamBridge:
    enabled = True

    def _gate(self):
        return {
            "status": "passed",
            "candidate_status": "canon_ready",
            "can_commit_canon": True,
            "decision": "pass",
            "overall_score": 0.9,
            "blocking_reasons": [],
            "summary": "quality gate passed",
            "scores": {"overall_score": 0.9, "content_safety": 1.0},
            "blockers": [],
            "warnings": [],
            "suggested_fixes": [],
            "public_safe_message": "ok",
            "studio_debug": {"shadow_checks": []},
            "release_decision": "pass",
            "canon_commit_readiness": {"ready": True, "required_confirmation": True, "missing": []},
        }

    def reader_worlds(self):
        return {
            "capability_mode": "backend_team_bridge",
            "worlds": [
                {
                    "world_id": "root",
                    "title": "灯塔之外",
                    "status": "published",
                    "latest_version": "root",
                    "genres": ["玄幻悬疑"],
                    "risk_rating": None,
                    "trial_available": True,
                    "access_state": "available",
                    "created_at": "2026-06-12T00:00:00+00:00",
                    "updated_at": "2026-06-12T00:00:00+00:00",
                }
            ],
        }

    def reader_world_detail(self, world_id):
        return {
            "capability_mode": "backend_team_bridge",
            "world_id": world_id,
            "title": "灯塔之外",
            "world_version_id": world_id,
            "manifest": {"summary": "from upstream"},
            "risk_policy": {},
            "worldpack": {"title": "灯塔之外"},
            "versions": [{"world_version_id": world_id, "status": "published"}],
        }

    def subscription_status(self, *, account_id=None, reader_id=None):
        return {
            "capability_mode": "backend_team_bridge",
            "account_id": account_id or reader_id or "reader-free",
            "subscription": None,
            "wallets": {},
            "effective_tier": "beta_free",
            "tiers": [],
        }

    def checkout_start(self, payload):
        return {
            "capability_mode": "backend_team_bridge",
            "checkout": {
                "provider": "backend_team_package",
                "tier_id": payload["tier_id"],
                "session_id": "upstream-checkout",
                "status": "started",
            },
        }

    def scene_advance(self, payload):
        return {
            "capability_mode": "backend_team_bridge",
            "status": "ok",
            "session_id": payload["session_id"],
            "world_id": payload["worldline_id"],
            "candidate_scene": {"status": "candidate", "reader_view": {"body": "upstream scene"}},
            "quality_brake": self._gate(),
            "harness_trace": [],
        }

    def worldline_events(self, worldline_id):
        return {
            "capability_mode": "backend_team_bridge",
            "worldline_id": worldline_id,
            "world_id": worldline_id,
            "source": "backend_team_events",
            "event_count": 1,
            "events": [{"id": "event-1", "title": "upstream event"}],
            "density_summary": {"mode": "backend_team_bridge"},
        }

    def quality_evaluate(self, payload):
        return {
            "capability_mode": "backend_team_bridge",
            "status": "evaluated",
            "report": {"chapter_id": payload["candidate_id"], "decision": {"decision": "pass"}, "issues": [], "scores": {"overall_score": 0.9}},
            "quality_gate": self._gate(),
        }

    def canon_commit(self, payload):
        return {
            "capability_mode": "backend_team_bridge",
            "status": "committed",
            "commit_id": "upstream-canon",
            "quality_gate": self._gate(),
        }


def _client(tmp_path: Path) -> TestClient:
    app = create_app(repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "bridge.db")))
    app.state.backend_team_bridge = FakeBackendTeamBridge()
    return TestClient(app)


def test_backend_team_bridge_can_supply_reader_and_billing_contracts(tmp_path: Path):
    client = _client(tmp_path)

    worlds = client.get("/v1/reader/library/worlds")
    assert worlds.status_code == 200
    assert worlds.json()["capability_mode"] == "backend_team_bridge"
    assert worlds.json()["worlds"][0]["world_id"] == "root"

    detail = client.get("/v1/reader/library/worlds/root")
    assert detail.status_code == 200
    assert detail.json()["world_version_id"] == "root"

    subscription = client.get("/v1/reader/subscription", params={"account_id": "reader-free"})
    assert subscription.status_code == 200
    assert subscription.json()["capability_mode"] == "backend_team_bridge"

    checkout = client.post("/v1/reader/checkout/start", json={"account_id": "reader-free", "tier_id": "play_pass"})
    assert checkout.status_code == 200
    assert checkout.json()["checkout"]["provider"] == "backend_team_package"


def test_backend_team_bridge_can_supply_runtime_contracts(tmp_path: Path):
    client = _client(tmp_path)

    advanced = client.post(
        "/v1/scene/advance",
        json={
            "session_id": "session-upstream",
            "worldline_id": "root",
            "scene_id": "scene-1",
            "choice_id": "choice-1",
            "user_id": "reader-free",
        },
    )
    assert advanced.status_code == 200
    assert advanced.json()["capability_mode"] == "backend_team_bridge"
    assert advanced.json()["candidate_scene"]["reader_view"]["body"] == "upstream scene"

    events = client.get("/v1/timeline/worldlines/root/loom")
    assert events.status_code == 200
    assert events.json()["source"] == "backend_team_events"

    quality = client.post("/v1/quality/evaluate", json={"candidate_id": "candidate-1", "body": "一段正文。"})
    assert quality.status_code == 200
    assert quality.json()["quality_gate"]["can_commit_canon"] is True
    assert "summary" in quality.json()["quality_gate"]
    assert "public_safe_message" in quality.json()["quality_gate"]
    assert "canon_commit_readiness" in quality.json()["quality_gate"]

    committed = client.post(
        "/v1/canon/commit",
        json={"candidate_id": "candidate-1", "worldline_id": "root", "confirmed": True},
    )
    assert committed.status_code == 200
    assert committed.json()["commit_id"] == "upstream-canon"
