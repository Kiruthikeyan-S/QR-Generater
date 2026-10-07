import re
import json
import numpy as np
import cv2
import zxingcpp
from typing import List, Dict, Any, Tuple, Optional

# Supported 2D Matrix Formats
FORMATS_2D = {
    "QR_CODE", "QR Code", "QRCode", "MICRO_QR_CODE", "Micro QR Code", "MicroQRCode",
    "DATA_MATRIX", "Data Matrix", "DataMatrix", "AZTEC", "Aztec", "MAXICODE", "MaxiCode", "RMQR"
}

# Supported 1D Barcode Formats
FORMATS_1D = {
    "CODE_128", "Code 128", "Code128",
    "CODE_39", "Code 39", "Code39",
    "CODE_93", "Code 93", "Code93",
    "EAN_13", "EAN-13", "EAN13",
    "EAN_8", "EAN-8", "EAN8",
    "UPC_A", "UPC-A", "UPCA",
    "UPC_E", "UPC-E", "UPCE",
    "ITF", "Interleaved 2 of 5",
    "PDF_417", "PDF417", "PDF-417",
    "CODABAR", "Codabar",
    "DATA_BAR", "DataBar", "DataBarExpanded", "DataBarLimited",
    "DX_FILM_EDGE"
}

def normalize_format_name(fmt_str: str) -> str:
    """Standardizes format names from zxing-cpp, opencv, or pyzbar."""
    fmt = str(fmt_str).replace("BarcodeFormat.", "").replace("_", " ").strip()
    # Normalize common variations
    mapping = {
        "QRCode": "QR Code",
        "DataMatrix": "Data Matrix",
        "MicroQRCode": "Micro QR Code",
        "PDF417": "PDF417",
        "Code128": "Code 128",
        "Code39": "Code 39",
        "Code93": "Code 93",
        "EAN13": "EAN-13",
        "EAN8": "EAN-8",
        "UPCA": "UPC-A",
        "UPCE": "UPC-E",
    }
    return mapping.get(fmt, fmt)

def is_2d_symbology(format_name: str) -> bool:
    norm = normalize_format_name(format_name).lower()
    for f2d in ["qr", "data matrix", "aztec", "maxi", "matrix"]:
        if f2d in norm:
            return True
    return False

def classify_payload(text: str, format_name: str) -> Dict[str, Any]:
    """
    Intelligently classifies decoded barcode/QR payload into standard business categories:
    Tracking URL, AWB Number, Order ID, Shipment ID, Courier Information,
    Wi-Fi, Contact (vCard), Geolocation, Phone, Email, JSON, Product SKU, or Plain Text.
    """
    if not text:
        return {"category": "Empty", "badge": "Empty", "description": "Empty payload"}

    text_strip = text.strip()
    text_lower = text_strip.lower()

    # 1. Wi-Fi Configuration
    if text_strip.startswith("WIFI:") or text_strip.startswith("wifi:"):
        return {
            "category": "Wi-Fi Config",
            "badge": "Wi-Fi",
            "description": "Wireless network connection credentials"
        }

    # 2. Digital Contact / vCard / MeCard
    if text_strip.startswith("BEGIN:VCARD") or text_strip.startswith("MECARD:"):
        return {
            "category": "Digital Contact",
            "badge": "vCard",
            "description": "Electronic business card / Contact info"
        }

    # 3. Geolocation
    if text_strip.startswith("geo:") or "maps.google.com" in text_lower or "google.com/maps" in text_lower:
        return {
            "category": "Geolocation",
            "badge": "GPS Location",
            "description": "Geographic coordinates / Map link"
        }

    # 4. Email
    if text_strip.startswith("mailto:") or text_strip.startswith("MATMSG:") or (
        re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", text_strip)
    ):
        return {
            "category": "Email Address",
            "badge": "Email",
            "description": "Direct email address or message template"
        }

    # 5. Phone / SMS
    if text_strip.startswith("tel:") or text_strip.startswith("SMSTO:") or text_strip.startswith("sms:"):
        return {
            "category": "Phone Number",
            "badge": "Phone / SMS",
            "description": "Telephone number or direct SMS payload"
        }

    # 6. JSON Structured Data
    if (text_strip.startswith("{") and text_strip.endswith("}")) or (text_strip.startswith("[") and text_strip.endswith("]")):
        try:
            parsed = json.loads(text_strip)
            return {
                "category": "JSON",
                "badge": "JSON Data",
                "description": f"Structured JSON data ({len(parsed) if isinstance(parsed, (dict, list)) else 'object'} items)",
                "data": parsed
            }
        except Exception:
            pass

    # 7. Tracking URL
    if text_lower.startswith("http://") or text_lower.startswith("https://"):
        tracking_keywords = ["track", "ship", "awb", "fedex", "ups", "dhl", "usps", "parcel", "delivery", "waybill", "courier", "package"]
        if any(kw in text_lower for kw in tracking_keywords):
            return {
                "category": "Tracking URL",
                "badge": "Tracking URL",
                "description": "Live shipment tracking web link"
            }
        return {
            "category": "Website URL",
            "badge": "Web URL",
            "description": "Direct website or API endpoint hyperlink"
        }

    # 8. Shipping / Waybill / AWB Number
    awb_patterns = [
        r"^AWB[:#\-\s]?([0-9a-zA-Z\-]+)$",
        r"^1Z[0-9A-Z]{16}$", # UPS Tracking
        r"^\d{12,14}$", # FedEx Express
        r"^9400\d{16,18}$", # USPS
        r"^JD\d{16,18}$", # DHL Express
        r"^\d{10}$", # DHL / BlueDart standard 10-digit
    ]
    if any(re.match(p, text_strip, re.IGNORECASE) for p in awb_patterns) or text_upper_starts(text_strip, ["AWB:", "AWB-", "WAYBILL:", "WAYBILL-"]):
        return {
            "category": "AWB Number",
            "badge": "AWB / Waybill",
            "description": "Air Waybill / Courier tracking identifier"
        }

    # 9. Order ID
    order_patterns = [
        r"^ORDER[#:\-\s]?([0-9a-zA-Z\-]+)$",
        r"^ORD[#:\-\s]?([0-9a-zA-Z\-]+)$",
        r"^PO[#:\-\s]?([0-9a-zA-Z\-]+)$",
        r"^SO[#:\-\s]?([0-9a-zA-Z\-]+)$",
        r"^INVOICE[#:\-\s]?([0-9a-zA-Z\-]+)$"
    ]
    if any(re.match(p, text_strip, re.IGNORECASE) for p in order_patterns) or "order#" in text_lower:
        return {
            "category": "Order ID",
            "badge": "Order ID",
            "description": "Purchase order or invoice reference"
        }

    # 10. Shipment ID / Package
    ship_patterns = [
        r"^SHP[#:\-\s]?([0-9a-zA-Z\-]+)$",
        r"^SHIP[#:\-\s]?([0-9a-zA-Z\-]+)$",
        r"^PKG[#:\-\s]?([0-9a-zA-Z\-]+)$",
        r"^PARCEL[#:\-\s]?([0-9a-zA-Z\-]+)$"
    ]
    if any(re.match(p, text_strip, re.IGNORECASE) for p in ship_patterns):
        return {
            "category": "Shipment ID",
            "badge": "Shipment ID",
            "description": "Package or consignment identifier"
        }

    # 11. Courier Information
    couriers = ["fedex", "dhl", "ups", "bluedart", "delhivery", "usps", "dtdc", "aramex", "shadowfax"]
    if any(c in text_lower for c in couriers) and any(kw in text_lower for kw in ["carrier", "express", "courier", "logistics"]):
        return {
            "category": "Courier Information",
            "badge": "Courier Info",
            "description": "Logistics carrier details and service level"
        }

    # 12. Product SKU / Numerical GTIN
    if not is_2d_symbology(format_name) or text_upper_starts(text_strip, ["SKU:", "SKU-", "GTIN:", "GTIN-"]):
        return {
            "category": "Product SKU",
            "badge": "SKU / GTIN",
            "description": f"Standardized {normalize_format_name(format_name)} product code"
        }

    # 13. Default Plain Text
    return {
        "category": "Plain Text",
        "badge": "Plain Text",
        "description": "Standard textual content"
    }

def text_upper_starts(s: str, prefixes: List[str]) -> bool:
    su = s.upper()
    return any(su.startswith(p.upper()) for p in prefixes)


def extract_polygon_from_zxing(result, transform_fn=None) -> List[List[int]]:
    """Extracts 4 vertices from a zxing-cpp result and applies inverse coordinate transform."""
    if not hasattr(result, "position"):
        return []
    p = result.position
    pts = [
        [int(p.top_left.x), int(p.top_left.y)],
        [int(p.top_right.x), int(p.top_right.y)],
        [int(p.bottom_right.x), int(p.bottom_right.y)],
        [int(p.bottom_left.x), int(p.bottom_left.y)],
    ]
    if transform_fn:
        pts = [transform_fn(pt[0], pt[1]) for pt in pts]
    return pts


def polygon_to_bbox(pts: List[List[int]], img_w: int, img_h: int) -> Dict[str, int]:
    """Computes bounded bounding box dictionary from 4 polygon vertices."""
    if not pts:
        return {"x": 0, "y": 0, "width": 0, "height": 0, "min_x": 0, "min_y": 0, "max_x": 0, "max_y": 0}
    
    xs = [max(0, min(img_w - 1, p[0])) for p in pts]
    ys = [max(0, min(img_h - 1, p[1])) for p in pts]
    
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    
    return {
        "x": int(min_x),
        "y": int(min_y),
        "width": int(max(1, max_x - min_x)),
        "height": int(max(1, max_y - min_y)),
        "min_x": int(min_x),
        "min_y": int(min_y),
        "max_x": int(max_x),
        "max_y": int(max_y),
    }


def compute_iou(bbox1: Dict[str, int], bbox2: Dict[str, int]) -> float:
    """Computes Intersection over Union (IoU) of two bounding boxes."""
    x1 = max(bbox1["min_x"], bbox2["min_x"])
    y1 = max(bbox1["min_y"], bbox2["min_y"])
    x2 = min(bbox1["max_x"], bbox2["max_x"])
    y2 = min(bbox1["max_y"], bbox2["max_y"])
    
    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h
    
    area1 = bbox1["width"] * bbox1["height"]
    area2 = bbox2["width"] * bbox2["height"]
    union_area = area1 + area2 - inter_area
    
    if union_area <= 0:
        return 0.0
    return inter_area / union_area


class MultiPassCodeReader:
    """
    Progressive multi-pass optical barcode & 2D matrix scanner engine.
    Executes 6 specialized enhancement and fallback passes to maximize detection rate.
    """
    
    def __init__(self):
        self.qr_detector = cv2.QRCodeDetector()
        # Fallback Multi QR Detector if available
        self.qr_detector_multi = getattr(cv2, "QRCodeDetectorMulti", None)() if hasattr(cv2, "QRCodeDetectorMulti") else None

    def read_codes(self, img_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """
        Runs all 6 progressive detection passes and returns deduplicated results
        with exact coordinate mappings back to the original image.
        """
        if img_bgr is None or img_bgr.size == 0:
            return []

        orig_h, orig_w = img_bgr.shape[:2]
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        
        detected_items: List[Dict[str, Any]] = []

        def add_code(text: str, format_name: str, pts: List[List[int]], pass_name: str, confidence: float = 1.0):
            if not text:
                return
            # Clamp vertices to original image bounds
            clamped_pts = [[max(0, min(orig_w - 1, int(p[0]))), max(0, min(orig_h - 1, int(p[1])))] for p in pts]
            bbox = polygon_to_bbox(clamped_pts, orig_w, orig_h)
            norm_format = normalize_format_name(format_name)
            is_2d = is_2d_symbology(norm_format)
            classification = classify_payload(text, norm_format)
            
            # Deduplication check: same text + format or overlapping IoU > 0.4
            for existing in detected_items:
                if existing["text"] == text and (existing["format"] == norm_format or compute_iou(existing["bbox"], bbox) > 0.4):
                    return # Already detected in an earlier pass
                if compute_iou(existing["bbox"], bbox) > 0.75:
                    return # Same physical barcode
            
            detected_items.append({
                "text": text,
                "format": norm_format,
                "symbology_type": "2D" if is_2d else "1D",
                "classification": classification,
                "polygon": clamped_pts,
                "bbox": bbox,
                "pass_found": pass_name,
                "confidence": round(confidence, 2)
            })

        # ==========================================
        # PASS 1: Native Full-Resolution Scan
        # ==========================================
        try:
            res1 = zxingcpp.read_barcodes(img_rgb)
            for r in res1:
                pts = extract_polygon_from_zxing(r)
                add_code(r.text, str(r.format), pts, "Pass 1: Native Full-Res", 1.0)
        except Exception:
            pass

        # ==========================================
        # PASS 2: Multi-Scale Upscaling (1.5x, 2.0x)
        # ==========================================
        for scale in [1.5, 2.0]:
            try:
                scaled_w = int(orig_w * scale)
                scaled_h = int(orig_h * scale)
                scaled_img = cv2.resize(img_rgb, (scaled_w, scaled_h), interpolation=cv2.INTER_LINEAR)
                res2 = zxingcpp.read_barcodes(scaled_img)
                for r in res2:
                    inv_fn = lambda x, y: [int(x / scale), int(y / scale)]
                    pts = extract_polygon_from_zxing(r, inv_fn)
                    add_code(r.text, str(r.format), pts, f"Pass 2: Upscale {scale}x", 0.98)
            except Exception:
                pass

        # ==========================================
        # PASS 3: Regional Band Cropping (Top 60% & Bottom 60%)
        # ==========================================
        try:
            # Top 60%
            top_h = int(orig_h * 0.6)
            top_crop = img_rgb[:top_h, :]
            res_top = zxingcpp.read_barcodes(top_crop)
            for r in res_top:
                pts = extract_polygon_from_zxing(r)
                add_code(r.text, str(r.format), pts, "Pass 3: Top Band Crop", 0.95)

            # Bottom 60%
            bottom_offset = int(orig_h * 0.4)
            bottom_crop = img_rgb[bottom_offset:, :]
            res_bottom = zxingcpp.read_barcodes(bottom_crop)
            for r in res_bottom:
                inv_fn = lambda x, y: [int(x), int(y + bottom_offset)]
                pts = extract_polygon_from_zxing(r, inv_fn)
                add_code(r.text, str(r.format), pts, "Pass 3: Bottom Band Crop", 0.95)
        except Exception:
            pass

        # ==========================================
        # PASS 4: Grayscale + CLAHE + Thresholding
        # ==========================================
        try:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            
            # CLAHE Enhancement
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # 4a. CLAHE Grayscale direct scan
            res_clahe = zxingcpp.read_barcodes(enhanced)
            for r in res_clahe:
                pts = extract_polygon_from_zxing(r)
                add_code(r.text, str(r.format), pts, "Pass 4: CLAHE Grayscale", 0.95)

            # 4b. Otsu Thresholding
            _, otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            res_otsu = zxingcpp.read_barcodes(otsu)
            for r in res_otsu:
                pts = extract_polygon_from_zxing(r)
                add_code(r.text, str(r.format), pts, "Pass 4: Otsu Threshold", 0.92)

            # 4c. Adaptive Gaussian Thresholding
            adapt = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 5)
            res_adapt = zxingcpp.read_barcodes(adapt)
            for r in res_adapt:
                pts = extract_polygon_from_zxing(r)
                add_code(r.text, str(r.format), pts, "Pass 4: Adaptive Gaussian", 0.90)
        except Exception:
            pass

        # ==========================================
        # PASS 5: Multi-Angle Rotations (90°, 180°, 270°)
        # ==========================================
        rotations = [
            (cv2.ROTATE_90_CLOCKWISE, 90, lambda x, y: [int(y), int(orig_h - 1 - x)]),
            (cv2.ROTATE_180, 180, lambda x, y: [int(orig_w - 1 - x), int(orig_h - 1 - y)]),
            (cv2.ROTATE_90_COUNTERCLOCKWISE, 270, lambda x, y: [int(orig_w - 1 - y), int(x)]),
        ]
        
        for rot_code, angle_deg, inv_transform in rotations:
            try:
                rot_img = cv2.rotate(img_rgb, rot_code)
                res_rot = zxingcpp.read_barcodes(rot_img)
                for r in res_rot:
                    pts = extract_polygon_from_zxing(r, inv_transform)
                    add_code(r.text, str(r.format), pts, f"Pass 5: Rotation {angle_deg}°", 0.92)
            except Exception:
                pass

        # ==========================================
        # PASS 6: OpenCV QRCodeDetector Fallback
        # ==========================================
        try:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY) if len(img_bgr.shape) == 3 else img_bgr
            
            # Try Multi Detector first
            if self.qr_detector_multi is not None:
                retval, decoded_info, points, _ = self.qr_detector_multi.detectAndDecode(gray)
                if retval and decoded_info is not None:
                    for text, pts in zip(decoded_info, points):
                        if text:
                            clean_pts = [[int(pt[0]), int(pt[1])] for pt in pts]
                            add_code(text, "QR Code", clean_pts, "Pass 6: OpenCV Multi-QR Fallback", 0.85)

            # Single Detector fallback
            data, pts, _ = self.qr_detector.detectAndDecode(gray)
            if data and pts is not None and len(pts) > 0:
                clean_pts = [[int(pt[0]), int(pt[1])] for pt in pts[0]]
                add_code(data, "QR Code", clean_pts, "Pass 6: OpenCV QR Fallback", 0.85)
        except Exception:
            pass

        return detected_items
