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

SECOND SOURCE FOLDER, added 2026-08-07 (s21). The operator supplied "PCM COMPANION NEW",
252 files under a DIFFERENT naming convention -- PCM<num>.jpg, no Headstone-Design-
prefix, matching the PCM SINGLE folder rather than this one. Both conventions are parsed.
Of its 252 numbers, 242 are already covered by the original folder and 10 are genuinely
new (245, 258, 2260, 2261, 2263, 2267, 2343, 2352, 2355, 2538). PRECEDENCE: the ORIGINAL
folder wins on every number it has. That is deliberate, and it is what keeps the 232
already-shipped .webp files byte-identical -- the new folder's copies are re-exports at
different sizes (PCM 2100: 110,856 B .webp here vs 178,035 B .jpg there), so preferring
them would rewrite 230 shipped files for no gain. The new folder therefore contributes
exactly the 10 numbers the original does not have. Two shipped numbers (2457, 2458) do
not appear in the new folder at all; they are unaffected.

CORRUPT SOURCES. Seven of those ten new files are not images at all: 2260, 2261, 2263,
2267, 2343, 2352, 2355 are each 1,699 bytes of "File Not Found" HTML saved under a .jpg
name, because PCM's server errored during the operator's download. No other copy exists
locally. They are detected BY MAGIC BYTES rather than by a hard-coded list, so a later
re-download is picked up with nothing to edit, and they are recorded in the manifest's
"unavailable" list so the count story stays honest. That leaves 3 genuinely new proofs
(245, 258, 2538).

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
# Second, later folder. Lower precedence: it only contributes numbers SRC does not have.
SRC2 = os.environ.get('PCM_COMPANION_SRC2', r'D:\Cemetery Photos Misc\PCM COMPANION NEW')
OUT_DIR = 'pcm-companion-images'
MANIFEST = 'data/pcm-companion-proofs.json'

FINAL_PX = 700          # the plates' own finalPx; see data/pcm-upscale-manifest.json
QUALITY = 70
METHOD = 6

# Two naming conventions: the original folder's Headstone-Design-PCM-<num>..., and the
# 2026-08-07 folder's PCM<num>.jpg (the PCM SINGLE convention).
NAME_RE = re.compile(r'^Headstone-Design-PCM-(\d+)')
NAME_RE_2 = re.compile(r'^PCM(\d+)\.jpg$', re.I)
COPY_SUFFIX_RE = re.compile(r' \(\d+\)(?=\.[a-z]+$)', re.I)

# RELEASED 2026-08-07. The twelve proofs below were held out of the public repo by s17
# for the real identities they carry. The operator was asked twice in-session -- the
# second time with the full census quoted back (portrait photographs, exact dates,
# hometowns, plus ~260 same-profile singles, public-repo consequence stated plainly;
# every one of these images is already publicly served from PCM's own gallery) -- and
# answered "Ship everything." They ship like any other proof; the original hold reasons
# stay here as provenance. Number -> what was seen on the proof.
RELEASED = {
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
HELD = {}


def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def is_image(path):
    """Content check, NOT an extension check. See the CORRUPT SOURCES note above: some
    .jpg files in the 2026-08-07 folder are HTML error bodies. Deciding by magic bytes
    means a later re-download is picked up automatically, with no list to maintain."""
    with open(path, 'rb') as f:
        head = f.read(12)
    return (head[:3] == b'\xff\xd8\xff'                              # JPEG
            or (head[:4] == b'RIFF' and head[8:12] == b'WEBP')       # WebP
            or head[:8] == b'\x89PNG\r\n\x1a\n')                     # PNG


def scan(src, log):
    """{num: [filename, ...]} for one source folder. Read-only; D:\\ is never written."""
    by_num = {}
    if not os.path.isdir(src):
        log.append(('missing-source', src, 'folder not present; skipped'))
        return by_num
    for fn in sorted(os.listdir(src)):
        m = NAME_RE.match(fn) or NAME_RE_2.match(fn)
        if not m:
            log.append(('unparsed', fn, 'name is neither Headstone-Design-PCM-<num> nor '
                                        'PCM<num>.jpg (in %s)' % src))
            continue
        by_num.setdefault(int(m.group(1)), []).append(fn)
    return by_num


def pick(src, num, files, log):
    """One file per design number within a folder, by the dedupe rule."""
    if len(files) == 1:
        return files[0]
    # Dedupe rule, in order: prefer a name with no " (n)" copy suffix, then the larger
    # file, then the lexicographically first name.
    def key(f):
        return (COPY_SUFFIX_RE.search(f) is not None,
                -os.path.getsize(os.path.join(src, f)), f)
    ranked = sorted(files, key=key)
    sizes = {f: os.path.getsize(os.path.join(src, f)) for f in files}
    same = len({sha256(os.path.join(src, f)) for f in files}) == 1
    log.append(('duplicate', num,
                'kept %s over %s (%s; %s)' % (
                    ranked[0], ', '.join(ranked[1:]),
                    'byte-identical' if same else 'DIFFERENT BYTES',
                    ', '.join('%s=%d B' % (f, sizes[f]) for f in files))))
    return ranked[0]


def survey():
    """{num: (src_dir, filename)}, plus the log.

    SRC wins on every number it carries; SRC2 only fills numbers SRC does not have. See
    the SECOND SOURCE FOLDER note above -- this precedence is what keeps the already
    shipped outputs byte-identical.
    """
    log = []
    primary = scan(SRC, log)
    secondary = scan(SRC2, log)

    chosen = {}
    for num, files in sorted(primary.items()):
        chosen[num] = (SRC, pick(SRC, num, files, log))
    added = []
    for num, files in sorted(secondary.items()):
        if num in chosen:
            continue
        chosen[num] = (SRC2, pick(SRC2, num, files, log))
        added.append(num)
    log.append(('second-src', SRC2,
                '%d numbers scanned, %d already covered by the primary folder (primary '
                'wins, no re-encode), %d added: %s'
                % (len(secondary), len(secondary) - len(added), len(added),
                   ', '.join(str(n) for n in added))))
    return chosen, log


def main():
    check = '--check' in sys.argv
    chosen, log = survey()

    print('source   : %s' % SRC)
    print('source 2 : %s' % SRC2)
    print('files    : %d + %d' % (len(os.listdir(SRC)),
                                  len(os.listdir(SRC2)) if os.path.isdir(SRC2) else 0))
    print('numbers  : %d distinct design numbers' % len(chosen))
    for kind, a, b in log:
        print('  %-10s %s  %s' % (kind, a, b))
    # Content check, not an extension check: seven .jpg files in the 2026-08-07 folder are
    # HTML "File Not Found" bodies. Refuse them loudly and record them; re-download slots
    # straight in with no list to edit.
    unavailable = []
    for num in sorted(chosen):
        d, f = chosen[num]
        if not is_image(os.path.join(d, f)):
            unavailable.append(num)
            print('  UNAVAILABLE %-6d %s in %s is %d B and is NOT an image (the download '
                  'saved an HTML error body)'
                  % (num, f, os.path.basename(d), os.path.getsize(os.path.join(d, f))))
    print('unavailable: %d  %s' % (len(unavailable),
                                   ', '.join(str(n) for n in unavailable)))

    held = sorted(n for n in chosen if n in HELD)
    print('held (PII): %d  %s' % (len(held), ', '.join(str(n) for n in held)))
    ship = [n for n in sorted(chosen) if n not in HELD and n not in unavailable]
    print('shipping : %d proofs' % len(ship))
    if check:
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    entries, total = [], 0
    for num in ship:
        src_dir, src_file = chosen[num]
        src = os.path.join(src_dir, src_file)
        rel = '%s/%d.webp' % (OUT_DIR, num)
        with Image.open(src) as im:
            im = im.convert('RGB')
            im.thumbnail((FINAL_PX, FINAL_PX), Image.LANCZOS)
            w, h = im.size
            im.save(rel, 'WEBP', quality=QUALITY, method=METHOD)
        b = os.path.getsize(rel)
        total += b
        entries.append(dict(num=num, img=rel, w=w, h=h, bytes=b, sha256=sha256(rel),
                            source=src_file, sourceDir=os.path.basename(src_dir)))

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
                   'folders "PCM COMPANION" (2026-08-05) and "PCM COMPANION NEW" '
                   '(2026-08-07); the first folder wins on every number it carries, the '
                   'second contributes only numbers the first does not have',
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
            releaseRuling='operator, in-chat, 2026-08-07, asked twice (second time with the '
                          'full census quoted at scale): "Ship everything". The twelve s17 '
                          'holds ship; original hold reasons preserved under "released".',
        ),
        count=len(entries), totalBytes=total,
        held=[dict(num=n, reason=HELD[n], source=chosen[n][1],
                   sourceDir=os.path.basename(chosen[n][0])) for n in held],
        released=[dict(num=n, originalHoldReason=RELEASED[n])
                  for n in sorted(RELEASED) if n in chosen],
        unavailable=[dict(num=n, source=chosen[n][1],
                          sourceDir=os.path.basename(chosen[n][0]),
                          sourceBytes=os.path.getsize(os.path.join(*chosen[n])),
                          reason='the operator\'s download saved a "File Not Found" HTML '
                                 'body under a .jpg name; no image exists anywhere locally, '
                                 'pending a re-download from the PCM gallery')
                     for n in unavailable],
        files=entries,
    )
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(man, f, indent=0, ensure_ascii=False)
    print('%s: %d proofs, %.2f MB' % (MANIFEST, len(entries), total / 1e6))


if __name__ == '__main__':
    main()
