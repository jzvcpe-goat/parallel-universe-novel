from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    monkeypatch.setenv("NARRATIVEOS_CANON_LEDGER_DIR", str(tmp_path / "canon_ledger"))
    monkeypatch.setenv("NARRATIVEOS_TIME_ENGINE_LEDGER_DIR", str(tmp_path / "time_engine_ledger"))
    monkeypatch.setenv("NARRATIVEOS_BRANCH_PUBLISH_LEDGER_DIR", str(tmp_path / "branch_publish_ledger"))
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
    assert [step["step"] for step in payload["harness_trace"]] == ["plan", "draft", "tool/eval", "branch/writeback", "confirm"]


def test_scene_advance_persists_reader_branch_trace(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    world_id = _first_world_id(client)
    started = client.post("/v1/reader/sessions", json={"world_id": world_id, "reader_id": "reader_branch"})
    session_id = started.json()["session_id"]

    advanced = client.post(
        "/v1/scene/advance",
        json={
            "session_id": session_id,
            "choice_id": "choice_public_signal",
            "freeform_intent": "公开证据，但先保护证人。",
            "worldline_id": session_id,
            "branch_id": "public-signal",
            "source_run_id": "reader-run-branch-proof",
        },
    )

    assert advanced.status_code == 200
    payload = advanced.json()
    assert payload["status"] == "ok"
    assert payload["branch_writeback"]["status"] == "persisted"
    assert payload["branch_writeback"]["branch_written"] is True
    assert payload["branch_writeback"]["write_scope"] == "route_choice_ledger_only"
    assert payload["branch_writeback"]["source_run_id"] == "reader-run-branch-proof"
    assert payload["branch_writeback"]["branch_id"] == "public-signal"
    assert payload["branch_writeback"]["rollback_plan"]["status"] == "available_before_public_publish"
    assert payload["branch_writeback"]["world_instance_writeback"]["status"] == "candidate"
    assert payload["branch_writeback"]["world_instance_writeback"]["write_scope"] == "world_instance_patch_candidate_only"
    assert "relationship_graph" in payload["branch_writeback"]["world_instance_writeback"]["state_refs"]
    patch = payload["branch_writeback"]["world_instance_patch_candidate"]
    assert patch["status"] == "candidate"
    assert patch["write_scope"] == "world_instance_patch_candidate_only"
    assert patch["source_run_id"] == "reader-run-branch-proof"
    assert patch["rollback_plan"]["method"] == "discard_world_instance_patch_candidate"
    assert set(patch["patch"]).issuperset(
        {
            "world_facts_added",
            "open_promises_added",
            "relationship_edges_changed",
            "route_fingerprint_added",
        }
    )
    assert set(patch["snapshot_summary"]).issuperset(
        {
            "world_fact_count",
            "open_promise_count",
            "relationship_edge_count",
            "route_fingerprint_count",
        }
    )
    assert all(step["source_run_id"] == "reader-run-branch-proof" for step in payload["harness_trace"])

    snapshot = client.get("/v1/reader/snapshot", params={"session_id": session_id})
    assert snapshot.status_code == 200
    worldline = snapshot.json()["worldline"]
    assert worldline["route_choice_count"] == 1
    assert worldline["branch_writeback_summary"]["status"] == "linked"
    assert worldline["branch_writeback_summary"]["world_instance_patch_count"] == 1
    assert worldline["world_instance_writeback_summary"]["status"] == "candidate"
    assert worldline["world_instance_writeback_summary"]["write_scope"] == "world_instance_patch_candidate_only"
    assert worldline["world_instance_writeback_summary"]["latest_snapshot_summary"]["relationship_edge_count"] >= 0
    assert worldline["events"][0]["choice_id"] == "choice_public_signal"
    assert worldline["events"][0]["source_run_id"] == "reader-run-branch-proof"
    assert worldline["events"][0]["world_instance_patch_candidate"]["status"] == "candidate"

    worldline_response = client.get(f"/v1/timeline/worldlines/{session_id}/loom")
    assert worldline_response.status_code == 200
    assert worldline_response.json()["branch_writeback_summary"]["write_scope"] == "route_choice_ledger_only"
    assert worldline_response.json()["world_instance_writeback_summary"]["patch_count"] == 1


def test_time_engine_persists_durable_candidate_events(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    world_id = _first_world_id(client)
    started = client.post("/v1/reader/sessions", json={"world_id": world_id, "reader_id": "reader_time"})
    session_id = started.json()["session_id"]
    beat_plan = ["异常入场", "压力升高", "连锁爆发", "余波回收"]

    planned = client.post(
        f"/v1/timeline/worldlines/{session_id}/time-engine/candidates",
        json={
            "source_run_id": "time-run-proof",
            "beat_plan": beat_plan,
        },
    )

    assert planned.status_code == 200
    payload = planned.json()
    assert payload["status"] == "candidate"
    assert payload["capability_mode"] == "durable_service_contract"
    assert payload["write_scope"] == "time_event_candidate_ledger_only"
    assert payload["source_run_id"] == "time-run-proof"
    assert payload["worldline_id"] == session_id
    assert payload["beat_plan"] == beat_plan
    assert len(payload["candidate_events"]) >= 3
    assert all(event["source"] == "time_engine" for event in payload["candidate_events"])
    assert any(event["hawkesBoost"] > 0 for event in payload["candidate_events"])
    assert payload["time_consistency_report"]["status"] == "pass"
    assert payload["time_consistency_report"]["acceptedTimeEvents"]
    assert payload["density_summary"]["mode"] == "fastapi_durable_time_engine"
    assert payload["rollback_plan"]["method"] == "delete_time_event_candidate_ledger_record"
    assert Path(payload["ledger_path"]).exists()
    assert Path(payload["latest_path"]).exists()

    replayed = client.post(
        f"/v1/timeline/worldlines/{session_id}/time-engine/candidates",
        json={
            "source_run_id": "time-run-proof",
            "beat_plan": beat_plan,
        },
    )
    assert replayed.status_code == 200
    replayed_payload = replayed.json()
    assert replayed_payload["idempotent_replay"] is True
    assert replayed_payload["time_engine_run_id"] == payload["time_engine_run_id"]
    assert replayed_payload["candidate_events"] == payload["candidate_events"]

    snapshot = client.get(f"/v1/timeline/worldlines/{session_id}/time-engine")
    assert snapshot.status_code == 200
    assert snapshot.json()["time_engine_run_id"] == payload["time_engine_run_id"]
    assert snapshot.json()["candidate_events"] == payload["candidate_events"]

    worldline = client.get(f"/v1/timeline/worldlines/{session_id}/loom")
    assert worldline.status_code == 200
    worldline_payload = worldline.json()
    assert worldline_payload["time_engine_summary"]["status"] == "candidate"
    assert worldline_payload["time_engine_summary"]["write_scope"] == "time_event_candidate_ledger_only"
    assert worldline_payload["time_engine_summary"]["candidate_event_count"] == len(payload["candidate_events"])
    assert worldline_payload["density_summary"]["mode"] == "fastapi_time_engine"


def test_branch_publish_candidate_consumes_route_choice_and_time_engine(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    world_id = _first_world_id(client)
    started = client.post("/v1/reader/sessions", json={"world_id": world_id, "reader_id": "reader_publish"})
    session_id = started.json()["session_id"]

    advanced = client.post(
        "/v1/scene/advance",
        json={
            "session_id": session_id,
            "choice_id": "choice_keep_witness_hidden",
            "freeform_intent": "先隐藏证人，再公开关键线索。",
            "worldline_id": session_id,
            "branch_id": "hidden-witness",
            "source_run_id": "reader-run-publish-proof",
        },
    )
    assert advanced.status_code == 200
    route_choice_event_id = advanced.json()["branch_writeback"]["choice_event_id"]

    planned = client.post(
        f"/v1/timeline/worldlines/{session_id}/time-engine/candidates",
        json={
            "source_run_id": "time-run-publish-proof",
            "beat_plan": ["选择落点", "证人压力", "连锁追查", "余波封存"],
        },
    )
    assert planned.status_code == 200
    time_engine_payload = planned.json()

    missing_key = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-candidate",
        json={"branch_id": "hidden-witness", "route_choice_event_id": route_choice_event_id},
    )
    assert missing_key.status_code == 200
    assert missing_key.json()["status"] == "blocked"
    assert missing_key.json()["reason"] == "idempotency_key_required"

    published = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-candidate",
        headers={"Idempotency-Key": "branch-publish-proof-key"},
        json={
            "branch_id": "hidden-witness",
            "route_choice_event_id": route_choice_event_id,
            "source_run_id": "branch-publish-run-proof",
        },
    )
    assert published.status_code == 200
    payload = published.json()
    assert payload["status"] == "candidate"
    assert payload["capability_mode"] == "branch_publish_candidate_gate"
    assert payload["write_scope"] == "branch_publish_candidate_ledger_only"
    assert payload["worldline_id"] == session_id
    assert payload["branch_id"] == "hidden-witness"
    assert payload["source_run_id"] == "branch-publish-run-proof"
    assert payload["route_choice_event_id"] == route_choice_event_id
    assert payload["time_engine_run_id"] == time_engine_payload["time_engine_run_id"]
    assert payload["consumed_time_event_ids"] == [event["id"] for event in time_engine_payload["candidate_events"]]
    assert payload["consumed_time_density_summary"]["mode"] == "fastapi_durable_time_engine"
    assert payload["world_instance_patch_candidate"]["write_scope"] == "world_instance_patch_candidate_only"
    assert payload["transaction_plan"]["status"] == "future_gate"
    assert "database_transaction_rollback_fixture" in payload["transaction_plan"]["required_before_public_publish"]
    assert payload["rollback_plan"]["method"] == "delete_branch_publish_candidate_ledger_record"
    assert Path(payload["ledger_path"]).exists()
    assert Path(payload["latest_path"]).exists()

    replayed = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-candidate",
        headers={"Idempotency-Key": "branch-publish-proof-key"},
        json={
            "branch_id": "hidden-witness",
            "route_choice_event_id": route_choice_event_id,
            "source_run_id": "branch-publish-run-proof",
        },
    )
    assert replayed.status_code == 200
    replayed_payload = replayed.json()
    assert replayed_payload["idempotent_replay"] is True
    assert replayed_payload["branch_publish_candidate_id"] == payload["branch_publish_candidate_id"]
    assert replayed_payload["consumed_time_event_ids"] == payload["consumed_time_event_ids"]

    snapshot = client.get(f"/v1/timeline/worldlines/{session_id}/branches/publish-candidate")
    assert snapshot.status_code == 200
    assert snapshot.json()["branch_publish_candidate_id"] == payload["branch_publish_candidate_id"]

    worldline = client.get(f"/v1/timeline/worldlines/{session_id}/loom")
    assert worldline.status_code == 200
    worldline_payload = worldline.json()
    assert worldline_payload["branch_publish_summary"]["status"] == "candidate"
    assert worldline_payload["branch_publish_summary"]["write_scope"] == "branch_publish_candidate_ledger_only"
    assert worldline_payload["branch_publish_summary"]["time_engine_run_id"] == time_engine_payload["time_engine_run_id"]
    assert worldline_payload["branch_publish_summary"]["consumed_time_event_count"] == len(
        time_engine_payload["candidate_events"]
    )
    assert worldline_payload["branch_publish_summary"]["transaction_rollback_fixture"] == "available"


def test_branch_publish_rollback_fixture_proves_database_transaction_boundary(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    world_id = _first_world_id(client)
    started = client.post("/v1/reader/sessions", json={"world_id": world_id, "reader_id": "reader_rollback"})
    session_id = started.json()["session_id"]

    advanced = client.post(
        "/v1/scene/advance",
        json={
            "session_id": session_id,
            "choice_id": "choice_keep_witness_hidden",
            "freeform_intent": "先藏起证人，再等待潮汐档案的第二次开门。",
            "worldline_id": session_id,
            "branch_id": "rollback-proof-branch",
            "source_run_id": "reader-run-rollback-proof",
        },
    )
    assert advanced.status_code == 200
    route_choice_event_id = advanced.json()["branch_writeback"]["choice_event_id"]

    planned = client.post(
        f"/v1/timeline/worldlines/{session_id}/time-engine/candidates",
        json={
            "source_run_id": "time-run-rollback-proof",
            "beat_plan": ["选择落点", "压力回潮", "连锁质询", "余波冻结"],
        },
    )
    assert planned.status_code == 200

    missing_candidate = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-rollback-fixture",
        headers={"Idempotency-Key": "rollback-proof-key"},
        json={},
    )
    assert missing_candidate.status_code == 200
    assert missing_candidate.json()["status"] == "blocked"
    assert missing_candidate.json()["reason"] == "branch_publish_candidate_required"

    published = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-candidate",
        headers={"Idempotency-Key": "branch-publish-rollback-key"},
        json={
            "branch_id": "rollback-proof-branch",
            "route_choice_event_id": route_choice_event_id,
            "source_run_id": "branch-publish-rollback-proof",
        },
    )
    assert published.status_code == 200
    branch_publish_candidate_id = published.json()["branch_publish_candidate_id"]

    missing_key = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-rollback-fixture",
        json={"branch_publish_candidate_id": branch_publish_candidate_id},
    )
    assert missing_key.status_code == 200
    assert missing_key.json()["status"] == "blocked"
    assert missing_key.json()["reason"] == "idempotency_key_required"

    mismatch = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-rollback-fixture",
        headers={"Idempotency-Key": "rollback-proof-key"},
        json={"branch_publish_candidate_id": "branch_publish_wrong"},
    )
    assert mismatch.status_code == 200
    assert mismatch.json()["status"] == "blocked"
    assert mismatch.json()["reason"] == "branch_publish_candidate_mismatch"

    rollback = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-rollback-fixture",
        headers={"Idempotency-Key": "rollback-proof-key"},
        json={"branch_publish_candidate_id": branch_publish_candidate_id},
    )

    assert rollback.status_code == 200
    payload = rollback.json()
    assert payload["status"] == "verified"
    assert payload["capability_mode"] == "database_transaction_rollback_fixture"
    assert payload["write_scope"] == "rollback_fixture_only"
    assert payload["worldline_id"] == session_id
    assert payload["branch_publish_candidate_id"] == branch_publish_candidate_id
    assert payload["transaction_probe_id"].startswith("rollback_probe_")
    assert payload["insert_visible_before_rollback"] is True
    assert payload["persisted_after_rollback"] is False
    assert payload["rollback_verified"] is True
    assert payload["production_public_publish"] is False
    assert payload["tables_checked"] == ["analytics_events"]
    assert payload["before_count"] == payload["after_count"]


def test_branch_publish_authorization_requires_operator_quality_and_rollback(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    world_id = _first_world_id(client)
    started = client.post("/v1/reader/sessions", json={"world_id": world_id, "reader_id": "reader_authorize"})
    session_id = started.json()["session_id"]

    advanced = client.post(
        "/v1/scene/advance",
        json={
            "session_id": session_id,
            "choice_id": "choice_keep_witness_hidden",
            "freeform_intent": "先让证人藏进灯塔底层，再等待王庭记录员到来。",
            "worldline_id": session_id,
            "branch_id": "authorization-proof-branch",
            "source_run_id": "reader-run-authorization-proof",
        },
    )
    assert advanced.status_code == 200
    route_choice_event_id = advanced.json()["branch_writeback"]["choice_event_id"]

    planned = client.post(
        f"/v1/timeline/worldlines/{session_id}/time-engine/candidates",
        json={
            "source_run_id": "time-run-authorization-proof",
            "beat_plan": ["证人藏匿", "王庭迫近", "灯塔回响", "余波待审"],
        },
    )
    assert planned.status_code == 200

    missing_candidate = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-authorization",
        headers={"Idempotency-Key": "authorization-proof-key"},
        json={"operator_id": "ops-editor", "confirmed": True},
    )
    assert missing_candidate.status_code == 200
    assert missing_candidate.json()["status"] == "blocked"
    assert missing_candidate.json()["reason"] == "branch_publish_candidate_required"

    published = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-candidate",
        headers={"Idempotency-Key": "branch-publish-authorization-key"},
        json={
            "branch_id": "authorization-proof-branch",
            "route_choice_event_id": route_choice_event_id,
            "source_run_id": "branch-publish-authorization-proof",
        },
    )
    assert published.status_code == 200
    branch_publish_candidate_id = published.json()["branch_publish_candidate_id"]

    missing_key = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-authorization",
        json={
            "branch_publish_candidate_id": branch_publish_candidate_id,
            "operator_id": "ops-editor",
            "confirmed": True,
        },
    )
    assert missing_key.status_code == 200
    assert missing_key.json()["status"] == "blocked"
    assert missing_key.json()["reason"] == "idempotency_key_required"

    missing_operator = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-authorization",
        headers={"Idempotency-Key": "authorization-proof-key"},
        json={"branch_publish_candidate_id": branch_publish_candidate_id, "confirmed": True},
    )
    assert missing_operator.status_code == 200
    assert missing_operator.json()["status"] == "blocked"
    assert missing_operator.json()["reason"] == "operator_id_required"

    unconfirmed = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-authorization",
        headers={"Idempotency-Key": "authorization-proof-key"},
        json={
            "branch_publish_candidate_id": branch_publish_candidate_id,
            "operator_id": "ops-editor",
            "confirmed": False,
        },
    )
    assert unconfirmed.status_code == 200
    assert unconfirmed.json()["status"] == "blocked"
    assert unconfirmed.json()["reason"] == "operator_confirmation_required"

    authorized = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-authorization",
        headers={"Idempotency-Key": "authorization-proof-key"},
        json={
            "branch_publish_candidate_id": branch_publish_candidate_id,
            "operator_id": "ops-editor",
            "confirmed": True,
        },
    )
    assert authorized.status_code == 200
    payload = authorized.json()
    assert payload["status"] == "authorized_candidate"
    assert payload["capability_mode"] == "branch_publish_authorization_gate"
    assert payload["write_scope"] == "branch_publish_authorization_ledger_only"
    assert payload["branch_publish_candidate_id"] == branch_publish_candidate_id
    assert payload["operator_id"] == "ops-editor"
    assert payload["operator_confirmation"] == "confirmed"
    assert payload["quality_gate"]["status"] == "pass"
    assert payload["quality_gate"]["can_authorize_branch_publish"] is True
    assert payload["rollback_fixture"]["rollback_verified"] is True
    assert payload["rollback_fixture"]["persisted_after_rollback"] is False
    assert payload["production_public_publish"] is False
    assert "durable_multi_table_world_instance_branch_commit" in payload["required_before_public_publish"]
    assert Path(payload["ledger_path"]).exists()
    assert Path(payload["latest_path"]).exists()

    replayed = client.post(
        f"/v1/timeline/worldlines/{session_id}/branches/publish-authorization",
        headers={"Idempotency-Key": "authorization-proof-key"},
        json={
            "branch_publish_candidate_id": branch_publish_candidate_id,
            "operator_id": "ops-editor",
            "confirmed": True,
        },
    )
    assert replayed.status_code == 200
    replayed_payload = replayed.json()
    assert replayed_payload["idempotent_replay"] is True
    assert replayed_payload["authorization_id"] == payload["authorization_id"]

    snapshot = client.get(f"/v1/timeline/worldlines/{session_id}/branches/publish-authorization")
    assert snapshot.status_code == 200
    assert snapshot.json()["authorization_id"] == payload["authorization_id"]

    worldline = client.get(f"/v1/timeline/worldlines/{session_id}/loom")
    assert worldline.status_code == 200
    authorization_summary = worldline.json()["branch_publish_authorization_summary"]
    assert authorization_summary["status"] == "authorized_candidate"
    assert authorization_summary["write_scope"] == "branch_publish_authorization_ledger_only"
    assert authorization_summary["authorization_id"] == payload["authorization_id"]
    assert authorization_summary["production_public_publish"] is False


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
            "project_id": "studio-project-test",
            "world_id": "beacon-beyond",
            "source_run_id": "studio-run-candidate-demo",
            "body": candidate_body,
            "choices": ["公开日志", "隐藏幸存者"],
            "character_fidelity_score": 0.72,
        },
    )

    assert evaluated.status_code == 200
    report = evaluated.json()["report"]
    assert report["chapter_id"] == "candidate_demo"
    assert report["studio_trace"]["source_run_id"] == "studio-run-candidate-demo"
    assert evaluated.json()["studio_trace"]["trace_id"] == report["studio_trace"]["trace_id"]
    assert evaluated.json()["studio_trace"]["write_scope"] == "evaluation_only"
    assert evaluated.json()["studio_trace"]["next_required"] == ["operator_confirmation", "idempotency_key"]
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
            "project_id": "studio-project-test",
            "target_status": "canon",
            "source_run_id": "studio-run-candidate-demo",
            "confirmed": True,
            "confirmed_by": "qa_operator",
            "quality_report": {
                "chapter_id": "candidate_demo",
                "studio_trace": report["studio_trace"],
                "decision": {"decision": "pass", "reason": "test-approved"},
                "issues": [],
                "scores": {"overall_score": 0.91},
            },
            "studio_trace": report["studio_trace"],
        },
    )
    assert committed.status_code == 200
    payload = committed.json()
    assert payload["status"] == "committed"
    assert payload["idempotent_replay"] is False
    assert payload["write_scope"] == "canon_ledger_only"
    assert payload["source_run_id"] == "studio-run-candidate-demo"
    assert payload["quality_report_hash"] == report["studio_trace"]["quality_report_hash"]
    assert payload["studio_trace"]["source_run_id"] == "studio-run-candidate-demo"
    assert payload["studio_trace"]["write_scope"] == "canon_ledger_only"
    assert payload["studio_trace"]["steps"][-1]["step"] == "canon/commit"
    assert payload["studio_trace"]["steps"][-1]["status"] == "done"
    assert payload["rollback_plan"]["status"] == "available_before_public_publish"
    assert payload["rollback_plan"]["source_run_id"] == "studio-run-candidate-demo"
    assert payload["rollback_plan"]["quality_report_hash"] == report["studio_trace"]["quality_report_hash"]
    assert payload["quality_gate"]["summary"]
    assert payload["quality_gate"]["canon_commit_readiness"]["ready"] is True
    assert Path(payload["ledger_path"]).exists()
    ledger = Path(payload["ledger_path"]).read_text(encoding="utf-8")
    assert "studio-run-candidate-demo" in ledger
    assert "studio_trace" in ledger

    replayed = client.post(
        "/v1/canon/commit",
        headers={"Idempotency-Key": "commit-candidate-demo"},
        json={
            "candidate_id": "candidate_demo",
            "project_id": "studio-project-test",
            "target_status": "canon",
            "source_run_id": "studio-run-candidate-demo",
            "confirmed": True,
            "confirmed_by": "qa_operator",
            "quality_report": {
                "chapter_id": "candidate_demo",
                "studio_trace": report["studio_trace"],
                "decision": {"decision": "pass", "reason": "test-approved"},
                "issues": [],
                "scores": {"overall_score": 0.91},
            },
            "studio_trace": report["studio_trace"],
        },
    )
    assert replayed.status_code == 200
    replayed_payload = replayed.json()
    assert replayed_payload["status"] == "committed"
    assert replayed_payload["commit_id"] == payload["commit_id"]
    assert replayed_payload["ledger_path"] == payload["ledger_path"]
    assert replayed_payload["idempotent_replay"] is True
    assert replayed_payload["studio_trace"]["trace_id"] == payload["studio_trace"]["trace_id"]

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
