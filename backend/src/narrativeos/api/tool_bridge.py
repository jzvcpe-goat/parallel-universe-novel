from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field


class RuntimeToolRequest(BaseModel):
    projectId: Optional[str] = None
    creatorId: Optional[str] = None
    seed: str = ""
    genre: Optional[str] = None
    selectedTemplate: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    sessionId: Optional[str] = None
    previousSession: Optional[Dict[str, Any]] = None


router = APIRouter(prefix="/v1/tools/runtime", tags=["tool-bridge"])


def _require_idempotency(idempotency_key: Optional[str]) -> str:
    key = str(idempotency_key or "").strip()
    if not key:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "idempotency_key_required",
                "reason": "Mastra Tool Bridge writes must include Idempotency-Key.",
            },
        )
    return key


def _local_output(payload: RuntimeToolRequest) -> Dict[str, Any]:
    context_output = payload.context.get("mastra_local_output") if isinstance(payload.context, dict) else None
    return dict(context_output) if isinstance(context_output, dict) else {}


def _public_output(payload: RuntimeToolRequest, *, idempotency_key: str, endpoint: str) -> Dict[str, Any]:
    local_output = _local_output(payload)
    candidate = dict(local_output.get("candidateDraft") or {})
    questions = local_output.get("questions") if isinstance(local_output.get("questions"), list) else []
    setting_cards = dict(local_output.get("settingCards") or {})
    active_constraints = local_output.get("activeConstraints") if isinstance(local_output.get("activeConstraints"), list) else []
    active_kernels = local_output.get("activeKernels") if isinstance(local_output.get("activeKernels"), list) else []
    quality_preview = dict(local_output.get("qualityPreview") or {})
    run_trace = local_output.get("runTrace") if isinstance(local_output.get("runTrace"), list) else []
    run_trace = [
        *run_trace,
        {
            "step": f"fastapi.{endpoint}",
            "status": "ok",
            "detail": "Runtime facade accepted the Mastra tool call without writing canon.",
        },
    ]

    return {
        "runId": local_output.get("runId") or idempotency_key,
        "projectId": local_output.get("projectId") or payload.projectId or "project_preview",
        "sessionId": local_output.get("sessionId") or payload.sessionId or f"preview_{idempotency_key[:12]}",
        "candidateDraft": {
            "status": "candidate",
            "title": candidate.get("title") or "第一幕",
            "body": candidate.get("body") or f"故事种子已收到：{payload.seed}",
        },
        "questions": questions[:2],
        "settingCards": setting_cards,
        "activeConstraints": active_constraints,
        "activeKernels": active_kernels,
        "sourceLabels": local_output.get("sourceLabels") or {
            "seed": "human",
            "candidateDraft": "llm_candidate",
            "settingCards": "rule_engine",
            "qualityPreview": "quality_gate",
        },
        "qualityPreview": quality_preview or {
            "result": "pass",
            "violations": [],
            "repairSuggestions": [],
        },
        "runTrace": run_trace,
        "cost": local_output.get("cost") or {
            "mode": "mock_local",
            "estimatedTokens": 0,
            "estimatedCostUsd": 0,
        },
        "writeback": {
            "status": "preview_only",
            "canon_written": False,
            "branch_written": False,
            "idempotency_key": idempotency_key,
        },
    }


def _state_delta_candidate(output: Dict[str, Any]) -> List[Dict[str, Any]]:
    candidate = dict(output.get("candidateDraft") or {})
    setting_cards = dict(output.get("settingCards") or {})
    quality_preview = dict(output.get("qualityPreview") or {})
    run_id = str(output.get("runId") or "")
    session_id = str(output.get("sessionId") or "session_preview")
    project_id = str(output.get("projectId") or "project_preview")
    confirmed = setting_cards.get("confirmed") if isinstance(setting_cards.get("confirmed"), list) else []
    open_questions = setting_cards.get("open_questions") if isinstance(setting_cards.get("open_questions"), list) else []
    constraints = output.get("activeConstraints") if isinstance(output.get("activeConstraints"), list) else []
    kernels = output.get("activeKernels") if isinstance(output.get("activeKernels"), list) else []

    return [
        {
            "targetId": session_id,
            "targetType": "world",
            "operations": [
                {
                    "op": "set",
                    "path": "candidate.current",
                    "value": {
                        "status": "candidate",
                        "title": candidate.get("title") or "第一幕",
                        "bodyPreview": str(candidate.get("body") or "")[:240],
                        "charCount": len(str(candidate.get("body") or "")),
                    },
                },
                {
                    "op": "merge",
                    "path": "setting_cards",
                    "value": {
                        "confirmed": confirmed,
                        "open_questions": open_questions[:2],
                        "active_constraints": constraints,
                        "active_kernels": kernels,
                    },
                },
                {
                    "op": "set",
                    "path": "quality.preview",
                    "value": {
                        "result": quality_preview.get("result") or "pass",
                        "violationCount": len(quality_preview.get("violations") or []),
                    },
                },
            ],
            "metadata": {
                "sourceAgent": "Orchestrator",
                "runId": run_id,
                "projectId": project_id,
                "confidence": 0.74,
                "reason": "preview_candidate_memory_before_author_confirmation",
            },
        }
    ]


@router.post("/socratic-turn")
def socratic_turn(
    payload: RuntimeToolRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    key = _require_idempotency(idempotency_key)
    return _public_output(payload, idempotency_key=key, endpoint="socratic_turn")


@router.post("/draft")
def draft(
    payload: RuntimeToolRequest,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    key = _require_idempotency(idempotency_key)
    return _public_output(payload, idempotency_key=key, endpoint="draft")


@router.post("/quality-check")
def quality_check(
    payload: RuntimeToolRequest,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    key = _require_idempotency(idempotency_key)
    output = _public_output(payload, idempotency_key=key, endpoint="quality_check")
    return {
        "status": "evaluated",
        "qualityPreview": output["qualityPreview"],
        "runTrace": output["runTrace"],
    }


@router.post("/state-preview")
def state_preview(
    payload: RuntimeToolRequest,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    key = _require_idempotency(idempotency_key)
    output = _public_output(payload, idempotency_key=key, endpoint="state_preview")
    return {
        "status": "preview_only",
        "projectId": output["projectId"],
        "sessionId": output["sessionId"],
        "stateDeltaCandidate": _state_delta_candidate(output),
        "writeback": output["writeback"],
        "runTrace": output["runTrace"],
    }
