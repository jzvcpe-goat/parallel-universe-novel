from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository
from src.narrativeos.services.market_trends import (
    MarketTrendScanContext,
    MarketTrendService,
    MarketTrendSourceResult,
)


def _client(tmp_path: Path) -> TestClient:
    app = create_app(repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "market_trends.db")))
    return TestClient(app)


def test_market_trends_expose_weekly_function_call_contract(tmp_path: Path):
    client = _client(tmp_path)

    response = client.get("/v1/market/trends", params={"cadence": "weekly"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["cadence"] == "weekly"
    assert payload["function_call"]["name"] == "scan_market_trends"
    assert payload["function_call"]["schema"]["name"] == "scan_market_trends"
    assert payload["function_call"]["schema"]["parameters"]["properties"]["cadence"]["enum"] == ["weekly", "monthly"]
    assert payload["function_call"]["schedule"]["cron"] == "0 8 * * MON"
    assert payload["function_call"]["arguments"]["window_days"] == 7
    assert payload["scan_schedule"]["weekly"]["product_effect"] == "refresh_homepage_recommendations_and_creator_template_order"
    assert payload["source_status"] == "curated_seed_snapshot"
    assert payload["ops"]["audit"]["fallback_used"] is True
    assert payload["ops"]["audit"]["dedupe_key"] == "template_id_or_trend_id"
    assert payload["ops"]["source_health"][0]["status"] == "fallback"
    assert payload["top_categories"][:3] == ["脑洞都市", "系统流", "玄幻悬疑"]
    assert {item["template_id"] for item in payload["template_recommendations"]}.issuperset(
        {
            "beacon-beyond",
            "echo-ledger",
            "rain-bridge",
            "jade-contract",
            "lotus-lane",
            "frontier-edict",
            "algorithm-city",
        }
    )


def test_market_trends_scan_supports_monthly_refresh_contract(tmp_path: Path):
    client = _client(tmp_path)

    response = client.post("/v1/market/trends/scan", json={"cadence": "monthly", "force": True})

    assert response.status_code == 200
    payload = response.json()
    assert payload["cadence"] == "monthly"
    assert payload["function_call"]["arguments"]["force"] is True
    assert payload["function_call"]["arguments"]["window_days"] == 30
    assert payload["function_call"]["schedule"]["cron"] == "0 8 1 * *"
    assert payload["scan_schedule"]["monthly"]["product_effect"] == "recalibrate_template_weights_and_new_template_candidates"
    assert payload["trends"][0]["cadence"] == "monthly"


def test_market_trends_cron_get_routes_are_scheduler_safe(tmp_path: Path):
    client = _client(tmp_path)

    weekly = client.get("/v1/market/trends/cron/weekly")
    monthly = client.get("/v1/market/trends/cron/monthly")

    assert weekly.status_code == 200
    assert monthly.status_code == 200
    assert weekly.json()["cadence"] == "weekly"
    assert monthly.json()["cadence"] == "monthly"
    assert weekly.json()["function_call"]["arguments"]["force"] is True
    assert monthly.json()["function_call"]["arguments"]["force"] is True


class _ExternalTrendAdapter:
    source_id = "licensed_feed_demo"

    def scan(self, context: MarketTrendScanContext) -> MarketTrendSourceResult:
        return MarketTrendSourceResult(
            source_id=self.source_id,
            status="active",
            scanned_at=context.generated_at,
            message="source healthy",
            weight=1.2,
            trends=[
                {
                    "id": "external-rain-bridge",
                    "rank": 8,
                    "label": "都市谜案",
                    "category": "现实悬疑",
                    "sample": "雨夜、旧案、证据反转",
                    "signals": ["旧案", "证据"],
                    "tone": "上升",
                    "heat": 95,
                    "template_id": "rain-bridge",
                    "template_title": "雨夜桥边",
                    "hooks": "证据冲突、身份互保、真相迟到",
                    "keywords": "雨夜、旧案、录像证据、证人保护",
                },
                {
                    "id": "external-frontier",
                    "rank": 12,
                    "label": "历史权谋",
                    "category": "历史架空",
                    "sample": "边城、密诏、旧臣抉择",
                    "signals": ["边塞", "权谋"],
                    "tone": "稳热",
                    "heat": 90,
                    "template_id": "frontier-edict",
                    "template_title": "边城密诏",
                    "hooks": "密诏两难、旧臣抉择、军民自决",
                    "keywords": "边城、密诏、旧臣抉择、军民自决",
                },
            ],
        )


class _FailingTrendAdapter:
    source_id = "broken_feed_demo"

    def scan(self, context: MarketTrendScanContext) -> MarketTrendSourceResult:
        raise RuntimeError("feed unavailable")


def test_market_trend_service_aggregates_source_adapters_and_audit():
    service = MarketTrendService(adapters=[_ExternalTrendAdapter(), _FailingTrendAdapter()])

    payload = service.scan_market_trends(cadence="weekly", force=True)

    assert payload["source_status"] == "adapter_scan_partial"
    assert payload["ops"]["audit"]["sources_attempted"] == 2
    assert payload["ops"]["audit"]["sources_succeeded"] == 1
    assert payload["ops"]["audit"]["sources_failed"] == 1
    assert payload["ops"]["audit"]["fallback_used"] is False
    assert payload["source_adapters"][0]["id"] == "licensed_feed_demo"
    assert payload["source_adapters"][1]["status"] == "error"
    assert payload["trends"][0]["template_id"] == "rain-bridge"
    assert payload["trends"][0]["rank"] == 1
    assert payload["trends"][0]["recommendation_weight"] == 100
    assert all(not key.startswith("_") for trend in payload["trends"] for key in trend.keys())
