from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path) -> TestClient:
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "tool_bridge.db")),
    )
    return TestClient(app)


def _payload():
    return {
        "projectId": "project_demo",
        "seed": "我想写一个穿越到西方玄幻边境地下城的故事，不要游戏系统。",
        "genre": "西方玄幻",
        "context": {
            "mastra_local_output": {
                "runId": "run_demo",
                "projectId": "project_demo",
                "sessionId": "session_demo",
                "candidateDraft": {
                    "status": "candidate",
                    "title": "边境深井",
                    "body": "他醒在边境矿城的钟声里。",
                },
                "questions": ["主角最想隐瞒的外来者破绽是什么？", "他先救人还是先还债？"],
                "settingCards": {
                    "genre_constraints": [
                        {
                            "id": "western-fantasy-transmigration-non-game",
                            "rule_ids": ["wf-world-substrate", "wf-no-game-interface"],
                        }
                    ]
                },
                "activeConstraints": [
                    {
                        "profileId": "western-fantasy-transmigration-non-game",
                        "ruleIds": ["wf-world-substrate", "wf-no-game-interface"],
                        "prohibitedTerms": ["系统面板", "清河县", "仵作"],
                    }
                ],
                "activeKernels": [
                    {
                        "kernelId": "kernel-western-frontier-transmigration",
                        "beatPlan": ["异界醒来", "身份代价"],
                    }
                ],
                "qualityPreview": {
                    "result": "pass",
                    "violations": [],
                    "repairSuggestions": [],
                },
                "runTrace": [{"step": "intent.resolve", "status": "ok", "detail": "seed accepted"}],
                "cost": {"mode": "mock_local", "estimatedTokens": 120, "estimatedCostUsd": 0},
            }
        },
    }


def test_tool_bridge_requires_idempotency_key(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post("/v1/tools/runtime/socratic-turn", json=_payload())

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "idempotency_key_required"


def test_tool_bridge_returns_candidate_without_canon_write(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post(
        "/v1/tools/runtime/socratic-turn",
        json=_payload(),
        headers={"Idempotency-Key": "run_demo"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["candidateDraft"]["status"] == "candidate"
    assert payload["writeback"]["canon_written"] is False
    assert payload["writeback"]["branch_written"] is False
    assert len(payload["questions"]) <= 2
    assert payload["activeConstraints"][0]["profileId"] == "western-fantasy-transmigration-non-game"
    assert payload["runTrace"][-1]["step"] == "fastapi.socratic_turn"


def test_tool_bridge_state_preview_is_preview_only(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post(
        "/v1/tools/runtime/state-preview",
        json=_payload(),
        headers={"Idempotency-Key": "run_state_preview"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "preview_only"
    assert payload["writeback"]["canon_written"] is False

