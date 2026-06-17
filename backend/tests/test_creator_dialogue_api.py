import json
from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.providers import InlineJSONLLMBackend, build_llm_backend_from_env
from src.narrativeos.repository import SQLAlchemyRepository


def _client(tmp_path: Path, monkeypatch, *, payload=None) -> TestClient:
    monkeypatch.setenv("NARRATIVEOS_CREATOR_DIALOGUE_DIR", str(tmp_path / "creator_dialogue_sessions"))
    monkeypatch.delenv("KIMI_API_KEY", raising=False)
    monkeypatch.delenv("MOONSHOT_API_KEY", raising=False)
    backend = InlineJSONLLMBackend(payload) if payload is not None else None
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "creator_dialogue.db")),
        llm_backend=backend,
    )
    return TestClient(app)


def test_creator_dialogue_session_without_seed_asks_one_open_question(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post("/v1/creator/dialogue/sessions", json={"creator_id": "author_1"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["phase"] == "seed"
    assert payload["assistant"]["story_text"] == ""
    assert len(payload["assistant"]["questions"]) == 1
    assert "画面" in payload["assistant"]["questions"][0]
    assert payload["source"]["agent"] == "imported_novel_starter_system_prompt"
    assert payload["source"]["prompt_contract"]["max_questions_per_turn"] == 2
    assert "characters" in payload["source"]["prompt_contract"]["creative_dimensions"]
    assert "scene" in payload["source"]["prompt_contract"]["creative_dimensions"]
    assert "memo_frozen" in payload["source"]["prompt_contract"]["input_source_matrix"]
    assert payload["source"]["principles"][0] == "永远先给正文，后问问题"
    assert payload["assistant"]["model_status"]["mode"] == "local_cowriter"


def test_creator_dialogue_echoes_frontend_prompt_contract(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "一座会在午夜改写名字的城市",
            "context": {
                "prompt_id": "imported_novel_starter_system_prompt",
                "prompt_version": "story_architecture_v2",
                "launch_method": "seed_break_grow",
                "rule": "write_first_ask_later",
                "max_questions_per_turn": 9,
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"]["title"] == "小说启动引导"
    assert payload["source"]["prompt_id"] == "imported_novel_starter_system_prompt"
    assert payload["source"]["prompt_version"] == "story_architecture_v2"
    assert payload["source"]["request_context"]["prompt_id"] == "imported_novel_starter_system_prompt"
    assert payload["source"]["request_context"]["max_questions_per_turn"] == 2
    assert payload["source"]["prompt_contract"]["first_question"] == "你脑海里最先浮现的是哪个画面？"
    assert payload["source"]["prompt_contract"]["input_source_matrix"]["manual"]
    assert payload["source"]["prompt_contract"]["input_source_matrix"]["memo_frozen"]
    assert len(payload["assistant"]["questions"]) <= payload["source"]["prompt_contract"]["max_questions_per_turn"]


def test_creator_dialogue_seed_generates_story_cards_and_persists(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    started = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": "author_1", "seed": "一个少女站在雨中望着燃烧的图书馆"},
    )

    assert started.status_code == 200
    payload = started.json()
    session_id = payload["session_id"]
    assert payload["phase"] == "break_soil"
    assert "燃烧的图书馆" in payload["assistant"]["story_text"]
    for forbidden in ["后台", "后端", "接口", "系统提示词", "Memo", "模板", "设定卡"]:
        assert forbidden not in payload["assistant"]["story_text"]
        assert forbidden not in " ".join(step["detail"] for step in payload["assistant"]["harness_trace"])
    assert 1 <= len(payload["assistant"]["questions"]) <= 2
    assert payload["setting_cards"]["seed"] == "一个少女站在雨中望着燃烧的图书馆"
    assert payload["setting_cards"]["confirmed"]
    assert payload["setting_cards"]["opening_scene_hint"]
    assert payload["setting_cards"]["character_web_hint"]
    assert payload["setting_cards"]["input_sources"]["manual"]
    assert payload["setting_cards"]["input_sources"]["memo_frozen"]

    fetched = client.get(f"/v1/creator/dialogue/sessions/{session_id}")
    assert fetched.status_code == 200
    assert fetched.json()["session_id"] == session_id
    assert fetched.json()["turns"][0]["role"] == "user"



def test_creator_dialogue_uses_shared_runtime_rules_for_all_core_profiles(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    cases = [
        {
            "genre": "仙侠玄幻",
            "display": "仙侠玄幻",
            "seed": "主角得到一枚裂纹玉简，突破前必须先还一笔因果债。",
            "profile_id": "xuanhuan-xianxia",
            "kernel_id": "kernel-xuanhuan-xianxia",
            "rule_id": "cultivation-must-have-cost",
            "source_ref": "rwref_0013",
        },
        {
            "genre": "现代悬疑",
            "display": "其他现代",
            "seed": "雨夜旧案重启，主角只能依靠证据链和心理侧写追查真相。",
            "profile_id": "modern-other",
            "kernel_id": "kernel-modern-other",
            "rule_id": "logical-evidence-required",
            "source_ref": "rwref_0016",
        },
        {
            "genre": "游戏异界",
            "display": "游戏异界",
            "seed": "主角登录虚拟游戏后进入公会副本，任务失败会清空当前身份。",
            "profile_id": "game-litrpg",
            "kernel_id": "kernel-game-litrpg",
            "rule_id": "system-interface-mandatory",
            "source_ref": "rwref_0034",
        },
        {
            "genre": "喜剧反套路",
            "display": "喜剧反套路",
            "seed": "反派掉马现场，主角用一句吐槽把审问变成误会升级。",
            "profile_id": "comedy-misfit",
            "kernel_id": "kernel-comedy-misfit",
            "rule_id": "comedy-pressure-release",
            "source_ref": "rwref_0010",
        },
    ]

    for case in cases:
        response = client.post(
            "/v1/creator/dialogue/sessions",
            json={
                "creator_id": "author_1",
                "seed": case["seed"],
                "genre": case["genre"],
                "context": {
                    "story_direction": {
                        "label": case["genre"],
                        "tone": case["genre"],
                        "hooks": case["seed"],
                        "keywords": case["genre"],
                    },
                },
            },
        )

        assert response.status_code == 200
        cards = response.json()["setting_cards"]
        assert cards["genre_signal"] == case["display"]
        constraint_ids = {item["id"] for item in cards["genre_constraints"]}
        assert case["rule_id"] in constraint_ids
        assert case["profile_id"] in cards["genre_constraint_facts"]["active_profile_ids"]
        assert case["kernel_id"] in cards["genre_constraint_facts"]["active_kernel_ids"]
        assert cards["genre_kernels"][0]["id"] == case["kernel_id"]
        assert case["source_ref"] in cards["genre_constraint_facts"]["active_profiles"][0]["source_refs"]
        serialized = json.dumps(cards, ensure_ascii=False)
        assert "source_evidence" not in serialized
        assert case["source_ref"] in serialized


def test_creator_dialogue_does_not_apply_constraints_to_unmatched_selected_genres(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "一个女孩在雨夜收到一封写给未来自己的信。",
            "genre": "情感成长",
            "context": {
                "story_direction": {
                    "label": "情感成长",
                    "tone": "克制、慢热、关系修复",
                    "hooks": "错过、重逢、选择代价",
                    "keywords": "情感, 成长, 关系",
                },
            },
        },
    )

    assert response.status_code == 200
    cards = response.json()["setting_cards"]
    assert cards["genre_signal"] != "仙侠玄幻"
    assert cards["genre_constraints"] == []
    assert cards["genre_kernels"] == []
    assert cards["genre_constraint_facts"]["active_profile_ids"] == []
    assert cards["genre_constraint_facts"]["activation_order"] == [
        "selected_topic_template_direction",
        "user_freeform_intent",
        "runtime_rule_json",
    ]

def test_creator_dialogue_turn_continues_the_same_session(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    started = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": "author_1", "seed": "失踪的灯塔守夜人留下最后一页航海日志"},
    )
    session_id = started.json()["session_id"]

    continued = client.post(
        f"/v1/creator/dialogue/sessions/{session_id}/turns",
        json={"message": "继续写，让他先发现日志里的名字是父亲。"},
    )

    assert continued.status_code == 200
    payload = continued.json()
    assert payload["session_id"] == session_id
    assert payload["phase"] == "growth"
    assert "父亲" in payload["turns"][-2]["content"]
    assert payload["assistant"]["story_text"]
    assert len(payload["assistant"]["questions"]) <= 2


def test_creator_dialogue_turn_can_rehydrate_from_previous_session_snapshot(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    started = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": "author_1", "seed": "雨夜桥洞里出现一段不属于今天的监控录像"},
    )
    previous_session = started.json()
    session_id = previous_session["session_id"]
    session_file = tmp_path / "creator_dialogue_sessions" / f"{session_id}.json"
    session_file.unlink()

    continued = client.post(
        f"/v1/creator/dialogue/sessions/{session_id}/turns",
        json={
            "message": "主角认出了未来的自己手上拿着同一把伞。",
            "previous_session": previous_session,
        },
    )

    assert continued.status_code == 200
    payload = continued.json()
    assert payload["session_id"] == session_id
    assert len(payload["turns"]) == len(previous_session["turns"]) + 2
    assert "同一把伞" in payload["turns"][-2]["content"]
    assert payload["assistant"]["story_text"]


def test_creator_dialogue_uses_llm_payload_when_available(tmp_path: Path, monkeypatch):
    client = _client(
        tmp_path,
        monkeypatch,
        payload={
            "message": "我先写一个更贴近你种子的版本。",
            "story_text": "雨停在半空，图书馆的火却从书脊里往外生长。",
            "questions": ["这个火是魔法失控，还是有人故意点燃的？"],
            "setting_cards_delta": ["开场：雨中火灾"],
            "next_actions": ["回答火灾来源，我继续写下一段。"],
            "quality_notes": ["先写正文，再问一个问题。"],
        },
    )

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": "author_1", "seed": "雨中的图书馆大火"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["assistant"]["story_text"].startswith("雨停在半空")
    assert payload["assistant"]["questions"] == ["这个火是魔法失控，还是有人故意点燃的？"]
    assert payload["assistant"]["model_status"]["mode"] == "llm_assisted"
    assert payload["assistant"]["model_status"]["provider"] == "inline_json"


def test_creator_dialogue_sanitizes_prohibited_terms_from_model_output(tmp_path: Path, monkeypatch):
    client = _client(
        tmp_path,
        monkeypatch,
        payload={
            "message": "我先写一个仙侠玄幻开场。",
            "story_text": "主角拿出手机叫汽车去医院，准备一键升级。",
            "questions": ["下一段要不要继续强调手机的作用？"],
            "setting_cards_delta": ["场景：问灵台"],
            "next_actions": ["继续写。"],
            "quality_notes": ["测试禁用词净化。"],
        },
    )

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "仙侠玄幻，主角得到玉简后必须付出因果债。",
            "genre": "仙侠玄幻",
            "context": {
                "story_direction": {
                    "label": "仙侠玄幻",
                    "tone": "逆天改命",
                    "hooks": "玉简传承和因果债",
                    "keywords": "修真, 玄幻, 玉简, 天劫",
                },
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assistant_text = json.dumps(payload["assistant"], ensure_ascii=False)
    for forbidden in ["手机", "汽车", "医院", "一键升级"]:
        assert forbidden not in assistant_text
    assert "传音玉简" in assistant_text
    assert "飞剑" in assistant_text
    assert "医修洞府" in assistant_text
    assert "闭关突破" in assistant_text


def test_creator_dialogue_uses_creator_scoped_openai_compatible_provider(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("NARRATIVEOS_CREATOR_DIALOGUE_DIR", str(tmp_path / "creator_dialogue_sessions"))
    monkeypatch.setenv("NARRATIVEOS_CREATOR_PROVIDER", "openai_compatible")
    monkeypatch.setenv("NARRATIVEOS_CREATOR_API_KEY", "test-secret")
    monkeypatch.setenv("NARRATIVEOS_CREATOR_BASE_URL", "https://provider.example/v1")
    monkeypatch.setenv("NARRATIVEOS_CREATOR_MODEL", "creator-model")
    monkeypatch.delenv("KIMI_API_KEY", raising=False)
    monkeypatch.delenv("MOONSHOT_API_KEY", raising=False)
    captured = {}

    class _Response:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return json.dumps({
                "choices": [
                    {
                        "message": {
                            "content": json.dumps({
                                "message": "我先写正文。",
                                "story_text": "边境矿城的钟声停在午夜，翻译员第一次听懂了井底的祷词。",
                                "questions": ["他要先救人，还是先藏起祷词？"],
                                "setting_cards_delta": ["场景：边境矿城"],
                                "next_actions": ["回答选择，我继续写。"],
                                "quality_notes": ["先写正文，后问问题。"],
                            })
                        }
                    }
                ],
                "usage": {"total_tokens": 40},
            }).encode("utf-8")

    def fake_urlopen(req, timeout=0):
        captured["url"] = req.full_url
        captured["authorization"] = req.get_header("Authorization")
        return _Response()

    monkeypatch.setattr("src.narrativeos.providers.urlrequest.urlopen", fake_urlopen)
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "creator_dialogue.db")),
    )
    client = TestClient(app)

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={"creator_id": "author_1", "seed": "一个翻译员穿越到边境矿城。"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["assistant"]["story_text"].startswith("边境矿城")
    assert payload["assistant"]["model_status"]["mode"] == "llm_assisted"
    assert payload["assistant"]["model_status"]["provider"] == "openai_compatible"
    assert payload["assistant"]["model_status"]["model"] == "creator-model"
    assert payload["assistant"]["model_status"]["capability_profile"]["json_mode"] is True
    assert payload["assistant"]["model_status"]["fallback_used"] is False
    assert captured["url"] == "https://provider.example/v1/chat/completions"
    assert captured["authorization"] == "Bearer test-secret"
    assert "test-secret" not in json.dumps(payload)


def test_ops_provider_routing_includes_creator_runtime_status(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("NARRATIVEOS_CREATOR_PROVIDER", "openai_compatible")
    monkeypatch.setenv("NARRATIVEOS_CREATOR_API_KEY", "test-secret")
    monkeypatch.setenv("NARRATIVEOS_CREATOR_BASE_URL", "https://provider.example/v1")
    monkeypatch.setenv("NARRATIVEOS_CREATOR_MODEL", "creator-model")
    app = create_app(
        repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "creator_dialogue.db")),
    )
    client = TestClient(app)

    response = client.get("/v1/ops/provider-routing")

    assert response.status_code == 200
    payload = response.json()
    assert payload["creator"]["backend_present"] is True
    assert payload["creator"]["provider"] == "openai_compatible"
    assert payload["creator"]["provider_status"]["provider"] == "openai_compatible"
    assert payload["creator"]["provider_status"]["model"] == "creator-model"
    assert payload["creator"]["capability_profile"]["json_mode"] is True
    assert "test-secret" not in json.dumps(payload)


def test_creator_dialogue_missing_or_blank_turn_errors(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    missing = client.get("/v1/creator/dialogue/sessions/not_found")
    assert missing.status_code == 404

    started = client.post("/v1/creator/dialogue/sessions", json={"seed": "一座会说谎的城市"})
    session_id = started.json()["session_id"]
    blank = client.post(f"/v1/creator/dialogue/sessions/{session_id}/turns", json={"message": "   "})
    assert blank.status_code == 400


def test_kimi_provider_can_be_constructed_from_env_without_calling_network(monkeypatch):
    monkeypatch.setenv("NARRATIVEOS_LLM_ROUTING_ENABLED", "true")
    monkeypatch.setenv("NARRATIVEOS_LLM_PROVIDER_ORDER", "kimi")
    monkeypatch.setenv("MOONSHOT_API_KEY", "test-key")

    backend = build_llm_backend_from_env()

    assert backend is not None
    assert getattr(backend, "provider_id", None) == "kimi"
