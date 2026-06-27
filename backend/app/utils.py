import logging
from typing import Tuple

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile, status


logger = logging.getLogger(__name__)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def validate_file_extension(filename: str, allowed_extensions: set[str]) -> None:
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is missing.",
        )

    dot_index = filename.rfind(".")
    extension = filename[dot_index:].lower() if dot_index != -1 else ""
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Allowed types: {sorted(allowed_extensions)}",
        )


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file.",
        )
    return image


async def read_upload_file(upload_file: UploadFile) -> bytes:
    contents = await upload_file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    return contents


def ensure_video_capture_opened(capture: cv2.VideoCapture) -> None:
    if not capture.isOpened():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to open video file.",
        )


def clamp_box_coordinates(
    x_min: int,
    y_min: int,
    x_max: int,
    y_max: int,
    width: int,
    height: int,
) -> Tuple[int, int, int, int]:
    return (
        max(0, min(x_min, width - 1)),
        max(0, min(y_min, height - 1)),
        max(0, min(x_max, width - 1)),
        max(0, min(y_max, height - 1)),
    )
