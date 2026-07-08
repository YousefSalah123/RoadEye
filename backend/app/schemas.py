from typing import Literal, Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════
# Image/Video Detection Schemas (used by /detect/image & /detect/video)
# ═══════════════════════════════════════════════════════════════

class BoundingBox(BaseModel):
    x_min: int = Field(..., description="Minimum x coordinate")
    y_min: int = Field(..., description="Minimum y coordinate")
    x_max: int = Field(..., description="Maximum x coordinate")
    y_max: int = Field(..., description="Maximum y coordinate")


class Detection(BaseModel):
    class_id: int = Field(..., description="Predicted class index")
    confidence_score: float = Field(..., description="Detection confidence")
    bounding_box: BoundingBox


class DetectionResponse(BaseModel):
    detections: list[Detection]


# ═══════════════════════════════════════════════════════════════
# Trip & Defect Pipeline Schemas (for mobile upload → MongoDB)
# ═══════════════════════════════════════════════════════════════

class GPSPoint(BaseModel):
    """A single GPS reading captured during a trip."""
    time_offset_sec: float = Field(..., description="Seconds since recording started")
    lat: float = Field(..., description="Latitude in decimal degrees")
    lng: float = Field(..., description="Longitude in decimal degrees")


class GeoJSONPoint(BaseModel):
    """GeoJSON Point format for MongoDB geospatial queries."""
    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(
        ..., description="[longitude, latitude] per GeoJSON spec"
    )


class TripDocument(BaseModel):
    """MongoDB document schema for a recorded trip."""
    trip_id: str
    start_time: str
    end_time: Optional[str] = None
    status: Literal["processing", "completed", "failed"] = "processing"
    route: list[GPSPoint] = []
    video_filename: str = ""


class DefectDocument(BaseModel):
    """MongoDB document schema for a detected road defect."""
    defect_id: str
    trip_id: str
    defect_type: Literal["Crack", "Pothole"]
    confidence_score: float = Field(..., ge=0, le=1)
    severity: Literal["Low", "Medium", "High"]
    image_path: str
    location: GeoJSONPoint
    time_offset_sec: float
    detected_at: str


class UploadResponse(BaseModel):
    """Response from the /api/trips/upload endpoint."""
    trip_id: str
    status: str
    defects_found: int
    defects: list[dict] = []
