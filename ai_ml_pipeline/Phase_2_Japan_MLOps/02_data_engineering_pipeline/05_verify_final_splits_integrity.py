import os
from pathlib import Path

# ==========================================
# CONFIGURATION
# ==========================================
# Base directory of your newly stratified dataset
BASE_DIR = Path(r"D:\RoadEye\\RDD2022_Japan\roadeye_v4_strict_stratified")
SPLITS = ["train", "valid", "test"]

def analyze_split_labels(split_name):
    """
    Analyzes the YOLO label files for a specific split 
    and calculates both instance-level and image-level statistics.
    """
    labels_dir = BASE_DIR / split_name / "labels"
    
    if not labels_dir.exists():
        return None

    # Instance-level counters
    cracks_instances = 0
    potholes_instances = 0

    # Image-level counters
    images_with_cracks_only = 0
    images_with_potholes_only = 0
    images_with_both = 0
    empty_images = 0
    total_processed_files = 0

    for txt_file in labels_dir.glob("*.txt"):
        total_processed_files += 1
        has_crack = False
        has_pothole = False
        
        with open(txt_file, "r") as f:
            lines = f.readlines()
            
        if not lines:
            empty_images += 1
            continue
            
        for line in lines:
            parts = line.strip().split()
            if not parts:
                continue
                
            try:
                class_id = int(parts[0])
                if class_id == 0:
                    cracks_instances += 1
                    has_crack = True
                elif class_id == 1:
                    potholes_instances += 1
                    has_pothole = True
            except ValueError:
                continue

        if has_crack and not has_pothole:
            images_with_cracks_only += 1
        elif has_pothole and not has_crack:
            images_with_potholes_only += 1
        elif has_crack and has_pothole:
            images_with_both += 1

    ratio = (cracks_instances / potholes_instances) if potholes_instances > 0 else float('inf')

    return {
        "Split": split_name.upper(),
        "Total_Images": total_processed_files,
        "Cracks_Boxes": cracks_instances,
        "Potholes_Boxes": potholes_instances,
        "Imbalance_Ratio": ratio,
        "Img_Cracks_Only": images_with_cracks_only,
        "Img_Potholes_Only": images_with_potholes_only,
        "Img_Both": images_with_both,
        "Empty": empty_images
    }

def print_comprehensive_report():
    print("=" * 75)
    print(" 📊 ROADEYE V4: POST-SPLIT COMPREHENSIVE STATISTICAL REPORT")
    print("=" * 75)
    
    results = []
    for split in SPLITS:
        stats = analyze_split_labels(split)
        if stats:
            results.append(stats)
            
    if not results:
        print("❌ Error: Could not find label directories. Check BASE_DIR.")
        return

    # Print Detailed Report
    for res in results:
        print(f"\n📁 --- {res['Split']} SET ---")
        print(f"Total Images         : {res['Total_Images']:,}")
        print(f"Crack Boxes (0)      : {res['Cracks_Boxes']:,}")
        print(f"Pothole Boxes (1)    : {res['Potholes_Boxes']:,}")
        print(f"Imbalance Ratio      : {res['Imbalance_Ratio']:.2f} Cracks for every 1 Pothole")
        print("Distribution:")
        print(f"  -> Images w/ Cracks only   : {res['Img_Cracks_Only']:,}")
        print(f"  -> Images w/ Potholes only : {res['Img_Potholes_Only']:,}")
        print(f"  -> Images w/ Both          : {res['Img_Both']:,}")

    # Print Summary Table
    print("\n" + "=" * 75)
    print(" 📈 EXECUTIVE SUMMARY (RATIO COMPARISON)")
    print("=" * 75)
    print(f"{'SPLIT':<10} | {'IMAGES':<10} | {'CRACKS':<10} | {'POTHOLES':<10} | {'RATIO'}")
    print("-" * 75)
    for res in results:
        print(f"{res['Split']:<10} | {res['Total_Images']:<10,} | {res['Cracks_Boxes']:<10,} | {res['Potholes_Boxes']:<10,} | {res['Imbalance_Ratio']:.2f}:1")
    print("=" * 75)

if __name__ == "__main__":
    print_comprehensive_report()