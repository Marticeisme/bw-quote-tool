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
listed in data/pcm-photo-masks.json is replaced with a neutral panel and the Bonney
Watson roundel: a placeholder that reads as "your photograph goes here".

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

The roundel is embedded below as an 8-bit alpha mask rather than rasterised from
logo-navy.svg at run time, so a mask run needs no browser and produces the same bytes on
any machine. Regenerate with scratch/s15a/make_emblem.mjs if the mark ever changes.
"""
import base64, hashlib, io, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGN_DIR = 'pcm-design-images'
REGIONS = os.path.join('data', 'pcm-photo-masks.json')
MANIFEST = os.path.join('data', 'pcm-upscale-manifest.json')

QUALITY = 70          # identical to the shipped pipeline: no second quality decision
WEBP_METHOD = 6
SS = 4                # supersample factor for the painted shape's edge
NAVY = (61, 90, 122)  # #3d5a7a, the navy of logo-navy.svg
# ONE placeholder for every plate, not a tone sampled from each plate's surroundings.
# Sampling was tried first and is worse: half these insets sit directly on granite, so the
# placeholder came back as a brown disc inside the photo's white ceramic rim -- it read as
# damage. A blank ivory ceramic oval is what an unfilled photo inset actually looks like,
# it reads the same on grey, black and red granite, and being identical on all 84 plates it
# reads as a deliberate catalog convention rather than 84 separate accidents.
FILL = (222, 222, 219)
EDGE = (176, 176, 172)
EMBLEM_FRAC = 0.56    # roundel width as a fraction of the region's short side

MASK_REASON = ('ceramic portrait photograph removed: Real-ESRGAN rebuilt the faces; '
               'replaced with a neutral panel and the Bonney Watson roundel')

# 192x192 8-bit alpha of the Bonney Watson roundel (ring + fleur), from logo-navy.svg.
EMBLEM_ALPHA_B64 = (
    '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'
    'SUVORK5CYII='
)


def _emblem():
    a = Image.open(io.BytesIO(base64.b64decode(EMBLEM_ALPHA_B64))).convert('L')
    return a


def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def paint(im, regions):
    """Return a new image with every region replaced by the placeholder."""
    out = im.copy()
    emblem = _emblem()
    for r in regions:
        x0, y0, x1, y1 = r['bbox']
        w, h = x1 - x0, y1 - y0
        if w < 4 or h < 4:
            continue
        fill, edge, ink = FILL, EDGE, NAVY

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

        side = max(8, int(round(min(w, h) * EMBLEM_FRAC))) * SS
        em = emblem.resize((side, side), Image.LANCZOS)
        col = Image.new('RGB', (side, side), ink)
        patch.paste(col, ((w * SS - side) // 2, (h * SS - side) // 2), em)

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
        'replacement': 'neutral fill sampled from the surrounding panel, hairline recess '
                       'edge, Bonney Watson roundel centred at %.2f of the short side'
                       % EMBLEM_FRAC,
        'format': 'webp', 'quality': QUALITY, 'method': WEBP_METHOD,
    }
    with open(os.path.join(ROOT, MANIFEST), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(man, f, indent=1)

    n = sum(1 for e in man['files'] if e.get('photoMasked'))
    print(f'{n} plates carry photoMasked; {DESIGN_DIR}/ is {total/1e6:.2f} MB')


if __name__ == '__main__':
    main()
