from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))

    clothing_items: Mapped[list[ClothingItem]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    outfits: Mapped[list[Outfit]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(32))
    color: Mapped[str] = mapped_column(String(64))
    image_path: Mapped[str] = mapped_column(String(512))

    owner: Mapped[User] = relationship(back_populates="clothing_items")
    outfit_items: Mapped[list[OutfitItem]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))

    owner: Mapped[User] = relationship(back_populates="outfits")
    items: Mapped[list[OutfitItem]] = relationship(
        back_populates="outfit", cascade="all, delete-orphan"
    )


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    outfit_id: Mapped[int] = mapped_column(ForeignKey("outfits.id", ondelete="CASCADE"))
    item_id: Mapped[int] = mapped_column(ForeignKey("clothing_items.id", ondelete="CASCADE"))

    outfit: Mapped[Outfit] = relationship(back_populates="items")
    item: Mapped[ClothingItem] = relationship(back_populates="outfit_items")
