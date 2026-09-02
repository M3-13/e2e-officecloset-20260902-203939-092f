from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_current_user
from app.models import User
from app.schemas import OutfitCreate, OutfitOut, OutfitUpdate

router = APIRouter(tags=["outfits"])


@router.get("/api/outfits", response_model=list[OutfitOut])
def list_outfits(current_user: User = Depends(get_current_user)) -> list[OutfitOut]:
    raise HTTPException(status_code=501, detail="outfits #9 implements this")


@router.post("/api/outfits", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(
    payload: OutfitCreate,
    current_user: User = Depends(get_current_user),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits #9 implements this")


@router.get("/api/outfits/{outfit_id}", response_model=OutfitOut)
def get_outfit(outfit_id: int, current_user: User = Depends(get_current_user)) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits #9 implements this")


@router.patch("/api/outfits/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    payload: OutfitUpdate,
    current_user: User = Depends(get_current_user),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits #9 implements this")


@router.delete("/api/outfits/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(outfit_id: int, current_user: User = Depends(get_current_user)) -> None:
    raise HTTPException(status_code=501, detail="outfits #9 implements this")
