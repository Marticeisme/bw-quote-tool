"""Build contact sheets of the PCM design images so they can be tagged by eye.

Local tooling only — writes to scratch/pcm-sheets/, which is gitignored.
Grid is 4 x 6 at the images' native 357x205, so nothing is downscaled before
the Read tool sees it.
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'scratch', 'pcm-sheets')
COLS, ROWS = 4, 6
PER = COLS * ROWS
CELL_W, CELL_H = 357, 205
LABEL_H = 24
PAD = 6

CAT_ORDER = [
    ('Individual Designs', ['Floral', 'Outdoors', 'Religious', 'Child', 'Classic', 'Misc']),
    ('Companion Designs', ['Floral', 'Outdoors', 'Religious', 'Classic', 'Misc', 'Ledgers']),
    ('2020 Collection', ['Flat Markers', 'Ledgers']),
]


def font(sz):
    for p in (r'C:\Windows\Fonts\arialbd.ttf', r'C:\Windows\Fonts\arial.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def main():
    os.makedirs(OUT, exist_ok=True)
    data = json.load(open(os.path.join(ROOT, 'data', 'pcm-catalog.json'), encoding='utf-8'))
    by_group = {}
    for d in data['designs']:
        by_group.setdefault((d['cat'], d['sub']), []).append(d)
    ordered = []
    for cat, subs in CAT_ORDER:
        for sub in subs:
            items = sorted(by_group.get((cat, sub), []), key=lambda d: d['num'])
            ordered.extend(items)
    assert len(ordered) == len(data['designs']), (len(ordered), len(data['designs']))

    f_lab = font(17)
    f_hdr = font(20)
    sheets = [ordered[i:i + PER] for i in range(0, len(ordered), PER)]
    manifest = []
    for si, chunk in enumerate(sheets, 1):
        hdr = 30
        W = COLS * (CELL_W + PAD) + PAD
        H = hdr + ROWS * (CELL_H + LABEL_H + PAD) + PAD
        sheet = Image.new('RGB', (W, H), (245, 245, 245))
        dr = ImageDraw.Draw(sheet)
        groups = sorted({d['cat'] + ' / ' + d['sub'] for d in chunk})
        dr.text((PAD, 6), 'SHEET %02d  —  %s' % (si, ' + '.join(groups)),
                fill=(0, 0, 0), font=f_hdr)
        for i, d in enumerate(chunk):
            r, c = divmod(i, COLS)
            x = PAD + c * (CELL_W + PAD)
            y = hdr + PAD + r * (CELL_H + LABEL_H + PAD)
            im = Image.open(os.path.join(ROOT, d['img'].replace('/', os.sep))).convert('RGB')
            if im.size != (CELL_W, CELL_H):
                im = im.resize((CELL_W, CELL_H))
            sheet.paste(im, (x, y))
            dr.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], outline=(150, 150, 150))
            dr.rectangle([x, y + CELL_H, x + CELL_W - 1, y + CELL_H + LABEL_H - 1],
                         fill=(20, 40, 60))
            dr.text((x + 5, y + CELL_H + 3),
                    '%s   [%s]' % (d['id'], d['sub']), fill=(255, 255, 255), font=f_lab)
        p = os.path.join(OUT, 'sheet-%02d.png' % si)
        sheet.save(p)
        manifest.append({'sheet': si, 'file': p, 'ids': [d['id'] for d in chunk]})
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    print('%d sheets, %d designs' % (len(sheets), len(ordered)))


if __name__ == '__main__':
    main()
