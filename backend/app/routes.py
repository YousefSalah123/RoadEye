"""
RoadEye — Trip & Defect API Routes

Handles the mobile upload pipeline and provides data endpoints
for the dashboard. These routes coexist with the existing
/detect/image and /detect/video routes in main.py.
"""

import json
import shutil
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status

from app.database import trips_collection, defects_collection
from app.inference import process_video
from app.schemas import UploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Pipeline"])

# ─── Upload & Processing Directories ─────────────────────────────
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =================================================================
# POST /api/trips/upload — Mobile Upload & Inference Pipeline
# =================================================================
@router.post("/trips/upload")
async def upload_trip(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(..., description="Dashcam recording (.mp4)"),
    gps_data: str = Form(..., description="JSON array of GPS points"),
    metadata: str = Form("", description="Optional JSON metadata (driver, region, street)"),
):
    """
    End-to-end trip processing endpoint.

    Accepts a dashcam video and GPS log from the mobile app,
    runs YOLOv8 inference, maps detections to GPS coordinates,
    and stores results in MongoDB.
    """
    # ─── 1. Parse GPS data ───
    try:
        gps_log = json.loads(gps_data)
        if not isinstance(gps_log, list):
            raise ValueError("gps_data must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid GPS JSON data: {e}",
        )

    # ─── 2. Parse optional metadata ───
    trip_metadata = {}
    if metadata:
        try:
            trip_metadata = json.loads(metadata)
        except json.JSONDecodeError:
            pass  # Non-critical — proceed without metadata

    # ─── 3. Generate trip ID and save video ───
    trip_id = str(uuid.uuid4())
    video_filename = f"{trip_id}.mp4"
    video_path = UPLOAD_DIR / video_filename

    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save video: {e}",
        )
    finally:
        await video.close()

    logger.info(f"Trip {trip_id}: Video saved ({video_filename}), {len(gps_log)} GPS points.")

    # ─── 4. Create trip record in MongoDB ───
    trip_record = {
        "trip_id": trip_id,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "end_time": None,
        "status": "processing",
        "progress": 0,
        "route": gps_log,
        "video_filename": video_filename,
        "metadata": trip_metadata,
        "analyzed_video_url": None,
    }
    await trips_collection.insert_one(trip_record)

    # ─── 5. Run the inference pipeline in background ───
    background_tasks.add_task(process_video, trip_id, str(video_path), gps_log)

    return {
        "trip_id": trip_id,
        "message": "Processing started"
    }


# =================================================================
# GET /api/trips/{trip_id}/status — Get processing status
# =================================================================
@router.get("/trips/{trip_id}/status")
async def get_trip_status(trip_id: str):
    """Retrieve the processing status of a specific trip."""
    trip = await trips_collection.find_one(
        {"trip_id": trip_id}, {"_id": 0, "status": 1, "progress": 1}
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found.",
        )
    return trip


# =================================================================
# GET /api/trips — List all trips
# =================================================================
@router.get("/trips")
async def get_trips():
    """Retrieve all trips, most recent first."""
    trips = await trips_collection.find(
        {}, {"_id": 0}
    ).sort("start_time", -1).to_list(100)
    return {"trips": trips}


# =================================================================
# GET /api/trips/{trip_id} — Get a specific trip
# =================================================================
@router.get("/trips/{trip_id}")
async def get_trip(trip_id: str):
    """Retrieve a specific trip by its ID."""
    trip = await trips_collection.find_one(
        {"trip_id": trip_id}, {"_id": 0}
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found.",
        )
    return trip


# =================================================================
# GET /api/defects — List all defects
# =================================================================
@router.get("/defects")
async def get_defects():
    """Retrieve all detected defects."""
    defects = await defects_collection.find(
        {}, {"_id": 0}
    ).sort("detected_at", -1).to_list(1000)
    return {"defects": defects}


# =================================================================
# GET /api/defects/{trip_id} — Get defects for a specific trip
# =================================================================
@router.get("/defects/{trip_id}")
async def get_defects_by_trip(trip_id: str):
    """Retrieve defects for a specific trip."""
    defects = await defects_collection.find(
        {"trip_id": trip_id}, {"_id": 0}
    ).to_list(1000)
    return {"defects": defects}


# =================================================================
# GET /api/stats — Aggregate Statistics
# =================================================================
@router.get("/stats")
async def get_stats():
    """Retrieve overall system statistics for the dashboard."""
    total_trips = await trips_collection.count_documents({})
    total_defects = await defects_collection.count_documents({})
    potholes = await defects_collection.count_documents({"defect_type": "Pothole"})
    cracks = await defects_collection.count_documents({"defect_type": "Crack"})

    severity_stats = {}
    for sev in ["Low", "Medium", "High"]:
        count = await defects_collection.count_documents({"severity": sev})
        severity_stats[sev] = count

    return {
        "total_trips": total_trips,
        "total_defects": total_defects,
        "potholes": potholes,
        "cracks": cracks,
        "severity": severity_stats,
    }


# =================================================================
# GET /api/trips/{trip_id}/video — Serve Trip Video
# =================================================================
@router.get("/trips/{trip_id}/video")
async def get_trip_video(trip_id: str):
    """Serve the analyzed video for a given trip."""
    from fastapi.responses import FileResponse
    video_path = Path("static/analyzed_videos") / f"{trip_id}.mp4"
    if not video_path.exists():
        # Fallback to the original upload if analysis is not complete
        video_path = Path("uploads") / f"{trip_id}.mp4"
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(str(video_path), media_type="video/mp4")
