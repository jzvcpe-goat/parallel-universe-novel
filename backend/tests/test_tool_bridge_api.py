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
        "seed": "我想写一个仙侠玄幻故事，主角得到裂纹玉简后必须偿还因果债。",
        "genre": "仙侠玄幻",
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
                "questions": ["这次突破要付出的第一笔代价是什么？", "他更怕失去修行机会还是欠下人情债？"],
                "settingCards": {
                    "genre_constraints": [
                        {
                            "id": "xuanhuan-xianxia",
                            "rule_ids": ["cultivation-must-have-cost", "xuanhuan-era-substrate"],
                        }
                    ]
                },
                "activeConstraints": [
                    {
                        "profileId": "xuanhuan-xianxia",
                        "ruleIds": ["cultivation-must-have-cost", "xuanhuan-era-substrate"],
                        "prohibitedTerms": ["一键升级", "手机", "汽车"],
                    }
                ],
                "activeKernels": [
                    {
                        "kernelId": "kernel-xuanhuan-xianxia",
                        "beatPlan": ["传承触发", "资源稀缺"],
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
    assert payload["activeConstraints"][0]["profileId"] == "xuanhuan-xianxia"
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
