import os
import io
from pypdf import PdfWriter, PdfReader
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader

folder = r"C:\Users\Martice\bw-quote-tool\Urn Options Quote 06.25.26"

# Quote PDFs in logical presentation order
pdf_files = [
    "BW_Cemetery_Quote_Christine_Turac_2026-06-25.pdf",
    "BW_Cemetery_Quote_Christine_Turac_2026-06-25-1.pdf",
    "BW_Cemetery_Quote_Christene_Turac_2026-06-25-1.pdf",
    "BW_Cemetery_Quote_Christene_Turac_2026-06-25-2.pdf",
    "BW_Cemetery_Quote_Christene_Turac_2026-06-25-3.pdf",
]

# Photos in presentation order
image_files = [
    "Urn Garden BW.jpeg",
    "Crystal Niche Room.jpeg",
    "Rock of Ages Columbarium Outside.jpeg",
    "MVC New Structure.jpg",
]

writer = PdfWriter()

# Add quote PDFs
for pdf in pdf_files:
    path = os.path.join(folder, pdf)
    reader = PdfReader(path)
    for page in reader.pages:
        writer.add_page(page)
    print(f"  Added PDF: {pdf} ({len(reader.pages)} page(s))")

# Add images as full-page PDF pages
for img_file in image_files:
    img_path = os.path.join(folder, img_file)
    img = Image.open(img_path)

    # Normalize to RGB
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    img_w, img_h = img.size

    # Choose portrait or landscape page to best fit image
    pw, ph = letter  # 612 x 792
    if img_w > img_h:
        pw, ph = ph, pw  # landscape: 792 x 612

    # Scale image to fill page with 0.5-inch margins
    margin = 36
    max_w = pw - 2 * margin
    max_h = ph - 2 * margin
    scale = min(max_w / img_w, max_h / img_h)
    draw_w = img_w * scale
    draw_h = img_h * scale
    x = (pw - draw_w) / 2
    y = (ph - draw_h) / 2

    # Render image onto a canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(pw, ph))
    img_buf = io.BytesIO()
    img.save(img_buf, format="JPEG", quality=90)
    img_buf.seek(0)
    c.drawImage(ImageReader(img_buf), x, y, width=draw_w, height=draw_h)
    c.save()

    buf.seek(0)
    img_reader = PdfReader(buf)
    writer.add_page(img_reader.pages[0])
    print(f"  Added image: {img_file}")

output_path = os.path.join(folder, "Urn_Options_Quote_Turac_2026-06-25.pdf")
with open(output_path, "wb") as f:
    writer.write(f)

print(f"\nDone! Total pages: {len(writer.pages)}")
print(f"Saved to: {output_path}")
