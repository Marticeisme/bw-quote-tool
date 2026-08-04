/**
 * The three photographic walkthroughs, as data.
 *
 * Sprint-10 built one of these (the Chapel of Memory) with the scene's identity hard-coded
 * through the builder, the gate and the path module. Sprint-14 adds two more, so the identity
 * moved here: one table, read by scripts/build_walkthrough.mjs, scripts/verify_walkthrough.mjs,
 * scripts/build_walkthrough_path.mjs and tests/test-walkthrough-path.mjs. A scene that ships
 * is a scene all four of those see.
 *
 * DELISTED BY DESIGN. None of these pages is linked from any family-facing surface. The
 * operator looks at a reel before it is offered to a family; linking is a separate, later,
 * deliberate act. tests/test-family-register.mjs asserts the absence of every inbound link,
 * and each gate re-asserts it. Direct URL access is intentionally unaffected.
 */
export const SCENES = {
  COM: {
    key: 'COM',
    page: 'MAPS/COM_Walkthrough.html',
    asset: 'COM_Walkthrough.splat',
    pathFile: 'com-walkthrough-path.json',
    title: 'Chapel of Memory Mausoleum',
    subtitle: 'Photographic preview &middot; Washington Memorial Park',
    docTitle: 'Bonney Watson — Chapel of Memory Mausoleum: Photographic Preview',
    // What the note calls the place, in a sentence.
    what: 'the inside of the building',
    sibling: { href: 'COM_CryptMap.html', label: 'Crypt &amp; Niche Map', text: 'Crypt &amp; Niche Map' },
    // What the sibling map is called in prose, and what it is good for.
    siblingProse: 'crypt and niche availability, locations and pricing',
    source: 'Chapel of Memories walkthrough, 2026-08-03 12:27',
  },
  TG: {
    key: 'TG',
    page: 'MAPS/TG_Walkthrough.html',
    asset: 'TG_Walkthrough.splat',
    pathFile: 'tg-walkthrough-path.json',
    title: 'Terrace Garden Mausoleum &amp; Memorial Path',
    subtitle: 'Photographic preview &middot; Washington Memorial Park',
    docTitle: 'Bonney Watson — Terrace Garden Mausoleum & Memorial Path: Photographic Preview',
    what: 'the mausoleum and the memorial path beside it',
    sibling: { href: 'TGMP_Map.html', label: 'Terrace Garden Map', text: 'Terrace Garden Map' },
    siblingProse: 'niche and memorial availability, locations and pricing',
    source: 'Terrace Garden Memorial Path walkthrough, 2026-08-03 12:06',
  },
  ELM: {
    key: 'ELM',
    page: 'MAPS/ELM_Walkthrough.html',
    asset: 'ELM_Walkthrough.splat',
    pathFile: 'elm-walkthrough-path.json',
    title: 'Eternal Light Mausoleum &amp; Columbarium',
    subtitle: 'Photographic preview &middot; Washington Memorial Park',
    docTitle: 'Bonney Watson — Eternal Light Mausoleum & Columbarium: Photographic Preview',
    what: 'the mausoleum and the columbarium room inside it',
    sibling: { href: 'ECL_NicheMap.html', label: 'Columbarium Niche Map', text: 'Columbarium Niche Map' },
    siblingProse: 'niche availability, locations and pricing',
    source: 'Eternal Light Mausoleum walkthrough, 2026-08-03 12:17',
  },
};

export const SCENE_KEYS = Object.keys(SCENES);

/** Resolve a scene by key, with a usage error rather than `undefined.page` five frames later. */
export function scene(key) {
  const s = SCENES[String(key || '').toUpperCase()];
  if (!s) throw new Error(`unknown scene "${key}" — expected one of ${SCENE_KEYS.join(', ')}`);
  return s;
}
