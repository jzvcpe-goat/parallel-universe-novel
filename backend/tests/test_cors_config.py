from pathlib import Path

from fastapi.testclient import TestClient

from src.narrativeos.api import create_app
from src.narrativeos.repository import SQLAlchemyRepository


def test_app_sets_cors_headers_for_known_frontend_origin(tmp_path: Path, monkeypatch):
    monkeypatch.setenv(
        "NARRATIVEOS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://rhdrrmzncad2e.ok.kimi.link",
    )
    monkeypatch.delenv("NARRATIVEOS_ALLOWED_ORIGIN_REGEX", raising=False)
    app = create_app(repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "cors.db")))
    client = TestClient(app)

    response = client.options(
        "/health",
        headers={
            "Origin": "https://rhdrrmzncad2e.ok.kimi.link",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://rhdrrmzncad2e.ok.kimi.link"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_app_allows_configured_vercel_preview_origin_regex(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("NARRATIVEOS_ALLOWED_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv(
        "NARRATIVEOS_ALLOWED_ORIGIN_REGEX",
        r"https://(([a-z0-9-]+\.)?parallel-universe-novel-[a-z0-9-]+|app-[a-z0-9-]+)\.vercel\.app",
    )
    app = create_app(repository=SQLAlchemyRepository(database_url="sqlite:///%s" % (tmp_path / "cors_regex.db")))
    client = TestClient(app)

    response = client.options(
        "/v1/reader/subscription",
        headers={
            "Origin": "https://app-git-p19-durhamjames-6686.vercel.app",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://app-git-p19-durhamjames-6686.vercel.app"
    assert response.headers["access-control-allow-credentials"] == "true"
