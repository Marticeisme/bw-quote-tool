/* guide-nav.js — the left sidebar for guides.html, the family-guides hub.
 *
 * ONE file is the whole feature. Every in-scope page carries exactly one line:
 *
 *     <script src="guide-nav.js" defer></script>
 *
 * and nothing else: this script injects its own <style>, its own <nav>, and on small
 * screens a menu button plus a backdrop. Nothing is added to the 34 pages beyond that
 * single tag, so the sidebar can be restyled or retired in one place.
 *
 * HUB ONLY (s25). The operator's ruling: the sidebar belongs on the hub and nowhere
 * else. A guide page is something a family reads; a second navigation rail down its
 * left side competes with the guide's own contents bar and its own header.
 *
 * The gate for that lives HERE, in the script, not in the page wiring. Every page keeps
 * its one tag and every generator keeps emitting it; the script decides. Two reasons.
 * First, unwiring 33 pages means editing five generators and re-running five builds, and
 * a page that got missed shows a sidebar nobody asked for. Second, turning the sidebar
 * back on for guide pages later is then one line here instead of another 33-file sweep.
 * The tag is the wiring; this function is the ruling.
 *
 * WHY THE CSS LIVES HERE AND NOT IN A STYLESHEET. The pages are hand-kept and generated
 * in five different ways; a second <link> would have to be threaded through every
 * generator too, and a page that got the script but not the stylesheet would render an
 * unstyled list on top of the cover. One tag cannot half-apply.
 *
 * SKIN — guides.html's own, quoted rather than approximated. Now that the panel renders
 * on exactly one page it can stop being a generic list that had to survive 34 different
 * skins, and become part of THAT page:
 *
 *   - The masthead is the site header's left cap. Same navy (--navy-900 #1c2c36), the
 *     same 74px height, so the navy runs unbroken across the top of the screen and the
 *     panel's top edge and the header's bottom edge are one line. It carries the real
 *     brand lockup — logo.svg, the white-on-navy file guides.html's own <header> uses —
 *     over `Est. 1868` in Cormorant italic, which is the exact treatment the prose
 *     guides' .site-nav carries.
 *   - The panel surface is the page's paper (#f4efe6), not a separate cream, with the
 *     card keyline (#e7dcc7) as its right edge. The sidebar is the page continuing left.
 *   - Section headings are guides.html's .category-header, verbatim: Cormorant in the
 *     serif ink #2c4a5a, and the rule that fades out to the right. Not its count pill:
 *     the nav counts PAGES and the cards count CARDS, and they legitimately differ.
 *   - Orange lands the way the cards land it: on hover, one item at a time, plus the
 *     current page's left edge. Nothing is orange at rest.
 *   - The current item is a card — white, the card keyline, the card shadow — because
 *     that is what "this one" looks like everywhere else on the page.
 *
 * Values are hardcoded rather than read from :root: the pages do NOT agree on their
 * token names (prose guides --navy/--orange, guides.html --bw-navy/--navy-500, catalogs
 * --paper/--card), so a var() reference would resolve differently or not at all. These
 * are guides.html's values; if that page's tokens move, move these with them.
 *
 * NAMESPACE. Everything is `gnav-` / `#bwGuideNav*`. In particular this file must never
 * use the bare class `.sidebar` — the prose guides already use `.sidebar` for the warm
 * pull-out boxes inside their prose, and styling that would repaint real page content.
 *
 * PRINT AND PDF. The sidebar is screen-only. Every injected node is hidden under
 * `@media print` and carries data-pdf="drop" for the guide-PDF pipeline, and the
 * body offset is zeroed in print so the printed page is byte-for-byte what it was.
 *
 * THE FAMILY-VIEW BAIL-OUT. pcm-design-catalog.html?family is a deliberately
 * navigation-free link the operator hands a family: build_pcm_catalog.py emits a head
 * script that sets <html class="family-view"> and hides the page's own back link and
 * footer. Injecting a sidebar there would put every link back. The bail-out is kept and
 * still applies to the hub: guides.html?family is navigation-free too. It matches the
 * head script's regex EXACTLY, so the lookalike `?familyx=1` is not a family view here
 * either, just as it is not there.
 */
(function () {
  'use strict';

  // Same test as the head script in build_pcm_catalog.py. Keep them identical.
  var FAMILY_RE = /[?&]family(=|&|$)/;

  /* ---------------------------------------------------------------- NAV MODEL
   * Sections mirror guides.html's own category groupings — the same names, in the
   * same order, with the pages in the order guides.html lists their cards. This is
   * deliberately NOT a new taxonomy: two places that group the same guides
   * differently is how a counselor stops trusting either one.
   *
   * Departures from guides.html, all of them forced:
   *   - markers-guide.html has TWO cards there ("Marker Sizes & Colors" and "Marker
   *     Photos, Etching & Photo Sizes") pointing at one page. A nav lists a page once.
   *   - flush-markers.html has NO card at all (the s24 orphan finding). It gets a home
   *     here, under Markers & Memorials, next to the other marker-type guides.
   *   - The General Price List card opens viewer.html and medicaid-professional-reference
   *     is the internal reference; neither is in scope and neither is family-facing, so
   *     neither appears.
   *   - The "Letters & Forms" category is operator tooling (worksheet, deed letter,
   *     payment letter, follow-up emails). It is out of scope for the sidebar and is
   *     shown on a screen a family is looking at, so the whole category is omitted.
   *     Flagged to the operator rather than decided permanently.
   *
   * Labels are short PAGE NAMES, not descriptions, and follow the guides voice rules:
   * no em dashes, family-facing words only.
   */
  var NAV = [
    { name: 'Getting Started', items: [
      { href: 'what-to-do-first-guide.html',    label: 'What to Do First' },
      { href: 'death-certificates-guide.html',  label: 'Death Certificates' },
      { href: 'pre-planning-guide.html',        label: 'Pre-Planning' },
      { href: 'who-decides-guide.html',         label: 'Who Decides' },
      { href: 'cemetery-property-guide.html',   label: 'Cemetery Property' },
      { href: 'granite-niches-guide.html',      label: 'Granite Niches' },
      { href: 'glass-front-niches-guide.html',  label: 'Glass-Front Niches' },
      { href: 'roac-guide.html',                label: 'Rock of Ages Columbarium' },
      { href: 'mvc-niches-guide.html',          label: 'Mountain View Niches' },
      { href: 'ecl-guide.html',                 label: 'Eternal Light Columbarium' },
      { href: 'gomn-guide.html',                label: 'Garden of Meditation Niches' },
      { href: 'terrace-garden-guide.html',      label: 'Terrace Garden Memorial Path' },
      { href: 'urn-gardens-guide.html',         label: 'Urn Gardens' },
      { href: 'veterans-guide.html',            label: 'Veterans' },
      { href: 'medicaid-family-guide.html',     label: 'Medicaid and Planning Ahead' },
      { href: 'inman-travel-plan-guide.html',   label: 'Travel Plan by Inman' }
    ] },
    { name: 'Burial & Cremation', items: [
      { href: 'cremation-or-burial-guide.html', label: 'Cremation or Burial' },
      { href: 'burial-guide.html',              label: 'Burial' },
      { href: 'cremation-guide.html',           label: 'Cremation' },
      { href: 'terramation-guide.html',         label: 'Terramation' }
    ] },
    { name: 'Markers & Memorials', items: [
      { href: 'markers-guide.html',             label: 'Granite Markers' },
      { href: 'bronze-markers-guide.html',      label: 'Bronze Markers' },
      { href: 'flush-markers.html',             label: 'Flush Markers' },
      { href: 'outside-marker-rules.html',      label: 'Outside Marker Rules' },
      { href: 'pcm-design-catalog.html',        label: 'PCM Design Catalog' }
    ] },
    { name: 'Caskets, Urns & Vaults', items: [
      { href: 'vault-guide.html',                             label: 'Burial Vaults' },
      { href: 'metal-caskets.html',                           label: 'Metal Caskets' },
      { href: 'wood-caskets.html',                            label: 'Wood Caskets' },
      { href: 'all-caskets.html',                             label: 'All Caskets' },
      { href: 'urns-guide.html',                              label: 'Urn Catalog' },
      { href: 'keepsake-urns-guide.html',                     label: 'Keepsake Urns' },
      { href: 'cremation-containers-rental-caskets.html',     label: 'Containers and Rental Caskets' }
    ] },
    { name: 'Maps', items: [
      { href: 'MAPS/MVC_NewGlassFront_NicheMap_1.html', label: 'Mountain View Niche Map' },
      { href: 'MAPS/ROAC_NicheMap.html',                label: 'Rock of Ages Niche Map' },
      { href: 'MAPS/ECL_NicheMap.html',                 label: 'Eternal Light Niche Map' },
      { href: 'MAPS/COM_CryptMap.html',                 label: 'Chapel of Memory Crypt Map' },
      { href: 'MAPS/COM_Walkthrough.html',              label: 'Chapel of Memory Walkthrough' },
      { href: 'MAPS/ELM_Walkthrough.html',              label: 'Eternal Light Walkthrough' },
      { href: 'urn-placement-guide.html',               label: 'Urn Placement Options' },
      { href: 'scattering-guide.html',                  label: 'Scattering Garden Options' },
      { href: 'MAPS/GOMN_NicheMap.html',                label: 'Garden of Meditation Niche Map' },
      { href: 'MAPS/TGMP_Map.html',                     label: 'Terrace Garden Property Map' }
    ] },
    { name: 'Sample Quotes', items: [
      { href: 'direct-cremation.html',          label: 'Direct Cremation Plan' }
    ] }
  ];

  // The hub. Sits above the sections as its own row, not inside a category.
  var HOME = { href: 'guides.html', label: 'All Guides' };

  // Exported for the gate (scripts/verify_guide_nav.mjs) so the model is asserted
  // from its single source rather than restated in a second list that can drift.
  try { window.BW_GUIDE_NAV = { home: HOME, sections: NAV }; } catch (e) {}

  var BREAK = 1100;   // desktop sidebar at/above this, drawer below it
  var WIDTH = 264;    // px
  var HEAD_H = 74;    // px — guides.html's own .header-inner height. Keep them equal.

  var CSS = [
    /* Tokens are scoped to the injected subtree so they cannot collide with a page's
       own --navy / --orange / --rule, which differ page to page. Every value here is
       guides.html's: --navy-900, --bw-orange, --paper, --card, --card-border,
       --serif-ink, --pill-bg, --pill-ink, --sh-1, --ring. */
    '#bwGuideNav,#bwGuideNavToggle,#bwGuideNavBackdrop{',
    '--gn-navy:#466e86;--gn-navy-deep:#1c2c36;',
    '--gn-orange:#e84610;--gn-orange-press:#c73a0c;',
    '--gn-paper:#f4efe6;--gn-card:#fff;--gn-card-border:#e7dcc7;',
    '--gn-serif-ink:#2c4a5a;--gn-body:#5a6b73;--gn-fade:#d9cdb6;',
    '--gn-pill-bg:#ece2cf;--gn-pill-ink:#a08c6a;',
    '--gn-sh1:0 1px 2px rgba(22,36,44,.06);',
    '--gn-w:' + WIDTH + 'px;--gn-head-h:' + HEAD_H + 'px;',
    'font-family:"Source Sans 3",system-ui,-apple-system,sans-serif;',
    'box-sizing:border-box;-webkit-font-smoothing:antialiased}',
    '#bwGuideNav *,#bwGuideNavToggle *{box-sizing:border-box}',

    /* ---- the panel ---- */
    '#bwGuideNav{position:fixed;top:0;left:0;bottom:0;width:var(--gn-w);z-index:900;',
    'background:var(--gn-paper);border-right:1px solid var(--gn-card-border);',
    'overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;',
    'transform:translateX(-100%);transition:transform .22s ease;',
    'box-shadow:0 0 30px rgba(22,36,44,.18);display:flex;flex-direction:column;',
    'scrollbar-width:thin;scrollbar-color:#d9cdb6 transparent}',
    '#bwGuideNav.gnav-open{transform:translateX(0)}',
    '#bwGuideNav::-webkit-scrollbar{width:9px}',
    '#bwGuideNav::-webkit-scrollbar-thumb{background:#ddd2be;border-radius:9px;',
    'border:3px solid var(--gn-paper)}',

    /* ---- masthead: the left cap of guides.html's own header ----
       Same navy, same 74px, so the two read as one band and the panel's top edge lines
       up with the header's bottom edge. The lockup is the site's, not a substitute for
       it: logo.svg over `Est. 1868` in the prose guides' Cormorant italic. */
    /* align-items:flex-start with a 22px top pad, NOT center: it puts the 30px logo at
       22..52px, whose centre is 37px — the same centre as the header's own 34px logo in
       its 74px bar. Centring the two-line lockup instead floats the logo ~7px high, and
       two copies of the same mark at two heights on one navy band is the first thing the
       eye catches. `Est. 1868` hangs below inside the remaining 22px. */
    '.gnav-head{background:var(--gn-navy-deep);height:var(--gn-head-h);flex-shrink:0;',
    'display:flex;align-items:flex-start;padding:22px 20px 0;',
    /* STICKY, not merely flex-shrink:0. The scroll container is the panel itself, so a
       static masthead scrolls out of the top of it — and once the masthead is the left
       cap of a STICKY site header, scrolling it away leaves paper butted against navy
       across the top of the screen. Sticky pins it; the items pass underneath and the
       existing drop shadow reads as the edge they pass under. */
    'box-shadow:0 2px 12px rgba(0,0,0,.18);position:sticky;top:0;z-index:2}',
    '.gnav-brand{display:block;text-decoration:none;line-height:1}',
    '.gnav-brand .gnav-logo{height:30px;width:auto;display:block}',
    '.gnav-brand .gnav-est{font-family:"Cormorant Garamond",Georgia,serif;font-size:12px;',
    'font-style:italic;color:rgba(255,255,255,.5);display:block;margin-top:5px;',
    'letter-spacing:.04em}',
    '.gnav-brand:hover .gnav-est{color:rgba(255,255,255,.78)}',

    '.gnav-body{padding:6px 0 34px;flex:1}',

    /* ---- the hub row ----
       The current-page bar is a real 3px left BORDER, not an inset box-shadow. An inset
       shadow is painted inside the padding box and clipped to its own square corners, so
       against a 10px radius it showed as an orange crescent leaking past the card's
       rounded left edge — obvious at 3x and just "smudged" at 1x. Carrying the 3px in the
       resting border keeps the label on one x-position whether it is current or not. */
    '.gnav-home{display:block;position:relative;margin:14px 16px 4px;',
    'padding:10px 14px 10px 12px;border-radius:10px;font-size:13px;font-weight:600;',
    'letter-spacing:.02em;text-decoration:none;color:var(--gn-serif-ink);',
    'background:transparent;border:1px solid transparent;border-left:3px solid transparent;',
    'transition:color .12s ease,background .12s ease,border-color .12s ease}',
    '.gnav-home:hover{color:var(--gn-orange)}',
    '.gnav-home.gnav-active{background:var(--gn-card);border-color:var(--gn-card-border);',
    'border-left-color:var(--gn-orange);box-shadow:var(--gn-sh1)}',
    '.gnav-home.gnav-active:hover{color:var(--gn-serif-ink)}',

    /* ---- section heading: guides.html's .category-header at panel scale ----
       Serif name, then the same rule that fades out to the right. Deliberately WITHOUT
       the page's count pill: the nav lists PAGES and the page's cards count CARDS, and
       they legitimately differ (markers-guide.html has two cards and one page; the price
       list and the internal reference have cards and no nav entry). The first render put
       `Getting Started 14` in the sidebar three inches from the quick-jump's
       `Getting Started 16` — two numbers for one category on one screen, which reads as
       a bug whichever one you believe. The rule carries the style; the number is the
       part that could not be true twice. */
    '.gnav-sec{margin-top:22px}',
    '.gnav-sec-head{display:flex;align-items:center;gap:11px;padding:0 20px 9px}',
    '.gnav-sec-name{font-family:"Cormorant Garamond",Georgia,serif;font-size:16.5px;',
    'font-weight:600;color:var(--gn-serif-ink);white-space:nowrap;line-height:1.1}',
    '.gnav-sec-rule{flex:1;height:1px;min-width:10px;',
    'background:linear-gradient(90deg,var(--gn-fade),transparent)}',

    '.gnav-sec ul{list-style:none;margin:0;padding:0}',
    '.gnav-sec li{margin:0;padding:0}',
    '.gnav-sec li::before{content:none}',   /* prose guides style bare <li> — neutralise */
    '.gnav-link{display:block;padding:7px 18px 7px 17px;font-size:13.5px;line-height:1.4;',
    'color:var(--gn-body);text-decoration:none;border-left:3px solid transparent;',
    'transition:background .12s ease,color .12s ease,border-color .12s ease}',
    '.gnav-link:hover{background:rgba(255,255,255,.6);color:var(--gn-orange);',
    'border-left-color:var(--gn-fade)}',
    '.gnav-link.gnav-active{background:var(--gn-card);color:var(--gn-serif-ink);',
    'font-weight:600;border-left-color:var(--gn-orange);',
    'box-shadow:inset -1px 0 0 var(--gn-card-border),var(--gn-sh1)}',
    '.gnav-link.gnav-active:hover{color:var(--gn-serif-ink)}',
    /* The items are full-bleed rows, so an OUTSET ring is clipped away at both panel
       edges and shows as two loose horizontal bars. Drawn inside with a negative offset
       it reads as a ring on all four sides, and it follows the hub row's radius. The
       floating toggle is a circle with room around it, so that one keeps the outset. */
    '#bwGuideNav a:focus-visible{outline:2px solid var(--gn-navy);outline-offset:-3px;',
    'box-shadow:none}',
    '.gnav-home.gnav-active:focus-visible{outline-offset:-4px}',
    '#bwGuideNavToggle:focus-visible{outline:0;box-shadow:0 0 0 3px rgba(70,110,134,.55)}',

    /* ---- the phone/tablet controls ---- */
    /* Bottom-LEFT on purpose. Top-left would sit on the sticky navy header's logo on
       every prose guide, and bottom-right is already taken (flush-markers.html parks a
       fixed .action-bar there). While the drawer is open the button steps to the right
       of the 250px panel and becomes the close control — parked over the panel it hid a
       nav item, which the first phone render caught. */
    '#bwGuideNavToggle{position:fixed;left:14px;bottom:14px;z-index:902;width:46px;height:46px;',
    'border-radius:50%;border:1px solid rgba(255,255,255,.18);background:var(--gn-navy-deep);',
    'color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;',
    'box-shadow:0 4px 16px rgba(22,36,44,.34);padding:0;',
    'transition:background .14s,left .22s ease}',
    '#bwGuideNavToggle.gnav-open{left:calc(var(--gn-w) + 14px)}',
    '#bwGuideNavToggle:hover{background:var(--gn-navy)}',
    '#bwGuideNavToggle svg{width:20px;height:20px;display:block;pointer-events:none}',
    '#bwGuideNavBackdrop{position:fixed;inset:0;z-index:899;background:rgba(22,36,44,.45);',
    'opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s ease}',
    '#bwGuideNavBackdrop.gnav-open{opacity:1;visibility:visible}',

    /* ---- desktop: always there, page shifted right ---- */
    '@media (min-width:' + BREAK + 'px){',
    'html.gnav-on body{padding-left:var(--gn-w,' + WIDTH + 'px)}',
    '#bwGuideNav{transform:translateX(0);box-shadow:none}',
    '#bwGuideNavToggle,#bwGuideNavBackdrop{display:none}',
    /* The sidebar masthead carries the lockup, so the page header dropping its own
     * copy (operator ruling 2026-08-20: one mark on the navy band, the sidebar's).
     * Scoped to gnav-on + desktop: the drawer breakpoint and the family view keep
     * the header's logo, so no state ever shows zero marks. .header-div is the
     * divider that would otherwise strand at the left edge. */
    'html.gnav-on .site-header .header-logo,html.gnav-on .site-header .header-div{display:none}',
    '}',

    /* ---- reduced motion ---- */
    '@media (prefers-reduced-motion:reduce){',
    '#bwGuideNav,#bwGuideNavBackdrop,.gnav-link,.gnav-home,#bwGuideNavToggle{transition:none!important}',
    '}',

    /* ---- print: the sidebar does not exist ---- */
    '@media print{',
    '#bwGuideNav,#bwGuideNavToggle,#bwGuideNavBackdrop{display:none!important}',
    'html.gnav-on body{padding-left:0!important}',
    '}'
  ].join('');

  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true">';
  var ICON_MENU  = SVG + '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ICON_CLOSE = SVG + '<path d="M6 6l12 12M18 6L6 18"/></svg>';

  var el = function (tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (kids) kids.forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  };

  // The page a href points at, as a bare lowercase file name. Query and hash are
  // dropped so `pcm-design-catalog.html?family` and the plain page compare equal.
  var fileOf = function (p) {
    p = String(p).split('#')[0].split('?')[0];
    var i = p.lastIndexOf('/');
    return (i >= 0 ? p.slice(i + 1) : p).toLowerCase();
  };

  function build() {
    var here = fileOf(location.pathname) || 'guides.html';

    var nav = el('nav', {
      id: 'bwGuideNav',
      'data-pdf': 'drop',
      'aria-label': 'Guides and catalogs',
      tabindex: '-1'
    });

    // The masthead carries the real lockup. logo.svg is the white-on-navy file
    // guides.html's own <header> uses; logo-navy.svg is the dark-on-light one its footer
    // uses, and it would disappear against this block.
    var brand = el('a', { class: 'gnav-brand', href: HOME.href }, [
      el('img', { class: 'gnav-logo', src: 'logo.svg', alt: 'Bonney Watson' }),
      el('span', { class: 'gnav-est' }, ['Est. 1868'])
    ]);
    nav.appendChild(el('div', { class: 'gnav-head' }, [brand]));

    var body = el('div', { class: 'gnav-body' });

    var home = el('a', {
      class: 'gnav-home' + (here === fileOf(HOME.href) ? ' gnav-active' : ''),
      href: HOME.href
    }, [HOME.label]);
    if (here === fileOf(HOME.href)) home.setAttribute('aria-current', 'page');
    body.appendChild(home);

    NAV.forEach(function (sec) {
      var wrap = el('div', { class: 'gnav-sec' });
      wrap.appendChild(el('div', { class: 'gnav-sec-head' }, [
        el('span', { class: 'gnav-sec-name' }, [sec.name]),
        el('span', { class: 'gnav-sec-rule' })
      ]));
      var ul = el('ul');
      sec.items.forEach(function (it) {
        var on = fileOf(it.href) === here;
        var a = el('a', { class: 'gnav-link' + (on ? ' gnav-active' : ''), href: it.href }, [it.label]);
        if (on) a.setAttribute('aria-current', 'page');
        ul.appendChild(el('li', null, [a]));
      });
      wrap.appendChild(ul);
      body.appendChild(wrap);
    });

    nav.appendChild(body);
    return nav;
  }

  function inject() {
    if (document.getElementById('bwGuideNav')) return;   // never twice

    var style = el('style', { id: 'bwGuideNavStyle', 'data-pdf': 'drop' });
    style.appendChild(document.createTextNode(CSS));
    document.head.appendChild(style);

    var nav = build();
    var backdrop = el('div', { id: 'bwGuideNavBackdrop', 'data-pdf': 'drop', hidden: '' });
    var toggle = el('button', {
      id: 'bwGuideNavToggle',
      type: 'button',
      'data-pdf': 'drop',
      'aria-controls': 'bwGuideNav',
      'aria-expanded': 'false',
      'aria-label': 'Open the guide menu'
    });
    toggle.innerHTML = ICON_MENU;

    document.body.appendChild(backdrop);
    document.body.appendChild(nav);
    document.body.appendChild(toggle);
    document.documentElement.classList.add('gnav-on');

    /* ---- drawer ---- */
    var open = false;
    var lastFocus = null;

    var focusables = function () {
      return Array.prototype.filter.call(
        nav.querySelectorAll('a[href]'),
        function (n) { return n.offsetParent !== null || n.getClientRects().length; }
      );
    };

    function setOpen(v) {
      open = v;
      nav.classList.toggle('gnav-open', v);
      backdrop.classList.toggle('gnav-open', v);
      if (v) backdrop.removeAttribute('hidden'); else backdrop.setAttribute('hidden', '');
      toggle.classList.toggle('gnav-open', v);
      toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
      toggle.setAttribute('aria-label', v ? 'Close the guide menu' : 'Open the guide menu');
      toggle.innerHTML = v ? ICON_CLOSE : ICON_MENU;
      if (v) {
        lastFocus = document.activeElement;
        var f = focusables();
        (f[0] || nav).focus();
      } else if (lastFocus && lastFocus.focus) {
        lastFocus.focus();
      }
    }

    toggle.addEventListener('click', function () { setOpen(!open); });
    backdrop.addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); setOpen(false); return; }
      if (e.key !== 'Tab') return;
      // Focus stays inside the drawer while it is open.
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === nav)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    // A width change back to desktop leaves the drawer state stale otherwise.
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width:' + BREAK + 'px)');
      var onChange = function (m) { if (m.matches && open) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  // Is this page the hub? `fileOf` already drops the query and the hash, and an empty
  // result — the bare `/` of a server that indexes to guides.html, and the dev server's
  // directory form — falls back to the hub the same way build() resolves `here`. Every
  // other page in the tree, guide and catalog alike, returns false and gets nothing.
  function isHub() {
    return (fileOf(location.pathname) || 'guides.html') === fileOf(HOME.href);
  }

  function start() {
    // Bail-outs. Return BEFORE injecting anything at all — not "inject then hide".
    var root = document.documentElement;
    if (root.classList.contains('family-view')) return;
    if (FAMILY_RE.test(location.search)) return;
    if (!isHub()) return;              // s25: the hub is the only page with a sidebar
    inject();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
