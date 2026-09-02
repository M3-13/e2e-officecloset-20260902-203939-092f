import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.deps import get_db
from app.main import app
from app.models import User
from app.routers.auth import reset_rate_limits
from app.security import verify_password


@pytest.fixture(autouse=True)
def _reset_rate_limits() -> None:
    reset_rate_limits()


@pytest.fixture
def test_engine(tmp_path):
    db_file = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def session_factory(test_engine):
    return sessionmaker(bind=test_engine, autoflush=False, autocommit=False)


@pytest.fixture
def client(test_engine, session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()


def _register(client: TestClient, email: str, password: str = "secret123") -> dict:
    response = client.post("/api/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201
    return response.json()


def test_register_returns_token_and_user(client: TestClient) -> None:
    body = _register(client, "anna@example.com")

    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    assert body["user"]["email"] == "anna@example.com"
    assert isinstance(body["user"]["id"], int)


def test_register_duplicate_email_returns_409(client: TestClient) -> None:
    _register(client, "dup@example.com")
    response = client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "another123"},
    )
    assert response.status_code == 409


def test_register_stores_password_hashed(client: TestClient, session_factory) -> None:
    body = _register(client, "hash@example.com", password="plain-secret")

    assert "password" not in body
    assert "hashed_password" not in body

    db = session_factory()
    try:
        user = db.query(User).filter(User.email == "hash@example.com").first()
        assert user is not None
        assert user.hashed_password != "plain-secret"
        assert verify_password("plain-secret", user.hashed_password)
    finally:
        db.close()


def test_login_with_valid_credentials(client: TestClient) -> None:
    _register(client, "login@example.com", password="correct-horse")
    response = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "correct-horse"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "login@example.com"


def test_login_with_wrong_password_returns_401(client: TestClient) -> None:
    _register(client, "wrong@example.com", password="right-password")
    response = client.post(
        "/api/auth/login",
        json={"email": "wrong@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_with_unknown_email_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


def test_me_returns_current_user(client: TestClient) -> None:
    body = _register(client, "me@example.com")
    token = body["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == {"id": body["user"]["id"], "email": "me@example.com"}


def test_me_without_token_returns_401(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_invalid_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401


def test_logout_returns_204(client: TestClient) -> None:
    assert client.post("/api/auth/logout").status_code == 204


def test_rate_limit_returns_429_after_five_attempts(client: TestClient) -> None:
    for i in range(5):
        response = client.post(
            "/api/auth/login",
            json={"email": f"rate{i}@example.com", "password": "password"},
        )
        assert response.status_code == 401

    response = client.post(
        "/api/auth/login",
        json={"email": "rate6@example.com", "password": "password"},
    )
    assert response.status_code == 429
