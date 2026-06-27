import os
import shutil
from pathlib import Path

# ==========================================================
# CONFIGURATION & PATHS
# ==========================================================
JAPAN_SPLIT_DIR = Path(r"D:\RoadEye\model6\Japan_Final_Split")
INDIA_SPLIT_DIR = Path(r"D:\RoadEye\Team_Workloads\RoadEye_V5_Splits\india")
OUTPUT_DIR = Path(r"D:\RoadEye\model6\RoadEye_V6_Dataset")

INDIA_PREFIX = "in_"
SPLITS = ["train", "valid", "test"]

# ==========================================================
# PHASE 1: MERGE & VALIDATE
# ==========================================================
def safe_copy_and_validate():
    print("🚀 PHASE 1: Starting Secure Merge (Japan + India)...\n")
    
    for split in SPLITS:
        print(f"🔄 Processing '{split.upper()}' split...")
        
        out_img_dir = OUTPUT_DIR / split / "images"
        out_lbl_dir = OUTPUT_DIR / split / "labels"
        out_img_dir.mkdir(parents=True, exist_ok=True)
        out_lbl_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Process Japan
        jp_img_dir = JAPAN_SPLIT_DIR / split / "images"
        jp_lbl_dir = JAPAN_SPLIT_DIR / split / "labels"
        
        if jp_img_dir.exists():
            for img_path in jp_img_dir.glob("*.*"):
                dest_img = out_img_dir / img_path.name
                
                # Duplicate Check
                if dest_img.exists():
                    print(f"   ⚠️ WARNING: Duplicate image found -> {img_path.name}")
                    continue
                    
                shutil.copy2(img_path, dest_img)
                
                lbl_path = jp_lbl_dir / f"{img_path.stem}.txt"
                if lbl_path.exists():
                    shutil.copy2(lbl_path, out_lbl_dir / lbl_path.name)
                    
        # 2. Process India (Apply Prefix)
        in_img_dir = INDIA_SPLIT_DIR / split / "images"
        in_lbl_dir = INDIA_SPLIT_DIR / split / "labels"
        
        if in_img_dir.exists():
            for img_path in in_img_dir.glob("*.*"):
                dest_img_name = f"{INDIA_PREFIX}{img_path.name}"
                dest_lbl_name = f"{INDIA_PREFIX}{img_path.stem}.txt"
                
                dest_img = out_img_dir / dest_img_name
                
                # Duplicate Check
                if dest_img.exists():
                    print(f"   ⚠️ WARNING: Duplicate image found -> {dest_img_name}")
                    continue
                    
                shutil.copy2(img_path, dest_img)
                
                lbl_path = in_lbl_dir / f"{img_path.stem}.txt"
                if lbl_path.exists():
                    shutil.copy2(lbl_path, out_lbl_dir / dest_lbl_name)

        # 3. Post-Merge Assertion Check (Images == Labels)
        total_imgs = len(list(out_img_dir.glob("*.*")))
        total_lbls = len(list(out_lbl_dir.glob("*.txt")))
        
        assert total_imgs == total_lbls, f"❌ FATAL ERROR in {split}: Images ({total_imgs}) != Labels ({total_lbls})"
        print(f"   ✅ '{split.upper()}' passed validation. Images = Labels = {total_imgs}")

# ==========================================================
# PHASE 2: FINAL DATASET ANALYTICS
# ==========================================================
def generate_final_report():
    print("\n📊 PHASE 2: Generating Final Dataset Analytics...\n")
    
    grand_total_images = 0
    grand_cracks = 0
    grand_potholes = 0
    
    report_lines = []
    
    for split in SPLITS:
        out_img_dir = OUTPUT_DIR / split / "images"
        out_lbl_dir = OUTPUT_DIR / split / "labels"
        
        if not out_lbl_dir.exists():
            continue
            
        split_images = len(list(out_img_dir.glob("*.*")))
        split_cracks = 0
        split_potholes = 0
        
        for lbl_path in out_lbl_dir.glob("*.txt"):
            with open(lbl_path, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if not parts: 
                        continue
                    if parts[0] == "0":
                        split_cracks += 1
                    elif parts[0] == "1":
                        split_potholes += 1
                        
        ratio = round(split_cracks / split_potholes, 2) if split_potholes > 0 else float('inf')
        
        grand_total_images += split_images
        grand_cracks += split_cracks
        grand_potholes += split_potholes
        
        report_lines.append(f"[{split.upper()} SPLIT]")
        report_lines.append(f"Total Images      : {split_images}")
        report_lines.append(f"Crack Instances   : {split_cracks}")
        report_lines.append(f"Pothole Instances : {split_potholes}")
        report_lines.append(f"Crack:Pothole Ratio: {ratio} : 1")
        report_lines.append("-" * 30)

    overall_ratio = round(grand_cracks / grand_potholes, 2) if grand_potholes > 0 else float('inf')
    
    print("=========================================")
    print("🏆 ROADEYE V6 FINAL DATASET REPORT 🏆")
    print("=========================================")
    for line in report_lines:
        print(line)
        
    print("[OVERALL PROJECT METRICS]")
    print(f"Total Dataset Images : {grand_total_images}")
    print(f"Total Cracks         : {grand_cracks}")
    print(f"Total Potholes       : {grand_potholes}")
    print(f"Final Class Ratio    : {overall_ratio} : 1")
    print("=========================================")

if __name__ == "__main__":
    safe_copy_and_validate()
    generate_final_report()