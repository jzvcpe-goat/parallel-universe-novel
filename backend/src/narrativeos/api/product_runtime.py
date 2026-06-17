from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field


class ReaderSnapshotRequest(BaseModel):
    session_id: str


class TimeEngineCandidateRequest(BaseModel):
    source_run_id: Optional[str] = None
    run_id: Optional[str] = None
    project_id: Optional[str] = None
    kernel_id: Optional[str] = None
    active_profile_ids: list[str] = Field(default_factory=list)
    beat_plan: list[str] = Field(default_factory=list)
    beats: list[str] = Field(default_factory=list)


class BranchPublishCandidateRequest(BaseModel):
    source_run_id: Optional[str] = None
    branch_id: Optional[str] = None
    route_choice_event_id: Optional[Any] = None
    project_id: Optional[str] = None


class BranchPublishRollbackFixtureRequest(BaseModel):
    branch_publish_candidate_id: Optional[str] = None
    project_id: Optional[str] = None


class BranchPublishAuthorizationRequest(BaseModel):
    branch_publish_candidate_id: Optional[str] = None
    operator_id: Optional[str] = None
    confirmed: bool = False
    project_id: Optional[str] = None


class BranchCommitDraftRequest(BaseModel):
    authorization_id: Optional[str] = None
    project_id: Optional[str] = None


class SceneAdvanceRequest(BaseModel):
    session_id: str
    choice_id: Optional[str] = None
    freeform_intent: Optional[str] = None
    account_id: Optional[str] = None
    reader_id: Optional[str] = None
    worldline_id: Optional[str] = None
    scene_id: Optional[str] = None
    branch_id: Optional[str] = None
    source_run_id: Optional[str] = None
    user_id: Optional[str] = None


class QualityEvaluateRequest(BaseModel):
    body: str
    candidate_id: Optional[str] = None
    session_id: Optional[str] = None
    project_id: Optional[str] = None
    world_id: Optional[str] = None
    world_version_id: Optional[str] = None
    source_run_id: Optional[str] = None
    choices: list[str] = Field(default_factory=list)
    character_fidelity_score: float = 0.6
    ending_ready: bool = False
    paywall_required: bool = False


class CanonCommitRequest(BaseModel):
    candidate_id: Optional[str] = None
    session_id: Optional[str] = None
    project_id: Optional[str] = None
    world_id: Optional[str] = None
    worldline_id: Optional[str] = None
    world_version_id: Optional[str] = None
    chapter_id: Optional[str] = None
    source_run_id: Optional[str] = None
    studio_trace: Dict[str, Any] = Field(default_factory=dict)
    target_status: str = "canon"
    confirmed: bool = False
    confirmed_by: Optional[str] = None
    quality_report: Dict[str, Any] = Field(default_factory=dict)


router = APIRouter(tags=["product-runtime"])


def _backend_team_bridge(request: Request):
    bridge = getattr(request.app.state, "backend_team_bridge", None)
    if bridge is not None and getattr(bridge, "enabled", False):
        return bridge
    return None


@router.get("/v1/reader/snapshot")
def reader_snapshot(session_id: str, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.reader_snapshot(session_id=session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/v1/reader/snapshot")
def reader_snapshot_post(payload: ReaderSnapshotRequest, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.reader_snapshot(session_id=payload.session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/v1/scene/advance")
def scene_advance(payload: SceneAdvanceRequest, request: Request) -> Dict[str, Any]:
    bridge = _backend_team_bridge(request)
    if bridge is not None:
        bridged = bridge.scene_advance(payload.model_dump())
        if bridged is not None:
            return bridged
    try:
        return request.app.state.product_runtime_service.advance_scene(payload.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/v1/timeline/worldlines/{worldline_id}/loom")
def worldline_runtime_events(worldline_id: str, request: Request) -> Dict[str, Any]:
    bridge = _backend_team_bridge(request)
    if bridge is not None:
        bridged = bridge.worldline_events(worldline_id)
        if bridged is not None:
            return bridged
    try:
        return request.app.state.product_runtime_service.worldline(worldline_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/v1/timeline/worldlines/{worldline_id}/time-engine/candidates")
def time_engine_candidates(
    worldline_id: str,
    payload: TimeEngineCandidateRequest,
    request: Request,
) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.plan_time_events(
            worldline_id=worldline_id,
            payload=payload.model_dump(),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/v1/timeline/worldlines/{worldline_id}/time-engine")
def time_engine_snapshot(worldline_id: str, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.time_engine_snapshot(worldline_id=worldline_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/v1/timeline/worldlines/{worldline_id}/branches/publish-candidate")
def branch_publish_candidate(
    worldline_id: str,
    payload: BranchPublishCandidateRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.publish_branch_candidate(
            worldline_id=worldline_id,
            payload=payload.model_dump(),
            idempotency_key=idempotency_key,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/v1/timeline/worldlines/{worldline_id}/branches/publish-candidate")
def branch_publish_snapshot(worldline_id: str, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.branch_publish_snapshot(worldline_id=worldline_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/v1/timeline/worldlines/{worldline_id}/branches/publish-rollback-fixture")
def branch_publish_rollback_fixture(
    worldline_id: str,
    payload: BranchPublishRollbackFixtureRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.verify_branch_publish_transaction_rollback(
            worldline_id=worldline_id,
            payload=payload.model_dump(),
            idempotency_key=idempotency_key,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/v1/timeline/worldlines/{worldline_id}/branches/publish-authorization")
def branch_publish_authorization(
    worldline_id: str,
    payload: BranchPublishAuthorizationRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.authorize_branch_publish_candidate(
            worldline_id=worldline_id,
            payload=payload.model_dump(),
            idempotency_key=idempotency_key,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/v1/timeline/worldlines/{worldline_id}/branches/publish-authorization")
def branch_publish_authorization_snapshot(worldline_id: str, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.branch_publish_authorization_snapshot(
            worldline_id=worldline_id
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/v1/timeline/worldlines/{worldline_id}/branches/commit-draft")
def branch_commit_draft(
    worldline_id: str,
    payload: BranchCommitDraftRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.draft_branch_commit(
            worldline_id=worldline_id,
            payload=payload.model_dump(),
            idempotency_key=idempotency_key,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/v1/timeline/worldlines/{worldline_id}/branches/commit-draft")
def branch_commit_draft_snapshot(worldline_id: str, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.product_runtime_service.branch_commit_draft_snapshot(worldline_id=worldline_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/v1/quality/evaluate")
def quality_evaluate(payload: QualityEvaluateRequest, request: Request) -> Dict[str, Any]:
    bridge = _backend_team_bridge(request)
    if bridge is not None:
        bridged = bridge.quality_evaluate(payload.model_dump())
        if bridged is not None:
            return bridged
    try:
        return request.app.state.product_runtime_service.evaluate_quality(payload.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/v1/canon/commit")
def canon_commit(
    payload: CanonCommitRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
) -> Dict[str, Any]:
    bridge = _backend_team_bridge(request)
    if bridge is not None:
        bridged = bridge.canon_commit(payload.model_dump())
        if bridged is not None:
            return bridged
    return request.app.state.product_runtime_service.commit_canon(
        payload.model_dump(),
        idempotency_key=idempotency_key,
    )
