from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base
from app.deps import get_current_user, get_db
from app.main import app
from app.models import ClothingItem, Outfit, OutfitItem, User

_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


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


def _create_outfit(factory: sessionmaker, owner_id: int, item_ids: list[int]) -> int:
    session = factory()
    outfit = Outfit(owner_id=owner_id, name="Alltags-Look")
    session.add(outfit)
    session.flush()
    for item_id in item_ids:
        session.add(OutfitItem(outfit_id=outfit.id, item_id=item_id))
    session.commit()
    outfit_id = outfit.id
    session.close()
    return outfit_id


def _image_filenames(upload_dir) -> list[str]:
    return sorted(p.name for p in upload_dir.iterdir() if p.is_file())


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


def test_delete_account_removes_user_data_and_images(client, session_factory, tmp_path):
    user_id = _create_user(session_factory, "alice@example.com")
    _auth_as(user_id)

    item = _create_item(client, "Bluse", "oberteil", "rot")
    _create_item(client, "Hose", "hose", "blau")
    _create_outfit(session_factory, user_id, [item["id"]])

    assert len(_image_filenames(tmp_path)) == 2

    response = client.delete("/api/account")
    assert response.status_code == 204

    session = session_factory()
    assert session.get(User, user_id) is None
    assert session.scalars(select(ClothingItem)).all() == []
    assert session.scalars(select(Outfit)).all() == []
    assert session.scalars(select(OutfitItem)).all() == []
    session.close()

    assert _image_filenames(tmp_path) == []


def test_delete_account_removes_user_so_relogin_fails(client, session_factory):
    bob_id = _create_user(session_factory, "bob@example.com")
    _auth_as(bob_id)

    response = client.delete("/api/account")
    assert response.status_code == 204

    # Login resolves the user by email; with the row gone a later login has
    # nothing to authenticate against and must fail.
    session = session_factory()
    assert session.get(User, bob_id) is None
    assert session.scalars(select(User).where(User.email == "bob@example.com")).first() is None
    session.close()


def test_delete_account_leaves_other_users_data_untouched(client, session_factory, tmp_path):
    alice_id = _create_user(session_factory, "alice@example.com")
    _auth_as(alice_id)
    _create_item(client, "Alice Bluse", "oberteil", "rot")

    bob_id = _create_user(session_factory, "bob@example.com")
    _auth_as(bob_id)
    _create_item(client, "Bob Hose", "hose", "blau")

    response = client.delete("/api/account")
    assert response.status_code == 204

    session = session_factory()
    remaining = session.scalars(select(ClothingItem)).all()
    assert [item.owner_id for item in remaining] == [alice_id]
    assert session.get(User, bob_id) is None
    assert session.get(User, alice_id) is not None
    session.close()

    assert len(_image_filenames(tmp_path)) == 1
