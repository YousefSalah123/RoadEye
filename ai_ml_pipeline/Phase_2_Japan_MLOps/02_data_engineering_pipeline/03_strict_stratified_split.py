import os
import shutil
import random
import hashlib
from pathlib import Path

# ==========================================
# Configuration: Target your Filtered Data
# ==========================================
SOURCE_BASE = Path("D:/RDD2022_Japan/Japan/train/yolo_filtered")
OUTPUT_BASE = Path("D:/RDD2022_Japan/roadeye_v4_strict_stratified")

TRAIN_RATIO = 0.75
VALID_RATIO = 0.15
TEST_RATIO = 0.10
RANDOM_SEED = 42

# YOLO Class IDs (Update if different)
# 0 = Crack, 1 = Pothole (Minority Class)
MINORITY_CLASS_ID = '1' 

def get_file_hash(filepath):
    """
    Calculate MD5 hash to detect exact duplicate images.
    """
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return None

def get_image_category(label_path):
    """
    Stratify based on the density (count) of the minority class (potholes).
    Returns a specific category to ensure a highly balanced split.
    """
    pothole_count = 0
    try:
        with open(label_path, 'r') as f:
            for line in f:
                cls_id = line.strip().split()[0]
                if cls_id == MINORITY_CLASS_ID:
                    pothole_count += 1
    except Exception:
        pass
        
    if pothole_count == 0:
        return "crack_only"
    elif 1 <= pothole_count <= 2:
        return "low_pothole_density"
    else:
        return "high_pothole_density"

def execute_bulletproof_split():
    print("🚀 Initiating Bulletproof Stratified Splitting...")
    
    images_dir = SOURCE_BASE / "images"
    labels_dir = SOURCE_BASE / "labels"
    
    # Storage for advanced categorization
    categorized_pairs = {
        "crack_only": [],
        "low_pothole_density": [],
        "high_pothole_density": []
    }
    
    seen_hashes = set()
    duplicates_removed = 0
    missing_labels = 0
    
    print("🔍 Scanning, Deduplicating, and Stratifying dataset...")
    
    # 1. Recursive search (rglob) + Relative Path Mapping + Deduplication
    for img_path in images_dir.rglob("*"):
        if img_path.is_file() and img_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
            
            # FIX 1: Preserve relative path to map labels correctly across subfolders
            relative_path = img_path.relative_to(images_dir)
            lbl_path = labels_dir / relative_path.with_suffix(".txt")
            
            if not lbl_path.exists():
                missing_labels += 1
                continue
                
            # Deduplication Check
            img_hash = get_file_hash(img_path)
            if not img_hash or img_hash in seen_hashes:
                duplicates_removed += 1
                continue
            
            seen_hashes.add(img_hash)
            
            # FIX 2: Stronger Density-Based Stratification
            category = get_image_category(lbl_path)
            
            # Store the relative path along with absolute paths for safe copying later
            categorized_pairs[category].append((img_path, lbl_path, relative_path))

    total_unique = sum(len(pairs) for pairs in categorized_pairs.values())
    
    print("-" * 50)
    print("📊 DATASET DENSITY & INTEGRITY REPORT")
    print("-" * 50)
    print(f"Total Unique Valid Images : {total_unique}")
    print(f"Duplicates Ignored        : {duplicates_removed}")
    print(f"Missing Labels Ignored    : {missing_labels}")
    print(f"Images with 3+ Potholes   : {len(categorized_pairs['high_pothole_density'])}")
    print(f"Images with 1-2 Potholes  : {len(categorized_pairs['low_pothole_density'])}")
    print(f"Images with Cracks only   : {len(categorized_pairs['crack_only'])}")
    print("-" * 50)
    
    if total_unique == 0:
        print("❌ CRITICAL: No valid unique files found.")
        return

    # 2. Execute Stratified Split
    random.seed(RANDOM_SEED)
    final_splits = {"train": [], "valid": [], "test": []}
    
    for category, pairs in categorized_pairs.items():
        random.shuffle(pairs)
        n_total = len(pairs)
        n_train = int(n_total * TRAIN_RATIO)
        n_valid = int(n_total * VALID_RATIO)
        
        final_splits["train"].extend(pairs[:n_train])
        final_splits["valid"].extend(pairs[n_train:n_train + n_valid])
        final_splits["test"].extend(pairs[n_train + n_valid:])

    # Shuffle the final combined splits to ensure mixed batches during training
    for key in final_splits:
        random.shuffle(final_splits[key])

    # 3. Secure File Copying with Collision Prevention
    print("⏳ Copying files securely to isolated directories...")
    for split_name, pairs in final_splits.items():
        img_out_dir = OUTPUT_BASE / split_name / "images"
        lbl_out_dir = OUTPUT_BASE / split_name / "labels"
        
        img_out_dir.mkdir(parents=True, exist_ok=True)
        lbl_out_dir.mkdir(parents=True, exist_ok=True)
        
        for img_src, lbl_src, rel_path in pairs:
            # FIX 3: Prevent Overwrite by flattening the directory structure into a unique filename
            safe_name = str(rel_path).replace(os.sep, "__")
            safe_lbl_name = Path(safe_name).with_suffix(".txt").name
            
            shutil.copy2(img_src, img_out_dir / safe_name)
            shutil.copy2(lbl_src, lbl_out_dir / safe_lbl_name)
            
        print(f"   ✅ {split_name.upper()} : Safely secured {len(pairs)} images.")

    # 4. Generate YOLO Configuration
    yaml_content = f"""path: {OUTPUT_BASE.as_posix()}
train: train/images
val: valid/images
test: test/images

nc: 2
names: ['crack', 'pothole']
"""
    (OUTPUT_BASE / "data.yaml").write_text(yaml_content)
    
    print("-" * 50)
    print(f"🎯 MISSION ACCOMPLISHED: Bulletproof Stratified Data locked at: {OUTPUT_BASE}")
    print("⚠️ NEXT STEP: Run Oversampling exclusively on the new 'train' folder.")

if __name__ == "__main__":
    execute_bulletproof_split()