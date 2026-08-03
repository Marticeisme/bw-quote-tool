# -*- coding: utf-8 -*-
"""
AI super-resolution for the 699 PCM design plates.

    python scripts/pcm_plate_export.py     # first: lossless raw export
    python scripts/pcm_upscale.py --sweep  # size/quality table, writes nothing final
    python scripts/pcm_upscale.py          # full run + data/pcm-upscale-manifest.json

PIPELINE
    scratch/pcm-plates-raw/<book>/<num>.png      347x199 native, lossless (export script)
      -> realesrgan-ncnn-vulkan, model realesrgan-x4plus, scale 4
    scratch/pcm-plates-x4/<book>/<num>.png       ~1388x796
      -> Hamming downsample to FINAL_PX long edge, WebP quality QUALITY, method 6
    pcm-design-images/<book>/<num>.webp          same paths and filenames as before

MODEL CHOICE — realesrgan-x4plus, not realesrgan-x4plus-anime. Both were run on three
line-heavy plates (2011/1102 script lettering, 2011/2120 fine line art, 2020/800 dense
Chinese-panel line work) and compared at the lightbox's display size. On LETTERING the two
are close, anime a touch heavier in the stroke. On the GRANITE they are not close: every
plate is a photographic granite texture with the artwork composited over it, and the anime
model — trained on flat cel art — smears that grain into blotches. x4plus keeps it. The
anime model does encode ~15% smaller for the same pixel count, which would have bought
700px inside the budget instead of 640; the stone's colour and grain is a thing families
choose, so the pixels lost. Renders: scratch/s12b-renders/, plus scratch/modeltest/.

SIZE — the lightbox opens plates at min(96vw, 1100px), but the operator's hard budget of
pcm-design-images/ <= 20 MB over all 699 files (~28.6 KB each) is what actually decides.
Measured on the real full set, not extrapolated: at the q70 quality floor a 700px long edge
costs 23.06 MB and a 660px one 20.89 MB, so 640px is the largest that fits. Nothing else
recovered the difference — a flat-region denoise ahead of the encoder was tried and gave
back only ~4%, because on these plates the bytes are in the line art, not the granite.

The binary is NOT vendored: `scratch/realesrgan/` is gitignored. Re-download the portable
release named in BIN_NOTE if you need to re-run. Verification does not need it — the
committed manifest is what `scripts/verify_pcm_upscale.mjs` checks against.
"""
import hashlib, json, os, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')

from PIL import Image

DESIGN_DIR = 'pcm-design-images'
RAW_DIR = os.path.join('scratch', 'pcm-plates-raw')
X4_DIR = os.path.join('scratch', 'pcm-plates-x4')
BIN = os.path.join('scratch', 'realesrgan', 'realesrgan-ncnn-vulkan.exe')
BIN_NOTE = ('realesrgan-ncnn-vulkan-20220424-windows.zip, '
            'github.com/xinntao/Real-ESRGAN release v0.2.5.0')
MANIFEST = os.path.join('data', 'pcm-upscale-manifest.json')

BOOKS = ('2020', '2011')
MODEL = 'realesrgan-x4plus'
SCALE = 4
FINAL_PX = 640
QUALITY = 70
WEBP_METHOD = 6
# Hamming, not Lanczos. Lanczos overshoots at every one of these plates' many hard black
# edges, and the ringing it leaves is expensive to encode: measured over all 699 plates it
# cost ~6% of the byte budget for no visible sharpness at a 2:1 reduction. Those bytes buy
# more px instead.
RESAMPLE = Image.HAMMING
RESAMPLE_NAME = 'PIL HAMMING'

SWEEP = [(660, 70), (650, 70), (640, 70), (630, 70), (620, 70)]
BUDGET = 20 * 1000 * 1000


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 16), b''):
            h.update(chunk)
    return h.hexdigest()


def run_ai():
    if not os.path.exists(BIN):
        sys.exit(f'missing {BIN} — download {BIN_NOTE}')
    for book in BOOKS:
        src, dst = os.path.join(RAW_DIR, book), os.path.join(X4_DIR, book)
        if not os.path.isdir(src):
            sys.exit(f'missing {src} — run scripts/pcm_plate_export.py first')
        os.makedirs(dst, exist_ok=True)
        n = len(os.listdir(src))
        print(f'>> {MODEL} x{SCALE} on {n} plates from {src}')
        p = subprocess.run([os.path.abspath(BIN), '-i', src, '-o', dst,
                            '-n', MODEL, '-s', str(SCALE), '-f', 'png'],
                           capture_output=True, text=True)
        # The binary logs the Vulkan device it selected as a `[0 <name>] queueC=…` banner;
        # a CPU fallback prints no such line and takes hours instead of minutes, so the
        # banner is echoed here on purpose rather than swallowed with the progress spam.
        for line in p.stderr.splitlines():
            if 'queue' in line or 'subgroup' in line:
                print('   ' + line)
        if p.returncode != 0:
            sys.exit(f'realesrgan exited {p.returncode}\n{p.stderr[-2000:]}')
        got = len(os.listdir(dst))
        if got != n:
            sys.exit(f'{dst}: {got} outputs for {n} inputs')


def encode(src_png, out_path, px, quality):
    im = Image.open(src_png).convert('RGB')
    im.thumbnail((px, px), RESAMPLE)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path, 'WEBP', quality=quality, method=WEBP_METHOD)
    return im.size


def all_plates():
    for book in BOOKS:
        d = os.path.join(X4_DIR, book)
        for f in sorted(os.listdir(d)):
            if f.endswith('.png'):
                yield book, f[:-4], os.path.join(d, f)


def sweep():
    tmp = os.path.join('scratch', 'sweep.webp')
    for px, q in SWEEP:
        total = 0
        for _b, _n, p in all_plates():
            encode(p, tmp, px, q)
            total += os.path.getsize(tmp)
        flag = 'OK ' if total <= BUDGET else 'OVER'
        print(f'{flag} long edge {px:4d}  q{q}  ->  {total/1e6:6.2f} MB  '
              f'({total/699/1024:.1f} KB avg)  budget {BUDGET/1e6:.0f} MB')
    os.remove(tmp)


def main():
    if '--skip-ai' not in sys.argv:
        run_ai()
    if '--sweep' in sys.argv:
        sweep()
        return

    entries, total = [], 0
    for book, num, src in all_plates():
        rel = f'{DESIGN_DIR}/{book}/{num}.webp'
        w, h = encode(src, rel, FINAL_PX, QUALITY)
        b = os.path.getsize(rel)
        total += b
        entries.append(dict(path=rel, book=book, num=num, w=w, h=h, bytes=b,
                            sha256=sha256(rel)))
    entries.sort(key=lambda e: e['path'])

    paths = [e['path'] for e in entries]
    if len(set(paths)) != len(paths):
        sys.exit('duplicate manifest entries')

    os.makedirs('data', exist_ok=True)
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dict(
            settings=dict(model=MODEL, scale=SCALE, binary=BIN_NOTE,
                          source='lossless 72-dpi PNG re-export from the PCM design books '
                                 '(scripts/pcm_plate_export.py)',
                          downsample=RESAMPLE_NAME, finalPx=FINAL_PX,
                          format='webp', quality=QUALITY, method=WEBP_METHOD,
                          budgetBytes=BUDGET),
            count=len(entries), totalBytes=total, files=entries), f, indent=1)

    print(f'{len(entries)} plates -> {DESIGN_DIR}/  {total/1e6:.2f} MB '
          f'({total/len(entries)/1024:.1f} KB avg), budget {BUDGET/1e6:.0f} MB')
    print(f'manifest: {MANIFEST} ({os.path.getsize(MANIFEST)/1024:.0f} KB)')
    if total > BUDGET:
        sys.exit('OVER BUDGET')


if __name__ == '__main__':
    main()
