from pathlib import Path

# ==========================================
# CONFIGURATION
# ==========================================
# Directories to completely ignore during the scan
IGNORE_DIRS = {'.venv', 'node_modules', '.git', '__pycache__', 'build', 'dist', '.idea', '.vscode'}

# Default to the new project folder, but fall back to the current directory if it is missing.
TARGET_DIR = Path(r"D:\New RoadEye")
if not TARGET_DIR.exists():
    TARGET_DIR = Path('.').resolve()


def generate_tree(dir_path, file_obj, prefix=""):
    """
    Recursively scans the directory and writes the tree structure to a file object.
    """
    path = Path(dir_path)

    try:
        contents = list(path.iterdir())
    except PermissionError:
        return

    # Filter out ignored directories
    contents = [c for c in contents if c.name not in IGNORE_DIRS]

    # Sort contents: directories first, then files, alphabetically
    contents.sort(key=lambda x: (x.is_file(), x.name.lower()))

    # Prepare the branch pointers
    pointers = ['├── '] * (len(contents) - 1) + ['└── '] if contents else []

    for pointer, item in zip(pointers, contents):
        # Write the current item to the file
        file_obj.write(prefix + pointer + item.name + "\n")

        # If it's a directory, dive deeper recursively
        if item.is_dir():
            extension = '│   ' if pointer == '├── ' else '    '
            generate_tree(item, file_obj, prefix + extension)


if __name__ == "__main__":
    output_file = TARGET_DIR / "my_clean_structure.txt"

    # Open the file with UTF-8 encoding to support tree characters safely
    with open(output_file, "w", encoding="utf-8") as f:
        # Write the root directory name
        f.write(f"[{TARGET_DIR.name}/]\n")
        # Start the recursive generation
        generate_tree(TARGET_DIR, f)

    print(f"Success! The clean tree structure has been saved to '{output_file}'")