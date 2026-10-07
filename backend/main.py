import io
import cv2
import base64
import numpy as np
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image

from backend.qr_generator import generate_qr_code
from backend.code_reader import MultiPassCodeReader
from backend.ocr_engine import DocumentOCREngine, create_annotated_image

app = FastAPI(
    title="Production QR & Barcode Tools API",
    description="High-performance optical barcode/matrix detection, 12-payload QR generator, and document OCR engine.",
    version="2.0.0"
)

# Enable CORS for frontend Vite dev server and production builds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Engine Instances
code_reader = MultiPassCodeReader()
ocr_engine = DocumentOCREngine()

# ==========================================
# Pydantic Request Models
# ==========================================

class GenerateQRRequest(BaseModel):
    payload_type: str = Field("text", description="One of 12 supported payload types")
    fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Structured fields for payload builder")
    raw_data: Optional[str] = Field(None, description="Direct raw payload string")
    ecc: str = Field("M", description="Error correction level: L (7%), M (15%), Q (25%), H (30%)")
    size: int = Field(400, description="Target square resolution in pixels (200, 400, 600, 800, 1200)")
    format: str = Field("BOTH", description="Output format: PNG, SVG, or BOTH")
    fill_color: str = Field("#000000", description="Foreground hex color")
    back_color: str = Field("#FFFFFF", description="Background hex color")

# ==========================================
# API Endpoints
# ==========================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "QR & Barcode Optical Tools API",
        "engine": "FastAPI + OpenCV + ZXing-CPP + RapidOCR",
        "version": "2.0.0"
    }

@app.get("/formats")
def get_supported_formats():
    """Returns metadata for 17 standardized symbologies and their logistics use cases."""
    return {
        "formats": [
            {
                "name": "QR Code",
                "type": "2D Matrix",
                "capacity": "Up to 7,089 numeric or 4,296 alphanumeric characters",
                "ecc": "7% to 30% Reed-Solomon error correction",
                "use_cases": "Mobile payments, URL redirection, Wi-Fi onboarding, digital contact cards (vCard), authentication tokens."
            },
            {
                "name": "Data Matrix",
                "type": "2D Matrix",
                "capacity": "Up to 3,116 numeric or 2,335 alphanumeric characters",
                "ecc": "ECC 200 standard (up to 30% damaged area recovery)",
                "use_cases": "Electronics components, medical devices (UDI), aerospace parts, pharmaceutical serialization, high-density direct part marking (DPM)."
            },
            {
                "name": "Aztec Code",
                "type": "2D Matrix",
                "capacity": "Up to 3,832 numeric or 3,067 alphabetic characters",
                "ecc": "5% to 95% user-configurable error correction",
                "use_cases": "Aviation boarding passes, railway ticketing, transport tokens, identity documents (no quiet zone needed)."
            },
            {
                "name": "Micro QR Code",
                "type": "2D Matrix",
                "capacity": "Up to 35 numeric or 21 alphanumeric characters",
                "ecc": "L, M, Q error correction",
                "use_cases": "Extremely small electronic components, micro mechanical parts, circuit boards."
            },
            {
                "name": "PDF417",
                "type": "Stacked 2D / 1D Composite",
                "capacity": "Up to 1.1 KB data (1,850 alphanumeric characters)",
                "ecc": "9 levels of error correction",
                "use_cases": "Driver's licenses, government IDs, airline boarding passes, customs declarations, shipping labels (FedEx/UPS/USPS)."
            },
            {
                "name": "Code 128",
                "type": "1D Linear Barcode",
                "capacity": "High-density alphanumeric (all 128 ASCII characters)",
                "ecc": "Checksum character",
                "use_cases": "Global logistics, supply chain cartons, GS1-128 shipping labels, inventory management, healthcare specimens."
            },
            {
                "name": "Code 39",
                "type": "1D Linear Barcode",
                "capacity": "43 characters (uppercase letters, digits, and special characters)",
                "ecc": "Optional modulo 43 checksum",
                "use_cases": "Automotive manufacturing (AIAG), defense (DoD UID labels), government asset tagging, badge scanning."
            },
            {
                "name": "Code 93",
                "type": "1D Linear Barcode",
                "capacity": "Full ASCII capability with higher density than Code 39",
                "ecc": "Dual checksums (Modulo 47 'C' and 'K')",
                "use_cases": "Canadian postal services, internal industrial inventory, high-density secure linear tracking."
            },
            {
                "name": "EAN-13",
                "type": "1D Linear Barcode",
                "capacity": "13 numeric digits (Country + Manufacturer + Product + Checksum)",
                "ecc": "Modulo 10 check digit",
                "use_cases": "Global retail point-of-sale (POS) checkout for consumer packaged goods worldwide (outside North America)."
            },
            {
                "name": "EAN-8",
                "type": "1D Linear Barcode",
                "capacity": "8 numeric digits",
                "ecc": "Modulo 10 check digit",
                "use_cases": "Small retail packages (candy, cosmetics, pencils) where EAN-13 would occupy too much surface area."
            },
            {
                "name": "UPC-A",
                "type": "1D Linear Barcode",
                "capacity": "12 numeric digits",
                "ecc": "Modulo 10 check digit",
                "use_cases": "North American retail point-of-sale checkout (supermarkets, retail outlets)."
            },
            {
                "name": "UPC-E",
                "type": "1D Linear Barcode",
                "capacity": "6 compressed digits (zero-suppressed representation of UPC-A)",
                "ecc": "Inherent zero-suppression verification",
                "use_cases": "Small retail packaging in North American markets."
            },
            {
                "name": "ITF (Interleaved 2 of 5)",
                "type": "1D Linear Barcode",
                "capacity": "Even number of numeric digits (typically 14 digits for ITF-14)",
                "ecc": "Optional checksum digit",
                "use_cases": "Corrugated shipping cartons, master warehouse cases, pallet identification, logistics outer packaging."
            },
            {
                "name": "Codabar",
                "type": "1D Linear Barcode",
                "capacity": "16 numeric characters with 4 start/stop characters (A, B, C, D)",
                "ecc": "Self-checking character structure",
                "use_cases": "Blood banks, medical lab test tubes, library book management, FedEx airbills."
            },
            {
                "name": "GS1 DataBar",
                "type": "1D Linear Barcode",
                "capacity": "GTIN-14 plus optional expiration dates & batch numbers",
                "ecc": "Standard check digit",
                "use_cases": "Fresh produce, loose grocery items, healthcare unit-dose pharmaceuticals, couponing."
            },
            {
                "name": "MaxiCode",
                "type": "2D Matrix (Honeycomb)",
                "capacity": "93 alphanumeric characters",
                "ecc": "Reed-Solomon error correction",
                "use_cases": "High-speed conveyor sorting, automated parcel sorting (UPS tracking labels)."
            },
            {
                "name": "RMQR (Rectangular Micro QR)",
                "type": "2D Matrix",
                "capacity": "Up to 361 numeric or 219 alphanumeric characters",
                "ecc": "Standard Reed-Solomon",
                "use_cases": "Narrow strip applications, test tubes, pharmaceutical packaging edges, micro electronic traces."
            }
        ]
    }

@app.post("/generate-qr")
def api_generate_qr(request: GenerateQRRequest):
    """
    Generates QR code for 12 standardized payload types with capacity checks,
    color customization, PNG/SVG rendering, and zxing-cpp self-verification.
    """
    try:
        res = generate_qr_code(
            payload_type=request.payload_type,
            fields=request.fields,
            raw_data=request.raw_data,
            ecc=request.ecc,
            size=request.size,
            output_format=request.format,
            fill_color=request.fill_color,
            back_color=request.back_color,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")


def decode_image_upload(file_bytes: bytes) -> np.ndarray:
    """Safely decodes image bytes from uploaded file into OpenCV BGR numpy array."""
    try:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            # Fallback via PIL
            pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or unreadable image file: {str(e)}")


@app.post("/scan-code")
async def api_scan_code(file: UploadFile = File(...)):
    """
    Optical Multi-Pass Scanner: detects 1D barcodes & 2D matrix codes using 6 progressive passes
    and generates visual bounding box overlays.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    img_bgr = decode_image_upload(contents)
    h, w = img_bgr.shape[:2]

    # Run multi-pass optical detection
    detected_codes = code_reader.read_codes(img_bgr)

    # Split into 1D and 2D
    codes_1d = [c for c in detected_codes if c.get("symbology_type") == "1D"]
    codes_2d = [c for c in detected_codes if c.get("symbology_type") == "2D"]

    # Generate annotated image overlay (Purple for 2D, Orange for 1D)
    annotated_b64 = create_annotated_image(img_bgr, detected_codes, ocr_items=None, include_ocr=False)

    return {
        "success": True,
        "filename": file.filename,
        "image_dimensions": {"width": w, "height": h},
        "total_detected": len(detected_codes),
        "count_1d": len(codes_1d),
        "count_2d": len(codes_2d),
        "codes_1d": codes_1d,
        "codes_2d": codes_2d,
        "all_codes": detected_codes,
        "annotated_image": annotated_b64
    }


@app.post("/scan-document-codes")
async def api_scan_document_codes(file: UploadFile = File(...)):
    """
    Combined Document OCR & Multi-Pass Code Scanner:
    Extracts text via RapidOCR and detects all barcodes/QR codes.
    Returns composite visual overlay with:
    - Green boxes: High-confidence OCR text words/lines
    - Purple polygons: 2D Matrix codes (QR / Data Matrix)
    - Orange polygons: 1D linear barcodes
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    img_bgr = decode_image_upload(contents)
    h, w = img_bgr.shape[:2]

    # 1. Multi-pass barcode / QR scanner
    detected_codes = code_reader.read_codes(img_bgr)
    codes_1d = [c for c in detected_codes if c.get("symbology_type") == "1D"]
    codes_2d = [c for c in detected_codes if c.get("symbology_type") == "2D"]

    # 2. RapidOCR Text Extraction
    ocr_res = ocr_engine.process_ocr(img_bgr, min_confidence=0.45)

    # 3. Create composite 3-color annotated image
    annotated_b64 = create_annotated_image(
        img_bgr,
        detected_codes,
        ocr_items=ocr_res.get("items", []),
        include_ocr=True
    )

    return {
        "success": True,
        "filename": file.filename,
        "image_dimensions": {"width": w, "height": h},
        "total_codes": len(detected_codes),
        "count_1d": len(codes_1d),
        "count_2d": len(codes_2d),
        "codes_1d": codes_1d,
        "codes_2d": codes_2d,
        "all_codes": detected_codes,
        "ocr": {
            "total_words_detected": ocr_res.get("total_words_detected", 0),
            "average_confidence": ocr_res.get("average_confidence", 0.0),
            "raw_text": ocr_res.get("raw_text", ""),
            "items": ocr_res.get("items", [])
        },
        "annotated_image": annotated_b64
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
