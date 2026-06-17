from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("NARRATIVEOS_CANON_LEDGER_DIR", str(tmp_path / "canon_ledger"))
    monkeypatch.delenv("KIMI_API_KEY", raising=False)
    monkeypatch.delenv("MOONSHOT_API_KEY", raising=False)
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "product_runtime.db")),
    )
    return TestClient(app)


def _first_world_id(client: TestClient) -> str:
    response = client.get("/v1/reader/library/worlds")
    assert response.status_code == 200
    worlds = response.json()["worlds"]
    assert worlds
    return worlds[0]["world_id"]


def test_reader_snapshot_and_worldline_use_session_state(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    world_id = _first_world_id(client)
    started = client.post("/v1/reader/sessions", json={"world_id": world_id, "reader_id": "reader_1"})
    assert started.status_code == 200
    session_id = started.json()["session_id"]

    snapshot = client.get("/v1/reader/snapshot", params={"session_id": session_id})

    assert snapshot.status_code == 200
    payload = snapshot.json()
    assert payload["session_id"] == session_id
    assert payload["world_id"] == world_id
    assert payload["capability_mode"] == "service_contract"
    assert payload["worldline"]["source"] == "reader_session_steps"
    assert payload["quality_brake"]["candidate_status"] == "candidate"

    worldline = client.get(f"/v1/timeline/worldlines/{session_id}/loom")
    assert worldline.status_code == 200
    assert worldline.json()["worldline_id"] == session_id


def test_scene_advance_returns_candidate_scene_and_quality_trace(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    world_id = _first_world_id(client)
    started = client.post("/v1/reader/sessions", json={"world_id": world_id, "reader_id": "reader_2"})
    session_id = started.json()["session_id"]

    advanced = client.post(
        "/v1/scene/advance",
        json={"session_id": session_id, "freeform_intent": "继续读下去，先保护证人。"},
    )

    assert advanced.status_code == 200
    payload = advanced.json()
    assert payload["session_id"] == session_id
    assert payload["status"] == "ok"
    assert payload["candidate_scene"]["status"] == "candidate"
    assert payload["quality_brake"]["decision"] in {"pass", "rewrite", "block", "pending"}
    assert [step["step"] for step in payload["harness_trace"]] == ["plan", "draft", "tool/eval", "confirm"]


def test_quality_evaluate_and_canon_commit_gate(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    candidate_body = (
        "雨停在半空时，潮汐档案室的灯忽然亮了。\n\n"
        "沈星澜听见水钟倒流，知道自己不能再把那页航海日志交出去。"
        "陆白站在门口，没有催他，只问：你准备让谁替你承担后果？\n\n"
        "他把日志收进外衣里。远处第七灯塔重新点火，像一只睁开的眼。"
    )

    evaluated = client.post(
        "/v1/quality/evaluate",
        json={
            "candidate_id": "candidate_demo",
            "world_id": "beacon-beyond",
            "body": candidate_body,
            "choices": ["公开日志", "隐藏幸存者"],
            "character_fidelity_score": 0.72,
        },
    )

    assert evaluated.status_code == 200
    report = evaluated.json()["report"]
    assert report["chapter_id"] == "candidate_demo"
    gate = evaluated.json()["quality_gate"]
    assert gate["candidate_status"] in {"candidate", "canon_ready"}
    assert "summary" in gate
    assert set(gate["scores"]).issuperset(
        {
            "content_safety",
            "language_naturalness",
            "pacing",
            "character_consistency",
            "foreshadowing_continuity",
            "timeline_consistency",
            "release_readiness",
            "overall_score",
        }
    )
    assert isinstance(gate["blockers"], list)
    assert isinstance(gate["warnings"], list)
    assert isinstance(gate["suggested_fixes"], list)
    assert gate["public_safe_message"]
    assert gate["release_decision"] in {"pass", "rewrite", "block", "hold"}
    assert gate["canon_commit_readiness"]["required_confirmation"] is True
    assert gate["studio_debug"]["shadow_checks"][0]["production_gate"] is False

    blocked = client.post(
        "/v1/canon/commit",
        json={"candidate_id": "candidate_demo", "target_status": "canon", "quality_report": report},
    )
    assert blocked.status_code == 200
    assert blocked.json()["status"] == "blocked"
    assert blocked.json()["reason"] == "confirmation_required"
    assert "operator_confirmation" in blocked.json()["quality_gate"]["canon_commit_readiness"]["missing"]

    committed = client.post(
        "/v1/canon/commit",
        headers={"Idempotency-Key": "commit-candidate-demo"},
        json={
            "candidate_id": "candidate_demo",
            "target_status": "canon",
            "confirmed": True,
            "confirmed_by": "qa_operator",
            "quality_report": {
                "chapter_id": "candidate_demo",
                "decision": {"decision": "pass", "reason": "test-approved"},
                "issues": [],
                "scores": {"overall_score": 0.91},
            },
        },
    )
    assert committed.status_code == 200
    payload = committed.json()
    assert payload["status"] == "committed"
    assert payload["idempotent_replay"] is False
    assert payload["write_scope"] == "canon_ledger_only"
    assert payload["rollback_plan"]["status"] == "available_before_public_publish"
    assert payload["quality_gate"]["summary"]
    assert payload["quality_gate"]["canon_commit_readiness"]["ready"] is True
    assert Path(payload["ledger_path"]).exists()

    replayed = client.post(
        "/v1/canon/commit",
        headers={"Idempotency-Key": "commit-candidate-demo"},
        json={
            "candidate_id": "candidate_demo",
            "target_status": "canon",
            "confirmed": True,
            "confirmed_by": "qa_operator",
            "quality_report": {
                "chapter_id": "candidate_demo",
                "decision": {"decision": "pass", "reason": "test-approved"},
                "issues": [],
                "scores": {"overall_score": 0.91},
            },
        },
    )
    assert replayed.status_code == 200
    replayed_payload = replayed.json()
    assert replayed_payload["status"] == "committed"
    assert replayed_payload["commit_id"] == payload["commit_id"]
    assert replayed_payload["ledger_path"] == payload["ledger_path"]
    assert replayed_payload["idempotent_replay"] is True

    missing_key = client.post(
        "/v1/canon/commit",
        json={
            "candidate_id": "candidate_demo_2",
            "target_status": "canon",
            "confirmed": True,
            "confirmed_by": "qa_operator",
            "quality_report": {
                "chapter_id": "candidate_demo_2",
                "decision": {"decision": "pass", "reason": "test-approved"},
                "issues": [],
                "scores": {"overall_score": 0.91},
            },
        },
    )
    assert missing_key.status_code == 200
    assert missing_key.json()["status"] == "blocked"
    assert missing_key.json()["reason"] == "idempotency_key_required"


def test_quality_gate_blocks_engineering_leak_but_keeps_learned_tracks_shadow_only(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    evaluated = client.post(
        "/v1/quality/evaluate",
        json={
            "candidate_id": "candidate_leaky",
            "world_id": "beacon-beyond",
            "body": "event_id -> debug_route\n\n这一章从这里起进入系统状态。",
            "choices": ["继续"],
        },
    )

    assert evaluated.status_code == 200
    gate = evaluated.json()["quality_gate"]
    assert gate["can_commit_canon"] is False
    assert gate["release_decision"] == "block"
    assert gate["blockers"]
    assert "quality_gate_passed" in gate["canon_commit_readiness"]["missing"]
    assert all(item["production_gate"] is False for item in gate["studio_debug"]["shadow_checks"])
