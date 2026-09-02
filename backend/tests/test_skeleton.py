from fastapi.testclient import TestClient

from app.main import app


def test_app_imports() -> None:
    assert app is not None


def test_health_endpoint_returns_200() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_contract_route_paths_are_registered() -> None:
    paths = app.openapi()["paths"]
    expected = {
        "/api/health": {"get"},
        "/api/auth/register": {"post"},
        "/api/auth/login": {"post"},
        "/api/auth/logout": {"post"},
        "/api/auth/me": {"get"},
        "/api/account": {"delete"},
        "/api/items": {"get", "post"},
        "/api/items/{item_id}": {"get", "patch", "delete"},
        "/api/items/{item_id}/image": {"get"},
        "/api/outfits": {"get", "post"},
        "/api/outfits/{outfit_id}": {"get", "patch", "delete"},
    }
    for path, methods in expected.items():
        assert path in paths, f"route {path} is not registered"
        assert methods <= set(paths[path]), (
            f"route {path} is missing methods {methods - set(paths[path])}"
        )


def test_protected_routes_reject_unauthenticated() -> None:
    with TestClient(app) as client:
        assert client.get("/api/items").status_code == 401
        assert client.get("/api/outfits").status_code == 401
        assert client.get("/api/auth/me").status_code == 401
        assert client.delete("/api/account").status_code == 401
