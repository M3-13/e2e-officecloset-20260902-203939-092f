from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base
from app.deps import get_current_user, get_db
from app.main import app
from app.models import User

_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
_WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 64


def _create_user(factory: sessionmaker, email: str) -> int:
    session = factory()
    user = User(email=email, hashed_password="hashed")
    session.add(user)
    session.commit()
    user_id = user.id
    session.close()
    return user_id


def _auth_as(user_id: int) -> None:
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=user_id)


def _create_item(client: TestClient, name: str, category: str, color: str) -> dict:
    response = client.post(
        "/api/items",
        data={"name": name, "category": category, "color": color},
        files={"image": ("x.png", _PNG, "image/png")},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    yield factory
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(session_factory, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_list_get_and_image(client, session_factory):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    created = _create_item(client, "Bluse", "oberteil", "rot")
    assert created["name"] == "Bluse"
    assert created["category"] == "oberteil"
    assert created["color"] == "rot"
    assert created["image_url"] == f"/api/items/{created['id']}/image"

    listed = client.get("/api/items")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [created["id"]]

    fetched = client.get(f"/api/items/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Bluse"

    image = client.get(f"/api/items/{created['id']}/image")
    assert image.status_code == 200
    assert image.content == _PNG
    assert image.headers["content-type"] == "image/png"


@pytest.mark.parametrize(
    ("content", "expected_mime"),
    [
        (_PNG, "image/png"),
        (_JPEG, "image/jpeg"),
        (_WEBP, "image/webp"),
    ],
)
def test_all_supported_formats_are_accepted(client, session_factory, content, expected_mime):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    response = client.post(
        "/api/items",
        data={"name": "Teil", "category": "kleid", "color": "gold"},
        files={"image": ("x.bin", content, "application/octet-stream")},
    )
    assert response.status_code == 201, response.text

    item_id = response.json()["id"]
    image = client.get(f"/api/items/{item_id}/image")
    assert image.status_code == 200
    assert image.content == content
    assert image.headers["content-type"] == expected_mime


def test_filter_by_category_and_color(client, session_factory):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    _create_item(client, "Hose rot", "hose", "rot")
    _create_item(client, "Hose blau", "hose", "blau")
    _create_item(client, "Oberteil rot", "oberteil", "rot")

    assert len(client.get("/api/items").json()) == 3
    assert len(client.get("/api/items", params={"category": "hose"}).json()) == 2
    assert len(client.get("/api/items", params={"color": "rot"}).json()) == 2
    hose_rot = client.get("/api/items", params={"category": "hose", "color": "rot"}).json()
    assert len(hose_rot) == 1
    assert hose_rot[0]["name"] == "Hose rot"
    assert len(client.get("/api/items", params={"category": "kleid"}).json()) == 0


def test_update_item_fields_and_image(client, session_factory):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    created = _create_item(client, "Bluse", "oberteil", "rot")
    item_id = created["id"]

    updated = client.patch(
        f"/api/items/{item_id}",
        data={"name": "Neue Bluse", "category": "kleid", "color": "blau"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Neue Bluse"
    assert updated.json()["category"] == "kleid"
    assert updated.json()["color"] == "blau"

    with_new_image = client.patch(
        f"/api/items/{item_id}",
        files={"image": ("y.webp", _WEBP, "image/webp")},
    )
    assert with_new_image.status_code == 200
    image = client.get(f"/api/items/{item_id}/image")
    assert image.status_code == 200
    assert image.content == _WEBP
    assert image.headers["content-type"] == "image/webp"


def test_delete_item_removes_record_and_image(client, session_factory):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    created = _create_item(client, "Bluse", "oberteil", "rot")
    item_id = created["id"]
    assert client.get(f"/api/items/{item_id}/image").status_code == 200

    deleted = client.delete(f"/api/items/{item_id}")
    assert deleted.status_code == 204

    assert client.get(f"/api/items/{item_id}").status_code == 404
    assert client.get(f"/api/items/{item_id}/image").status_code == 404
    assert client.get("/api/items").json() == []


def test_foreign_item_returns_404_for_every_verb(client, session_factory):
    alice_id = _create_user(session_factory, "alice@example.com")
    bob_id = _create_user(session_factory, "bob@example.com")

    _auth_as(alice_id)
    created = _create_item(client, "Bluse", "oberteil", "rot")
    item_id = created["id"]

    _auth_as(bob_id)
    assert client.get(f"/api/items/{item_id}").status_code == 404
    assert client.get(f"/api/items/{item_id}/image").status_code == 404
    assert client.patch(f"/api/items/{item_id}", data={"name": "hack"}).status_code == 404
    assert client.delete(f"/api/items/{item_id}").status_code == 404
    assert client.get("/api/items").json() == []


def test_users_only_see_their_own_items(client, session_factory):
    alice_id = _create_user(session_factory, "alice@example.com")
    bob_id = _create_user(session_factory, "bob@example.com")

    _auth_as(alice_id)
    alice_item = _create_item(client, "Alice Bluse", "oberteil", "rot")

    _auth_as(bob_id)
    bob_item = _create_item(client, "Bob Hose", "hose", "blau")

    _auth_as(alice_id)
    alice_list = client.get("/api/items").json()
    assert [item["id"] for item in alice_list] == [alice_item["id"]]

    _auth_as(bob_id)
    bob_list = client.get("/api/items").json()
    assert [item["id"] for item in bob_list] == [bob_item["id"]]


def test_invalid_image_format_rejected(client, session_factory):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    response = client.post(
        "/api/items",
        data={"name": "Bluse", "category": "oberteil", "color": "rot"},
        files={"image": ("x.txt", b"not an image at all", "text/plain")},
    )
    assert response.status_code == 422
    assert "JPEG" in response.json()["detail"]


def test_invalid_category_rejected(client, session_factory):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    response = client.post(
        "/api/items",
        data={"name": "Bluse", "category": "unsinn", "color": "rot"},
        files={"image": ("x.png", _PNG, "image/png")},
    )
    assert response.status_code == 422
    assert "Kategorie" in response.json()["detail"]


def test_oversized_image_rejected(client, session_factory, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    oversized = _PNG + b"\x00" * (1024 * 1024 + 100)
    response = client.post(
        "/api/items",
        data={"name": "Bluse", "category": "oberteil", "color": "rot"},
        files={"image": ("big.png", oversized, "image/png")},
    )
    assert response.status_code == 422
    assert "MB" in response.json()["detail"]
