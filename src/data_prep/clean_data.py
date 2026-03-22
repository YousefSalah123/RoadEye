import os
import xml.etree.ElementTree as ET
import shutil
import random

# Define input and output directory paths
# Assuming the script runs from the RoadEye root directory
XML_DIR = "data/raw/India/train/annotations/xmls"
IMG_DIR = "data/raw/India/train/images"
OUT_DIR = "data/processed/Roboflow_Ready"
OUT_IMG_DIR = os.path.join(OUT_DIR, "images")
OUT_LBL_DIR = os.path.join(OUT_DIR, "labels")

# Create output directories if they do not exist
os.makedirs(OUT_IMG_DIR, exist_ok=True)
os.makedirs(OUT_LBL_DIR, exist_ok=True)

# Define class mapping (Merging D00, D10, D20 -> 0 | D40 -> 1)
CLASS_MAP = {
    "D00": 0, "D10": 0, "D20": 0,  
    "D40": 1                       
}

# Define minimum bounding box size to filter out micro-noise
MIN_BOX_SIZE = 15
# Probability to keep an image with no valid objects (Background images)
BACKGROUND_KEEP_PROB = 0.05

processed_count = 0
empty_kept_count = 0

print("Starting data preprocessing...")

# Check if the raw data directory exists before proceeding
if not os.path.exists(XML_DIR) or not os.path.exists(IMG_DIR):
    print(f"Error: Could not find raw data at {XML_DIR} or {IMG_DIR}.")
    print("Please ensure you placed the 'India' folder correctly inside 'data/raw/'.")
    exit()

for xml_file in os.listdir(XML_DIR):
    if not xml_file.endswith(".xml"):
        continue
        
    tree = ET.parse(os.path.join(XML_DIR, xml_file))
    root = tree.getroot()
    
    # Extract image dimensions
    size = root.find("size")
    width = int(size.find("width").text)
    height = int(size.find("height").text)
    
    img_name = root.find("filename").text
    img_path = os.path.join(IMG_DIR, img_name)
    
    # Skip if the corresponding image does not exist
    if not os.path.exists(img_path):
        continue
        
    yolo_lines = []
    
    for obj in root.findall("object"):
        cls_name = obj.find("name").text
        
        # Ignore classes not in our mapping
        if cls_name not in CLASS_MAP:
            continue
            
        class_id = CLASS_MAP[cls_name]
        
        # Extract bounding box coordinates
        bndbox = obj.find("bndbox")
        xmin = float(bndbox.find("xmin").text)
        ymin = float(bndbox.find("ymin").text)
        xmax = float(bndbox.find("xmax").text)
        ymax = float(bndbox.find("ymax").text)
        
        box_w = xmax - xmin
        box_h = ymax - ymin
        
        # Filter out extremely small bounding boxes
        if box_w < MIN_BOX_SIZE or box_h < MIN_BOX_SIZE:
            continue
            
        # Convert to YOLO format (normalized center_x, center_y, width, height)
        x_center = ((xmin + xmax) / 2.0) / width
        y_center = ((ymin + ymax) / 2.0) / height
        norm_w = box_w / width
        norm_h = box_h / height
        
        yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")
        
    # Handle images with no valid bounding boxes
    if len(yolo_lines) == 0:
        if random.random() > BACKGROUND_KEEP_PROB:
            continue
        empty_kept_count += 1
        
    # Define new paths for the processed files
    new_img_path = os.path.join(OUT_IMG_DIR, img_name)
    txt_filename = img_name.replace(".jpg", ".txt").replace(".png", ".txt")
    new_txt_path = os.path.join(OUT_LBL_DIR, txt_filename)
    
    # Copy the image to the new directory
    shutil.copy(img_path, new_img_path)
    
    # Write the YOLO formatted labels to a text file
    with open(new_txt_path, "w") as f:
        f.write("\n".join(yolo_lines))
        
    processed_count += 1

print("=========================================")
print(f"Preprocessing completed successfully!")
print(f"Total valid images saved: {processed_count}")
print(f"Background images kept: {empty_kept_count}")
print(f"Output saved in '{OUT_DIR}' directory.")
print("=========================================")