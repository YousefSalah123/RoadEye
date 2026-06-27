import os
from pathlib import Path

# ==============================================================================
# RoadEye V5 - The Final Micro-Auditor (Closing the Blind Spots)
# ==============================================================================

# 1. Configuration Paths
JAPAN_DIR = Path(r"D:\RoadEye\RDD2022_Japan\Japan\train\yolo_filtered")
INDIA_DIR = Path(r"D:\RoadEye\Team_Workloads\RoadEye_V5_Splits\india")

def get_final_missing_metrics():
    print("🔍 Extracting the final 4 missing metrics...\n")
    
    # ---------------------------------------------------------
    # Metrics Storage
    # ---------------------------------------------------------
    metrics = {
        "jp_empty_images": 0,
        "jp_mixed_distribution": {2: 0, 3: 0, 4: 0, "5+": 0},
        "jp_potholes_per_image": {1: 0, 2: 0, "3+": 0},
        "in_empty_images": 0
    }
    
    # ---------------------------------------------------------
    # 1. Scan Japan Dataset (Empty, Mixed Dist, Pothole Dist)
    # ---------------------------------------------------------
    jp_img_dir = JAPAN_DIR / "images"
    jp_lbl_dir = JAPAN_DIR / "labels"
    
    if jp_img_dir.exists():
        for img_path in jp_img_dir.glob("*.*"):
            if img_path.suffix.lower() not in ['.jpg', '.jpeg', '.png']:
                continue
                
            lbl_path = jp_lbl_dir / f"{img_path.stem}.txt"
            
            # Check for empty images (Missing label file or 0 byte file)
            if not lbl_path.exists() or lbl_path.stat().st_size == 0:
                metrics["jp_empty_images"] += 1
                continue
                
            c_count = 0
            p_count = 0
            
            with open(lbl_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if not parts: 
                        continue
                    if parts[0] == "0":
                        c_count += 1
                    elif parts[0] == "1":
                        p_count += 1
                        
            # Check if image is completely empty despite having a file
            if c_count == 0 and p_count == 0:
                metrics["jp_empty_images"] += 1
                
            # Distribution 1: Pothole instances per image
            if p_count > 0:
                if p_count == 1:
                    metrics["jp_potholes_per_image"][1] += 1
                elif p_count == 2:
                    metrics["jp_potholes_per_image"][2] += 1
                else:
                    metrics["jp_potholes_per_image"]["3+"] += 1
                    
            # Distribution 2: Mixed images distribution
            if c_count > 0 and p_count > 0:
                total_objects = c_count + p_count
                if total_objects == 2:
                    metrics["jp_mixed_distribution"][2] += 1
                elif total_objects == 3:
                    metrics["jp_mixed_distribution"][3] += 1
                elif total_objects == 4:
                    metrics["jp_mixed_distribution"][4] += 1
                else:
                    metrics["jp_mixed_distribution"]["5+"] += 1

    # ---------------------------------------------------------
    # 2. Scan India Dataset (Verification of 0 Empty Images)
    # ---------------------------------------------------------
    if INDIA_DIR.exists():
        for split in ["train", "valid", "test"]:
            in_img_dir = INDIA_DIR / split / "images"
            in_lbl_dir = INDIA_DIR / split / "labels"
            
            if not in_img_dir.exists():
                continue
                
            for img_path in in_img_dir.glob("*.*"):
                if img_path.suffix.lower() not in ['.jpg', '.jpeg', '.png']:
                    continue
                    
                lbl_path = in_lbl_dir / f"{img_path.stem}.txt"
                
                if not lbl_path.exists() or lbl_path.stat().st_size == 0:
                    metrics["in_empty_images"] += 1
                    continue
                    
                has_defect = False
                with open(lbl_path, 'r') as f:
                    for line in f:
                        if line.strip():
                            has_defect = True
                            break
                            
                if not has_defect:
                    metrics["in_empty_images"] += 1

    # ---------------------------------------------------------
    # 3. Print Final Report
    # ---------------------------------------------------------
    report = f"""
=========================================
FINAL BLIND SPOTS REPORT
=========================================

1) Japan Empty Images (0 Labels) : {metrics['jp_empty_images']} images

2) Japan Mixed Images (Total Objects Distribution)
   -> Images with exactly 2 objects : {metrics['jp_mixed_distribution'][2]}
   -> Images with exactly 3 objects : {metrics['jp_mixed_distribution'][3]}
   -> Images with exactly 4 objects : {metrics['jp_mixed_distribution'][4]}
   -> Images with 5+ objects        : {metrics['jp_mixed_distribution']['5+']}

3) Japan Potholes Distribution
   -> Images containing exactly 1 pothole  : {metrics['jp_potholes_per_image'][1]}
   -> Images containing exactly 2 potholes : {metrics['jp_potholes_per_image'][2]}
   -> Images containing 3+ potholes        : {metrics['jp_potholes_per_image']['3+']}

4) India Empty Images (Defect Check) : {metrics['in_empty_images']} images
=========================================
"""
    print(report)

if __name__ == "__main__":
    get_final_missing_metrics()