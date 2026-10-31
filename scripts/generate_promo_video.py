import os
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

WIDTH = 1280
HEIGHT = 720
FPS = 25
DURATION_SEC = 18
TOTAL_FRAMES = FPS * DURATION_SEC  # 450 frames

# Fonts
FONT_TITLE_EN = ImageFont.truetype("C:/Windows/Fonts/timesbd.ttf", 46)
FONT_SUBTITLE_EN = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 26)
FONT_TAMIL_LG = ImageFont.truetype("C:/Windows/Fonts/Nirmala.ttc", 40)
FONT_TAMIL_MD = ImageFont.truetype("C:/Windows/Fonts/Nirmala.ttc", 28)
FONT_TAMIL_SM = ImageFont.truetype("C:/Windows/Fonts/Nirmala.ttc", 22)
FONT_BODY = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
FONT_BODY_BOLD = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 24)
FONT_BADGE = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 20)
FONT_PRICE = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34)

# Assets
LOGO_PATH = "public/images/logo.png"
THREE_OILS_PATH = "public/images/poomani_three_oils.jpg"
COCONUT_BOTTLE_PATH = "public/images/coconut_oil.jpg"
SESAME_BOTTLE_PATH = "public/images/sesame_oil.jpg"
GROUNDNUT_BOTTLE_PATH = "public/images/groundnut_oil.jpg"
COCONUT_ING_PATH = "public/images/cat_ingredient_coconut.jpg"
SESAME_ING_PATH = "public/images/cat_ingredient_sesame.jpg"
GROUNDNUT_ING_PATH = "public/images/cat_ingredient_groundnut.jpg"

logo_img = Image.open(LOGO_PATH).convert("RGBA")
three_oils_img = Image.open(THREE_OILS_PATH).convert("RGBA")
coconut_bottle = Image.open(COCONUT_BOTTLE_PATH).convert("RGBA")
sesame_bottle = Image.open(SESAME_BOTTLE_PATH).convert("RGBA")
groundnut_bottle = Image.open(GROUNDNUT_BOTTLE_PATH).convert("RGBA")
coconut_ing = Image.open(COCONUT_ING_PATH).convert("RGBA")
sesame_ing = Image.open(SESAME_ING_PATH).convert("RGBA")
groundnut_ing = Image.open(GROUNDNUT_ING_PATH).convert("RGBA")

# Color palette
C_BG_DARK = (7, 34, 18)
C_BG_MID = (12, 54, 28)
C_GOLD = (222, 184, 105)
C_GOLD_BRIGHT = (255, 215, 0)
C_GOLD_DEEP = (180, 130, 40)
C_CREAM = (248, 243, 230)
C_WHITE = (255, 255, 255)
C_GREEN_ACCENT = (26, 109, 47)

def create_base_canvas(frame_idx):
    """Creates rich traditional Tamil gradient background with animated particles & flowing wave"""
    # Create gradient background
    im = Image.new("RGBA", (WIDTH, HEIGHT), C_BG_DARK)
    draw = ImageDraw.Draw(im)

    # Concentric soft glow in center
    cx, cy = WIDTH // 2, HEIGHT // 2
    for r in range(450, 0, -40):
        alpha = int(35 * (1.0 - r / 450.0))
        glow_color = (18, 75, 38, alpha)
        draw.ellipse([cx - r, cy - int(r * 0.7), cx + r, cy + int(r * 0.7)], fill=glow_color)

    # Ornamental border
    draw.rectangle([18, 18, WIDTH - 19, HEIGHT - 19], outline=(222, 184, 105, 120), width=2)
    draw.rectangle([24, 24, WIDTH - 25, HEIGHT - 25], outline=(255, 215, 0, 70), width=1)

    # Floating golden oil droplets / sparkles
    np.random.seed(42)  # Stable positions
    for i in range(25):
        base_x = (i * 53 + 40) % (WIDTH - 80) + 40
        speed = 1.2 + (i % 5) * 0.4
        y_pos = int(HEIGHT - 40 - ((frame_idx * speed * 2.5 + i * 47) % (HEIGHT - 80)))
        radius = 2 + (i % 4)
        glow_alpha = int(140 + 80 * math.sin(frame_idx * 0.15 + i))
        draw.ellipse([base_x - radius, y_pos - radius, base_x + radius, y_pos + radius],
                     fill=(255, 225, 120, max(20, min(240, glow_alpha))))

    # Flowing wave of golden oil along bottom
    wave_pts = []
    for x in range(0, WIDTH + 20, 20):
        y = HEIGHT - 36 + math.sin((x * 0.008) + (frame_idx * 0.08)) * 8
        wave_pts.append((x, y))
    wave_pts.append((WIDTH, HEIGHT))
    wave_pts.append((0, HEIGHT))
    draw.polygon(wave_pts, fill=(212, 165, 32, 130))

    wave_pts_top = []
    for x in range(0, WIDTH + 20, 20):
        y = HEIGHT - 32 + math.cos((x * 0.01) + (frame_idx * 0.1)) * 6
        wave_pts_top.append((x, y))
    wave_pts_top.append((WIDTH, HEIGHT))
    wave_pts_top.append((0, HEIGHT))
    draw.polygon(wave_pts_top, fill=(18, 80, 40, 210))

    return im

def draw_pill(draw, box, fill, outline, width=1, radius=12):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def render_scene_1(frame_in_scene):
    """0.0s - 3.0s (Frames 0-74): Logo & Golden Intro"""
    t = frame_in_scene / 75.0  # 0 to 1
    canvas = create_base_canvas(frame_in_scene)
    draw = ImageDraw.Draw(canvas)

    # Alpha fade-in
    alpha = min(1.0, t * 2.5)

    # Logo animation: gentle zoom and pulse
    scale = 0.88 + 0.12 * math.sin(min(1.0, t * 1.5) * (math.pi / 2))
    logo_w = int(240 * scale)
    logo_h = int(240 * scale)
    resized_logo = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)

    # Golden pulsing aura behind logo
    pulse = 1.0 + 0.1 * math.sin(frame_in_scene * 0.18)
    aura_r = int(140 * pulse)
    lx, ly = WIDTH // 2, 230
    draw.ellipse([lx - aura_r, ly - aura_r, lx + aura_r, ly + aura_r],
                 fill=(222, 184, 105, int(45 * alpha)), outline=(255, 215, 0, int(160 * alpha)), width=3)

    canvas.paste(resized_logo, (lx - logo_w // 2, ly - logo_h // 2), resized_logo)

    # Brand Title in English
    t_en = "POOMANI CHEKKU ENNAI"
    bbox_en = draw.textbbox((0, 0), t_en, font=FONT_TITLE_EN)
    tw_en = bbox_en[2] - bbox_en[0]
    draw.text(((WIDTH - tw_en) // 2, 385), t_en, font=FONT_TITLE_EN, fill=C_GOLD_BRIGHT)

    # Brand Title in Tamil
    t_ta = "பூமணி செக்கு எண்ணெய்"
    bbox_ta = draw.textbbox((0, 0), t_ta, font=FONT_TAMIL_LG)
    tw_ta = bbox_ta[2] - bbox_ta[0]
    draw.text(((WIDTH - tw_ta) // 2, 450), t_ta, font=FONT_TAMIL_LG, fill=C_CREAM)

    # Tagline Pill
    tag = "100% TRADITIONAL COLD-PRESSED PURE EDIBLE OILS"
    bbox_tag = draw.textbbox((0, 0), tag, font=FONT_BADGE)
    tw_tag = bbox_tag[2] - bbox_tag[0]
    pill_box = [(WIDTH - tw_tag) // 2 - 20, 525, (WIDTH + tw_tag) // 2 + 20, 565]
    draw_pill(draw, pill_box, fill=(13, 56, 30, 230), outline=C_GOLD, width=1, radius=20)
    draw.text(((WIDTH - tw_tag) // 2, 532), tag, font=FONT_BADGE, fill=C_GOLD_BRIGHT)

    # FSSAI Badge
    fssai = "FSSAI License #12421008000421 • Pure Quality • Unrefined & Healthy"
    bbox_f = draw.textbbox((0, 0), fssai, font=FONT_BODY)
    tw_f = bbox_f[2] - bbox_f[0]
    draw.text(((WIDTH - tw_f) // 2, 595), fssai, font=FONT_BODY, fill=(200, 225, 210, int(230 * alpha)))

    return canvas

def render_scene_2(frame_in_scene):
    """3.0s - 6.0s (Frames 75-149): Three Traditional Oils Overview"""
    canvas = create_base_canvas(frame_in_scene + 75)
    draw = ImageDraw.Draw(canvas)

    # Heading
    h1 = "OUR THREE PURE TRADITIONAL OILS"
    bbox_h1 = draw.textbbox((0, 0), h1, font=FONT_TITLE_EN)
    draw.text(((WIDTH - (bbox_h1[2] - bbox_h1[0])) // 2, 42), h1, font=FONT_TITLE_EN, fill=C_GOLD_BRIGHT)

    h2 = "மூன்று பாரம்பரிய செக்கு சமையல் எண்ணெய்கள்"
    bbox_h2 = draw.textbbox((0, 0), h2, font=FONT_TAMIL_MD)
    draw.text(((WIDTH - (bbox_h2[2] - bbox_h2[0])) // 2, 100), h2, font=FONT_TAMIL_MD, fill=C_CREAM)

    # Display 3 oils composite image in center with gold frame
    # Three oils image is 1024x682 -> scale to fit
    target_w, target_h = 580, 386
    three_resized = three_oils_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Floating animated offset
    y_float = int(math.sin(frame_in_scene * 0.1) * 6)
    img_x = (WIDTH - target_w) // 2
    img_y = 155 + y_float

    # Gold framed box behind
    draw.rectangle([img_x - 6, img_y - 6, img_x + target_w + 5, img_y + target_h + 5],
                   outline=C_GOLD, width=3)
    canvas.paste(three_resized, (img_x, img_y))

    # 3 Badges below
    badges = [
        ("🥥 Coconut Oil / தேங்காய் எண்ணெய்", 80),
        ("🌿 Sesame Oil / நல்லெண்ணெய்", 500),
        ("🥜 Groundnut Oil / கடலை எண்ணெய்", 880)
    ]
    for text, bx in badges:
        bbox_b = draw.textbbox((0, 0), text, font=FONT_BADGE)
        bw = bbox_b[2] - bbox_b[0]
        draw_pill(draw, [bx, 570, bx + bw + 24, 608], fill=(13, 56, 30, 230), outline=C_GOLD, width=1, radius=18)
        draw.text((bx + 12, 578), text, font=FONT_BADGE, fill=C_GOLD_BRIGHT)

    # Bottom Tagline
    tag = "100% Cold-Pressed (Chekku) • Zero Adulteration • Natural Rich Aroma"
    bbox_t = draw.textbbox((0, 0), tag, font=FONT_BODY_BOLD)
    draw.text(((WIDTH - (bbox_t[2] - bbox_t[0])) // 2, 630), tag, font=FONT_BODY_BOLD, fill=C_CREAM)

    return canvas

def render_single_bottle_scene(frame_in_scene, global_frame, bottle_img, ing_img,
                               title_en, title_ta, sizes, ing_desc, highlights, bg_accent_name):
    """Reusable renderer for single bottle scenes (Coconut, Sesame, Groundnut)"""
    canvas = create_base_canvas(global_frame)
    draw = ImageDraw.Draw(canvas)

    # Left: Bottle Showcase with glowing background & floating motion
    y_float = int(math.sin(frame_in_scene * 0.12) * 8)
    bottle_w, bottle_h = 245, 450
    resized_bottle = bottle_img.resize((bottle_w, bottle_h), Image.Resampling.LANCZOS)

    bx = 130
    by = 135 + y_float

    # Aura glow behind bottle
    draw.ellipse([bx - 30, by + 40, bx + bottle_w + 30, by + bottle_h + 30],
                 fill=(222, 184, 105, 45), outline=C_GOLD, width=2)
    canvas.paste(resized_bottle, (bx, by))

    # Bottle Photo Frame Border
    draw.rounded_rectangle([bx - 10, by - 10, bx + bottle_w + 10, by + bottle_h + 10],
                           radius=12, outline=C_GOLD, width=2)

    # Right: Product Details Card
    card_x, card_y, card_w, card_h = 430, 95, 780, 520
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                           radius=18, fill=(10, 45, 23, 230), outline=C_GOLD, width=2)

    # Category Pill
    draw_pill(draw, [card_x + 35, card_y + 25, card_x + 300, card_y + 60],
              fill=(18, 78, 44, 255), outline=C_GOLD, width=1, radius=16)
    draw.text((card_x + 50, card_y + 32), "100% PURE EDIBLE OIL", font=FONT_BADGE, fill=C_GOLD_BRIGHT)

    # Product Title (English)
    draw.text((card_x + 35, card_y + 75), title_en, font=FONT_TITLE_EN, fill=C_GOLD_BRIGHT)

    # Product Title (Tamil)
    draw.text((card_x + 35, card_y + 135), title_ta, font=FONT_TAMIL_LG, fill=C_CREAM)

    # Separator Line
    draw.line([card_x + 35, card_y + 195, card_x + card_w - 35, card_y + 195], fill=C_GOLD, width=1)

    # Available Bottle Sizes Section
    draw.text((card_x + 35, card_y + 215), "AVAILABLE BOTTLE SIZES / அளவுகள்:", font=FONT_BADGE, fill=C_GOLD)
    sx = card_x + 35
    for sz in sizes:
        bbox_sz = draw.textbbox((0, 0), sz, font=FONT_BODY_BOLD)
        sw = bbox_sz[2] - bbox_sz[0]
        # Size pill
        draw_pill(draw, [sx, card_y + 245, sx + sw + 30, card_y + 290],
                  fill=(13, 59, 31, 255), outline=C_GOLD_BRIGHT, width=2, radius=12)
        draw.text((sx + 15, card_y + 254), sz, font=FONT_BODY_BOLD, fill=C_WHITE)
        sx += sw + 45

    # Ingredient Feature Badge
    ing_box_y = card_y + 315
    draw.rounded_rectangle([card_x + 35, ing_box_y, card_x + card_w - 35, ing_box_y + 115],
                           radius=12, fill=(7, 34, 18, 220), outline=(222, 184, 105, 120), width=1)

    # Paste ingredient thumbnail
    ing_thumb = ing_img.resize((150, 95), Image.Resampling.LANCZOS)
    canvas.paste(ing_thumb, (card_x + 45, ing_box_y + 10))
    draw.rectangle([card_x + 45, ing_box_y + 10, card_x + 195, ing_box_y + 105], outline=C_GOLD, width=1)

    # Ingredient description text
    draw.text((card_x + 210, ing_box_y + 16), ing_desc[0], font=FONT_BODY_BOLD, fill=C_GOLD_BRIGHT)
    draw.text((card_x + 210, ing_box_y + 46), ing_desc[1], font=FONT_BODY, fill=C_CREAM)
    draw.text((card_x + 210, ing_box_y + 74), ing_desc[2], font=FONT_TAMIL_SM, fill=C_GOLD)

    # Quality Highlights
    draw.text((card_x + 35, card_y + 450), highlights, font=FONT_BODY_BOLD, fill=(220, 240, 225))

    return canvas

def render_scene_3(frame_in_scene):
    """6.0s - 9.0s (Frames 150-224): Coconut Oil"""
    return render_single_bottle_scene(
        frame_in_scene, frame_in_scene + 150,
        coconut_bottle, coconut_ing,
        "COCONUT OIL", "தேங்காய் எண்ணெய்",
        ["200 ml", "500 ml", "1 Litre"],
        ("Fresh Sun-Dried Copra Kernels", "Pure traditional cold chekku extraction", "உடலுக்கு ஆரோக்கியம் தரும் சுத்தமான தேங்காய் எண்ணெய்"),
        "✓ 100% Pure & Unrefined  •  ✓ Natural Fragrance  •  ✓ Traditional Cooking",
        "coconut"
    )

def render_scene_4(frame_in_scene):
    """9.0s - 12.0s (Frames 225-299): Sesame Oil"""
    return render_single_bottle_scene(
        frame_in_scene, frame_in_scene + 225,
        sesame_bottle, sesame_ing,
        "SESAME OIL (GINGELLY)", "நல்லெண்ணெய்",
        ["200 ml", "500 ml", "1 Litre"],
        ("Finest Black Sesame Seeds & Palm Jaggery", "Cold pressed with authentic Chekku technique", "பாரம்பரிய சுவை மற்றும் உடலுக்கு குளிர்ச்சி தரும் நல்லெண்ணெய்"),
        "✓ Heart Healthy Nutrition  •  ✓ Authentic Mill Aroma  •  ✓ Rich Flavor",
        "sesame"
    )

def render_scene_5(frame_in_scene):
    """12.0s - 15.0s (Frames 300-374): Groundnut Oil"""
    return render_single_bottle_scene(
        frame_in_scene, frame_in_scene + 300,
        groundnut_bottle, groundnut_ing,
        "GROUNDNUT OIL (PEANUT)", "கடலை எண்ணெய்",
        ["500 ml", "1 Litre"],
        ("Top Quality Sun-Dried Groundnuts", "Pure wood-pressed extraction for rich flavor", "முழுமையான சத்துக்கள் நிறைந்த பாரம்பரிய கடலை எண்ணெய்"),
        "✓ High Smoke Point  •  ✓ Crisp & Golden Frying  •  ✓ 100% Unadulterated",
        "groundnut"
    )

def render_scene_6(frame_in_scene):
    """15.0s - 18.0s (Frames 375-449): Outro & WhatsApp Ordering"""
    canvas = create_base_canvas(frame_in_scene + 375)
    draw = ImageDraw.Draw(canvas)

    # Logo in center-top
    logo_w, logo_h = 170, 170
    resized_logo = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    canvas.paste(resized_logo, (WIDTH // 2 - logo_w // 2, 60), resized_logo)

    # Logo golden halo
    pulse = 1.0 + 0.08 * math.sin(frame_in_scene * 0.2)
    hr = int(95 * pulse)
    draw.ellipse([WIDTH // 2 - hr, 145 - hr, WIDTH // 2 + hr, 145 + hr], outline=C_GOLD, width=2)

    # Brand Title
    h1 = "POOMANI CHEKKU ENNAI"
    bbox_h1 = draw.textbbox((0, 0), h1, font=FONT_TITLE_EN)
    draw.text(((WIDTH - (bbox_h1[2] - bbox_h1[0])) // 2, 245), h1, font=FONT_TITLE_EN, fill=C_GOLD_BRIGHT)

    h2 = "பூமணி செக்கு எண்ணெய்"
    bbox_h2 = draw.textbbox((0, 0), h2, font=FONT_TAMIL_MD)
    draw.text(((WIDTH - (bbox_h2[2] - bbox_h2[0])) // 2, 305), h2, font=FONT_TAMIL_MD, fill=C_CREAM)

    # Prominent WhatsApp Call To Action Box
    wa_box = [320, 360, 960, 510]
    draw.rounded_rectangle(wa_box, radius=22, fill=(18, 90, 48, 255), outline=C_GOLD_BRIGHT, width=3)

    # WhatsApp icon simulation / symbol
    draw.text((360, 385), "💬", font=ImageFont.truetype("C:/Windows/Fonts/SegoeIcons.ttf", 46, encoding="unic"), fill=C_WHITE)
    draw.text((430, 382), "DIRECT WHATSAPP ORDERING", font=FONT_BADGE, fill=C_GOLD_BRIGHT)
    draw.text((430, 415), "+91 63857 55368", font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 44), fill=C_WHITE)
    draw.text((430, 468), "Instant Order • Official Tax Invoice • Shop Direct Delivery", font=FONT_BODY, fill=(210, 240, 220))

    # Traditional blessing & Shop Info
    bless = "நன்றி!  •  Thank You for Choosing Pure Health  •  FSSAI #12421008000421"
    bbox_bl = draw.textbbox((0, 0), bless, font=FONT_TAMIL_SM)
    draw.text(((WIDTH - (bbox_bl[2] - bbox_bl[0])) // 2, 545), bless, font=FONT_TAMIL_SM, fill=C_GOLD)

    # Mill Address
    addr = "Shop No. 18, Temple Car Street, Near Raja Veedhi, Erode, Tamil Nadu — 638001"
    bbox_ad = draw.textbbox((0, 0), addr, font=FONT_BODY)
    draw.text(((WIDTH - (bbox_ad[2] - bbox_ad[0])) // 2, 595), addr, font=FONT_BODY, fill=(180, 215, 195))

    return canvas

def main():
    print("[1/4] Preparing video generation pipeline...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    print(f"Using FFmpeg: {ffmpeg_exe}")

    mp4_out = "public/videos/poomani_promo.mp4"
    webm_out = "public/videos/poomani_promo.webm"
    poster_out = "public/images/poomani_promo_poster.jpg"

    # Start FFmpeg process for MP4
    mp4_cmd = [
        ffmpeg_exe, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgba",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-crf", "22",
        "-preset", "medium",
        "-movflags", "+faststart",
        mp4_out
    ]

    print("[2/4] Rendering 450 animation frames (18s @ 25fps)...")
    proc_mp4 = subprocess.Popen(mp4_cmd, stdin=subprocess.PIPE)

    saved_poster = False

    for frame_idx in range(TOTAL_FRAMES):
        # Determine scene
        if frame_idx < 75:
            # Scene 1: Logo & Golden Intro
            frame = render_scene_1(frame_idx)
        elif frame_idx < 150:
            # Scene 2: Three Traditional Oils Overview
            frame = render_scene_2(frame_idx - 75)
        elif frame_idx < 225:
            # Scene 3: Coconut Oil
            frame = render_scene_3(frame_idx - 150)
        elif frame_idx < 300:
            # Scene 4: Sesame Oil
            frame = render_scene_4(frame_idx - 225)
        elif frame_idx < 375:
            # Scene 5: Groundnut Oil
            frame = render_scene_5(frame_idx - 300)
        else:
            # Scene 6: Outro & WhatsApp Ordering
            frame = render_scene_6(frame_idx - 375)

        # Cross-dissolve transitions between scenes (last 10 frames of each scene)
        # Save poster at frame 110 (Scene 2 overview)
        if frame_idx == 110 and not saved_poster:
            frame.convert("RGB").save(poster_out, "JPEG", quality=92)
            saved_poster = True

        raw_bytes = frame.tobytes()
        proc_mp4.stdin.write(raw_bytes)

        if frame_idx % 75 == 0 or frame_idx == TOTAL_FRAMES - 1:
            print(f"  Frame {frame_idx + 1}/{TOTAL_FRAMES} rendered ({int((frame_idx+1)/TOTAL_FRAMES*100)}%)")

    proc_mp4.stdin.close()
    proc_mp4.wait()
    print(f"[3/4] MP4 video encoded successfully: {mp4_out} ({os.path.getsize(mp4_out):,} bytes)")

    # Also convert to optimized WebM (VP9) for ultra-wide browser compatibility
    print("[4/4] Generating WebM (VP9) format...")
    webm_cmd = [
        ffmpeg_exe, "-y",
        "-i", mp4_out,
        "-c:v", "libvpx-vp9",
        "-b:v", "1400k",
        "-crf", "28",
        webm_out
    ]
    subprocess.run(webm_cmd, check=True)
    print(f"WebM video encoded successfully: {webm_out} ({os.path.getsize(webm_out):,} bytes)")
    print(f"Poster image saved: {poster_out} ({os.path.getsize(poster_out):,} bytes)")
    print("PROMOTIONAL VIDEO CREATION COMPLETE!")

if __name__ == "__main__":
    main()
