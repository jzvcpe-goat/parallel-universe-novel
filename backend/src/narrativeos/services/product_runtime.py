from __future__ import annotations

import json
from hashlib import sha256
from datetime import datetime, timezone
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
    ) -> None:
        self.repository = repository
        self.session_service = session_service
        self.canon_ledger_dir = Path(canon_ledger_dir or Path.cwd() / "artifacts" / "canon_commit_ledger")

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
                recorded_choice = self.repository.save_route_choice(
                    session_id=session_id,
                    chapter_id=chapter_id,
                    choice_id=choice_id,
                    payload_json={
                        "source_run_id": source_run_id,
                        "worldline_id": payload.get("worldline_id") or session_id,
                        "branch_id": payload.get("branch_id") or payload.get("worldline_id") or session_id,
                        "freeform_intent": payload.get("freeform_intent"),
                        "scene_id": payload.get("scene_id"),
                        "chapter_index": chapter_view.get("chapterIndex"),
                        "write_scope": "route_choice_ledger_only",
                    },
                )
                branch_writeback = {
                    "status": "persisted",
                    "branch_written": True,
                    "write_scope": "route_choice_ledger_only",
                    "source_run_id": source_run_id,
                    "session_id": session_id,
                    "worldline_id": payload.get("worldline_id") or session_id,
                    "branch_id": payload.get("branch_id") or payload.get("worldline_id") or session_id,
                    "choice_id": choice_id,
                    "chapter_id": chapter_id,
                    "choice_event_id": recorded_choice["choice_event_id"],
                    "selected_at": recorded_choice["selected_at"],
                    "rollback_plan": {
                        "status": "available_before_public_publish",
                        "method": "delete_route_choice_ledger_record",
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
                    "tags": list(chosen.get("tags") or []),
                    "created_at": step.created_at,
                }
            )
        linked_choices = [choice for choice in route_choices if dict(choice.get("payload") or {}).get("source_run_id")]
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
            },
            "density_summary": {
                "mode": "observed_runtime_trace",
                "burst_count": sum(1 for event in events if float(event["intensity"]) >= 0.72),
                "aftershock_count": max(0, len(events) - 1),
                "service_note": "The endpoint exposes persisted runtime events; stochastic parameter fitting remains a later backend task.",
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
        return {
            "status": "evaluated",
            "report": report,
            "quality_gate": self._quality_gate(report),
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

        record = {
            "commit_id": commit_id,
            "status": "committed",
            "target_status": target_status,
            "candidate_id": payload.get("candidate_id"),
            "session_id": payload.get("session_id"),
            "world_id": payload.get("world_id"),
            "world_version_id": payload.get("world_version_id"),
            "chapter_id": payload.get("chapter_id") or report.get("chapter_id"),
            "confirmed_by": payload.get("confirmed_by") or "web_operator",
            "quality_gate": gate,
            "idempotency_key_hash": key_hash,
            "write_scope": "canon_ledger_only",
            "rollback_plan": {
                "status": "available_before_public_publish",
                "method": "remove_ledger_record_and_requeue_candidate",
                "commit_id": commit_id,
            },
            "created_at": now,
        }
        ledger_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        record["ledger_path"] = str(ledger_path)
        record["idempotent_replay"] = False
        return record

    def _quality_gate(self, report: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return compose_quality_gate_result(report, source="local_evaluator")
