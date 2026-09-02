from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status

from app.deps import get_current_user
from app.models import User
from app.schemas import ItemOut

router = APIRouter(tags=["items"])


@router.get("/api/items", response_model=list[ItemOut])
def list_items(
    category: str | None = None,
    color: str | None = None,
    current_user: User = Depends(get_current_user),
) -> list[ItemOut]:
    raise HTTPException(status_code=501, detail="wardrobe #10 implements this")


@router.post("/api/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    color: str = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> ItemOut:
    raise HTTPException(status_code=501, detail="wardrobe #10 implements this")


@router.get("/api/items/{item_id}", response_model=ItemOut)
def get_item(item_id: int, current_user: User = Depends(get_current_user)) -> ItemOut:
    raise HTTPException(status_code=501, detail="wardrobe #10 implements this")


@router.patch("/api/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    name: str | None = Form(None),
    category: str | None = Form(None),
    color: str | None = Form(None),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
) -> ItemOut:
    raise HTTPException(status_code=501, detail="wardrobe #10 implements this")


@router.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, current_user: User = Depends(get_current_user)) -> None:
    raise HTTPException(status_code=501, detail="wardrobe #10 implements this")


@router.get("/api/items/{item_id}/image")
def get_item_image(item_id: int, current_user: User = Depends(get_current_user)) -> Response:
    raise HTTPException(status_code=501, detail="wardrobe #10 implements this")
