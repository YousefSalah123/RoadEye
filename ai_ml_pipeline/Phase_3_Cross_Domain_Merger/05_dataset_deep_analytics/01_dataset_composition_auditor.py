import os
import cv2
import math
from pathlib import Path

# ==============================================================================
# RoadEye V5 - Ultimate Dataset Auditor
# ==============================================================================

# 1. Configuration Paths (Verify these match your local machine)
JAPAN_DIR = Path(r"D:\RoadEye\RDD2022_Japan\Japan\train\yolo_filtered")
INDIA_DIR = Path(r"D:\RoadEye\Team_Workloads\RoadEye_V5_Splits\india")

def calculate_box_size(img_w, img_h, norm_w, norm_h):
    """Calculates the geometric mean size of a bounding box in pixels."""
    px_w = norm_w * img_w
    px_h = norm_h * img_h
    return math.sqrt(px_w * px_h)

def audit_japan():
    """Audits the raw Japan dataset."""
    img_dir = JAPAN_DIR / "images"
    lbl_dir = JAPAN_DIR / "labels"
    
    stats = {
        "images": 0, "labels": 0,
        "cracks": 0, "potholes": 0,
        "crack_only_imgs": 0, "pothole_only_imgs": 0, "mixed_imgs": 0,
        "box_sizes": {"16-32": 0, "32-64": 0, "64-128": 0, "128+": 0}
    }
    
    if not img_dir.exists():
        print(f"Error: Japan directory not found at {JAPAN_DIR}")
        return stats

    for img_path in img_dir.glob("*.*"):
        if img_path.suffix.lower() not in ['.jpg', '.jpeg', '.png']: continue
        stats["images"] += 1
        
        lbl_path = lbl_dir / f"{img_path.stem}.txt"
        if not lbl_path.exists(): continue
        stats["labels"] += 1
        
        img_w, img_h = 0, 0
        img = cv2.imread(str(img_path))
        if img is not None:
            img_h, img_w = img.shape[:2]
            
        c_count, p_count = 0, 0
        
        with open(lbl_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) < 5: continue
                
                cls_id = int(parts[0])
                w_norm, h_norm = float(parts[3]), float(parts[4])
                
                if cls_id == 0:
                    c_count += 1
                    stats["cracks"] += 1
                elif cls_id == 1:
                    p_count += 1
                    stats["potholes"] += 1
                    
                if img_w > 0:
                    size = calculate_box_size(img_w, img_h, w_norm, h_norm)
                    if 16 <= size < 32: stats["box_sizes"]["16-32"] += 1
                    elif 32 <= size < 64: stats["box_sizes"]["32-64"] += 1
                    elif 64 <= size < 128: stats["box_sizes"]["64-128"] += 1
                    elif size >= 128: stats["box_sizes"]["128+"] += 1

        if c_count > 0 and p_count == 0: stats["crack_only_imgs"] += 1
        elif p_count > 0 and c_count == 0: stats["pothole_only_imgs"] += 1
        elif c_count > 0 and p_count > 0: stats["mixed_imgs"] += 1
        
    return stats

def audit_india():
    """Audits the pre-split India dataset."""
    splits = ["train", "valid", "test"]
    stats = {s: {"images": 0, "cracks": 0, "potholes": 0} for s in splits}
    
    if not INDIA_DIR.exists():
        print(f"Error: India directory not found at {INDIA_DIR}")
        return stats

    for split in splits:
        img_dir = INDIA_DIR / split / "images"
        lbl_dir = INDIA_DIR / split / "labels"
        
        if not img_dir.exists(): continue
            
        for img_path in img_dir.glob("*.*"):
            if img_path.suffix.lower() not in ['.jpg', '.jpeg', '.png']: continue
            stats[split]["images"] += 1
            
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            if not lbl_path.exists(): continue
            
            with open(lbl_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) < 5: continue
                    cls_id = int(parts[0])
                    if cls_id == 0: stats[split]["cracks"] += 1
                    elif cls_id == 1: stats[split]["potholes"] += 1
                    
    return stats

def print_report():
    print("Gathering data... This might take a minute depending on your disk speed.\n")
    jp_stats = audit_japan()
    in_stats = audit_india()
    
    total_jp_objs = jp_stats['cracks'] + jp_stats['potholes']
    avg_objs = round(total_jp_objs / jp_stats['images'], 2) if jp_stats['images'] > 0 else 0
    total_imgs = jp_stats['images'] + in_stats['train']['images'] + in_stats['valid']['images'] + in_stats['test']['images']
    
    report = f"""
=========================================
🇯🇵 JAPAN (Raw & Unsplit)
=========================================
Total images = {jp_stats['images']}
Total labels = {jp_stats['labels']}

Crack instances = {jp_stats['cracks']}
Pothole instances = {jp_stats['potholes']}
Average objects/image = {avg_objs}

Images with crack only = {jp_stats['crack_only_imgs']}
Images with pothole only = {jp_stats['pothole_only_imgs']}
Images with both = {jp_stats['mixed_imgs']}

[Bounding Box Size Distribution (Geometric Mean)]
16-32 px  : {jp_stats['box_sizes']['16-32']}
32-64 px  : {jp_stats['box_sizes']['32-64']}
64-128 px : {jp_stats['box_sizes']['64-128']}
128+ px   : {jp_stats['box_sizes']['128+']}

=========================================
🇮🇳 INDIA (Pre-Split Golden Dataset)
=========================================
Train images = {in_stats['train']['images']}
Valid images = {in_stats['valid']['images']}
Test images = {in_stats['test']['images']}

Train crack = {in_stats['train']['cracks']}
Train pothole = {in_stats['train']['potholes']}

Valid crack = {in_stats['valid']['cracks']}
Valid pothole = {in_stats['valid']['potholes']}

Test crack = {in_stats['test']['cracks']}
Test pothole = {in_stats['test']['potholes']}

=========================================
📊 FINAL PROJECT PROJECTION
=========================================
Expected Total Images after Merge = ~{total_imgs} images
Current Japan structure: images/labels ? Yes
Final objective: Both (Accuracy First -> Mobile Quantization)
"""
    print(report)

if __name__ == "__main__":
    print_report()