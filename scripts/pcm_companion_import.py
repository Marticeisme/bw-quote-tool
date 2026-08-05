# -*- coding: utf-8 -*-
"""
Import the PCM COMPANION design-proof class into the catalog.

    python scripts/pcm_companion_import.py --check   # survey + dedupe report, writes nothing
    python scripts/pcm_companion_import.py           # encode images + write the manifest

WHAT THIS CLASS ACTUALLY IS -- read this before labelling it anything else. The operator
called the folder "PCM COMPANION" and described the files as "additional PCM designs".
Looked at (all 244, contact sheets in scratch/s17c-renders/), they are NOT photographs of
installed markers: they are Pacific Coast Memorials' own FULL-COLOUR DESIGN PROOFS -- the
line art laid onto the real granite colour, with sample lettering. That is a genuinely
different thing from the black-and-white book plates the catalog already carries, and it
is the reason the class ships: a family sees the design on the stone it will be cut into.
So the UI label is "full-colour proof", not "photographed marker". The Installed Examples
section stays what it is: photographs taken on the grounds.

NO MASKING, and that is a ruling, not an oversight. Operator, 2026-08-05: "the photos on
these ones do NOT need to be removed as the quality of these images should be better than
what you did before." The s15 masking regime (data/pcm-photo-masks.json,
scripts/pcm_photo_mask.py) covers the 700 Real-ESRGAN book plates under pcm-design-images/
ONLY -- those were masked because the upscaler rebuilt faces wrong, which does not happen
here because nothing here is upscaled. The proofs live in their own directory so the two
regimes cannot reach each other, and verify_pcm_catalog.mjs asserts that separation in
both directions.

DEDUPE. 245 files, 244 distinct design numbers. The brief expected .jpg/.webp twins of the
same number; there are none. What is actually there:

    173 .jpg   named Headstone-Design-PCM-<num>.jpg
     72 .webp  named Headstone-Design-PCM-<num>.jpg-<guid>.webp   (a webp conversion that
                kept the original .jpg name as a prefix; the .jpg itself is NOT in the folder)

so the extension is a property of the export, not a choice between two copies of one
design. Exactly ONE number is duplicated -- PCM 2643, as `...-2643.jpg` and
`...-2643 (1).jpg`, byte-identical (sha256 adf2291c...). RULE: keep the name without the
" (n)" copy suffix; on any future collision keep the larger file, and if the sizes tie
keep the lexicographically first name. Recorded per-number in the manifest.

HELD BACK FOR PII. Twelve proofs carry what read as REAL identities rather than PCM's
recurring stock sample names (Silvernail, Schmoyer, Adams, Gunter, Addie M., Noah Z.,
Collin S., Orva M.): full names in Vietnamese or with a specific home town -- Seattle,
Tacoma, Renton, Ha Noi, Bien Hoa -- exact birth and death dates, and in several cases a
portrait photograph of the person. The standing photo-PII relaxation (2026-07-30) covers
the operator's OWN photographs of installed markers on his grounds; a manufacturer's
customer proof naming a family and their town is not that, and this repo is public. Per
the brief -- "flag anything doubtful rather than shipping it" -- they are held, listed in
the manifest with the reason, and asserted absent by the gate. Releasing any of them is
the operator's call, not this script's: move the number out of HELD and re-run.

ENCODE. Byte-deterministic and matched to the plates' own convention
(data/pcm-upscale-manifest.json settings: finalPx 700, LANCZOS, WebP quality 70,
method 6). Sources are already 720x411 (232 of them) or 500x800 / 457x800, so 700 px on
the longest edge is a small downsample and never an enlargement -- nothing here is
invented detail. Every output's sha256 goes in the manifest, so a re-run that changes a
byte fails the gate instead of shipping quietly.
"""
import hashlib, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

from PIL import Image

SRC = os.environ.get('PCM_COMPANION_SRC', r'D:\Cemetery Photos Misc\PCM COMPANION')
OUT_DIR = 'pcm-companion-images'
MANIFEST = 'data/pcm-companion-proofs.json'

FINAL_PX = 700          # the plates' own finalPx; see data/pcm-upscale-manifest.json
QUALITY = 70
METHOD = 6

NAME_RE = re.compile(r'^Headstone-Design-PCM-(\d+)')
COPY_SUFFIX_RE = re.compile(r' \(\d+\)(?=\.[a-z]+$)', re.I)

# Real-identity proofs. See the PII note above. Number -> what was seen on the proof.
HELD = {
    2500: 'Vietnamese full names with portrait photographs',
    2501: 'Vietnamese full names with exact birth/death dates',
    2503: 'Vietnamese full names with exact birth/death dates',
    2504: 'Vietnamese full names with exact birth/death dates',
    2506: 'Vietnamese full names with portrait photographs',
    2508: 'Vietnamese full names, birthplaces in Viet Nam, home town Seattle, Washington',
    2509: 'Vietnamese full name, birthplace Bien Hoa Viet Nam, home town Renton, Washington, portrait photograph',
    2510: 'Vietnamese full names with portrait photographs',
    2514: 'Vietnamese full names with a full-length couple photograph',
    2515: 'Vietnamese full names with a portrait photograph',
    2516: 'Vietnamese full names, birthplaces in Viet Nam, home towns Seattle and Tacoma, Washington',
    2529: 'English full names with exact birth/death dates and two portrait photographs',
}


def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def survey():
    """{num: chosen filename}, plus the dedupe log. Read-only; D:\\ is never written."""
    by_num, log = {}, []
    for fn in sorted(os.listdir(SRC)):
        m = NAME_RE.match(fn)
        if not m:
            log.append(('unparsed', fn, 'name does not start Headstone-Design-PCM-<num>'))
            continue
        num = int(m.group(1))
        by_num.setdefault(num, []).append(fn)

    chosen = {}
    for num, files in sorted(by_num.items()):
        if len(files) == 1:
            chosen[num] = files[0]
            continue
        # Dedupe rule, in order: prefer a name with no " (n)" copy suffix, then the larger
        # file, then the lexicographically first name.
        def key(f):
            return (COPY_SUFFIX_RE.search(f) is not None,
                    -os.path.getsize(os.path.join(SRC, f)), f)
        ranked = sorted(files, key=key)
        chosen[num] = ranked[0]
        sizes = {f: os.path.getsize(os.path.join(SRC, f)) for f in files}
        same = len({sha256(os.path.join(SRC, f)) for f in files}) == 1
        log.append(('duplicate', num,
                    'kept %s over %s (%s; %s)' % (
                        ranked[0], ', '.join(ranked[1:]),
                        'byte-identical' if same else 'DIFFERENT BYTES',
                        ', '.join('%s=%d B' % (f, sizes[f]) for f in files))))
    return chosen, log


def main():
    check = '--check' in sys.argv
    chosen, log = survey()

    print('source   : %s' % SRC)
    print('files    : %d' % len(os.listdir(SRC)))
    print('numbers  : %d distinct design numbers' % len(chosen))
    for kind, a, b in log:
        print('  %-10s %s  %s' % (kind, a, b))
    held = sorted(n for n in chosen if n in HELD)
    print('held (PII): %d  %s' % (len(held), ', '.join(str(n) for n in held)))
    ship = [n for n in sorted(chosen) if n not in HELD]
    print('shipping : %d proofs' % len(ship))
    if check:
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    entries, total = [], 0
    for num in ship:
        src = os.path.join(SRC, chosen[num])
        rel = '%s/%d.webp' % (OUT_DIR, num)
        with Image.open(src) as im:
            im = im.convert('RGB')
            im.thumbnail((FINAL_PX, FINAL_PX), Image.LANCZOS)
            w, h = im.size
            im.save(rel, 'WEBP', quality=QUALITY, method=METHOD)
        b = os.path.getsize(rel)
        total += b
        entries.append(dict(num=num, img=rel, w=w, h=h, bytes=b, sha256=sha256(rel),
                            source=chosen[num]))

    # Sweep anything left over from a previous run whose number is now held or gone, so a
    # held proof cannot survive on disk after being pulled from the manifest.
    keep = {'%d.webp' % n for n in ship}
    for fn in sorted(os.listdir(OUT_DIR)):
        if fn not in keep:
            os.remove(os.path.join(OUT_DIR, fn))
            print('  removed stale %s/%s' % (OUT_DIR, fn))

    man = dict(
        settings=dict(
            source='Pacific Coast Memorials full-colour companion design proofs, operator '
                   'folder "PCM COMPANION" (2026-08-05)',
            klass='proof',
            label='Full-colour proof',
            finalPx=FINAL_PX, format='webp', quality=QUALITY, method=METHOD,
            resample='PIL LANCZOS',
            masked=False,
            maskingRuling='operator 2026-08-05: these ship with their artwork intact; the '
                          's15 photo-mask regime covers pcm-design-images/ only',
            dedupeRule='one file per design number: prefer the name without a " (n)" copy '
                       'suffix, then the larger file, then the first name alphabetically',
            heldRule='proofs carrying real identities (full names with a specific home town '
                     'or in Vietnamese, exact dates, portrait photographs) are held out of '
                     'the public repo pending the operator',
        ),
        count=len(entries), totalBytes=total,
        held=[dict(num=n, reason=HELD[n], source=chosen[n]) for n in held],
        files=entries,
    )
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(man, f, indent=0, ensure_ascii=False)
    print('%s: %d proofs, %.2f MB' % (MANIFEST, len(entries), total / 1e6))


if __name__ == '__main__':
    main()
