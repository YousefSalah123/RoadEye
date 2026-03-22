# 🚧 RoadEye — Road Infrastructure Monitoring System

RoadEye is an **end-to-end Computer Vision system** designed to automatically detect and map road damage such as **cracks and potholes** using video input from dashcams or drones.

The system leverages **YOLOv8 (Ultralytics)** with transfer learning to perform real-time object detection, and integrates a full pipeline from data processing to deployment and visualization.

---

## 🎯 Key Features

- 🔍 **Automated Damage Detection**  
  Detects road anomalies (Cracks & Potholes) from images and video streams.

- 🎥 **Video Processing Pipeline**  
  Extracts frames from real-world driving footage using OpenCV.

- ⚡ **Real-Time Inference API**  
  FastAPI-based backend for serving model predictions.

- 🗺️ **Geospatial Visualization**  
  Maps detected anomalies using GPS data on an interactive dashboard.

- 🧠 **Data-Centric Approach**  
  Optimized dataset using RDD2022 (India subset) with class simplification and augmentation.

---

## 🧱 System Pipeline

```text
Video Input → Frame Extraction → Damage Detection → API → Data Logging → Dashboard Visualization
