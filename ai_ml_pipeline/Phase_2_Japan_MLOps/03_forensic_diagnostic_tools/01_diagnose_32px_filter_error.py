import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

# ==========================================
# 1. CONFIGURATION (مسار الداتا الخام)
# ==========================================
# هذا هو مسار ملفات الـ XML الأصلية قبل أي تدخل أو فلترة
XML_DIR = Path(r"D:\RDD2022_Japan\Japan\train\annotations\xmls")

# إعدادات الفلتر القديم الذي استخدمتوه
MIN_W_NORM = 0.053
MIN_H_NORM = 0.053
MIN_AREA_NORM = 0.002

print("🔍 Scanning RAW XML files for Pothole Size Distribution...")

# ==========================================
# 2. COUNTERS
# ==========================================
total_potholes_raw = 0

# تقسيمات الأحجام (Size Bins)
size_distribution = {
    "KILLED_BY_FILTER (Micro < 32px)": 0,
    "SURVIVED_SMALL (32px - 64px)": 0,
    "SURVIVED_MEDIUM (64px - 128px)": 0,
    "SURVIVED_LARGE (> 128px)": 0
}

# ==========================================
# 3. PARSING & ANALYSIS
# ==========================================
xml_files = list(XML_DIR.glob("*.xml"))

for xml_path in xml_files:
    try:
        root = ET.parse(xml_path).getroot()
        size = root.find("size")
        img_w = int(size.find("width").text)
        img_h = int(size.find("height").text)
    except Exception:
        continue
        
    if img_w == 0 or img_h == 0:
        continue

    for obj in root.findall("object"):
        cls_name = obj.find("name").text.strip()
        
        # نحن نهتم بالحفر فقط (D40)
        if cls_name == "D40":
            total_potholes_raw += 1
            
            bndbox = obj.find("bndbox")
            try:
                xmin = float(bndbox.find("xmin").text)
                ymin = float(bndbox.find("ymin").text)
                xmax = float(bndbox.find("xmax").text)
                ymax = float(bndbox.find("ymax").text)
            except Exception:
                continue

            # حساب الأبعاد بالبيكسل والـ Normalized
            box_w_px = xmax - xmin
            box_h_px = ymax - ymin
            
            w_norm = box_w_px / img_w
            h_norm = box_h_px / img_h
            area_norm = w_norm * h_norm

            # هل قتلها الفلتر القديم؟
            if w_norm < MIN_W_NORM or h_norm < MIN_H_NORM or area_norm < MIN_AREA_NORM:
                size_distribution["KILLED_BY_FILTER (Micro < 32px)"] += 1
            else:
                # إذا نجت، ما هو حجمها الفعلي بالبيكسل؟ (تقريبياً للتبسيط)
                max_dim = max(box_w_px, box_h_px)
                if max_dim <= 64:
                    size_distribution["SURVIVED_SMALL (32px - 64px)"] += 1
                elif max_dim <= 128:
                    size_distribution["SURVIVED_MEDIUM (64px - 128px)"] += 1
                else:
                    size_distribution["SURVIVED_LARGE (> 128px)"] += 1

# ==========================================
# 4. DIAGNOSTIC REPORT
# ==========================================
print("\n" + "="*50)
print(" 🚨 POTHOLE SIZE DISTRIBUTION REPORT (RAW DATA) 🚨")
print("="*50)
print(f"Total Potholes in RAW Data: {total_potholes_raw:,}")
print("-" * 50)

for category, count in size_distribution.items():
    percentage = (count / max(total_potholes_raw, 1)) * 100
    print(f"{category:<35}: {count:>5,} ({percentage:.1f}%)")

print("="*50)

if size_distribution["KILLED_BY_FILTER (Micro < 32px)"] / max(total_potholes_raw, 1) > 0.20:
    print("⚠️ WARNING: You killed more than 20% of your potholes! The filter is too aggressive.")
    print("SOLUTION: We must re-run the filtering step with a lower threshold (e.g., 16px) before Oversampling.")
else:
    print("✅ The filter is safe. The killed potholes are negligible. You may proceed to Hybrid Oversampling.")