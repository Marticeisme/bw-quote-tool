"""
Fetch the look-alike fonts and PCM's reference alphabets for the Try Your Lettering section
of pcm-design-catalog.html. Reads data/pcm-lettering.json.

    python scripts/prep_pcm_lettering.py

Writes (all committed, all freely licensed or PCM's own sample images):
  fonts/lettering/<slug>.woff          one static face per style, subset to Latin (+ Hebrew for
                                       Frank Ruhl Libre); Google Fonts via the old-browser CSS
                                       (static per-weight .woff, never the variable font: Chrome
                                       prints variable fonts as Type3), TeX Gyre from CTAN
  fonts/lettering/LICENSES.md          family, license, source for every file
  pcm-lettering-images/<slug>.webp     PCM's own alphabet for each style

PCM's own fonts are commercial and are never fetched or stored here. The reference images are
pictures of PCM's alphabets, like the design plates elsewhere in the catalog:
  ref "book": cut from the 2011 design book's Font Styles pages (E:/Downloads/Fonts.pdf,
              pp 109-113), by scratch/pcm-fonts/crop_book.py -> scratch/pcm-fonts/book/
  ref "site": PCM's online sampler (designmemorials.com/fonts-lettering), captured by
              scratch/pcm-fonts/site_peek.mjs -> scratch/pcm-fonts/site/
Re-run those two first if the scratch folders are gone.
"""
import io, json, os, re, sys, urllib.request, urllib.error
from fontTools import subset
from fontTools.ttLib import TTFont
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

DATA = 'data/pcm-lettering.json'
FONT_DIR = 'fonts/lettering'
IMG_DIR = 'pcm-lettering-images'
BOOK_DIR = 'scratch/pcm-fonts/book'
SITE_DIR = 'scratch/pcm-fonts/site'
# An old Chrome gets static per-weight .woff files instead of the variable woff2.
OLD_UA = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.30 (KHTML, like Gecko) Chrome/12.0.742.100 Safari/534.30'
GYRE = {'TeX Gyre Pagella': 'texgyrepagella-regular', 'TeX Gyre Chorus': 'texgyrechorus-mediumitalic',
        'TeX Gyre Schola': 'texgyreschola-regular', 'TeX Gyre Adventor': 'texgyreadventor-bold'}
SWATCH_DIR = 'scratch/granite-booklet/swatches/pcm-site'
GRANITE_DIR = 'pcm-granite-images'
GRANITES = [('Barrell_Gray1.jpg', 'barrell-gray'), ('Absolute_Black1.jpg', 'absolute-black'),
            ('Bahama_Blue1.jpg', 'bahama-blue'), ('Sentinel_Red1.jpg', 'sentinel-red')]
# Book strips are named by the book's own label; these differ from the style names.
BOOK_FILE = {'Government': 'government', 'Monument': 'monument', 'Monument Condensed': 'monument-cond',
             'Special Roman 2': 'special-roman-2-aica', 'Vermarco': 'vermarco'}
SITE_FILE = {'Berling': 'berling', 'Brassboard': 'brassboard', 'Brighton': 'brighton',
             'Century Schoolbook': 'centurynormal', 'Hebrew': 'pcmhebrew', 'Nanum Brush Script': 'nanum-brush-script',
             'New Cicle': 'new-cicle', 'Not Mary Kate': 'notmarykate', 'Nunito Sans': 'nunito-sansi',
             'Ornamental': 'ornamental', 'Zurich': 'zurich'}
# Latin, Latin-1, Latin Extended-A, dashes/quotes/bullet/ellipsis, and the cross and heart
# families sometimes type. Hebrew is added for the Hebrew style only.
LATIN = '0020-007E,00A0-00FF,0100-017F,2010-2027,2030,2032-2033,2122,271D,2764'
HEBREW = '0590-05FF,FB1D-FB4F'


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def face_slug(fam, w, it):
    return f"{slug(fam)}-{w}{'i' if it else ''}"


def get(url, ua=None):
    req = urllib.request.Request(url, headers={'User-Agent': ua or 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def google_woff(fam, w, it, subsets='latin,latin-ext'):
    # The old CSS API serves only the subsets asked for (Latin by default), so ask.
    css = get(f"https://fonts.googleapis.com/css?family={fam.replace(' ', '+')}:{w}{'italic' if it else ''}&subset={subsets}", OLD_UA).decode()
    urls = re.findall(r"url\((https://[^)]+)\)", css)
    if not urls:
        sys.exit(f'no font url for {fam} {w} {it}:\n{css[:400]}')
    if 'italic' not in css and it:
        sys.exit(f'{fam} has no italic {w}; Google answered with the upright')
    return get(urls[0])


LICENSE_NAME = {'ofl': 'SIL Open Font License 1.1', 'apache': 'Apache License 2.0', 'ufl': 'Ubuntu Font Licence 1.0'}


def google_license(fam):
    d = re.sub(r'[^a-z0-9]', '', fam.lower())
    for lic in ('ofl', 'apache', 'ufl'):
        try:
            get(f'https://raw.githubusercontent.com/google/fonts/main/{lic}/{d}/METADATA.pb')
            return LICENSE_NAME[lic], f'https://github.com/google/fonts/tree/main/{lic}/{d}'
        except urllib.error.HTTPError:
            pass
    sys.exit(f'license not found for {fam}')


def subset_to(raw, out, unicodes):
    font = TTFont(io.BytesIO(raw))
    opts = subset.Options()
    opts.flavor = 'woff'
    opts.layout_features = ['*']          # keep kerning, ligatures, swashes, small caps
    opts.name_IDs = ['*']                 # keep the copyright/license name records
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(unicodes=subset.parse_unicodes(unicodes))
    s.subset(font)
    font.flavor = 'woff'
    font.save(out)


def main():
    data = json.load(open(DATA, encoding='utf-8'))
    os.makedirs(FONT_DIR, exist_ok=True)
    os.makedirs(IMG_DIR, exist_ok=True)
    faces, licenses = {}, {}
    for st in data['styles']:
        if st['font']:
            fam, w, it = (st['font'] + [False])[:3]
            key = face_slug(fam, w, it)
            if key not in faces:
                uni = LATIN + (',' + HEBREW if st['name'] == 'Hebrew' else '')
                if fam in GYRE:
                    # CTAN's mirror redirector refuses Python's urllib; fetch these with curl into
                    # scratch/pcm-fonts/gyre/ (curl -sSfL -o ... <url>) and they are read from there.
                    cached = f'scratch/pcm-fonts/gyre/{GYRE[fam]}.otf'
                    raw = open(cached, 'rb').read() if os.path.exists(cached) else \
                        get(f'https://mirrors.ctan.org/fonts/tex-gyre/opentype/{GYRE[fam]}.otf', 'curl/8.4.0')
                    licenses[fam] = ('GUST Font License (free to use, share and modify)', 'https://ctan.org/pkg/tex-gyre')
                else:
                    raw = google_woff(fam, w, it, 'hebrew,latin,latin-ext' if st['name'] == 'Hebrew' else 'latin,latin-ext')
                    if fam not in licenses:
                        licenses[fam] = google_license(fam)
                subset_to(raw, f'{FONT_DIR}/{key}.woff', uni)
                faces[key] = os.path.getsize(f'{FONT_DIR}/{key}.woff')
                print(f'  {key}.woff  {faces[key] // 1024} KB')
        if st['ref']:
            src = (f"{BOOK_DIR}/{BOOK_FILE.get(st['name'], slug(st['name']))}.png" if st['ref'] == 'book'
                   else f"{SITE_DIR}/{SITE_FILE[st['name']]}.png")
            im = Image.open(src).convert('RGB')
            if st['ref'] == 'site':
                # PCM's sampler sets grey type on a pale panel: level it to the same black on
                # white as the book strips (crop_book.py already levels those).
                im = ImageOps.grayscale(im).point(lambda v: 255 if v >= 225 else (0 if v <= 90 else round((v - 90) * 255 / 135)))
                # The site floats a round chat button over the right edge of the page; any
                # ink touching the right edge is that, never the sample.
                a = np.array(im)
                lab, _ = ndimage.label(a < 250)      # include its faint anti-aliased rim
                for i, (ys, xs) in enumerate(ndimage.find_objects(lab), 1):
                    if xs.stop >= a.shape[1] - 2:
                        a[lab == i] = 255
                im = Image.fromarray(a)
            if st['ref'] == 'book' and im.width > 1600:
                im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
            im.save(f"{IMG_DIR}/{slug(st['name'])}.webp", 'WEBP', quality=80, method=6)
    # PCM's swatch photos of the granites the builder offers (Martice, 2026-10-27), saved from
    # designmemorials.com's color pages for the granite booklet.
    os.makedirs(GRANITE_DIR, exist_ok=True)
    for src, out in GRANITES:
        Image.open(f'{SWATCH_DIR}/{src}').convert('RGB').save(f'{GRANITE_DIR}/{out}.webp', 'WEBP', quality=84, method=6)
    with open(f'{FONT_DIR}/LICENSES.md', 'w', encoding='utf-8', newline='\n') as f:
        f.write('# Lettering preview fonts\n\n'
                'Freely licensed look-alikes used by the Try Your Lettering section of\n'
                '`pcm-design-catalog.html` to preview PCM\'s lettering styles. PCM\'s own fonts are\n'
                'commercial and are not in this repository. Each file here is one static face,\n'
                'subset to Latin by `scripts/prep_pcm_lettering.py`; the license travels in the\n'
                'font\'s own name table.\n\n'
                '| Family | License | Source |\n|---|---|---|\n')
        for fam in sorted(licenses):
            f.write(f'| {fam} | {licenses[fam][0]} | {licenses[fam][1]} |\n')
    print(f'{len(faces)} font files, {sum(faces.values()) // 1024} KB; '
          f'{len([s for s in data["styles"] if s["ref"]])} reference images')


if __name__ == '__main__':
    main()
