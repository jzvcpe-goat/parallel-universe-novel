from __future__ import annotations

from typing import Any, Dict, List, Optional

from .account_snapshot import AccountSnapshotService
from .billing import BillingService
from .creator_dialogue import CreatorDialogueService


def _clean(value: Any, fallback: str = "") -> str:
    return str(value or fallback).strip()


class AccountMergeService:
    """Move the current browser profile into a signed-in account.

    The public contract is intentionally small: preview tells the product what
    can be merged, confirm performs the ownership update. Internal repair logs
    and data-store details belong in Ops services, not in this response.
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

    def preview_merge(
        self,
        *,
        identity: Optional[Dict[str, Any]],
        guest_reader_id: Optional[str],
        guest_creator_id: Optional[str],
        include_diagnostics: bool = False,
    ) -> Dict[str, Any]:
        if not identity:
            return self._requires_login_response(
                guest_reader_id=guest_reader_id,
                guest_creator_id=guest_creator_id,
            )

        target = self._target_identity(identity)
        browser = self._browser_profile(
            guest_reader_id=guest_reader_id,
            guest_creator_id=guest_creator_id,
        )
        reader_sessions = self._reader_sessions_for(browser["reader_id"])
        creator_drafts = self.creator_dialogue_service.list_sessions(
            creator_id=browser["creator_id"],
            limit=50,
        )
        target_reader_sessions = self._reader_sessions_for(target["reader_id"])
        target_creator_drafts = self.creator_dialogue_service.list_sessions(
            creator_id=target["creator_id"],
            limit=50,
        )
        conflicts = self._conflicts(
            guest_reader_sessions=reader_sessions,
            account_reader_sessions=target_reader_sessions,
            guest_creator_drafts=creator_drafts,
            account_creator_drafts=target_creator_drafts,
        )
        membership = self.billing_service.subscription_status(account_id=target["account_id"])
        membership_status = str((membership.get("subscription") or {}).get("status") or "free")
        merge_available = bool(reader_sessions or creator_drafts)
        public_state = "no_data"
        if conflicts:
            public_state = "needs_review"
        elif merge_available:
            public_state = "ready_to_merge"

        response = {
            "public_safe": True,
            "public_state": public_state,
            "account": {
                "account_id": target["account_id"],
                "reader_id": target["reader_id"],
                "creator_id": target["creator_id"],
                "display_name": target["display_name"],
                "auth_state": "signed_in",
            },
            "browser_profile": {
                "reader_id": browser["reader_id"],
                "creator_id": browser["creator_id"],
                "merge_available": merge_available,
            },
            "summary": {
                "reader_progress_count": len(reader_sessions),
                "creator_draft_count": len(creator_drafts),
                "story_project_ref_count": 0,
                "membership_status": membership_status,
            },
            "merge_actions": self._merge_actions(
                reader_count=len(reader_sessions),
                draft_count=len(creator_drafts),
                membership_status=membership_status,
            ),
            "conflicts": conflicts,
            "recommended_action": self._recommended_action(public_state),
            "message": self._message(public_state),
        }
        if include_diagnostics:
            response["diagnostics"] = {
                "target_reader_session_count": len(target_reader_sessions),
                "target_creator_draft_count": len(target_creator_drafts),
            }
        return response

    def confirm_merge(
        self,
        *,
        identity: Optional[Dict[str, Any]],
        guest_reader_id: Optional[str],
        guest_creator_id: Optional[str],
        resolution: str = "keep_all_latest_first",
    ) -> Dict[str, Any]:
        if not identity:
            raise PermissionError("sign_in_required")
        target = self._target_identity(identity)
        browser = self._browser_profile(
            guest_reader_id=guest_reader_id,
            guest_creator_id=guest_creator_id,
        )
        before = self.preview_merge(
            identity=identity,
            guest_reader_id=browser["reader_id"],
            guest_creator_id=browser["creator_id"],
        )
        reader_merge = self.repository.reassign_reader_sessions(
            from_reader_id=browser["reader_id"],
            to_reader_id=target["reader_id"],
        )
        creator_merge = self.creator_dialogue_service.reassign_sessions(
            from_creator_id=browser["creator_id"],
            to_creator_id=target["creator_id"],
        )
        snapshot = self.account_snapshot_service.build_snapshot(
            account_id=target["account_id"],
            reader_id=target["reader_id"],
            creator_id=target["creator_id"],
            identity=identity,
        )
        return {
            "public_safe": True,
            "public_state": "merged",
            "account": before["account"],
            "browser_profile": before["browser_profile"],
            "summary": {
                "reader_progress_merged": reader_merge["updated_count"],
                "creator_drafts_merged": creator_merge["updated_count"],
                "story_project_refs_merged": 0,
                "membership_status": snapshot["membership"]["status"],
            },
            "conflicts": before["conflicts"],
            "resolution": resolution,
            "resume_action": snapshot["resume_action"],
            "snapshot": snapshot,
            "message": "本机档案已经合并到账号，可以继续阅读或继续创作。",
        }

    def _target_identity(self, identity: Dict[str, Any]) -> Dict[str, str]:
        actor_id = _clean(identity.get("actor_id"), "signed_in_user")
        account_id = _clean(identity.get("account_id"), actor_id)
        return {
            "account_id": account_id,
            "reader_id": account_id,
            "creator_id": actor_id,
            "display_name": _clean(identity.get("display_name"), actor_id),
        }

    def _browser_profile(self, *, guest_reader_id: Optional[str], guest_creator_id: Optional[str]) -> Dict[str, str]:
        reader_id = _clean(guest_reader_id, "web_reader_demo")
        creator_id = _clean(guest_creator_id, "web_creator")
        return {
            "reader_id": reader_id,
            "creator_id": creator_id,
        }

    def _reader_sessions_for(self, reader_id: str) -> List[Dict[str, Any]]:
        if not reader_id:
            return []
        matches: List[Dict[str, Any]] = []
        for item in self.repository.list_sessions():
            session_id = str(item.get("session_id") or "")
            if not session_id:
                continue
            try:
                session_record = self.repository.get_session(session_id)
            except KeyError:
                continue
            session_reader_id = _clean(
                session_record.metadata.get("reader_id")
                or session_record.player_profile.get("reader_id")
            )
            if session_reader_id != reader_id:
                continue
            matches.append(
                {
                    "session_id": session_id,
                    "world_id": session_record.world_id,
                    "updated_at": item.get("updated_at") or item.get("created_at") or session_record.created_at,
                }
            )
        matches.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        return matches

    def _conflicts(
        self,
        *,
        guest_reader_sessions: List[Dict[str, Any]],
        account_reader_sessions: List[Dict[str, Any]],
        guest_creator_drafts: List[Dict[str, Any]],
        account_creator_drafts: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        conflicts: List[Dict[str, Any]] = []
        guest_worlds = {str(item.get("world_id") or "") for item in guest_reader_sessions}
        account_worlds = {str(item.get("world_id") or "") for item in account_reader_sessions}
        if guest_worlds.intersection(account_worlds):
            conflicts.append(
                {
                    "type": "reader_progress",
                    "label": "同一作品已有两份进度",
                    "severity": "review",
                    "resolution": "保留两份进度，继续入口按最近更新排序。",
                }
            )
        guest_titles = {str((item.get("setting_cards") or {}).get("seed") or "").strip() for item in guest_creator_drafts}
        account_titles = {str((item.get("setting_cards") or {}).get("seed") or "").strip() for item in account_creator_drafts}
        if guest_titles.intersection({title for title in account_titles if title}):
            conflicts.append(
                {
                    "type": "creator_draft",
                    "label": "同名草稿需要确认",
                    "severity": "review",
                    "resolution": "保留两份草稿，进入创作页后选择继续哪一份。",
                }
            )
        return conflicts

    def _merge_actions(self, *, reader_count: int, draft_count: int, membership_status: str) -> List[Dict[str, Any]]:
        actions: List[Dict[str, Any]] = []
        if reader_count:
            actions.append({"kind": "reader_progress", "label": "阅读进度", "count": reader_count})
        if draft_count:
            actions.append({"kind": "creator_drafts", "label": "创作草稿", "count": draft_count})
        actions.append(
            {
                "kind": "membership",
                "label": "会员权益",
                "count": 1 if membership_status == "active" else 0,
                "action": "keep_account_entitlements",
            }
        )
        return actions

    def _recommended_action(self, public_state: str) -> str:
        if public_state == "needs_review":
            return "review_and_confirm"
        if public_state == "ready_to_merge":
            return "confirm_merge"
        return "continue"

    def _message(self, public_state: str) -> str:
        if public_state == "needs_review":
            return "发现本机档案和账号里都有进度，确认后会保留两边内容。"
        if public_state == "ready_to_merge":
            return "发现当前浏览器里的阅读进度或创作草稿，可以合并到账号。"
        return "当前没有需要合并的本机档案。"

    def _requires_login_response(
        self,
        *,
        guest_reader_id: Optional[str],
        guest_creator_id: Optional[str],
    ) -> Dict[str, Any]:
        browser = self._browser_profile(
            guest_reader_id=guest_reader_id,
            guest_creator_id=guest_creator_id,
        )
        return {
            "public_safe": True,
            "public_state": "requires_login",
            "account": None,
            "browser_profile": {
                **browser,
                "merge_available": False,
            },
            "summary": {
                "reader_progress_count": 0,
                "creator_draft_count": 0,
                "story_project_ref_count": 0,
                "membership_status": "unknown",
            },
            "merge_actions": [],
            "conflicts": [],
            "recommended_action": "sign_in",
            "message": "登录后可以把当前浏览器档案合并到账号。",
        }
