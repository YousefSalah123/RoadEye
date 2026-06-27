import os
from pathlib import Path

# ==========================================
# CONFIGURATION
# ==========================================
# Define the absolute path to your YOLO labels directory.
# We use raw strings (r"...") to handle Windows path slashes gracefully.
LABELS_DIR = Path(r"D:\RoadEye\RDD2022_Japan\Japan\train\yolo_filtered\labels")

# ==========================================
# COUNTERS INITIALIZATION
# ==========================================
# 1. Instance-level counters (Total bounding boxes)
total_cracks_instances = 0
total_potholes_instances = 0

# 2. Image-level counters (To understand distribution)
images_with_cracks_only = 0
images_with_potholes_only = 0
images_with_both = 0
empty_images = 0
total_processed_files = 0

print(f"Scanning directory: {LABELS_DIR} ...\n")

# ==========================================
# DATA PROCESSING
# ==========================================
# Iterate through all .txt files in the target directory
for txt_file in LABELS_DIR.glob("*.txt"):
    total_processed_files += 1
    
    # Flags to track what exists in the current image
    has_crack = False
    has_pothole = False
    
    # Open and read the YOLO annotation file
    with open(txt_file, "r") as f:
        lines = f.readlines()
        
        # Check if the file is completely empty (no annotations)
        if not lines:
            empty_images += 1
            continue
            
        # Parse each line (each line represents one bounding box)
        for line in lines:
            parts = line.strip().split()
            if not parts:
                continue # Skip empty lines
                
            try:
                class_id = int(parts[0])
                
                # Class 0 represents Cracks
                if class_id == 0:
                    total_cracks_instances += 1
                    has_crack = True
                # Class 1 represents Potholes
                elif class_id == 1:
                    total_potholes_instances += 1
                    has_pothole = True
            except ValueError:
                # Handle potential corrupted lines safely
                continue

    # Update image-level statistics based on flags
    if has_crack and not has_pothole:
        images_with_cracks_only += 1
    elif has_pothole and not has_crack:
        images_with_potholes_only += 1
    elif has_crack and has_pothole:
        images_with_both += 1

# ==========================================
# GENERATE REPORT
# ==========================================
print("=" * 50)
print(" 📊 JAPAN DATASET: COMPREHENSIVE STATISTICAL REPORT")
print("=" * 50)

print("\n--- 1. INSTANCE-LEVEL STATS (Bounding Boxes) ---")
print(f"Total Crack instances (Class 0)   : {total_cracks_instances:,}")
print(f"Total Pothole instances (Class 1) : {total_potholes_instances:,}")

# Calculate exact imbalance ratio
if total_potholes_instances > 0:
    imbalance_ratio = total_cracks_instances / total_potholes_instances
    print(f"Instance Imbalance Ratio          : {imbalance_ratio:.2f} Cracks for every 1 Pothole")
else:
    print("Instance Imbalance Ratio          : Infinity (No potholes found!)")


print("\n--- 2. IMAGE-LEVEL STATS (Distribution) ---")
print(f"Total Images Processed            : {total_processed_files:,}")
print(f"Images with Cracks ONLY           : {images_with_cracks_only:,}")
print(f"Images with Potholes ONLY         : {images_with_potholes_only:,}")
print(f"Images with BOTH (Cracks & Pots)  : {images_with_both:,}")
print(f"Empty Images (Background/No obj)  : {empty_images:,}")
print("=" * 50)