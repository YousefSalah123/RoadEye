import os
import xml.etree.ElementTree as ET
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

def run_roadeye_eda(dataset_path: str):
    """
    Scans the RDD2022 Japan dataset, merges defect classes, 
    and generates comprehensive EDA visualizations.
    """
    base_path = Path(dataset_path)
    annotations_dir = base_path / 'annotations'
    
    if not annotations_dir.exists():
        raise FileNotFoundError(f"Annotations directory not found at: {annotations_dir}")

    # Class mapping based on RoadEye architecture decisions
    class_mapping = {
        'D00': 'Crack',
        'D10': 'Crack',
        'D20': 'Crack',
        'D40': 'Pothole'
    }

    records = []
    image_stats = []

    print(f"[INFO] Scanning for XML files in: {annotations_dir}...")
    # استخدام rglob للبحث العميق في حال كانت الملفات داخل مجلدات فرعية
    xml_files = list(annotations_dir.rglob('*.xml'))
    
    if len(xml_files) == 0:
        print("[ERROR] No XML files found! Please check your dataset path and folder structure.")
        return

    for xml_file in tqdm(xml_files, desc="Processing XMLs"):
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
        except ET.ParseError:
            print(f"[WARNING] Skipping corrupted XML: {xml_file.name}")
            continue
            
        size_element = root.find('size')
        if size_element is not None:
            img_width = int(size_element.find('width').text)
            img_height = int(size_element.find('height').text)
        else:
            continue 

        has_crack = False
        has_pothole = False
        
        for obj in root.findall('object'):
            raw_name = obj.find('name').text
            
            if raw_name not in class_mapping:
                continue
                
            mapped_name = class_mapping[raw_name]
            
            if mapped_name == 'Crack':
                has_crack = True
            elif mapped_name == 'Pothole':
                has_pothole = True
                
            bndbox = obj.find('bndbox')
            xmin = int(float(bndbox.find('xmin').text))
            ymin = int(float(bndbox.find('ymin').text))
            xmax = int(float(bndbox.find('xmax').text))
            ymax = int(float(bndbox.find('ymax').text))
            
            box_width = xmax - xmin
            box_height = ymax - ymin
            area = box_width * box_height
            normalized_area = area / (img_width * img_height) if (img_width * img_height) > 0 else 0
            
            center_x = (xmin + xmax) / 2 / img_width
            center_y = (ymin + ymax) / 2 / img_height
            
            records.append({
                'image_id': root.find('filename').text,
                'class': mapped_name,
                'raw_class': raw_name,
                'normalized_area': normalized_area,
                'center_x': center_x,
                'center_y': center_y
            })
            
        if has_crack and has_pothole:
            composition = 'Both'
        elif has_crack:
            composition = 'Crack Only'
        elif has_pothole:
            composition = 'Pothole Only'
        else:
            composition = 'Empty / Ignored'
            
        image_stats.append({
            'image_id': root.find('filename').text if root.find('filename') is not None else xml_file.name,
            'composition': composition
        })

    df_boxes = pd.DataFrame(records)
    df_images = pd.DataFrame(image_stats)

    print("\n==================================================")
    print("🏆 ROADEYE JAPAN DATASET - EDA REPORT 🏆")
    print("==================================================")
    
    # حماية من انهيار الكود إذا كانت الجداول فارغة (مثلاً ملفات XML موجودة لكنها فارغة من الـ classes المطلوبة)
    if df_boxes.empty:
        print("[ERROR] XML files were found, but no valid Cracks or Potholes (D00, D10, D20, D40) were detected in them.")
        return

    total_boxes = len(df_boxes)
    crack_count = len(df_boxes[df_boxes['class'] == 'Crack'])
    pothole_count = len(df_boxes[df_boxes['class'] == 'Pothole'])
    imbalance_ratio = crack_count / pothole_count if pothole_count > 0 else 0
    
    print(f"Total Valid Bounding Boxes : {total_boxes}")
    print(f"Total Cracks               : {crack_count}")
    print(f"Total Potholes             : {pothole_count}")
    print(f"Raw Class Imbalance Ratio  : {imbalance_ratio:.2f} Cracks for every 1 Pothole")
    
    sns.set_theme(style="whitegrid")
    fig = plt.figure(figsize=(20, 15))
    
    ax1 = plt.subplot(2, 2, 1)
    sns.countplot(data=df_boxes, x='class', palette=['#3498db', '#e74c3c'], ax=ax1)
    ax1.set_title('Class Distribution (Instance Level)', fontsize=16, fontweight='bold')
    ax1.set_ylabel('Number of Bounding Boxes', fontsize=12)
    ax1.set_xlabel('')
    for p in ax1.patches:
        ax1.annotate(f'{int(p.get_height()):,}', (p.get_x() + p.get_width() / 2., p.get_height()), 
                     ha='center', va='bottom', fontsize=12, fontweight='bold')

    ax2 = plt.subplot(2, 2, 2)
    composition_counts = df_images['composition'].value_counts()
    colors = ['#95a5a6', '#3498db', '#9b59b6', '#e74c3c'] 
    ax2.pie(composition_counts, labels=composition_counts.index, autopct='%1.1f%%', 
            startangle=90, colors=colors[:len(composition_counts)], textprops={'fontsize': 12}, explode=[0.05]*len(composition_counts))
    ax2.set_title('Image Composition Distribution', fontsize=16, fontweight='bold')

    ax3 = plt.subplot(2, 2, 3)
    sns.histplot(data=df_boxes, x='normalized_area', hue='class', bins=50, 
                 kde=False, palette=['#3498db', '#e74c3c'], multiple="stack", ax=ax3)
    ax3.set_title('Bounding Box Size Distribution (% of Image Area)', fontsize=16, fontweight='bold')
    ax3.set_xlabel('Normalized Area', fontsize=12)
    ax3.set_ylabel('Count', fontsize=12)
    ax3.set_xlim(0, 0.15) 

    ax4 = plt.subplot(2, 2, 4)
    potholes_only = df_boxes[df_boxes['class'] == 'Pothole']
    if not potholes_only.empty:
        sns.kdeplot(data=potholes_only, x='center_x', y='center_y', cmap="Reds", 
                    fill=True, thresh=0, levels=100, ax=ax4)
        ax4.set_title('Spatial Distribution of Potholes', fontsize=16, fontweight='bold')
        ax4.set_xlabel('Normalized Center X', fontsize=12)
        ax4.set_ylabel('Normalized Center Y', fontsize=12)
        ax4.invert_yaxis() 
        ax4.axhline(0.5, color='white', linestyle='--', alpha=0.5) 
    else:
        ax4.set_title('No Potholes Found for Spatial Distribution', fontsize=16, fontweight='bold')

    plt.tight_layout(pad=3.0)
    
    output_img = base_path / 'japan_eda_dashboard.png'
    plt.savefig(output_img, dpi=300)
    print(f"\n[SUCCESS] EDA Dashboard saved to: {output_img}")
    plt.show()

if __name__ == "__main__":
    # مسار البيانات الخاص بك
    TARGET_DATASET_PATH = r"D:\RoadEye DataSets\RDD2022_Japan\Japan\train"
    run_roadeye_eda(TARGET_DATASET_PATH)