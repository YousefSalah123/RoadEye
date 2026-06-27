import logging
from pathlib import Path

import numpy as np
from fastapi import HTTPException, status
from ultralytics import YOLO

from app.schemas import BoundingBox, Detection, DetectionResponse
from app.utils import clamp_box_coordinates


logger = logging.getLogger(__name__)


class ModelService:
    """Singleton-like model service to keep YOLO loaded in memory."""

    # RoadEye V6.1B — updated 2026-06-21
    def __init__(self, model_path: str = "roadeye_v6_1b.pt") -> None:
        self.model_path = Path(model_path)
        self.model: YOLO | None = None

    def load(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model file not found: {self.model_path}")

        logger.info("Loading RoadEye V6.1B model from %s", self.model_path)
        self.model = YOLO(str(self.model_path))
        logger.info("RoadEye V6.1B model loaded successfully")

    def predict_image(self, image: np.ndarray) -> DetectionResponse:
        if self.model is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model is not loaded.",
            )

        # Run inference with RoadEye V6.1B default parameters:
        # conf=0.25 filters low-confidence noise, imgsz=1024 matches training resolution.
        results = self.model.predict(source=image, conf=0.25, imgsz=1024, verbose=False)
        if not results:
            return DetectionResponse(detections=[])

        result = results[0]
        boxes = result.boxes
        detections: list[Detection] = []

        if boxes is None or boxes.xyxy is None:
            return DetectionResponse(detections=[])

        image_height, image_width = image.shape[:2]

        for idx in range(len(boxes)):
            xyxy = boxes.xyxy[idx].tolist()
            confidence = float(boxes.conf[idx].item())
            class_id = int(boxes.cls[idx].item())

            x_min, y_min, x_max, y_max = map(int, xyxy)
            x_min, y_min, x_max, y_max = clamp_box_coordinates(
                x_min=x_min,
                y_min=y_min,
                x_max=x_max,
                y_max=y_max,
                width=image_width,
                height=image_height,
            )

            detections.append(
                Detection(
                    class_id=class_id,
                    confidence_score=confidence,
                    bounding_box=BoundingBox(
                        x_min=x_min,
                        y_min=y_min,
                        x_max=x_max,
                        y_max=y_max,
                    ),
                )
            )

        return DetectionResponse(detections=detections)


model_service = ModelService()
