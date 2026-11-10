import os
import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cv2
import numpy as np

def create_qr_poster():
    target_url = "https://poomani-oils.onrender.com/"
    width, height = 1600, 1600

    # 1. Base Canvas - Elegant ivory cream background with warm luxury tone
    # Subtle gradient or warm solid cream
    poster = Image.new("RGBA", (width, height), (252, 250, 245, 255))
    draw = ImageDraw.Draw(poster)

    # 2. Outer Ornamental Borders
    # Deep Forest Green outer border
    forest_green = (9, 51, 29, 255)       # #09331d
    gold_main = (212, 175, 55, 255)       # #d4af37
    gold_light = (230, 203, 137, 255)     # #e6cb89
    gold_dark = (161, 98, 7, 255)         # #a16207
    cream_white = (255, 255, 255, 255)

    # Outer deep green border
    draw.rounded_rectangle([36, 36, width - 36, height - 36], radius=20, outline=forest_green, width=4)
    # Inner gold border
    draw.rounded_rectangle([48, 48, width - 48, height - 48], radius=16, outline=gold_main, width=2)
    # Subtle secondary thin gold line
    draw.rounded_rectangle([56, 56, width - 56, height - 56], radius=12, outline=(212, 175, 55, 90), width=1)

    # Corner decorative diamond flourishes
    corners = [(48, 48), (width - 48, 48), (48, height - 48), (width - 48, height - 48)]
    for cx, cy in corners:
        d_size = 10
        diamond = [(cx, cy - d_size), (cx + d_size, cy), (cx, cy + d_size), (cx - d_size, cy)]
        draw.polygon(diamond, fill=gold_main)

    # Load system fonts
    try:
        font_serif_lg = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 54)
        font_serif_md = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 32)
        font_serif_sm = ImageFont.truetype("C:/Windows/Fonts/georgia.ttf", 22)
        font_tamil = ImageFont.truetype("C:/Windows/Fonts/lathab.ttf", 32)
        font_sans_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 28)
        font_sans_sub = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
        font_top_tag = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 20)
    except Exception as e:
        print(f"Font loading fallback: {e}")
        font_serif_lg = font_serif_md = font_serif_sm = font_tamil = font_sans_bold = font_sans_sub = font_top_tag = ImageFont.load_default()

    # 3. Top Header Crown Section
    # Decorative top arc / banner
    top_y = 95
    top_text = "TRADITIONAL COLD-PRESSED EDIBLE OILS"
    bbox_top = draw.textbbox((0, 0), top_text, font=font_top_tag)
    w_top = bbox_top[2] - bbox_top[0]
    draw.text(((width - w_top) // 2, top_y), top_text, fill=gold_dark, font=font_top_tag)

    # Decorative top gold filigree line with diamond
    div_y = top_y + 36
    draw.line([(width // 2 - 240, div_y), (width // 2 - 25, div_y)], fill=gold_main, width=2)
    draw.line([(width // 2 + 25, div_y), (width // 2 + 240, div_y)], fill=gold_main, width=2)
    # Center diamond
    cd = [(width // 2, div_y - 6), (width // 2 + 6, div_y), (width // 2, div_y + 6), (width // 2 - 6, div_y)]
    draw.polygon(cd, fill=gold_main)

    tag_sub = "100% PURE & UNREFINED  •  ESTD. CHERANMAHADEVI BLOCK"
    bbox_sub = draw.textbbox((0, 0), tag_sub, font=font_sans_sub)
    w_sub = bbox_sub[2] - bbox_sub[0]
    draw.text(((width - w_sub) // 2, div_y + 16), tag_sub, fill=(18, 78, 44, 255), font=font_sans_sub)

    # 4. Generate High-Quality Scannable QR Code
    # Use Error Correction H (30% redundancy)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=18,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    # Deep Forest Green QR code on clean white
    qr_img = qr.make_image(fill_color="#09331d", back_color="white").convert("RGBA")

    # Resize QR code to exact target card dimensions (e.g. 760 x 760 px)
    target_qr_size = 760
    qr_img = qr_img.resize((target_qr_size, target_qr_size), Image.Resampling.LANCZOS)
    qr_w, qr_h = qr_img.size

    # Embed Center Logo
    # Center cutout diameter: 180 px (~23.6% of 760 px) -> ensures 100% scannability
    logo_size = 180
    logo_path = "public/images/logo-p.png"
    logo_p = Image.open(logo_path).convert("RGBA")
    # Resize inner P logo to 140x140
    inner_logo_size = 138
    logo_p = logo_p.resize((inner_logo_size, inner_logo_size), Image.Resampling.LANCZOS)

    # Circular white medallion layer with gold border
    circle_medallion = Image.new("RGBA", (logo_size, logo_size), (255, 255, 255, 0))
    c_draw = ImageDraw.Draw(circle_medallion)
    # Outer gold ring
    c_draw.ellipse([2, 2, logo_size - 3, logo_size - 3], fill=(255, 255, 255, 255), outline=gold_main, width=4)
    # Subtle inner gold hairline
    c_draw.ellipse([6, 6, logo_size - 7, logo_size - 7], outline=(212, 175, 55, 120), width=1)

    # Paste P logo in center of medallion
    p_offset = ((logo_size - inner_logo_size) // 2, (logo_size - inner_logo_size) // 2)
    circle_medallion.paste(logo_p, p_offset, logo_p)

    # Paste medallion onto center of QR image
    qr_center_offset = ((qr_w - logo_size) // 2, (qr_h - logo_size) // 2)
    qr_img.paste(circle_medallion, qr_center_offset, circle_medallion)

    # 5. QR Code Card Container with Drop Shadow
    card_w = 860
    card_h = 860
    card_x = (width - card_w) // 2
    card_y = 210

    # Draw soft drop shadow for the card
    shadow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    for offset, alpha in zip(range(16, 0, -2), range(4, 25, 3)):
        s_draw.rounded_rectangle(
            [card_x - 4 + offset//2, card_y + 4 + offset, card_x + card_w + 4 - offset//2, card_y + card_h + 8 + offset],
            radius=26,
            fill=(0, 0, 0, alpha)
        )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(10))
    poster.paste(shadow_layer, (0, 0), shadow_layer)

    # Card background (Pure white) with luxurious gold double frame
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=24, fill=(255, 255, 255, 255))
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=24, outline=gold_main, width=3)
    draw.rounded_rectangle([card_x + 8, card_y + 8, card_x + card_w - 8, card_y + card_h - 8], radius=18, outline=(212, 175, 55, 80), width=1)

    # Corner bracket accents on QR card
    bracket_len = 24
    bx1, by1 = card_x + 14, card_y + 14
    bx2, by2 = card_x + card_w - 14, card_y + card_h - 14
    # Top-left bracket
    draw.line([(bx1, by1), (bx1 + bracket_len, by1)], fill=gold_main, width=2)
    draw.line([(bx1, by1), (bx1, by1 + bracket_len)], fill=gold_main, width=2)
    # Top-right bracket
    draw.line([(bx2, by1), (bx2 - bracket_len, by1)], fill=gold_main, width=2)
    draw.line([(bx2, by1), (bx2, by1 + bracket_len)], fill=gold_main, width=2)
    # Bottom-left bracket
    draw.line([(bx1, by2), (bx1 + bracket_len, by2)], fill=gold_main, width=2)
    draw.line([(bx1, by2), (bx1, by2 - bracket_len)], fill=gold_main, width=2)
    # Bottom-right bracket
    draw.line([(bx2, by2), (bx2 - bracket_len, by2)], fill=gold_main, width=2)
    draw.line([(bx2, by2), (bx2, by2 - bracket_len)], fill=gold_main, width=2)

    # Paste QR code in center of card
    qr_card_x = card_x + (card_w - qr_w) // 2
    qr_card_y = card_y + (card_h - qr_h) // 2
    poster.paste(qr_img, (qr_card_x, qr_card_y), qr_img)

    # 6. Text Below QR Code Section
    # Line 1: POOMANI CHEKKU ENNAI
    y_brand = card_y + card_h + 36
    brand_text = "POOMANI CHEKKU ENNAI"
    bbox_brand = draw.textbbox((0, 0), brand_text, font=font_serif_lg)
    w_brand = bbox_brand[2] - bbox_brand[0]
    draw.text(((width - w_brand) // 2, y_brand), brand_text, fill=forest_green, font=font_serif_lg)

    # Tamil brand subtitle
    y_tamil = y_brand + 64
    tamil_text = "பூமணி செக்கு எண்ணெய்"
    bbox_tamil = draw.textbbox((0, 0), tamil_text, font=font_tamil)
    w_tamil = bbox_tamil[2] - bbox_tamil[0]
    draw.text(((width - w_tamil) // 2, y_tamil), tamil_text, fill=gold_dark, font=font_tamil)

    # Elegant divider with diamond
    y_sep = y_tamil + 48
    draw.line([(width // 2 - 280, y_sep), (width // 2 - 28, y_sep)], fill=gold_main, width=2)
    draw.line([(width // 2 + 28, y_sep), (width // 2 + 280, y_sep)], fill=gold_main, width=2)
    cd_b = [(width // 2, y_sep - 7), (width // 2 + 7, y_sep), (width // 2, y_sep + 7), (width // 2 - 7, y_sep)]
    draw.polygon(cd_b, fill=gold_main)

    # Line 2: "Scan Here to Visit Our Website"
    # Styled inside a royal forest green pill badge with gold border
    y_badge = y_sep + 26
    pill_w = 640
    pill_h = 62
    pill_x = (width - pill_w) // 2
    pill_y = y_badge
    # Pill background
    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=31, fill=forest_green)
    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=31, outline=gold_main, width=2)

    scan_text = "Scan Here to Visit Our Website"
    bbox_scan = draw.textbbox((0, 0), scan_text, font=font_sans_bold)
    w_scan = bbox_scan[2] - bbox_scan[0]
    h_scan = bbox_scan[3] - bbox_scan[1]
    # Draw centered text with subtle gold star/camera icons
    text_x = (width - w_scan) // 2
    text_y = pill_y + (pill_h - h_scan) // 2 - 2
    draw.text((text_x, text_y), scan_text, fill=cream_white, font=font_sans_bold)

    # Side decorative icons inside badge
    # Left small gold diamond
    draw.polygon([(pill_x + 36, pill_y + pill_h // 2 - 5), (pill_x + 41, pill_y + pill_h // 2), (pill_x + 36, pill_y + pill_h // 2 + 5), (pill_x + 31, pill_y + pill_h // 2)], fill=gold_main)
    # Right small gold diamond
    draw.polygon([(pill_x + pill_w - 36, pill_y + pill_h // 2 - 5), (pill_x + pill_w - 31, pill_y + pill_h // 2), (pill_x + pill_w - 36, pill_y + pill_h // 2 + 5), (pill_x + pill_w - 41, pill_y + pill_h // 2)], fill=gold_main)

    # Line 3: Pure. Natural. Traditional.
    y_tagline = pill_y + pill_h + 30
    tagline_text = "Pure  •  Natural  •  Traditional"
    bbox_tagline = draw.textbbox((0, 0), tagline_text, font=font_serif_md)
    w_tagline = bbox_tagline[2] - bbox_tagline[0]
    draw.text(((width - w_tagline) // 2, y_tagline), tagline_text, fill=(18, 78, 44, 255), font=font_serif_md)

    # URL Subtext
    y_url = y_tagline + 46
    url_text = "https://poomani-oils.onrender.com/"
    bbox_url = draw.textbbox((0, 0), url_text, font=font_sans_sub)
    w_url = bbox_url[2] - bbox_url[0]
    draw.text(((width - w_url) // 2, y_url), url_text, fill=gold_dark, font=font_sans_sub)

    # 7. Convert to RGB for saving clean PNG
    final_poster = poster.convert("RGB")

    # Save to public/images and artifact directory
    out_path = "public/images/poomani_qr_poster.png"
    final_poster.save(out_path, format="PNG", quality=100)
    print(f"Saved poster to {out_path} ({final_poster.size[0]}x{final_poster.size[1]})")

    # 8. Test the QR code using OpenCV QR detector to verify 100% scannability
    cv2_img = np.array(final_poster)
    detector = cv2.QRCodeDetector()
    decoded_value, points, _ = detector.detectAndDecode(cv2_img)
    print(f"OpenCV Decoded Result: '{decoded_value}'")

    if decoded_value == target_url:
        print("SUCCESS: QR Code scans perfectly and matches target URL exactly!")
    else:
        print("WARNING: Direct whole-poster decode test returned:", decoded_value)
        # Also test cropped QR region
        crop_region = cv2_img[card_y:card_y+card_h, card_x:card_x+card_w]
        crop_decoded, _, _ = detector.detectAndDecode(crop_region)
        print(f"Cropped QR Region Decoded Result: '{crop_decoded}'")
        assert crop_decoded == target_url, f"Expected {target_url}, got {crop_decoded}"

if __name__ == "__main__":
    create_qr_poster()

