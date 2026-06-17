from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field


class CommercialBlueprintRequest(BaseModel):
    creator_id: Optional[str] = None
    pen_name: Optional[str] = None
    genre: Optional[str] = None
    audience: Optional[str] = None
    commercial_goal: Optional[str] = None
    platform: Optional[str] = None
    tone: Optional[str] = None
    seed: Optional[str] = None


class CreatorDialogueSessionRequest(BaseModel):
    creator_id: Optional[str] = None
    seed: Optional[str] = None
    tone: Optional[str] = None
    target_length: Optional[str] = None
    language: str = "zh-CN"
    context: Dict[str, Any] = Field(default_factory=dict)


class CreatorDialogueTurnRequest(BaseModel):
    message: str
    context: Dict[str, Any] = Field(default_factory=dict)
    previous_session: Optional[Dict[str, Any]] = None


router = APIRouter(prefix="/v1/creator", tags=["creator"])


@router.post("/commercial-blueprint")
def create_commercial_blueprint(payload: CommercialBlueprintRequest, request: Request) -> Dict[str, Any]:
    return request.app.state.commercial_creator_service.build_blueprint(payload.model_dump())


@router.post("/dialogue/sessions")
def create_dialogue_session(payload: CreatorDialogueSessionRequest, request: Request) -> Dict[str, Any]:
    return request.app.state.creator_dialogue_service.start_session(payload.model_dump())


@router.get("/dialogue/sessions/{session_id}")
def get_dialogue_session(session_id: str, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.creator_dialogue_service.get_session(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "creator_dialogue_session_missing", "reason": str(exc)}) from exc


@router.post("/dialogue/sessions/{session_id}/turns")
def add_dialogue_turn(session_id: str, payload: CreatorDialogueTurnRequest, request: Request) -> Dict[str, Any]:
    try:
        return request.app.state.creator_dialogue_service.add_turn(session_id, payload.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "creator_dialogue_session_missing", "reason": str(exc)}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"code": "creator_dialogue_invalid_turn", "reason": str(exc)}) from exc
