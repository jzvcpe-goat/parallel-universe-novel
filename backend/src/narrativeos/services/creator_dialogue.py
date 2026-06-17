from __future__ import annotations

import copy
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ..providers import LLMBackend, backend_debug_info


IMPORTED_PROMPT_SOURCE = "imported_novel_starter_system_prompt"
IMPORTED_PROMPT_VERSION = "story_architecture_v2"
IMPORTED_PROMPT_TITLE = "小说启动引导"
IMPORTED_PROMPT_FIRST_QUESTION = "你脑海里最先浮现的是哪个画面？"
IMPORTED_PROMPT_CREATIVE_DIMENSIONS = [
    "premise",
    "protagonist",
    "characters",
    "scene",
    "world_rule",
    "conflict_engine",
    "reader_hook",
    "pov_tone",
    "outline",
]
IMPORTED_PROMPT_INPUT_SOURCE_MATRIX = {
    "manual": [
        "故事种子 / 第一画面 / 核心异常",
        "主角姓名、身份、欲望、伤口、底线",
        "关键人物关系和情感债",
        "首章场景的特殊物件、地点和时代质感",
        "世界规则中必须保留或禁止的部分",
        "叙事人称、文风和读者情绪方向",
    ],
    "memo_frozen": [
        "类型节拍：开局、升级、反转、章末钩子密度",
        "角色功能位：对手、盟友、诱惑者、见证者、导师位",
        "主流题材冲突模型：资源争夺、真相追索、权力博弈、关系拉扯",
        "场景库参数：首章高压地点、转折场、信息差场、代价场",
        "卷纲骨架：前详后略、阶段目标、高潮回收节奏",
        "质量阈值：人设统一、开篇不过载、冲突推动剧情、钩子清晰",
    ],
    "auto_derived": [
        "从正文沉淀人物、场景、规则、冲突和钩子笔记",
        "把用户回答写回下一段正文",
        "生成候选人物、场景、伏笔和章纲笔记",
        "检查人物一致性、时间一致性、伏笔回收和 AI 味",
    ],
}
IMPORTED_PROMPT_PRINCIPLES = [
    "永远先给正文，后问问题",
    "每轮最多两个问题",
    "不用复杂表格、问卷或十步设定表",
    "问题必须能在 30 秒内回答",
    "每次回答都要体现在下一段文字里",
    "每段正文都要维护人物、场景、规则、冲突和钩子",
    "类型节奏由平台创作经验辅助，原创意图由作者确认",
]
IMPORTED_PROMPT_CONTRACT = {
    "prompt_id": IMPORTED_PROMPT_SOURCE,
    "prompt_version": IMPORTED_PROMPT_VERSION,
    "launch_method": "seed_break_grow",
    "rule": "write_first_ask_later",
    "max_questions_per_turn": 2,
    "first_question": IMPORTED_PROMPT_FIRST_QUESTION,
    "creative_dimensions": list(IMPORTED_PROMPT_CREATIVE_DIMENSIONS),
    "input_source_matrix": copy.deepcopy(IMPORTED_PROMPT_INPUT_SOURCE_MATRIX),
}

PROHIBITED_TERM_REPLACEMENTS = {
    "系统面板": "可见提示",
    "玩家": "外来者",
    "副本奖励": "契约报酬",
    "打怪掉落": "遗物回收",
    "经验值": "历练痕迹",
    "等级面板": "身份记录",
    "职业数值": "技艺记录",
    "县衙": "城邦治安厅",
    "衙门": "城邦治安厅",
    "仵作": "验尸修士",
    "宗门": "修士会",
    "王朝科举": "城邦选拔",
    "清河县": "边境矿城",
}


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_text(value: Any, *, limit: int = 2000) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:limit]


def _as_list(value: Any, fallback: List[Any], *, limit: int = 8) -> List[Any]:
    if not isinstance(value, list):
        return list(fallback[:limit])
    cleaned = [item for item in value if item not in (None, "", [], {})]
    return cleaned[:limit] or list(fallback[:limit])


def _merge_dict(fallback: Dict[str, Any], generated: Any) -> Dict[str, Any]:
    merged = copy.deepcopy(fallback)
    if not isinstance(generated, dict):
        return merged
    for key, value in generated.items():
        if value in (None, "", [], {}):
            continue
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


def _model_mode(provider: Optional[str]) -> str:
    if provider in {None, "local", "local_rule_based"}:
        return "local_cowriter"
    return "llm_assisted"


def _contains_any(text: str, words: List[str]) -> bool:
    lowered = text.lower()
    return any(word.lower() in lowered for word in words)


def _signal_matches(text: str, words: List[str]) -> List[str]:
    lowered = text.lower()
    return [word for word in words if word.lower() in lowered]


def _negated_signal_matches(text: str, words: List[str]) -> List[str]:
    matches: List[str] = []
    for word in words:
        pattern = r"(?:不要|不许|禁止|禁用|不能出现|不要出现|别写|避免|不要默认|不默认)[^。；;,.，]{0,36}%s" % re.escape(word)
        if re.search(pattern, text, flags=re.IGNORECASE):
            matches.append(word)
    return matches


def _explicit_override_matches(text: str, words: List[str]) -> List[str]:
    raw_matches = _signal_matches(text, words)
    if not raw_matches:
        return []
    negated = set(_negated_signal_matches(text, words))
    positive_cues = [
        "明确想写",
        "想写",
        "保留",
        "需要",
        "必须有",
        "设定为",
        "主角是",
        "来自古代",
        "古代身份",
        "古代仵作",
        "县衙办案经验",
    ]
    if not _contains_any(text, positive_cues):
        return []
    return [word for word in raw_matches if word not in negated]


def _active_prohibited_terms(cards: Dict[str, Any]) -> List[str]:
    terms: List[str] = []
    for constraint in cards.get("genre_constraints", []):
        if not isinstance(constraint, dict):
            continue
        for term in constraint.get("prohibited_terms", []):
            clean = _clean_text(term, limit=80)
            if clean and clean not in terms:
                terms.append(clean)
    return terms


def _sanitize_prohibited_terms(value: Any, cards: Dict[str, Any]) -> Any:
    terms = _active_prohibited_terms(cards)
    if not terms:
        return value

    def sanitize_text(text: str) -> str:
        sanitized = text
        for term in terms:
            sanitized = sanitized.replace(term, PROHIBITED_TERM_REPLACEMENTS.get(term, "世界内表达"))
        return sanitized

    if isinstance(value, str):
        return sanitize_text(value)
    if isinstance(value, list):
        return [_sanitize_prohibited_terms(item, cards) for item in value]
    if isinstance(value, dict):
        return {key: _sanitize_prohibited_terms(item, cards) for key, item in value.items()}
    return value


def _prompt_request_context(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    allowed = {
        "prompt_id",
        "prompt_version",
        "launch_method",
        "rule",
        "max_questions_per_turn",
    }
    normalized: Dict[str, Any] = {}
    for key in allowed:
        if key not in value:
            continue
        raw = value[key]
        if key == "max_questions_per_turn":
            try:
                normalized[key] = max(1, min(2, int(raw)))
            except (TypeError, ValueError):
                normalized[key] = IMPORTED_PROMPT_CONTRACT["max_questions_per_turn"]
        else:
            normalized[key] = _clean_text(raw, limit=120)
    return normalized


def _story_context(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    story_direction = value.get("story_direction") if isinstance(value.get("story_direction"), dict) else {}
    template = value.get("main_universe_template") if isinstance(value.get("main_universe_template"), dict) else {}
    return {
        "story_direction": {
            key: _clean_text(story_direction.get(key), limit=240)
            for key in ["label", "tone", "hooks", "keywords"]
            if _clean_text(story_direction.get(key), limit=240)
        },
        "main_universe_template": {
            key: _clean_text(template.get(key), limit=240)
            for key in ["id", "title", "genre", "opening_premise", "protagonist_gap", "first_choice_point", "audience_promise"]
            if _clean_text(template.get(key), limit=240)
        },
    }


def _genre_constraint(
    *,
    constraint_id: str,
    category: str,
    applies_when: List[str],
    rule: str,
    source: str,
    condition: Optional[Dict[str, Any]] = None,
    activation_evidence: Optional[Dict[str, List[str]]] = None,
    prohibited_terms: Optional[List[str]] = None,
    replacement_guidance: Optional[List[str]] = None,
    positive_guidance: str = "",
    severity: str = "hard",
    scope: str = "generation",
    user_override: str = "explicit_user_request_only",
) -> Dict[str, Any]:
    return {
        "id": constraint_id,
        "category": category,
        "applies_when": applies_when,
        "condition": condition or {},
        "rule": rule,
        "positive_guidance": positive_guidance,
        "prohibited_terms": prohibited_terms or [],
        "replacement_guidance": replacement_guidance or [],
        "source": source,
        "activation_evidence": activation_evidence or {"selected_context": [], "user_text": []},
        "severity": severity,
        "scope": scope,
        "user_override": user_override,
        "applies_to": ["generation", "setting_cards", "quality_gate"],
    }


def _genre_constraint_profile(*, selected_text: str, user_text: str) -> Dict[str, Any]:
    signal_text = f"{selected_text} {user_text}"
    western_terms = ["西方玄幻", "异大陆", "地下城", "魔物", "圣堂", "公会", "佣兵", "深渊", "教堂", "魔法"]
    transmigration_terms = ["穿越", "醒来后", "异大陆", "前世", "故乡", "另一个世界"]
    non_game_terms = ["不是游戏", "不要游戏", "不要系统", "没有系统", "系统面板", "游戏术语", "非游戏", "非游戏化"]
    local_feel_terms = ["本土感", "本土网文", "中文网文", "国人", "东方处事", "人情", "认知差", "小人物破局"]
    ancient_cn_terms = ["古代", "县衙", "仵作", "宗门", "王朝", "科举", "衙门", "大理寺", "锦衣卫", "清河县"]
    selected_western_hits = _signal_matches(selected_text, western_terms)
    user_western_hits = _signal_matches(user_text, western_terms)
    transmigration_hits = _signal_matches(signal_text, transmigration_terms)
    non_game_hits = _signal_matches(signal_text, non_game_terms)
    local_feel_hits = _signal_matches(signal_text, local_feel_terms)
    explicit_ancient_hits = _explicit_override_matches(signal_text, ancient_cn_terms)
    negated_ancient_hits = _negated_signal_matches(signal_text, ancient_cn_terms)
    selected_mentions_western = bool(selected_western_hits)
    user_mentions_western = bool(user_western_hits)
    transmigration = bool(transmigration_hits)
    non_game = bool(non_game_hits)
    local_feel = bool(local_feel_hits)
    explicit_ancient_cn = bool(explicit_ancient_hits)
    western_fantasy = selected_mentions_western or user_mentions_western
    genre_family = "western_fantasy" if western_fantasy else ""
    entry_mode = "transmigration" if transmigration else ""
    tone_constraints = {
        "non_game": non_game,
        "local_webnovel_feel": local_feel or (western_fantasy and transmigration),
    }
    activation_evidence = {
        "selected_context": selected_western_hits,
        "user_text": user_western_hits,
        "entry_mode": transmigration_hits,
        "tone": non_game_hits + local_feel_hits,
        "explicit_overrides": explicit_ancient_hits,
    }
    sources = []
    if selected_mentions_western:
        sources.append("selected_context")
    if user_mentions_western:
        sources.append("user_text")
    if not sources:
        sources.append("none")
    active: List[Dict[str, Any]] = []
    if western_fantasy and transmigration:
        base_condition = {
            "required": {
                "genre_family": "western_fantasy",
                "entry_mode": "transmigration",
            },
            "observed": {
                "selected_context_matches_genre": selected_mentions_western,
                "user_text_matches_genre": user_mentions_western,
                "transmigration": transmigration,
                "non_game_requested": non_game,
                "local_webnovel_feel": tone_constraints["local_webnovel_feel"],
                "explicit_ancient_chinese_identity": explicit_ancient_cn,
            },
        }
        active.append(
            _genre_constraint(
                constraint_id="western_fantasy_world_substrate",
                category="world_substrate",
                applies_when=["genre=western_fantasy", "entry_mode=transmigration"],
                condition=base_condition,
                rule="世界内制度、职业、地名和物件必须服从西方玄幻现实，不默认借用中式古代制度名词。",
                positive_guidance="优先使用边境矿城、圣堂、佣兵团、行会、市政官、书记员、译员、修士会、魔物灾厄等能支撑西方玄幻现实感的表达。",
                prohibited_terms=["县衙", "衙门", "仵作", "宗门", "王朝科举", "清河县"],
                replacement_guidance=["县令/知县 -> 市政官/领主代理/治安官", "仵作 -> 验尸修士/尸检书记/医师", "宗门 -> 修士会/骑士团/学院/圣堂派系"],
                source="+".join(sources),
                activation_evidence=activation_evidence,
            )
        )
        active.append(
            _genre_constraint(
                constraint_id="transmigration_local_feel",
                category="tone_translation",
                applies_when=["entry_mode=transmigration", "tone=local_webnovel_feel"],
                condition={
                    "required": {
                        "entry_mode": "transmigration",
                        "tone_constraint": "local_webnovel_feel",
                    },
                    "observed": {
                        "local_feel_requested": local_feel,
                        "local_feel_inferred_from_chinese_transmigration": western_fantasy and transmigration,
                    },
                },
                rule="本土感默认体现为中文网文节奏、主角处事方式、认知差、人性博弈和底层破局，不等于古代中国设定。",
                positive_guidance="把本土感落实到主角权衡、人情账、风险规避、信息差判断和小人物向上破局，而不是改写世界制度为中式古代。",
                source="+".join(sources),
                activation_evidence=activation_evidence,
                severity="soft",
            )
        )
        if not explicit_ancient_cn:
            active.append(
                _genre_constraint(
                    constraint_id="no_ancient_chinese_official_default",
                    category="anachronism_guardrail",
                    applies_when=["genre=western_fantasy", "user_has_not_explicitly_requested_ancient_china"],
                    condition={
                        "required": {
                            "genre_family": "western_fantasy",
                            "entry_mode": "transmigration",
                            "explicit_ancient_chinese_identity": False,
                        },
                        "observed": {
                            "explicit_ancient_chinese_identity": explicit_ancient_cn,
                            "explicit_override_terms": explicit_ancient_hits,
                        },
                    },
                    rule="禁止自动生成古代中国官署、县衙、仵作、宗门、王朝科举等强时代标签。",
                    positive_guidance="若需要调查、尸检、组织和权力结构，改用西方玄幻世界内自洽的教会、行会、城邦、市政、佣兵、医师和书记体系。",
                    prohibited_terms=["县衙", "衙门", "仵作", "宗门", "王朝", "科举", "大理寺", "锦衣卫", "清河县"],
                    replacement_guidance=["古代官署职业 -> 城邦/圣堂/行会职业", "县域地名 -> 边境城、矿城、港城、领地", "中式办案身份 -> 治安官、验尸修士、书记员、译员"],
                    source="+".join(sources),
                    activation_evidence=activation_evidence,
                    user_override="allowed_if_user_explicitly_requests_ancient_chinese_identity",
                )
            )
    if western_fantasy and non_game:
        active.append(
            _genre_constraint(
                constraint_id="no_game_ui_or_loot_terms",
                category="non_game_tone_guardrail",
                applies_when=["genre=western_fantasy", "user_requests_non_game_tone"],
                condition={
                    "required": {
                        "genre_family": "western_fantasy",
                        "tone_constraint": "non_game",
                    },
                    "observed": {
                        "non_game_requested": non_game,
                        "non_game_terms": non_game_hits,
                    },
                },
                rule="禁用系统面板、玩家、副本奖励、打怪掉落、数值职业面板等游戏化表达；地下城必须作为现实地理/灾厄/制度存在。",
                positive_guidance="地下城应写成真实世界中的危险地貌、矿井、遗迹、灾厄源或制度化边境，而不是玩法界面。",
                prohibited_terms=["系统面板", "玩家", "副本奖励", "打怪掉落", "经验值", "等级面板", "职业数值"],
                replacement_guidance=["副本 -> 地下城/遗迹/矿井/深井/禁区", "奖励 -> 战利品/遗物/契约报酬/生存资源", "职业面板 -> 身份、技艺、契约、训练痕迹"],
                source="+".join(sources),
                activation_evidence=activation_evidence,
            )
        )
    return {
        "facts": {
            "selected_mentions_western_fantasy": selected_mentions_western,
            "user_mentions_western_fantasy": user_mentions_western,
            "western_fantasy": western_fantasy,
            "transmigration": transmigration,
            "non_game_requested": non_game,
            "local_feel_requested": local_feel,
            "explicit_ancient_chinese_identity": explicit_ancient_cn,
            "genre_family": genre_family,
            "entry_mode": entry_mode,
            "tone_constraints": tone_constraints,
            "user_overrides": {
                "ancient_chinese_identity": explicit_ancient_cn,
            },
            "activation_inputs": {
                "selected_context": {
                    "present": bool(_clean_text(selected_text, limit=40)),
                    "genre_family": "western_fantasy" if selected_mentions_western else "",
                    "matched_terms": selected_western_hits,
                },
                "user_text": {
                    "present": bool(_clean_text(user_text, limit=40)),
                    "genre_family": "western_fantasy" if user_mentions_western else "",
                    "matched_terms": user_western_hits,
                },
                "entry_mode": {
                    "value": entry_mode,
                    "matched_terms": transmigration_hits,
                },
                "tone": {
                    "non_game_terms": non_game_hits,
                    "local_feel_terms": local_feel_hits,
                },
                "explicit_overrides": {
                    "ancient_chinese_identity_terms": explicit_ancient_hits,
                    "negated_ancient_chinese_identity_terms": negated_ancient_hits,
                },
            },
            "activation_order": [
                "selected_topic_template_direction",
                "user_freeform_intent",
                "explicit_user_overrides",
            ],
            "global_prompt_rule": "constraints_activate_from_selected_context_then_user_intent",
        },
        "active": active,
    }


class CreatorDialogueService:
    """Conversation-first novel starter based on an imported system prompt pack.

    The service is deliberately product-facing: it returns story text, 1-2 live
    questions, extracted setting cards, and a truthful model status. It never
    exposes prompt plumbing or asks the user to fill a setting worksheet.
    """

    def __init__(
        self,
        *,
        llm_backend: Optional[LLMBackend] = None,
        store_dir: Optional[Path] = None,
    ) -> None:
        self.llm_backend = llm_backend
        self.store_dir = Path(store_dir or Path.cwd() / "artifacts" / "creator_dialogue_sessions")

    def start_session(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self.store_dir.mkdir(parents=True, exist_ok=True)
        seed = _clean_text(payload.get("seed"), limit=1200)
        request_context = _prompt_request_context(payload.get("context"))
        story_context = _story_context(payload.get("context"))
        selected_genre = (
            _clean_text(payload.get("genre"), limit=120)
            or story_context.get("main_universe_template", {}).get("genre", "")
            or story_context.get("story_direction", {}).get("label", "")
        )
        now = _utcnow()
        session = {
            "session_id": "creator_dialogue_%s" % uuid4().hex[:12],
            "creator_id": _clean_text(payload.get("creator_id") or "first_author", limit=80),
            "status": "active",
            "phase": "seed" if not seed else "break_soil",
            "created_at": now,
            "updated_at": now,
            "source": {
                "agent": IMPORTED_PROMPT_SOURCE,
                "version": IMPORTED_PROMPT_VERSION,
                "title": IMPORTED_PROMPT_TITLE,
                "prompt_id": IMPORTED_PROMPT_SOURCE,
                "prompt_version": IMPORTED_PROMPT_VERSION,
                "principles": list(IMPORTED_PROMPT_PRINCIPLES),
                "request_context": request_context,
                "prompt_contract": dict(IMPORTED_PROMPT_CONTRACT),
            },
            "preferences": {
                "language": _clean_text(payload.get("language") or "zh-CN", limit=24),
                "target_length": _clean_text(payload.get("target_length") or "longform_serial", limit=80),
                "genre": selected_genre,
                "tone": _clean_text(payload.get("tone"), limit=160),
            },
            "story_context": story_context,
            "turns": [],
            "setting_cards": self._empty_setting_cards(seed=seed),
        }
        if seed:
            session["turns"].append({"role": "user", "content": seed, "created_at": now})
            session["setting_cards"] = self._extract_setting_cards(session)
            assistant = self._build_assistant_turn(session)
        else:
            assistant = self._seed_question_turn()
        session["turns"].append({"role": "assistant", **assistant, "created_at": _utcnow()})
        self._save(session)
        return self._public_session(session)

    def add_turn(self, session_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            session = self._load(session_id)
        except KeyError:
            session = self._rehydrate_session(session_id, payload.get("previous_session"))
        if session.get("status") != "active":
            raise ValueError("creator_dialogue_session_not_active")
        message = _clean_text(payload.get("message") or payload.get("content"), limit=3000)
        if not message:
            raise ValueError("message_required")
        request_context = _prompt_request_context(payload.get("context"))
        if request_context:
            session.setdefault("source", {})["request_context"] = request_context
        next_story_context = _story_context(payload.get("context"))
        if next_story_context:
            session["story_context"] = next_story_context
            selected_genre = (
                next_story_context.get("main_universe_template", {}).get("genre", "")
                or next_story_context.get("story_direction", {}).get("label", "")
            )
            if selected_genre:
                session.setdefault("preferences", {})["genre"] = selected_genre
        now = _utcnow()
        session["turns"].append({"role": "user", "content": message, "created_at": now})
        session["setting_cards"] = self._extract_setting_cards(session)
        session["phase"] = self._phase_for_session(session)
        assistant = self._build_assistant_turn(session)
        session["turns"].append({"role": "assistant", **assistant, "created_at": _utcnow()})
        session["updated_at"] = _utcnow()
        self._save(session)
        return self._public_session(session)

    def get_session(self, session_id: str) -> Dict[str, Any]:
        return self._public_session(self._load(session_id))

    def list_sessions(self, *, creator_id: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        self.store_dir.mkdir(parents=True, exist_ok=True)
        sessions: List[Dict[str, Any]] = []
        for path in self.store_dir.glob("*.json"):
            try:
                session = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if creator_id and str(session.get("creator_id") or "") != creator_id:
                continue
            sessions.append(self._public_session(session))
        sessions.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        return sessions[: max(1, int(limit))]

    def reassign_sessions(self, *, from_creator_id: str, to_creator_id: str) -> Dict[str, Any]:
        source = _clean_text(from_creator_id, limit=80)
        target = _clean_text(to_creator_id, limit=80)
        if not source:
            raise ValueError("from_creator_id_required")
        if not target:
            raise ValueError("to_creator_id_required")
        if source == target:
            return {
                "from_creator_id": source,
                "to_creator_id": target,
                "updated_count": 0,
                "sessions": [],
            }
        self.store_dir.mkdir(parents=True, exist_ok=True)
        updated: List[Dict[str, Any]] = []
        now = _utcnow()
        for path in self.store_dir.glob("*.json"):
            try:
                session = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if str(session.get("creator_id") or "") != source:
                continue
            session["creator_id"] = target
            session["updated_at"] = now
            session.setdefault("merge_history", []).append(
                {
                    "from_creator_id": source,
                    "to_creator_id": target,
                    "merged_at": now,
                    "reason": "account_profile_merge",
                }
            )
            self._save(session)
            updated.append(
                {
                    "session_id": session.get("session_id"),
                    "phase": session.get("phase"),
                    "updated_at": now,
                }
            )
        updated.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        return {
            "from_creator_id": source,
            "to_creator_id": target,
            "updated_count": len(updated),
            "sessions": updated,
        }

    def delete_sessions(self, *, creator_id: str) -> Dict[str, Any]:
        owner = _clean_text(creator_id, limit=80)
        if not owner:
            return {"creator_id": owner, "deleted_count": 0, "sessions": []}
        self.store_dir.mkdir(parents=True, exist_ok=True)
        deleted: List[Dict[str, Any]] = []
        for path in self.store_dir.glob("*.json"):
            try:
                session = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if str(session.get("creator_id") or "") != owner:
                continue
            deleted.append(
                {
                    "session_id": session.get("session_id"),
                    "phase": session.get("phase"),
                    "updated_at": session.get("updated_at"),
                }
            )
            try:
                path.unlink()
            except FileNotFoundError:
                pass
        deleted.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        return {
            "creator_id": owner,
            "deleted_count": len(deleted),
            "sessions": deleted,
        }

    def _path(self, session_id: str) -> Path:
        safe_id = re.sub(r"[^a-zA-Z0-9_.:-]", "_", str(session_id))
        return self.store_dir / f"{safe_id}.json"

    def _save(self, session: Dict[str, Any]) -> None:
        self.store_dir.mkdir(parents=True, exist_ok=True)
        path = self._path(str(session["session_id"]))
        tmp_path = path.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(session, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(path)

    def _load(self, session_id: str) -> Dict[str, Any]:
        path = self._path(session_id)
        if not path.exists():
            raise KeyError("unknown_creator_dialogue_session:%s" % session_id)
        return json.loads(path.read_text(encoding="utf-8"))

    def _rehydrate_session(self, session_id: str, snapshot: Any) -> Dict[str, Any]:
        if not isinstance(snapshot, dict):
            raise KeyError("unknown_creator_dialogue_session:%s" % session_id)
        turns = snapshot.get("turns")
        if not isinstance(turns, list) or not turns:
            raise KeyError("unknown_creator_dialogue_session:%s" % session_id)
        now = _utcnow()
        session = {
            "session_id": session_id,
            "creator_id": _clean_text(snapshot.get("creator_id") or "first_author", limit=80),
            "status": _clean_text(snapshot.get("status") or "active", limit=40) or "active",
            "phase": _clean_text(snapshot.get("phase") or "break_soil", limit=40) or "break_soil",
            "created_at": _clean_text(snapshot.get("created_at") or now, limit=80),
            "updated_at": now,
            "source": snapshot.get("source") if isinstance(snapshot.get("source"), dict) else {
                "agent": IMPORTED_PROMPT_SOURCE,
                "version": IMPORTED_PROMPT_VERSION,
                "title": IMPORTED_PROMPT_TITLE,
                "prompt_id": IMPORTED_PROMPT_SOURCE,
                "prompt_version": IMPORTED_PROMPT_VERSION,
                "principles": list(IMPORTED_PROMPT_PRINCIPLES),
                "request_context": {},
                "prompt_contract": dict(IMPORTED_PROMPT_CONTRACT),
            },
            "preferences": {
                "language": "zh-CN",
                "target_length": "longform_serial",
                "tone": _clean_text((snapshot.get("setting_cards") or {}).get("tone"), limit=160),
                "genre": _clean_text((snapshot.get("preferences") or {}).get("genre"), limit=120),
            },
            "story_context": snapshot.get("story_context") if isinstance(snapshot.get("story_context"), dict) else {},
            "turns": [turn for turn in turns if isinstance(turn, dict)],
            "setting_cards": snapshot.get("setting_cards") if isinstance(snapshot.get("setting_cards"), dict) else self._empty_setting_cards(),
        }
        self._save(session)
        return session

    def _public_session(self, session: Dict[str, Any]) -> Dict[str, Any]:
        assistant_turns = [turn for turn in session.get("turns", []) if turn.get("role") == "assistant"]
        latest = dict(assistant_turns[-1]) if assistant_turns else {}
        latest.pop("role", None)
        return {
            "session_id": session["session_id"],
            "creator_id": session.get("creator_id"),
            "status": session.get("status"),
            "phase": session.get("phase"),
            "turn_index": len(session.get("turns", [])),
            "assistant": latest,
            "setting_cards": session.get("setting_cards") or {},
            "turns": session.get("turns", []),
            "source": session.get("source", {}),
            "updated_at": session.get("updated_at"),
        }

    def _seed_question_turn(self) -> Dict[str, Any]:
        return {
            "message": "我们先抓一个故事种子。不用完整，一个画面、一句话、一种情绪都可以。",
            "story_text": "",
            "questions": [IMPORTED_PROMPT_FIRST_QUESTION],
            "setting_cards_delta": [],
            "next_actions": ["给我一个词也可以，我会先写一段让你判断感觉。"],
            "quality_notes": ["第一轮只收种子，不做问卷。"],
            "model_status": {
                "mode": "local_cowriter",
                "provider": None,
                "generated_at": _utcnow(),
                "secret_exposure": "server_env_only",
            },
            "harness_trace": self._trace("seed", model_used=False),
        }

    def _build_assistant_turn(self, session: Dict[str, Any]) -> Dict[str, Any]:
        fallback = self._fallback_turn(session)
        generated: Optional[Dict[str, Any]] = None
        model_status = {
            "mode": "local_cowriter",
            "provider": None,
            "generated_at": _utcnow(),
            "secret_exposure": "server_env_only",
        }

        if self.llm_backend is not None:
            try:
                raw = self.llm_backend.generate_json(
                    system_prompt=self._system_prompt(),
                    user_prompt=self._user_prompt(session),
                )
                if isinstance(raw, dict):
                    generated = raw
                    debug = backend_debug_info(self.llm_backend)
                    provider = debug.get("selected_provider") or debug.get("provider")
                    capability_profile = debug.get("capability_profile")
                    if not isinstance(capability_profile, dict) and hasattr(self.llm_backend, "capability_profile"):
                        capability_profile = self.llm_backend.capability_profile()
                    provider_status = debug.get("provider_status")
                    if not isinstance(provider_status, dict) and hasattr(self.llm_backend, "provider_status"):
                        provider_status = self.llm_backend.provider_status()
                    model_status = {
                        "mode": _model_mode(provider),
                        "provider": provider,
                        "model": debug.get("model"),
                        "fallback_used": bool(debug.get("fallback_used")),
                        "backend_error": debug.get("backend_error"),
                        "latency_ms": debug.get("latency_ms"),
                        "capability_profile": capability_profile or {},
                        "provider_status": provider_status or {},
                        "generated_at": _utcnow(),
                        "secret_exposure": "server_env_only",
                    }
                    if provider in {"local", "local_rule_based"}:
                        model_status["fallback_reason"] = "routed_to_local_fallback"
            except Exception as exc:  # noqa: BLE001 - dialogue must stay usable when model calls fail
                model_status = {
                    "mode": "local_cowriter",
                    "provider": getattr(self.llm_backend, "provider_id", "llm"),
                    "fallback_used": True,
                    "backend_error": exc.__class__.__name__,
                    "capability_profile": {},
                    "provider_status": {},
                    "generated_at": _utcnow(),
                    "fallback_reason": exc.__class__.__name__,
                    "secret_exposure": "server_env_only",
                }

        merged = self._merge_turn(fallback, generated)
        merged = _sanitize_prohibited_terms(merged, session.get("setting_cards") or {})
        merged["model_status"] = model_status
        merged["harness_trace"] = self._trace(str(session.get("phase") or "break_soil"), model_used=generated is not None)
        return merged

    def _merge_turn(self, fallback: Dict[str, Any], generated: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if generated is None:
            return fallback
        merged = _merge_dict(fallback, generated)
        merged["questions"] = _as_list(generated.get("questions"), fallback["questions"], limit=2)
        merged["next_actions"] = _as_list(generated.get("next_actions"), fallback["next_actions"], limit=4)
        merged["quality_notes"] = _as_list(generated.get("quality_notes"), fallback["quality_notes"], limit=5)
        if not _clean_text(merged.get("story_text")) and _clean_text(fallback.get("story_text")):
            merged["story_text"] = fallback["story_text"]
        if not _clean_text(merged.get("message")):
            merged["message"] = fallback["message"]
        return merged

    def _system_prompt(self) -> str:
        principles = "；".join(IMPORTED_PROMPT_PRINCIPLES)
        return (
            "你是一个基于导入 novel-starter system prompt 的小说共创助手。"
            f"核心原则：{principles}。"
            "每次生成必须同时维护小说建筑：故事钩子、主角缺口、人物关系、场景锚点、世界规则、冲突引擎、章节钩子、叙事视角、章纲骨架。"
            "作者只需要确认不可替代的原创意图；类型节奏、角色功能位、场景库参数和章末钩子密度来自平台预置的创作经验。"
            "必须先读取当前题材、模板和创作方向，再应用对应题材约束；不要把某一题材的规则泛化给全部作品。"
            "如果 setting_cards.genre_constraints 提供 prohibited_terms，story_text 不得复述这些词，连否定句也不要出现；必须改用 replacement_guidance 中的世界内表达。"
            "不要向作者提及后台、接口、系统提示词、Memo、模板、设定卡或任何工程实现。"
            "请只输出 JSON 对象，字段为 message, story_text, questions, setting_cards_delta, next_actions, quality_notes。"
            "story_text 必须是中文正文或续写，除非当前是完全没有种子的第一轮。"
        )

    def _user_prompt(self, session: Dict[str, Any]) -> str:
        visible_turns = [
            {"role": turn.get("role"), "content": turn.get("content") or turn.get("story_text") or turn.get("message")}
            for turn in session.get("turns", [])[-8:]
        ]
        return json.dumps(
            {
                "phase": session.get("phase"),
                "prompt_contract": session.get("source", {}).get("prompt_contract") or IMPORTED_PROMPT_CONTRACT,
                "setting_cards": session.get("setting_cards", {}),
                "turns": visible_turns,
                "task": (
                    "延续这场小说创作访谈。先给可读故事正文，再问 0-2 个为了写下一段必须确认的问题。"
                    "问题要口语化，能在 30 秒内回答。不要让作者一次性整理复杂参数；只确认主角、场景、关系、规则边界和下一场戏选择。"
                ),
                "output_contract": {
                    "message": "简短共创说明，不要工程词",
                    "story_text": "300-900 字中文正文或明显续写",
                    "questions": ["最多两个问题"],
                    "setting_cards_delta": ["本轮新增或确认的故事笔记"],
                    "next_actions": ["作者下一步可以怎么继续"],
                    "quality_notes": ["节奏、人物、伏笔等内部短评"],
                },
            },
            ensure_ascii=False,
        )

    def _fallback_turn(self, session: Dict[str, Any]) -> Dict[str, Any]:
        cards = self._extract_setting_cards(session)
        phase = str(session.get("phase") or "break_soil")
        seed = cards.get("seed") or "一个还没有说完整的故事种子"
        latest_user = self._latest_user_message(session) or seed
        if phase == "growth":
            story = self._growth_story(seed=seed, latest_user=latest_user, cards=cards)
            questions = [
                "下一段我们要让主角主动追上危险，还是先让他失去一个重要的人？",
            ]
            message = "我先顺着你刚才的回答往前写一段，让设定从行动里长出来。"
        else:
            story = self._break_soil_story(seed=seed, latest_user=latest_user, cards=cards)
            questions = [
                "我把它写成这种开场气质，对吗？",
                "主角此刻更像是在逃避过去，还是在追一个不能放手的真相？",
            ]
            message = "我先不让你填设定表，直接把这个种子写成开场；你看感觉对不对。"
        return {
            "message": message,
            "story_text": story,
            "questions": questions[:2],
            "setting_cards_delta": self._setting_delta(cards),
            "next_actions": [
                "回答上面任意一个问题，我会立刻把答案写进下一段。",
                "或者只说“继续”，我会先推进剧情。",
            ],
            "quality_notes": [
                "永远先给正文，后问问题。",
                "问题数量控制在两条以内。",
            ],
        }

    def _latest_user_message(self, session: Dict[str, Any]) -> str:
        for turn in reversed(session.get("turns", [])):
            if turn.get("role") == "user":
                return _clean_text(turn.get("content"), limit=1200)
        return ""

    def _phase_for_session(self, session: Dict[str, Any]) -> str:
        user_turns = [turn for turn in session.get("turns", []) if turn.get("role") == "user"]
        latest = self._latest_user_message(session)
        if len(user_turns) <= 1:
            return "break_soil"
        if len(user_turns) >= 4 or _contains_any(latest, ["继续", "有感觉", "就是这个", "接下来", "more", "keep going"]):
            return "growth"
        return "break_soil"

    def _empty_setting_cards(self, *, seed: str = "") -> Dict[str, Any]:
        return {
            "seed": seed,
            "tone": "",
            "genre_signal": "",
            "genre_constraints": [],
            "genre_constraint_facts": {},
            "protagonist_hint": "",
            "character_web_hint": "",
            "opening_scene_hint": "",
            "pov_hint": "",
            "world_rule_hint": "",
            "central_tension": "",
            "conflict_engine_hint": "",
            "outline_hint": "",
            "input_sources": copy.deepcopy(IMPORTED_PROMPT_INPUT_SOURCE_MATRIX),
            "confirmed": [],
            "open_questions": [],
        }

    def _extract_setting_cards(self, session: Dict[str, Any]) -> Dict[str, Any]:
        user_texts = [
            _clean_text(turn.get("content"), limit=1200)
            for turn in session.get("turns", [])
            if turn.get("role") == "user" and _clean_text(turn.get("content"))
        ]
        joined = " ".join(user_texts)
        seed = (session.get("setting_cards") or {}).get("seed") or (user_texts[0] if user_texts else "")
        cards = self._empty_setting_cards(seed=seed)
        story_context = session.get("story_context") if isinstance(session.get("story_context"), dict) else {}
        story_direction = story_context.get("story_direction") if isinstance(story_context.get("story_direction"), dict) else {}
        template = story_context.get("main_universe_template") if isinstance(story_context.get("main_universe_template"), dict) else {}
        selected_genre_text = " ".join(
            str(item or "")
            for item in [
                (session.get("preferences") or {}).get("genre"),
                story_direction.get("label"),
                story_direction.get("tone"),
                story_direction.get("hooks"),
                story_direction.get("keywords"),
                template.get("title"),
                template.get("genre"),
                template.get("opening_premise"),
                template.get("first_choice_point"),
            ]
        )
        constraint_profile = _genre_constraint_profile(selected_text=selected_genre_text, user_text=joined)
        facts = constraint_profile["facts"]
        is_western_fantasy = bool(facts["western_fantasy"])
        is_transmigration = bool(facts["transmigration"])
        no_game_terms = bool(facts["non_game_requested"])
        cards["genre_constraint_facts"] = dict(facts)
        if _contains_any(joined, ["热血", "燃", "冒险", "战斗", "地下城", "深渊", "佣兵"]):
            cards["tone"] = "高张力、行动感强"
        elif _contains_any(joined, ["怪", "诡", "梦", "失踪", "悬疑"]):
            cards["tone"] = "悬疑、压迫、带异常感"
        elif _contains_any(joined, ["遗憾", "错过", "雨", "孤独", "安静"]):
            cards["tone"] = "安静、克制、带一点遗憾"
        else:
            cards["tone"] = (session.get("preferences") or {}).get("tone") or "先用强钩子和清晰画面试写"

        if is_western_fantasy and is_transmigration:
            cards["genre_signal"] = "西方玄幻穿越"
            cards["world_rule_hint"] = "异大陆规则必须像现实制度一样运转；地下城是世界的一部分，不是游戏副本"
            if no_game_terms:
                cards["world_rule_hint"] += "；禁用系统面板、玩家、副本奖励等游戏术语"
        elif is_western_fantasy:
            cards["genre_signal"] = "西方玄幻"
            cards["world_rule_hint"] = "圣堂、公会、魔物和地下城规则要制造真实生存代价"
        elif _contains_any(joined, ["修仙", "玄幻", "魔法", "妖", "神"]):
            cards["genre_signal"] = "玄幻 / 奇幻"
            cards["world_rule_hint"] = "世界存在超常规则，但规则要服务下一场戏"
        elif _contains_any(joined, ["城市", "案件", "侦探", "失踪", "录像", "都市"]):
            cards["genre_signal"] = "都市悬疑"
            cards["world_rule_hint"] = "证据、时间和人物动机要互相校验"
        elif _contains_any(joined, ["未来", "AI", "算法", "太空", "赛博"]):
            cards["genre_signal"] = "科幻"
            cards["world_rule_hint"] = "技术规则必须制造选择代价"
        else:
            cards["genre_signal"] = "待从正文里确认"
        cards["genre_constraints"] = list(constraint_profile["active"])

        if is_transmigration:
            cards["protagonist_hint"] = "来自中文语境的小人物进入异大陆，靠认知差和处事方式破局"
        elif _contains_any(joined, ["少女", "女孩", "她"]):
            cards["protagonist_hint"] = "一个被迫在异常现场做选择的女性主角"
        elif _contains_any(joined, ["少年", "男人", "他"]):
            cards["protagonist_hint"] = "一个被过去或真相推着走的男性主角"
        else:
            cards["protagonist_hint"] = "先让主角在行动里出现，不急着贴标签"

        cards["character_web_hint"] = "至少保留一个对手或关系债，让主角不是独自在设定里行动"
        cards["opening_scene_hint"] = "首章场景要有具体地点、可见物件和压力源"
        cards["pov_hint"] = "默认第三人称有限视角；若用户给出强烈自述感，再切换第一人称"

        if _contains_any(joined, ["真相", "秘密", "选择", "救", "复仇", "死", "燃烧", "消失"]):
            cards["central_tension"] = "真相、代价和下一步行动之间的拉扯"
        else:
            cards["central_tension"] = "先用一个异常场景逼出主角行动"

        if cards["genre_signal"] == "西方玄幻穿越":
            cards["conflict_engine_hint"] = "穿越者认知差、地下城生存压力、圣堂/公会权力博弈和身份代价推动章节升级"
        elif cards["genre_signal"] == "西方玄幻":
            cards["conflict_engine_hint"] = "地下城资源、魔物威胁、圣堂秩序和公会利益推动冲突升级"
        elif cards["genre_signal"] == "玄幻 / 奇幻":
            cards["conflict_engine_hint"] = "资源争夺、境界突破和身份反差推动章节升级"
        elif cards["genre_signal"] == "都市悬疑":
            cards["conflict_engine_hint"] = "证据差、时间差和人物动机反转推动追索"
        elif cards["genre_signal"] == "科幻":
            cards["conflict_engine_hint"] = "技术规则、伦理代价和生存压力推动选择"
        else:
            cards["conflict_engine_hint"] = "先用异常、关系和代价形成可持续冲突"
        cards["outline_hint"] = "先生成首章和前三章方向，后续章纲跟随正文持续更新"

        cards["confirmed"] = [
            value
            for value in [
                f"故事种子：{seed}" if seed else "",
                f"调性：{cards['tone']}" if cards["tone"] else "",
                f"类型信号：{cards['genre_signal']}" if cards["genre_signal"] else "",
                f"首章场景：{cards['opening_scene_hint']}",
                f"冲突引擎：{cards['conflict_engine_hint']}",
            ]
            if value
        ]
        cards["open_questions"] = [
            "这段开场的气质是否对？",
            "主角的第一处伤口更像失去、亏欠，还是不甘？",
        ]
        return cards

    def _setting_delta(self, cards: Dict[str, Any]) -> List[str]:
        return [item for item in cards.get("confirmed", [])][:4]

    def _break_soil_story(self, *, seed: str, latest_user: str, cards: Dict[str, Any]) -> str:
        tone = cards.get("tone") or "带钩子的开场"
        tension = cards.get("central_tension") or "异常和选择"
        return (
            f"这一次，我先把“{seed}”写成一个能继续生长的开场。\n\n"
            f"凌晨的风从门缝里挤进来时，主角第一次意识到，自己以为已经结束的事，其实只是换了一种方式回到眼前。"
            f"桌上那样东西安静得不合时宜，像一枚还没有爆开的雷。它不解释来处，也不请求相信，只把一个事实摆在那里："
            f"有人在很久以前替他做过选择，而现在，代价终于轮到他来付。\n\n"
            f"他没有立刻伸手。真正吓人的不是异常本身，而是异常精准地知道他的软处。窗外有人经过，脚步在门口停了一下，又继续往前。"
            f"就在那几秒里，他听见自己心里冒出一个念头：如果现在假装没看见，天亮以后，一切也许还能照旧。\n\n"
            f"可那东西偏偏在这时动了。不是猛烈的动，而是轻轻偏转了一寸，像有人从看不见的地方把故事翻到下一页。"
            f"纸面、屏幕、雨痕或火光，全都指向同一句话：别把真相交给第一个赶来的人。\n\n"
            f"我把这段先写成{tone}的方向，让核心张力落在{tension}上。主角还没有被完整解释，但他已经必须行动；"
            f"世界规则也还没有摊开，但它已经开始制造压力。\n\n"
            f"我会把这段整理成几条故事笔记：人物处境、首章场景、世界规则、冲突推进和章末钩子。"
            f"你不用一次想完，只要回答下一段最关键的问题。"
        )

    def _growth_story(self, *, seed: str, latest_user: str, cards: Dict[str, Any]) -> str:
        return (
            f"我把你刚才补充的感觉往前推一段。\n\n"
            f"主角终于伸手碰到那件东西时，房间里的声音全都低了下去。不是安静，而是像有谁把世界按进水里，"
            f"只剩他的心跳一下一下撞着耳膜。那一瞬间，他看见的不是答案，而是一段本不该属于他的记忆："
            f"有人站在同样的夜色里，说出了和“{seed}”有关的第一句谎话。\n\n"
            f"谎话并不宏大，甚至很轻。轻到当年所有人都愿意相信它，轻到现在追究起来反而显得残忍。"
            f"可故事最锋利的地方就在这里：如果他继续查，就会伤到还活着的人；如果他停下，死去的、失踪的、被抹掉名字的人，"
            f"就只能继续替这座世界保持体面。\n\n"
            f"门外的脚步又回来了。这一次，对方没有经过，而是停在门口，轻轻敲了三下。"
            f"主角把那件东西攥进掌心，终于明白下一章不是解释世界，而是决定先相信谁。"
        )

    def _trace(self, phase: str, *, model_used: bool) -> List[Dict[str, str]]:
        return [
            {"step": "plan", "status": "done", "detail": f"读取 {phase} 阶段和最近对话。"},
            {"step": "draft", "status": "done", "detail": "先生成可读正文，再生成少量确认问题。"},
            {"step": "tool/eval", "status": "done", "detail": "检查问题数量、故事正文和故事笔记更新。"},
            {"step": "observe", "status": "done", "detail": "返回可继续对话的候选回复。"},
            {"step": "model", "status": "done" if model_used else "fallback", "detail": "使用模型回复。" if model_used else "使用本地共写规则回复。"},
        ]
