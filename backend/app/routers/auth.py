from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_current_user
from app.models import User
from app.schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter(tags=["auth"])


@router.post("/api/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate) -> Token:
    raise HTTPException(status_code=501, detail="auth #4 implements this")


@router.post("/api/auth/login", response_model=Token)
def login(payload: UserLogin) -> Token:
    raise HTTPException(status_code=501, detail="auth #4 implements this")


@router.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    raise HTTPException(status_code=501, detail="auth #4 implements this")


@router.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    raise HTTPException(status_code=501, detail="auth #4 implements this")
