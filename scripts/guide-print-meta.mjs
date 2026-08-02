// Per-guide metadata for the generated print system (covers + running footer title).
//
// The design rule from the operator's A+ ruling: the cover is ONE shared partial fed
// per-guide metadata, never nineteen hand-authored covers. So almost everything here is
// EXTRACTED from the guide's own masthead at build time — title, kicker and subtitle come
// from the page, which means a guide that gets retitled cannot end up with a cover that
// disagrees with it. Only two things are declared by hand, because neither can be derived:
//
//   HERO   which of the guide's own shipped photographs is dignified at 8.5in wide.
//          A photo has to be a SCENE. Most guide images are product cutouts on white
//          (marker faces, caskets, urns, vaults) — blown up to a full-bleed cover they
//          look like a catalogue, not a family guide. Those guides get the typographic
//          cover instead, which is a deliberate choice and not a fallback for laziness.
//
//   PLACE  the small uppercase line beside the logo. Most guides are about Washington
//          Memorial Park; the ones that are about the funeral home or about the law are
//          not, and saying so would be wrong.
//
// Adding a guide needs no entry here: it gets a typographic cover and the Bonney Watson
// place line until someone declares otherwise.
import fs from 'fs';
import path from 'path';
import { ROOT } from './_print-server.mjs';
import { pluckClass, pluckTag } from './_html-pluck.mjs';

// The nineteen family guides the print system applies to. Lives HERE rather than in the
// build script so verifiers can import the list without executing a generator — importing
// build_guide_print_system.mjs for its list would rewrite all nineteen guides as a side
// effect of asking a question.
export const GUIDES = [
  'veterans-guide.html', 'cemetery-property-guide.html', 'cremation-or-burial-guide.html',
  'markers-guide.html', 'medicaid-family-guide.html', 'medicaid-professional-reference.html',
  'who-decides-guide.html', 'urn-placement-guide.html', 'pre-planning-guide.html',
  'burial-guide.html', 'cremation-guide.html', 'scattering-guide.html',
  'direct-cremation.html', 'vault-guide.html', 'outside-marker-rules.html',
  'terramation-guide.html', 'granite-niches-guide.html', 'glass-front-niches-guide.html',
  'urn-gardens-guide.html',
];

// Only genuine scene photography. Verified by eye at cover size, not picked by filename.
export const HERO = {
  'granite-niches-guide.html':     'granite-niche-images/roac-courtyard.jpg',
  'glass-front-niches-guide.html': 'glass-niche-images/ecl-columbarium.jpg',
  'urn-gardens-guide.html':        'urn-garden-images/lug-lake-fountains.jpg',
  'terramation-guide.html':        'terramation-images/memorial-lawn-tree.jpg', // operator-supplied cover, 2026-08-01
};

export const PLACE = {
  'medicaid-professional-reference.html': 'Bonney Watson',
  'medicaid-family-guide.html':           'Bonney Watson',
  'who-decides-guide.html':               'Washington State Law',
  'cremation-guide.html':                 'Bonney Watson',
  'direct-cremation.html':                'Bonney Watson',
  'burial-guide.html':                    'Bonney Watson',
  'pre-planning-guide.html':              'Bonney Watson',
  'cremation-or-burial-guide.html':       'Bonney Watson',
  'vault-guide.html':                     'Bonney Watson',
};
export const PLACE_DEFAULT = 'Washington Memorial Park';

const strip = (s) => (s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')
  .replace(/\s+/g, ' ').trim();

/** Pull the masthead copy out of the guide itself. `.cover` on eighteen guides,
 *  `.hero` on vault-guide.html — the same split verify_print_header.mjs already knows.
 *  Returns raw HTML as well as text: the cover keeps the guide's own <br> and <em>. */
export function extract(file) {
  // Read the guide with any previously-generated block removed, so a re-run always
  // extracts from the AUTHORED masthead and never from the last cover it emitted.
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8')
    .replace(/<!-- BW:PRINT-SYSTEM:START[\s\S]*?BW:PRINT-SYSTEM:END -->/g, '');
  const masthead = pluckClass(html, 'cover') ?? pluckClass(html, 'hero') ?? html;

  const titleHtml = (pluckTag(masthead, 'h1') ?? '').trim();
  const subHtml = (pluckClass(masthead, 'cover-sub') ?? pluckClass(masthead, 'hero-sub') ?? '').trim();
  const kicker = strip(pluckClass(masthead, 'cover-kicker') ?? pluckClass(masthead, 'hero-kicker'));

  const title = strip(titleHtml)
    || strip((html.match(/<title>([^<]*)<\/title>/) || [, ''])[1]).replace(/\s*[·&]\s*(?:middot;\s*)?Bonney Watson$/, '');

  return {
    file,
    title,
    titleHtml: titleHtml || title,
    sub: strip(subHtml),
    subHtml,
    kicker: kicker || 'A Bonney Watson Family Guide',
    place: PLACE[file] || PLACE_DEFAULT,
    hero: HERO[file] || null,
  };
}
