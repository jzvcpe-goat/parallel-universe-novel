from __future__ import annotations

import json
import math
import re
from hashlib import sha256
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ..core.linter import lint_chapter_draft
from ..eval.service import evaluate_chapter
from ..models import NarrativeState
from .quality_gate import add_commit_confirmation_requirement, compose_quality_gate_result
from .sessions import ReaderContinueCommand, SessionService


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _idempotency_hash(value: str) -> str:
    return sha256(value.strip().encode("utf-8")).hexdigest()[:16]


def _stable_payload_hash(value: Any) -> str:
    return sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")).hexdigest()[:16]


def _stable_numeric_hash(value: str) -> int:
    return int(sha256(value.encode("utf-8")).hexdigest()[:8], 16)


def _safe_ledger_token(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.:-]", "_", str(value or "unbound"))[:120]


def _stable_reader_run_id(payload: Dict[str, Any]) -> str:
    raw = json.dumps(
        {
            "session_id": payload.get("session_id"),
            "choice_id": payload.get("choice_id"),
            "freeform_intent": payload.get("freeform_intent"),
            "worldline_id": payload.get("worldline_id"),
            "branch_id": payload.get("branch_id"),
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return "reader_run_%s" % sha256(raw.encode("utf-8")).hexdigest()[:16]


def _stable_studio_run_id(payload: Dict[str, Any], report: Optional[Dict[str, Any]] = None) -> str:
    explicit = str(payload.get("source_run_id") or "").strip()
    if explicit:
        return explicit
    report = dict(report or {})
    studio_trace = dict(payload.get("studio_trace") or report.get("studio_trace") or {})
    traced = str(studio_trace.get("source_run_id") or "").strip()
    if traced:
        return traced
    raw = {
        "candidate_id": payload.get("candidate_id") or report.get("chapter_id"),
        "session_id": payload.get("session_id") or report.get("session_id"),
        "world_id": payload.get("world_id"),
        "world_version_id": payload.get("world_version_id") or report.get("world_version_id"),
        "chapter_id": payload.get("chapter_id") or report.get("chapter_id"),
        "target_status": payload.get("target_status"),
    }
    return "studio_run_%s" % _stable_payload_hash(raw)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.5) -> float:
    return max(minimum, min(maximum, value))


def _deterministic_jitter(seed: str, index: int) -> float:
    raw = _stable_numeric_hash("%s:%s" % (seed, index)) % 1000
    return (raw / 1000 - 0.5) * 0.08


def _pressure_tag(intensity: float, previous_intensity: float) -> str:
    if intensity >= 0.95:
        return "burst"
    if previous_intensity > intensity and previous_intensity >= 0.9:
        return "aftermath"
    if intensity >= 0.62:
        return "rising"
    return "calm"


def _runtime_rules_path() -> Path:
    relative = Path("docs/product/rules/genre-runtime-rules.v1.json")
    candidates = [Path.cwd() / relative]
    here = Path(__file__).resolve()
    candidates.extend(parent / relative for parent in here.parents)
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise RuntimeError("genre_runtime_rules_not_found")


@lru_cache(maxsize=1)
def _runtime_rules() -> Dict[str, Any]:
    return json.loads(_runtime_rules_path().read_text(encoding="utf-8"))


def _select_time_engine_kernel(payload: Dict[str, Any]) -> Dict[str, Any]:
    rules = _runtime_rules()
    kernels = list(rules.get("genreKernels") or [])
    kernel_id = str(payload.get("kernel_id") or payload.get("kernelId") or "").strip()
    if kernel_id:
        for kernel in kernels:
            if str(kernel.get("id") or "") == kernel_id:
                return dict(kernel)
    profile_ids = [str(item) for item in payload.get("active_profile_ids") or payload.get("profile_ids") or []]
    for profile_id in profile_ids:
        for kernel in kernels:
            if profile_id in [str(item) for item in kernel.get("compatibleProfiles", [])]:
                return dict(kernel)
    return dict(kernels[0] if kernels else {})


def _time_engine_controls(kernel: Dict[str, Any]) -> Dict[str, float]:
    controls = dict(kernel.get("timeControls") or {})
    return {
        "baseRate": float(controls.get("baseRate", 0.32)),
        "burst": float(controls.get("burst", 0.28)),
        "decay": float(controls.get("decay", 0.52)),
        "foreshadowPressure": float(controls.get("foreshadowPressure", 0.44)),
        "recoveryFloor": float(controls.get("recoveryFloor", 0.14)),
        "maxOpenLoops": float(controls.get("maxOpenLoops", 3)),
    }


def _simulate_time_engine_events(*, kernel: Dict[str, Any], beats: List[str], seed: str) -> List[Dict[str, Any]]:
    controls = _time_engine_controls(kernel)
    safe_beats = [str(item).strip() for item in beats if str(item).strip()] or [
        "异常出现",
        "选择压力",
        "代价回响",
    ]
    selected_beats = safe_beats[: max(3, min(6, len(safe_beats)))]
    max_open_loops = max(1.0, controls["maxOpenLoops"])
    recovery_floor = controls["recoveryFloor"]
    previous_intensity = controls["baseRate"]
    events: List[Dict[str, Any]] = []
    denominator = max(1, len(safe_beats) - 1)
    for index, label in enumerate(selected_beats):
        phase = 1.0 if len(safe_beats) <= 1 else index / denominator
        phase_curve = 0.68 + math.sin(phase * math.pi) * 0.42
        hawkes_boost = (
            0.0
            if index == 0
            else controls["burst"] * math.exp(-controls["decay"] * (index - 1)) * _clamp(previous_intensity, 0.1, 1)
        )
        open_loop_pressure = min(max_open_loops, index + 1) / max_open_loops
        foreshadow_pressure = _clamp(
            controls["foreshadowPressure"] * (0.72 + open_loop_pressure * 0.36) + _deterministic_jitter(seed, index),
            recovery_floor,
            1.2,
        )
        intensity = _clamp(
            controls["baseRate"] * phase_curve + hawkes_boost + foreshadow_pressure * 0.22,
            recovery_floor,
            1.35,
        )
        event = {
            "id": "time_event_%s" % (index + 1),
            "label": label,
            "order": index + 1,
            "time": round((index + 1) * 1.618 + _deterministic_jitter(seed, index + 11), 3),
            "baseIntensity": round(controls["baseRate"] * phase_curve, 3),
            "hawkesBoost": round(hawkes_boost, 3),
            "intensity": round(intensity, 3),
            "foreshadowPressure": round(foreshadow_pressure, 3),
            "pressureTag": _pressure_tag(intensity, previous_intensity),
            "source": "time_engine",
            "state": "candidate",
        }
        previous_intensity = intensity
        events.append(event)
    return events


def _build_studio_trace(
    *,
    payload: Dict[str, Any],
    report: Dict[str, Any],
    gate: Dict[str, Any],
    stage: str,
    idempotency_key_hash: Optional[str] = None,
    commit_id: Optional[str] = None,
) -> Dict[str, Any]:
    source_run_id = _stable_studio_run_id(payload, report)
    incoming_trace = dict(payload.get("studio_trace") or report.get("studio_trace") or {})
    report_for_hash = dict(report)
    report_for_hash.pop("studio_trace", None)
    quality_report_hash = str(incoming_trace.get("quality_report_hash") or "").strip() or "qhash_%s" % _stable_payload_hash(report_for_hash)
    trace_seed = {
        "source_run_id": source_run_id,
        "candidate_id": payload.get("candidate_id") or report.get("chapter_id"),
        "session_id": payload.get("session_id") or report.get("session_id"),
        "world_id": payload.get("world_id"),
        "world_version_id": payload.get("world_version_id") or report.get("world_version_id"),
        "quality_report_hash": quality_report_hash,
    }
    steps = [
        {
            "step": "quality/evaluate",
            "status": "done",
            "source_run_id": source_run_id,
            "quality_report_hash": quality_report_hash,
        },
        {
            "step": "operator/confirm",
            "status": "done" if stage == "committed" else "waiting",
            "source_run_id": source_run_id,
        },
        {
            "step": "canon/commit",
            "status": "done" if stage == "committed" else "waiting",
            "source_run_id": source_run_id,
            "commit_id": commit_id,
        },
    ]
    return {
        "trace_id": "studio_trace_%s" % _stable_payload_hash(trace_seed),
        "source_run_id": source_run_id,
        "project_id": payload.get("project_id") or dict(payload.get("studio_trace") or {}).get("project_id"),
        "session_id": payload.get("session_id") or report.get("session_id"),
        "world_id": payload.get("world_id"),
        "world_version_id": payload.get("world_version_id") or report.get("world_version_id"),
        "candidate_id": payload.get("candidate_id") or report.get("chapter_id"),
        "chapter_id": payload.get("chapter_id") or report.get("chapter_id"),
        "quality_report_hash": quality_report_hash,
        "quality_gate_status": gate.get("status"),
        "quality_gate_decision": gate.get("release_decision") or gate.get("decision"),
        "write_scope": "canon_ledger_only" if stage == "committed" else "evaluation_only",
        "idempotency_key_hash": idempotency_key_hash,
        "commit_id": commit_id,
        "steps": steps,
        "next_required": [] if stage == "committed" else ["operator_confirmation", "idempotency_key"],
    }


def _added_items(before: List[Any], after: List[Any]) -> List[Any]:
    before_keys = {json.dumps(item, ensure_ascii=False, sort_keys=True) for item in before}
    return [
        item
        for item in after
        if json.dumps(item, ensure_ascii=False, sort_keys=True) not in before_keys
    ]


def _relationship_key(edge: Dict[str, Any]) -> str:
    return "%s->%s" % (edge.get("source") or "", edge.get("target") or "")


def _changed_relationship_edges(before: List[Dict[str, Any]], after: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    before_by_key = {_relationship_key(edge): edge for edge in before}
    changes: List[Dict[str, Any]] = []
    for edge in after:
        key = _relationship_key(edge)
        previous = before_by_key.get(key)
        if previous != edge:
            changes.append(edge)
    return changes


def _world_instance_patch_candidate(
    *,
    step: Any,
    source_run_id: str,
    worldline_id: str,
    branch_id: str,
    choice_id: str,
    chapter_id: str,
) -> Dict[str, Any]:
    before = step.state_before.to_dict()
    after = step.state_after.to_dict()
    fact_additions = _added_items(list(before.get("world_facts") or []), list(after.get("world_facts") or []))
    promise_additions = _added_items(list(before.get("open_promises") or []), list(after.get("open_promises") or []))
    route_additions = _added_items(list(before.get("route_fingerprint") or []), list(after.get("route_fingerprint") or []))
    before_edges = list(before.get("relationship_graph") or [])
    after_edges = list(after.get("relationship_graph") or [])
    changed_edges = _changed_relationship_edges(before_edges, after_edges)
    state_refs = [
        ref
        for ref, changed in [
            ("world_facts", bool(fact_additions)),
            ("open_promises", bool(promise_additions)),
            ("relationship_graph", bool(changed_edges) or bool(after_edges)),
            ("route_fingerprint", bool(route_additions)),
        ]
        if changed
    ]
    return {
        "status": "candidate",
        "write_scope": "world_instance_patch_candidate_only",
        "source_run_id": source_run_id,
        "worldline_id": worldline_id,
        "branch_id": branch_id,
        "choice_id": choice_id,
        "chapter_id": chapter_id,
        "state_refs": state_refs,
        "patch": {
            "world_facts_added": fact_additions[:8],
            "open_promises_added": promise_additions[:8],
            "relationship_edges_changed": changed_edges[:8],
            "route_fingerprint_added": route_additions[:8],
        },
        "snapshot_summary": {
            "world_fact_count": len(list(after.get("world_facts") or [])),
            "open_promise_count": len(list(after.get("open_promises") or [])),
            "relationship_edge_count": len(after_edges),
            "route_fingerprint_count": len(list(after.get("route_fingerprint") or [])),
            "chapter_index": int(after.get("chapter_index") or 0),
            "story_phase": after.get("story_phase"),
        },
        "rollback_plan": {
            "status": "available_before_public_publish",
            "method": "discard_world_instance_patch_candidate",
            "chapter_id": chapter_id,
        },
    }


def _fallback_state(*, world_id: str = "unbound_world") -> NarrativeState:
    return NarrativeState.from_dict(
        {
            "state_id": "quality_eval_state",
            "world_id": world_id,
            "turn_index": 0,
            "story_phase": "candidate_review",
            "chapter_index": 0,
            "min_end_turn": 8,
            "fate_pressure": 0.0,
            "karmic_weather": {},
            "unresolved_debts": [],
            "world_facts": [],
            "timeline": [],
            "characters": {},
            "relationship_graph": [],
            "open_promises": [],
            "tension": 0.5,
            "themes": {},
            "player_intent": {},
            "recent_scene_functions": [],
            "visited_event_ids": [],
            "route_fingerprint": [],
            "rating_ceiling": "PG13",
            "metadata": {"source": "quality_evaluate_request"},
        }
    )


class ProductRuntimeService:
    """Service-level contracts for the commercial prototype's second-stage runtime.

    The methods intentionally reuse the existing reader session, linter, evaluator,
    and repository surfaces. They expose production-shaped contracts without
    pretending learned gates or canon persistence are fully productized yet.
    """

    def __init__(
        self,
        repository: Any,
        *,
        session_service: Optional[SessionService] = None,
        canon_ledger_dir: Optional[Path] = None,
        time_engine_ledger_dir: Optional[Path] = None,
        branch_publish_ledger_dir: Optional[Path] = None,
    ) -> None:
        self.repository = repository
        self.session_service = session_service
        self.canon_ledger_dir = Path(canon_ledger_dir or Path.cwd() / "artifacts" / "canon_commit_ledger")
        self.time_engine_ledger_dir = Path(time_engine_ledger_dir or Path.cwd() / "artifacts" / "time_engine_ledger")
        self.branch_publish_ledger_dir = Path(
            branch_publish_ledger_dir or Path.cwd() / "artifacts" / "branch_publish_ledger"
        )

    def _time_engine_latest_path(self, worldline_id: str) -> Path:
        return self.time_engine_ledger_dir / ("latest_%s.json" % _safe_ledger_token(worldline_id))

    def _time_engine_record_path(self, time_engine_run_id: str) -> Path:
        return self.time_engine_ledger_dir / ("%s.json" % _safe_ledger_token(time_engine_run_id))

    def _latest_time_engine_record(self, worldline_id: str) -> Optional[Dict[str, Any]]:
        latest_path = self._time_engine_latest_path(worldline_id)
        if not latest_path.exists():
            return None
        return json.loads(latest_path.read_text(encoding="utf-8"))

    def _branch_publish_latest_path(self, worldline_id: str) -> Path:
        return self.branch_publish_ledger_dir / ("latest_%s.json" % _safe_ledger_token(worldline_id))

    def _branch_publish_record_path(self, branch_publish_candidate_id: str) -> Path:
        return self.branch_publish_ledger_dir / ("%s.json" % _safe_ledger_token(branch_publish_candidate_id))

    def _latest_branch_publish_record(self, worldline_id: str) -> Optional[Dict[str, Any]]:
        latest_path = self._branch_publish_latest_path(worldline_id)
        if not latest_path.exists():
            return None
        return json.loads(latest_path.read_text(encoding="utf-8"))

    def _branch_authorization_dir(self) -> Path:
        return self.branch_publish_ledger_dir / "authorization"

    def _branch_authorization_latest_path(self, worldline_id: str) -> Path:
        return self._branch_authorization_dir() / ("latest_%s.json" % _safe_ledger_token(worldline_id))

    def _branch_authorization_record_path(self, authorization_id: str) -> Path:
        return self._branch_authorization_dir() / ("%s.json" % _safe_ledger_token(authorization_id))

    def _latest_branch_authorization_record(self, worldline_id: str) -> Optional[Dict[str, Any]]:
        latest_path = self._branch_authorization_latest_path(worldline_id)
        if not latest_path.exists():
            return None
        return json.loads(latest_path.read_text(encoding="utf-8"))

    def _branch_commit_draft_dir(self) -> Path:
        return self.branch_publish_ledger_dir / "commit_draft"

    def _branch_commit_draft_latest_path(self, worldline_id: str) -> Path:
        return self._branch_commit_draft_dir() / ("latest_%s.json" % _safe_ledger_token(worldline_id))

    def _branch_commit_draft_record_path(self, commit_draft_id: str) -> Path:
        return self._branch_commit_draft_dir() / ("%s.json" % _safe_ledger_token(commit_draft_id))

    def _latest_branch_commit_draft_record(self, worldline_id: str) -> Optional[Dict[str, Any]]:
        latest_path = self._branch_commit_draft_latest_path(worldline_id)
        if not latest_path.exists():
            return None
        return json.loads(latest_path.read_text(encoding="utf-8"))

    def plan_time_events(self, *, worldline_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        kernel = _select_time_engine_kernel(payload)
        kernel_id = str(kernel.get("id") or "kernel-general")
        beats = [
            str(item).strip()
            for item in (payload.get("beat_plan") or payload.get("beats") or kernel.get("eventStructure") or [])
            if str(item).strip()
        ]
        source_run_id = str(payload.get("source_run_id") or payload.get("run_id") or "").strip()
        if not source_run_id:
            source_run_id = "time_run_%s" % _stable_payload_hash(
                {
                    "worldline_id": worldline_id,
                    "kernel_id": kernel_id,
                    "beat_plan": beats,
                }
            )
        seed = "%s:%s:%s" % (worldline_id, source_run_id, kernel_id)
        time_engine_run_id = "time_engine_%s" % _stable_payload_hash(
            {
                "worldline_id": worldline_id,
                "source_run_id": source_run_id,
                "kernel_id": kernel_id,
                "beat_plan": beats,
            }
        )
        self.time_engine_ledger_dir.mkdir(parents=True, exist_ok=True)
        record_path = self._time_engine_record_path(time_engine_run_id)
        latest_path = self._time_engine_latest_path(worldline_id)
        if record_path.exists():
            replay = json.loads(record_path.read_text(encoding="utf-8"))
            replay["idempotent_replay"] = True
            replay["ledger_path"] = str(record_path)
            replay["latest_path"] = str(latest_path)
            latest_path.write_text(json.dumps(replay, ensure_ascii=False, indent=2), encoding="utf-8")
            return replay

        events = _simulate_time_engine_events(kernel=kernel, beats=beats, seed=seed)
        accepted = [
            {
                "id": event["id"],
                "label": event["label"],
                "order": event["order"],
                "intensity": event["intensity"],
                "pressureTag": event["pressureTag"],
            }
            for event in events
        ]
        record = {
            "status": "candidate",
            "capability_mode": "durable_service_contract",
            "write_scope": "time_event_candidate_ledger_only",
            "time_engine_run_id": time_engine_run_id,
            "source_run_id": source_run_id,
            "worldline_id": worldline_id,
            "session_id": worldline_id,
            "world_id": session.world_id,
            "world_version_id": str(session.metadata.get("world_version_id") or ""),
            "kernel_id": kernel_id,
            "kernel_category": str(kernel.get("category") or ""),
            "beat_plan": beats,
            "input_hash": "tehash_%s" % _stable_payload_hash(
                {
                    "worldline_id": worldline_id,
                    "source_run_id": source_run_id,
                    "kernel_id": kernel_id,
                    "beat_plan": beats,
                    "timeControls": kernel.get("timeControls"),
                }
            ),
            "candidate_events": events,
            "time_consistency_report": {
                "id": "time_consistency_%s" % _stable_payload_hash({"run": time_engine_run_id, "events": accepted}),
                "runId": source_run_id,
                "status": "pass",
                "acceptedTimeEvents": accepted,
                "timelineConflicts": [],
                "requiredRepair": [],
            },
            "density_summary": {
                "mode": "fastapi_durable_time_engine",
                "event_count": len(events),
                "burst_count": sum(1 for event in events if event["pressureTag"] == "burst"),
                "aftershock_count": sum(1 for event in events if event["hawkesBoost"] > 0),
                "max_intensity": max([float(event["intensity"]) for event in events] or [0.0]),
            },
            "rollback_plan": {
                "status": "available_before_public_publish",
                "method": "delete_time_event_candidate_ledger_record",
                "time_engine_run_id": time_engine_run_id,
            },
            "created_at": _utcnow(),
            "idempotent_replay": False,
        }
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        record["ledger_path"] = str(record_path)
        record["latest_path"] = str(latest_path)
        latest_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        return record

    def time_engine_snapshot(self, *, worldline_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        latest = self._latest_time_engine_record(worldline_id)
        if latest is None:
            return {
                "status": "waiting",
                "capability_mode": "durable_service_contract",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "candidate_events": [],
                "density_summary": {
                    "mode": "fastapi_durable_time_engine",
                    "event_count": 0,
                    "service_note": "No TimeEngine candidate ledger has been generated for this worldline yet.",
                },
            }
        latest["ledger_path"] = str(self._time_engine_record_path(str(latest.get("time_engine_run_id") or "")))
        latest["latest_path"] = str(self._time_engine_latest_path(worldline_id))
        return latest

    def publish_branch_candidate(
        self,
        *,
        worldline_id: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        key = str(idempotency_key or payload.get("idempotency_key") or "").strip()
        if not key:
            return {
                "status": "blocked",
                "reason": "idempotency_key_required",
                "capability_mode": "branch_publish_candidate_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        route_choices = self.repository.list_route_choices(session_id=worldline_id)
        if not route_choices:
            return {
                "status": "blocked",
                "reason": "route_choice_required",
                "capability_mode": "branch_publish_candidate_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        route_choice_event_id = str(payload.get("route_choice_event_id") or "").strip()
        selected_choice = None
        if route_choice_event_id:
            selected_choice = next(
                (choice for choice in route_choices if str(choice.get("choice_event_id")) == route_choice_event_id),
                None,
            )
        selected_choice = selected_choice or route_choices[-1]
        route_payload = dict(selected_choice.get("payload") or {})
        time_engine_record = self._latest_time_engine_record(worldline_id)
        if time_engine_record is None:
            return {
                "status": "blocked",
                "reason": "time_engine_candidate_required",
                "capability_mode": "branch_publish_candidate_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "route_choice_event_id": selected_choice.get("choice_event_id"),
            }
        source_run_id = str(
            payload.get("source_run_id")
            or route_payload.get("source_run_id")
            or time_engine_record.get("source_run_id")
            or ""
        ).strip()
        branch_id = str(
            payload.get("branch_id") or route_payload.get("branch_id") or payload.get("worldline_id") or worldline_id
        ).strip()
        key_hash = _idempotency_hash(key)
        branch_publish_candidate_id = "branch_publish_%s" % _stable_payload_hash(
            {
                "idempotency_key_hash": key_hash,
                "worldline_id": worldline_id,
                "branch_id": branch_id,
                "route_choice_event_id": selected_choice.get("choice_event_id"),
                "time_engine_run_id": time_engine_record.get("time_engine_run_id"),
            }
        )
        self.branch_publish_ledger_dir.mkdir(parents=True, exist_ok=True)
        record_path = self._branch_publish_record_path(branch_publish_candidate_id)
        latest_path = self._branch_publish_latest_path(worldline_id)
        if record_path.exists():
            replay = json.loads(record_path.read_text(encoding="utf-8"))
            replay["ledger_path"] = str(record_path)
            replay["latest_path"] = str(latest_path)
            replay["idempotent_replay"] = True
            latest_path.write_text(json.dumps(replay, ensure_ascii=False, indent=2), encoding="utf-8")
            return replay

        time_events = list(time_engine_record.get("candidate_events") or [])
        world_instance_patch = dict(route_payload.get("world_instance_patch_candidate") or {})
        record = {
            "status": "candidate",
            "capability_mode": "branch_publish_candidate_gate",
            "write_scope": "branch_publish_candidate_ledger_only",
            "branch_publish_candidate_id": branch_publish_candidate_id,
            "worldline_id": worldline_id,
            "session_id": worldline_id,
            "world_id": session.world_id,
            "branch_id": branch_id,
            "source_run_id": source_run_id,
            "route_choice_event_id": selected_choice.get("choice_event_id"),
            "choice_id": selected_choice.get("choice_id"),
            "chapter_id": selected_choice.get("chapter_id"),
            "time_engine_run_id": time_engine_record.get("time_engine_run_id"),
            "consumed_time_event_ids": [str(event.get("id")) for event in time_events if event.get("id")],
            "consumed_time_density_summary": dict(time_engine_record.get("density_summary") or {}),
            "world_instance_patch_candidate": world_instance_patch,
            "transaction_plan": {
                "status": "future_gate",
                "required_before_public_publish": [
                    "database_transaction_rollback_fixture",
                    "quality_gate_for_branch_publish",
                    "production_operator_authorization",
                ],
            },
            "rollback_plan": {
                "status": "available_before_public_publish",
                "method": "delete_branch_publish_candidate_ledger_record",
                "branch_publish_candidate_id": branch_publish_candidate_id,
            },
            "idempotency_key_hash": key_hash,
            "idempotent_replay": False,
            "created_at": _utcnow(),
        }
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        record["ledger_path"] = str(record_path)
        record["latest_path"] = str(latest_path)
        latest_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        return record

    def branch_publish_snapshot(self, *, worldline_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        latest = self._latest_branch_publish_record(worldline_id)
        if latest is None:
            return {
                "status": "waiting",
                "capability_mode": "branch_publish_candidate_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "service_note": "No branch publish candidate ledger has been generated for this worldline yet.",
            }
        latest["ledger_path"] = str(self._branch_publish_record_path(str(latest.get("branch_publish_candidate_id") or "")))
        latest["latest_path"] = str(self._branch_publish_latest_path(worldline_id))
        return latest

    def _branch_publish_authorization_quality_gate(self, record: Dict[str, Any]) -> Dict[str, Any]:
        time_event_ids = [str(item) for item in list(record.get("consumed_time_event_ids") or []) if str(item)]
        patch = dict(record.get("world_instance_patch_candidate") or {})
        checks = [
            {
                "id": "branch_publish_candidate_status",
                "passed": record.get("status") == "candidate",
            },
            {
                "id": "candidate_write_scope",
                "passed": record.get("write_scope") == "branch_publish_candidate_ledger_only",
            },
            {
                "id": "time_engine_events_consumed",
                "passed": bool(time_event_ids),
            },
            {
                "id": "world_instance_patch_candidate_present",
                "passed": patch.get("write_scope") == "world_instance_patch_candidate_only",
            },
        ]
        passed = all(bool(item["passed"]) for item in checks)
        return {
            "status": "pass" if passed else "blocked",
            "can_authorize_branch_publish": passed,
            "checks": checks,
            "blocking_reasons": [item["id"] for item in checks if not item["passed"]],
        }

    def verify_branch_publish_transaction_rollback(
        self,
        *,
        worldline_id: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        key = str(idempotency_key or payload.get("idempotency_key") or "").strip()
        if not key:
            return {
                "status": "blocked",
                "reason": "idempotency_key_required",
                "capability_mode": "database_transaction_rollback_fixture",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        branch_publish_record = self._latest_branch_publish_record(worldline_id)
        if branch_publish_record is None:
            return {
                "status": "blocked",
                "reason": "branch_publish_candidate_required",
                "capability_mode": "database_transaction_rollback_fixture",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        requested_candidate_id = str(payload.get("branch_publish_candidate_id") or "").strip()
        branch_publish_candidate_id = str(branch_publish_record.get("branch_publish_candidate_id") or "")
        if requested_candidate_id and requested_candidate_id != branch_publish_candidate_id:
            return {
                "status": "blocked",
                "reason": "branch_publish_candidate_mismatch",
                "capability_mode": "database_transaction_rollback_fixture",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
            }
        key_hash = _idempotency_hash(key)
        transaction_probe_id = "rollback_probe_%s" % _stable_payload_hash(
            {
                "idempotency_key_hash": key_hash,
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
            }
        )
        proof = self.repository.prove_analytics_event_transaction_rollback(
            {
                "event_name": "branch_publish_transaction_fixture",
                "reader_id": dict(session.player_profile or {}).get("reader_id"),
                "session_id": worldline_id,
                "world_version_id": str(session.metadata.get("world_version_id") or ""),
                "payload_json": {
                    "transaction_probe_id": transaction_probe_id,
                    "branch_publish_candidate_id": branch_publish_candidate_id,
                    "worldline_id": worldline_id,
                    "time_engine_run_id": branch_publish_record.get("time_engine_run_id"),
                    "route_choice_event_id": branch_publish_record.get("route_choice_event_id"),
                    "idempotency_key_hash": key_hash,
                    "scope": "rollback_fixture_only",
                },
            }
        )
        rollback_verified = bool(proof.get("rollback_verified"))
        return {
            "status": "verified" if rollback_verified else "failed",
            "capability_mode": "database_transaction_rollback_fixture",
            "write_scope": "rollback_fixture_only",
            "worldline_id": worldline_id,
            "session_id": worldline_id,
            "world_id": session.world_id,
            "branch_publish_candidate_id": branch_publish_candidate_id,
            "transaction_probe_id": transaction_probe_id,
            "idempotency_key_hash": key_hash,
            "insert_visible_before_rollback": bool(proof.get("insert_visible_before_rollback")),
            "persisted_after_rollback": bool(proof.get("persisted_after_rollback")),
            "rollback_verified": rollback_verified,
            "tables_checked": list(proof.get("tables_checked") or []),
            "probe_event_id": proof.get("probe_event_id"),
            "before_count": proof.get("before_count"),
            "after_count": proof.get("after_count"),
            "production_public_publish": False,
            "branch_publish_record_write_scope": str(branch_publish_record.get("write_scope") or ""),
            "created_at": _utcnow(),
        }

    def authorize_branch_publish_candidate(
        self,
        *,
        worldline_id: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        key = str(idempotency_key or payload.get("idempotency_key") or "").strip()
        if not key:
            return {
                "status": "blocked",
                "reason": "idempotency_key_required",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        branch_publish_record = self._latest_branch_publish_record(worldline_id)
        if branch_publish_record is None:
            return {
                "status": "blocked",
                "reason": "branch_publish_candidate_required",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        requested_candidate_id = str(payload.get("branch_publish_candidate_id") or "").strip()
        branch_publish_candidate_id = str(branch_publish_record.get("branch_publish_candidate_id") or "")
        if requested_candidate_id and requested_candidate_id != branch_publish_candidate_id:
            return {
                "status": "blocked",
                "reason": "branch_publish_candidate_mismatch",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
            }
        operator_id = str(payload.get("operator_id") or "").strip()
        if not operator_id:
            return {
                "status": "blocked",
                "reason": "operator_id_required",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
            }
        if payload.get("confirmed") is not True:
            return {
                "status": "blocked",
                "reason": "operator_confirmation_required",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
                "operator_id": operator_id,
            }

        quality_gate = self._branch_publish_authorization_quality_gate(branch_publish_record)
        if not quality_gate["can_authorize_branch_publish"]:
            return {
                "status": "blocked",
                "reason": "quality_gate_blocked",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
                "operator_id": operator_id,
                "quality_gate": quality_gate,
            }

        key_hash = _idempotency_hash(key)
        authorization_id = "branch_authorization_%s" % _stable_payload_hash(
            {
                "idempotency_key_hash": key_hash,
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
                "operator_id": operator_id,
            }
        )
        self._branch_authorization_dir().mkdir(parents=True, exist_ok=True)
        record_path = self._branch_authorization_record_path(authorization_id)
        latest_path = self._branch_authorization_latest_path(worldline_id)
        if record_path.exists():
            replay = json.loads(record_path.read_text(encoding="utf-8"))
            replay["ledger_path"] = str(record_path)
            replay["latest_path"] = str(latest_path)
            replay["idempotent_replay"] = True
            latest_path.write_text(json.dumps(replay, ensure_ascii=False, indent=2), encoding="utf-8")
            return replay

        rollback_proof = self.repository.prove_analytics_event_transaction_rollback(
            {
                "event_name": "branch_publish_authorization_transaction_fixture",
                "reader_id": dict(session.player_profile or {}).get("reader_id"),
                "session_id": worldline_id,
                "world_version_id": str(session.metadata.get("world_version_id") or ""),
                "payload_json": {
                    "authorization_id": authorization_id,
                    "branch_publish_candidate_id": branch_publish_candidate_id,
                    "worldline_id": worldline_id,
                    "operator_id": operator_id,
                    "idempotency_key_hash": key_hash,
                    "scope": "authorization_gate_only",
                },
            }
        )
        rollback_verified = bool(rollback_proof.get("rollback_verified"))
        if not rollback_verified:
            return {
                "status": "blocked",
                "reason": "rollback_fixture_failed",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_candidate_id,
                "operator_id": operator_id,
                "quality_gate": quality_gate,
            }

        record = {
            "status": "authorized_candidate",
            "capability_mode": "branch_publish_authorization_gate",
            "write_scope": "branch_publish_authorization_ledger_only",
            "authorization_id": authorization_id,
            "worldline_id": worldline_id,
            "session_id": worldline_id,
            "world_id": session.world_id,
            "branch_publish_candidate_id": branch_publish_candidate_id,
            "operator_id": operator_id,
            "operator_confirmation": "confirmed",
            "quality_gate": quality_gate,
            "rollback_fixture": {
                "capability_mode": "database_transaction_rollback_fixture",
                "write_scope": "rollback_fixture_only",
                "rollback_verified": True,
                "insert_visible_before_rollback": bool(rollback_proof.get("insert_visible_before_rollback")),
                "persisted_after_rollback": bool(rollback_proof.get("persisted_after_rollback")),
                "tables_checked": list(rollback_proof.get("tables_checked") or []),
            },
            "required_before_public_publish": [
                "durable_multi_table_world_instance_branch_commit",
                "production_release_owner_approval",
                "remote_live_runtime_trace",
            ],
            "production_public_publish": False,
            "idempotency_key_hash": key_hash,
            "idempotent_replay": False,
            "created_at": _utcnow(),
        }
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        record["ledger_path"] = str(record_path)
        record["latest_path"] = str(latest_path)
        latest_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        return record

    def branch_publish_authorization_snapshot(self, *, worldline_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        latest = self._latest_branch_authorization_record(worldline_id)
        if latest is None:
            return {
                "status": "waiting",
                "capability_mode": "branch_publish_authorization_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "service_note": "No branch publish authorization ledger has been generated for this worldline yet.",
            }
        latest["ledger_path"] = str(self._branch_authorization_record_path(str(latest.get("authorization_id") or "")))
        latest["latest_path"] = str(self._branch_authorization_latest_path(worldline_id))
        return latest

    def draft_branch_commit(
        self,
        *,
        worldline_id: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        key = str(idempotency_key or payload.get("idempotency_key") or "").strip()
        if not key:
            return {
                "status": "blocked",
                "reason": "idempotency_key_required",
                "capability_mode": "branch_commit_draft_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        branch_publish_record = self._latest_branch_publish_record(worldline_id)
        if branch_publish_record is None:
            return {
                "status": "blocked",
                "reason": "branch_publish_candidate_required",
                "capability_mode": "branch_commit_draft_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        authorization_record = self._latest_branch_authorization_record(worldline_id)
        if authorization_record is None:
            return {
                "status": "blocked",
                "reason": "branch_publish_authorization_required",
                "capability_mode": "branch_commit_draft_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_publish_candidate_id": branch_publish_record.get("branch_publish_candidate_id"),
            }
        requested_authorization_id = str(payload.get("authorization_id") or "").strip()
        authorization_id = str(authorization_record.get("authorization_id") or "")
        if requested_authorization_id and requested_authorization_id != authorization_id:
            return {
                "status": "blocked",
                "reason": "authorization_mismatch",
                "capability_mode": "branch_commit_draft_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "authorization_id": authorization_id,
            }
        key_hash = _idempotency_hash(key)
        commit_draft_id = "branch_commit_draft_%s" % _stable_payload_hash(
            {
                "idempotency_key_hash": key_hash,
                "worldline_id": worldline_id,
                "authorization_id": authorization_id,
                "branch_publish_candidate_id": branch_publish_record.get("branch_publish_candidate_id"),
            }
        )
        self._branch_commit_draft_dir().mkdir(parents=True, exist_ok=True)
        record_path = self._branch_commit_draft_record_path(commit_draft_id)
        latest_path = self._branch_commit_draft_latest_path(worldline_id)
        if record_path.exists():
            replay = json.loads(record_path.read_text(encoding="utf-8"))
            replay["ledger_path"] = str(record_path)
            replay["latest_path"] = str(latest_path)
            replay["idempotent_replay"] = True
            latest_path.write_text(json.dumps(replay, ensure_ascii=False, indent=2), encoding="utf-8")
            return replay

        chapter_id = str(branch_publish_record.get("chapter_id") or "")
        proof = self.repository.prove_branch_commit_multitable_transaction_rollback(
            {
                "session_id": worldline_id,
                "chapter_id": chapter_id,
                "event_name": "branch_commit_draft_transaction_fixture",
                "choice_id": "branch_commit_draft_probe",
                "reader_id": dict(session.player_profile or {}).get("reader_id"),
                "world_version_id": str(session.metadata.get("world_version_id") or ""),
                "route_payload_json": {
                    "commit_draft_id": commit_draft_id,
                    "authorization_id": authorization_id,
                    "branch_publish_candidate_id": branch_publish_record.get("branch_publish_candidate_id"),
                    "worldline_id": worldline_id,
                    "scope": "branch_commit_draft_probe",
                },
                "event_payload_json": {
                    "commit_draft_id": commit_draft_id,
                    "authorization_id": authorization_id,
                    "branch_publish_candidate_id": branch_publish_record.get("branch_publish_candidate_id"),
                    "worldline_id": worldline_id,
                    "scope": "branch_commit_draft_probe",
                },
            }
        )
        if not proof.get("rollback_verified"):
            return {
                "status": "blocked",
                "reason": "multitable_rollback_fixture_failed",
                "capability_mode": "branch_commit_draft_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "authorization_id": authorization_id,
                "branch_publish_candidate_id": branch_publish_record.get("branch_publish_candidate_id"),
            }

        record = {
            "status": "drafted_candidate",
            "capability_mode": "branch_commit_draft_gate",
            "write_scope": "branch_commit_draft_ledger_only",
            "commit_draft_id": commit_draft_id,
            "worldline_id": worldline_id,
            "session_id": worldline_id,
            "world_id": session.world_id,
            "branch_id": branch_publish_record.get("branch_id"),
            "branch_publish_candidate_id": branch_publish_record.get("branch_publish_candidate_id"),
            "authorization_id": authorization_id,
            "route_choice_event_id": branch_publish_record.get("route_choice_event_id"),
            "time_engine_run_id": branch_publish_record.get("time_engine_run_id"),
            "world_instance_patch_candidate": dict(branch_publish_record.get("world_instance_patch_candidate") or {}),
            "transaction_plan": {
                "status": "draft_only",
                "tables": ["route_choices", "analytics_events"],
                "future_tables": ["branches", "world_instances", "time_event_consumption"],
                "rollback_verified": True,
            },
            "multitable_rollback_fixture": {
                "rollback_verified": True,
                "route_visible_before_rollback": bool(proof.get("route_visible_before_rollback")),
                "analytics_visible_before_rollback": bool(proof.get("analytics_visible_before_rollback")),
                "route_persisted_after_rollback": bool(proof.get("route_persisted_after_rollback")),
                "analytics_persisted_after_rollback": bool(proof.get("analytics_persisted_after_rollback")),
                "tables_checked": list(proof.get("tables_checked") or []),
            },
            "required_before_public_publish": [
                "production_release_owner_approval",
                "remote_live_runtime_trace",
                "durable_production_branch_tables",
            ],
            "production_public_publish": False,
            "idempotency_key_hash": key_hash,
            "idempotent_replay": False,
            "created_at": _utcnow(),
        }
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        record["ledger_path"] = str(record_path)
        record["latest_path"] = str(latest_path)
        latest_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        return record

    def branch_commit_draft_snapshot(self, *, worldline_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        latest = self._latest_branch_commit_draft_record(worldline_id)
        if latest is None:
            return {
                "status": "waiting",
                "capability_mode": "branch_commit_draft_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "service_note": "No branch commit draft ledger has been generated for this worldline yet.",
            }
        latest["ledger_path"] = str(self._branch_commit_draft_record_path(str(latest.get("commit_draft_id") or "")))
        latest["latest_path"] = str(self._branch_commit_draft_latest_path(worldline_id))
        return latest

    def commit_production_branch(
        self,
        *,
        worldline_id: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        key = str(idempotency_key or payload.get("idempotency_key") or "").strip()
        if not key:
            return {
                "status": "blocked",
                "reason": "idempotency_key_required",
                "capability_mode": "production_branch_persistence_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        commit_draft_record = self._latest_branch_commit_draft_record(worldline_id)
        if commit_draft_record is None:
            return {
                "status": "blocked",
                "reason": "branch_commit_draft_required",
                "capability_mode": "production_branch_persistence_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        requested_commit_draft_id = str(payload.get("commit_draft_id") or "").strip()
        commit_draft_id = str(commit_draft_record.get("commit_draft_id") or "")
        if requested_commit_draft_id and requested_commit_draft_id != commit_draft_id:
            return {
                "status": "blocked",
                "reason": "commit_draft_mismatch",
                "capability_mode": "production_branch_persistence_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "commit_draft_id": commit_draft_id,
            }
        release_owner_id = str(payload.get("release_owner_id") or "").strip()
        if not release_owner_id:
            return {
                "status": "blocked",
                "reason": "release_owner_id_required",
                "capability_mode": "production_branch_persistence_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "commit_draft_id": commit_draft_id,
            }
        if payload.get("confirmed") is not True:
            return {
                "status": "blocked",
                "reason": "release_owner_confirmation_required",
                "capability_mode": "production_branch_persistence_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "commit_draft_id": commit_draft_id,
                "release_owner_id": release_owner_id,
            }
        if payload.get("public_publish_enabled") is True:
            return {
                "status": "blocked",
                "reason": "public_publish_disabled_for_p62",
                "capability_mode": "production_branch_persistence_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "commit_draft_id": commit_draft_id,
                "release_owner_id": release_owner_id,
                "production_public_publish": False,
            }

        key_hash = _idempotency_hash(key)
        branch_commit_id = "production_branch_commit_%s" % _stable_payload_hash(
            {
                "idempotency_key_hash": key_hash,
                "worldline_id": worldline_id,
                "commit_draft_id": commit_draft_id,
                "release_owner_id": release_owner_id,
            }
        )
        persisted = self.repository.persist_production_branch_commit(
            {
                "branch_commit_id": branch_commit_id,
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "world_version_id": str(session.metadata.get("world_version_id") or ""),
                "branch_id": str(commit_draft_record.get("branch_id") or worldline_id),
                "chapter_id": str(commit_draft_record.get("world_instance_patch_candidate", {}).get("chapter_id") or ""),
                "route_choice_event_id": commit_draft_record.get("route_choice_event_id"),
                "time_engine_run_id": commit_draft_record.get("time_engine_run_id"),
                "branch_publish_candidate_id": commit_draft_record.get("branch_publish_candidate_id"),
                "authorization_id": commit_draft_record.get("authorization_id"),
                "commit_draft_id": commit_draft_id,
                "release_owner_id": release_owner_id,
                "source_run_id": commit_draft_record.get("source_run_id"),
                "reader_id": dict(session.player_profile or {}).get("reader_id"),
                "idempotency_key_hash": key_hash,
                "public_publish_enabled": False,
                "payload_json": {
                    "capability_mode": "production_branch_persistence_gate",
                    "commit_draft": {
                        "commit_draft_id": commit_draft_id,
                        "write_scope": commit_draft_record.get("write_scope"),
                        "branch_publish_candidate_id": commit_draft_record.get("branch_publish_candidate_id"),
                        "authorization_id": commit_draft_record.get("authorization_id"),
                    },
                    "world_instance_patch_candidate": dict(
                        commit_draft_record.get("world_instance_patch_candidate") or {}
                    ),
                    "time_engine_run_id": commit_draft_record.get("time_engine_run_id"),
                    "route_choice_event_id": commit_draft_record.get("route_choice_event_id"),
                },
            }
        )
        return {
            "status": "persisted_private",
            "capability_mode": "production_branch_persistence_gate",
            "write_scope": "production_branch_table_private",
            "branch_commit_id": persisted["branch_commit_id"],
            "worldline_id": worldline_id,
            "session_id": worldline_id,
            "world_id": session.world_id,
            "branch_id": persisted["branch_id"],
            "commit_draft_id": commit_draft_id,
            "authorization_id": persisted["authorization_id"],
            "branch_publish_candidate_id": persisted["branch_publish_candidate_id"],
            "release_owner_id": persisted["release_owner_id"],
            "tables_written": list(persisted.get("tables_written") or []),
            "audit_event_id": persisted.get("audit_event_id"),
            "public_publish_enabled": False,
            "production_public_publish": False,
            "next_required": ["public_publish_gate", "remote_live_runtime_trace"],
            "idempotency_key_hash": key_hash,
            "idempotent_replay": bool(persisted.get("idempotent_replay")),
            "created_at": persisted.get("created_at"),
        }

    def production_branch_commit_snapshot(self, *, worldline_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        latest = self.repository.latest_production_branch_commit(worldline_id=worldline_id)
        if latest is None:
            return {
                "status": "waiting",
                "capability_mode": "production_branch_persistence_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "service_note": "No private production branch commit has been persisted for this worldline yet.",
            }
        return {
            "status": str(latest.get("status") or "persisted_private"),
            "capability_mode": "production_branch_persistence_gate",
            "write_scope": str(latest.get("write_scope") or "production_branch_table_private"),
            "branch_commit_id": latest.get("branch_commit_id"),
            "worldline_id": latest.get("worldline_id"),
            "session_id": latest.get("session_id"),
            "world_id": latest.get("world_id"),
            "branch_id": latest.get("branch_id"),
            "commit_draft_id": latest.get("commit_draft_id"),
            "authorization_id": latest.get("authorization_id"),
            "branch_publish_candidate_id": latest.get("branch_publish_candidate_id"),
            "release_owner_id": latest.get("release_owner_id"),
            "public_publish_enabled": bool(latest.get("public_publish_enabled") or False),
            "production_public_publish": False,
            "created_at": latest.get("created_at"),
        }

    def publish_public_branch(
        self,
        *,
        worldline_id: str,
        payload: Dict[str, Any],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        key = str(idempotency_key or payload.get("idempotency_key") or "").strip()
        if not key:
            return {
                "status": "blocked",
                "reason": "idempotency_key_required",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        production_commit = self.repository.latest_production_branch_commit(worldline_id=worldline_id)
        if production_commit is None:
            return {
                "status": "blocked",
                "reason": "production_branch_commit_required",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
            }
        requested_branch_commit_id = str(payload.get("branch_commit_id") or "").strip()
        branch_commit_id = str(production_commit.get("branch_commit_id") or "")
        if requested_branch_commit_id and requested_branch_commit_id != branch_commit_id:
            return {
                "status": "blocked",
                "reason": "branch_commit_mismatch",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
            }
        release_owner_id = str(payload.get("release_owner_id") or "").strip()
        expected_release_owner_id = str(production_commit.get("release_owner_id") or "").strip()
        if not release_owner_id:
            return {
                "status": "blocked",
                "reason": "release_owner_id_required",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
            }
        if expected_release_owner_id and release_owner_id != expected_release_owner_id:
            return {
                "status": "blocked",
                "reason": "release_owner_mismatch",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
                "release_owner_id": release_owner_id,
                "expected_release_owner_id": expected_release_owner_id,
            }
        ops_reviewer_id = str(payload.get("ops_reviewer_id") or "").strip()
        if not ops_reviewer_id:
            return {
                "status": "blocked",
                "reason": "ops_reviewer_id_required",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
            }
        rollback_owner_id = str(payload.get("rollback_owner_id") or "").strip()
        if not rollback_owner_id:
            return {
                "status": "blocked",
                "reason": "rollback_owner_id_required",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
            }
        if payload.get("confirmed") is not True:
            return {
                "status": "blocked",
                "reason": "public_publish_confirmation_required",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
                "release_owner_id": release_owner_id,
            }
        if payload.get("public_publish_enabled") is not True:
            return {
                "status": "blocked",
                "reason": "public_publish_enabled_required",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
                "production_public_publish": False,
            }

        key_hash = _idempotency_hash(key)
        public_release_id = "public_branch_release_%s" % _stable_payload_hash(
            {
                "idempotency_key_hash": key_hash,
                "worldline_id": worldline_id,
                "branch_commit_id": branch_commit_id,
                "release_owner_id": release_owner_id,
                "ops_reviewer_id": ops_reviewer_id,
            }
        )
        rollback_plan = {
            "status": "available_after_public_publish",
            "method": "mark_public_branch_release_withdrawn",
            "owner_id": rollback_owner_id,
            "public_release_id": public_release_id,
            "branch_commit_id": branch_commit_id,
        }
        persisted = self.repository.persist_public_branch_release(
            {
                "public_release_id": public_release_id,
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "world_version_id": str(session.metadata.get("world_version_id") or ""),
                "branch_id": str(production_commit.get("branch_id") or worldline_id),
                "branch_commit_id": branch_commit_id,
                "commit_draft_id": production_commit.get("commit_draft_id"),
                "authorization_id": production_commit.get("authorization_id"),
                "branch_publish_candidate_id": production_commit.get("branch_publish_candidate_id"),
                "release_owner_id": release_owner_id,
                "ops_reviewer_id": ops_reviewer_id,
                "rollback_owner_id": rollback_owner_id,
                "reader_id": dict(session.player_profile or {}).get("reader_id"),
                "idempotency_key_hash": key_hash,
                "public_publish_enabled": True,
                "rollback_plan": rollback_plan,
                "payload_json": {
                    "capability_mode": "production_public_publish_gate",
                    "production_branch_commit": {
                        "branch_commit_id": branch_commit_id,
                        "write_scope": production_commit.get("write_scope"),
                        "commit_draft_id": production_commit.get("commit_draft_id"),
                        "authorization_id": production_commit.get("authorization_id"),
                    },
                    "remote_runtime_trace_ref": str(payload.get("remote_runtime_trace_ref") or ""),
                    "legal_audit_ref": str(payload.get("legal_audit_ref") or ""),
                },
            }
        )
        return {
            "status": "published_public",
            "capability_mode": "production_public_publish_gate",
            "write_scope": "reader_visible_branch_release",
            "public_release_id": persisted["public_release_id"],
            "branch_commit_id": persisted["branch_commit_id"],
            "worldline_id": worldline_id,
            "session_id": worldline_id,
            "world_id": session.world_id,
            "branch_id": persisted["branch_id"],
            "commit_draft_id": persisted["commit_draft_id"],
            "authorization_id": persisted["authorization_id"],
            "branch_publish_candidate_id": persisted["branch_publish_candidate_id"],
            "release_owner_id": persisted["release_owner_id"],
            "ops_reviewer_id": persisted["ops_reviewer_id"],
            "rollback_owner_id": persisted["rollback_owner_id"],
            "visibility_status": persisted["visibility_status"],
            "reader_visibility_enabled": True,
            "public_publish_enabled": True,
            "production_public_publish": True,
            "rollback_plan": persisted.get("rollback_plan") or rollback_plan,
            "tables_written": list(persisted.get("tables_written") or []),
            "audit_event_id": persisted.get("audit_event_id"),
            "next_required": ["remote_live_runtime_trace", "production_time_engine_telemetry_fit"],
            "idempotency_key_hash": key_hash,
            "idempotent_replay": bool(persisted.get("idempotent_replay")),
            "created_at": persisted.get("created_at"),
        }

    def public_branch_release_snapshot(self, *, worldline_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        latest = self.repository.latest_public_branch_release(worldline_id=worldline_id)
        if latest is None:
            return {
                "status": "waiting",
                "capability_mode": "production_public_publish_gate",
                "write_scope": "none",
                "worldline_id": worldline_id,
                "session_id": worldline_id,
                "world_id": session.world_id,
                "service_note": "No Reader-visible public branch release has been published for this worldline yet.",
            }
        return {
            "status": "published_public",
            "capability_mode": "production_public_publish_gate",
            "write_scope": str(latest.get("write_scope") or "reader_visible_branch_release"),
            "public_release_id": latest.get("public_release_id"),
            "branch_commit_id": latest.get("branch_commit_id"),
            "worldline_id": latest.get("worldline_id"),
            "session_id": latest.get("session_id"),
            "world_id": latest.get("world_id"),
            "branch_id": latest.get("branch_id"),
            "commit_draft_id": latest.get("commit_draft_id"),
            "authorization_id": latest.get("authorization_id"),
            "branch_publish_candidate_id": latest.get("branch_publish_candidate_id"),
            "release_owner_id": latest.get("release_owner_id"),
            "ops_reviewer_id": latest.get("ops_reviewer_id"),
            "rollback_owner_id": latest.get("rollback_owner_id"),
            "visibility_status": latest.get("visibility_status"),
            "reader_visibility_enabled": bool(latest.get("reader_visibility_enabled") or False),
            "public_publish_enabled": bool(latest.get("public_publish_enabled") or False),
            "production_public_publish": True,
            "rollback_plan": dict(latest.get("rollback_plan") or {}),
            "created_at": latest.get("created_at"),
        }

    def reader_snapshot(self, *, session_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(session_id)
        steps = self.repository.list_steps(session_id)
        latest_step = steps[-1] if steps else None
        reports = self.repository.list_evaluation_reports(session_id=session_id)
        latest_report = reports[0] if reports else None
        world_version_id = str(session.metadata.get("world_version_id") or "")

        return {
            "status": "ready",
            "capability_mode": "service_contract",
            "session_id": session.session_id,
            "world_id": session.world_id,
            "world_version_id": world_version_id,
            "reader_id": session.player_profile.get("reader_id"),
            "chapter_index": session.current_state.chapter_index,
            "current_state": session.current_state.to_dict(),
            "latest_chapter": latest_step.reader_view.to_dict() if latest_step and latest_step.reader_view else None,
            "worldline": self.worldline(session_id),
            "quality_brake": self._quality_gate(latest_report),
            "canon_status": "candidate" if latest_step else "seed",
            "paywall": dict(session.metadata.get("entitlements_snapshot") or {}),
        }

    def advance_scene(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if self.session_service is None:
            raise RuntimeError("session_service_required")
        session_id = str(payload.get("session_id") or "")
        choice_id = str(payload.get("choice_id") or "").strip()
        source_run_id = str(payload.get("source_run_id") or "").strip() or _stable_reader_run_id(payload)
        result = self.session_service.continue_story(
            ReaderContinueCommand(
                session_id=session_id,
                choice_id=choice_id or None,
                freeform_intent=payload.get("freeform_intent"),
            ),
            reader_id=payload.get("reader_id") or payload.get("account_id"),
        )
        latest_report = None
        branch_writeback: Dict[str, Any] = {
            "status": "not_persisted",
            "branch_written": False,
            "write_scope": "none",
            "source_run_id": source_run_id,
            "session_id": session_id,
            "worldline_id": payload.get("worldline_id") or session_id,
            "branch_id": payload.get("branch_id") or payload.get("worldline_id") or session_id,
            "choice_id": choice_id or None,
            "rollback_plan": {
                "status": "not_required",
                "method": "no_branch_record_written",
            },
        }
        if result.get("status") == "ok":
            reports = self.repository.list_evaluation_reports(session_id=session_id)
            latest_report = reports[0] if reports else None
            chapter_view = result.get("chapter_view") or {}
            chapter_id = str(chapter_view.get("chapterId") or "")
            if choice_id and chapter_id:
                worldline_id = str(payload.get("worldline_id") or session_id)
                branch_id = str(payload.get("branch_id") or payload.get("worldline_id") or session_id)
                latest_step = self.repository.get_latest_step(session_id)
                world_instance_patch = (
                    _world_instance_patch_candidate(
                        step=latest_step,
                        source_run_id=source_run_id,
                        worldline_id=worldline_id,
                        branch_id=branch_id,
                        choice_id=choice_id,
                        chapter_id=chapter_id,
                    )
                    if latest_step is not None
                    else {
                        "status": "unavailable",
                        "write_scope": "none",
                        "source_run_id": source_run_id,
                        "worldline_id": worldline_id,
                        "branch_id": branch_id,
                        "choice_id": choice_id,
                        "chapter_id": chapter_id,
                        "reason": "latest_step_missing",
                    }
                )
                recorded_choice = self.repository.save_route_choice(
                    session_id=session_id,
                    chapter_id=chapter_id,
                    choice_id=choice_id,
                    payload_json={
                        "source_run_id": source_run_id,
                        "worldline_id": worldline_id,
                        "branch_id": branch_id,
                        "freeform_intent": payload.get("freeform_intent"),
                        "scene_id": payload.get("scene_id"),
                        "chapter_index": chapter_view.get("chapterIndex"),
                        "write_scope": "route_choice_ledger_only",
                        "world_instance_patch_candidate": world_instance_patch,
                    },
                )
                branch_writeback = {
                    "status": "persisted",
                    "branch_written": True,
                    "write_scope": "route_choice_ledger_only",
                    "source_run_id": source_run_id,
                    "session_id": session_id,
                    "worldline_id": worldline_id,
                    "branch_id": branch_id,
                    "choice_id": choice_id,
                    "chapter_id": chapter_id,
                    "choice_event_id": recorded_choice["choice_event_id"],
                    "selected_at": recorded_choice["selected_at"],
                    "world_instance_writeback": {
                        "status": world_instance_patch["status"],
                        "write_scope": world_instance_patch["write_scope"],
                        "state_refs": list(world_instance_patch.get("state_refs") or []),
                        "snapshot_summary": dict(world_instance_patch.get("snapshot_summary") or {}),
                    },
                    "world_instance_patch_candidate": world_instance_patch,
                    "rollback_plan": {
                        "status": "available_before_public_publish",
                        "method": "delete_route_choice_ledger_record_and_discard_world_instance_patch",
                        "choice_event_id": recorded_choice["choice_event_id"],
                    },
                }
        return {
            "status": result.get("status", "unknown"),
            "session_id": result.get("session_id") or session_id,
            "world_id": result.get("world_id"),
            "world_version_id": result.get("world_version_id"),
            "candidate_scene": {
                "status": "candidate" if result.get("status") == "ok" else "blocked",
                "chapter_view": result.get("chapter_view"),
                "reader_view": result.get("reader_view"),
            },
            "quality_brake": self._quality_gate(latest_report),
            "harness_trace": [
                {"step": "plan", "status": "done", "detail": "Loaded session, world runtime, entitlement posture.", "source_run_id": source_run_id},
                {"step": "draft", "status": "done" if result.get("status") == "ok" else "blocked", "detail": "Generated candidate scene through reader continuation.", "source_run_id": source_run_id},
                {"step": "tool/eval", "status": "done" if latest_report else "waiting", "detail": "Quality brake report attached when a chapter was rendered.", "source_run_id": source_run_id},
                {"step": "branch/writeback", "status": "done" if branch_writeback["branch_written"] else "waiting", "detail": "Reader choice is written to the route-choice ledger before public publish.", "source_run_id": source_run_id},
                {"step": "confirm", "status": "waiting", "detail": "Canon commit still requires explicit confirmation.", "source_run_id": source_run_id},
            ],
            "branch_writeback": branch_writeback,
            "raw_continue": result,
        }

    def worldline(self, worldline_id: str) -> Dict[str, Any]:
        session = self.repository.get_session(worldline_id)
        steps = self.repository.list_steps(worldline_id)
        route_choices = self.repository.list_route_choices(session_id=worldline_id)
        choices_by_chapter = {str(choice["chapter_id"]): choice for choice in route_choices}
        events: List[Dict[str, Any]] = []
        for index, step in enumerate(steps, start=1):
            chosen = step.chosen_event.to_dict() if step.chosen_event else {}
            chapter_id = "chapter_%s_%s" % (worldline_id, step.step_index)
            route_choice = choices_by_chapter.get(chapter_id)
            route_payload = dict(route_choice.get("payload") or {}) if route_choice else {}
            world_instance_patch = dict(route_payload.get("world_instance_patch_candidate") or {}) if route_payload else {}
            events.append(
                {
                    "id": chosen.get("event_id") or "event_%s_%s" % (worldline_id, index),
                    "chapter_index": step.step_index,
                    "type": "branch_candidate" if route_choice else "canon_candidate",
                    "title": chosen.get("title") or (step.reader_view.chapter_title if step.reader_view else "未命名章节"),
                    "intensity": round(min(0.95, 0.25 + index * 0.14 + float(step.state_after.tension) * 0.25), 3),
                    "state": "candidate",
                    "choice_text": step.player_input,
                    "choice_id": route_choice.get("choice_id") if route_choice else None,
                    "source_run_id": route_payload.get("source_run_id"),
                    "choice_event_id": route_choice.get("choice_event_id") if route_choice else None,
                    "write_scope": route_payload.get("write_scope"),
                    "world_instance_patch_candidate": world_instance_patch or None,
                    "tags": list(chosen.get("tags") or []),
                    "created_at": step.created_at,
                }
            )
        linked_choices = [choice for choice in route_choices if dict(choice.get("payload") or {}).get("source_run_id")]
        world_instance_patches = [
            dict(dict(choice.get("payload") or {}).get("world_instance_patch_candidate") or {})
            for choice in route_choices
            if dict(choice.get("payload") or {}).get("world_instance_patch_candidate")
        ]
        patch_summaries = [dict(patch.get("snapshot_summary") or {}) for patch in world_instance_patches]
        time_engine_record = self._latest_time_engine_record(worldline_id)
        time_engine_events = list(dict(time_engine_record or {}).get("candidate_events") or [])
        branch_publish_record = self._latest_branch_publish_record(worldline_id)
        branch_authorization_record = self._latest_branch_authorization_record(worldline_id)
        branch_commit_draft_record = self._latest_branch_commit_draft_record(worldline_id)
        production_branch_commit_record = self.repository.latest_production_branch_commit(worldline_id=worldline_id)
        public_branch_release_record = self.repository.latest_public_branch_release(worldline_id=worldline_id)
        return {
            "worldline_id": worldline_id,
            "world_id": session.world_id,
            "source": "reader_session_steps",
            "event_count": len(events),
            "route_choice_count": len(route_choices),
            "events": events,
            "branch_writeback_summary": {
                "status": "linked" if linked_choices else ("waiting" if not route_choices else "missing_source_run"),
                "write_scope": "route_choice_ledger_only" if route_choices else "none",
                "linked_choice_count": len(linked_choices),
                "route_choice_count": len(route_choices),
                "world_instance_patch_count": len(world_instance_patches),
            },
            "world_instance_writeback_summary": {
                "status": "candidate" if world_instance_patches else ("waiting" if route_choices else "none"),
                "write_scope": "world_instance_patch_candidate_only" if world_instance_patches else "none",
                "patch_count": len(world_instance_patches),
                "latest_snapshot_summary": patch_summaries[-1] if patch_summaries else {},
                "rollback_scope": "discard_patch_candidate_before_public_publish" if world_instance_patches else "none",
            },
            "density_summary": {
                "mode": "fastapi_time_engine" if time_engine_record else "observed_runtime_trace",
                "burst_count": (
                    sum(1 for event in time_engine_events if str(event.get("pressureTag")) == "burst")
                    if time_engine_record
                    else sum(1 for event in events if float(event["intensity"]) >= 0.72)
                ),
                "aftershock_count": (
                    sum(1 for event in time_engine_events if float(event.get("hawkesBoost") or 0) > 0)
                    if time_engine_record
                    else max(0, len(events) - 1)
                ),
                "service_note": "The endpoint exposes persisted runtime events; public branch publish remains a later backend task.",
            },
            "time_engine_summary": {
                "status": "candidate" if time_engine_record else "waiting",
                "write_scope": str(dict(time_engine_record or {}).get("write_scope") or "none"),
                "time_engine_run_id": dict(time_engine_record or {}).get("time_engine_run_id"),
                "source_run_id": dict(time_engine_record or {}).get("source_run_id"),
                "candidate_event_count": len(time_engine_events),
                "density_summary": dict(dict(time_engine_record or {}).get("density_summary") or {}),
                "rollback_scope": "delete_time_event_candidate_before_public_publish" if time_engine_record else "none",
            },
            "branch_publish_summary": {
                "status": "candidate" if branch_publish_record else "waiting",
                "write_scope": str(dict(branch_publish_record or {}).get("write_scope") or "none"),
                "branch_publish_candidate_id": dict(branch_publish_record or {}).get("branch_publish_candidate_id"),
                "time_engine_run_id": dict(branch_publish_record or {}).get("time_engine_run_id"),
                "route_choice_event_id": dict(branch_publish_record or {}).get("route_choice_event_id"),
                "consumed_time_event_count": len(
                    list(dict(branch_publish_record or {}).get("consumed_time_event_ids") or [])
                ),
                "rollback_scope": "delete_branch_publish_candidate_before_public_publish"
                if branch_publish_record
                else "none",
                "transaction_rollback_fixture": "available" if branch_publish_record else "waiting",
            },
            "branch_publish_authorization_summary": {
                "status": str(dict(branch_authorization_record or {}).get("status") or "waiting"),
                "write_scope": str(dict(branch_authorization_record or {}).get("write_scope") or "none"),
                "authorization_id": dict(branch_authorization_record or {}).get("authorization_id"),
                "branch_publish_candidate_id": dict(branch_authorization_record or {}).get(
                    "branch_publish_candidate_id"
                ),
                "operator_confirmation": dict(branch_authorization_record or {}).get("operator_confirmation"),
                "production_public_publish": bool(
                    dict(branch_authorization_record or {}).get("production_public_publish") or False
                ),
            },
            "branch_commit_draft_summary": {
                "status": str(dict(branch_commit_draft_record or {}).get("status") or "waiting"),
                "write_scope": str(dict(branch_commit_draft_record or {}).get("write_scope") or "none"),
                "commit_draft_id": dict(branch_commit_draft_record or {}).get("commit_draft_id"),
                "authorization_id": dict(branch_commit_draft_record or {}).get("authorization_id"),
                "branch_publish_candidate_id": dict(branch_commit_draft_record or {}).get(
                    "branch_publish_candidate_id"
                ),
                "production_public_publish": bool(
                    dict(branch_commit_draft_record or {}).get("production_public_publish") or False
                ),
            },
            "production_branch_commit_summary": {
                "status": str(dict(production_branch_commit_record or {}).get("status") or "waiting"),
                "write_scope": str(
                    dict(production_branch_commit_record or {}).get("write_scope") or "none"
                ),
                "branch_commit_id": dict(production_branch_commit_record or {}).get("branch_commit_id"),
                "commit_draft_id": dict(production_branch_commit_record or {}).get("commit_draft_id"),
                "authorization_id": dict(production_branch_commit_record or {}).get("authorization_id"),
                "branch_publish_candidate_id": dict(production_branch_commit_record or {}).get(
                    "branch_publish_candidate_id"
                ),
                "public_publish_enabled": bool(
                    dict(production_branch_commit_record or {}).get("public_publish_enabled") or False
                ),
                "production_public_publish": False,
            },
            "public_branch_release_summary": {
                "status": str(dict(public_branch_release_record or {}).get("visibility_status") or "waiting"),
                "write_scope": str(dict(public_branch_release_record or {}).get("write_scope") or "none"),
                "public_release_id": dict(public_branch_release_record or {}).get("public_release_id"),
                "branch_commit_id": dict(public_branch_release_record or {}).get("branch_commit_id"),
                "release_owner_id": dict(public_branch_release_record or {}).get("release_owner_id"),
                "ops_reviewer_id": dict(public_branch_release_record or {}).get("ops_reviewer_id"),
                "rollback_owner_id": dict(public_branch_release_record or {}).get("rollback_owner_id"),
                "reader_visibility_enabled": bool(
                    dict(public_branch_release_record or {}).get("reader_visibility_enabled") or False
                ),
                "production_public_publish": bool(
                    dict(public_branch_release_record or {}).get("public_publish_enabled") or False
                ),
            },
        }

    def evaluate_quality(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        body = str(payload.get("body") or "").strip()
        if not body:
            raise ValueError("body_required")
        session_id = str(payload.get("session_id") or "")
        world_version_id = str(payload.get("world_version_id") or "")
        if session_id:
            session = self.repository.get_session(session_id)
            state_after = session.current_state
            world_version_id = world_version_id or str(session.metadata.get("world_version_id") or "")
        else:
            state_after = _fallback_state(world_id=str(payload.get("world_id") or "unbound_world"))
        lint_report = lint_chapter_draft(body)
        choices = list(payload.get("choices") or [])
        report = evaluate_chapter(
            chapter_id=str(payload.get("candidate_id") or "candidate_%s" % uuid4().hex[:10]),
            world_version_id=world_version_id,
            session_id=session_id,
            body=body,
            paragraphs=body.split("\n\n"),
            dialogue_count=int(lint_report["dialogue_count"]),
            action_count=int(lint_report["action_count"]),
            detail_count=int(lint_report["detail_count"]),
            character_fidelity_score=float(payload.get("character_fidelity_score") or 0.6),
            state_after=state_after,
            ending_ready=bool(payload.get("ending_ready")),
            choices=choices,
            paywall_required=bool(payload.get("paywall_required")),
        ).to_dict()
        gate = self._quality_gate(report)
        studio_trace = _build_studio_trace(
            payload=payload,
            report=report,
            gate=gate,
            stage="evaluated",
        )
        report["studio_trace"] = studio_trace
        return {
            "status": "evaluated",
            "report": report,
            "quality_gate": gate,
            "studio_trace": studio_trace,
        }

    def commit_canon(self, payload: Dict[str, Any], *, idempotency_key: Optional[str] = None) -> Dict[str, Any]:
        target_status = str(payload.get("target_status") or "canon")
        confirmed = bool(payload.get("confirmed"))
        report = dict(payload.get("quality_report") or payload.get("report") or {})
        gate = self._quality_gate(report)
        if not confirmed:
            return {
                "status": "blocked",
                "reason": "confirmation_required",
                "quality_gate": add_commit_confirmation_requirement(gate),
            }
        key = str(idempotency_key or payload.get("idempotency_key") or "").strip()
        if not key:
            return {
                "status": "blocked",
                "reason": "idempotency_key_required",
                "quality_gate": gate,
            }
        if target_status == "canon" and not gate["can_commit_canon"]:
            return {
                "status": "blocked",
                "reason": "quality_gate_not_passed",
                "quality_gate": gate,
            }

        now = _utcnow()
        key_hash = _idempotency_hash(key)
        commit_id = "canon_commit_%s" % key_hash
        self.canon_ledger_dir.mkdir(parents=True, exist_ok=True)
        ledger_path = self.canon_ledger_dir / ("%s.json" % commit_id)
        if ledger_path.exists():
            replay = json.loads(ledger_path.read_text(encoding="utf-8"))
            replay["ledger_path"] = str(ledger_path)
            replay["idempotent_replay"] = True
            return replay
        studio_trace = _build_studio_trace(
            payload=payload,
            report=report,
            gate=gate,
            stage="committed",
            idempotency_key_hash=key_hash,
            commit_id=commit_id,
        )

        record = {
            "commit_id": commit_id,
            "status": "committed",
            "target_status": target_status,
            "candidate_id": payload.get("candidate_id"),
            "session_id": payload.get("session_id"),
            "project_id": payload.get("project_id"),
            "world_id": payload.get("world_id"),
            "world_version_id": payload.get("world_version_id"),
            "chapter_id": payload.get("chapter_id") or report.get("chapter_id"),
            "source_run_id": studio_trace["source_run_id"],
            "confirmed_by": payload.get("confirmed_by") or "web_operator",
            "quality_gate": gate,
            "quality_report_hash": studio_trace["quality_report_hash"],
            "studio_trace": studio_trace,
            "idempotency_key_hash": key_hash,
            "write_scope": "canon_ledger_only",
            "rollback_plan": {
                "status": "available_before_public_publish",
                "method": "remove_ledger_record_and_requeue_candidate",
                "commit_id": commit_id,
                "source_run_id": studio_trace["source_run_id"],
                "quality_report_hash": studio_trace["quality_report_hash"],
            },
            "created_at": now,
        }
        ledger_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        record["ledger_path"] = str(ledger_path)
        record["idempotent_replay"] = False
        return record

    def _quality_gate(self, report: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return compose_quality_gate_result(report, source="local_evaluator")
