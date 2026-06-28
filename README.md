# 🛣️👁️ RoadEye | Intelligent Infrastructure Monitoring System

![RoadEye Banner](https://placehold.co/1200x300/121212/00FFCC.png?text=RoadEye+|+Data-Centric+AI+for+Smart+Cities)

> **A Production-Grade, End-to-End Pothole and Crack Detection System powered by a Data-Centric YOLOv8 architecture, complete with Mobile Data Acquisition, an AI Inference Backend, and a Municipality Dashboard.**

---

## 🌟 Executive Summary

RoadEye transcends traditional computer vision projects. It is a complete **MLOps pipeline and deployment ecosystem** built to solve real-world infrastructure decay. Utilizing dashcam footage from municipal vehicles, the system dynamically maps, classifies, and prioritizes road defects with extreme precision.

**Peak Model Performance (RoadEye V6.1B + TTA):**

* **Base Precision (Blind Test):** 61.43% mAP50
* **Crack Recall (TTA Mode):** 65.5%
* **Pothole Recall (TTA Mode):** 67.1%

---

## 🏗️ The Monorepo Architecture

Our repository is structured as a modern Monorepo, isolating the AI pipeline from the deployment services while maintaining a unified ecosystem:

```text
RoadEye/
├── ai_ml_pipeline/           # Core MLOps, Data Engineering & Notebooks
├── backend/                  # Python/FastAPI AI Inference Engine
├── dashboard/                # React/Vite Municipality Command Center
└── mobile/                   # React Native/Expo Driver Dashcam App
```

---

## 🧠 The Engineering Journey: A Data-Centric AI Approach

We abandoned the traditional "Model-Centric" approach (blindly tuning hyperparameters) and adopted a rigorous **Data-Centric** philosophy. Our engineering journey is documented fully within the `ai_ml_pipeline/` directory across 3 distinct phases:

### Phase 1: The India Baseline & "Annotation Slop"

* **Spatial Bias Discovery:** Conducted Exploratory Data Analysis (EDA) revealing that 100% of defects lie in the bottom 50% of the frame (due to dashcam physics), prohibiting vertical flip augmentations.
* **The 46% Ceiling:** Initial models hit a hard mAP ceiling of 46%. Forensic analysis revealed "Annotation Slop" (poor human labeling) and extreme class imbalance.

### Phase 2: Japan MLOps & Deep Data Engineering

* **The 16px Surgical Filter:** Discovered that aggressively filtering bounding boxes under 32px was destroying "distant potholes" (Forced False Negatives). Reverted to a surgical 16px filter, rescuing 996 critical potholes.
* **Weighted Hybrid Oversampling:** Engineered an algorithm to dynamically duplicate pothole-containing images, achieving a golden `4.0:1` (Crack:Pothole) ratio without distorting the visual context of the asphalt.
* **Zero-Leakage Protocol:** Designed a strict MD5-hash stratified splitting script to guarantee a 100% blind test set, overcoming an early Data Leakage trap.

### Phase 3: The Cross-Domain Merger & Forensic Era

* **"Less is More" Paradigm:** Merged the Indian Golden Dataset with the Japanese dataset. To prevent the massive Japanese dataset from causing Domain Bias, we surgically downsampled Japanese cracks, sacrificing quantity for domain adaptability.
* **The Forensic Error Analyzer:** Built custom diagnostic scripts to dissect False Positives and False Negatives by geometric size, aspect ratio, and scene density (crowdedness).
* **The TTA Revelation:** Applying Test-Time Augmentation (TTA) yielded 854 apparent "False Positives". Manual visual inspection revealed these were actually **true micro-cracks missed by human annotators**. The model had surpassed the quality of its own ground truth (Label Noise).

---

## ⚙️ System Components

### 1. Mobile App (Driver Node)

* **Tech Stack:** React Native, Expo, TypeScript.
* **Functionality:** Records high-resolution road footage while simultaneously syncing active GPS coordinates (Latitude/Longitude). Pushes packaged trip data securely to the backend.

### 2. Backend (The Inference Brain)

* **Tech Stack:** Python, FastAPI, YOLOv8.
* **Functionality:**
  * Extracts video frames and processes them through the `RoadEye_V6.1B.pt` weights.
  * Mates inference Bounding Boxes with exact GPS timestamps.
  * Calculates Severity (Low/Medium/High) based on pixel density relative to the frame.

### 3. Dashboard (Municipality Command Center)

* **Tech Stack:** React, Vite, TailwindCSS.
* **Functionality:** Provides interactive mapping, real-time damage trend charts, and dual-mode reporting (Per-Trip deep dives vs. City-Wide aggregations) to city officials.

---

## 🚀 Getting Started

### Prerequisites

* Python 3.10+
* Node.js v18+
* Expo CLI

### Installation & Execution

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/RoadEye.git
cd RoadEye
```

**2. Setup Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app/main.py
```

**3. Setup Dashboard**

```bash
cd dashboard
npm install
npm run dev
```

**4. Setup Mobile App**

```bash
cd mobile
npm install
npx expo start
```

---

## 👨‍💻 The Engineering Team

* **Yousef Salah Nage** - AI Tech Lead & Systems Architect
* **Mostafa** - Software Engineer
* **Andrew** - Software Engineer
* **Mohamed** - Software Engineer
* **Ali** - Software Engineer
* **Yousef Ibrahim** - Software Engineer

> *Built with engineering discipline, relentless debugging, and a refusal to accept "black-box" AI.*
