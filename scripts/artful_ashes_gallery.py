"""
Artful Ashes color galleries for urns-guide.html and keepsake-urns-guide.html.

Source: E:\\Downloads\\ArtfulAshes\\{Hearts,Orbs,Starfish,Filllable Urns} (Artful Ashes'
own product photos). Every photo was looked at on 2026-11-16 before it went in; the
EXCLUDE list is what was left out and why. Never let an engraved name, a certificate or
a person reach a family page.

Writes resized photos + thumbnails, tags each Artful Ashes card with data-gallery, adds a
"See N colors" badge on the card, and a thumbnail strip in the product modal that swaps
the large photo (the existing click-to-enlarge lightbox follows the swap).
Idempotent. Run from the repo root:  python scripts/artful_ashes_gallery.py
"""
import html, io, os, re, sys
from PIL import Image

SRC = r'E:\Downloads\ArtfulAshes'
EXCLUDE = {
    '4-298x300-1.jpg': 'hand held against the sky; tiny file; a star in the Orbs folder',
    'Artful-Ashes-Puget-Sound-Cert-Proof-99.jpg': 'certificate with signatures and names',
    'ArtfulAshes_May2019_AlecMiller_12_Printing-91-1-scaled.jpg': 'mixed group shot on black',
    'img_4373-2.jpg': 'engraved pet name',
    'img_4481.jpeg': 'engraved "Dad"',
    'ArtfulAshes_Starfish_ScreenSize-17-300x240.jpg': 'tiny file',
    'Urn-Tab-Images-22-858x1024.jpg': 'duplicate of Urn-Tab-Images-22.jpg',
    'Urn-Tab-Images-4.jpg': 'bottom view, fill plug',
    'Urn-Tab-Images-5.jpg': 'bottom view, fill plug',
    'image1-scaled.jpeg': 'studio/shop interior',
}
# card data-item -> (source folder, output dir, file prefix, card name)
PRODUCTS = {
    'artful-ashes-heart':   ('Hearts',         'keepsake-images/artful-ashes', 'heart'),
    'artful-ashes-orb':     ('Orbs',           'keepsake-images/artful-ashes', 'orb'),
    'artful-ashes-star':    ('Starfish',       'keepsake-images/artful-ashes', 'star'),
    'artful-ashes-orb-urn': ('Filllable Urns', 'urn-images/artful-ashes',      'orb-urn'),
}
PAGES = ['urns-guide.html', 'keepsake-urns-guide.html']
BIG, THUMB = 1000, 150

def read(p):  return io.open(p, 'r', encoding='utf-8', newline='').read().replace('\r\n', '\n')
def write(p, s): io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('\r\n', '\n'))

def colour_caption(fname):
    # Only Artful Ashes' own colour-named files ("Amber-Brown-Gold-Orb_LowRes-14.jpg").
    m = re.match(r'^([A-Za-z-]+?)(?:-(?:Orb|Heart))?_LowRes', fname)
    if not m: return ''
    words = [w for w in m.group(1).split('-') if w and w not in ('Orb', 'Heart', 'Double', 'Ash')]
    if not words: return ''
    return ', '.join(words[:-1]) + (' & ' if len(words) > 1 else '') + words[-1]

def build_images():
    out = {}
    for item, (folder, outdir, prefix) in PRODUCTS.items():
        os.makedirs(outdir, exist_ok=True)
        src = os.path.join(SRC, folder)
        files = sorted(f for f in os.listdir(src) if f not in EXCLUDE and f.lower().endswith(('.jpg', '.jpeg')))
        lst = []
        for i, f in enumerate(files, 1):
            big = '%s/%s-%02d.jpg' % (outdir, prefix, i)
            th  = '%s/%s-%02d-t.jpg' % (outdir, prefix, i)
            if not (os.path.exists(big) and os.path.exists(th)):
                im = Image.open(os.path.join(src, f)).convert('RGB')
                b = im.copy(); b.thumbnail((BIG, BIG), Image.LANCZOS); b.save(big, quality=82, optimize=True, progressive=True)
                # square-ish centre crop for the thumbnail strip
                w, h = im.size; s = min(w, h)
                t = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
                t.thumbnail((THUMB, THUMB), Image.LANCZOS); t.save(th, quality=78, optimize=True)
            lst.append((big, th, colour_caption(f)))
        out[item] = lst
        print('%-22s %2d photos (%d excluded in folder)' % (item, len(lst), sum(1 for f in os.listdir(src) if f in EXCLUDE)))
    return out

CSS = """/* aa-gallery:css */
.product-gallery-badge{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:3px 10px;border-radius:12px;background:var(--orange);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.01em;}
.product-gallery-badge svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.aa-gallery{margin:4px 0 18px;}
.aa-gallery h4{font-family:'Source Sans 3',sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin:0 0 8px;}
.aa-gallery-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;}
.aa-gallery-strip button{padding:0;border:2px solid transparent;border-radius:6px;background:none;cursor:pointer;aspect-ratio:1/1;overflow:hidden;}
.aa-gallery-strip button.on{border-color:var(--orange);}
.aa-gallery-strip img{width:100%;height:100%;object-fit:cover;display:block;border-radius:4px;}
.aa-gallery-cap{font-size:12.5px;color:var(--text-muted);margin-top:6px;min-height:1.2em;}
@media print{.product-gallery-badge,.aa-gallery{display:none!important;}}
/* aa-gallery:css-end */
"""

JS = """<script>
/* aa-gallery:js — color gallery in the product modal for cards with data-gallery */
(function(){
  var specs = document.getElementById('modalSpecs'), mImg = document.getElementById('modalImg');
  if (!specs || !mImg) return;
  var box = document.createElement('div'); box.className = 'aa-gallery'; box.hidden = true;
  specs.parentNode.insertBefore(box, specs);
  document.querySelectorAll('.product-card').forEach(function(card){
    card.addEventListener('click', function(){
      var g = card.getAttribute('data-gallery');
      box.innerHTML = '';
      if (!g){ box.hidden = true; return; }
      box.hidden = false;
      var items = g.split('|').map(function(x){ var p = x.split('~'); return { big:p[0], th:p[1], cap:p[2]||'' }; });
      var name = (card.querySelector('.product-name')||{}).textContent || '';
      var h = document.createElement('h4'); h.textContent = items.length + ' color & pattern examples'; box.appendChild(h);
      var strip = document.createElement('div'); strip.className = 'aa-gallery-strip'; box.appendChild(strip);
      var cap = document.createElement('div'); cap.className = 'aa-gallery-cap'; box.appendChild(cap);
      items.forEach(function(it, i){
        var b = document.createElement('button'); b.type = 'button';
        b.setAttribute('aria-label', name + ' example ' + (i+1) + (it.cap ? ' (' + it.cap + ')' : ''));
        var t = document.createElement('img'); t.src = it.th; t.alt = ''; t.loading = 'lazy'; b.appendChild(t);
        b.addEventListener('click', function(e){
          e.stopPropagation();
          mImg.src = it.big; mImg.alt = name + (it.cap ? ' \\u2014 ' + it.cap : '');
          var on = strip.querySelector('.on'); if (on) on.classList.remove('on'); b.classList.add('on');
          cap.textContent = it.cap ? it.cap : 'Example ' + (i+1) + ' of ' + items.length;
        });
        strip.appendChild(b);
      });
      cap.textContent = 'Tap a photo to see it larger.';
    });
  });
})();
</script>
<!-- aa-gallery:js-end -->
"""

BADGE_ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'

def patch(path, gal):
    s = read(path)
    s = re.sub(r'/\* aa-gallery:css \*/[\s\S]*?/\* aa-gallery:css-end \*/\n', '', s)
    i = s.index('</style>'); s = s[:i] + CSS + s[i:]
    s = re.sub(r'<script>\n/\* aa-gallery:js[\s\S]*?<!-- aa-gallery:js-end -->\n', '', s)
    j = s.rindex('</body>'); s = s[:j] + JS + s[j:]
    n = 0
    def fix(m):
        nonlocal n
        block = m.group(0)
        op = re.match(r'<div class="product-card"[^>]*>', block).group(0)
        item = re.search(r'data-item="([^"]+)"', op).group(1)
        new_op = re.sub(r' data-gallery="[^"]*"', '', op)
        block = new_op + block[len(op):]
        block = re.sub(r'\n?\s*<div class="product-gallery-badge">.*?</div>', '', block)
        if item not in gal: return block
        val = '|'.join('%s~%s~%s' % (b, t, c) for b, t, c in gal[item])
        block = block.replace(new_op, new_op[:-1] + ' data-gallery="%s">' % html.escape(val, quote=True), 1)
        badge = '<div class="product-gallery-badge">%sSee %d colors</div>' % (BADGE_ICON, len(gal[item]))
        block = re.sub(r'(\n(\s*)<div class="product-meta">)', lambda mm: '\n%s%s%s' % (mm.group(2), badge, mm.group(1)), block, count=1)
        n += 1
        return block
    s = re.sub(r'<div class="product-card"[\s\S]*?</label>\s*</div>\s*</div>', fix, s)
    write(path, s)
    print('%s: %d Artful Ashes cards given a gallery' % (path, n))

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    gal = build_images()
    for p in PAGES: patch(p, gal)
