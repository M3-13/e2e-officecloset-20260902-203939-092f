from collections.abc import Generator
from typing import Any

import pytest
from fastapi import Depends, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import deps
from app.db import Base
from app.main import app
from app.models import ClothingItem, User
from app.security import create_access_token, decode_token, hash_password


@pytest.fixture()
def db_engine() -> Generator[Any]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def session_factory(db_engine: Any) -> Generator[Any]:
    yield sessionmaker(bind=db_engine, autoflush=False, autocommit=False)


@pytest.fixture()
def client(session_factory: Any) -> Generator[TestClient]:
    def override_get_db() -> Generator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    def override_get_current_user(
        token: str = Depends(deps.oauth2_scheme),
        db: Session = Depends(deps.get_db),
    ) -> User:
        try:
            payload = decode_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated") from None
        user = db.get(User, int(payload["sub"]))
        if user is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return user

    app.dependency_overrides[deps.get_db] = override_get_db
    app.dependency_overrides[deps.get_current_user] = override_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()


def _create_user(session: Session, email: str = "alice@example.com") -> User:
    user = User(email=email, hashed_password=hash_password("secret123"))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _create_item(
    session: Session,
    owner_id: int,
    name: str = "Shirt",
    category: str = "oberteil",
    color: str = "weiß",
) -> ClothingItem:
    item = ClothingItem(
        owner_id=owner_id,
        name=name,
        category=category,
        color=color,
        image_path=f"/uploads/{name}.jpg",
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def _headers(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}


def test_list_outfits_empty(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    user = _create_user(session)
    response = client.get("/api/outfits", headers=_headers(user))
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_get_outfit(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    user = _create_user(session)
    item = _create_item(session, user.id, name="Shirt")

    response = client.post(
        "/api/outfits",
        headers=_headers(user),
        json={"name": "Casual", "item_ids": [item.id]},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Casual"
    assert [i["id"] for i in body["items"]] == [item.id]
    assert body["items"][0]["image_url"] == f"/api/items/{item.id}/image"

    get_response = client.get(f"/api/outfits/{body['id']}", headers=_headers(user))
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Casual"
    assert get_response.json()["items"][0]["id"] == item.id


def test_list_outfits_only_own(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    alice_item = _create_item(session, alice.id, name="Alice shirt")
    bob_item = _create_item(session, bob.id, name="Bob shirt")

    client.post(
        "/api/outfits",
        headers=_headers(alice),
        json={"name": "Alice outfit", "item_ids": [alice_item.id]},
    )
    client.post(
        "/api/outfits",
        headers=_headers(bob),
        json={"name": "Bob outfit", "item_ids": [bob_item.id]},
    )

    alice_list = client.get("/api/outfits", headers=_headers(alice)).json()
    bob_list = client.get("/api/outfits", headers=_headers(bob)).json()

    assert [o["name"] for o in alice_list] == ["Alice outfit"]
    assert [o["name"] for o in bob_list] == ["Bob outfit"]


def test_create_outfit_with_foreign_item_returns_404(
    client: TestClient, session_factory: Any
) -> None:
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    bob_item = _create_item(session, bob.id)

    response = client.post(
        "/api/outfits",
        headers=_headers(alice),
        json={"name": "Thief", "item_ids": [bob_item.id]},
    )
    assert response.status_code == 404


def test_create_outfit_with_missing_item_returns_404(
    client: TestClient, session_factory: Any
) -> None:
    session = session_factory()
    user = _create_user(session)

    response = client.post(
        "/api/outfits",
        headers=_headers(user),
        json={"name": "Ghost", "item_ids": [99999]},
    )
    assert response.status_code == 404


def test_get_foreign_outfit_returns_404(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    alice_item = _create_item(session, alice.id)

    created = client.post(
        "/api/outfits",
        headers=_headers(alice),
        json={"name": "Alice outfit", "item_ids": [alice_item.id]},
    )
    outfit_id = created.json()["id"]

    response = client.get(f"/api/outfits/{outfit_id}", headers=_headers(bob))
    assert response.status_code == 404


def test_patch_outfit_name(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    user = _create_user(session)
    item = _create_item(session, user.id)

    created = client.post(
        "/api/outfits",
        headers=_headers(user),
        json={"name": "Old name", "item_ids": [item.id]},
    )
    outfit_id = created.json()["id"]

    response = client.patch(
        f"/api/outfits/{outfit_id}",
        headers=_headers(user),
        json={"name": "New name"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New name"
    assert [i["id"] for i in response.json()["items"]] == [item.id]


def test_patch_outfit_items(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    user = _create_user(session)
    item1 = _create_item(session, user.id, name="One")
    item2 = _create_item(session, user.id, name="Two")
    item3 = _create_item(session, user.id, name="Three")

    created = client.post(
        "/api/outfits",
        headers=_headers(user),
        json={"name": "Mix", "item_ids": [item1.id]},
    )
    outfit_id = created.json()["id"]

    response = client.patch(
        f"/api/outfits/{outfit_id}",
        headers=_headers(user),
        json={"item_ids": [item2.id, item3.id]},
    )
    assert response.status_code == 200
    assert sorted(i["id"] for i in response.json()["items"]) == [item2.id, item3.id]


def test_patch_foreign_outfit_returns_404(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    alice_item = _create_item(session, alice.id)

    created = client.post(
        "/api/outfits",
        headers=_headers(alice),
        json={"name": "Alice outfit", "item_ids": [alice_item.id]},
    )
    outfit_id = created.json()["id"]

    response = client.patch(
        f"/api/outfits/{outfit_id}",
        headers=_headers(bob),
        json={"name": "Hijack"},
    )
    assert response.status_code == 404


def test_delete_outfit(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    user = _create_user(session)
    item = _create_item(session, user.id)

    created = client.post(
        "/api/outfits",
        headers=_headers(user),
        json={"name": "To delete", "item_ids": [item.id]},
    )
    outfit_id = created.json()["id"]

    delete_response = client.delete(f"/api/outfits/{outfit_id}", headers=_headers(user))
    assert delete_response.status_code == 204

    get_response = client.get(f"/api/outfits/{outfit_id}", headers=_headers(user))
    assert get_response.status_code == 404


def test_delete_foreign_outfit_returns_404(client: TestClient, session_factory: Any) -> None:
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    alice_item = _create_item(session, alice.id)

    created = client.post(
        "/api/outfits",
        headers=_headers(alice),
        json={"name": "Alice outfit", "item_ids": [alice_item.id]},
    )
    outfit_id = created.json()["id"]

    response = client.delete(f"/api/outfits/{outfit_id}", headers=_headers(bob))
    assert response.status_code == 404

    still_there = client.get(f"/api/outfits/{outfit_id}", headers=_headers(alice))
    assert still_there.status_code == 200


def test_unauthenticated_returns_401(client: TestClient) -> None:
    assert client.get("/api/outfits").status_code == 401
    assert client.post("/api/outfits", json={"name": "X", "item_ids": []}).status_code == 401
