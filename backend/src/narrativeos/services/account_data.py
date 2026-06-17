from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from .account_snapshot import AccountSnapshotService
from .billing import BillingService
from .creator_dialogue import CreatorDialogueService


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class AccountDataService:
    """Public account data governance surface.

    The service intentionally exposes user-readable export/delete state only.
    Raw token hashes, password hashes, provider payloads, migration diagnostics
    and refund/dispute workflows remain in Studio/Ops.
    """

    def __init__(
        self,
        repository: Any,
        *,
        billing_service: BillingService,
        creator_dialogue_service: CreatorDialogueService,
        account_snapshot_service: AccountSnapshotService,
    ) -> None:
        self.repository = repository
        self.billing_service = billing_service
        self.creator_dialogue_service = creator_dialogue_service
        self.account_snapshot_service = account_snapshot_service

    def export_account_data(self, *, identity: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        account = self._require_account(identity)
        snapshot = self.account_snapshot_service.build_snapshot(
            account_id=account["account_id"],
            creator_id=account["actor_id"],
            identity=identity,
        )
        reader_sessions = self.repository.list_reader_sessions(reader_id=account["account_id"])
        creator_drafts = self.creator_dialogue_service.list_sessions(creator_id=account["actor_id"], limit=50)
        subscriptions = self.repository.list_subscriptions(account_id=account["account_id"])
        tokens = self.repository.list_auth_tokens(actor_id=account["actor_id"], account_id=account["account_id"])
        package = {
            "export_id": "account_export_%s" % _utcnow().replace(":", "").replace(".", ""),
            "generated_at": _utcnow(),
            "account": {
                "account_id": account["account_id"],
                "actor_id": account["actor_id"],
                "display_name": account.get("display_name"),
                "actor_role": account.get("actor_role"),
            },
            "summary": {
                "reader_session_count": len(reader_sessions),
                "creator_draft_count": len(creator_drafts),
                "subscription_count": len(subscriptions),
                "active_session_count": len([item for item in tokens if item.get("status") == "active"]),
            },
            "reader_sessions": reader_sessions,
            "creator_drafts": creator_drafts,
            "subscriptions": [
                {
                    "subscription_id": item.get("subscription_id"),
                    "tier_id": item.get("tier_id"),
                    "status": item.get("status"),
                    "provider": item.get("provider"),
                    "period_start": item.get("period_start"),
                    "period_end": item.get("period_end"),
                    "cancel_at_period_end": item.get("cancel_at_period_end"),
                }
                for item in subscriptions
            ],
            "sessions": [
                {
                    "token_id": item.get("token_id"),
                    "status": item.get("status"),
                    "created_at": item.get("created_at"),
                    "expires_at": item.get("expires_at"),
                    "last_used_at": item.get("last_used_at"),
                }
                for item in tokens
            ],
            "resume_snapshot": snapshot,
            "retention_policy": {
                "reader_progress": "included_until_account_deletion",
                "creator_drafts": "included_until_account_deletion",
                "subscription_records": "retained_as_billing_record_after_account_closure",
                "provider_payloads": "ops_only",
            },
        }
        return {
            "public_safe": True,
            "public_state": "ready",
            "filename": "parallel-universe-account-export.json",
            "content_type": "application/json",
            "summary": package["summary"],
            "package": package,
            "message": "你的账号数据已经整理好，可以保存为 JSON 文件。",
        }

    def preview_account_deletion(self, *, identity: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        account = self._require_account(identity)
        reader_sessions = self.repository.list_reader_sessions(reader_id=account["account_id"])
        creator_drafts = self.creator_dialogue_service.list_sessions(creator_id=account["actor_id"], limit=50)
        subscriptions = self.repository.list_subscriptions(account_id=account["account_id"])
        active_subscriptions = [
            item
            for item in subscriptions
            if item.get("status") in {"trialing", "active", "past_due"}
        ]
        tokens = self.repository.list_auth_tokens(actor_id=account["actor_id"], account_id=account["account_id"])
        return {
            "public_safe": True,
            "public_state": "requires_confirmation",
            "account": {
                "account_id": account["account_id"],
                "actor_id": account["actor_id"],
                "display_name": account.get("display_name"),
            },
            "summary": {
                "reader_session_count": len(reader_sessions),
                "creator_draft_count": len(creator_drafts),
                "active_subscription_count": len(active_subscriptions),
                "active_session_count": len([item for item in tokens if item.get("status") == "active"]),
            },
            "consequences": [
                {"kind": "reader_progress", "label": "阅读进度", "count": len(reader_sessions), "action": "delete"},
                {"kind": "creator_drafts", "label": "创作草稿", "count": len(creator_drafts), "action": "delete"},
                {
                    "kind": "membership",
                    "label": "会员权益",
                    "count": len(active_subscriptions),
                    "action": "mark_for_account_closure",
                },
                {"kind": "sessions", "label": "登录状态", "count": len(tokens), "action": "revoke"},
            ],
            "confirmation_required": "删除账号",
            "message": "删除账号会清除阅读进度和创作草稿，并退出当前登录。会员记录会保留为账务记录。",
        }

    def confirm_account_deletion(
        self,
        *,
        identity: Optional[Dict[str, Any]],
        confirmation: str,
    ) -> Dict[str, Any]:
        account = self._require_account(identity)
        if str(confirmation or "").strip() not in {"删除账号", "DELETE"}:
            raise ValueError("account_delete_confirmation_required")
        reader_result = self.repository.delete_reader_sessions(reader_id=account["account_id"])
        creator_result = self.creator_dialogue_service.delete_sessions(creator_id=account["actor_id"])
        subscription_result = self.repository.mark_account_subscriptions_for_closure(account_id=account["account_id"])
        token_result = self.repository.revoke_auth_tokens(actor_id=account["actor_id"], account_id=account["account_id"])
        identity_result = self.repository.update_auth_identity_status(account["actor_id"], status="deleted")
        return {
            "public_safe": True,
            "public_state": "deleted",
            "account": {
                "account_id": account["account_id"],
                "actor_id": account["actor_id"],
                "status": identity_result.get("status"),
            },
            "summary": {
                "reader_sessions_deleted": reader_result.get("deleted_sessions", 0),
                "reader_chapters_deleted": reader_result.get("deleted_chapters", 0),
                "reader_choices_deleted": reader_result.get("deleted_choices", 0),
                "creator_drafts_deleted": creator_result.get("deleted_count", 0),
                "subscriptions_marked_for_closure": subscription_result.get("updated_count", 0),
                "sessions_revoked": token_result.get("revoked_count", 0),
            },
            "retained_records": [
                "billing_subscription_record",
                "billing_checkout_record",
                "billing_lifecycle_record",
            ],
            "message": "账号已删除，当前登录也已退出。账务记录会按合规要求保留。",
        }

    def _require_account(self, identity: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if not identity:
            raise PermissionError("sign_in_required")
        actor_id = str(identity.get("actor_id") or "").strip()
        account_id = str(identity.get("account_id") or actor_id).strip()
        if not actor_id or not account_id:
            raise PermissionError("sign_in_required")
        return {
            "actor_id": actor_id,
            "account_id": account_id,
            "actor_role": identity.get("actor_role"),
            "display_name": identity.get("display_name"),
            "token_id": identity.get("token_id"),
        }
