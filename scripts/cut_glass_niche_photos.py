# Cut glass-niche-images/ from the operator's own camera originals.
#
# Sprint-13 Track A, second half. Operator, 2026-08-03, extending the granite ruling:
# "same with glass front niches as well."
#
# Same defect, same fix as scripts/cut_granite_niche_photos.py — read that file's header
# first; it explains the letterbox problem and the crop-fraction convention. The one cut
# here that was letterboxed at source is `ecl-wall-elevation.jpg`, which was 1400x544 out
# of a 3:4 frame: a horizontal band across a wall that is three times taller than the strip
# kept of it. The rest were already at native aspect and are re-cut only because a better
# frame exists.
#
# `rad-wall.jpg` and `ser-wall.jpg` ARE DELIBERATELY NOT REGENERATED. They are already
# full-frame 3:4, so the cropping complaint does not touch them, and the source folder
# holds three near-identical frames of two walls that look alike. Re-cutting them means
# guessing which wall is Radiance and which is Serenity from the photographs alone, and a
# guide that shows a family the wrong wall next to the right price is worse than one that
# ships an older photograph of the right one. Left alone; flagged in the track report.
#
# THE PEOPLE PROBLEM IS THE MAIN CURATION AXIS HERE, not sticky notes. These are indoor
# rooms with glass fronts, so half the folder carries either a member of the public walking
# through, a staff member, or the photographer reflected full-length in the glass. Every
# frame with a living person in it — in shot OR in reflection — was rejected. Memorial
# content inside the niches (names, dates, the family's own photographs of the person
# interred) stays: operator ruling 2026-07-29, and on a glass-front niche it is literally
# the product.
#
#   python scripts/cut_glass_niche_photos.py
import os
from PIL import Image, ImageOps

SRC = r"D:\Cemetery Photos Misc"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "glass-niche-images")

LONG_EDGE = 1400
QUALITY = 68

JOBS = [
    ("ecl-niche-front.jpg", "Eternal Light Columbarium (NEW)", "20260613_150458.jpg",
     (0.02, 0.02, 0.98, 0.97),
     "A whole freestanding glass columbarium, occupied: urns, plates, framed pictures and "
     "flowers behind the glass, with the wall niches of the room behind it. It answers "
     "'what is a glass front' in one frame. No people, no reflections of people."),

    ("ecl-columbarium.jpg", "Eternal Light Columbarium (NEW)", "20260613_150433.jpg",
     (0.00, 0.00, 1.00, 0.95),
     "The same kind of cabinet standing in the corridor under the chandelier, with the "
     "room around it — the scale and the setting rather than the contents. The near-"
     "identical frame at 150808 was rejected: a member of the public is walking through it."),

    ("ecl-wall-elevation.jpg", "Eternal Light Columbarium (NEW)", "20260613_150251.jpg",
     (0.00, 0.22, 1.00, 0.95),
     "The full elevation of a built-in glass niche wall, square on and level. REPLACES a "
     "1400x544 strip of this same subject — the shipped cut kept one band of niches and "
     "dropped the two-storey wall above and below it."),

    ("ecl-niche-closeup.jpg", "Eternal Light Columbarium (NEW)", "20250520_164833.jpg",
     (0.02, 0.13, 1.00, 1.00),
     "ONE lit compartment at arm's length: the urn, a keepsake and a painted portrait, "
     "which is what a family is actually deciding about when they choose glass over stone. "
     "Replaces a wide frame of a whole wall of other families' photographs — that one was "
     "more personal and told the reader less. Top 13% cut to drop the photographer's "
     "reflection out of the glass."),

    ("mvc-island.jpg", "New MVC Photos", "20260607_144333.jpg", (0.00, 0.02, 1.00, 1.00),
     "The new island square on: every opening empty and lit, under the chandelier and the "
     "stained-glass mountain band. This is new inventory and it photographs as new. Four "
     "otherwise-good frames of it (144404, 144432, 143952, 133948) all carry a hand, a "
     "head or a visitor at the edge."),

    ("mvc-niche-grid.jpg", "New MVC Photos", "20260604_103010.jpg", (0.00, 0.00, 1.00, 0.97),
     "The island's corner against the older wall niches behind it, which is the only frame "
     "that shows BOTH the several opening sizes and what an occupied niche looks like a "
     "few feet away. The tight grid at 20260528_171007 was rejected for a person-shaped "
     "reflection through the window glass."),
]

REJECTED = [
    ("ECL 20260613_150409, 20260613_150808", "a visitor walking through the frame"),
    ("ECL 20260316_131731, 20260105_165358", "the photographer reflected full-length in "
     "the glass; 131731 also carries a WATCH YOUR STEP floor sign"),
    ("ECL 20260613_150419", "photographer's reflection holding a phone, dead centre"),
    ("ECL *Screenshot*.png", "screen captures, not photographs"),
    ("MVC 20260607_144404, 144432, 143952", "a hand or the top of a head at the frame edge"),
    ("MVC 20260721_133948, 133958", "a visitor in shot, once full length and once pointing "
     "into an open niche"),
    ("MVC 20260528_170912.mp4", "video"),
    ("Radiance and Serenity 20240404_130054", "a very close frame of one family's niche — "
     "two portrait photographs of the couple interred plus a third family snapshot. The "
     "names are fine by the 2026-07-29 rule; three faces filling a leave-behind page is "
     "still the wrong picture to sell a product with, and the ECL close-up says the same "
     "thing with one painted portrait."),
    ("Chapel of Memories/ (whole folder, 34 frames)", "WRONG PRODUCT for this guide. It is "
     "marble CRYPT walls and chapel seating, not glass niches. Radiance and Serenity are "
     "the only glass-front walls in that building and they have their own folder."),
    ("Crystal Niche/ (whole folder)", "not one of the four locations this guide covers."),
]

# rad-wall.jpg and ser-wall.jpg are intentionally absent from JOBS — see the header.
KEPT_AS_IS = ["rad-wall.jpg", "ser-wall.jpg"]


def main():
    total = 0
    for name, folder, fn, box, _why in JOBS:
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, folder, fn))).convert("RGB")
        w, h = im.size
        l, t, r, b = box
        im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)
        out = os.path.join(DST, name)
        im.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        kb = os.path.getsize(out) / 1024
        total += kb
        print(f"{name:26s} {im.size[0]:5d}x{im.size[1]:<5d} {kb:7.0f} KB   <- {folder}/{fn}")
    for name in KEPT_AS_IS:
        kb = os.path.getsize(os.path.join(DST, name)) / 1024
        total += kb
        print(f"{name:26s} {'(unchanged)':11s} {kb:7.0f} KB")
    print(f"{'':26s} {'':11s} {total:7.0f} KB total")


if __name__ == "__main__":
    main()
