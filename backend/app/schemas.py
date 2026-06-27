from pydantic import BaseModel, Field


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
