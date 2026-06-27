import os
import math
from pathlib import Path

# ==============================================================================
# RoadEye V5 - Deep Analytics Auditor (Aspect Ratios & Missing Metrics)
# ==============================================================================

# 1. Configuration Paths
JAPAN_DIR = Path(r"D:\RoadEye\RDD2022_Japan\Japan\train\yolo_filtered")
INDIA_DIR = Path(r"D:\RoadEye\Team_Workloads\RoadEye_V5_Splits\india")

def calculate_metrics(lbl_path, img_w=600, img_h=600):
    """
    Calculates size and aspect ratio for each bounding box in a label file.
    Assumes standard image size for scaling if actual image isn't loaded,
    as YOLO format is normalized.
    """
    metrics = {
        "cracks": {"count": 0, "aspect_ratios": {"tall": 0, "square": 0, "wide": 0}},
        "potholes": {"count": 0, "aspect_ratios": {"tall": 0, "square": 0, "wide": 0}},
        "box_sizes": {"16-32": 0, "32-64": 0, "64-128": 0, "128+": 0},
        "total_objects": 0
    }
    
    if not lbl_path.exists():
        return metrics
        
    with open(lbl_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5: continue
            
            cls_id = int(parts[0])
            w_norm, h_norm = float(parts[3]), float(parts[4])
            
            # Avoid division by zero
            if h_norm == 0: continue
            
            # Aspect Ratio Calculation (Width / Height)
            aspect_ratio = w_norm / h_norm
            category = "tall" if aspect_ratio < 0.8 else "wide" if aspect_ratio > 1.2 else "square"
            
            # Add to class-specific metrics
            if cls_id == 0:
                metrics["cracks"]["count"] += 1
                metrics["cracks"]["aspect_ratios"][category] += 1
            elif cls_id == 1:
                metrics["potholes"]["count"] += 1
                metrics["potholes"]["aspect_ratios"][category] += 1
                
            # Box Size Calculation (Geometric Mean)
            px_w = w_norm * img_w
            px_h = h_norm * img_h
            size = math.sqrt(px_w * px_h)
            
            if 16 <= size < 32: metrics["box_sizes"]["16-32"] += 1
            elif 32 <= size < 64: metrics["box_sizes"]["32-64"] += 1
            elif 64 <= size < 128: metrics["box_sizes"]["64-128"] += 1
            elif size >= 128: metrics["box_sizes"]["128+"] += 1
            
            metrics["total_objects"] += 1
            
    return metrics

def analyze_dataset(dataset_name, dataset_path, is_split=False):
    """Iterates through the dataset and aggregates deep analytics."""
    print(f"🔍 Analyzing {dataset_name}...")
    
    total_stats = {
        "cracks_ar": {"tall": 0, "square": 0, "wide": 0},
        "potholes_ar": {"tall": 0, "square": 0, "wide": 0},
        "box_sizes": {"16-32": 0, "32-64": 0, "64-128": 0, "128+": 0},
        "max_objects_per_img": 0
    }
    
    # Handle pre-split structure (India) vs raw structure (Japan)
    directories_to_check = []
    if is_split:
        for split in ["train", "valid", "test"]:
            directories_to_check.append(dataset_path / split / "labels")
    else:
        directories_to_check.append(dataset_path / "labels")
        
    for lbl_dir in directories_to_check:
        if not lbl_dir.exists(): continue
            
        for lbl_path in lbl_dir.glob("*.txt"):
            metrics = calculate_metrics(lbl_path)
            
            # Aggregate Aspect Ratios
            for cat in ["tall", "square", "wide"]:
                total_stats["cracks_ar"][cat] += metrics["cracks"]["aspect_ratios"][cat]
                total_stats["potholes_ar"][cat] += metrics["potholes"]["aspect_ratios"][cat]
                
            # Aggregate Box Sizes
            for size_bin in total_stats["box_sizes"].keys():
                total_stats["box_sizes"][size_bin] += metrics["box_sizes"][size_bin]
                
            # Update Max Objects
            if metrics["total_objects"] > total_stats["max_objects_per_img"]:
                total_stats["max_objects_per_img"] = metrics["total_objects"]
                
    return total_stats

def print_deep_analytics():
    japan_stats = analyze_dataset("JAPAN", JAPAN_DIR, is_split=False)
    india_stats = analyze_dataset("INDIA", INDIA_DIR, is_split=True)
    
    report = f"""
=========================================
🇯🇵 JAPAN - DEEP ANALYTICS
=========================================
Max Objects in a single image : {japan_stats['max_objects_per_img']}

[Aspect Ratios - Cracks]
Tall (Vertical)   : {japan_stats['cracks_ar']['tall']}
Square-ish        : {japan_stats['cracks_ar']['square']}
Wide (Horizontal) : {japan_stats['cracks_ar']['wide']}

[Aspect Ratios - Potholes]
Tall (Vertical)   : {japan_stats['potholes_ar']['tall']}
Square-ish        : {japan_stats['potholes_ar']['square']}
Wide (Horizontal) : {japan_stats['potholes_ar']['wide']}

=========================================
🇮🇳 INDIA - MISSING METRICS
=========================================
Max Objects in a single image : {india_stats['max_objects_per_img']}

[Bounding Box Size Distribution]
16-32 px  : {india_stats['box_sizes']['16-32']}
32-64 px  : {india_stats['box_sizes']['32-64']}
64-128 px : {india_stats['box_sizes']['64-128']}
128+ px   : {india_stats['box_sizes']['128+']}

[Aspect Ratios - Cracks]
Tall (Vertical)   : {india_stats['cracks_ar']['tall']}
Square-ish        : {india_stats['cracks_ar']['square']}
Wide (Horizontal) : {india_stats['cracks_ar']['wide']}

[Aspect Ratios - Potholes]
Tall (Vertical)   : {india_stats['potholes_ar']['tall']}
Square-ish        : {india_stats['potholes_ar']['square']}
Wide (Horizontal) : {india_stats['potholes_ar']['wide']}
"""
    print(report)

if __name__ == "__main__":
    print_deep_analytics()