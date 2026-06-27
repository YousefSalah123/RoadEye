import os
import random
import shutil
import math
from pathlib import Path
from collections import defaultdict

# ==========================================================
# CONFIGURATION & PATHS
# ==========================================================
JAPAN_DIR = Path(r"D:\RoadEye\RDD2022_Japan\Japan\train\yolo_filtered")
OUTPUT_DIR = Path(r"D:\RoadEye\model6\Japan_Final_Split")

# Dynamic Ratio (Crack-Only Images / Pothole-Containing Images)
# E.g., 2.1 * 1352 (Pothole+Mixed) ≈ 2839 Crack-Only Images
TARGET_CRACK_RATIO = 2.1  

PREFIX = "jp_"
SPLIT_RATIOS = {"train": 0.70, "valid": 0.15, "test": 0.15}
SEED = 42

random.seed(SEED)

IMAGES_DIR = JAPAN_DIR / "images"
LABELS_DIR = JAPAN_DIR / "labels"

# ==========================================================
# PHASE 1: STRATIFIED BUCKETING & SEPARATION
# ==========================================================
pothole_only_images = []
mixed_images = []
crack_only_buckets = defaultdict(list)

for img_path in IMAGES_DIR.glob("*.*"):
    if img_path.suffix.lower() not in [".jpg", ".jpeg", ".png"]:
        continue

    lbl_path = LABELS_DIR / f"{img_path.stem}.txt"
    if not lbl_path.exists():
        continue

    with open(lbl_path, "r") as f:
        lines = [line.strip() for line in f if line.strip()]

    if not lines:
        continue

    c_count = 0
    p_count = 0
    box_sizes = []
    aspect_types = []

    for line in lines:
        vals = line.split()
        cls = int(vals[0])
        w, h = float(vals[3]), float(vals[4])

        if cls == 0:
            c_count += 1
        elif cls == 1:
            p_count += 1

        # Geometric mean (Normalized Proxy)
        size = math.sqrt(w * h)
        if size < 0.05: size_bucket = "16_32"
        elif size < 0.10: size_bucket = "32_64"
        elif size < 0.20: size_bucket = "64_128"
        else: size_bucket = "128_plus"
        box_sizes.append(size_bucket)

        # Aspect Ratio
        ratio = w / h if h > 0 else 1
        if ratio > 1.5: aspect = "wide"
        elif ratio < 0.67: aspect = "tall"
        else: aspect = "square"
        aspect_types.append(aspect)

    # Separate Pothole Only vs Mixed vs Crack-Only
    if p_count > 0 and c_count == 0:
        pothole_only_images.append(img_path.name)
    elif p_count > 0 and c_count > 0:
        mixed_images.append(img_path.name)
    elif c_count > 0 and p_count == 0:
        # Density Binning for crack-only images
        if c_count == 1: density_bin = "1"
        elif c_count == 2: density_bin = "2"
        elif 3 <= c_count <= 5: density_bin = "3-5"
        else: density_bin = "6+"

        dominant_size = max(set(box_sizes), key=box_sizes.count)
        dominant_aspect = max(set(aspect_types), key=aspect_types.count)

        key = (density_bin, dominant_size, dominant_aspect)
        crack_only_buckets[key].append(img_path.name)

# ==========================================================
# PHASE 2: DYNAMIC PROPORTIONAL DOWNSAMPLING
# ==========================================================
total_pothole_related = len(pothole_only_images) + len(mixed_images)
target_crack_only = int(total_pothole_related * TARGET_CRACK_RATIO)

selected_cracks = []
total_crack_only_available = sum(len(v) for v in crack_only_buckets.values())

for bucket, images in crack_only_buckets.items():
    proportion = len(images) / total_crack_only_available
    n = max(1, round(proportion * target_crack_only))
    selected = random.sample(images, min(n, len(images)))
    selected_cracks.extend(selected)

# Safety Cap ensuring precise target
if len(selected_cracks) > target_crack_only:
    selected_cracks = random.sample(selected_cracks, target_crack_only)

print(f"✅ Extracted Pothole-Only images : {len(pothole_only_images)}")
print(f"✅ Extracted Mixed images        : {len(mixed_images)}")
print(f"✅ Sampled Crack-Only images     : {len(selected_cracks)} (Target Ratio: {TARGET_CRACK_RATIO})")

# ==========================================================
# PHASE 3: ISOLATED SPLITTING & PREFIXING
# ==========================================================
def distribute_and_copy(file_list, category_name):
    """Splits a specific subset independently into Train/Valid/Test and applies prefixes."""
    if not file_list:
        return

    random.shuffle(file_list)

    train_idx = int(len(file_list) * SPLIT_RATIOS["train"])
    valid_idx = train_idx + int(len(file_list) * SPLIT_RATIOS["valid"])

    splits = {
        "train": file_list[:train_idx],
        "valid": file_list[train_idx:valid_idx],
        "test": file_list[valid_idx:]
    }

    print(f"   -> {category_name}: Train({len(splits['train'])}) Valid({len(splits['valid'])}) Test({len(splits['test'])})")

    for split_name, files in splits.items():
        out_img_dir = OUTPUT_DIR / split_name / "images"
        out_lbl_dir = OUTPUT_DIR / split_name / "labels"

        out_img_dir.mkdir(parents=True, exist_ok=True)
        out_lbl_dir.mkdir(parents=True, exist_ok=True)

        for filename in files:
            stem = Path(filename).stem
            src_img = IMAGES_DIR / filename
            src_lbl = LABELS_DIR / f"{stem}.txt"

            dest_img_name = f"{PREFIX}{filename}"
            dest_lbl_name = f"{PREFIX}{stem}.txt"

            shutil.copy2(src_img, out_img_dir / dest_img_name)
            shutil.copy2(src_lbl, out_lbl_dir / dest_lbl_name)

print("\n🚀 Splitting and copying files securely...")
distribute_and_copy(pothole_only_images, "Pothole-Only")
distribute_and_copy(mixed_images, "Mixed (Cracks+Potholes)")
distribute_and_copy(selected_cracks, "Crack-Only")

print(f"\n🏆 Dataset architecture completed successfully at: {OUTPUT_DIR}")