# ==============================================================================
# Objective: Balance the TRAIN set dynamically to a 4.0:1 (Crack:Pothole) ratio 
# Method: In-Place Weighted Hybrid Oversampling using a smart copy bank
# ==============================================================================

import os
import shutil
import random
from pathlib import Path

# == 1. CONFIGURATION ==========================================================
# Target ONLY the train split of our highly secured V4 dataset
TRAIN_DIR = Path(r"D:\RDD2022_Japan\roadeye_v4_strict_stratified\train")
TRAIN_IMG = TRAIN_DIR / "images"
TRAIN_LBL = TRAIN_DIR / "labels"

TARGET_RATIO = 4.0  # 4 Cracks for every 1 Pothole
RANDOM_SEED = 42

random.seed(RANDOM_SEED)

print("🚀 Starting In-Place Weighted Hybrid Oversampling (Target 4:1)...")

# == 2. ANALYSIS & BANK BUILDING ===============================================
total_cracks = 0
total_potholes = 0
copy_bank = []

# Fetch original label files (ignoring any already oversampled files if script is rerun)
original_txt_files = [f for f in TRAIN_LBL.glob("*.txt") if not f.name.startswith("os_")]

for txt_file in original_txt_files:
    cracks_in_file = 0
    potholes_in_file = 0
    
    with open(txt_file, "r") as f:
        for line in f:
            parts = line.strip().split()
            if not parts: continue
            
            cls_id = int(parts[0])
            if cls_id == 0:
                cracks_in_file += 1
            elif cls_id == 1:
                potholes_in_file += 1
                
    total_cracks += cracks_in_file
    total_potholes += potholes_in_file
    
    # -- SMART FILTER: Build the Copy Bank --
    if potholes_in_file > 0:
        # Priority 1: Pothole ONLY (High Weight - Highly desirable)
        if cracks_in_file == 0:
            copy_bank.extend([txt_file] * 2) 
        # Priority 2: BOTH (Potholes dominant or equal)
        elif potholes_in_file >= cracks_in_file:
            copy_bank.append(txt_file)
        # Priority 3: BOTH (Cracks slightly dominant, acceptable noise)
        elif cracks_in_file - potholes_in_file <= 1:
            copy_bank.append(txt_file)

print(f"📊 Initial TRAIN Counts: {total_cracks} Cracks vs {total_potholes} Potholes.")
print(f"🗂️ Copy Bank built with {len(set(copy_bank))} unique eligible images.")

# == 3. IN-PLACE HYBRID OVERSAMPLING ===========================================
print("\n⏳ Phase 2: Generating duplicates to reach exactly the target ratio...")

current_cracks = total_cracks
current_potholes = total_potholes
target_potholes = int(current_cracks / TARGET_RATIO)

added_potholes = 0
added_cracks = 0
copy_index = 1

if target_potholes > current_potholes:
    print(f"⚖️ Target: Need approx ~{target_potholes - current_potholes} more potholes to achieve 4:1.")
    
    # Dynamically inject files until mathematical balance is achieved
    while current_potholes < target_potholes:
        chosen_file = random.choice(copy_bank)
        
        c_count = 0
        p_count = 0
        with open(chosen_file, "r") as f:
            for line in f:
                cls_id = int(line.strip().split()[0])
                if cls_id == 0: c_count += 1
                elif cls_id == 1: p_count += 1
                
        stem = chosen_file.stem
        new_stem = f"os_{copy_index:05d}_{stem}"
        
        # Locate the corresponding image extension
        img_src = None
        for ext in [".jpg", ".jpeg", ".png"]:
            temp_src = TRAIN_IMG / (stem + ext)
            if temp_src.exists():
                img_src = temp_src
                break
                
        if img_src:
            # Duplicate the file in the exact same directory with the 'os_' prefix
            shutil.copy2(img_src, TRAIN_IMG / (new_stem + img_src.suffix))
            shutil.copy2(chosen_file, TRAIN_LBL / (new_stem + ".txt"))
            
            added_potholes += p_count
            added_cracks += c_count
            copy_index += 1
            
            # Dynamic Update: Recalculate totals and the new target continuously
            current_cracks = total_cracks + added_cracks
            current_potholes = total_potholes + added_potholes
            target_potholes = int(current_cracks / TARGET_RATIO)
else:
    print("✅ No oversampling needed. Dataset is already balanced or exceeds 4:1 ratio.")

# == 4. FINAL REPORT ===========================================================
print("\n" + "="*50)
print("🎉 HYBRID OVERSAMPLING COMPLETE!")
print(f"Generated {copy_index - 1} new duplicate images in the TRAIN set.")
print(f"FINAL TRAIN CRACK INSTANCES   : {current_cracks:,}")
print(f"FINAL TRAIN POTHOLE INSTANCES : {current_potholes:,}")
print(f"FINAL TRAIN RATIO             : {(current_cracks / max(current_potholes, 1)):.2f}:1")
print(f"Data resides securely in      : {TRAIN_DIR}")
print("="*50)
print("⚠️ YOU ARE NOW READY TO TRAIN FROM SCRATCH (yolov8m.pt)!")