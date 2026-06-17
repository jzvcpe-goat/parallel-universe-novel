from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel


Cadence = Literal["weekly", "monthly"]


class MarketTrendScanRequest(BaseModel):
    cadence: Cadence = "weekly"
    force: bool = False


router = APIRouter(prefix="/v1/market", tags=["market"])


@router.get("/trends")
def get_market_trends(request: Request, cadence: Cadence = "weekly"):
    return request.app.state.market_trend_service.scan_market_trends(cadence=cadence)


@router.post("/trends/scan")
def scan_market_trends(payload: MarketTrendScanRequest, request: Request):
    return request.app.state.market_trend_service.scan_market_trends(
        cadence=payload.cadence,
        force=payload.force,
    )


@router.get("/trends/cron/weekly")
def scan_weekly_market_trends(request: Request):
    return request.app.state.market_trend_service.scan_market_trends(cadence="weekly", force=True)


@router.get("/trends/cron/monthly")
def scan_monthly_market_trends(request: Request):
    return request.app.state.market_trend_service.scan_market_trends(cadence="monthly", force=True)
