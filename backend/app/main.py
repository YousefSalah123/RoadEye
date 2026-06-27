import json
import tempfile
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from uuid import uuid4
import os
import cv2
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.model import model_service
from app.schemas import DetectionResponse
from app.utils import (
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_VIDEO_EXTENSIONS,
    decode_image_bytes,
    ensure_video_capture_opened,
    read_upload_file,
    setup_logging,
    validate_file_extension,
)

RESULTS_DIR = Path("results")

# Create local output directory for background-processed videos
os.makedirs("testing_outputs", exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    model_service.load()
    yield


app = FastAPI(
    title="YOLOv8 Inference API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/detect/image", response_model=DetectionResponse)
async def detect_image(file: UploadFile = File(...)) -> DetectionResponse:
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided.",
        )

    validate_file_extension(file.filename or "", ALLOWED_IMAGE_EXTENSIONS)

    image_bytes = await read_upload_file(file)
    image = decode_image_bytes(image_bytes)

    prediction = model_service.predict_image(image)

    result_filename = (
        f"detection_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}.json"
    )
    result_path = RESULTS_DIR / result_filename
    result_path.write_text(
        json.dumps(prediction.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return prediction


# ──────────────────────────────────────────────────────────────────────
# Background video processing function
# Contains the exact YOLOv8 inference logic, class-specific thresholds,
# custom bounding-box colors, and cinematic freeze-frame cooldown.
# ──────────────────────────────────────────────────────────────────────
def process_and_save_video(input_path: str, output_path: str):
    """Read a video, run YOLOv8 detection on every frame, and write
    the annotated result (with freeze-frames) to *output_path*."""

    capture = cv2.VideoCapture(input_path)

    try:
        ensure_video_capture_opened(capture)

        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(capture.get(cv2.CAP_PROP_FPS)) or 30
        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # Web-safe codec
        out_video = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        if model_service.model is None:
            print("ERROR: Model is not loaded. Aborting video processing.")
            return

        # ── Cinematic Freeze-Frame state ──
        cooldown = 0

        frame_index = 0
        while True:
            success, frame = capture.read()
            if not success:
                break

            frame_index += 1
            if frame_index % 10 == 0 or frame_index == 1 or frame_index == total_frames:
                print(f"Processing frame {frame_index}/{total_frames}...")

            # Run inference with RoadEye V6.1B parameters:
            # conf=0.25 base threshold, imgsz=1024 matches training resolution.
            results = model_service.model(frame, conf=0.25, imgsz=1024)

            # Frame dimensions for perspective rules
            H, W = frame.shape[:2]

            # Class-specific thresholds and colors
            has_detection = False
            annotated_frame = frame.copy()

            if results and results[0].boxes is not None:
                for box in results[0].boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                    # Structural properties of the bounding box
                    w = x2 - x1
                    h = y2 - y1
                    cx = x1 + w // 2
                    cy = y1 + h // 2

                    # ── Rule 1: Horizon Cutoff ──
                    # Ignore detections in the sky / trees (top 45% of frame)
                    if cy < H * 0.45:
                        continue

                    # ── Rule 2: Monster Box Filter ──
                    # No valid single pothole/crack will be > 40% of the frame.
                    # Rejects massive snowbanks, sidewalks, and wall FPs.
                    if w > W * 0.40 or h > H * 0.40:
                        continue

                    # ── Rule 3: Dynamic Perspective Scaling ──
                    # The max allowed box size grows as it approaches the
                    # camera (bottom of frame). depth_ratio is 0.0 at the
                    # horizon line and 1.0 at the bumper.
                    depth_ratio = (cy - H * 0.45) / (H * 0.55)
                    max_allowed_w = W * (0.05 + 0.35 * depth_ratio)
                    max_allowed_h = H * (0.05 + 0.35 * depth_ratio)
                    if w > max_allowed_w or h > max_allowed_h:
                        continue

                    # Apply class-specific confidence thresholds
                    if cls_id == 0 and conf >= 0.25:
                        # Crack — standard threshold to preserve recall on normal roads
                        color = (255, 0, 0)  # Blue (BGR)
                    elif cls_id == 1 and conf >= 0.25:
                        # Pothole — aligned with RoadEye V6.1B base confidence threshold
                        color = (0, 0, 255)  # Red (BGR)
                    else:
                        # Below threshold or unknown class — skip
                        continue

                    has_detection = True
                    label = f"{results[0].names[cls_id]} {conf:.0%}"

                    # Draw bounding box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)

                    # Draw label background
                    (tw, th), _ = cv2.getTextSize(
                        label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1
                    )
                    cv2.rectangle(
                        annotated_frame,
                        (x1, y1 - th - 8), (x1 + tw + 4, y1),
                        color, -1,
                    )
                    cv2.putText(
                        annotated_frame, label,
                        (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (255, 255, 255), 1, cv2.LINE_AA,
                    )

            # Always write the current annotated frame
            out_video.write(annotated_frame)

            # ── Cinematic Freeze-Frame ──
            if has_detection and cooldown <= 0:
                freeze_count = int(fps * 1.5)  # 1.5 seconds freeze
                for _ in range(freeze_count):
                    out_video.write(annotated_frame)
                cooldown = 5  # Only wait 5 frames before allowing another freeze
                print(f"  ⏸  Freeze-frame inserted at frame {frame_index} "
                      f"({freeze_count} extra frames, cooldown={cooldown})")

            if cooldown > 0:
                cooldown -= 1

    finally:
        capture.release()
        if 'out_video' in locals():
            out_video.release()

    # Cleanup the temporary input file after processing
    Path(input_path).unlink(missing_ok=True)
    print(f"Video processing complete. Output saved to: {output_path}")


@app.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided.",
        )

    validate_file_extension(file.filename or "", ALLOWED_VIDEO_EXTENSIONS)

    # Save the uploaded video to a temporary file
    video_bytes = await read_upload_file(file)
    temp_input_path = "temp_video.mp4"
    with open(temp_input_path, "wb") as f:
        f.write(video_bytes)

    # Define the output path inside the local testing folder
    output_path = f"testing_outputs/processed_{file.filename}"

    # Schedule the heavy processing to run in the background
    background_tasks.add_task(process_and_save_video, temp_input_path, output_path)

    # Return immediately so the browser does not time out
    return JSONResponse(
        content={
            "message": "Video received. Processing in background and will be saved locally.",
            "output_location": output_path,
        }
    )
