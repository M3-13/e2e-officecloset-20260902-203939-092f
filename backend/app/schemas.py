from typing import Literal

from pydantic import BaseModel, ConfigDict

Category = Literal["oberteil", "hose", "kleid", "schuhe", "accessoire"]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: Category
    color: str
    image_url: str


class ItemCreate(BaseModel):
    name: str
    category: Category
    color: str


class ItemUpdate(BaseModel):
    name: str | None = None
    category: Category | None = None
    color: str | None = None


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    items: list[ItemOut]


class OutfitCreate(BaseModel):
    name: str
    item_ids: list[int]


class OutfitUpdate(BaseModel):
    name: str | None = None
    item_ids: list[int] | None = None
