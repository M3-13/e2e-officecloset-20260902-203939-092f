from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import ClothingItem, User
from app.services import images

router = APIRouter(tags=["account"])


@router.delete("/api/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    image_paths = db.scalars(
        select(ClothingItem.image_path).where(ClothingItem.owner_id == current_user.id)
    ).all()

    user = db.get(User, current_user.id)
    if user is not None:
        db.delete(user)
    db.commit()

    for image_path in image_paths:
        images.delete_image(image_path)
