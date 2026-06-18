from __future__ import annotations

import copy
import json
import re
from datetime import datetime, timezone
from functools import lru_cache
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


def _active_prohibited_replacements(cards: Dict[str, Any]) -> Dict[str, str]:
    replacements: Dict[str, str] = {}
    for constraint in cards.get("genre_constraints", []):
        if not isinstance(constraint, dict):
            continue
        guidance = constraint.get("replacement_guidance", [])
        guidance_list = guidance if isinstance(guidance, list) else []
        for index, term in enumerate(constraint.get("prohibited_terms", [])):
            clean = _clean_text(term, limit=80)
            if not clean or clean in replacements:
                continue
            replacement = _clean_text(guidance_list[index] if index < len(guidance_list) else "", limit=80)
            replacements[clean] = replacement or "世界内表达"
    return replacements


def _sanitize_prohibited_terms(value: Any, cards: Dict[str, Any]) -> Any:
    replacements = _active_prohibited_replacements(cards)
    if not replacements:
        return value

    def sanitize_text(text: str) -> str:
        sanitized = text
        for term, replacement in replacements.items():
            sanitized = sanitized.replace(term, replacement)
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



@lru_cache(maxsize=1)
def _runtime_rules() -> Dict[str, Any]:
    relative = Path("docs/product/rules/genre-runtime-rules.v1.json")
    candidates: List[Path] = []
    here = Path(__file__).resolve()
    candidates.append(Path.cwd() / relative)
    for parent in here.parents:
        candidates.append(parent / relative)
    for candidate in candidates:
        if candidate.exists():
            return json.loads(candidate.read_text(encoding="utf-8"))
    raise RuntimeError("genre_runtime_rules_not_found")


def _runtime_rules_meta() -> Dict[str, Any]:
    rules = _runtime_rules()
    privacy = rules.get("privacy") if isinstance(rules.get("privacy"), dict) else {}
    document_core = rules.get("documentCore") if isinstance(rules.get("documentCore"), dict) else {}
    runtime_contract = (
        document_core.get("runtimeContract")
        if isinstance(document_core.get("runtimeContract"), dict)
        else {}
    )
    return {
        "version": int(rules.get("version") or 0),
        "source": "docs/product/rules/genre-runtime-rules.v1.json",
        "profile_count": len(rules.get("constraintProfiles") or []),
        "kernel_count": len(rules.get("genreKernels") or []),
        "document_core": {
            "policy": _clean_text(document_core.get("policy") or "unknown", limit=80),
            "constraint_application": _clean_text(
                runtime_contract.get("constraintApplication") or "unknown",
                limit=120,
            ),
            "kernel_application": _clean_text(
                runtime_contract.get("kernelApplication") or "unknown",
                limit=120,
            ),
            "no_match_behavior": _clean_text(
                runtime_contract.get("noMatchBehavior") or "unknown",
                limit=120,
            ),
            "quality_boundary": _clean_text(
                runtime_contract.get("qualityBoundary") or "unknown",
                limit=120,
            ),
        },
        "privacy": {
            "representative_works": _clean_text(privacy.get("representativeWorks") or "unknown", limit=80),
            "public_reference_field": _clean_text(privacy.get("publicReferenceField") or "sourceRefs", limit=80),
        },
    }


def _matches_by_group(text: str, profile: Dict[str, Any]) -> Dict[str, List[str]]:
    return {
        "signal_terms": _signal_matches(text, [str(item) for item in profile.get("signalTerms", [])]),
        "entry_mode": _signal_matches(text, [str(item) for item in profile.get("entryModeSignals", [])]),
        "tone": _signal_matches(text, [str(item) for item in profile.get("toneSignals", [])]),
    }


def _profile_has_hits(hits: Dict[str, List[str]]) -> bool:
    return any(bool(value) for value in hits.values())


def _rules_for_profiles(profile_ids: List[str]) -> List[Dict[str, Any]]:
    rules = _runtime_rules()
    profile_order = {profile_id: index for index, profile_id in enumerate(profile_ids)}
    kernels = []
    for kernel in rules.get("genreKernels", []):
        compatible = [str(item) for item in kernel.get("compatibleProfiles", [])]
        if any(profile_id in compatible for profile_id in profile_ids):
            kernels.append(kernel)
    kernels.sort(
        key=lambda kernel: min(
            profile_order.get(str(profile_id), 9999)
            for profile_id in kernel.get("compatibleProfiles", [])
        )
    )
    return kernels


def _profile_activation_score(*, profile_summary: Dict[str, Any], selected_text: str) -> int:
    selected_text = selected_text.lower()
    direct_terms = [
        str(profile_summary.get("id") or ""),
        str(profile_summary.get("display_name") or ""),
    ]
    direct_match = sorted(
        [term for term in direct_terms if term and term.lower() in selected_text],
        key=len,
        reverse=True,
    )
    if direct_match:
        selected_boost = 2000 + len(direct_match[0])
    else:
        signal_terms = [
            str(term)
            for term in ((profile_summary.get("matched_terms") or {}).get("signal_terms") or [])
        ]
        signal_match = sorted(
            [term for term in signal_terms if term and term.lower() in selected_text],
            key=len,
            reverse=True,
        )
        selected_boost = 1000 + len(signal_match[0]) if signal_match else 0
    return selected_boost + int(profile_summary.get("priority") or 0)


def _genre_constraint_profile(*, selected_text: str, user_text: str) -> Dict[str, Any]:
    rules = _runtime_rules()
    active: List[Dict[str, Any]] = []
    active_profile_ids: List[str] = []
    active_profile_summaries: List[Dict[str, Any]] = []
    selected_text = _clean_text(selected_text, limit=2400)
    user_text = _clean_text(user_text, limit=4000)
    signal_text = f"{selected_text} {user_text}"

    for profile in rules.get("constraintProfiles", []):
        selected_hits = _matches_by_group(selected_text, profile)
        user_hits = _matches_by_group(user_text, profile)
        combined_hits = _matches_by_group(signal_text, profile)
        if not _profile_has_hits(combined_hits):
            continue
        profile_id = _clean_text(profile.get("id"), limit=120)
        if not profile_id:
            continue
        active_profile_ids.append(profile_id)
        source_parts: List[str] = []
        if _profile_has_hits(selected_hits):
            source_parts.append("selected_context")
        if _profile_has_hits(user_hits):
            source_parts.append("user_text")
        if not source_parts:
            source_parts.append("inferred_context")
        activation_evidence = {
            "selected_context": selected_hits["signal_terms"] + selected_hits["entry_mode"] + selected_hits["tone"],
            "user_text": user_hits["signal_terms"] + user_hits["entry_mode"] + user_hits["tone"],
            "entry_mode": combined_hits["entry_mode"],
            "tone": combined_hits["tone"],
            "source_refs": [str(item) for item in profile.get("sourceRefs", [])],
        }
        active_profile_summaries.append(
            {
                "id": profile_id,
                "display_name": _clean_text(profile.get("displayName"), limit=120),
                "priority": int(profile.get("priority") or 0),
                "source_refs": [str(item) for item in profile.get("sourceRefs", [])],
                "matched_terms": combined_hits,
            }
        )
        for rule in profile.get("rules", []):
            active.append(
                _genre_constraint(
                    constraint_id=_clean_text(rule.get("id"), limit=160),
                    category=profile_id,
                    applies_when=[str(item) for item in rule.get("appliesWhen", [])],
                    condition={
                        "required": {"profile_id": profile_id},
                        "observed": {
                            "profile_id": profile_id,
                            "display_name": _clean_text(profile.get("displayName"), limit=120),
                            "matched_terms": combined_hits,
                            "source_refs": [str(item) for item in profile.get("sourceRefs", [])],
                        },
                    },
                    rule=_clean_text(rule.get("rule"), limit=800),
                    positive_guidance="；".join(str(item) for item in rule.get("replacementGuidance", [])[:4]),
                    prohibited_terms=[str(item) for item in rule.get("prohibitedTerms", [])],
                    replacement_guidance=[str(item) for item in rule.get("replacementGuidance", [])],
                    source="+".join(source_parts),
                    activation_evidence=activation_evidence,
                    severity=_clean_text(rule.get("severity") or "hard", limit=40) or "hard",
                    user_override="explicit_user_request_only",
                )
            )
    active_profile_summaries.sort(
        key=lambda summary: _profile_activation_score(profile_summary=summary, selected_text=selected_text),
        reverse=True,
    )
    active_profile_ids = [str(summary.get("id")) for summary in active_profile_summaries if summary.get("id")]
    profile_order = {profile_id: index for index, profile_id in enumerate(active_profile_ids)}
    active.sort(key=lambda item: profile_order.get(str(item.get("category")), 9999))
    kernels = _rules_for_profiles(active_profile_ids)
    return {
        "facts": {
            "active_profile_ids": active_profile_ids,
            "active_profiles": active_profile_summaries,
            "active_kernel_ids": [_clean_text(kernel.get("id"), limit=120) for kernel in kernels],
            "active_kernels": [
                {
                    "id": _clean_text(kernel.get("id"), limit=120),
                    "name": _clean_text(kernel.get("name"), limit=120),
                    "category": _clean_text(kernel.get("category"), limit=120),
                    "source_refs": [str(item) for item in kernel.get("sourceRefs", [])],
                    "event_structure": [str(item) for item in kernel.get("eventStructure", [])[:5]],
                    "thesis": _clean_text(kernel.get("thesis"), limit=260),
                }
                for kernel in kernels
            ],
            "activation_order": [
                "selected_topic_template_direction",
                "user_freeform_intent",
                "runtime_rule_json",
            ],
            "runtime_rules": _runtime_rules_meta(),
            "global_prompt_rule": "constraints_and_kernels_resolve_from_shared_runtime_rules",
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
            "genre_kernels": [],
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
                template.get("genre"),
            ]
        )
        inference_text = " ".join(
            str(item or "")
            for item in [
                joined,
                story_direction.get("tone"),
                story_direction.get("keywords"),
                template.get("title"),
            ]
        )
        constraint_profile = _genre_constraint_profile(selected_text=selected_genre_text, user_text=inference_text)
        facts = constraint_profile["facts"]
        active_profiles = facts.get("active_profiles") if isinstance(facts.get("active_profiles"), list) else []
        active_kernels = facts.get("active_kernels") if isinstance(facts.get("active_kernels"), list) else []
        primary_profile = active_profiles[0] if active_profiles and isinstance(active_profiles[0], dict) else {}
        primary_kernel = active_kernels[0] if active_kernels and isinstance(active_kernels[0], dict) else {}
        cards["genre_constraint_facts"] = dict(facts)
        cards["genre_constraints"] = list(constraint_profile["active"])
        cards["genre_kernels"] = active_kernels
        if _contains_any(joined, ["热血", "燃", "冒险", "战斗", "深渊"]):
            cards["tone"] = "高张力、行动感强"
        elif _contains_any(joined, ["怪", "诡", "梦", "失踪", "悬疑"]):
            cards["tone"] = "悬疑、压迫、带异常感"
        elif _contains_any(joined, ["遗憾", "错过", "雨", "孤独", "安静"]):
            cards["tone"] = "安静、克制、带一点遗憾"
        else:
            cards["tone"] = (session.get("preferences") or {}).get("tone") or "先用强钩子和清晰画面试写"

        if primary_profile:
            cards["genre_signal"] = _clean_text(primary_profile.get("display_name"), limit=120)
            if primary_kernel:
                event_structure = primary_kernel.get("event_structure") if isinstance(primary_kernel.get("event_structure"), list) else []
                cards["world_rule_hint"] = _clean_text(primary_kernel.get("thesis"), limit=260) or "类型规则要服务下一场戏"
                if event_structure:
                    cards["outline_hint"] = " -> ".join(str(item) for item in event_structure[:5])
            else:
                active_rules = cards["genre_constraints"]
                cards["world_rule_hint"] = _clean_text(active_rules[0].get("rule") if active_rules else "", limit=260) or "类型规则要服务下一场戏"
        else:
            cards["genre_signal"] = "待从正文里确认"

        if _contains_any(joined, ["少女", "女孩", "她"]):
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

        if primary_kernel:
            event_structure = primary_kernel.get("event_structure") if isinstance(primary_kernel.get("event_structure"), list) else []
            cards["conflict_engine_hint"] = "、".join(str(item) for item in event_structure[:5]) or "类型内核推动冲突升级"
        elif cards["genre_signal"] == "科幻":
            cards["conflict_engine_hint"] = "技术规则、伦理代价和生存压力推动选择"
        else:
            cards["conflict_engine_hint"] = "先用异常、关系和代价形成可持续冲突"
        cards["outline_hint"] = cards.get("outline_hint") or "先生成首章和前三章方向，后续章纲跟随正文持续更新"

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
