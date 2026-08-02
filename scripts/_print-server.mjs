// Shared print harness for the PDF builders (guides + catalogs).
//
// WHY THIS EXISTS — the file:// leak, sprint-10 Track P4.
// ------------------------------------------------------
// Both builders used to `page.goto(pathToFileURL(path.resolve(src)).href)`. Chromium
// resolves every relative `href` against that base, so each anchor in the printed PDF
// became a `/URI` annotation reading
//     file:///C:/Users/Martice/bw-quote-tool/cemetery-property-guide.html
// Ten of the nineteen committed guide PDFs carried one; `Glass-Front Niche Guide.pdf`
// carried `file:///C:/Users/Martice/bw-quote-tool-mis3/MAPS/COM_CryptMap.html` — a
// worktree name, from whichever tree happened to build it. These files are emailed to
// families, so the leak shipped the operator's Windows username and his local directory
// layout to strangers, and every one of those links was dead on their machine anyway.
//
// The annotations are invisible to `PyMuPDF.get_links()` (the anchors are inside
// print-hidden chrome, so the link rects are degenerate and get filtered) — they are only
// visible in the decompressed page objects. That is why the gate in
// verify_guide_pages.mjs scans decompressed bytes rather than asking for a link list.
//
// THE FIX, both halves:
//   1. Print over HTTP from the repo's own dev-server on a free port, so no file:// URL is
//      ever the document base — this also covers images, CSS and anything else resolved
//      relatively.
//   2. Rewrite every same-origin anchor to the GitHub Pages origin immediately before
//      printing, so a family clicking a link in the PDF lands on the real published page
//      instead of on `http://127.0.0.1:<random>/`. Same-document (`#…`) anchors are left
//      alone: Chromium turns those into internal GoTo destinations, and rewriting them to
//      an absolute URL would send the reader out of the PDF instead of down the page.
//
// Nothing here changes what the printed page LOOKS like — the served bytes are the same
// bytes, only the base URL differs.
import net from 'net';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Where the tool is actually published. Anchors are rewritten to this so links in an
// emailed PDF work for the person who received it.
export const PAGES_ORIGIN = 'https://marticeisme.github.io/bw-quote-tool/';

export const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});

/**
 * Start dev-server.mjs from THIS tree on a free port and wait until it answers.
 * Uses the `/__served-tree` identity route so a foreign server that already owns a port
 * can never be mistaken for ours (the sprint-09 served-tree scar). Returns
 * `{ base, stop() }`.
 */
export async function startPrintServer() {
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(ROOT, 'dev-server.mjs')], {
    env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      const r = await fetch(`${base}/__served-tree`);
      const j = await r.json();
      if (path.resolve(j.servedTreeRoot) !== ROOT) {
        proc.kill();
        throw new Error(`port ${port} is served by ${j.servedTreeRoot}, not ${ROOT}`);
      }
      break;
    } catch (e) {
      if (String(e.message).includes('is served by')) throw e;
      if (Date.now() > deadline) { proc.kill(); throw new Error('dev-server did not start'); }
      await new Promise(r => setTimeout(r, 120));
    }
  }
  return { base, port, stop: () => proc.kill() };
}

/**
 * Rewrite same-origin anchors to the published origin. Runs in the page, right before
 * `page.pdf()`. Returns the number rewritten so the builder can report it.
 */
export async function pointLinksAtPages(page, base) {
  return page.evaluate(([base, pages]) => {
    let n = 0;
    for (const a of document.querySelectorAll('a[href]')) {
      const raw = a.getAttribute('href') || '';
      if (raw.startsWith('#')) continue;              // in-PDF destination, leave it
      const abs = a.href;                             // browser-resolved
      if (!abs.startsWith(base + '/')) continue;      // mailto:, tel:, external — leave
      a.setAttribute('href', pages + abs.slice(base.length + 1));
      n++;
    }
    return n;
  }, [base, PAGES_ORIGIN]);
}
