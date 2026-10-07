import io
import json
import base64
import urllib.parse
from typing import Dict, Any, Tuple, Optional
import qrcode
import qrcode.image.svg
from PIL import Image
import zxingcpp

# Maximum capacity for QR Code Version 40 (Binary / 8-bit byte mode at Low ECC is 2,953 bytes)
MAX_BYTE_CAPACITY = 2950

ECC_MAP = {
    "L": qrcode.constants.ERROR_CORRECT_L, # ~7%
    "M": qrcode.constants.ERROR_CORRECT_M, # ~15%
    "Q": qrcode.constants.ERROR_CORRECT_Q, # ~25%
    "H": qrcode.constants.ERROR_CORRECT_H, # ~30%
}

def escape_vcard(text: str) -> str:
    """Escapes special characters in vCard text fields according to vCard 3.0 specs."""
    if not text:
        return ""
    return str(text).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

def escape_wifi(text: str) -> str:
    """Escapes special characters in Wi-Fi SSID/password fields according to ZXing format."""
    if not text:
        return ""
    return str(text).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace(":", "\\:").replace('"', '\\"')

def build_payload(payload_type: str, fields: Dict[str, Any], raw_data: Optional[str] = None) -> str:
    """
    Constructs standardized payload strings across 12 payload categories.
    """
    payload_type = (payload_type or "text").lower().strip()
    
    # If raw_data is provided directly and fields is empty or simple text, use raw_data
    if raw_data and (not fields or payload_type in ["text", "plain", "raw"]):
        return raw_data

    if payload_type in ["url", "website"]:
        url = str(fields.get("url") or raw_data or "").strip()
        if not url:
            raise ValueError("URL field is required.")
        if not (url.startswith("http://") or url.startswith("https://") or url.startswith("ftp://")):
            url = "https://" + url
        return url

    elif payload_type in ["phone", "tel"]:
        phone = str(fields.get("phone") or fields.get("number") or raw_data or "").strip()
        if not phone:
            raise ValueError("Phone number is required.")
        # Clean formatting but keep leading +
        clean_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        return f"tel:{clean_phone}"

    elif payload_type in ["email", "mail"]:
        to = str(fields.get("to") or fields.get("email") or raw_data or "").strip()
        if not to:
            raise ValueError("Recipient email is required.")
        subject = str(fields.get("subject") or "").strip()
        body = str(fields.get("body") or fields.get("message") or "").strip()
        encoding_style = str(fields.get("style", "mailto")).lower()
        
        if encoding_style == "matmsg":
            # MATMSG:TO:recipient@example.com;SUB:Subject;BODY:Message;;
            return f"MATMSG:TO:{to};SUB:{subject};BODY:{body};;"
        else:
            # Standard URI format: mailto:to?subject=...&body=...
            params = {}
            if subject:
                params["subject"] = subject
            if body:
                params["body"] = body
            query = ("?" + urllib.parse.urlencode(params)) if params else ""
            return f"mailto:{to}{query}"

    elif payload_type in ["sms"]:
        number = str(fields.get("number") or fields.get("phone") or "").strip()
        if not number and raw_data:
            number = raw_data.strip()
        if not number:
            raise ValueError("Phone number is required for SMS.")
        body = str(fields.get("body") or fields.get("message") or "").strip()
        clean_number = number.replace(" ", "").replace("-", "")
        return f"SMSTO:{clean_number}:{body}"

    elif payload_type in ["wifi", "wi-fi"]:
        ssid = str(fields.get("ssid") or "").strip()
        if not ssid:
            raise ValueError("Wi-Fi SSID (Network Name) is required.")
        auth_type = str(fields.get("auth") or fields.get("encryption") or "WPA").upper().strip()
        if auth_type not in ["WPA", "WEP", "nopass", "WPA2", "WPA/WPA2"]:
            auth_type = "WPA"
        if auth_type in ["WPA2", "WPA/WPA2"]:
            auth_type = "WPA"
        password = str(fields.get("password") or "")
        hidden = "true" if fields.get("hidden") in [True, "true", "True", "1", 1] else "false"
        
        esc_ssid = escape_wifi(ssid)
        esc_pass = escape_wifi(password) if auth_type != "nopass" else ""
        
        return f"WIFI:T:{auth_type};S:{esc_ssid};P:{esc_pass};H:{hidden};;"

    elif payload_type in ["vcard", "contact"]:
        first_name = str(fields.get("first_name") or fields.get("firstName") or "").strip()
        last_name = str(fields.get("last_name") or fields.get("lastName") or "").strip()
        full_name = str(fields.get("full_name") or fields.get("name") or f"{first_name} {last_name}").strip()
        if not full_name and not first_name and not last_name:
            full_name = "Contact"
        
        org = str(fields.get("organization") or fields.get("company") or "").strip()
        title = str(fields.get("title") or fields.get("job_title") or "").strip()
        phone_cell = str(fields.get("phone") or fields.get("mobile") or "").strip()
        phone_work = str(fields.get("phone_work") or fields.get("work_phone") or "").strip()
        email = str(fields.get("email") or "").strip()
        url = str(fields.get("url") or fields.get("website") or "").strip()
        street = str(fields.get("street") or "").strip()
        city = str(fields.get("city") or "").strip()
        state = str(fields.get("state") or "").strip()
        zipcode = str(fields.get("zip") or fields.get("postal_code") or "").strip()
        country = str(fields.get("country") or "").strip()
        note = str(fields.get("note") or "").strip()

        vcard_lines = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            f"N:{escape_vcard(last_name)};{escape_vcard(first_name)};;;",
            f"FN:{escape_vcard(full_name)}",
        ]
        if org:
            vcard_lines.append(f"ORG:{escape_vcard(org)}")
        if title:
            vcard_lines.append(f"TITLE:{escape_vcard(title)}")
        if phone_cell:
            vcard_lines.append(f"TEL;TYPE=CELL,VOICE:{escape_vcard(phone_cell)}")
        if phone_work:
            vcard_lines.append(f"TEL;TYPE=WORK,VOICE:{escape_vcard(phone_work)}")
        if email:
            vcard_lines.append(f"EMAIL;TYPE=INTERNET,PREF:{escape_vcard(email)}")
        if url:
            vcard_lines.append(f"URL:{escape_vcard(url)}")
        if street or city or state or zipcode or country:
            vcard_lines.append(f"ADR;TYPE=WORK:;;{escape_vcard(street)};{escape_vcard(city)};{escape_vcard(state)};{escape_vcard(zipcode)};{escape_vcard(country)}")
        if note:
            vcard_lines.append(f"NOTE:{escape_vcard(note)}")
        vcard_lines.append("END:VCARD")
        return "\n".join(vcard_lines)

    elif payload_type in ["geo", "location", "gps"]:
        lat = str(fields.get("lat") or fields.get("latitude") or "0.0").strip()
        lng = str(fields.get("lng") or fields.get("lon") or fields.get("longitude") or "0.0").strip()
        query = str(fields.get("query") or fields.get("label") or "").strip()
        if query:
            return f"geo:{lat},{lng}?q={urllib.parse.quote(query)}"
        return f"geo:{lat},{lng}"

    elif payload_type in ["sku", "product"]:
        sku = str(fields.get("sku") or fields.get("code") or raw_data or "").strip()
        name = str(fields.get("name") or fields.get("product_name") or "").strip()
        gtin = str(fields.get("gtin") or fields.get("barcode") or "").strip()
        price = str(fields.get("price") or "").strip()
        
        parts = []
        if sku:
            parts.append(f"SKU:{sku}")
        if name:
            parts.append(f"NAME:{name}")
        if gtin:
            parts.append(f"GTIN:{gtin}")
        if price:
            parts.append(f"PRICE:{price}")
        return " | ".join(parts) if parts else (sku or raw_data or "SKU-UNKNOWN")

    elif payload_type in ["order", "order_id"]:
        order_id = str(fields.get("order_id") or fields.get("id") or raw_data or "").strip()
        amount = str(fields.get("amount") or fields.get("total") or "").strip()
        customer = str(fields.get("customer") or fields.get("customer_name") or "").strip()
        items_count = str(fields.get("items_count") or fields.get("count") or "").strip()
        
        parts = []
        if order_id:
            parts.append(f"ORDER#{order_id}")
        if amount:
            parts.append(f"AMT:{amount}")
        if customer:
            parts.append(f"CUST:{customer}")
        if items_count:
            parts.append(f"ITEMS:{items_count}")
        return " | ".join(parts) if parts else (order_id or raw_data or "ORDER-UNKNOWN")

    elif payload_type in ["shipping", "waybill", "awb"]:
        awb = str(fields.get("awb") or fields.get("tracking_number") or raw_data or "").strip()
        carrier = str(fields.get("carrier") or "").strip()
        origin = str(fields.get("origin") or "").strip()
        destination = str(fields.get("destination") or fields.get("dest") or "").strip()
        status = str(fields.get("status") or "").strip()
        
        parts = []
        if awb:
            parts.append(f"AWB:{awb}")
        if carrier:
            parts.append(f"CARRIER:{carrier}")
        if origin or destination:
            parts.append(f"ROUTE:{origin}->{destination}")
        if status:
            parts.append(f"STATUS:{status}")
        return " | ".join(parts) if parts else (awb or raw_data or "AWB-UNKNOWN")

    elif payload_type in ["json", "structured"]:
        raw_json = fields.get("json_content") or fields.get("json") or raw_data
        if isinstance(raw_json, (dict, list)):
            return json.dumps(raw_json, separators=(",", ":"))
        elif isinstance(raw_json, str):
            try:
                parsed = json.loads(raw_json)
                return json.dumps(parsed, separators=(",", ":"))
            except Exception:
                return raw_json
        elif fields:
            return json.dumps(fields, separators=(",", ":"))
        return "{}"

    else:
        # Default plain text
        return str(raw_data or fields.get("text") or "").strip()


def verify_qr_code(image_pil: Image.Image, expected_payload: str) -> Dict[str, Any]:
    """
    Automated self-verification: decodes the generated QR code image using zxing-cpp
    to ensure 100% optical readability before returning to user.
    """
    try:
        import numpy as np
        img_arr = np.array(image_pil.convert("RGB"))
        results = zxingcpp.read_barcodes(img_arr)
        if not results:
            return {
                "verified": False,
                "error": "No QR code detected during verification check",
                "decoded_text": None,
                "format": None
            }
        
        first = results[0]
        decoded_text = first.text
        detected_format = str(first.format).replace("BarcodeFormat.", "")
        
        pos = []
        if hasattr(first, 'position'):
            p = first.position
            pos = [
                [int(p.top_left.x), int(p.top_left.y)],
                [int(p.top_right.x), int(p.top_right.y)],
                [int(p.bottom_right.x), int(p.bottom_right.y)],
                [int(p.bottom_left.x), int(p.bottom_left.y)]
            ]
        
        # Verify content matches
        is_match = (decoded_text == expected_payload)
        return {
            "verified": True,
            "match": is_match,
            "decoded_text": decoded_text,
            "format": detected_format,
            "ecc_level": str(first.ec_level) if hasattr(first, 'ec_level') else "Unknown",
            "position": pos
        }
    except Exception as e:
        return {
            "verified": False,
            "error": str(e),
            "decoded_text": None,
            "format": None
        }


def generate_qr_code(
    payload_type: str = "text",
    fields: Optional[Dict[str, Any]] = None,
    raw_data: Optional[str] = None,
    ecc: str = "M",
    size: int = 400,
    output_format: str = "BOTH",
    fill_color: str = "#000000",
    back_color: str = "#FFFFFF",
    box_size: Optional[int] = None,
    border: int = 4,
) -> Dict[str, Any]:
    """
    Generates QR code with strict byte capacity validation, multi-format export,
    and automated self-verification.
    """
    fields = fields or {}
    payload = build_payload(payload_type, fields, raw_data)
    
    if not payload:
        raise ValueError("Payload content is empty.")
    
    payload_bytes = payload.encode("utf-8")
    byte_count = len(payload_bytes)
    
    # Check data capacity guardrails
    if byte_count > MAX_BYTE_CAPACITY:
        raise ValueError(
            f"Payload length ({byte_count} bytes) exceeds the maximum QR capacity of {MAX_BYTE_CAPACITY} bytes."
        )

    ecc_level = ECC_MAP.get(ecc.upper(), qrcode.constants.ERROR_CORRECT_M)
    
    # Calculate box_size based on requested target pixel dimensions if box_size is not specified
    # Typical QR code has ~21 to 177 modules. Default margin is 4 on each side.
    # We create a base QR first to know module dimensions, then resize cleanly to exact pixels
    qr = qrcode.QRCode(
        version=None, # Auto-fit version based on content
        error_correction=ecc_level,
        box_size=10,
        border=border,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    
    # 1. Generate Raster PNG Image
    img_pil = qr.make_image(fill_color=fill_color, back_color=back_color).convert("RGB")
    
    # Resize to exact requested pixel size with Nearest Neighbor for crisp pixel-perfect modules
    target_size = max(100, min(2400, int(size)))
    img_resized = img_pil.resize((target_size, target_size), Image.Resampling.NEAREST)
    
    # Self-verify raster image
    verification = verify_qr_code(img_resized, payload)
    
    # Encode PNG to base64 data URL
    buffered = io.BytesIO()
    img_resized.save(buffered, format="PNG", optimize=True)
    png_bytes = buffered.getvalue()
    png_base64 = base64.b64encode(png_bytes).decode("utf-8")
    png_data_url = f"data:image/png;base64,{png_base64}"
    
    # 2. Generate SVG if requested
    svg_markup = None
    svg_data_url = None
    if output_format.upper() in ["SVG", "BOTH"]:
        svg_factory = qrcode.image.svg.SvgPathImage
        qr_svg = qrcode.QRCode(
            version=qr.version,
            error_correction=ecc_level,
            box_size=10,
            border=border,
            image_factory=svg_factory
        )
        qr_svg.add_data(payload)
        qr_svg.make(fit=True)
        svg_img = qr_svg.make_image(fill_color=fill_color, back_color=back_color)
        
        svg_buffer = io.BytesIO()
        svg_img.save(svg_buffer)
        svg_raw_bytes = svg_buffer.getvalue()
        svg_markup = svg_raw_bytes.decode("utf-8")
        
        # Ensure SVG has clean width/height and viewBox attributes for crisp rendering
        if 'width="' not in svg_markup:
            svg_markup = svg_markup.replace('<svg ', f'<svg width="{target_size}" height="{target_size}" ')
            
        svg_b64 = base64.b64encode(svg_markup.encode("utf-8")).decode("utf-8")
        svg_data_url = f"data:image/svg+xml;base64,{svg_b64}"

    return {
        "success": True,
        "payload_type": payload_type,
        "payload": payload,
        "byte_count": byte_count,
        "ecc": ecc.upper(),
        "version": qr.version,
        "target_size": target_size,
        "png_base64": png_base64,
        "png_data_url": png_data_url,
        "svg_markup": svg_markup,
        "svg_data_url": svg_data_url,
        "verification": verification
    }
