from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel


class AccountMergePreviewRequest(BaseModel):
    guest_reader_id: Optional[str] = None
    guest_creator_id: Optional[str] = None
    include_diagnostics: bool = False


class AccountMergeConfirmRequest(BaseModel):
    guest_reader_id: Optional[str] = None
    guest_creator_id: Optional[str] = None
    resolution: str = "keep_all_latest_first"


class AccountDeleteConfirmRequest(BaseModel):
    confirmation: str


router = APIRouter(prefix="/v1/account", tags=["account"])


def _optional_identity(request: Request) -> Optional[Dict[str, Any]]:
    authorization = request.headers.get("Authorization") or ""
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        return request.app.state.auth_service.resolve_bearer_token(token)
    except Exception:
        return None


@router.get("/snapshot")
def account_snapshot(
    request: Request,
    account_id: Optional[str] = None,
    reader_id: Optional[str] = None,
    creator_id: Optional[str] = None,
    include_diagnostics: bool = False,
) -> Dict[str, Any]:
    identity = _optional_identity(request)
    if identity:
        account_id = account_id or identity.get("account_id") or identity.get("actor_id")
        creator_id = creator_id or identity.get("actor_id")
    return request.app.state.account_snapshot_service.build_snapshot(
        account_id=account_id,
        reader_id=reader_id,
        creator_id=creator_id,
        identity=identity,
        include_diagnostics=include_diagnostics,
    )


@router.post("/merge/preview")
def account_merge_preview(payload: AccountMergePreviewRequest, request: Request) -> Dict[str, Any]:
    identity = _optional_identity(request)
    return request.app.state.account_merge_service.preview_merge(
        identity=identity,
        guest_reader_id=payload.guest_reader_id,
        guest_creator_id=payload.guest_creator_id,
        include_diagnostics=payload.include_diagnostics,
    )


@router.post("/merge/confirm")
def account_merge_confirm(payload: AccountMergeConfirmRequest, request: Request) -> Dict[str, Any]:
    identity = _optional_identity(request)
    try:
        return request.app.state.account_merge_service.confirm_merge(
            identity=identity,
            guest_reader_id=payload.guest_reader_id,
            guest_creator_id=payload.guest_creator_id,
            resolution=payload.resolution,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail={"code": "sign_in_required", "reason": str(exc)}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"code": "account_merge_invalid", "reason": str(exc)}) from exc


@router.get("/data/export")
def account_data_export(request: Request) -> Dict[str, Any]:
    identity = _optional_identity(request)
    try:
        return request.app.state.account_data_service.export_account_data(identity=identity)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail={"code": "sign_in_required", "reason": str(exc)}) from exc


@router.post("/delete/preview")
def account_delete_preview(request: Request) -> Dict[str, Any]:
    identity = _optional_identity(request)
    try:
        return request.app.state.account_data_service.preview_account_deletion(identity=identity)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail={"code": "sign_in_required", "reason": str(exc)}) from exc


@router.post("/delete/confirm")
def account_delete_confirm(payload: AccountDeleteConfirmRequest, request: Request) -> Dict[str, Any]:
    identity = _optional_identity(request)
    try:
        return request.app.state.account_data_service.confirm_account_deletion(
            identity=identity,
            confirmation=payload.confirmation,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail={"code": "sign_in_required", "reason": str(exc)}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"code": "account_delete_invalid", "reason": str(exc)}) from exc
