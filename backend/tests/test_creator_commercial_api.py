from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.providers import InlineJSONLLMBackend, LLMBackend
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path, *, payload=None) -> TestClient:
    backend = InlineJSONLLMBackend(payload) if payload is not None else None
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "creator.db")),
        llm_backend=backend,
    )
    return TestClient(app)


def test_creator_commercial_blueprint_uses_llm_payload(tmp_path: Path):
    client = _client(
        tmp_path,
        payload={
            "work": {
                "title": "夜航选择局",
                "logline": "一个创业失败者把城市选择裂缝做成爆款连载。",
                "genre": "都市悬疑",
            },
            "world": {"first_choice_point": "公开真相，还是先锁住首批读者？"},
            "characters": [{"name": "林岑", "role": "主角"}],
            "season_plan": ["第 1 卷：发现选择局"],
            "chapter_one": {"title": "第 1 章", "body": "凌晨两点，广告屏写出他的死法。"},
            "quality_gate": {"score": 91, "pass": True},
            "launch_plan": {"pricing": "前三章免费，会员订阅。"},
            "next_actions": ["生成第 2 章"],
        },
    )

    response = client.post(
        "/v1/creator/commercial-blueprint",
        json={
            "creator_id": "first_user",
            "pen_name": "James",
            "genre": "都市悬疑",
            "seed": "选择可视化的商业悬疑。",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["work"]["title"] == "夜航选择局"
    assert payload["chapter_one"]["body"]
    assert payload["chapter_one"]["first_choice"]
    assert payload["quality_gate"]["score"] == 91
    assert payload["quality_gate"]["checks"]
    assert payload["model_status"]["mode"] == "llm_assisted"
    assert payload["model_status"]["secret_exposure"] == "server_env_only"


def test_creator_commercial_blueprint_has_local_fallback(tmp_path: Path):
    client = _client(tmp_path)
    response = client.post("/v1/creator/commercial-blueprint", json={"creator_id": "first_user"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["work"]["title"] == "消失选择档案"
    assert payload["chapter_one"]["first_choice"]
    assert payload["quality_gate"]["pass"] is True
    assert payload["model_status"]["mode"] == "local_blueprint"


class _LocalProvider(LLMBackend):
    provider_id = "local"

    def generate_json(self, *, system_prompt: str, user_prompt: str):
        return {
            "work": {"title": "本地兜底作品"},
            "chapter_one": {"body": "本地兜底正文。"},
        }


def test_creator_commercial_blueprint_reports_local_route_truthfully(tmp_path: Path):
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "creator.db")),
        llm_backend=_LocalProvider(),
    )
    client = TestClient(app)

    response = client.post("/v1/creator/commercial-blueprint", json={"creator_id": "first_user"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["work"]["title"] == "本地兜底作品"
    assert payload["chapter_one"]["first_choice"]
    assert payload["quality_gate"]["checks"]
    assert payload["model_status"]["mode"] == "local_blueprint"
    assert payload["model_status"]["provider"] == "local"
