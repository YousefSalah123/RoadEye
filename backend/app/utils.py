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


# ═══════════════════════════════════════════════════════════════
# Video Frame Extraction & GPS Interpolation
# (Used by the trip upload → inference pipeline)
# ═══════════════════════════════════════════════════════════════


def extract_frames(
    video_path: str, target_fps: int = 1
) -> Tuple[list[np.ndarray], float]:
    """
    Extract frames from a video file at a target sampling rate.

    For a 30fps video with target_fps=1, this extracts every 30th frame,
    yielding approximately 1 frame per second of video.

    Args:
        video_path: Absolute or relative path to the .mp4 file.
        target_fps: Desired number of frames per second to extract.

    Returns:
        Tuple of (list_of_frames, original_video_fps).

    Raises:
        ValueError: If the video file cannot be opened.
    """
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    original_fps = cap.get(cv2.CAP_PROP_FPS)
    if original_fps <= 0:
        original_fps = 30.0  # Sensible default for dashcam footage

    # Calculate frame interval: for 30fps video, extract every 30th frame
    frame_interval = max(1, int(original_fps / target_fps))

    frames = []
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            frames.append(frame)

        frame_count += 1

    cap.release()
    return frames, original_fps


def interpolate_gps(
    gps_log: list[dict], time_sec: float
) -> Tuple[float, float]:
    """
    Linearly interpolate GPS coordinates for a given timestamp.

    ┌─────────────────────────────────────────────────────────────────────┐
    │  GPS Linear Interpolation — Mathematical Foundation                │
    │                                                                    │
    │  Given two consecutive GPS readings:                               │
    │    P₀ = (t₀, lat₀, lng₀)                                         │
    │    P₁ = (t₁, lat₁, lng₁)                                         │
    │                                                                    │
    │  For a query time t where t₀ ≤ t ≤ t₁:                           │
    │                                                                    │
    │    α = (t - t₀) / (t₁ - t₀)          ← normalized position [0,1]│
    │                                                                    │
    │    lat = lat₀ + α × (lat₁ - lat₀)    ← interpolated latitude     │
    │    lng = lng₀ + α × (lng₁ - lng₀)    ← interpolated longitude    │
    │                                                                    │
    │  Edge cases:                                                       │
    │    • t ≤ t₀  → clamp to P₀ (first GPS point)                     │
    │    • t ≥ tₙ  → clamp to Pₙ (last GPS point)                      │
    │    • t₀ = t₁ → α = 0 (avoid division by zero, return P₀)         │
    │                                                                    │
    │  Example:                                                          │
    │    YOLO detects a pothole at frame 150 in a 30fps video.           │
    │    That's t = 150 / 30 = 5.0 seconds into the recording.          │
    │    GPS log has entries at t=4s (lat=30.044, lng=31.235)            │
    │    and t=6s (lat=30.046, lng=31.237).                              │
    │    α = (5-4)/(6-4) = 0.5                                          │
    │    lat = 30.044 + 0.5 × (30.046 - 30.044) = 30.045               │
    │    lng = 31.235 + 0.5 × (31.237 - 31.235) = 31.236               │
    └─────────────────────────────────────────────────────────────────────┘

    Args:
        gps_log: List of GPS points, each a dict with keys:
                 'time_offset_sec', 'lat', 'lng'.
        time_sec: The timestamp (in seconds) to interpolate for.

    Returns:
        Tuple of (latitude, longitude).
    """
    if not gps_log:
        return (0.0, 0.0)

    # Ensure the log is sorted by time
    sorted_log = sorted(gps_log, key=lambda p: p["time_offset_sec"])

    # ─── Edge case: clamp to the first point if before the log starts ───
    if time_sec <= sorted_log[0]["time_offset_sec"]:
        return (sorted_log[0]["lat"], sorted_log[0]["lng"])

    # ─── Edge case: clamp to the last point if after the log ends ───
    if time_sec >= sorted_log[-1]["time_offset_sec"]:
        return (sorted_log[-1]["lat"], sorted_log[-1]["lng"])

    # ─── Find the two surrounding GPS points and interpolate ───
    for i in range(len(sorted_log) - 1):
        t0 = sorted_log[i]["time_offset_sec"]
        t1 = sorted_log[i + 1]["time_offset_sec"]

        if t0 <= time_sec <= t1:
            # Calculate α — the normalized position between the two points
            # α = 0 means exactly at P₀, α = 1 means exactly at P₁
            if t1 == t0:
                alpha = 0.0  # Avoid division by zero
            else:
                alpha = (time_sec - t0) / (t1 - t0)

            # Apply the linear interpolation formula
            lat = sorted_log[i]["lat"] + alpha * (
                sorted_log[i + 1]["lat"] - sorted_log[i]["lat"]
            )
            lng = sorted_log[i]["lng"] + alpha * (
                sorted_log[i + 1]["lng"] - sorted_log[i]["lng"]
            )
            return (lat, lng)

    # Fallback — should never reach here given the edge-case checks above
    return (sorted_log[-1]["lat"], sorted_log[-1]["lng"])

