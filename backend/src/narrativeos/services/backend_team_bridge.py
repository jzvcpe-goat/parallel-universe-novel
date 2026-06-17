from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from .quality_gate import compose_quality_gate_result


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


class BackendTeamBridge:
    """Optional adapter from the current `/v1` product contract to the backend-team API.

    The bridge is deliberately conservative. If an upstream URL is not configured,
    an upstream request fails, or the upstream payload cannot be mapped into the
    current product contract, methods return ``None`` and callers keep using the
    existing local service implementation.
    """

    source_name = "backend_team_package"

    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        auth_token: Optional[str] = None,
        demo_user_id: str = "reader-free",
        timeout_seconds: float = 2.0,
    ) -> None:
        self.base_url = str(base_url or "").strip().rstrip("/")
        self.auth_token = str(auth_token or "").strip()
        self.demo_user_id = str(demo_user_id or "reader-free").strip() or "reader-free"
        self.timeout_seconds = float(timeout_seconds)

    @classmethod
    def from_env(cls) -> "BackendTeamBridge":
        return cls(
            base_url=os.getenv("NARRATIVEOS_BACKEND_TEAM_API_BASE_URL"),
            auth_token=os.getenv("NARRATIVEOS_BACKEND_TEAM_AUTH_TOKEN"),
            demo_user_id=os.getenv("NARRATIVEOS_BACKEND_TEAM_DEMO_USER_ID", "reader-free"),
            timeout_seconds=float(os.getenv("NARRATIVEOS_BACKEND_TEAM_TIMEOUT_SECONDS", "2.0")),
        )

    @property
    def enabled(self) -> bool:
        return bool(self.base_url)

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "base_url_configured": bool(self.base_url),
            "source": self.source_name,
            "mode": "upstream" if self.enabled else "local_contract",
        }

    def reader_worlds(self) -> Optional[Dict[str, Any]]:
        data = self._request_json("GET", "/worldlines")
        records = _as_list(data)
        if not records:
            return None
        worlds = []
        for record in records:
            item = _as_dict(record)
            world_id = _clean(item.get("id") or item.get("worldline_id"))
            if not world_id:
                continue
            created_at = _clean(item.get("created_at"), _utcnow())
            worlds.append(
                {
                    "world_id": world_id,
                    "title": _clean(item.get("title"), world_id),
                    "status": "published",
                    "latest_version": world_id,
                    "genres": [tag for tag in [_clean(item.get("emotional_tone")), _clean(item.get("divergence_event"))] if tag],
                    "risk_rating": None,
                    "trial_available": True,
                    "access_state": "available",
                    "created_at": created_at,
                    "updated_at": created_at,
                    "integration_source": self.source_name,
                }
            )
        if not worlds:
            return None
        return self._with_source({"worlds": worlds}, "/worldlines")

    def reader_world_detail(self, world_id: str) -> Optional[Dict[str, Any]]:
        data = self._request_json("GET", f"/worldlines/{world_id}")
        detail = _as_dict(data)
        if not detail:
            return None
        worldline = _as_dict(detail.get("worldline") or detail)
        resolved_world_id = _clean(worldline.get("id") or worldline.get("worldline_id"), world_id)
        chapters = _as_list(detail.get("chapters"))
        scenes = _as_list(detail.get("scenes"))
        created_at = _clean(worldline.get("created_at"), _utcnow())
        return self._with_source(
            {
                "world_id": resolved_world_id,
                "title": _clean(worldline.get("title"), resolved_world_id),
                "world_version_id": resolved_world_id,
                "manifest": {
                    "summary": worldline.get("summary"),
                    "divergence_event": worldline.get("divergence_event"),
                    "chapter_count": len(chapters),
                    "scene_count": len(scenes),
                },
                "risk_policy": {},
                "worldpack": {
                    "title": _clean(worldline.get("title"), resolved_world_id),
                    "summary": worldline.get("summary"),
                    "emotional_tone": worldline.get("emotional_tone"),
                    "chapters": chapters,
                    "scenes": scenes,
                    "source": self.source_name,
                },
                "versions": [{"world_version_id": resolved_world_id, "status": "published", "created_at": created_at, "updated_at": created_at}],
            },
            f"/worldlines/{world_id}",
        )

    def subscription_status(self, *, account_id: Optional[str] = None, reader_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        user_id = _clean(account_id or reader_id, self.demo_user_id)
        data = self._request_json("GET", f"/entitlements/{user_id}", user_id=user_id)
        entitlement = _as_dict(data)
        if not entitlement:
            return None
        tier_id = _clean(entitlement.get("entitlement_tier"), "free")
        credits = entitlement.get("chat_credit_balance")
        try:
            credit_balance = float(credits)
        except (TypeError, ValueError):
            credit_balance = 0.0
        subscription = None
        if tier_id not in {"", "free", "beta_free"}:
            subscription = {
                "subscription_id": f"backend-team-{user_id}-{tier_id}",
                "account_id": user_id,
                "tier_id": tier_id,
                "display_name": tier_id,
                "description": "Backend-team entitlement",
                "price_usd_monthly": 0,
                "status": "active",
                "provider": self.source_name,
                "renewable": False,
            }
        return self._with_source(
            {
                "account_id": user_id,
                "subscription": subscription,
                "wallets": {
                    "story_credit": {
                        "wallet_type": "story_credit",
                        "balance": credit_balance,
                        "status": "active",
                        "tier_id": tier_id,
                    }
                },
                "effective_tier": tier_id,
                "customer_portal_available": False,
                "checkout_provider_status": {"provider": self.source_name, "configured": True, "publishable_key": None},
                "tiers": self._default_tiers(),
                "config_version": "backend_team_bridge_v1",
            },
            f"/entitlements/{user_id}",
        )

    def checkout_start(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        user_id = _clean(payload.get("account_id") or payload.get("reader_id"), self.demo_user_id)
        tier_id = _clean(payload.get("tier_id"), "play_pass")
        request_payload = {
            "user_id": user_id,
            "product_id": tier_id,
            "idempotency_key": f"{user_id}:{tier_id}",
        }
        data = self._request_json("POST", "/billing/checkout-session", json_payload=request_payload, user_id=user_id)
        if not data:
            data = self._request_json(
                "POST",
                "/billing/checkout",
                json_payload={"user_id": user_id, "product_id": tier_id, "provider_reference": request_payload["idempotency_key"]},
                user_id=user_id,
            )
        checkout = _as_dict(data)
        if not checkout:
            return None
        session_id = _clean(checkout.get("session_id") or checkout.get("purchase", {}).get("id"), f"backend-team-{tier_id}")
        return self._with_source(
            {
                "checkout": {
                    "provider": _clean(checkout.get("provider"), self.source_name),
                    "tier_id": tier_id,
                    "checkout_url": checkout.get("checkout_url"),
                    "session_id": session_id,
                    "status": "started",
                }
            },
            "/billing/checkout-session",
        )

    def scene_advance(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        worldline_id = _clean(payload.get("worldline_id"))
        scene_id = _clean(payload.get("scene_id"))
        choice_id = _clean(payload.get("choice_id"))
        user_id = _clean(payload.get("user_id") or payload.get("reader_id") or payload.get("account_id"), self.demo_user_id)
        if not (worldline_id and scene_id and choice_id):
            return None
        data = self._request_json(
            "POST",
            "/scene/advance",
            json_payload={"worldline_id": worldline_id, "scene_id": scene_id, "choice_id": choice_id, "user_id": user_id},
            user_id=user_id,
        )
        upstream = _as_dict(data)
        if not upstream:
            return None
        next_scene = _as_dict(upstream.get("next_scene"))
        new_worldline = _as_dict(upstream.get("new_worldline"))
        body = _clean(next_scene.get("content"), "上游后端已推进场景。")
        return self._with_source(
            {
                "status": "ok",
                "session_id": _clean(payload.get("session_id"), worldline_id),
                "world_id": _clean(new_worldline.get("id") or next_scene.get("worldline_id"), worldline_id),
                "world_version_id": _clean(new_worldline.get("id") or next_scene.get("worldline_id"), worldline_id),
                "candidate_scene": {
                    "status": "candidate",
                    "chapter_view": {
                        "sessionId": _clean(payload.get("session_id"), worldline_id),
                        "worldId": worldline_id,
                        "worldVersionId": worldline_id,
                        "chapterId": _clean(next_scene.get("id"), scene_id),
                        "chapterIndex": 1,
                        "chapterTitle": _clean(next_scene.get("title"), "下一幕"),
                        "body": body,
                        "relationshipHints": [],
                        "choices": _as_list(next_scene.get("choices")),
                        "canContinue": True,
                        "paywall": {"required": False},
                    },
                    "reader_view": {"body": body, "title": next_scene.get("title"), "choices": next_scene.get("choices")},
                },
                "quality_brake": self._quality_gate("pass", 0.78, []),
                "harness_trace": [
                    {"step": "plan", "status": "done", "detail": "Mapped current /v1 scene request to backend-team scene advance."},
                    {"step": "draft", "status": "done", "detail": "Received next scene from backend-team API."},
                    {"step": "tool/eval", "status": "waiting", "detail": "Quality evaluation remains a separate compatibility call."},
                    {"step": "confirm", "status": "waiting", "detail": "Canon commit still requires explicit confirmation."},
                ],
                "raw_continue": upstream,
            },
            "/scene/advance",
        )

    def worldline_events(self, worldline_id: str) -> Optional[Dict[str, Any]]:
        data = self._request_json("GET", f"/story-projects/{worldline_id}/time-candidate-events")
        events = _as_list(data)
        path = f"/story-projects/{worldline_id}/time-candidate-events"
        if not events:
            detail = _as_dict(self._request_json("GET", f"/worldlines/{worldline_id}"))
            events = _as_list(detail.get("story_events")) or _as_list(detail.get("scenes"))
            path = f"/worldlines/{worldline_id}"
        if not events:
            return None
        mapped = []
        for index, event in enumerate(events, start=1):
            item = _as_dict(event)
            mapped.append(
                {
                    "id": _clean(item.get("id"), f"backend_event_{index}"),
                    "chapter_index": item.get("chapter_index") or index,
                    "type": _clean(item.get("event_type") or item.get("source"), "backend_team_event"),
                    "title": _clean(item.get("action") or item.get("summary") or item.get("title"), f"事件 {index}"),
                    "intensity": 0.72 if item.get("status") in {"selected", "materialized"} else 0.48,
                    "state": _clean(item.get("status"), "candidate"),
                    "choice_text": item.get("motivation") or item.get("evidence_hint"),
                    "tags": [tag for tag in [_clean(item.get("actor")), _clean(item.get("target"))] if tag],
                    "created_at": _clean(item.get("created_at"), _utcnow()),
                }
            )
        return self._with_source(
            {
                "worldline_id": worldline_id,
                "world_id": worldline_id,
                "source": "backend_team_events",
                "event_count": len(mapped),
                "events": mapped,
                "density_summary": {
                    "mode": "backend_team_bridge",
                    "burst_count": sum(1 for event in mapped if float(event["intensity"]) >= 0.72),
                    "aftershock_count": max(0, len(mapped) - 1),
                },
            },
            path,
        )

    def quality_evaluate(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        body = _clean(payload.get("body"))
        if not body:
            return None
        user_id = _clean(payload.get("account_id") or payload.get("reader_id"), self.demo_user_id)
        report = self._request_json(
            "POST",
            "/content/safety/check",
            json_payload={
                "user_id": user_id,
                "text": body,
                "target_type": "candidate_scene",
                "target_id": payload.get("candidate_id"),
                "worldline_id": payload.get("world_id") or payload.get("world_version_id"),
            },
            user_id=user_id,
        )
        safety = _as_dict(report)
        if not safety:
            return None
        severity = _clean(safety.get("severity"), "allow")
        decision = "block" if severity == "block" else ("rewrite" if severity == "review" else "pass")
        issues = []
        if decision != "pass":
            issues.append({"severity": "high" if decision == "block" else "warning", "issue_code": "content_safety", "summary": safety.get("summary")})
        mapped_report = {
            "chapter_id": _clean(payload.get("candidate_id"), f"candidate_{abs(hash(body))}"),
            "decision": {"decision": decision, "reason": safety.get("summary") or "backend_team_content_safety"},
            "issues": issues,
            "scores": {"overall_score": 0.9 if decision == "pass" else 0.52},
            "upstream_report": safety,
        }
        return self._with_source(
            {
                "status": "evaluated",
                "report": mapped_report,
                "quality_gate": self._quality_gate(
                    decision,
                    mapped_report["scores"]["overall_score"],
                    [issue["issue_code"] for issue in issues],
                    report=mapped_report,
                ),
            },
            "/content/safety/check",
        )

    def canon_commit(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not bool(payload.get("confirmed")):
            return None
        worldline_id = _clean(payload.get("worldline_id") or payload.get("world_id") or payload.get("session_id"))
        if not worldline_id:
            return None
        user_id = _clean(payload.get("confirmed_by"), self.demo_user_id)
        candidate = self._request_json(
            "POST",
            "/release/candidates",
            json_payload={"worldline_id": worldline_id, "target_chapters": 1, "notes": "Committed through current /v1 compatibility bridge."},
            user_id=user_id,
        )
        record = _as_dict(candidate)
        if not record:
            return None
        return self._with_source(
            {
                "status": "committed" if record.get("status") in {"ready", "approved"} else "blocked",
                "commit_id": _clean(record.get("id"), f"backend_team_commit_{worldline_id}"),
                "target_status": payload.get("target_status") or "canon",
                "candidate_id": payload.get("candidate_id"),
                "session_id": payload.get("session_id"),
                "world_id": payload.get("world_id"),
                "world_version_id": payload.get("world_version_id"),
                "chapter_id": payload.get("chapter_id"),
                "confirmed_by": user_id,
                "quality_gate": self._quality_gate("pass" if record.get("status") in {"ready", "approved"} else "rewrite", None, record.get("issues") or []),
                "upstream_release_candidate": record,
                "created_at": _utcnow(),
            },
            "/release/candidates",
        )

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        json_payload: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
    ) -> Optional[Any]:
        if not self.enabled:
            return None
        headers = {"Accept": "application/json", "X-User-Id": _clean(user_id, self.demo_user_id)}
        if json_payload is not None:
            headers["Content-Type"] = "application/json"
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        try:
            with httpx.Client(base_url=self.base_url, timeout=self.timeout_seconds) as client:
                response = client.request(method, path, json=json_payload, headers=headers)
            if not 200 <= response.status_code < 300:
                return None
            return response.json()
        except Exception:
            return None

    def _with_source(self, payload: Dict[str, Any], path: str) -> Dict[str, Any]:
        return {
            **payload,
            "capability_mode": "backend_team_bridge",
            "integration_source": self.source_name,
            "upstream": {"service": self.source_name, "path": path},
        }

    def _quality_gate(
        self,
        decision: str,
        score: Optional[float],
        blocking_reasons: List[Any],
        *,
        report: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return compose_quality_gate_result(
            report,
            decision=decision,
            score=score,
            blocking_reasons=blocking_reasons,
            source=self.source_name,
        )

    def _default_tiers(self) -> List[Dict[str, Any]]:
        return [
            {
                "tier_id": "play_pass",
                "display_name": "读者通行证",
                "description": "解锁阅读和基础选择。",
                "price_usd_monthly": 0,
                "reader_access": True,
                "author_access": "none",
                "monthly_story_credits": 100,
                "monthly_studio_credits": 0,
                "capabilities": {"reader": True, "creator": False, "studio": False},
            },
            {
                "tier_id": "creator_pass",
                "display_name": "创作通行证",
                "description": "解锁创作助手和作品沉淀。",
                "price_usd_monthly": 0,
                "reader_access": True,
                "author_access": "basic",
                "monthly_story_credits": 300,
                "monthly_studio_credits": 20,
                "capabilities": {"reader": True, "creator": True, "studio": False},
            },
            {
                "tier_id": "studio_pass",
                "display_name": "工作室通行证",
                "description": "解锁团队工作台和发布门禁。",
                "price_usd_monthly": 0,
                "reader_access": True,
                "author_access": "studio",
                "monthly_story_credits": 1000,
                "monthly_studio_credits": 200,
                "capabilities": {"reader": True, "creator": True, "studio": True},
            },
        ]
