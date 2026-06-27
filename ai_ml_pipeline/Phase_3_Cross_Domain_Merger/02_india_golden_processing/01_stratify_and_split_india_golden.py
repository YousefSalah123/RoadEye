# ============================================================
# RoadEye V5 Protocol — Production-Grade Splitter & Converter
# ============================================================

import os
import shutil
import pandas as pd
import xml.etree.ElementTree as ET
from pathlib import Path
from sklearn.model_selection import train_test_split

# ── 1. CONFIG & PATHS ─────────────────────────────────────────
MASTER_DIR = Path(r"D:\RoadEye\Team_Workloads\RoadEye_Golden_Master")
MASTER_IMAGES = MASTER_DIR / "images"
MASTER_XMLS = MASTER_DIR / "xmls"

# الهيكل الجديد المحسن (بدون india_train)
OUTPUT_BASE = Path(r"D:\RoadEye\Team_Workloads\RoadEye_V5_Splits\india")
METADATA_FILE = OUTPUT_BASE.parent / "india_v5_metadata.csv"

# YOLO Classes
CLASS_MAP = {"Crack": 0, "Pothole": 1}

# Split Ratios
TRAIN_RATIO, VALID_RATIO, TEST_RATIO = 0.70, 0.15, 0.15

# ── HELPER: Dynamic Image Finder ──────────────────────────────
def find_image(stem):
    for ext in [".jpg", ".jpeg", ".png"]:
        p = MASTER_IMAGES / f"{stem}{ext}"
        if p.exists():
            return p
    return None

# ── HELPER: YOLO Conversion & Box Validation ──────────────────
def parse_and_validate_xml(xml_path):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        w = int(root.find("size/width").text)
        h = int(root.find("size/height").text)
        
        cracks, potholes = 0, 0
        yolo_lines = []
        
        for obj in root.findall("object"):
            name = obj.find("name").text.strip()
            if name in ["D00", "D10", "D20", "Crack", "crack"]:
                cls_id = CLASS_MAP["Crack"]
                cracks += 1
            elif name in ["D40", "Pothole", "pothole"]:
                cls_id = CLASS_MAP["Pothole"]
                potholes += 1
            else:
                continue

            bndbox = obj.find("bndbox")
            xmin = float(bndbox.find("xmin").text)
            ymin = float(bndbox.find("ymin").text)
            xmax = float(bndbox.find("xmax").text)
            ymax = float(bndbox.find("ymax").text)

            # Box Validation (Strict Checks)
            if xmin >= xmax or ymin >= ymax or w <= 0 or h <= 0:
                continue
            
            xmin = max(0, xmin); ymin = max(0, ymin)
            xmax = min(w, xmax); ymax = min(h, ymax)

            # YOLO Normalization
            x_center = ((xmin + xmax) / 2) / w
            y_center = ((ymin + ymax) / 2) / h
            box_w = (xmax - xmin) / w
            box_h = (ymax - ymin) / h
            
            yolo_lines.append(f"{cls_id} {x_center:.6f} {y_center:.6f} {box_w:.6f} {box_h:.6f}")
            
        return yolo_lines, cracks, potholes
    except Exception as e:
        print(f"Error parsing {xml_path.name}: {e}")
        return [], 0, 0

# ── PHASE 1: METADATA & MULTI-FACTOR STRATIFICATION ───────────
def build_metadata():
    print("🔍 Phase 1: Validating XMLs, Calculating Difficulty & Strata...")
    data = []
    
    for xml_file in MASTER_XMLS.glob("*.xml"):
        stem = xml_file.stem
        img_path = find_image(stem)
        
        if not img_path:
            print(f"⚠️ Missing image for XML: {stem}")
            continue
            
        yolo_lines, cracks, potholes = parse_and_validate_xml(xml_file)
        
        if cracks == 0 and potholes == 0:
            continue # Skip invalid/empty
            
        # Composition
        if cracks > 0 and potholes > 0: category = "mixed"
        elif cracks > 0 and potholes == 0: category = "crack_only"
        else: category = "pothole_only"
            
        # Density Factor
        if potholes == 0: density = "no_pot"
        elif potholes <= 2: density = "low_pot"
        else: density = "high_pot"
            
        # Strata Key
        strata_key = f"{category}_{density}"
        
        # Difficulty Score
        difficulty = potholes + (0.5 * cracks)
        
        data.append({
            "image": img_path.name,
            "xml": xml_file.name,
            "source": "india",
            "cracks": cracks,
            "potholes": potholes,
            "composition": category,
            "density": density,
            "strata_key": strata_key,
            "difficulty": difficulty,
            "yolo_data": "\n".join(yolo_lines)
        })
        
    return pd.DataFrame(data)

# ── PHASE 2: STRATIFIED SPLIT ─────────────────────────────────
def perform_stratified_split(df):
    print("⚖️  Phase 2: Strict Stratified Split (Multi-factor)...")
    
    # Safeguard: sklearn requires at least 2 instances per strata.
    counts = df['strata_key'].value_counts()
    rare_strata = counts[counts < 2].index
    if len(rare_strata) > 0:
        # Fallback to composition for extremely rare combinations
        df.loc[df['strata_key'].isin(rare_strata), 'strata_key'] = df['composition']

    train_df, temp_df = train_test_split(
        df, test_size=(VALID_RATIO + TEST_RATIO), 
        stratify=df["strata_key"], random_state=42
    )
    
    valid_df, test_df = train_test_split(
        temp_df, test_size=0.5, 
        stratify=temp_df["strata_key"], random_state=42
    )
    
    train_df["split"] = "train"
    valid_df["split"] = "valid"
    test_df["split"] = "test"
    
    return pd.concat([train_df, valid_df, test_df]).reset_index(drop=True)

# ── PHASE 3: LEAKAGE VERIFICATION ─────────────────────────────
def verify_leakage(df):
    print("🛡️  Phase 3: Verifying Data Leakage (Strict Intersection Checks)...")
    train_imgs = set(df[df['split'] == 'train']['image'])
    valid_imgs = set(df[df['split'] == 'valid']['image'])
    test_imgs  = set(df[df['split'] == 'test']['image'])
    
    t_v = train_imgs.intersection(valid_imgs)
    t_t = train_imgs.intersection(test_imgs)
    v_t = valid_imgs.intersection(test_imgs)
    
    if len(t_v) > 0 or len(t_t) > 0 or len(v_t) > 0:
        raise ValueError(f"🚨 LEAKAGE DETECTED! Overlaps -> T/V:{len(t_v)}, T/T:{len(t_t)}, V/T:{len(v_t)}")
    
    print("✅ Zero Leakage Verified! Sets are 100% physically isolated.")

# ── PHASE 4: FREEZE & CONVERT TO YOLO ─────────────────────────
def freeze_and_convert(df):
    print("❄️  Phase 4: Freezing Splits & Generating YOLO Labels...")
    OUTPUT_BASE.mkdir(parents=True, exist_ok=True)
    
    # Drop yolo_data column from metadata to keep CSV clean
    meta_df = df.drop(columns=["yolo_data"])
    meta_df.to_csv(METADATA_FILE, index=False)
    
    for split_name in ["train", "valid", "test"]:
        split_dir = OUTPUT_BASE / split_name
        (split_dir / "images").mkdir(parents=True, exist_ok=True)
        (split_dir / "labels").mkdir(parents=True, exist_ok=True)
        
    for _, row in df.iterrows():
        img_name = row["image"]
        split_name = row["split"]
        txt_name = Path(img_name).stem + ".txt"
        yolo_data = row["yolo_data"]
        
        # Copy Image
        src_img = MASTER_IMAGES / img_name
        dst_img = OUTPUT_BASE / split_name / "images" / img_name
        shutil.copy2(src_img, dst_img)
        
        # Write YOLO TXT
        dst_txt = OUTPUT_BASE / split_name / "labels" / txt_name
        with open(dst_txt, "w") as f:
            f.write(yolo_data)

# ── PHASE 5: DISTRIBUTION STATS ───────────────────────────────
def print_distribution_stats(df):
    print("\n📊 Phase 5: Post-Split Distribution Statistics")
    print("="*60)
    stats = []
    for split in ["train", "valid", "test"]:
        sub = df[df["split"] == split]
        imgs = len(sub)
        c = sub["cracks"].sum()
        p = sub["potholes"].sum()
        ratio = round(c/p, 2) if p > 0 else 0
        stats.append([split.upper(), imgs, c, p, ratio])
        
    stats_df = pd.DataFrame(stats, columns=["Split", "Images", "Cracks", "Potholes", "Crack:Pothole Ratio"])
    print(stats_df.to_string(index=False))
    print("="*60)

# ── MAIN EXECUTION ────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🚀 Starting RoadEye V5 Protocol (Hardened Pipeline)\n")
    
    df = build_metadata()
    print(f"✅ Extracted {len(df)} robust samples.\n")
    
    split_df = perform_stratified_split(df)
    verify_leakage(split_df)
    freeze_and_convert(split_df)
    print_distribution_stats(split_df)
    
    print("\n🏆 V5 India Splits are frozen, validated, and YOLO-ready!")