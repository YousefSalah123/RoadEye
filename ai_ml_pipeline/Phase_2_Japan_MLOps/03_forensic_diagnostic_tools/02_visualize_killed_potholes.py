import cv2
import xml.etree.ElementTree as ET
from pathlib import Path
import random

# ==========================================
# 1. CONFIGURATION (إعدادات المسارات)
# ==========================================
XML_DIR = Path(r"D:\RDD2022_Japan\Japan\train\annotations\xmls")
IMG_DIR = Path(r"D:\RDD2022_Japan\Japan\train\images")
OUT_DIR = Path(r"D:\RDD2022_Japan\killed_potholes_sample")

# إنشاء فولدر العينة
OUT_DIR.mkdir(parents=True, exist_ok=True)

# فلتر الإعدام القديم
MIN_W_NORM = 0.053
MIN_H_NORM = 0.053
MIN_AREA_NORM = 0.002

# عدد الصور اللي عايزين نشوفها كعينة
SAMPLE_SIZE = 20
saved_images = 0

print(f"🔍 Searching for {SAMPLE_SIZE} random images with 'Killed' Potholes...")

# ==========================================
# 2. PROCESSING
# ==========================================
xml_files = list(XML_DIR.glob("*.xml"))
random.shuffle(xml_files) # خلط عشوائي عشان نشوف عينة متنوعة

for xml_path in xml_files:
    if saved_images >= SAMPLE_SIZE:
        break
        
    try:
        root = ET.parse(xml_path).getroot()
        size = root.find("size")
        img_w = int(size.find("width").text)
        img_h = int(size.find("height").text)
    except Exception:
        continue
        
    if img_w == 0 or img_h == 0:
        continue

    killed_boxes = []
    
    # البحث عن الحفر المقتولة
    for obj in root.findall("object"):
        if obj.find("name").text.strip() == "D40":
            bndbox = obj.find("bndbox")
            try:
                xmin = int(float(bndbox.find("xmin").text))
                ymin = int(float(bndbox.find("ymin").text))
                xmax = int(float(bndbox.find("xmax").text))
                ymax = int(float(bndbox.find("ymax").text))
            except Exception:
                continue

            box_w_px = xmax - xmin
            box_h_px = ymax - ymin
            
            w_norm = box_w_px / img_w
            h_norm = box_h_px / img_h
            area_norm = w_norm * h_norm

            # لو الحفرة دي الفلتر كان هيمسحها، احفظ إحداثياتها
            if w_norm < MIN_W_NORM or h_norm < MIN_H_NORM or area_norm < MIN_AREA_NORM:
                killed_boxes.append((xmin, ymin, xmax, ymax, box_w_px, box_h_px))

    # لو لقينا حفر مقتولة في الصورة دي، نفتحها ونرسم عليها
    if killed_boxes:
        img_src = None
        for ext in [".jpg", ".jpeg", ".png"]:
            temp_src = IMG_DIR / (xml_path.stem + ext)
            if temp_src.exists():
                img_src = temp_src
                break
                
        if img_src:
            # قراءة الصورة باستخدام OpenCV
            img = cv2.imread(str(img_src))
            
            # رسم المربعات الحمراء
            for (xmin, ymin, xmax, ymax, w, h) in killed_boxes:
                # رسم المربع الأحمر (B, G, R) -> (0, 0, 255)
                cv2.rectangle(img, (xmin, ymin), (xmax, ymax), (0, 0, 255), 2)
                
                # كتابة مقاس الحفرة بالبيكسل فوقها
                text = f"{w}x{h} px"
                cv2.putText(img, text, (xmin, ymin - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

            # حفظ الصورة في فولدر العينة
            out_path = OUT_DIR / img_src.name
            cv2.imwrite(str(out_path), img)
            saved_images += 1
            print(f"📸 Saved sample {saved_images}/{SAMPLE_SIZE}: {img_src.name}")

print("\n" + "="*50)
print(f"✅ Done! Open this folder to visually inspect the images:\n📂 {OUT_DIR}")
print("="*50)