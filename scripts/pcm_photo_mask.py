# -*- coding: utf-8 -*-
"""
Remove the photographic insets from the PCM design plates.

    python scripts/pcm_photo_mask.py --check   # what would change, writes nothing
    python scripts/pcm_photo_mask.py           # mask + update the upscale manifest

WHY. The 699 plates ship as Real-ESRGAN x4 renders. On plates carrying a ceramic
PORTRAIT INSET -- a continuous-tone photograph of a real person set into the design --
the model rebuilt the faces: eyes shifted, mouths smeared, a child's face visibly
warped. A family browsing a memorial catalog should not meet a stranger's face rendered
wrong, so the operator ruled the photographs out of the product entirely. Every region
listed in data/pcm-photo-masks.json is replaced with a BLANK ivory ceramic oval --
exactly what an unfilled photo inset looks like before a portrait is fired onto it.
(The first iteration carried the Bonney Watson roundel; the operator ruled the logo
off the plates 2026-08-04, so the placeholder is now the blank ceramic alone.)

NOT IN SCOPE, and untouched: etched and laser portraits (the line-art engraving IS the
product), carved figures, and every other piece of non-photographic art on the plates.
The census that drew that line was done by eye over contact sheets of all 699 plates;
data/pcm-photo-masks.json carries the per-plate verdicts.

SOURCE PATH -- read this before "improving" it. The shipped pipeline is
scripts/pcm_upscale.py: a 348 px lossless export -> realesrgan-ncnn-vulkan x4 -> Hamming
downsample to 700 px -> WebP q70. Masking the raw export and re-running that pipeline was
the preferred route and is NOT AVAILABLE: the GPU binary (scratch/realesrgan/) and the x4
intermediates (scratch/pcm-plates-x4/) are both gitignored scratch and neither survives,
and the surviving raw masters are only 348 px, so a Lanczos re-enlargement would replace
the AI render on every masked plate with a softer one -- a visible regression, on 84
plates, to fix 91 regions. So this script decodes the SHIPPED webp, paints the region,
and re-encodes ONCE at the manifest's exact settings (q70, method 6). Measured cost of
that single extra generation on five sample plates: PSNR 39.2-42.6 dB, i.e. below the
noise floor of the granite texture; before/after three-ups are in scratch/s15a-mask-renders/.

IDEMPOTENT. A plate whose manifest entry already says photoMasked and whose bytes still
hash to the manifest is skipped, so a second run (or a run on a fresh clone) is a no-op
and never stacks a second re-encode.

"""
import hashlib, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGN_DIR = 'pcm-design-images'
REGIONS = os.path.join('data', 'pcm-photo-masks.json')
MANIFEST = os.path.join('data', 'pcm-upscale-manifest.json')

QUALITY = 70          # identical to the shipped pipeline: no second quality decision
WEBP_METHOD = 6
SS = 4                # supersample factor for the painted shape's edge
# ONE placeholder for every plate, not a tone sampled from each plate's surroundings.
# Sampling was tried first and is worse: half these insets sit directly on granite, so the
# placeholder came back as a brown disc inside the photo's white ceramic rim -- it read as
# damage. A blank ivory ceramic oval is what an unfilled photo inset actually looks like,
# it reads the same on grey, black and red granite, and being identical on all 84 plates it
# reads as a deliberate catalog convention rather than 84 separate accidents.
FILL = (222, 222, 219)
EDGE = (176, 176, 172)

MASK_REASON = ('ceramic portrait photograph removed: Real-ESRGAN rebuilt the faces; '
               'replaced with a blank ivory ceramic oval')

def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def paint(im, regions):
    """Return a new image with every region replaced by the placeholder."""
    out = im.copy()
    for r in regions:
        x0, y0, x1, y1 = r['bbox']
        w, h = x1 - x0, y1 - y0
        if w < 4 or h < 4:
            continue
        fill, edge = FILL, EDGE

        # patch, painted at SSx and downsampled so the oval edge is antialiased
        patch = Image.new('RGB', (w * SS, h * SS), fill)
        pm = Image.new('L', (w * SS, h * SS), 0)
        d = ImageDraw.Draw(pm)
        box = [0, 0, w * SS - 1, h * SS - 1]
        if r['shape'] == 'oval':
            d.ellipse(box, fill=255)
        else:
            d.rectangle(box, fill=255)
        # a hairline edge so a placeholder that overshoots the old photo by a pixel or
        # two still reads as a deliberate recess rather than a smear
        de = ImageDraw.Draw(patch)
        lw = max(2, int(round(min(w, h) * SS * 0.035)))
        if r['shape'] == 'oval':
            de.ellipse(box, outline=edge, width=lw)
        else:
            de.rectangle(box, outline=edge, width=lw)


        patch = patch.resize((w, h), Image.LANCZOS)
        pm = pm.resize((w, h), Image.LANCZOS)
        out.paste(patch, (x0, y0), pm)
    return out


def load(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return json.load(f)


def main():
    check = '--check' in sys.argv
    regions = load(REGIONS)
    man = load(MANIFEST)
    by_key = {(e['book'], e['num']): e for e in man['files']}

    todo, skipped, missing = [], 0, []
    for p in regions['plates']:
        e = by_key.get((p['book'], p['num']))
        if e is None:
            missing.append(f"{p['book']}/{p['num']}")
            continue
        abs_p = os.path.join(ROOT, e['path'])
        if e.get('photoMasked') and os.path.exists(abs_p) and sha256(abs_p) == e['sha256']:
            skipped += 1
            continue
        todo.append((p, e))
    if missing:
        sys.exit('regions name plates absent from the manifest: ' + ', '.join(missing))

    print(f"{len(regions['plates'])} plates listed, {skipped} already masked, "
          f"{len(todo)} to mask")
    if check or not todo:
        for p, e in todo:
            print('  would mask', e['path'], len(p['regions']), 'region(s)')
        return

    for p, e in todo:
        abs_p = os.path.join(ROOT, e['path'])
        im = Image.open(abs_p).convert('RGB')
        out = paint(im, p['regions'])
        out.save(abs_p, 'WEBP', quality=QUALITY, method=WEBP_METHOD)
        e['w'], e['h'] = out.size
        e['bytes'] = os.path.getsize(abs_p)
        e['sha256'] = sha256(abs_p)
        e['photoMasked'] = True
        e['maskReason'] = MASK_REASON
        print(f"  {e['path']:34s} {len(p['regions'])} region(s)  {e['bytes']:7d} B")

    total = 0
    for e in man['files']:
        total += os.path.getsize(os.path.join(ROOT, e['path']))
    man['totalBytes'] = total
    man['settings']['photoMask'] = {
        'what': 'continuous-tone photographic insets removed from the plates listed in '
                'data/pcm-photo-masks.json',
        'regions': REGIONS,
        'script': 'scripts/pcm_photo_mask.py',
        'source': 'the shipped webp, decoded and re-encoded once (the Real-ESRGAN binary '
                  'and the x4 intermediates are gitignored scratch and did not survive; '
                  'the surviving raw masters are 348px, so re-running the pipeline would '
                  'have replaced the AI render with a softer Lanczos one)',
        'replacement': 'blank ivory ceramic oval with a hairline recess edge -- no '
                       'emblem (the roundel was ruled off by the operator 2026-08-04)',
        'format': 'webp', 'quality': QUALITY, 'method': WEBP_METHOD,
    }
    with open(os.path.join(ROOT, MANIFEST), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(man, f, indent=1)

    n = sum(1 for e in man['files'] if e.get('photoMasked'))
    print(f'{n} plates carry photoMasked; {DESIGN_DIR}/ is {total/1e6:.2f} MB')


if __name__ == '__main__':
    main()
