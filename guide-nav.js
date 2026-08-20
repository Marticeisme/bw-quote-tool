/* guide-nav.js — the persistent left sidebar for the family-facing guides site.
 *
 * ONE file is the whole feature. Every in-scope page carries exactly one line:
 *
 *     <script src="guide-nav.js" defer></script>
 *
 * and nothing else: this script injects its own <style>, its own <nav>, and on small
 * screens a menu button plus a backdrop. Nothing is added to the 34 pages beyond that
 * single tag, so the sidebar can be restyled or retired in one place.
 *
 * WHY THE CSS LIVES HERE AND NOT IN A STYLESHEET. The pages are hand-kept and generated
 * in five different ways; a second <link> would have to be threaded through every
 * generator too, and a page that got the script but not the stylesheet would render an
 * unstyled list on top of the cover. One tag cannot half-apply.
 *
 * SKIN. The guides brand, not the quote tool's dark chrome: official navy #466e86 and
 * orange #e84610 off the 2026 GPL brochure, warm cream surfaces, Cormorant Garamond for
 * the section name and Source Sans 3 for the items. Values are hardcoded rather than
 * read from each page's :root because the pages do NOT agree on their token names —
 * the prose guides define --navy/--orange, guides.html defines --bw-navy/--navy-500,
 * and the catalogs define --paper/--card. A var() reference would resolve differently
 * (or not at all) page to page.
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
 * footer. Injecting a sidebar there would put every link back. So this file returns
 * before injecting anything when that class is present OR when the URL carries a
 * `family` param — matching the head script's regex EXACTLY, so the lookalike
 * `?familyx=1` is not a family view here either, just as it is not there.
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
  var WIDTH = 250;    // px

  var CSS = [
    /* Tokens are scoped to the injected subtree so they cannot collide with a page's
       own --navy / --orange / --rule, which differ page to page. */
    '#bwGuideNav,#bwGuideNavToggle,#bwGuideNavBackdrop{',
    '--gn-navy:#466e86;--gn-navy-deep:#1c2c36;--gn-navy-mid:#314d5e;',
    '--gn-orange:#e84610;--gn-cream:#f8f6f2;--gn-offwhite:#f2f5f6;',
    '--gn-rule:#e0dbd0;--gn-ink:#16242c;--gn-body:#4a5a64;--gn-muted:#6d818c;',
    '--gn-w:' + WIDTH + 'px;',
    'font-family:"Source Sans 3",system-ui,-apple-system,sans-serif;',
    'box-sizing:border-box;-webkit-font-smoothing:antialiased}',
    '#bwGuideNav *,#bwGuideNavToggle *{box-sizing:border-box}',

    /* ---- the panel ---- */
    '#bwGuideNav{position:fixed;top:0;left:0;bottom:0;width:var(--gn-w);z-index:900;',
    'background:var(--gn-cream);border-right:1px solid var(--gn-rule);',
    'overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;',
    'transform:translateX(-100%);transition:transform .22s ease;',
    'box-shadow:0 0 30px rgba(22,36,44,.18);display:flex;flex-direction:column}',
    '#bwGuideNav.gnav-open{transform:translateX(0)}',

    '.gnav-head{background:var(--gn-navy-deep);padding:16px 18px 14px;flex-shrink:0}',
    '.gnav-head .gnav-mark{font-family:"Cormorant Garamond",Georgia,serif;font-size:19px;',
    'font-weight:600;color:#fff;line-height:1.15;display:block}',
    '.gnav-head .gnav-est{font-family:"Cormorant Garamond",Georgia,serif;font-size:11px;',
    'font-style:italic;color:rgba(255,255,255,.55);display:block;margin-top:2px}',
    '.gnav-head .gnav-rule{width:34px;height:2px;background:var(--gn-orange);',
    'border-radius:2px;margin-top:10px}',

    '.gnav-body{padding:10px 0 28px;flex:1}',

    '.gnav-home{display:block;margin:10px 12px 4px;padding:9px 12px;border-radius:6px;',
    'font-size:13px;font-weight:700;letter-spacing:.02em;text-decoration:none;',
    'color:var(--gn-navy);background:#fff;border:1px solid var(--gn-rule);transition:all .14s}',
    '.gnav-home:hover{border-color:var(--gn-navy);color:var(--gn-navy-deep)}',
    '.gnav-home.gnav-active{background:var(--gn-navy);border-color:var(--gn-navy);color:#fff}',

    '.gnav-sec{margin-top:14px}',
    '.gnav-sec-name{font-family:"Cormorant Garamond",Georgia,serif;font-size:15px;',
    'font-weight:600;color:var(--gn-navy-mid);padding:0 18px 6px;display:block;',
    'border-bottom:1px solid var(--gn-rule);margin:0 0 4px}',
    '.gnav-sec ul{list-style:none;margin:0;padding:0}',
    '.gnav-sec li{margin:0;padding:0}',
    '.gnav-sec li::before{content:none}',   /* prose guides style bare <li> — neutralise */
    '.gnav-link{display:block;padding:7px 18px 7px 16px;font-size:13px;line-height:1.35;',
    'color:var(--gn-body);text-decoration:none;border-left:3px solid transparent;',
    'transition:background .14s,color .14s,border-color .14s}',
    '.gnav-link:hover{background:var(--gn-offwhite);color:var(--gn-navy-deep);',
    'border-left-color:var(--gn-navy)}',
    '.gnav-link.gnav-active{background:#fff;color:var(--gn-ink);font-weight:700;',
    'border-left-color:var(--gn-orange);box-shadow:inset -1px 0 0 var(--gn-rule)}',
    '#bwGuideNav a:focus-visible,#bwGuideNavToggle:focus-visible{outline:0;',
    'box-shadow:0 0 0 3px rgba(70,110,134,.4)}',

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

    var head = el('div', { class: 'gnav-head' }, [
      el('span', { class: 'gnav-mark' }, ['Bonney Watson']),
      el('span', { class: 'gnav-est' }, ['Guides and Catalogs']),
      el('div', { class: 'gnav-rule' })
    ]);
    nav.appendChild(head);

    var body = el('div', { class: 'gnav-body' });

    var home = el('a', {
      class: 'gnav-home' + (here === fileOf(HOME.href) ? ' gnav-active' : ''),
      href: HOME.href
    }, [HOME.label]);
    if (here === fileOf(HOME.href)) home.setAttribute('aria-current', 'page');
    body.appendChild(home);

    NAV.forEach(function (sec) {
      var wrap = el('div', { class: 'gnav-sec' });
      wrap.appendChild(el('span', { class: 'gnav-sec-name' }, [sec.name]));
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

  function start() {
    // Bail-outs. Return BEFORE injecting anything at all — not "inject then hide".
    var root = document.documentElement;
    if (root.classList.contains('family-view')) return;
    if (FAMILY_RE.test(location.search)) return;
    inject();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
