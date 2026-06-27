# ============================================================
# RoadEye — India Sample Review Tool | Pro Dashboard V6-fixed
# ============================================================
# KEY FIX: All session lists store img_path.name (filename only)
#          consistently. clear_decision & set_decision both use
#          a single helper `img_name(p)` so there is no mismatch.
# ============================================================

import cv2
import xml.etree.ElementTree as ET
import shutil
import json
import numpy as np
from pathlib import Path

# ── 1. CONFIG & PATHS (PORTABLE) ──────────────────────────────
# Relative paths so the script works anywhere the team extracts it
TIER_FOLDERS = [
    Path("Visualized_Tiers/Tier_A_Excellent"),
    Path("Visualized_Tiers/Tier_B_Good"),
    Path("Visualized_Tiers/Tier_C_Marginal"),
    Path("Visualized_Tiers/Tier_D_Poor"),
    Path("Visualized_Tiers/Crack_Only"),
]

RAW_IMAGES_DIR = Path("raw_images")
XML_DIR        = Path("raw_xmls")

ACCEPTED_DIR = Path("Reviewed/Accepted")
REJECTED_DIR = Path("Reviewed/Rejected")
SESSION_FILE = Path("Reviewed/session.json")
# ──────────────────────────────────────────────────────────────
# ── 2. COLORS (BGR) ───────────────────────────────────────────
COLOR_POTHOLE = (0,   0, 255)   # Pure Red   (BGR)
COLOR_CRACK   = (255, 0,   0)   # Pure Blue  (BGR)

CLASS_COLORS = {
    "D00": COLOR_CRACK,
    "D10": COLOR_CRACK,
    "D20": COLOR_CRACK,
    "D40": COLOR_POTHOLE,
}
CLASS_LABELS = {
    "D00": "Crack",
    "D10": "Crack",
    "D20": "Crack",
    "D40": "Pothole",
}

TIER_COLORS = {
    "Tier_A_Excellent": (0, 210, 120),
    "Tier_B_Good":      (0, 190, 255),
    "Tier_C_Marginal":  (0, 140, 255),
    "Tier_D_Poor":      (0,  70, 255),
    "Crack_Only":       (160, 60, 255),
}

# ── 3. UI SETTINGS ────────────────────────────────────────────
WIN_W, WIN_H = 1440, 800
SIDEBAR_W    = 400
IMG_AREA_W   = WIN_W - SIDEBAR_W
FONT         = cv2.FONT_HERSHEY_SIMPLEX
FONTB        = cv2.FONT_HERSHEY_DUPLEX

# palette (BGR)
BG      = (22,  22,  27)
SIDE_BG = (16,  16,  20)
CARD    = (30,  30,  38)
BORDER  = (55,  55,  70)
ACCENT  = (0,  200, 140)
C_GREEN = (50, 210,  70)
C_RED   = (45,  55, 210)
C_AMBER = (30, 160, 220)
C_WHITE = (235, 237, 242)
C_GREY  = (140, 145, 158)
C_DIM   = (68,  70,  84)

PAD = 26

# ─────────────────────────────────────────────────────────────
ACCEPTED_DIR.mkdir(parents=True, exist_ok=True)
(ACCEPTED_DIR / "images").mkdir(exist_ok=True)
(ACCEPTED_DIR / "xmls").mkdir(exist_ok=True)
REJECTED_DIR.mkdir(parents=True, exist_ok=True)


# ══════════════════════════════════════════════════════════════
#  CRITICAL HELPER — always call this to get the filename key
# ══════════════════════════════════════════════════════════════
def img_name(img_path: Path) -> str:
    """
    Returns ONLY the filename (e.g. 'India_000168.jpg').
    Path.name on Windows can return the full path string when
    the Path was constructed from a glob result — this ensures
    we always get just the bare filename for session dict keys.
    """
    return Path(str(img_path)).parts[-1]


# ══════════════════════════════════════════════════════════════
#  Session helpers
# ══════════════════════════════════════════════════════════════

def collect_images():
    imgs = []
    for folder in TIER_FOLDERS:
        if not folder.exists():
            continue
        for ext in ("*.jpg", "*.jpeg", "*.png"):
            imgs.extend(sorted(folder.glob(ext)))
    return imgs


def load_session() -> dict:
    if SESSION_FILE.exists():
        with open(SESSION_FILE) as f:
            s = json.load(f)
        # Migrate: strip any full paths → bare filenames
        for key in ("done", "accepted", "rejected"):
            if key in s:
                s[key] = [Path(p).parts[-1] for p in s[key]]
        return s
    return {"done": [], "accepted": [], "rejected": []}


def save_session(session: dict):
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SESSION_FILE, "w") as f:
        json.dump(session, f, indent=2)


def get_decision(img_path: Path, session: dict) -> str:
    """Returns 'accepted', 'rejected', or 'none'."""
    name = img_name(img_path)
    if name in session.get("accepted", []):
        return "accepted"
    if name in session.get("rejected", []):
        return "rejected"
    return "none"


def clear_decision(img_path: Path, session: dict):
    """
    Removes the image's decision from session lists AND
    physically deletes the copied file from disk.
    """
    name = img_name(img_path)
    stem = Path(name).stem

    # ── Remove from accepted ───────────────────────────────────
    if name in session.get("accepted", []):
        session["accepted"].remove(name)
        img_dest = ACCEPTED_DIR / "images" / name
        xml_dest = ACCEPTED_DIR / "xmls"   / (stem + ".xml")
        if img_dest.exists():
            img_dest.unlink()
            print(f"[UNDO] deleted {img_dest}")
        else:
            print(f"[UNDO] file not found: {img_dest}")
        if xml_dest.exists():
            xml_dest.unlink()

    # ── Remove from rejected ───────────────────────────────────
    if name in session.get("rejected", []):
        session["rejected"].remove(name)
        rej_dest = REJECTED_DIR / name
        if rej_dest.exists():
            rej_dest.unlink()
            print(f"[UNDO] deleted {rej_dest}")
        else:
            print(f"[UNDO] file not found: {rej_dest}")

    # ── Remove from done ──────────────────────────────────────
    if name in session.get("done", []):
        session["done"].remove(name)

    print(f"[UNDO] cleared decision for {name}")


def set_decision(img_path: Path, decision: str, session: dict):
    """
    decision must be 'accept' or 'reject'.
    Clears any previous decision first, then copies files.
    """
    clear_decision(img_path, session)   # ensure clean state
    name = img_name(img_path)
    stem = Path(name).stem

    session.setdefault("done", []).append(name)

    if decision == "accept":
        session.setdefault("accepted", []).append(name)
        raw = RAW_IMAGES_DIR / name
        if raw.exists():
            shutil.copy2(raw, ACCEPTED_DIR / "images" / name)
        xml = XML_DIR / (stem + ".xml")
        if xml.exists():
            shutil.copy2(xml, ACCEPTED_DIR / "xmls" / (stem + ".xml"))

    elif decision == "reject":
        session.setdefault("rejected", []).append(name)
        raw = RAW_IMAGES_DIR / name
        if raw.exists():
            shutil.copy2(raw, REJECTED_DIR / name)


# ══════════════════════════════════════════════════════════════
#  Drawing helpers
# ══════════════════════════════════════════════════════════════

def rrect(img, x1, y1, x2, y2, r, color, thick=-1):
    if x2 <= x1 or y2 <= y1:
        return
    r = min(r, (x2-x1)//2, (y2-y1)//2)
    if thick == -1:
        cv2.rectangle(img, (x1+r, y1), (x2-r, y2), color, -1)
        cv2.rectangle(img, (x1, y1+r), (x2, y2-r), color, -1)
        for cx, cy in [(x1+r,y1+r),(x2-r,y1+r),(x1+r,y2-r),(x2-r,y2-r)]:
            cv2.circle(img, (cx, cy), r, color, -1)
    else:
        cv2.line(img, (x1+r,y1),(x2-r,y1), color, thick)
        cv2.line(img, (x1+r,y2),(x2-r,y2), color, thick)
        cv2.line(img, (x1,y1+r),(x1,y2-r), color, thick)
        cv2.line(img, (x2,y1+r),(x2,y2-r), color, thick)
        cv2.ellipse(img,(x1+r,y1+r),(r,r),180,0,90,color,thick)
        cv2.ellipse(img,(x2-r,y1+r),(r,r),270,0,90,color,thick)
        cv2.ellipse(img,(x1+r,y2-r),(r,r), 90,0,90,color,thick)
        cv2.ellipse(img,(x2-r,y2-r),(r,r),  0,0,90,color,thick)


def tsz(text, font, scale, thick=1):
    (w, h), _ = cv2.getTextSize(text, font, scale, thick)
    return w, h


def txt(img, text, x, y, font, scale, color, thick=1):
    cv2.putText(img, text, (x, y), font, scale, color, thick, cv2.LINE_AA)


def hline(img, y):
    cv2.line(img, (IMG_AREA_W + PAD, y), (WIN_W - PAD, y), BORDER, 1)


def pbar(img, x, y, w, h, val, maxv, fg):
    r = h // 2
    rrect(img, x, y, x+w, y+h, r, CARD)
    filled = max(0, min(int(w * val / max(maxv, 1)), w))
    if filled >= 2*r:
        rrect(img, x, y, x+filled, y+h, r, fg)
    elif filled > 0:
        cv2.circle(img, (x+r, y+r), r, fg, -1)


def key_pill(img, key_str, x, y, bg):
    tw, th = tsz(key_str, FONTB, 0.50, 1)
    px, py = 10, 5
    x2, y2 = x + tw + px*2, y + th + py*2
    rrect(img, x, y, x2, y2, 5, bg)
    cv2.putText(img, key_str, (x+px, y+th+py-1), FONTB, 0.50, (8,8,12), 1, cv2.LINE_AA)
    return x2


def ctrl_row(img, key_str, label, key_bg, lbl_color, y):
    cx  = IMG_AREA_W + PAD
    kx2 = key_pill(img, key_str, cx, y, key_bg)
    tw, th = tsz(label, FONT, 0.54, 1)
    txt(img, label, kx2 + 10, y + th + 4, FONT, 0.54, lbl_color)
    return y + th + 14


# ══════════════════════════════════════════════════════════════
#  Annotation drawing
# ══════════════════════════════════════════════════════════════

def draw_annotations(img, xml_path):
    if not xml_path.exists():
        return img.copy(), {}
    try:
        root = ET.parse(xml_path).getroot()
        iw   = int(root.find("size/width").text)
        ih   = int(root.find("size/height").text)
        h, w = img.shape[:2]
        sx, sy = w / iw, h / ih
    except Exception:
        return img.copy(), {}

    out   = img.copy()
    count = {}
    for obj in root.findall("object"):
        name  = obj.find("name").text.strip()
        label = CLASS_LABELS.get(name, name)
        color = COLOR_POTHOLE if label == "Pothole" else COLOR_CRACK

        bb = obj.find("bndbox")
        x1 = int(float(bb.find("xmin").text) * sx)
        y1 = int(float(bb.find("ymin").text) * sy)
        x2 = int(float(bb.find("xmax").text) * sx)
        y2 = int(float(bb.find("ymax").text) * sy)

        # Outer glow
        dark = tuple(max(0, c // 4) for c in color)
        cv2.rectangle(out, (x1-2,y1-2),(x2+2,y2+2), dark, 1)
        # Main box
        cv2.rectangle(out, (x1,y1),(x2,y2), color, 3)

        # Label tag
        ls = 0.55
        lw, lh = tsz(label, FONT, ls, 1)
        pad = 4
        ty1 = max(y1 - lh - pad*2, 0)
        rrect(out, x1, ty1, x1+lw+pad*2, y1, 4, color)
        cv2.putText(out, label, (x1+pad, y1-pad), FONT, ls, (255,255,255), 1, cv2.LINE_AA)

        # Area %
        area = (x2-x1)*(y2-y1) / (w*h) * 100
        cv2.putText(out, f"{area:.1f}%", (x1+4, y2-5), FONT, 0.40, color, 1, cv2.LINE_AA)

        count[label] = count.get(label, 0) + 1
    return out, count


# ══════════════════════════════════════════════════════════════
#  Dashboard builder
# ══════════════════════════════════════════════════════════════

def build_dashboard(img_path, idx, total, session):
    raw = RAW_IMAGES_DIR / img_name(img_path)
    img = cv2.imread(str(raw))
    if img is None:
        return None

    xml_path          = XML_DIR / (Path(img_name(img_path)).stem + ".xml")
    annotated, counts = draw_annotations(img, xml_path)

    # ── Canvas ────────────────────────────────────────────────
    canvas = np.full((WIN_H, WIN_W, 3), BG, dtype=np.uint8)

    # dot grid
    for gx in range(0, IMG_AREA_W, 32):
        for gy in range(0, WIN_H, 32):
            cv2.circle(canvas, (gx, gy), 1, (28,28,34), -1)

    # ── Image letterbox ───────────────────────────────────────
    mg   = 14
    ah   = WIN_H - mg*2
    aw   = IMG_AREA_W - mg*2
    h, w = annotated.shape[:2]
    sc   = min(aw/w, ah/h)
    nw, nh = int(w*sc), int(h*sc)
    resized = cv2.resize(annotated, (nw, nh),
                         interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_LINEAR)
    xo = mg + (aw - nw) // 2
    yo = mg + (ah - nh) // 2
    canvas[yo:yo+nh, xo:xo+nw] = resized
    rrect(canvas, xo-2, yo-2, xo+nw+2, yo+nh+2, 5, BORDER, 1)

    # ── Decision tint ─────────────────────────────────────────
    dec = get_decision(img_path, session)
    if dec == "accepted":
        ov = canvas.copy()
        cv2.rectangle(ov, (xo,yo),(xo+nw,yo+nh),(0,20,5),-1)
        cv2.addWeighted(ov, 0.14, canvas, 0.86, 0, canvas)
        rrect(canvas, xo-2, yo-2, xo+nw+2, yo+nh+2, 5, C_GREEN, 2)
        bw, bh = tsz(" ACCEPTED ", FONTB, 0.72, 2)
        rrect(canvas, xo+10, yo+10, xo+14+bw, yo+16+bh, 6, C_GREEN)
        txt(canvas, " ACCEPTED ", xo+12, yo+12+bh, FONTB, 0.72, (0,0,0), 2)
    elif dec == "rejected":
        ov = canvas.copy()
        cv2.rectangle(ov, (xo,yo),(xo+nw,yo+nh),(8,0,20),-1)
        cv2.addWeighted(ov, 0.14, canvas, 0.86, 0, canvas)
        rrect(canvas, xo-2, yo-2, xo+nw+2, yo+nh+2, 5, C_RED, 2)
        bw, bh = tsz(" REJECTED ", FONTB, 0.72, 2)
        rrect(canvas, xo+10, yo+10, xo+14+bw, yo+16+bh, 6, C_RED)
        txt(canvas, " REJECTED ", xo+12, yo+12+bh, FONTB, 0.72, (230,230,235), 2)

    # ── Sidebar ───────────────────────────────────────────────
    sx = IMG_AREA_W
    rrect(canvas, sx, 0, WIN_W, WIN_H, 0, SIDE_BG)
    cv2.line(canvas, (sx,0),(sx,WIN_H), BORDER, 2)

    cx   = sx + PAD
    maxw = SIDEBAR_W - PAD*2
    y    = PAD + 6

    # Logo
    cv2.rectangle(canvas, (cx,y+2),(cx+3,y+30), ACCENT, -1)
    txt(canvas, "ROAD", cx+10, y+26, FONTB, 0.82, C_WHITE, 2)
    tw1,_ = tsz("ROAD", FONTB, 0.82, 2)
    txt(canvas, "EYE",  cx+10+tw1+2, y+26, FONTB, 0.82, ACCENT, 2)
    tw2,_ = tsz("EYE",  FONTB, 0.82, 2)
    txt(canvas, " REVIEW", cx+10+tw1+tw2+2, y+26, FONT, 0.56, C_GREY, 1)
    y += 46

    # Progress
    pbar(canvas, cx, y, maxw, 7, idx+1, total, ACCENT)
    y += 14
    txt(canvas, f"{idx+1} / {total}   {(idx+1)/max(total,1)*100:.0f}%",
        cx, y+12, FONT, 0.46, C_GREY, 1)
    y += 26
    hline(canvas, y); y += 16

    # Tier badge
    tier_name  = img_path.parent.name
    tier_color = TIER_COLORS.get(tier_name, C_GREY)
    display    = tier_name.replace("_", " ")
    tw, th = tsz(display, FONT, 0.44, 1)
    px2 = 9
    rrect(canvas, cx, y, cx+tw+px2*2, y+th+px2+2, 5, tier_color)
    cv2.putText(canvas, display, (cx+px2, y+th+px2//2+2), FONT, 0.44, (0,0,0), 1, cv2.LINE_AA)
    y += th + px2 + 16

    # Filename
    txt(canvas, "FILE", cx, y+10, FONT, 0.36, C_DIM, 1)
    y += 18
    stem_s = Path(img_name(img_path)).stem
    fsc    = 0.52
    while len(stem_s) > 4:
        fw, _ = tsz(stem_s, FONT, fsc, 1)
        if fw <= maxw: break
        stem_s = stem_s[:-3] + ".."
    txt(canvas, stem_s, cx, y+16, FONT, fsc, C_WHITE, 1)
    y += 30
    hline(canvas, y); y += 16

    # Legend strip
    cv2.circle(canvas, (cx+7, y+8), 6, COLOR_POTHOLE, -1)
    txt(canvas, "Pothole = Red", cx+18, y+13, FONT, 0.40, C_GREY, 1)
    lx = cx + 18 + tsz("Pothole = Red", FONT, 0.40, 1)[0] + 18
    cv2.circle(canvas, (lx+7, y+8), 6, COLOR_CRACK, -1)
    txt(canvas, "Crack = Blue", lx+18, y+13, FONT, 0.40, C_GREY, 1)
    y += 26
    hline(canvas, y); y += 16

    # Detections
    txt(canvas, "DETECTIONS", cx, y+10, FONT, 0.36, C_DIM, 1)
    y += 20
    if not counts:
        rrect(canvas, cx, y, cx+maxw, y+30, 5, CARD)
        txt(canvas, "No annotations", cx+10, y+20, FONT, 0.48, C_DIM, 1)
        y += 38
    else:
        for label, cnt in counts.items():
            dot_col = COLOR_POTHOLE if label == "Pothole" else COLOR_CRACK
            rrect(canvas, cx, y, cx+maxw, y+34, 6, CARD)
            rrect(canvas, cx, y, cx+maxw, y+34, 6, dot_col, 1)
            cv2.circle(canvas, (cx+14, y+17), 5, dot_col, -1)
            txt(canvas, label, cx+26, y+22, FONT, 0.54, C_WHITE, 1)
            cs   = str(cnt)
            cw,_ = tsz(cs, FONTB, 0.70, 2)
            txt(canvas, cs, cx+maxw-cw-8, y+23, FONTB, 0.70, dot_col, 2)
            y += 40
    hline(canvas, y); y += 16

    # Session boxes
    txt(canvas, "SESSION", cx, y+10, FONT, 0.36, C_DIM, 1)
    y += 20
    acc_count = len(session.get("accepted", []))
    rej_count = len(session.get("rejected", []))
    hw = (maxw - 8) // 2
    rrect(canvas, cx,      y, cx+hw,    y+56, 7, CARD)
    rrect(canvas, cx,      y, cx+hw,    y+56, 7, C_GREEN, 1)
    txt(canvas, "ACCEPTED",  cx+8,      y+16, FONT,  0.34, C_GREEN, 1)
    txt(canvas, str(acc_count), cx+8,   y+48, FONTB, 0.95, C_GREEN, 2)
    rrect(canvas, cx+hw+8, y, cx+maxw,  y+56, 7, CARD)
    rrect(canvas, cx+hw+8, y, cx+maxw,  y+56, 7, C_RED,   1)
    txt(canvas, "REJECTED",  cx+hw+16,  y+16, FONT,  0.34, C_RED,   1)
    txt(canvas, str(rej_count), cx+hw+16, y+48, FONTB, 0.95, C_RED, 2)
    y += 68
    hline(canvas, y); y += 16

    # Controls
    txt(canvas, "CONTROLS", cx, y+10, FONT, 0.36, C_DIM, 1)
    y += 20
    rows = [
        ("1", "ACCEPT",     C_GREEN, C_GREEN),
        ("2", "REJECT",     C_RED,   C_RED),
        ("Z", "UNDO / CLEAR", C_AMBER, C_AMBER),
        ("A", "PREV IMAGE", ACCENT,  C_GREY),
        ("D", "NEXT IMAGE", ACCENT,  C_GREY),
    ]
    for ks, lbl, kb, lc in rows:
        y = ctrl_row(canvas, ks, lbl, kb, lc, y)
        y += 2
    hline(canvas, y); y += 10
    ctrl_row(canvas, "Q", "SAVE & QUIT", C_DIM, C_GREY, y)

    return canvas


# ══════════════════════════════════════════════════════════════
#  Main loop
# ══════════════════════════════════════════════════════════════

def run_review():
    all_images = collect_images()
    if not all_images:
        print("[RoadEye] No images found. Check TIER_FOLDERS paths.")
        return

    session = load_session()

    # Resume at first undecided image
    idx = 0
    for i, p in enumerate(all_images):
        if img_name(p) not in session.get("done", []):
            idx = i
            break

    cv2.namedWindow("RoadEye - Dashboard", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("RoadEye - Dashboard", WIN_W, WIN_H)

    total = len(all_images)

    while 0 <= idx < total:
        img_path = all_images[idx]
        frame    = build_dashboard(img_path, idx, total, session)
        if frame is None:
            idx += 1
            continue

        cv2.imshow("RoadEye - Dashboard", frame)

        try:
            raw_key = cv2.waitKeyEx(0)
        except AttributeError:
            raw_key = cv2.waitKey(0)

        # ── WINDOW CLOSED (X button) ─────────────────────────
        if raw_key == -1:
            break
        try:
            if cv2.getWindowProperty("RoadEye - Dashboard", cv2.WND_PROP_VISIBLE) < 1:
                break
        except cv2.error:
            break

        char = raw_key & 0xFF

        # ── Debug: uncomment if a key still doesn't work ───────
        # print(f"[KEY] raw={raw_key}  char={char}")

        # ── ACCEPT ────────────────────────────────────────────
        if char == ord('1'):
            set_decision(img_path, "accept", session)
            save_session(session)
            idx += 1

        # ── REJECT ────────────────────────────────────────────
        elif char == ord('2'):
            set_decision(img_path, "reject", session)
            save_session(session)
            idx += 1

        # ── UNDO / CLEAR (Z) ──────────────────────────────────
        # Behaviour:
        #   • If current image has a decision  → clear it, stay here
        #   • If current image has no decision → go back one & clear that one
        # After clearing, immediately rebuild the frame so the UI
        # reflects the removal of the ACCEPTED / REJECTED badge.
        elif char in (ord('z'), ord('Z')):
            name = img_name(img_path)
            if name in session.get("done", []):
                # current image has a decision — clear it
                clear_decision(img_path, session)
                save_session(session)
                # Rebuild & show the updated frame immediately
                frame = build_dashboard(img_path, idx, total, session)
                if frame is not None:
                    cv2.imshow("RoadEye - Dashboard", frame)
            elif idx > 0:
                # no decision here — go back and clear previous
                idx -= 1
                clear_decision(all_images[idx], session)
                save_session(session)
                # Rebuild & show the updated frame immediately
                img_path = all_images[idx]
                frame = build_dashboard(img_path, idx, total, session)
                if frame is not None:
                    cv2.imshow("RoadEye - Dashboard", frame)

        # ── PREVIOUS  (A / left-arrow) ────────────────────────
        elif char in (ord('a'), ord('A')) or raw_key in (2424832, 65361, 81):
            idx = max(0, idx - 1)

        # ── NEXT  (D / right-arrow) ───────────────────────────
        elif char in (ord('d'), ord('D')) or raw_key in (2555904, 65363, 83):
            idx = min(total - 1, idx + 1)

        # ── SAVE & QUIT ───────────────────────────────────────
        elif char in (ord('q'), ord('Q')):
            break

    save_session(session)
    cv2.destroyAllWindows()
    acc = len(session.get("accepted", []))
    rej = len(session.get("rejected", []))
    print(f"[RoadEye] Done.  Accepted={acc}  Rejected={rej}")


if __name__ == "__main__":
    run_review()