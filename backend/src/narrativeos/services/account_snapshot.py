from __future__ import annotations

from typing import Any, Dict, List, Optional

from .billing import BillingService
from .creator_dialogue import CreatorDialogueService


def _float(value: Any) -> float:
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _world_titles(repository: Any) -> Dict[str, str]:
    titles: Dict[str, str] = {}
    for item in repository.list_worlds():
        world_id = str(item.get("world_id") or "")
        if not world_id:
            continue
        titles[world_id] = str(item.get("title") or world_id)
    return titles


class AccountSnapshotService:
    """Public account resume view across membership, reader progress and drafts.

    This service deliberately returns a product-level snapshot. Provider events,
    webhook ids, upstream user ids and repair logs remain in Studio/Ops services.
    """

    def __init__(
        self,
        repository: Any,
        *,
        billing_service: BillingService,
        creator_dialogue_service: CreatorDialogueService,
    ) -> None:
        self.repository = repository
        self.billing_service = billing_service
        self.creator_dialogue_service = creator_dialogue_service

    def build_snapshot(
        self,
        *,
        account_id: Optional[str] = None,
        reader_id: Optional[str] = None,
        creator_id: Optional[str] = None,
        identity: Optional[Dict[str, Any]] = None,
        include_diagnostics: bool = False,
    ) -> Dict[str, Any]:
        resolved_account_id = self.billing_service.resolve_account_id(
            account_id=account_id,
            reader_id=reader_id,
            author_id=creator_id,
        )
        resolved_reader_id = reader_id or resolved_account_id
        resolved_creator_id = creator_id or resolved_account_id
        subscription = self.billing_service.subscription_status(account_id=resolved_account_id)
        reader_progress = self._reader_progress(
            account_id=resolved_account_id,
            reader_id=resolved_reader_id,
        )
        creator_drafts = self._creator_drafts(creator_id=resolved_creator_id)
        membership = self._membership(subscription)
        local_fallback = self._local_fallback(reader_progress=reader_progress, creator_drafts=creator_drafts)
        resume_action = self._resume_action(reader_progress, creator_drafts, membership)

        snapshot = {
            "account": {
                "account_id": resolved_account_id,
                "reader_id": resolved_reader_id,
                "creator_id": resolved_creator_id,
                "display_name": self._display_name(identity, resolved_account_id),
                "auth_state": "signed_in" if identity else "guest_profile",
                "sync_state": "server_snapshot_ready" if (reader_progress.get("resume_available") or creator_drafts) else "browser_profile_only",
                "requires_login_for_cross_device": identity is None,
            },
            "membership": membership,
            "reader_progress": reader_progress,
            "creator_drafts": creator_drafts,
            "story_projects": {
                "status": "not_connected",
                "refs": [],
                "next_action": "promote_creator_dialogue_after_account_login",
            },
            "local_fallback": local_fallback,
            "conflicts": [],
            "resume_action": resume_action,
            "public_safe": True,
        }
        if include_diagnostics:
            snapshot["diagnostics"] = {
                "reader_session_count": reader_progress.get("session_count", 0),
                "creator_draft_count": len(creator_drafts),
                "subscription_status": (subscription.get("subscription") or {}).get("status"),
                "checkout_status": (subscription.get("checkout_session") or {}).get("status"),
            }
        return snapshot

    def _display_name(self, identity: Optional[Dict[str, Any]], account_id: str) -> str:
        if identity:
            return str(identity.get("display_name") or identity.get("actor_id") or "我的账户")
        if account_id == "web_reader_demo":
            return "网页阅读档案"
        return "我的阅读档案"

    def _membership(self, subscription: Dict[str, Any]) -> Dict[str, Any]:
        active = subscription.get("subscription") or {}
        tier_id = subscription.get("effective_tier") or active.get("tier_id") or "free"
        wallets = subscription.get("wallets") or {}
        checkout = subscription.get("checkout_session") or subscription.get("latest_checkout_session") or {}
        status = str(active.get("status") or "free")
        return {
            "status": status,
            "tier_id": tier_id,
            "label": self._tier_label(str(tier_id)),
            "story_credits": _float((wallets.get("story_credits") or {}).get("balance")),
            "studio_credits": _float((wallets.get("studio_credits") or {}).get("balance")),
            "recommended_action": subscription.get("recommended_action") or ("continue_reading" if active else "choose_plan"),
            "checkout_status": checkout.get("status"),
        }

    def _tier_label(self, tier_id: str) -> str:
        if tier_id == "play_pass":
            return "阅读会员"
        if tier_id == "creator_pass":
            return "创作会员"
        if tier_id == "studio_pass":
            return "工作室会员"
        return "免费体验"

    def _reader_progress(self, *, account_id: str, reader_id: str) -> Dict[str, Any]:
        world_titles = _world_titles(self.repository)
        matches: List[Dict[str, Any]] = []
        for item in self.repository.list_sessions():
            session_id = str(item.get("session_id") or "")
            if not session_id:
                continue
            try:
                session_record = self.repository.get_session(session_id)
            except KeyError:
                continue
            session_reader_id = str(
                session_record.metadata.get("reader_id")
                or session_record.player_profile.get("reader_id")
                or ""
            )
            if session_reader_id not in {account_id, reader_id}:
                continue
            latest_step = self.repository.get_latest_step(session_id)
            chapter_title = (
                latest_step.reader_view.chapter_title
                if latest_step and latest_step.reader_view
                else item.get("last_chapter_title")
            )
            matches.append(
                {
                    "session_id": session_id,
                    "world_id": session_record.world_id,
                    "world_title": world_titles.get(session_record.world_id, session_record.world_id),
                    "chapter_index": int(item.get("current_turn_index") or session_record.current_state.chapter_index or 0),
                    "chapter_title": chapter_title or "第 1 章",
                    "updated_at": item.get("updated_at") or item.get("created_at") or session_record.created_at,
                    "resume_available": True,
                }
            )
        matches.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        latest = matches[0] if matches else None
        return {
            "resume_available": latest is not None,
            "session_count": len(matches),
            "latest": latest,
            "recent": matches[:5],
        }

    def _creator_drafts(self, *, creator_id: str) -> List[Dict[str, Any]]:
        sessions = self.creator_dialogue_service.list_sessions(creator_id=creator_id, limit=5)
        drafts: List[Dict[str, Any]] = []
        for session in sessions:
            assistant = session.get("assistant") if isinstance(session.get("assistant"), dict) else {}
            story_text = str(assistant.get("story_text") or "")
            title = self._draft_title(session, story_text)
            drafts.append(
                {
                    "session_id": session.get("session_id"),
                    "title": title,
                    "phase": session.get("phase"),
                    "turn_count": int(session.get("turn_index") or len(session.get("turns") or [])),
                    "opening_excerpt": self._excerpt(story_text or str(assistant.get("message") or "")),
                    "updated_at": session.get("updated_at"),
                    "resume_available": True,
                }
            )
        return drafts

    def _draft_title(self, session: Dict[str, Any], story_text: str) -> str:
        cards = session.get("setting_cards") if isinstance(session.get("setting_cards"), dict) else {}
        seed = str(cards.get("seed") or "").strip()
        if seed:
            return seed[:24]
        compact = " ".join(story_text.split())
        return compact[:24] or "未命名创作"

    def _excerpt(self, value: str) -> str:
        compact = " ".join(str(value or "").split())
        return compact[:96]

    def _local_fallback(self, *, reader_progress: Dict[str, Any], creator_drafts: List[Dict[str, Any]]) -> Dict[str, Any]:
        has_server_state = bool(reader_progress.get("resume_available") or creator_drafts)
        return {
            "enabled": True,
            "merge_required": False,
            "server_state_present": has_server_state,
            "resolution": "server_snapshot_first" if has_server_state else "browser_profile_first",
            "message": "Current browser profile can be merged after sign-in.",
        }

    def _resume_action(
        self,
        reader_progress: Dict[str, Any],
        creator_drafts: List[Dict[str, Any]],
        membership: Dict[str, Any],
    ) -> Dict[str, Any]:
        if reader_progress.get("resume_available"):
            latest = reader_progress.get("latest") or {}
            return {
                "type": "continue_reading",
                "label": "继续阅读",
                "route": f"/story?world={latest.get('world_id') or 'beacon-beyond'}",
            }
        if creator_drafts:
            return {
                "type": "continue_creating",
                "label": "继续创作",
                "route": "/create",
            }
        if membership.get("status") == "free":
            return {
                "type": "choose_plan",
                "label": "选择会员方案",
                "route": "/settings",
            }
        return {
            "type": "start_reading",
            "label": "开始阅读",
            "route": "/story",
        }
