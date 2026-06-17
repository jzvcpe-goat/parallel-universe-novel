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


def test_creator_dialogue_applies_genre_constraints_from_selected_context(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "一个普通中文系毕业生醒来后成了边境矿城的翻译，城外地下城会吐出魔物和失踪者遗物。不要系统面板和游戏术语。",
            "genre": "西方玄幻穿越",
            "context": {
                "story_direction": {
                    "label": "西方玄幻穿越",
                    "tone": "本土网文节奏、异大陆求生、人性博弈",
                    "hooks": "地下城不是游戏副本，而是现实世界的危险边界",
                    "keywords": "穿越, 异大陆, 地下城, 非游戏化",
                },
                "main_universe_template": {
                    "id": "western-dungeon-crossing",
                    "title": "黑门之下",
                    "genre": "西方玄幻穿越",
                    "opening_premise": "现代小人物进入异大陆边境矿城",
                    "first_choice_point": "公开遗物真相还是先保护幸存者",
                },
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    cards = payload["setting_cards"]
    assert cards["genre_signal"] == "西方玄幻穿越"
    assert "地下城是世界的一部分" in cards["world_rule_hint"]
    assert "系统面板" in cards["world_rule_hint"]
    constraint_ids = {item["id"] for item in cards["genre_constraints"]}
    constraints_by_id = {item["id"]: item for item in cards["genre_constraints"]}
    assert "western_fantasy_world_substrate" in constraint_ids
    assert "transmigration_local_feel" in constraint_ids
    assert "no_ancient_chinese_official_default" in constraint_ids
    assert "no_game_ui_or_loot_terms" in constraint_ids
    assert any("禁止自动生成古代中国官署" in item["rule"] for item in cards["genre_constraints"])
    assert any("游戏化表达" in item["rule"] for item in cards["genre_constraints"])
    assert constraints_by_id["western_fantasy_world_substrate"]["category"] == "world_substrate"
    assert constraints_by_id["western_fantasy_world_substrate"]["condition"]["required"] == {
        "genre_family": "western_fantasy",
        "entry_mode": "transmigration",
    }
    assert "仵作" in constraints_by_id["no_ancient_chinese_official_default"]["prohibited_terms"]
    assert "清河县" in constraints_by_id["no_ancient_chinese_official_default"]["prohibited_terms"]
    assert any(
        "验尸修士" in item
        for item in constraints_by_id["no_ancient_chinese_official_default"]["replacement_guidance"]
    )
    assert "系统面板" in constraints_by_id["no_game_ui_or_loot_terms"]["prohibited_terms"]
    assert constraints_by_id["no_game_ui_or_loot_terms"]["condition"]["observed"]["non_game_requested"] is True
    assert constraints_by_id["transmigration_local_feel"]["severity"] == "soft"
    assert cards["genre_constraint_facts"]["western_fantasy"] is True
    assert cards["genre_constraint_facts"]["non_game_requested"] is True
    assert cards["genre_constraint_facts"]["genre_family"] == "western_fantasy"
    assert cards["genre_constraint_facts"]["entry_mode"] == "transmigration"
    assert cards["genre_constraint_facts"]["tone_constraints"]["non_game"] is True
    assert cards["genre_constraint_facts"]["activation_inputs"]["selected_context"]["genre_family"] == "western_fantasy"
    assert cards["genre_constraint_facts"]["activation_order"] == [
        "selected_topic_template_direction",
        "user_freeform_intent",
        "explicit_user_overrides",
    ]


def test_creator_dialogue_does_not_apply_western_constraints_to_other_selected_genres(tmp_path: Path, monkeypatch):
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
                "main_universe_template": {
                    "id": "lotus-lane",
                    "title": "莲巷来信",
                    "genre": "情感成长",
                },
            },
        },
    )

    assert response.status_code == 200
    cards = response.json()["setting_cards"]
    assert cards["genre_signal"] != "西方玄幻穿越"
    assert cards["genre_constraints"] == []
    assert cards["genre_constraint_facts"]["western_fantasy"] is False
    assert cards["genre_constraint_facts"]["activation_inputs"]["selected_context"]["genre_family"] == ""


def test_creator_dialogue_allows_explicit_ancient_identity_override(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "我明确想写古代仵作穿越到西方玄幻地下城，保留县衙办案经验，但不要系统面板。",
            "genre": "西方玄幻穿越",
            "context": {
                "story_direction": {
                    "label": "西方玄幻穿越",
                    "tone": "本土网文节奏",
                    "hooks": "地下城现实灾厄",
                    "keywords": "穿越, 地下城, 非游戏化",
                },
            },
        },
    )

    assert response.status_code == 200
    cards = response.json()["setting_cards"]
    constraint_ids = {item["id"] for item in cards["genre_constraints"]}
    assert "western_fantasy_world_substrate" in constraint_ids
    assert "no_game_ui_or_loot_terms" in constraint_ids
    assert "no_ancient_chinese_official_default" not in constraint_ids
    assert cards["genre_constraint_facts"]["explicit_ancient_chinese_identity"] is True
    assert cards["genre_constraint_facts"]["user_overrides"]["ancient_chinese_identity"] is True
    assert "仵作" in cards["genre_constraint_facts"]["activation_inputs"]["explicit_overrides"]["ancient_chinese_identity_terms"]


def test_creator_dialogue_does_not_treat_negative_ancient_terms_as_override(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "一个现代编辑穿越到西方玄幻地下城矿城。不要县衙、仵作、宗门这些时代错位词，也不要系统面板。",
            "genre": "西方玄幻穿越",
            "context": {
                "story_direction": {
                    "label": "西方玄幻穿越",
                    "tone": "本土网文节奏",
                    "hooks": "地下城现实灾厄",
                    "keywords": "穿越, 地下城, 非游戏化",
                },
            },
        },
    )

    assert response.status_code == 200
    cards = response.json()["setting_cards"]
    constraint_ids = {item["id"] for item in cards["genre_constraints"]}
    assert "no_ancient_chinese_official_default" in constraint_ids
    assert cards["genre_constraint_facts"]["explicit_ancient_chinese_identity"] is False
    assert cards["genre_constraint_facts"]["user_overrides"]["ancient_chinese_identity"] is False
    override_inputs = cards["genre_constraint_facts"]["activation_inputs"]["explicit_overrides"]
    assert override_inputs["ancient_chinese_identity_terms"] == []
    assert "仵作" in override_inputs["negated_ancient_chinese_identity_terms"]


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
            "message": "我先写一个西幻穿越开场。",
            "story_text": "主角没有系统面板，也不是玩家，不能靠副本奖励活下去。",
            "questions": ["下一段要不要继续强调系统面板不存在？"],
            "setting_cards_delta": ["场景：地下城"],
            "next_actions": ["继续写。"],
            "quality_notes": ["测试禁用词净化。"],
        },
    )

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "一个现代编辑穿越到西方玄幻地下城矿城。不要系统面板、玩家、副本奖励。",
            "genre": "西方玄幻穿越",
            "context": {
                "story_direction": {
                    "label": "西方玄幻穿越",
                    "tone": "本土网文节奏",
                    "hooks": "地下城现实灾厄",
                    "keywords": "穿越, 地下城, 非游戏化",
                },
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assistant_text = json.dumps(payload["assistant"], ensure_ascii=False)
    for forbidden in ["系统面板", "玩家", "副本奖励"]:
        assert forbidden not in assistant_text
    assert "可见提示" in assistant_text
    assert "外来者" in assistant_text
    assert "契约报酬" in assistant_text


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
