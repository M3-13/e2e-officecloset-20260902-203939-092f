from __future__ import annotations

from pathlib import Path
from typing import get_args

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_current_user, get_db
from app.models import ClothingItem, User
from app.schemas import Category, ItemOut
from app.services import images

router = APIRouter(tags=["items"])

ALLOWED_CATEGORIES = set(get_args(Category))


def _to_out(item: ClothingItem) -> ItemOut:
    return ItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        color=item.color,
        image_url=f"/api/items/{item.id}/image",
    )


def _get_owned_item(db: Session, item_id: int, owner_id: int) -> ClothingItem:
    item = db.get(ClothingItem, item_id)
    if item is None or item.owner_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kleidungsstück nicht gefunden.",
        )
    return item


def _validate_category(category: str) -> str:
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Ungültige Kategorie: {category}. Erlaubt: "
                f"{', '.join(sorted(ALLOWED_CATEGORIES))}."
            ),
        )
    return category


@router.get("/api/items", response_model=list[ItemOut])
def list_items(
    category: str | None = None,
    color: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ItemOut]:
    query = select(ClothingItem).where(ClothingItem.owner_id == current_user.id)
    if category:
        query = query.where(ClothingItem.category == category)
    if color:
        query = query.where(ClothingItem.color == color)
    items = db.scalars(query).all()
    return [_to_out(item) for item in items]


@router.post("/api/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    color: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemOut:
    _validate_category(category)
    extension = images.validate_image(image)
    filename = images.save_image(image, extension)

    item = ClothingItem(
        owner_id=current_user.id,
        name=name,
        category=category,
        color=color,
        image_path=filename,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.get("/api/items/{item_id}", response_model=ItemOut)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemOut:
    item = _get_owned_item(db, item_id, current_user.id)
    return _to_out(item)


@router.patch("/api/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    name: str | None = Form(None),
    category: str | None = Form(None),
    color: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemOut:
    item = _get_owned_item(db, item_id, current_user.id)

    if name is not None:
        item.name = name
    if category is not None:
        item.category = _validate_category(category)
    if color is not None:
        item.color = color
    if image is not None and image.filename:
        extension = images.validate_image(image)
        new_filename = images.save_image(image, extension)
        images.delete_image(item.image_path)
        item.image_path = new_filename

    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    item = _get_owned_item(db, item_id, current_user.id)
    images.delete_image(item.image_path)
    db.delete(item)
    db.commit()


@router.get("/api/items/{item_id}/image")
def get_item_image(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    item = _get_owned_item(db, item_id, current_user.id)

    path = Path(settings.upload_dir) / item.image_path
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bild nicht gefunden.",
        )

    data = path.read_bytes()
    return Response(content=data, media_type=images.mime_for_filename(item.image_path))
