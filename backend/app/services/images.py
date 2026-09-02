from __future__ import annotations

import logging
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

logger = logging.getLogger(__name__)

_HEADER_LENGTH = 16
_CHUNK_SIZE = 1024 * 1024

_EXTENSION_BY_MIME = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

_MIME_BY_EXTENSION = {ext: mime for mime, ext in _EXTENSION_BY_MIME.items()}


def _sniff_mime(header: bytes) -> str | None:
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_image(file: UploadFile) -> str:
    """Validate an uploaded image and return its file extension.

    The format is sniffed from the magic bytes (not the filename/extension) and
    the size is checked by streaming the payload in chunks, so an oversized
    upload is rejected without ever holding the whole body in memory.
    """
    max_bytes = settings.max_upload_mb * 1024 * 1024

    file.file.seek(0)
    header = file.file.read(_HEADER_LENGTH)
    file.file.seek(0)

    mime = _sniff_mime(header)
    if mime is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Nur Bilder im Format JPEG, PNG oder WebP sind erlaubt.",
        )

    size = 0
    while True:
        chunk = file.file.read(_CHUNK_SIZE)
        if not chunk:
            break
        size += len(chunk)
        if size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(f"Das Bild ist zu groß: maximal {settings.max_upload_mb} MB sind erlaubt."),
            )
    file.file.seek(0)

    return _EXTENSION_BY_MIME[mime]


def save_image(file: UploadFile, extension: str) -> str:
    """Persist an uploaded image under UPLOAD_DIR and return its filename."""
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{secrets.token_hex(16)}.{extension}"
    destination = upload_dir / filename

    file.file.seek(0)
    with destination.open("wb") as out:
        while True:
            chunk = file.file.read(_CHUNK_SIZE)
            if not chunk:
                break
            out.write(chunk)

    return filename


def delete_image(filename: str | None) -> None:
    """Remove an image file from disk if it exists."""
    if not filename:
        return
    path = Path(settings.upload_dir) / filename
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logger.warning("Could not delete image file %s", path, exc_info=True)


def mime_for_filename(filename: str) -> str:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _MIME_BY_EXTENSION.get(extension, "application/octet-stream")
