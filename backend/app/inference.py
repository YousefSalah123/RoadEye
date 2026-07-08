"""
RoadEye — Video Inference Pipeline
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
import av

from app.model import model_service
from app.utils import interpolate_gps
from app.database import defects_collection, trips_collection

logger = logging.getLogger(__name__)

# ─── Static directory for saving cropped defect images and videos ──────────
DEFECTS_DIR = Path("static/defects")
DEFECTS_DIR.mkdir(parents=True, exist_ok=True)

ANALYZED_VIDEOS_DIR = Path("static/analyzed_videos")
ANALYZED_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


async def process_video(
    trip_id: str,
    video_path: str,
    gps_log: list[dict],
) -> None:
    """
    Async wrapper for video processing. Runs the CV2 loop natively in the
    FastAPI event loop, but offloads the heavy YOLOv8 inference step to a
    background thread to prevent blocking. Processes frame-by-frame with
    DB debouncing.
    """
    try:
        if model_service.model is None:
            raise RuntimeError("YOLOv8 model is not loaded.")

        # Open video to process every frame
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video: {video_path}")

        original_fps = cap.get(cv2.CAP_PROP_FPS)
        if original_fps <= 0:
            original_fps = 30.0

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Read the very first frame to get dimensions
        ret, first_frame = cap.read()
        if not ret:
            cap.release()
            raise RuntimeError(f"Video contains no frames: {video_path}")
            
        H, W = first_frame.shape[:2]

        logger.info(
            f"Trip {trip_id}: Processing {total_frames} frames "
            f"(video fps={original_fps:.1f})"
        )

        out_video_filename = f"{trip_id}.mp4"
        out_video_path = ANALYZED_VIDEOS_DIR / out_video_filename

        # Set up PyAV VideoWriter at original FPS with H.264 codec
        out_container = av.open(str(out_video_path), mode="w")
        out_stream = out_container.add_stream("h264", rate=int(round(original_fps)))
        out_stream.width = W
        out_stream.height = H
        out_stream.pix_fmt = "yuv420p"

        defects = []
        frame_index = 0
        
        # Dictionary to track last insertion time per defect type to avoid spamming the DB
        last_db_insert_time = {}

        # Process the first frame that was already read, then continue in a loop
        current_frame = first_frame
        while True:
            time_offset_sec = frame_index / original_fps
            annotated_frame = current_frame.copy()

            # Update progress in MongoDB natively via await every 30 frames
            if frame_index % 30 == 0 and total_frames > 0:
                progress = int((frame_index / total_frames) * 100)
                await trips_collection.update_one(
                    {"trip_id": trip_id},
                    {"$set": {"progress": progress}}
                )

            # Offload heavy YOLOv8 CPU inference to a background thread
            results = await asyncio.to_thread(model_service.model.predict, current_frame, conf=0.25, verbose=False)

            should_freeze = False

            if results and results[0].boxes is not None:
                for box in results[0].boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                    w = x2 - x1
                    h = y2 - y1
                    cx = x1 + w // 2
                    cy = y1 + h // 2

                    # Perspective-Aware Filtering
                    if cy < H * 0.45: continue
                    if w > W * 0.40 or h > H * 0.40: continue

                    depth_ratio = (cy - H * 0.45) / (H * 0.55)
                    max_allowed_w = W * (0.05 + 0.35 * depth_ratio)
                    max_allowed_h = H * (0.05 + 0.35 * depth_ratio)
                    if w > max_allowed_w or h > max_allowed_h: continue

                    class_name = model_service.model.names.get(cls_id, "Unknown")
                    if "crack" in class_name.lower(): class_name = "Crack"
                    elif "pothole" in class_name.lower(): class_name = "Pothole"
                    else: continue

                    color = (0, 0, 255) if class_name == "Pothole" else (255, 0, 0)
                    
                    # Draw on annotated frame (happens every frame to create smooth video output)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    label = f"{class_name} {conf:.0%}"
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
                    cv2.rectangle(annotated_frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
                    cv2.putText(annotated_frame, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)

                    # ─── DB Throttling (Debouncing) ───
                    # Only insert a new record to the DB if it's been >=1.0s since the last record of this type
                    last_time = last_db_insert_time.get(class_name, -999.0)
                    if time_offset_sec - last_time >= 1.0:
                        last_db_insert_time[class_name] = time_offset_sec
                        should_freeze = True
                        
                        lat, lng = interpolate_gps(gps_log, time_offset_sec)

                        bbox_area = w * h
                        frame_area = H * W
                        area_ratio = bbox_area / frame_area
                        if area_ratio > 0.15: severity = "High"
                        elif area_ratio > 0.05: severity = "Medium"
                        else: severity = "Low"

                        defect_id = str(uuid.uuid4())
                        image_filename = f"{defect_id}.jpg"
                        image_path = DEFECTS_DIR / image_filename

                        crop_x1, crop_y1 = max(0, x1), max(0, y1)
                        crop_x2, crop_y2 = min(W, x2), min(H, y2)
                        cropped = current_frame[crop_y1:crop_y2, crop_x1:crop_x2]

                        if cropped.size > 0:
                            cv2.imwrite(str(image_path), cropped)

                        defect_record = {
                            "defect_id": defect_id,
                            "trip_id": trip_id,
                            "defect_type": class_name,
                            "confidence_score": round(conf, 4),
                            "severity": severity,
                            "image_path": f"/static/defects/{image_filename}",
                            "location": {
                                "type": "Point",
                                "coordinates": [lng, lat],
                            },
                            "time_offset_sec": time_offset_sec,
                            "detected_at": datetime.now(timezone.utc).isoformat(),
                        }
                        defects.append(defect_record)

            if should_freeze:
                # Visual indicator for the frozen frame
                text = "[!] DEFECT LOGGED"
                (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.2, 3)
                cv2.rectangle(annotated_frame, (20, 20), (20 + tw + 20, 20 + th + 20), (0, 0, 255), -1)
                cv2.putText(annotated_frame, text, (30, 20 + th + 10), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3, cv2.LINE_AA)
                
                rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
                av_frame = av.VideoFrame.from_ndarray(rgb_frame, format="rgb24")
                
                # Duplicate the frame to create a 1.5s freeze effect
                freeze_frames = int(original_fps * 1.5)
                for _ in range(freeze_frames):
                    for packet in out_stream.encode(av_frame):
                        out_container.mux(packet)
            else:
                # Convert BGR (cv2) to RGB for PyAV and write once
                rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
                av_frame = av.VideoFrame.from_ndarray(rgb_frame, format="rgb24")
                for packet in out_stream.encode(av_frame):
                    out_container.mux(packet)
                
            # Read next frame
            frame_index += 1
            ret, current_frame = cap.read()
            if not ret:
                break
                
        cap.release()

        # Flush encoder
        for packet in out_stream.encode():
            out_container.mux(packet)
        out_container.close()

        out_video_url = f"/static/analyzed_videos/{out_video_filename}"

        if defects:
            await defects_collection.insert_many(defects)
            logger.info(f"Trip {trip_id}: Inserted {len(defects)} defects into MongoDB.")

        await trips_collection.update_one(
            {"trip_id": trip_id},
            {"$set": {
                "status": "completed",
                "progress": 100,
                "analyzed_video_url": out_video_url,
                "end_time": datetime.now(timezone.utc).isoformat(),
            }}
        )

    except Exception as e:
        logger.error(f"Trip {trip_id}: Processing failed — {e}")
        await trips_collection.update_one(
            {"trip_id": trip_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )
