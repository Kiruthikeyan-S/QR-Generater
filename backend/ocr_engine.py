import cv2
import base64
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from rapidocr_onnxruntime import RapidOCR

class DocumentOCREngine:
    def __init__(self):
        # Initialize RapidOCR engine
        self.ocr = RapidOCR()

    def process_ocr(self, img_bgr: np.ndarray, min_confidence: float = 0.50) -> Dict[str, Any]:
        """
        Runs RapidOCR on the input BGR image and extracts structured text, polygons, and scores.
        """
        if img_bgr is None or img_bgr.size == 0:
            return {
                "items": [],
                "raw_text": "",
                "average_confidence": 0.0,
                "total_words_detected": 0
            }

        try:
            results, elapse_list = self.ocr(img_bgr)
        except Exception as e:
            return {
                "items": [],
                "raw_text": f"OCR Error: {str(e)}",
                "average_confidence": 0.0,
                "total_words_detected": 0
            }

        if not results:
            return {
                "items": [],
                "raw_text": "",
                "average_confidence": 0.0,
                "total_words_detected": 0
            }

        items = []
        conf_scores = []
        lines = []

        h, w = img_bgr.shape[:2]

        for entry in results:
            # entry structure: [polygon_pts, text, score]
            pts_raw, text, score_val = entry[0], str(entry[1]), float(entry[2])
            
            # Filter low confidence artifacts if desired
            if score_val < min_confidence or not text.strip():
                continue

            conf_scores.append(score_val)
            lines.append(text.strip())

            # Convert points to clean int list
            polygon = []
            for p in pts_raw:
                px = max(0, min(w - 1, int(round(p[0]))))
                py = max(0, min(h - 1, int(round(p[1]))))
                polygon.append([px, py])

            xs = [p[0] for p in polygon]
            ys = [p[1] for p in polygon]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)

            items.append({
                "text": text.strip(),
                "confidence": round(score_val * 100, 1),
                "polygon": polygon,
                "bbox": {
                    "x": min_x,
                    "y": min_y,
                    "width": max(1, max_x - min_x),
                    "height": max(1, max_y - min_y),
                }
            })

        avg_conf = (sum(conf_scores) / len(conf_scores) * 100) if conf_scores else 0.0
        raw_text = "\n".join(lines)

        return {
            "items": items,
            "raw_text": raw_text,
            "average_confidence": round(avg_conf, 1),
            "total_words_detected": len(items)
        }


def draw_text_badge(
    img: np.ndarray,
    text: str,
    pos: Tuple[int, int],
    bg_color: Tuple[int, int, int],
    text_color: Tuple[int, int, int] = (255, 255, 255),
    font_scale: float = 0.45,
    thickness: int = 1,
    padding: int = 4
):
    """Draws a clean filled badge with rounded background for visual overlays."""
    font = cv2.FONT_HERSHEY_SIMPLEX
    (text_w, text_h), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    
    x, y = pos
    img_h, img_w = img.shape[:2]
    
    # Adjust y if badge goes above image
    if y - text_h - padding * 2 < 0:
        y = y + text_h + padding * 2 + 5
        
    # Adjust x if badge goes beyond right edge
    if x + text_w + padding * 2 > img_w:
        x = max(0, img_w - text_w - padding * 2 - 2)

    bg_x1 = max(0, x - padding)
    bg_y1 = max(0, y - text_h - padding * 2)
    bg_x2 = min(img_w - 1, x + text_w + padding)
    bg_y2 = min(img_h - 1, y)

    # Semi-transparent background badge
    sub_img = img[bg_y1:bg_y2, bg_x1:bg_x2]
    if sub_img.size > 0:
        rect = np.full(sub_img.shape, bg_color, dtype=np.uint8)
        cv2.addWeighted(rect, 0.85, sub_img, 0.15, 1.0, sub_img)

    # Outline
    cv2.rectangle(img, (bg_x1, bg_y1), (bg_x2, bg_y2), bg_color, 1)
    
    # Text
    cv2.putText(
        img,
        text,
        (x, y - padding),
        font,
        font_scale,
        text_color,
        thickness,
        cv2.LINE_AA
    )


def create_annotated_image(
    img_bgr: np.ndarray,
    codes: List[Dict[str, Any]],
    ocr_items: Optional[List[Dict[str, Any]]] = None,
    include_ocr: bool = True
) -> str:
    """
    Creates high-contrast, professional visual bounding box annotations on the image.
    - Green boxes: OCR text words (>75% confidence) with confidence tags.
    - Purple/Violet polygons: 2D QR & Data Matrix codes with [QR: <Format>] badges.
    - Orange/Azure polygons: 1D linear barcodes with [1D: <Format>] value badges.
    Returns: Base64 data URL string (data:image/jpeg;base64,...)
    """
    if img_bgr is None or img_bgr.size == 0:
        return ""

    annotated = img_bgr.copy()
    img_h, img_w = annotated.shape[:2]

    # 1. Draw OCR Text Annotations (Green: BGR (34, 197, 94) / (40, 167, 69))
    if include_ocr and ocr_items:
        for item in ocr_items:
            conf = item.get("confidence", 0)
            if conf >= 75: # Only draw high-confidence OCR text to keep view clear
                pts = np.array(item["polygon"], np.int32).reshape((-1, 1, 2))
                
                # Draw translucent box fill
                overlay = annotated.copy()
                cv2.fillPoly(overlay, [pts], (34, 197, 94))
                cv2.addWeighted(overlay, 0.12, annotated, 0.88, 0, annotated)
                
                # Draw thin green border
                cv2.polylines(annotated, [pts], isClosed=True, color=(34, 197, 94), thickness=1, lineType=cv2.LINE_AA)
                
                # Draw small confidence tag
                min_x = item["bbox"]["x"]
                min_y = item["bbox"]["y"]
                tag = f"{int(conf)}%"
                draw_text_badge(annotated, tag, (min_x, max(12, min_y - 2)), bg_color=(22, 101, 52), font_scale=0.35, thickness=1, padding=2)

    # 2. Draw 2D Matrix Codes & 1D Barcodes
    # We sort 1D barcodes and 2D QR codes to render them crisply on top of OCR layers
    for code in codes:
        symbology_type = code.get("symbology_type", "1D")
        fmt = code.get("format", "Code")
        val = code.get("text", "")
        pts_list = code.get("polygon", [])
        
        if not pts_list:
            continue

        pts = np.array(pts_list, np.int32).reshape((-1, 1, 2))

        if symbology_type == "2D":
            # Purple / Violet (BGR: 218, 59, 138 or 180, 50, 220)
            border_color = (218, 59, 138)
            badge_bg = (130, 20, 160)
            badge_text = f"[QR: {fmt}]"
            
            # Semi-transparent overlay inside 2D code
            overlay = annotated.copy()
            cv2.fillPoly(overlay, [pts], border_color)
            cv2.addWeighted(overlay, 0.18, annotated, 0.82, 0, annotated)
            
            # Thick crisp border
            cv2.polylines(annotated, [pts], isClosed=True, color=border_color, thickness=3, lineType=cv2.LINE_AA)
            
            # Corner accents
            for p in pts_list:
                cv2.circle(annotated, (int(p[0]), int(p[1])), 4, (255, 255, 255), -1)
                cv2.circle(annotated, (int(p[0]), int(p[1])), 4, border_color, 1)

            # Top Badge
            top_pt = min(pts_list, key=lambda p: p[1])
            draw_text_badge(annotated, badge_text, (int(top_pt[0]), int(top_pt[1]) - 4), bg_color=badge_bg, font_scale=0.55, thickness=2, padding=5)

        else:
            # 1D Linear Barcode: Orange / Azure (BGR: 0, 140, 255)
            border_color = (0, 140, 255)
            badge_bg = (0, 100, 200)
            short_val = val if len(val) <= 18 else (val[:15] + "...")
            badge_text = f"[1D: {fmt}] {short_val}"
            
            # Semi-transparent overlay inside 1D code
            overlay = annotated.copy()
            cv2.fillPoly(overlay, [pts], border_color)
            cv2.addWeighted(overlay, 0.15, annotated, 0.85, 0, annotated)

            # Thick crisp border
            cv2.polylines(annotated, [pts], isClosed=True, color=border_color, thickness=3, lineType=cv2.LINE_AA)
            
            # Corner accents
            for p in pts_list:
                cv2.circle(annotated, (int(p[0]), int(p[1])), 4, (255, 255, 255), -1)
                cv2.circle(annotated, (int(p[0]), int(p[1])), 4, border_color, 1)

            # Top Badge
            top_pt = min(pts_list, key=lambda p: p[1])
            draw_text_badge(annotated, badge_text, (int(top_pt[0]), int(top_pt[1]) - 4), bg_color=badge_bg, font_scale=0.52, thickness=2, padding=5)

    # Encode to JPEG base64 data URL
    _, buffer = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    b64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"
