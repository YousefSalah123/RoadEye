# ============================================================
# RoadEye V5 Protocol — Phase 6: The Clean Merge & Verification
# ============================================================
# Features:
# - Smart Filtering: Ignores old 'os_' synthetic copies from Japan
# - Safe Prefixing (jp_ / in_)
# - Post-Merge Leakage Verification
# - Deep Source & Class Distribution Stats
# - Letterboxed Label Verification Grid
# ============================================================

import os
import shutil
import random
import cv2
import numpy as np
import yaml
from pathlib import Path

# ── 1. CONFIG & EXACT PATHS (BASED ON PROJECT TREE) ───────────
JAPAN_DIR = Path(r"D:\RoadEye\RDD2022_Japan\roadeye_v4_strict_stratified")
INDIA_DIR = Path(r"D:\RoadEye\Team_Workloads\RoadEye_V5_Splits\india")
# استخدام مسار جديد نظيف للداتا البيور
MERGED_DIR = Path(r"D:\RoadEye\dataset_v5_merged_clean")

CLASSES = ["Crack", "Pothole"]

# ── 2. SAFE MERGE LOGIC WITH FILTERING ────────────────────────
def copy_and_prefix(source_base, prefix, ignore_oversampled=False):
    if not source_base.exists():
        print(f"❌ Error: Source directory {source_base} not found!")
        return

    for split in ["train", "valid", "test"]:
        src_imgs = source_base / split / "images"
        src_lbls = source_base / split / "labels"
        dst_imgs = MERGED_DIR / split / "images"
        dst_lbls = MERGED_DIR / split / "labels"
        
        dst_imgs.mkdir(parents=True, exist_ok=True)
        dst_lbls.mkdir(parents=True, exist_ok=True)
        
        if not src_imgs.exists(): continue
            
        for img_path in src_imgs.glob("*.*"):
            if img_path.suffix.lower() not in [".jpg", ".jpeg", ".png"]: continue
            
            # 🛑 The Smart Filter: Ignore old synthetic copies
            if ignore_oversampled and img_path.name.startswith("os_"):
                continue
                
            new_img_name = f"{prefix}{img_path.name}"
            new_lbl_name = f"{prefix}{img_path.stem}.txt"
            lbl_path = src_lbls / f"{img_path.stem}.txt"
            
            if lbl_path.exists():
                shutil.copy2(img_path, dst_imgs / new_img_name)
                shutil.copy2(lbl_path, dst_lbls / new_lbl_name)

def perform_merge():
    print("🔄 Phase 1: Clean Merge (Filtering Synthetic Copies)...")
    if MERGED_DIR.exists(): shutil.rmtree(MERGED_DIR)
    
    print("   -> Copying Japan V4 (Prefix: 'jp_') [Skipping 'os_' files]...")
    copy_and_prefix(JAPAN_DIR, "jp_", ignore_oversampled=True)
    
    print("   -> Copying India V5 (Prefix: 'in_')...")
    copy_and_prefix(INDIA_DIR, "in_", ignore_oversampled=False)
    
    print("✅ Clean Merge completed successfully!\n")

# ── 3. FINAL LEAKAGE VERIFICATION ─────────────────────────────
def verify_split_isolation():
    print("🛡️  Phase 2: Final Leakage Verification (Post-Merge)...")
    def stems(split):
        p = MERGED_DIR / split / "images"
        if not p.exists(): return set()
        return {x.stem for x in p.glob("*.*")}

    train_s = stems("train")
    valid_s = stems("valid")
    test_s  = stems("test")

    checks = {
        "Train ∩ Valid": train_s & valid_s,
        "Train ∩ Test": train_s & test_s,
        "Valid ∩ Test": valid_s & test_s,
    }
    
    leak = False
    for name, overlap in checks.items():
        if overlap:
            print(f"❌ {name}: {len(overlap)} overlaps found!")
            leak = True
        else:
            print(f"✅ {name}: strict isolation confirmed.")
            
    if leak:
        raise ValueError("🚨 CRITICAL LEAKAGE DETECTED in merged splits! Aborting.")
    print("   -> Pipeline is safe.\n")

# ── 4. DEEP SOURCE & CLASS STATS ──────────────────────────────
def calculate_merged_stats():
    print("📊 Phase 3: Deep Post-Merge Statistics (Pure Data Breakdown)")
    print("="*75)
    
    for split in ["train", "valid", "test"]:
        lbl_dir = MERGED_DIR / split / "labels"
        if not lbl_dir.exists(): continue
            
        stats = {
            "jp": {"imgs": 0, "cracks": 0, "potholes": 0},
            "in": {"imgs": 0, "cracks": 0, "potholes": 0},
            "total": {"imgs": 0, "cracks": 0, "potholes": 0}
        }
        
        for txt_file in lbl_dir.glob("*.txt"):
            source = "jp" if txt_file.name.startswith("jp_") else "in"
            stats[source]["imgs"] += 1
            stats["total"]["imgs"] += 1
            
            with open(txt_file, "r") as f:
                for line in f.readlines():
                    cls_id = line.strip().split()[0]
                    if cls_id == "0":
                        stats[source]["cracks"] += 1
                        stats["total"]["cracks"] += 1
                    elif cls_id == "1":
                        stats[source]["potholes"] += 1
                        stats["total"]["potholes"] += 1
                        
        total_ratio = round(stats['total']['cracks'] / stats['total']['potholes'], 2) if stats['total']['potholes'] > 0 else 0
        
        print(f"🔵 {split.upper()} SPLIT (Total Imgs: {stats['total']['imgs']} | Ratio: {total_ratio}:1)")
        print(f"   -> JAPAN: Imgs={stats['jp']['imgs']:<5} | Cracks={stats['jp']['cracks']:<5} | Potholes={stats['jp']['potholes']:<5}")
        print(f"   -> INDIA: Imgs={stats['in']['imgs']:<5} | Cracks={stats['in']['cracks']:<5} | Potholes={stats['in']['potholes']:<5}")
        print("-" * 75)
    print("\n")

# ── 5. YAML GENERATION ────────────────────────────────────────
def generate_yaml():
    print("📝 Phase 4: Generating YOLO data.yaml...")
    yaml_path = MERGED_DIR / "roadeye_v5.yaml"
    yaml_content = {
        "path": str(MERGED_DIR.absolute()), 
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "names": {0: "Crack", 1: "Pothole"}
    }
    with open(yaml_path, "w") as f:
        yaml.dump(yaml_content, f, sort_keys=False, default_flow_style=False)
    print(f"✅ Created: {yaml_path}\n")

# ── 6. VISUALIZATION WITH LETTERBOX ───────────────────────────
def letterbox_resize(img, target_size=416, color=(0, 0, 0)):
    """Resizes image keeping aspect ratio and pads with solid color (YOLO style)."""
    shape = img.shape[:2] # [height, width]
    r = min(target_size / shape[0], target_size / shape[1])
    new_unpad = (int(round(shape[1] * r)), int(round(shape[0] * r)))
    
    dw = (target_size - new_unpad[0]) / 2  
    dh = (target_size - new_unpad[1]) / 2  

    if shape[::-1] != new_unpad:
        img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)
        
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return img

def draw_yolo_box(img, x_center, y_center, w, h, cls_id):
    ih, iw = img.shape[:2]
    x1, y1 = int((x_center - w/2) * iw), int((y_center - h/2) * ih)
    x2, y2 = int((x_center + w/2) * iw), int((y_center + h/2) * ih)
    
    color = (0, 0, 255) if cls_id == 1 else (255, 0, 0)
    label = "Pothole" if cls_id == 1 else "Crack"
    
    cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
    cv2.putText(img, label, (x1, max(y1-10, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    return img

def visualize_random_samples(grid_size=4, img_size=416):
    print("👁️  Phase 5: Generating Letterboxed Label Verification Grid...")
    train_imgs_dir = MERGED_DIR / "train" / "images"
    train_lbls_dir = MERGED_DIR / "train" / "labels"
    
    all_imgs = list(train_imgs_dir.glob("*.*"))
    if not all_imgs: return
        
    sample_count = min(grid_size * grid_size, len(all_imgs))
    samples = random.sample(all_imgs, sample_count)
    
    grid_rows = []
    for i in range(0, sample_count, grid_size):
        row_imgs = []
        for j in range(grid_size):
            if i+j < sample_count:
                img_path = samples[i+j]
                lbl_path = train_lbls_dir / f"{img_path.stem}.txt"
                
                img = cv2.imread(str(img_path))
                if img is None: continue
                
                if lbl_path.exists():
                    with open(lbl_path, "r") as f:
                        for line in f.readlines():
                            parts = [float(x) for x in line.strip().split()]
                            img = draw_yolo_box(img, parts[1], parts[2], parts[3], parts[4], int(parts[0]))
                
                img = letterbox_resize(img, target_size=img_size)
                
                source = "JAPAN" if img_path.name.startswith("jp_") else "INDIA"
                cv2.putText(img, source, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                row_imgs.append(img)
            else:
                row_imgs.append(np.zeros((img_size, img_size, 3), dtype=np.uint8))
                
        grid_rows.append(np.hstack(row_imgs))
        
    final_grid = np.vstack(grid_rows)
    out_path = MERGED_DIR / "verify_labels_letterboxed.jpg"
    cv2.imwrite(str(out_path), final_grid)
    print(f"✅ Visualization saved to: {out_path}\n")

# ── MAIN EXECUTION ────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🚀 Starting V5 Protocol Final Clean Merge Process\n")
    perform_merge()
    verify_split_isolation()
    calculate_merged_stats()
    generate_yaml()
    visualize_random_samples()
    print("🏆 V5 PURE DATASET IS FULLY PREPARED AND READY FOR FINE-TUNING!")