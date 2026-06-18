from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence


BLOCKING_SEVERITIES = {"blocker", "critical", "high"}
WARNING_SEVERITIES = {"medium", "low", "warning"}
SAFETY_CODES = {"content_safety", "Q01", "Q02"}
PRODUCTION_AGENT_EVAL_GATES = [
    {
        "id": "hard_validators",
        "source": "deterministic_eval",
        "production_gate": True,
        "decision_role": "block_on_hard_failure",
    },
    {
        "id": "narrative_quality_scores",
        "source": "deterministic_eval",
        "production_gate": True,
        "decision_role": "rewrite_or_pass_threshold",
    },
    {
        "id": "content_safety",
        "source": "deterministic_eval",
        "production_gate": True,
        "decision_role": "block_on_safety_failure",
    },
]


def _as_float(value: Any, fallback: Optional[float] = None) -> Optional[float]:
    try:
        if value is None:
            return fallback
        return round(float(value), 4)
    except (TypeError, ValueError):
        return fallback


def _average(values: Sequence[Optional[float]]) -> Optional[float]:
    usable = [value for value in values if value is not None]
    if not usable:
        return None
    return round(sum(usable) / float(len(usable)), 4)


def _issue_code(issue: Dict[str, Any]) -> str:
    return str(issue.get("issue_code") or issue.get("code") or "quality_issue")


def _issue_summary(issue: Dict[str, Any]) -> str:
    return str(issue.get("summary") or issue.get("message") or _issue_code(issue))


def _issue_payload(issue: Dict[str, Any], *, layer: str) -> Dict[str, Any]:
    return {
        "code": _issue_code(issue),
        "severity": str(issue.get("severity") or "warning"),
        "message": _issue_summary(issue),
        "evidence": list(issue.get("evidence") or []),
        "source": str(issue.get("owning_module") or issue.get("source") or "narrative_quality"),
        "layer": layer,
    }


def _synthetic_issue(reason: Any, *, severity: str = "high", layer: str = "realtime_blocker") -> Dict[str, Any]:
    code = str(reason or "quality_issue")
    return {
        "code": code,
        "severity": severity,
        "message": code.replace("_", " "),
        "evidence": [],
        "source": "quality_gate",
        "layer": layer,
    }


def _fix_hint(issue: Dict[str, Any]) -> str:
    code = _issue_code(issue)
    summary = _issue_summary(issue)
    hints = {
        "content_safety": "先处理内容安全风险，再进入发布确认。",
        "Q01": "删除正文里的工程字段、路由、状态名或调试痕迹。",
        "Q02": "把策划说明改写成角色动作、对白和场景反应。",
        "Q03": "压缩重复段落，改用新的动作、信息或情绪推进。",
        "Q04": "补足场面推进，减少解释句，让事件在正文里发生。",
        "Q05": "补动作、对白和可感知细节，让读者看见角色正在做什么。",
        "Q06": "回到角色当前动机，重写不贴合人物状态的台词和行动。",
        "Q07": "补上上一章选择到这一章结果之间的因果桥。",
        "Q08": "把选项改成不同代价，而不是同一选择的不同说法。",
        "Q09": "调整章节节奏和结尾钩子，保留继续阅读的压力。",
        "Q10": "先修复硬性守卫项，再重新运行发布检查。",
    }
    return hints.get(code, summary)


def _dimension_scores(
    *,
    report: Dict[str, Any],
    issues: Sequence[Dict[str, Any]],
    decision: str,
    score: Optional[float],
) -> Dict[str, Optional[float]]:
    raw_scores = dict(report.get("scores") or {})
    overall = _as_float(raw_scores.get("overall_score"), score)
    safety_issue = any(_issue_code(issue) in SAFETY_CODES for issue in issues)
    if safety_issue and decision == "block":
        content_safety = 0.0
    elif safety_issue:
        content_safety = 0.45
    else:
        content_safety = 1.0 if decision != "block" else 0.25
    language_naturalness = _as_float(raw_scores.get("readability"))
    pacing = _as_float(raw_scores.get("pacing"))
    character_consistency = _as_float(raw_scores.get("character_fidelity"))
    causal_continuity = _as_float(raw_scores.get("causal_continuity"))
    hook_quality = _as_float(raw_scores.get("hook_quality"))
    monetize_ready = _as_float(raw_scores.get("monetize_ready"))
    return {
        "content_safety": content_safety,
        "language_naturalness": language_naturalness,
        "pacing": pacing,
        "character_consistency": character_consistency,
        "foreshadowing_continuity": _average([hook_quality, causal_continuity]),
        "timeline_consistency": causal_continuity,
        "release_readiness": _average([monetize_ready, overall]),
        "overall_score": overall,
    }


def compose_quality_gate_result(
    report: Optional[Dict[str, Any]] = None,
    *,
    decision: Optional[str] = None,
    score: Optional[float] = None,
    blocking_reasons: Optional[Sequence[Any]] = None,
    source: str = "local_evaluator",
) -> Dict[str, Any]:
    """Return the full P17 QualityGateResult while preserving legacy fields."""

    if not report and decision is None:
        return {
            "status": "waiting",
            "candidate_status": "candidate",
            "can_commit_canon": False,
            "decision": "pending",
            "overall_score": None,
            "blocking_reasons": ["quality_report_missing"],
            "summary": "等待发布前检查结果。",
            "scores": {
                "content_safety": None,
                "language_naturalness": None,
                "pacing": None,
                "character_consistency": None,
                "foreshadowing_continuity": None,
                "timeline_consistency": None,
                "release_readiness": None,
                "overall_score": None,
            },
            "blockers": [
                _synthetic_issue("quality_report_missing", severity="high", layer="realtime_blocker"),
            ],
            "warnings": [],
            "suggested_fixes": ["先运行发布前检查，再决定是否发布。"],
            "public_safe_message": "这一段还在打磨，阅读体验不会被打断。",
            "studio_debug": {
                "source": source,
                "issue_count": 0,
                "blocking_issue_count": 1,
                "warning_issue_count": 0,
                "shadow_checks": _shadow_checks(),
            },
            "release_decision": "hold",
            "canon_commit_readiness": {
                "ready": False,
                "required_confirmation": True,
                "missing": ["quality_report"],
            },
            "agent_eval_publish_decision": _agent_eval_publish_decision(
                release_decision="hold",
                can_commit=False,
                blocking_codes=["quality_report_missing"],
            ),
        }

    payload = dict(report or {})
    resolved_decision = str(decision or (payload.get("decision") or {}).get("decision") or "rewrite")
    issues = [dict(issue) for issue in list(payload.get("issues") or []) if isinstance(issue, dict)]
    reason_values = [str(item) for item in list(blocking_reasons or []) if item]
    issue_blockers = [
        _issue_payload(issue, layer="realtime_blocker")
        for issue in issues
        if str(issue.get("severity") or "").lower() in BLOCKING_SEVERITIES
    ]
    synthetic_blockers = [
        _synthetic_issue(reason, severity="high", layer="realtime_blocker")
        for reason in reason_values
        if reason not in {_blocker.get("code") for _blocker in issue_blockers}
    ]
    blockers = issue_blockers + synthetic_blockers
    warnings = [
        _issue_payload(issue, layer="warning")
        for issue in issues
        if str(issue.get("severity") or "").lower() in WARNING_SEVERITIES
    ]
    scores = _dimension_scores(
        report=payload,
        issues=issues,
        decision=resolved_decision,
        score=score,
    )
    overall_score = scores.get("overall_score")
    can_commit = resolved_decision == "pass" and not blockers
    release_decision = "pass" if can_commit else ("block" if resolved_decision == "block" or blockers else "rewrite")
    blocking_codes = [str(blocker["code"]) for blocker in blockers]
    if can_commit:
        summary = "质量组合已通过，可等待创作者确认发布。"
    elif blockers:
        summary = "发现 %s 个阻断项，需修复后再发布。" % len(blockers)
    else:
        summary = "建议补写后再进入发布确认。"

    suggested_fixes = []
    for issue in issues:
        hint = _fix_hint(issue)
        if hint not in suggested_fixes:
            suggested_fixes.append(hint)
    if not suggested_fixes and not can_commit:
        suggested_fixes.append("补写后重新运行发布前检查。")

    return {
        "status": "passed" if can_commit else "blocked",
        "candidate_status": "canon_ready" if can_commit else "candidate",
        "can_commit_canon": can_commit,
        "decision": resolved_decision,
        "overall_score": overall_score,
        "blocking_reasons": blocking_codes,
        "summary": summary,
        "scores": scores,
        "blockers": blockers,
        "warnings": warnings,
        "suggested_fixes": suggested_fixes[:5],
        "public_safe_message": "故事状态稳定，可以继续阅读。" if can_commit else "这一段还在打磨，阅读体验不会被打断。",
        "studio_debug": {
            "source": source,
            "raw_decision": resolved_decision,
            "decision_reason": (payload.get("decision") or {}).get("reason"),
            "issue_count": len(issues),
            "blocking_issue_count": len(blockers),
            "warning_issue_count": len(warnings),
            "hard_validator_results": dict(payload.get("hard_validator_results") or {}),
            "shadow_checks": _shadow_checks(),
        },
        "release_decision": release_decision,
        "canon_commit_readiness": {
            "ready": can_commit,
            "required_confirmation": True,
            "missing": [] if can_commit else ["quality_gate_passed"],
        },
        "agent_eval_publish_decision": _agent_eval_publish_decision(
            release_decision=release_decision,
            can_commit=can_commit,
            blocking_codes=blocking_codes,
        ),
    }


def add_commit_confirmation_requirement(gate: Dict[str, Any]) -> Dict[str, Any]:
    next_gate = dict(gate)
    readiness = dict(next_gate.get("canon_commit_readiness") or {})
    missing = list(readiness.get("missing") or [])
    if "operator_confirmation" not in missing:
        missing.append("operator_confirmation")
    readiness.update({"ready": False, "required_confirmation": True, "missing": missing})
    next_gate["canon_commit_readiness"] = readiness
    return next_gate


def _shadow_checks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "learned_evaluator",
            "status": "shadow_only",
            "production_gate": False,
            "reason": "promotion_not_green",
        },
        {
            "id": "learned_reranker",
            "status": "shadow_only",
            "production_gate": False,
            "reason": "promotion_not_green",
        },
    ]


def _agent_eval_publish_decision(
    *,
    release_decision: str,
    can_commit: bool,
    blocking_codes: Sequence[str],
) -> Dict[str, Any]:
    return {
        "contract": "P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY",
        "decision_source": "deterministic_quality_gate",
        "production_publish_allowed": bool(can_commit),
        "release_decision": release_decision,
        "blocking_reasons": list(blocking_codes),
        "eligible_production_gates": [dict(item) for item in PRODUCTION_AGENT_EVAL_GATES],
        "shadow_only_checks": _shadow_checks(),
        "learned_gate_policy": "shadow_until_promotion_workflow_green",
    }
