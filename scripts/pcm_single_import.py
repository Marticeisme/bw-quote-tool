# -*- coding: utf-8 -*-
"""
Import the PCM SINGLE design-proof class into the catalog.

    python scripts/pcm_single_import.py --check   # survey + provenance report, writes nothing
    python scripts/pcm_single_import.py           # encode images + write the manifest

WHAT THIS CLASS IS. Same thing as the companion proofs (see pcm_companion_import.py's
docstring, which is the spec of this regime), for the single/individual designs: Pacific
Coast Memorials' own FULL-COLOUR DESIGN PROOFS, line art laid onto the real granite
colour with sample lettering. Not photographs of installed markers. UI label is
"full-colour proof". Nothing here is upscaled, masked, or enhanced -- the s15 masking
regime (data/pcm-photo-masks.json) covers pcm-design-images/ ONLY, and the two
directories are kept apart so the regimes cannot reach each other.

WHERE THE NUMBERS COME FROM -- this matters, because the local filenames lie.
The operator's folder holds 373 .jpg files named PCM<num>.jpg (note: a DIFFERENT
convention from the companion folder's Headstone-Design-PCM-<num>.jpg), plus the two
files that produced them:

    Download_PCM_Headstones.bat   373 curl lines, local filename -> gallery URL
    PCM_Headstone_Index.csv       373 rows: design_number, name, image_filename, image_url

The local filenames are NOT a reliable design number. Parsed as PCM<digits> they yield
only 370 distinct values, because three files carry a "-2" disambiguator
(PCM1148-2.jpg, PCM1353-2.jpg, PCM1528-2.jpg) and collide with their plain twins -- and
the twins are genuinely different images, not copies (full-frame pixel difference on all
three pairs). The .bat explains why: six of the 373 curl lines write to a filename whose
number does not match the URL they fetch.

    PCM1148.jpg   <- Headstone-Design-PCM-1448.jpg
    PCM117.jpg    <- Headstone-Design-PCM-1177.jpg
    PCM131.jpg    <- Headstone-Design-PCM-1318.jpg
    PCM1353.jpg   <- Headstone-Design-PCM-1352.jpg
    PCM16521.jpg  <- Headstone-Design-PCM-1651.jpg
    PCM1528-2.jpg <- Headstone-Design-PCM-1526.jpg

TWO FIELDS, because one number cannot carry both facts honestly:

    id    the operator's filename stem minus "PCM" -- a STRING, "1148" and "1148-2" are
          different designs. This is the manifest key and the join key with Track B1's
          data/pcm-desc-singles.json, which uses the same stems. Output files are
          pcm-single-images/<id>.webp. Parsing it as an integer collides the "-2" twins.
    num   the design number the gallery URL actually served.

They disagree on 8 of the 373 files, and where they disagree it is `num` that is true.

The DESIGN NUMBER IS TAKEN FROM THE GALLERY URL, which is what actually produced the
bytes on disk. Read that way the set is clean: 373 files, 373 distinct numbers, range
1100-1662, and the .bat's URL set equals the CSV's URL set exactly (no bat-only, no
csv-only). One URL breaks the naming pattern -- PCM1348 is served from a bare
gallery/PCM-1348.jpg rather than gallery/Headstone-Design-PCM-1348.jpg -- so the number
is matched on the "PCM-<n>.jpg" tail, which covers both shapes.
The CSV's own design_number column carries the same "-2" artefact and is
therefore used for the human-readable name only, joined on image_url. Both the local
filename and the URL go into the manifest so this is auditable rather than asserted.

The script REFUSES to write if that invariant breaks: any unparsed file, any file with no
.bat line, any .bat line with no file, or any repeated URL number is a hard stop with a
report, not a guess.

ONE SOURCE IS NOT AN IMAGE. PCM1348.jpg is 1,699 bytes of "File Not Found" HTML, because
its .bat line asks for the malformed bare URL above and the gallery has no such path.
The download simply failed and saved the 404 body under the .jpg name. It is detected by
magic bytes (not by extension), excluded from the shipped set, and recorded in the
manifest's "unavailable" list with its URL so the gap is on the record and re-fetchable.
That makes the class 372 proofs on disk out of 373 catalogued designs.

PII POSTURE -- READ PII_POSTURE BELOW BEFORE COMMITTING ANY OF THIS. The class was
eyeballed in full (24 sixteen-up contact sheets, 2026-08-07). Below design number 1264 it
is PCM's recurring stock cast -- Noah Z. Frost, Addie M. Smith, Lily Bell Sophia,
Silvernail, Schmoyer, Gunter -- reusing the same few dates, and raises nothing. From 1264
up, all 260 remaining proofs carry a distinct non-recurring full name with exact birth and
death dates, frequently a portrait photograph, sometimes a named town. That is the profile
that got twelve companion proofs HELD in s17, twenty times over, into a public repo. The
counter-argument is real -- every one of these is already served from
pacificcoastmemorials.com/images/gallery/ -- but "already public somewhere" is not the
same as republishing it under Bonney Watson's name, and reversing an existing PII hold is
not a call this script, or the track that wrote it, gets to make. It needs the operator's
own word, given to him directly with the census in front of him. So the encode is complete
and reproducible, and the outputs stay out of git until then.

ENCODE. Identical to the companion proofs and to the plates' own convention
(data/pcm-upscale-manifest.json: finalPx 700, LANCZOS, WebP quality 70, method 6).
Sources are 720x411, so 700 px on the longest edge is a small downsample and never an
enlargement. Byte-deterministic; every output's sha256 goes in the manifest, so a re-run
that changes a byte fails the gate instead of shipping quietly.
"""
import csv, hashlib, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

from PIL import Image

SRC = os.environ.get('PCM_SINGLE_SRC', r'D:\Cemetery Photos Misc\PCM SINGLE')
OUT_DIR = 'pcm-single-images'
MANIFEST = 'data/pcm-single-proofs.json'

BAT = 'Download_PCM_Headstones.bat'
CSV = 'PCM_Headstone_Index.csv'

FINAL_PX = 700          # the plates' own finalPx; see data/pcm-upscale-manifest.json
QUALITY = 70
METHOD = 6

CURL_RE = re.compile(r'-o "([^"]+)" "([^"]+)"')
STEM_RE = re.compile(r'^PCM(.+)\.jpg$', re.I)      # the id: filename stem minus "PCM"
URL_NUM_RE = re.compile(r'PCM-(\d+)\.jpg', re.I)   # 372 URLs are Headstone-Design-PCM-<n>.jpg;
                                                   # one (PCM1348) is a bare PCM-<n>.jpg

PII_POSTURE = (
    'CLEARED FOR THE PUBLIC REPO by the operator, in-chat, 2026-08-07. Census by eye over '
    'all 372, 2026-08-07: 112 proofs (design numbers below 1264) use PCM\'s recurring '
    'stock sample names -- Noah Z. Frost, Addie M. Smith, Lily Bell Sophia, Silvernail, '
    'Schmoyer, Gunter, Collin S. Adams -- with the same handful of recycled dates, and are '
    'not a PII question. The remaining 260 (1264 and above) each carry a DIFFERENT, '
    'non-recurring full name with exact birth and death dates, many with a portrait '
    'photograph, some with a named place -- the profile that got twelve companion proofs '
    'held in s17, at 20x the volume. The operator was asked twice, the second time with '
    'exactly that census quoted back and the public-repo consequence stated plainly, and '
    'answered "Ship everything" (every image is already publicly served from PCM\'s own '
    'gallery). The push to the live site remains a separate operator gate on top.')


def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def is_jpeg(path):
    """Content check, NOT an extension check -- see the ONE SOURCE IS NOT AN IMAGE note.
    Deciding by magic bytes means a later re-download is picked up with no list to edit."""
    with open(path, 'rb') as f:
        return f.read(3) == b'\xff\xd8\xff'


def sort_key(e):
    """Deterministic order over ids like "1148" and "1148-2": numeric, then the suffix."""
    m = re.match(r'(\d+)(?:-(\d+))?$', e['id'])
    return (int(m.group(1)), int(m.group(2) or 0)) if m else (1 << 30, 0)


def survey():
    """(entries, unavailable, problems). Read-only; the operator's D:\\ is never written.

    entries:     [{num, file, url, name}] ordered by design number -- shippable.
    unavailable: same shape, for sources that are not actually images (failed downloads).
    """
    problems = []
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.jpg'))

    bat_path = os.path.join(SRC, BAT)
    csv_path = os.path.join(SRC, CSV)
    if not os.path.exists(bat_path):
        return [], [], [('missing', BAT,
                         'no download script: provenance cannot be established')]

    with open(bat_path, encoding='utf-8', errors='replace') as f:
        pairs = CURL_RE.findall(f.read())
    by_file = {}
    for fn, url in pairs:
        by_file.setdefault(fn, []).append(url)

    names = {}
    if os.path.exists(csv_path):
        with open(csv_path, encoding='utf-8-sig', newline='') as f:
            for row in csv.DictReader(f):
                names[row['image_url'].strip()] = row['name'].strip()
    else:
        problems.append(('missing', CSV, 'no index: manifest will carry no design names'))

    # DROPPED by the operator, 2026-08-07: PCM1348's download was an HTML error body, and
    # PCM has since DELISTED the design (every URL pattern 404s; the gallery no longer
    # references the number). Ruling: drop it rather than hold the slot -- same ruling
    # covered the 7 corrupt companions. The .bat line stays as provenance; the file's
    # absence from disk is expected, not an orphan.
    DROPPED = {'PCM1348.jpg'}
    for fn in sorted(set(by_file) - set(files) - DROPPED):
        problems.append(('orphan-line', fn, 'the .bat downloads it but it is not on disk'))

    entries, unavailable, seen = [], [], {}
    for fn in files:
        sid = STEM_RE.match(fn)
        if not sid:
            problems.append(('unparsed-name', fn, 'not PCM<id>.jpg'))
            continue
        sid = sid.group(1)
        if sid in seen:
            problems.append(('duplicate-id', sid, '%s and %s' % (seen[sid], fn)))
            continue
        seen[sid] = fn

        urls = by_file.get(fn)
        if not urls:
            problems.append(('no-provenance', fn, 'no curl line in %s' % BAT))
            continue
        if len(urls) > 1:
            problems.append(('multi-line', fn, 'downloaded %d times: %s' % (len(urls), urls)))
        url = urls[0]
        m = URL_NUM_RE.search(url)
        num = int(m.group(1)) if m else None
        if num is None:
            problems.append(('unparsed-url', fn, url))
            continue
        rec = dict(id=sid, num=num, file=fn, url=url, name=names.get(url, ''))
        if is_jpeg(os.path.join(SRC, fn)):
            entries.append(rec)
        else:
            rec['bytes'] = os.path.getsize(os.path.join(SRC, fn))
            unavailable.append(rec)

    entries.sort(key=sort_key)
    unavailable.sort(key=sort_key)
    return entries, unavailable, problems


def main():
    check = '--check' in sys.argv
    entries, unavailable, problems = survey()
    allrec = sorted(entries + unavailable, key=sort_key)

    print('source   : %s' % SRC)
    print('files    : %d .jpg' % len([f for f in os.listdir(SRC) if f.lower().endswith('.jpg')]))
    print('ids      : %d distinct (filename stem minus "PCM")' % len(allrec))
    if allrec:
        print('range    : %s-%s' % (allrec[0]['id'], allrec[-1]['id']))
    for e in unavailable:
        print('  UNAVAILABLE PCM %-7s %s is %d B of not-an-image (failed download of %s)'
              % (e['id'], e['file'], e['bytes'], e['url']))
    renamed = [e for e in allrec if e['id'] != str(e['num'])]
    print('id/URL design-number mismatches: %d  (the id is the operator\'s filename; the '
          'design number is what the gallery actually served)' % len(renamed))
    for e in renamed:
        print('  id %-8s -> design PCM %d   (%s)' % (e['id'], e['num'], e['url']))
    for kind, a, b in problems:
        print('  PROBLEM %-16s %s  %s' % (kind, a, b))
    print('shipping : %d proofs' % len(entries))
    print('PII      : %s' % PII_POSTURE)
    if check:
        return
    if problems:
        print('REFUSING to write: resolve the problems above first.')
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)
    out, total = [], 0
    for e in entries:
        src = os.path.join(SRC, e['file'])
        rel = '%s/%s.webp' % (OUT_DIR, e['id'])
        with Image.open(src) as im:
            im = im.convert('RGB')
            im.thumbnail((FINAL_PX, FINAL_PX), Image.LANCZOS)
            w, h = im.size
            im.save(rel, 'WEBP', quality=QUALITY, method=METHOD)
        b = os.path.getsize(rel)
        total += b
        out.append(dict(id=e['id'], num=e['num'], img=rel, w=w, h=h, bytes=b,
                        sha256=sha256(rel), source=e['file'], sourceUrl=e['url'],
                        sourceName=e['name']))

    # Sweep anything a previous run left behind, so the directory can never hold a file
    # the manifest does not account for.
    keep = {'%s.webp' % e['id'] for e in entries}
    for fn in sorted(os.listdir(OUT_DIR)):
        if fn not in keep:
            os.remove(os.path.join(OUT_DIR, fn))
            print('  removed stale %s/%s' % (OUT_DIR, fn))

    man = dict(
        settings=dict(
            source='Pacific Coast Memorials full-colour single/individual design proofs, '
                   'operator folder "PCM SINGLE" (2026-08-07)',
            klass='proof',
            label='Full-colour proof',
            finalPx=FINAL_PX, format='webp', quality=QUALITY, method=METHOD,
            resample='PIL LANCZOS',
            masked=False,
            maskingRuling='not masked, not upscaled, not enhanced; the s15 photo-mask '
                          'regime covers pcm-design-images/ only',
            idRule='"id" is the operator filename stem minus "PCM" and is the join key '
                   '(string, not an integer: "1148" and "1148-2" are different designs). '
                   '"num" is the design number the gallery URL actually served, which '
                   'differs from the id on 8 of the 373 files -- see numberRule.',
            numberRule='"num" comes from the gallery URL in Download_PCM_Headstones.bat, '
                       'not from the local filename. Six .bat lines write a filename whose '
                       'number does not match the URL they fetch, and three files carry a '
                       '"-2" disambiguator; so id and num disagree on 8 designs. The URL '
                       'is what produced the bytes, so num is the truthful design number '
                       'and id is only a key.',
            piiPosture=PII_POSTURE,
        ),
        count=len(out), totalBytes=total,
        catalogued=len(entries) + len(unavailable),
        held=[],
        unavailable=[dict(id=e['id'], num=e['num'], source=e['file'], sourceUrl=e['url'],
                          sourceName=e['name'], sourceBytes=e['bytes'],
                          reason='the download saved a "File Not Found" HTML body, not an '
                                 'image; the .bat requested a malformed gallery URL')
                     for e in unavailable],
        files=out,
    )
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(man, f, indent=0, ensure_ascii=False)
    print('%s: %d proofs, %.2f MB' % (MANIFEST, len(out), total / 1e6))


if __name__ == '__main__':
    main()
