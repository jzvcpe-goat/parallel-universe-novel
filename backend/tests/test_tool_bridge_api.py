import json
from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path) -> TestClient:
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "tool_bridge.db")),
    )
    return TestClient(app)


def _runtime_rule_example() -> tuple[dict, dict]:
    root = Path(__file__).resolve().parents[2]
    rules = json.loads((root / "docs/product/rules/genre-runtime-rules.v1.json").read_text(encoding="utf-8"))
    profile = rules["constraintProfiles"][0]
    kernel = next(
        item for item in rules["genreKernels"]
        if profile["id"] in item.get("compatibleProfiles", [])
    )
    return profile, kernel


def _payload():
    profile, kernel = _runtime_rule_example()
    rule_ids = [rule["id"] for rule in profile["rules"]]
    prohibited_terms = [
        term
        for rule in profile["rules"]
        for term in rule.get("prohibitedTerms", [])
    ]
    runtime_artifact = {
        "version": 1,
        "narrativeRun": {
            "id": "run_demo",
            "projectId": "project_demo",
            "sessionId": "session_demo",
            "authoringMode": "co_write",
            "decision": "candidate",
        },
        "constraintSet": [
            {
                "profileId": profile["id"],
                "ruleIds": rule_ids,
                "severity": "hard",
            }
        ],
        "kernelSelection": [
            {
                "kernelId": kernel["id"],
                "compatibleProfiles": kernel.get("compatibleProfiles", []),
                "beatPlan": kernel["eventStructure"][:2],
                "timeControls": kernel.get("timeControls", {}),
            }
        ],
        "scenePlan": {
            "id": "scene_run_demo",
            "runId": "run_demo",
            "objective": kernel.get("thesis", ""),
            "beats": kernel["eventStructure"][:2],
            "requiredStateRefs": ["candidate.current", "quality.preview"],
            "candidateEvents": [
                {"id": "event_1", "label": kernel["eventStructure"][0], "source": "kernel", "intensity": 0.4}
            ],
            "choiceSlots": [{"id": "choice_slot_1", "prompt": "这次选择要付出什么？", "status": "candidate"}],
        },
        "stateWritebackPreview": [
            {
                "targetId": "session_demo",
                "targetType": "world",
                "operations": [{"op": "set", "path": "candidate.current", "value": {"status": "candidate"}}],
                "metadata": {
                    "runId": "run_demo",
                    "projectId": "project_demo",
                    "reason": "preview_candidate_memory_before_author_confirmation",
                },
            }
        ],
        "timeConsistencyReport": {
            "id": "time_run_demo",
            "runId": "run_demo",
            "status": "pass",
            "acceptedTimeEvents": [{"id": "time_event_1", "label": kernel["eventStructure"][0], "order": 1}],
            "timelineConflicts": [],
            "requiredRepair": [],
        },
        "qualityBrakeReport": {
            "id": "quality_run_demo",
            "runId": "run_demo",
            "result": "pass",
            "scores": {"doctrine": 0.8, "constraint": 0.8, "kernel": 0.8, "time": 0.8, "state": 0.8, "prose": 0.8, "safety": 0.8},
            "reasons": [],
            "repairPrompt": "候选正文可进入作者确认。",
            "decision": "candidate",
        },
        "branchGenerationResult": {
            "id": "branch_run_demo",
            "runId": "run_demo",
            "status": "not_generated",
            "reason": "author_confirmation_required",
            "visibility": "private",
            "sourceType": "ai_candidate",
        },
    }
    return {
        "projectId": "project_demo",
        "seed": f"我想写一个{profile['displayName']}故事，开场要有明确的选择代价。",
        "genre": profile["displayName"],
        "context": {
            "mastra_local_output": {
                "runId": "run_demo",
                "projectId": "project_demo",
                "sessionId": "session_demo",
                "candidateDraft": {
                    "status": "candidate",
                    "title": "问灵台",
                    "body": "问灵台的铜铃响到第三声。",
                },
                "questions": ["这次选择要付出的第一笔代价是什么？", "人物更怕失去关系、真相，还是自己的生存位置？"],
                "settingCards": {
                    "genre_constraints": [
                        {
                            "id": profile["id"],
                            "rule_ids": rule_ids,
                        }
                    ]
                },
                "activeConstraints": [
                    {
                        "profileId": profile["id"],
                        "ruleIds": rule_ids,
                        "prohibitedTerms": prohibited_terms,
                    }
                ],
                "activeKernels": [
                    {
                        "kernelId": kernel["id"],
                        "beatPlan": kernel["eventStructure"][:2],
                    }
                ],
                "qualityPreview": {
                    "result": "pass",
                    "violations": [],
                    "repairSuggestions": [],
                },
                "runtimeArtifact": runtime_artifact,
                "runTrace": [{"step": "intent.resolve", "status": "ok", "detail": "seed accepted"}],
                "cost": {"mode": "mock_local", "estimatedTokens": 120, "estimatedCostUsd": 0},
            }
        },
    }


def _headers(idempotency_key: str | None = None, token: str = "dev-local-token") -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    if idempotency_key is not None:
        headers["Idempotency-Key"] = idempotency_key
    return headers


def test_tool_bridge_requires_service_token(tmp_path: Path):
    client = _client(tmp_path)
    for path in [
        "/v1/tools/runtime/socratic-turn",
        "/v1/tools/runtime/draft",
        "/v1/tools/runtime/quality-check",
        "/v1/tools/runtime/state-preview",
    ]:
        response = client.post(path, json=_payload(), headers={"Idempotency-Key": "run_demo"})

        assert response.status_code == 401
        assert response.json()["detail"]["code"] == "tool_bridge_auth_required"


def test_tool_bridge_rejects_wrong_service_token(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post(
        "/v1/tools/runtime/socratic-turn",
        json=_payload(),
        headers=_headers("run_demo", token="wrong-token"),
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "tool_bridge_auth_invalid"


def test_tool_bridge_rejects_default_token_in_protected_deploy_env(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("NARRATIVEOS_DEPLOY_ENV", "production")
    monkeypatch.delenv("NARRATIVEOS_TOOL_BRIDGE_TOKEN", raising=False)
    monkeypatch.delenv("MASTRA_TOOL_BRIDGE_TOKEN", raising=False)
    client = _client(tmp_path)
    response = client.post(
        "/v1/tools/runtime/socratic-turn",
        json=_payload(),
        headers=_headers("run_demo"),
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "tool_bridge_secret_not_configured"


def test_tool_bridge_accepts_explicit_token_in_protected_deploy_env(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("NARRATIVEOS_DEPLOY_ENV", "production")
    monkeypatch.setenv("NARRATIVEOS_TOOL_BRIDGE_TOKEN", "prod-secret")
    client = _client(tmp_path)
    rejected = client.post(
        "/v1/tools/runtime/socratic-turn",
        json=_payload(),
        headers=_headers("run_demo"),
    )
    accepted = client.post(
        "/v1/tools/runtime/socratic-turn",
        json=_payload(),
        headers=_headers("run_demo", token="prod-secret"),
    )

    assert rejected.status_code == 403
    assert rejected.json()["detail"]["code"] == "tool_bridge_auth_invalid"
    assert accepted.status_code == 200
    assert accepted.json()["candidateDraft"]["status"] == "candidate"


def test_tool_bridge_requires_idempotency_key(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post("/v1/tools/runtime/socratic-turn", json=_payload(), headers=_headers())

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "idempotency_key_required"


def test_tool_bridge_returns_candidate_without_canon_write(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post(
        "/v1/tools/runtime/socratic-turn",
        json=_payload(),
        headers=_headers("run_demo"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["candidateDraft"]["status"] == "candidate"
    assert payload["writeback"]["canon_written"] is False
    assert payload["writeback"]["branch_written"] is False
    assert len(payload["questions"]) <= 2
    assert payload["activeConstraints"][0]["profileId"] == _runtime_rule_example()[0]["id"]
    assert payload["runtimeArtifact"]["version"] == 1
    assert payload["runtimeArtifact"]["branchGenerationResult"]["status"] == "not_generated"
    assert payload["runTrace"][-1]["step"] == "fastapi.socratic_turn"


def test_tool_bridge_state_preview_is_preview_only(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post(
        "/v1/tools/runtime/state-preview",
        json=_payload(),
        headers=_headers("run_state_preview"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "preview_only"
    assert payload["stateDeltaCandidate"]
    assert payload["runtimeArtifact"]["scenePlan"]["id"] == "scene_run_demo"
    assert payload["stateDeltaCandidate"] == payload["runtimeArtifact"]["stateWritebackPreview"]
    patch = payload["stateDeltaCandidate"][0]
    assert patch["targetType"] == "world"
    assert patch["operations"][0]["path"] == "candidate.current"
    assert patch["operations"][0]["value"]["status"] == "candidate"
    assert patch["metadata"]["reason"] == "preview_candidate_memory_before_author_confirmation"
    assert payload["writeback"]["canon_written"] is False
    assert payload["writeback"]["branch_written"] is False
