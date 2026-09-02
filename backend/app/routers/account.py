from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_current_user
from app.models import User

router = APIRouter(tags=["account"])


@router.delete("/api/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(current_user: User = Depends(get_current_user)) -> None:
    raise HTTPException(status_code=501, detail="account #11 implements this")
