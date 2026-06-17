from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Protocol


Cadence = Literal["weekly", "monthly"]


MARKET_TREND_FUNCTION_SCHEMA: Dict[str, Any] = {
    "name": "scan_market_trends",
    "description": "Scan hot fiction topic directions and refresh template recommendation weights.",
    "parameters": {
        "type": "object",
        "properties": {
            "cadence": {
                "type": "string",
                "enum": ["weekly", "monthly"],
                "description": "Weekly scans tune homepage and creator ordering; monthly scans recalibrate template weights.",
            },
            "force": {
                "type": "boolean",
                "description": "Force a refresh outside the normal schedule.",
            },
        },
        "required": ["cadence"],
    },
}


MARKET_TREND_SCAN_SCHEDULE: Dict[str, Dict[str, Any]] = {
    "weekly": {
        "cadence": "weekly",
        "cron": "0 8 * * MON",
        "window_days": 7,
        "timezone": "Asia/Shanghai",
        "product_effect": "refresh_homepage_recommendations_and_creator_template_order",
    },
    "monthly": {
        "cadence": "monthly",
        "cron": "0 8 1 * *",
        "window_days": 30,
        "timezone": "Asia/Shanghai",
        "product_effect": "recalibrate_template_weights_and_new_template_candidates",
    },
}


MARKET_TREND_SNAPSHOT: List[Dict[str, Any]] = [
    {
        "id": "urban-brain-system",
        "rank": 1,
        "label": "脑洞都市",
        "category": "都市脑洞",
        "sample": "反内卷、摸鱼变强、异能反转",
        "signals": ["系统流", "都市异能", "快节奏", "情绪宣泄"],
        "tone": "高热",
        "heat": 98,
        "template_id": "algorithm-city",
        "template_title": "算法城市",
        "hooks": "身份错位、记忆备份、自我定义",
        "keywords": "算法城市、备份人格、都市高压、异常规则",
    },
    {
        "id": "western-dungeon-crossing",
        "rank": 2,
        "label": "西幻穿越",
        "category": "西方玄幻",
        "sample": "异大陆、地下城、圣堂博弈",
        "signals": ["穿越", "西方玄幻", "地下城现实化", "非游戏化"],
        "tone": "高热",
        "heat": 97,
        "template_id": "black-gate-translator",
        "template_title": "黑门译者",
        "hooks": "异大陆求生、地下城祷文、圣堂与佣兵利益冲突",
        "keywords": "西方玄幻、穿越、地下城、非游戏化、本土网文、小人物破局",
    },
    {
        "id": "xuanhuan-suspense-rules",
        "rank": 3,
        "label": "玄幻悬疑",
        "category": "玄幻悬疑",
        "sample": "灯塔、古契、失落王朝",
        "signals": ["规则怪谈", "中式恐怖", "禁忌真相", "命运反转"],
        "tone": "强悬疑",
        "heat": 96,
        "template_id": "beacon-beyond",
        "template_title": "灯塔之外",
        "hooks": "命运反转、禁忌真相、王朝旧债",
        "keywords": "灯塔、古契、失落王朝、真相代价",
    },
    {
        "id": "urban-cold-case",
        "rank": 4,
        "label": "都市谜案",
        "category": "现实悬疑",
        "sample": "雨夜、旧案、证据反转",
        "signals": ["冷案重启", "社会派推理", "证据冲突", "身份互保"],
        "tone": "上升",
        "heat": 91,
        "template_id": "rain-bridge",
        "template_title": "雨夜桥边",
        "hooks": "证据冲突、身份互保、真相迟到",
        "keywords": "雨夜、旧案、录像证据、证人保护",
    },
    {
        "id": "immortal-contract-politics",
        "rank": 5,
        "label": "仙侠权谋",
        "category": "仙侠修仙",
        "sample": "宗门、契书、背叛代价",
        "signals": ["宗门经营", "气运博弈", "契约代价", "虐心抉择"],
        "tone": "精选",
        "heat": 88,
        "template_id": "jade-contract",
        "template_title": "玉京契书",
        "hooks": "契约反噬、师门清算、修行债务",
        "keywords": "宗门、契书、背叛代价、修仙债务",
    },
    {
        "id": "frontier-edict-politics",
        "rank": 6,
        "label": "历史权谋",
        "category": "历史架空",
        "sample": "边城、密诏、旧臣抉择",
        "signals": ["穿越当官", "基建经营", "边塞权谋", "忠诚困局"],
        "tone": "稳热",
        "heat": 86,
        "template_id": "frontier-edict",
        "template_title": "边城密诏",
        "hooks": "密诏两难、旧臣抉择、军民自决",
        "keywords": "边城、密诏、旧臣抉择、军民自决",
    },
    {
        "id": "emotional-growth-letter",
        "rank": 7,
        "label": "情感成长",
        "category": "情感成长",
        "sample": "来信、错过、重逢选择",
        "signals": ["破镜重圆", "记忆代价", "关系成长", "真实共情"],
        "tone": "共情",
        "heat": 82,
        "template_id": "lotus-lane",
        "template_title": "莲巷来信",
        "hooks": "错过重逢、记忆代价、重新选择",
        "keywords": "来信、错过、重逢选择、记忆代价",
    },
]


@dataclass(frozen=True)
class MarketTrendScanContext:
    cadence: Cadence
    force: bool
    window_days: int
    generated_at: str


@dataclass(frozen=True)
class MarketTrendSourceResult:
    source_id: str
    status: Literal["active", "fallback", "error", "locked"]
    trends: List[Dict[str, Any]]
    message: str
    scanned_at: str
    weight: float = 1.0


class MarketTrendSourceAdapter(Protocol):
    source_id: str

    def scan(self, context: MarketTrendScanContext) -> MarketTrendSourceResult:
        ...


class CuratedSeedTrendAdapter:
    source_id = "curated_seed_snapshot"

    def __init__(self, snapshot: List[Dict[str, Any]]) -> None:
        self.snapshot = snapshot

    def scan(self, context: MarketTrendScanContext) -> MarketTrendSourceResult:
        return MarketTrendSourceResult(
            source_id=self.source_id,
            status="fallback",
            trends=[dict(item) for item in self.snapshot],
            message="Deterministic fallback remains active until licensed or editorial source adapters are configured.",
            scanned_at=context.generated_at,
            weight=1.0,
        )


class MarketTrendService:
    """Product-facing market trend index with a source-adapter scan boundary."""

    def __init__(
        self,
        snapshot: List[Dict[str, Any]] | None = None,
        adapters: List[MarketTrendSourceAdapter] | None = None,
    ) -> None:
        self.snapshot = snapshot or MARKET_TREND_SNAPSHOT
        self.adapters = adapters or [CuratedSeedTrendAdapter(self.snapshot)]

    def scan_market_trends(self, *, cadence: Cadence = "weekly", force: bool = False) -> Dict[str, Any]:
        normalized_cadence: Cadence = "monthly" if cadence == "monthly" else "weekly"
        generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        window_days = 30 if normalized_cadence == "monthly" else 7
        trend_factor = 0.94 if normalized_cadence == "monthly" else 1.0
        context = MarketTrendScanContext(
            cadence=normalized_cadence,
            force=force,
            window_days=window_days,
            generated_at=generated_at,
        )
        source_results = self._scan_sources(context)
        trends = self._aggregate_trends(source_results, cadence=normalized_cadence, trend_factor=trend_factor)
        source_status = self._source_status(source_results, trends)

        if not trends:
            fallback_result = CuratedSeedTrendAdapter(self.snapshot).scan(context)
            source_results = [fallback_result]
            trends = self._aggregate_trends(source_results, cadence=normalized_cadence, trend_factor=trend_factor)
            source_status = "curated_seed_snapshot"

        return {
            "cadence": normalized_cadence,
            "generated_at": generated_at,
            "next_refresh": "next Monday 08:00 local time" if normalized_cadence == "weekly" else "first day of next month 08:00 local time",
            "source_status": source_status,
            "scan_schedule": MARKET_TREND_SCAN_SCHEDULE,
            "function_call": {
                "name": "scan_market_trends",
                "description": MARKET_TREND_FUNCTION_SCHEMA["description"],
                "arguments": {
                    "cadence": normalized_cadence,
                    "window_days": window_days,
                    "force": force,
                },
                "schema": MARKET_TREND_FUNCTION_SCHEMA,
                "schedule": MARKET_TREND_SCAN_SCHEDULE[normalized_cadence],
                "status": "snapshot_ready" if source_status == "curated_seed_snapshot" else "adapter_scan_ready",
            },
            "source_adapters": [
                {
                    "id": result.source_id,
                    "status": result.status,
                    "handoff": result.message,
                }
                for result in source_results
            ],
            "ops": self._ops_summary(
                source_results,
                trends,
                cadence=normalized_cadence,
                window_days=window_days,
                source_status=source_status,
            ),
            "top_categories": [item["label"] for item in trends],
            "trends": trends,
            "template_recommendations": [
                {
                    "template_id": item["template_id"],
                    "template_title": item["template_title"],
                    "rank": index + 1,
                    "label": item["label"],
                    "tone": item["tone"],
                    "hooks": item["hooks"],
                    "keywords": item["keywords"],
                    "reason": f"{item['label']}热度 {item['heat']}，适合优先推荐《{item['template_title']}》。",
                }
                for index, item in enumerate(trends)
            ],
            "refresh_policy": {
                "weekly": "每周扫描题材热度，用于首页推荐和创作方向排序。",
                "monthly": "每月校准长期趋势，用于冻结模板权重和新增模板计划。",
            },
        }

    def _scan_sources(self, context: MarketTrendScanContext) -> List[MarketTrendSourceResult]:
        results: List[MarketTrendSourceResult] = []
        for adapter in self.adapters:
            try:
                results.append(adapter.scan(context))
            except Exception as exc:  # noqa: BLE001 - scheduled scans must degrade gracefully
                results.append(
                    MarketTrendSourceResult(
                        source_id=getattr(adapter, "source_id", adapter.__class__.__name__),
                        status="error",
                        trends=[],
                        message=exc.__class__.__name__,
                        scanned_at=context.generated_at,
                    )
                )
        return results

    def _aggregate_trends(
        self,
        source_results: List[MarketTrendSourceResult],
        *,
        cadence: Cadence,
        trend_factor: float,
    ) -> List[Dict[str, Any]]:
        ranked: Dict[str, Dict[str, Any]] = {}
        for result in source_results:
            if result.status == "error":
                continue
            for raw_item in result.trends:
                item = dict(raw_item)
                key = str(item.get("template_id") or item.get("id") or "").strip()
                if not key:
                    continue
                base_heat = float(item.get("heat") or 0)
                weighted_heat = base_heat * max(0.1, min(2.0, result.weight))
                existing = ranked.get(key)
                if existing is None or weighted_heat > float(existing["_weighted_heat"]):
                    ranked[key] = {
                        **item,
                        "_weighted_heat": weighted_heat,
                        "_source_rank": int(item.get("rank") or 999),
                    }

        trends = list(ranked.values())
        trends.sort(key=lambda item: (-float(item["_weighted_heat"]), int(item["_source_rank"])))
        public_trends: List[Dict[str, Any]] = []
        for index, item in enumerate(trends, start=1):
            public_item = {key: value for key, value in item.items() if not key.startswith("_")}
            public_item["rank"] = index
            public_item["heat"] = min(100, round(float(item["_weighted_heat"]) * trend_factor))
            public_item["cadence"] = cadence
            public_item["recommendation_weight"] = max(1, 101 - index)
            public_trends.append(public_item)
        return public_trends

    def _source_status(self, source_results: List[MarketTrendSourceResult], trends: List[Dict[str, Any]]) -> str:
        if not trends:
            return "curated_seed_snapshot"
        usable_results = [result for result in source_results if result.trends and result.status != "error"]
        if usable_results and all(result.source_id == "curated_seed_snapshot" for result in usable_results):
            return "curated_seed_snapshot"
        if any(result.status == "error" for result in source_results):
            return "adapter_scan_partial"
        return "adapter_scan_ready"

    def _ops_summary(
        self,
        source_results: List[MarketTrendSourceResult],
        trends: List[Dict[str, Any]],
        *,
        cadence: Cadence,
        window_days: int,
        source_status: str,
    ) -> Dict[str, Any]:
        return {
            "source_health": [
                {
                    "id": result.source_id,
                    "status": result.status,
                    "message": result.message,
                    "items": len(result.trends),
                    "scanned_at": result.scanned_at,
                }
                for result in source_results
            ],
            "audit": {
                "cadence": cadence,
                "window_days": window_days,
                "sources_attempted": len(source_results),
                "sources_succeeded": len([result for result in source_results if result.trends and result.status != "error"]),
                "sources_failed": len([result for result in source_results if result.status == "error"]),
                "dedupe_key": "template_id_or_trend_id",
                "normalization": "heat_0_100_rank_weight",
                "fallback_used": source_status == "curated_seed_snapshot",
            },
            "weight_changes": [
                {
                    "template_id": item["template_id"],
                    "rank": item["rank"],
                    "recommendation_weight": item["recommendation_weight"],
                }
                for item in trends
            ],
            "manual_locks": [],
        }
