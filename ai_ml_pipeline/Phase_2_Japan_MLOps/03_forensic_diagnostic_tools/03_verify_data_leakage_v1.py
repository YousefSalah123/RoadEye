import hashlib
from pathlib import Path

# =========================================================
# Historical Data Leakage Checker
# الهدف:
# هل الـ current validation كان جزء من old train / old test
# أو هل الصور الحالية تم رؤيتها سابقًا أثناء التدريب القديم؟
#
# المقارنة ستكون بين:
# OLD TRAIN + OLD TEST
#           VS
# CURRENT VALID
#
# ملاحظة:
# لا نضع old_valid هنا لأنه هو نفسه current_valid
# وبالتالي وجوده طبيعي وليس leakage
# =========================================================


def get_file_hash(filepath):
    """
    Generate MD5 hash for file content.
    This detects identical images حتى لو الاسم مختلف.
    """
    hasher = hashlib.md5()

    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)

        return hasher.hexdigest()

    except Exception as e:
        print(f"Error reading file {filepath}: {e}")
        return None


def scan_folder(folder_path):
    """
    Scan image folder and return:
    - filename set
    - hash dictionary
    """
    folder = Path(folder_path)

    filenames = set()
    hashes = {}

    for file_path in folder.rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            filenames.add(file_path.name)

            file_hash = get_file_hash(file_path)
            if file_hash:
                hashes.setdefault(file_hash, []).append(str(file_path))

    return filenames, hashes


def check_historical_leakage(old_train_dir, old_test_dir, current_valid_dir):
    print("🔍 Starting Historical Leakage Detection...\n")

    # =====================================================
    # Scan old train
    # =====================================================
    print(f"📁 Scanning OLD TRAIN: {old_train_dir}")
    old_train_names, old_train_hashes = scan_folder(old_train_dir)

    # =====================================================
    # Scan old test
    # =====================================================
    print(f"📁 Scanning OLD TEST: {old_test_dir}")
    old_test_names, old_test_hashes = scan_folder(old_test_dir)

    # =====================================================
    # Merge old train + old test
    # =====================================================
    old_all_names = old_train_names.union(old_test_names)

    old_all_hashes = {}
    for d in [old_train_hashes, old_test_hashes]:
        for h, paths in d.items():
            old_all_hashes.setdefault(h, []).extend(paths)

    # =====================================================
    # Scan current validation
    # =====================================================
    print(f"📁 Scanning CURRENT VALID: {current_valid_dir}")
    current_valid_names, current_valid_hashes = scan_folder(current_valid_dir)

    # =====================================================
    # Compare names
    # =====================================================
    name_overlap = old_all_names.intersection(current_valid_names)

    # =====================================================
    # Compare content hashes
    # =====================================================
    hash_overlap = set(old_all_hashes.keys()).intersection(
        set(current_valid_hashes.keys())
    )

    # =====================================================
    # Report
    # =====================================================
    print("\n" + "=" * 60)
    print("📊 HISTORICAL LEAKAGE REPORT")
    print("=" * 60)

    if not name_overlap and not hash_overlap:
        print("✅ GREAT NEWS: No historical leakage detected!")
        print("The current validation set was NOT seen in old training/testing.")
        print("Your improvement is likely REAL, not leakage-driven.")
        print("=" * 60)
        return

    if name_overlap:
        print(f"⚠️ Found {len(name_overlap)} overlapping filenames")
        print("\nFirst 10 filename overlaps:")

        for name in list(name_overlap)[:10]:
            print(f"   - {name}")

    if hash_overlap:
        print(f"\n🚨 CRITICAL: Found {len(hash_overlap)} exact image overlaps (content match)")
        print("This means validation images were seen before.\n")

        count = 0
        for h in hash_overlap:
            if count >= 5:
                break

            print("Example overlap:\n")

            print("Seen before in OLD DATA:")
            for p in old_all_hashes[h]:
                print(f"   {p}")

            print("\nExists now in CURRENT VALID:")
            for p in current_valid_hashes[h]:
                print(f"   {p}")

            print("-" * 40)
            count += 1

    print("=" * 60)


if __name__ == "__main__":

    # =====================================================
    # عدّل المسارات هنا فقط
    # =====================================================

    OLD_TRAIN_DIR = r"D:/RDD2022_Japan/train/images"
    OLD_TEST_DIR = r"D:/RDD2022_Japan/test/images"

    CURRENT_VALID_DIR = r"D:/RDD2022_Japan/valid/images"

    # =====================================================

    check_historical_leakage(
        old_train_dir=OLD_TRAIN_DIR,
        old_test_dir=OLD_TEST_DIR,
        current_valid_dir=CURRENT_VALID_DIR
    )