# 🛣️👁️ RoadEye | Intelligent Infrastructure Monitoring System

![RoadEye Banner](https://via.placeholder.com/1200x300/121212/00FFCC?text=RoadEye+:+Data-Centric+AI+for+Smart+Cities)

> **A Production-Grade, End-to-End Pothole and Crack Detection System powered by a Data-Centric YOLOv8 architecture, complete with Mobile Data Acquisition, an AI Inference Backend, and a Municipality Dashboard.**

---

## 🌟 Executive Summary
RoadEye is not just a computer vision model; it is a full **MLOps pipeline and deployment ecosystem**. Built to solve real-world infrastructure decay, the system utilizes dashcam footage from municipal vehicles to dynamically map, classify, and prioritize road defects (Cracks and Potholes) with extremely high confidence.

**Peak Model Performance (RoadEye V6.1B + TTA):**
* **Base Precision (Blind Test):** 61.43% mAP50
* **Crack Recall (TTA Mode):** 65.5%
* **Pothole Recall (TTA Mode):** 67.1%

---

## 🏗️ The Monorepo Architecture
This repository contains the entire RoadEye ecosystem, structured as a modern Monorepo:

```text
RoadEye/
├── ai_ml_pipeline/           # The Core MLOps & Data-Centric AI Engine
├── backend/                  # Python API & Inference Engine
├── dashboard/                # React/Vite Municipality Command Center
└── mobile/                   # React Native/Expo Driver Dashcam App