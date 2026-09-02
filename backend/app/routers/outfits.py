from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_current_user, get_db
from app.models import ClothingItem, Outfit, OutfitItem, User
from app.schemas import ItemOut, OutfitCreate, OutfitOut, OutfitUpdate

router = APIRouter(tags=["outfits"])


def _item_to_out(item: ClothingItem) -> ItemOut:
    return ItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        color=item.color,
        image_url=f"/api/items/{item.id}/image",
    )


def _outfit_to_out(outfit: Outfit) -> OutfitOut:
    items = [_item_to_out(link.item) for link in outfit.items]
    items.sort(key=lambda item: item.id)
    return OutfitOut(id=outfit.id, name=outfit.name, items=items)


def _resolve_items(db: Session, item_ids: list[int], user_id: int) -> list[ClothingItem]:
    if not item_ids:
        return []
    items = db.scalars(select(ClothingItem).where(ClothingItem.id.in_(item_ids))).all()
    by_id = {item.id: item for item in items}
    for item_id in item_ids:
        item = by_id.get(item_id)
        if item is None or item.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found",
            )
    return [by_id[item_id] for item_id in item_ids]


def _load_outfit(db: Session, outfit_id: int, user_id: int) -> Outfit:
    outfit = db.scalars(
        select(Outfit)
        .options(selectinload(Outfit.items).selectinload(OutfitItem.item))
        .where(Outfit.id == outfit_id)
    ).first()
    if outfit is None or outfit.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found",
        )
    return outfit


@router.get("/api/outfits", response_model=list[OutfitOut])
def list_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OutfitOut]:
    outfits = db.scalars(
        select(Outfit)
        .options(selectinload(Outfit.items).selectinload(OutfitItem.item))
        .where(Outfit.owner_id == current_user.id)
        .order_by(Outfit.id)
    ).all()
    return [_outfit_to_out(outfit) for outfit in outfits]


@router.post("/api/outfits", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(
    payload: OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    items = _resolve_items(db, payload.item_ids, current_user.id)
    outfit = Outfit(owner_id=current_user.id, name=payload.name)
    outfit.items = [OutfitItem(item_id=item.id) for item in items]
    db.add(outfit)
    db.commit()
    return _outfit_to_out(_load_outfit(db, outfit.id, current_user.id))


@router.get("/api/outfits/{outfit_id}", response_model=OutfitOut)
def get_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    return _outfit_to_out(_load_outfit(db, outfit_id, current_user.id))


@router.patch("/api/outfits/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    payload: OutfitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    outfit = _load_outfit(db, outfit_id, current_user.id)
    if payload.name is not None:
        outfit.name = payload.name
    if payload.item_ids is not None:
        _resolve_items(db, payload.item_ids, current_user.id)
        outfit.items = [OutfitItem(item_id=item_id) for item_id in payload.item_ids]
    db.commit()
    return _outfit_to_out(_load_outfit(db, outfit_id, current_user.id))


@router.delete("/api/outfits/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    outfit = db.get(Outfit, outfit_id)
    if outfit is None or outfit.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found",
        )
    db.delete(outfit)
    db.commit()
