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


def _runtime_rules_fixture() -> dict:
    root = Path(__file__).resolve().parents[2]
    return json.loads((root / "docs/product/rules/genre-runtime-rules.v1.json").read_text(encoding="utf-8"))


def _first_text(values, fallback: str) -> str:
    for value in values or []:
        text = str(value or "").strip()
        if text:
            return text
    return fallback


def _seed_for_profile(profile: dict) -> str:
    display = str(profile["displayName"])
    signal = _first_text(profile.get("signalTerms"), display)
    entry = _first_text(profile.get("entryModeSignals"), "一个必须立刻处理的开场事件")
    tone = _first_text(profile.get("toneSignals"), "选择代价")
    return f"我想写{display}，从{entry}开始，{signal}和{tone}会把人物推到选择前。"


def _kernel_for_profile(rules: dict, profile_id: str) -> dict:
    for kernel in rules["genreKernels"]:
        if profile_id in kernel.get("compatibleProfiles", []):
            return kernel
    raise AssertionError(f"{profile_id} has no compatible kernel")


def test_creator_dialogue_session_without_seed_asks_one_open_question(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post("/v1/creator/dialogue/sessions", json={"creator_id": "author_1"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["phase"] == "seed"
    assert payload["assistant"]["story_text"] == ""
    assert len(payload["assistant"]["questions"]) == 1
    assert "画面" in payload["assistant"]["questions"][0]
    assert payload["source"]["title"] == "小说启动引导"
    assert payload["source"]["max_questions_per_turn"] == 2
    assert "characters" in payload["source"]["creative_dimensions"]
    assert "scene" in payload["source"]["creative_dimensions"]
    assert "memo_frozen" in payload["source"]["input_sources"]
    assert payload["source"]["principles"][0] == "永远先给正文，后问问题"
    serialized = json.dumps(payload, ensure_ascii=False)
    for forbidden in ["prompt_id", "prompt_contract", "model_status", "harness_trace", "provider"]:
        assert forbidden not in serialized


def test_creator_dialogue_projects_frontend_guide_without_prompt_plumbing(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.post(
        "/v1/creator/dialogue/sessions",
        json={
            "creator_id": "author_1",
            "seed": "一座会在午夜改写名字的城市",
            "context": {
                "guide_id": "novel_starter_guide",
                "guide_version": "story_architecture_v2",
                "launch_method": "seed_break_grow",
                "rule": "write_first_ask_later",
                "max_questions_per_turn": 9,
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"]["title"] == "小说启动引导"
    assert payload["source"]["max_questions_per_turn"] == 2
    assert payload["source"]["input_sources"]["manual"]
    assert payload["source"]["input_sources"]["memo_frozen"]
    assert len(payload["assistant"]["questions"]) <= payload["source"]["max_questions_per_turn"]
    serialized = json.dumps(payload, ensure_ascii=False)
    for forbidden in ["guide_id", "prompt_id", "prompt_contract", "request_context", "model_status", "harness_trace"]:
        assert forbidden not in serialized


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
    assert "harness_trace" not in payload["assistant"]
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



def test_creator_dialogue_uses_shared_runtime_rules_for_each_document_profile(tmp_path: Path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    rules = _runtime_rules_fixture()
    for profile in rules["constraintProfiles"]:
        expected_kernel = _kernel_for_profile(rules, profile["id"])
        seed = _seed_for_profile(profile)
        response = client.post(
            "/v1/creator/dialogue/sessions",
            json={
                "creator_id": "author_1",
                "seed": seed,
                "genre": profile["displayName"],
                "context": {
                    "story_direction": {
                        "label": profile["displayName"],
                        "tone": _first_text(profile.get("toneSignals"), profile["displayName"]),
                        "hooks": seed,
                        "keywords": " ".join(
                            [
                                profile["displayName"],
                                _first_text(profile.get("signalTerms"), profile["displayName"]),
                                _first_text(profile.get("entryModeSignals"), profile["displayName"]),
                            ]
                        ),
                    },
                },
            },
        )

        assert response.status_code == 200
        payload = response.json()
        session_path = tmp_path / "creator_dialogue_sessions" / f"{payload['session_id']}.json"
        internal_session = json.loads(session_path.read_text(encoding="utf-8"))
        internal_cards = internal_session["setting_cards"]
        cards = payload["setting_cards"]
        runtime_rules = cards["genre_constraint_facts"].get("runtime_rules", {})
        assert runtime_rules == {}
        internal_runtime_rules = internal_cards["genre_constraint_facts"]["runtime_rules"]
        assert internal_runtime_rules["version"] == rules["version"]
        assert internal_runtime_rules["source"] == "docs/product/rules/genre-runtime-rules.v1.json"
        assert internal_runtime_rules["profile_count"] == len(rules["constraintProfiles"])
        assert internal_runtime_rules["kernel_count"] == len(rules["genreKernels"])
        assert internal_runtime_rules["document_core"]["policy"] == "document_registry_only"
        assert internal_runtime_rules["document_core"]["constraint_application"] == "active_profile_rules_only"
        assert internal_runtime_rules["document_core"]["kernel_application"] == "compatible_profile_only"
        assert internal_runtime_rules["document_core"]["no_match_behavior"] == "socratic_clarify_without_runtime_constraints"
        assert internal_runtime_rules["document_core"]["quality_boundary"] == "document_rule_fail_behavior_only"
        assert internal_runtime_rules["privacy"]["representative_works"] == "encrypted_vault_only"
        assert internal_runtime_rules["privacy"]["public_reference_field"] == "sourceRefs"
        assert cards["genre_signal"] == profile["displayName"]
        constraint_ids = {item["id"] for item in internal_cards["genre_constraints"]}
        for rule in profile["rules"]:
            assert rule["id"] in constraint_ids
            internal_constraint = next(item for item in internal_cards["genre_constraints"] if item["id"] == rule["id"])
            assert internal_constraint["fail_behavior"] == rule["failBehavior"]
        assert internal_cards["genre_constraint_facts"]["active_profile_ids"][0] == profile["id"]
        assert expected_kernel["id"] in internal_cards["genre_constraint_facts"]["active_kernel_ids"]
        assert internal_cards["genre_kernels"][0]["id"] == expected_kernel["id"]
        active_refs = internal_cards["genre_constraint_facts"]["active_profiles"][0]["source_refs"]
        for source_ref in profile.get("sourceRefs", []):
            assert source_ref in active_refs
        serialized = json.dumps(cards, ensure_ascii=False)
        assert "source_evidence" not in serialized
        assert "source_refs" not in serialized
        assert "rwref_" not in serialized
        assert profile["id"] not in serialized
        assert expected_kernel["id"] not in serialized
        for source_ref in profile.get("sourceRefs", []):
            assert source_ref not in serialized


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
    assert cards["genre_constraint_facts"]["active_profile_count"] == 0
    assert cards["genre_constraint_facts"]["active_kernel_count"] == 0
    assert cards["genre_constraint_facts"]["document_core"]["no_match_behavior"] == "socratic_clarify_without_runtime_constraints"
    assert "runtime_rules" not in cards["genre_constraint_facts"]
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
    assert "model_status" not in payload["assistant"]


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
    assert "model_status" not in payload["assistant"]
    assert captured["url"] == "https://provider.example/v1/chat/completions"
    assert captured["authorization"] == "Bearer test-secret"
    assert "test-secret" not in json.dumps(payload)
    for forbidden in ["provider", "creator-model", "openai_compatible", "fallback_used", "capability_profile"]:
        assert forbidden not in json.dumps(payload)


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
