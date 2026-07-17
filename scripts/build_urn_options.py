"""
Builds Urn_Options_Quote_Christene_Taruc_2026-06-25.pdf
  Page 1  : Summary — uses real BW header borrowed from a quote page
  Pages 2-6: Individual quotes with photo + option banner
              - Names fixed: Christine→Christene, Turac→Taruc (all pages)
              - Footer: "Prices valid 30 days..." removed; "This is an estimate only." kept
"""
import io, os, copy
from pypdf import PdfWriter, PdfReader
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from reportlab.pdfbase.pdfmetrics import stringWidth
from PIL import Image

FOLDER = r"C:\Users\Martice\bw-quote-tool\Urn Options Quote 06.25.26"

NAVY   = colors.HexColor("#466e86")
ORANGE = colors.HexColor("#e84610")
LGRAY  = colors.HexColor("#f2f4f6")
MGRAY  = colors.HexColor("#d0d8de")
DGRAY  = colors.HexColor("#555555")

PAGE_H            = 792.0
FOOTER_TOP_PL     = 730.0
PHOTO_MARGIN_X    = 36
PHOTO_CONTENT_GAP = 16

# ── Name fix coordinates (pdfplumber) ────────────────────────────────────────
NAME_X0      = 109.14
NAME_TOP_PL  = 74.07
NAME_BOT_PL  = 84.07
NAME_FONT_SZ = 10
NAME_RECT_W  = 41       # safely ends before Turac starts at x=151.37

# "Turac" x0 differs because "Christene" is slightly wider than "Christine"
TURAC_X0_CHRISTINE = 151.37
TURAC_X0_CHRISTENE = 154.71
TURAC_W            = 27    # slightly wider than the word to ensure full cover

# ── "Prices valid..." replacement ────────────────────────────────────────────
# pdfplumber: x0=48, x1=314.5, top=756.4, bottom=763.4
DISCLAIMER_RL_Y    = PAGE_H - 763.4   # reportlab y of text baseline area
DISCLAIMER_RECT_Y  = PAGE_H - 765     # white-rect bottom (a bit of padding)
DISCLAIMER_RECT_H  = 10
DISCLAIMER_FONT_SZ = 7

# ── Nav header boundary ──────────────────────────────────────────────────────
# Navy banner spans pdfplumber y=0 to ~65; in reportlab that is y=727 to y=792
HEADER_RL_Y = 727   # bottom of navy header in reportlab coords
HEADER_H    = 65    # height of navy banner

# Quotes sorted least → most expensive
# (file, photo, fix_first_name, content_bottom_pl, location_label, total_str, level_note)
QUOTES = [
    ("BW_Cemetery_Quote_Christene_Turac_2026-06-25-1.pdf",
     "Crystal Niche Room.jpeg",               False, 270.1,
     "Crystal Niche Room – Level J",  "$3,304.50", "Top level"),

    ("BW_Cemetery_Quote_Christine_Turac_2026-06-25-1.pdf",
     "Crystal Niche Room.jpeg",               True,  270.1,
     "Crystal Niche Room – Level H",  "$4,404.50", "2nd to top level"),

    ("BW_Cemetery_Quote_Christine_Turac_2026-06-25.pdf",
     "Urn Garden BW.jpeg",                    True,  385.9,
     "Lake Urn Garden",               "$8,064.80", ""),

    ("BW_Cemetery_Quote_Christene_Turac_2026-06-25-2.pdf",
     "MVC New Structure.jpg",                 False, 270.1,
     "New MVC Niches",                "$8,810.00", ""),

    ("BW_Cemetery_Quote_Christene_Turac_2026-06-25-3.pdf",
     "Rock of Ages Columbarium Outside.jpeg", False, 359.8,
     "Rock of Ages Columbarium",      "$10,633.14", ""),
]

SUMMARY_INCLUDES = [
    "Property, services, vault",
    "Property, services",
    "Property, services, vault",
    "Property, services",
    "Property, services, inscription",
]


# ─────────────────────────────────────────────────────────────────────────────
def make_disclaimer_overlay(c, pw, ph):
    """White-out the 'Prices valid...' sentence and write 'This is an estimate only.'"""
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.white)
    c.rect(46, DISCLAIMER_RECT_Y, 280, DISCLAIMER_RECT_H, fill=1, stroke=0)
    c.setFillColor(DGRAY)
    c.setFont("Helvetica", DISCLAIMER_FONT_SZ)
    c.drawString(48, DISCLAIMER_RL_Y, "This is an estimate only.")


# ─────────────────────────────────────────────────────────────────────────────
def build_summary_page(writer, header_reader):
    """
    Summary page: borrow the real BW header from header_reader, then overlay
    a white rectangle over the content area and draw the summary table.
    """
    pw, ph = letter  # 612 × 792

    # ── 1. Base = copy of a real quote page (gives us the authentic BW header) ──
    base_page = copy.deepcopy(header_reader.pages[0])
    writer.add_page(base_page)
    dest = writer.pages[-1]

    # ── 2. Build the overlay ─────────────────────────────────────────────────
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=letter)

    # White out everything below the navy header
    c.setFillColor(colors.white)
    c.rect(0, 0, pw, HEADER_RL_Y, fill=1, stroke=0)

    # Re-cover the right portion of the navy header to replace the title.
    # Logo (BONNEY WATSON graphic) runs to ~x=415; header text starts at x=433.
    # Start overlay at x=418 to leave the full logo visible.
    OVERLAY_X = 418
    c.setFillColor(NAVY)
    c.rect(OVERLAY_X, HEADER_RL_Y, pw - OVERLAY_X, HEADER_H, fill=1, stroke=0)

    # Draw new title — use 12pt to fit within the ~146pt available width
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(pw - 48, HEADER_RL_Y + HEADER_H - 27, "Urn Placement Options")
    c.setFont("Helvetica", 8)
    c.drawRightString(pw - 48, HEADER_RL_Y + HEADER_H - 41, "June 25, 2026   ·   Valid thru Jul 25, 2026")

    # ── Prepared-for bar ──────────────────────────────────────────────────────
    BAR_H = 28
    BAR_Y = HEADER_RL_Y - BAR_H
    c.setFillColor(LGRAY)
    c.rect(0, BAR_Y, pw, BAR_H, fill=1, stroke=0)
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 10)
    c.drawString(48, BAR_Y + 9, "Prepared for:")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(122, BAR_Y + 9, "Christene Taruc")
    c.setFont("Helvetica", 10)
    c.drawString(228, BAR_Y + 9, "   Washington Memorial Park")

    # ── Intro text ────────────────────────────────────────────────────────────
    intro_y = BAR_Y - 26
    c.setFillColor(DGRAY)
    c.setFont("Helvetica", 9.5)
    intro = ("The following options are available for urn placement at Washington Memorial Park. "
             "Each quote includes cemetery property, inurnment services, and applicable fees. "
             "Options are listed from lowest to highest price. "
             "Photos and full itemized pricing are shown on the individual option pages.")
    words = intro.split()
    line, lines = "", []
    for w in words:
        test = (line + " " + w).strip()
        if stringWidth(test, "Helvetica", 9.5) <= 516:
            line = test
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    for ln in lines:
        c.drawString(48, intro_y, ln)
        intro_y -= 14

    # ── Options table ─────────────────────────────────────────────────────────
    table_top = intro_y - 18
    ROW_H = 52
    TBL_W = pw - 96   # 516 pts
    C_NUM, C_OPT, C_DESC = 32, 220, 160
    x0 = 48

    # Header row
    c.setFillColor(NAVY)
    c.rect(x0, table_top - 24, TBL_W, 24, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x0 + 8,                         table_top - 17, "#")
    c.drawString(x0 + C_NUM + 8,                 table_top - 17, "OPTION / LOCATION")
    c.drawString(x0 + C_NUM + C_OPT + 8,         table_top - 17, "INCLUDES")
    c.drawRightString(x0 + TBL_W - 8,            table_top - 17, "TOTAL")

    row_y = table_top - 24
    for i, (qfile, pfile, _, _, location, total_str, level_note) in enumerate(QUOTES):
        bg = LGRAY if i % 2 == 0 else colors.white
        c.setFillColor(bg)
        c.rect(x0, row_y - ROW_H, TBL_W, ROW_H, fill=1, stroke=0)
        c.setStrokeColor(MGRAY)
        c.setLineWidth(0.5)
        c.line(x0, row_y - ROW_H, x0 + TBL_W, row_y - ROW_H)

        cy = row_y - ROW_H / 2

        # Number badge
        c.setFillColor(NAVY)
        c.circle(x0 + C_NUM / 2, cy, 11, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x0 + C_NUM / 2, cy - 3.5, str(i + 1))

        # Location name + sub-lines
        text_x = x0 + C_NUM + 8
        if level_note:
            # 3 lines: name / location / level note
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(text_x, cy + 8, location)
            c.setFillColor(DGRAY)
            c.setFont("Helvetica", 8)
            c.drawString(text_x, cy - 2, "Washington Memorial Park")
            c.setFillColor(colors.HexColor("#e84610"))  # orange for emphasis
            c.setFont("Helvetica-Oblique", 8)
            c.drawString(text_x, cy - 13, level_note)
        else:
            # 2 lines: name / location
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(text_x, cy + 4, location)
            c.setFillColor(DGRAY)
            c.setFont("Helvetica", 8)
            c.drawString(text_x, cy - 8, "Washington Memorial Park")

        # Includes
        c.setFillColor(DGRAY)
        c.setFont("Helvetica", 9)
        c.drawString(x0 + C_NUM + C_OPT + 8, cy + 2, SUMMARY_INCLUDES[i])

        # Total
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 11)
        c.drawRightString(x0 + TBL_W - 8, cy - 2, total_str)

        row_y -= ROW_H

    # Outer border
    c.setStrokeColor(MGRAY)
    c.setLineWidth(0.75)
    c.rect(x0, row_y, TBL_W, table_top - row_y, fill=0, stroke=1)

    # Disclaimer note
    c.setFillColor(DGRAY)
    c.setFont("Helvetica-Oblique", 8.5)
    c.drawString(48, row_y - 18, "This is an estimate only.")

    # Footer rule + contact
    c.setStrokeColor(MGRAY)
    c.setLineWidth(0.5)
    c.line(48, 40, pw - 48, 40)
    c.setFillColor(DGRAY)
    c.setFont("Helvetica", 8)
    c.drawCentredString(pw / 2, 26,
        "Bonney Watson  ·  16445 International Blvd, SeaTac, WA 98188"
        "  ·  mmorrison@bonneywatson.com  ·  206-445-9794")

    c.save()
    buf.seek(0)
    dest.merge_page(PdfReader(buf).pages[0])
    print("  OK  summary page (BW header from quote)")


# ─────────────────────────────────────────────────────────────────────────────
writer = PdfWriter()

# Load any Christene-named quote to borrow its real BW header
header_reader = PdfReader(os.path.join(
    FOLDER, "BW_Cemetery_Quote_Christene_Turac_2026-06-25-1.pdf"))

build_summary_page(writer, header_reader)

# Option banner sits in the blank strip: pdfplumber y=86–103.5
BANNER_TOP_PL = 86.0
BANNER_BOT_PL = 103.5

for opt_num, (qfile, pfile, fix_first, content_bottom, location, total_str, _level) in \
        enumerate(QUOTES, start=1):

    reader = PdfReader(os.path.join(FOLDER, qfile))
    quote_page = copy.deepcopy(reader.pages[0])
    writer.add_page(quote_page)
    dest = writer.pages[-1]

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=letter)
    pw, ph = letter

    rl_y_top = ph - NAME_TOP_PL
    rl_y_bot = ph - NAME_BOT_PL
    rect_h   = rl_y_top - rl_y_bot + 2

    # ── First name fix (Christine → Christene) ────────────────────────────
    if fix_first:
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.white)
        c.rect(NAME_X0 - 1, rl_y_bot - 1, NAME_RECT_W, rect_h, fill=1, stroke=0)
        c.setFillColor(colors.black)
        c.setFont("Helvetica", NAME_FONT_SZ)
        c.drawString(NAME_X0, rl_y_bot, "Christene")

    # ── Last name fix (Turac → Taruc) — all pages ─────────────────────────
    turac_x0 = TURAC_X0_CHRISTINE if fix_first else TURAC_X0_CHRISTENE
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.white)
    c.rect(turac_x0 - 1, rl_y_bot - 1, TURAC_W, rect_h, fill=1, stroke=0)
    c.setFillColor(colors.black)
    c.setFont("Helvetica", NAME_FONT_SZ)
    c.drawString(turac_x0, rl_y_bot, "Taruc")

    # ── Option / location banner ──────────────────────────────────────────
    rl_banner_bot = ph - BANNER_BOT_PL
    rl_banner_top = ph - BANNER_TOP_PL
    bh = rl_banner_top - rl_banner_bot
    c.setFillColor(ORANGE)
    c.rect(0, rl_banner_bot, pw, bh, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8)
    label = f"OPTION {opt_num} OF 5   –   {location}   –   Washington Memorial Park"
    c.drawCentredString(pw / 2, rl_banner_bot + (bh - 8) / 2 + 1, label)

    # ── Photo ─────────────────────────────────────────────────────────────
    rl_photo_bottom = ph - FOOTER_TOP_PL
    rl_photo_top    = ph - (content_bottom + PHOTO_CONTENT_GAP)
    zone_h = rl_photo_top - rl_photo_bottom
    zone_w = pw - 2 * PHOTO_MARGIN_X

    img = Image.open(os.path.join(FOLDER, pfile))
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")
    iw, ih = img.size
    scale  = min(zone_w / iw, zone_h / ih)
    x = PHOTO_MARGIN_X + (zone_w - iw * scale) / 2
    y = rl_photo_bottom + (zone_h - ih * scale) / 2
    img_buf = io.BytesIO()
    img.save(img_buf, format="JPEG", quality=92)
    img_buf.seek(0)
    c.drawImage(ImageReader(img_buf), x, y, width=iw * scale, height=ih * scale)

    # ── Disclaimer fix ────────────────────────────────────────────────────
    make_disclaimer_overlay(c, pw, ph)

    c.save()
    buf.seek(0)
    dest.merge_page(PdfReader(buf).pages[0])
    print(f"  OK  Opt {opt_num}  {location:35s}  {total_str}")

# ─────────────────────────────────────────────────────────────────────────────
out = os.path.join(FOLDER, "Urn_Options_Quote_Christene_Taruc_2026-06-25_v3.pdf")
with open(out, "wb") as f:
    writer.write(f)

print(f"\nSaved ({len(writer.pages)} pages): {out}")
