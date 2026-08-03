# Cut granite-niche-images/ from the operator's own camera originals.
#
# Sprint-13 Track A. Operator, 2026-08-03:
#   "the crops on the granite niches guide cut off a lot of the photos. This guide can be
#    longer if we can have better quality photos for each section. maybe a page per
#    columbarium or nich section each."
#
# WHAT WAS WRONG. The shipped cuts were letterbox strips taken out of 3:4 and 4:3 frames
# to make them fit fixed-height print slots: gomn-wall.jpg was 1400x546 out of a 4:3
# photograph (the wall's ends and the garden it sits in were simply gone) and
# tgmp-path-placements.jpg was 1400x420, which cut the bowl off the birdbath it was
# supposed to show. This file cuts every photo at or near its NATIVE aspect ratio; the
# guide's frames follow the photograph now, not the other way round.
#
# THE SOURCES ARE NOT IN THE REPO. They live on the operator's own drive at
# D:\Cemetery Photos Misc\ (gitignored territory — it is not part of any repo). This
# script therefore cannot run on a fresh clone, and that is fine: it is here as
# PROVENANCE, so the next person can see exactly which frame each shipped image came from
# and re-cut it if the framing needs to change. Run it only on the operator's workstation.
#
#   python scripts/cut_granite_niche_photos.py
#
# CROP is (left, top, right, bottom) as FRACTIONS of the EXIF-corrected frame. Anything
# near (0,0,1,1) is a full frame. No entry may crop harder than about 20% of either axis —
# if a photograph needs more than that to work, it is the wrong photograph.
#
# PER-PHOTO CURATION IS RECORDED IN `WHY`, including the rejections, because the reason a
# frame was NOT used is the part that gets lost. The operator's photo rule (2026-07-29):
# legible memorial names and dates on his own property photos are FINE. Operational
# markings are not — a blue tape label reading "1003-9" written by staff, a work X taped
# across a niche front, funeral-service flower easels from that morning. Those are records
# of our work, not pictures of what a family would buy.
import os
from PIL import Image, ImageOps

SRC = r"D:\Cemetery Photos Misc"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "granite-niche-images")

LONG_EDGE = 1400
QUALITY = 68          # tuned by measuring: see the size table in the track report

# out name, source folder, source file, crop fractions, why this frame
JOBS = [
    ("roac-structure.jpg", "ROAC Photos", "20240422_154446.jpg", (0.00, 0.02, 1.00, 0.60),
     "The whole columbarium from the lawn: pavilion, roof, all seven walls readable, level "
     "horizon, clean blue sky, no vehicles or equipment in frame. The tighter alternative "
     "(20240304_110418) carries a parked utility vehicle at the tree line."),

    ("roac-courtyard.jpg", "ROAC Photos", "20240422_154507.jpg", (0.00, 0.00, 1.00, 1.00),
     "Native 4:3 landscape, so it needs no crop at all. Shows what the courtyard actually "
     "is: a long interior face with a memorial bench in front of it, at the scale a person "
     "standing there sees. The airport tower on the skyline is the honest background."),

    ("roac-wall-d.jpg", "ROAC Photos", "20260717_143617.jpg", (0.02, 0.04, 0.99, 0.87),
     "Wall D square on, with engraved fronts, a bronze vase and flowers. Re-cut WIDER than "
     "the shipped 900x1065: the old cut lost both flanking walls, which are the thing that "
     "tells a reader this is a courtyard and not a single free-standing block. Bottom cut "
     "at 0.87 to keep spent flowers and a tissue on the apron out of frame."),

    ("roac-niche-fronts.jpg", "ROAC Photos", "20260520_124847.jpg", (0.02, 0.02, 1.00, 0.86),
     "The closest thing in the folder to 'what a finished niche front looks like' at wall "
     "scale — three inscribed fronts, a vase and flowers against blank fronts. The same "
     "wall on 2026-03-27 was rejected: it carries a blue work X taped across a niche front."),

    ("roac-niche-closeup.jpg", "ROAC Photos", "20260323_120630.jpg", (0.00, 0.06, 1.00, 0.94),
     "Replaces an abstract macro of granite texture that showed no product at all. This is "
     "an engraved front close enough to read the lettering, which is exactly the question "
     "families ask about a granite front. Names/dates legible — permitted, 2026-07-29."),

    ("gomn-wall.jpg", "GOMN Niches", "Garden of Meditation01-front.jpeg", (0.00, 0.00, 1.00, 0.72),
     "The wall straight on in flat overcast light: both low wings, the taller centre "
     "section, bronze plates and vase holders all readable end to end. Replaces a "
     "1400x546 letterbox of this same scene that cut both wings in half. Bottom cut at "
     "0.72: below that is the service road and nothing else."),

    ("gomn-setting.jpg", "GOMN Niches", "20260727_090307.jpg", (0.00, 0.06, 1.00, 1.00),
     "The wall in its planted garden, which is the part of this location a family responds "
     "to and which no other frame in the folder shows. Backlit, with a visible lens-flare "
     "band across the middle — shipped anyway and flagged, because it is honest and it is "
     "the only garden-context frame there is."),

    ("tgn-niche-bank.jpg", "Terrace Garden Memorial Path", "20260613_150318.jpg", (0.00, 0.03, 1.00, 0.93),
     "The niche bank clean, level, in full sun, with the reflection pool and stone path "
     "below it. Replaces a cut of 20260601_153340, the same bank from the other side — "
     "that frame has builder's paper laid over the terrace in the bottom-left corner."),

    ("tgmp-terrace.jpg", "Terrace Garden Memorial Path", "20260601_153320.jpg", (0.00, 0.00, 1.00, 0.94),
     "The establishing shot the guide never had: the paved terrace running between the "
     "buildings, the planted memorial bed on the right, and the niche bank at the far end, "
     "all in one frame. It is what the words 'memorial path' mean."),

    ("tgmp-path-placements.jpg", "Terrace Garden Memorial Path", "20260601_153327.jpg", (0.00, 0.02, 1.00, 1.00),
     "The memorial bed itself: cremation posts and pedestals in a row along the flagstone "
     "and river-rock path. Replaces a 1400x420 strip that decapitated everything in it."),

    ("tgmp-cremation-post.jpg", "Terrace Garden Memorial Path", "20260703_165340.jpg", (0.00, 0.00, 1.00, 0.88),
     "A single post at arm's length: blank polished shutter, two bronze rosettes, the "
     "granite body. One item, its whole shape, nothing else competing."),
]

# Frames looked at and NOT used. Kept here on purpose — see the header.
REJECTED = [
    ("ROAC Photos/20260327_131652.jpg", "a blue work X taped across a niche front, plus a "
     "parked vehicle and the photographer's shadow across the foreground"),
    ("ROAC Photos/20260722_134043.jpg", "the blank granite end panel of a wall; shows no "
     "niche at all, and the photographer is ghosted in the polished stone"),
    ("ROAC Photos/20260722_134051.jpg", "a parked car in frame at the left and a strip of "
     "blue work tape on the wall"),
    ("ROAC Photos/20240419_140930.jpg", "a graveside canopy pitched in the background and a "
     "flat lawn marker with fresh flowers dominating the foreground — a different product"),
    ("ROAC Photos/20240405_133611.jpg", "macro of granite grain; no product, no scale"),
    ("ROAC Photos/*Screenshot*.png", "screen captures of a supplier's 3D viewer, not photographs"),
    ("GOMN Niches/20260727_090301.jpg", "same scene as the one shipped but with a heavier "
     "flare ray straight across the wall face"),
    ("GOMN Niches/*MAP*.png", "internal maps, not photographs"),
    ("Terrace Garden Memorial Path/20260601_153340.jpg", "builder's paper laid over the "
     "terrace in the corner of the frame"),
    ("Terrace Garden Memorial Path/20260703_165347.jpg", "the photographer's shadow falls "
     "square across the bench top, which is the whole subject"),
    ("Terrace Garden Memorial Path/20260703_165401.jpg", "the photographer's shadow occupies "
     "the bottom third; also carries a posted notice about what may be left at a crypt"),
    ("Terrace Garden Memorial Path/*.png, *.pdf", "a 'coming soon' billboard, a screenshot "
     "and a price sheet — not photographs"),
    ("Cremation Posts/ (whole folder)", "WRONG PROPERTY. These are engraved granite posts in "
     "a pond-side cremation garden, not the Terrace Garden path's blank-shutter Paradiso "
     "posts. Labelling one of them as a Terrace Garden placement would put a picture of "
     "something a family cannot buy next to the price of something else. Two frames also "
     "carry portrait photographs of the people interred, and 20240430_154746 carries a blue "
     "staff tape label reading '1003-9'."),
    ("Garden Court and Terrace Garden Maus/ (whole folder)", "WRONG PRODUCT. Mausoleum CRYPT "
     "fronts and a lawn bench monument — not granite niches. 20240620_165848 is a wall of "
     "funeral flower easels from that morning's service."),
]


def main():
    os.makedirs(DST, exist_ok=True)
    total = 0
    for name, folder, fn, box, _why in JOBS:
        path = os.path.join(SRC, folder, fn)
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        w, h = im.size
        l, t, r, b = box
        im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)
        out = os.path.join(DST, name)
        im.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        kb = os.path.getsize(out) / 1024
        total += kb
        print(f"{name:30s} {im.size[0]:5d}x{im.size[1]:<5d} {kb:7.0f} KB   <- {folder}/{fn}")
    print(f"{'':30s} {'':11s} {total:7.0f} KB total, {len(JOBS)} files")


if __name__ == "__main__":
    main()
