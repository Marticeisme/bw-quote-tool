# BW Quote Tool — agent instructions

Internal quoting/contract tool for Bonney Watson (cemetery + funeral home), built by
Martice Morrison. Deployed to **GitHub Pages** — `git push origin main` is live
immediately, and **the repo is public**.

## Shape of the codebase

- **`index.html` is the whole app** — ~11.9 MB, 16k lines, no build step. It contains one
  ~2 MB single line of embedded base64 (fonts, PDF/xlsx templates). Editing tools that
  load the whole file will struggle; prefer targeted Edit calls or short Node/Python
  scripts over whole-file rewrites.
- The guide/resource pages (`*-guide.html`, `guides.html`, `dashboard.html`, etc.) are
  separate standalone files.
- **Line endings are CRLF.** A multi-line match using `\n` in a script will silently fail.
- `</body>` appears more than once — the first is inside a print-window template string.
  Use `s.lastIndexOf('</body>')`, never `.replace('</body>', …)`.

## Non-negotiables

**1. Syntax-check before every push.** One JS error breaks the tool for everyone.

```bash
node -e "const fs=require('fs');const s=fs.readFileSync('index.html','utf8');const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,i=0,bad=0;while((m=re.exec(s))){i++;try{new Function(m[1]);}catch(e){bad++;console.log('ERR '+i+': '+e.message);}}console.log(i+' blocks, '+bad+' errors');"
```

**2. Never commit `wmp-cemetery-map/`.** It contains real burial PII and the repo is
public. It is gitignored — keep it that way. Same for `scratch/` and `node_modules/`.

**3. Saved quotes are live production data in Firebase**, not localStorage — the
`savedQuotes` node, mirrored into `_cemSavedQuotes` / `_fhSavedQuotes` /
`_ricSavedContracts` / `_gaSavedContracts` / `_cpSavedContracts` / `_anSavedContracts`.
`persistSavedQuotes()` uses `.set()`, which replaces the whole node. **Never call save or
persist functions from a test script** — doing so wiped real data on 2026-07-11. Test
scripts may read; they must not write.

**4. Commit or push only when Martice asks.** Don't push on your own initiative.

## Verifying your work

Test it yourself before reporting done — don't ask Martice to check.

- **Playwright** (in `node_modules`) headless is the tool for UI verification. MCP browser
  screenshots time out in this environment; pdf-lib generation also hangs in the MCP
  preview browser. Run Playwright/Node from the **repo root** so `require` resolves.
- Dev server: `.claude/launch.json` → `bw-quote-tool` on port 3737 (`node dev-server.mjs`).
- **PDFs: Adobe Acrobat is required only for the RIC contract.** RIC-specific bugs (field
  overflow, stray text, Calculate-action side effects, print failures) appear only there.
  Everything else — GA, ClearPoint, CIRGAS, cemetery and FH quote PDFs, catalogs, guides —
  verifies fine by rasterizing locally (pdf.js under Playwright, or PyMuPDF).
- If you couldn't verify something, say so plainly instead of implying you did.

## Scope discipline

The contract generators (RIC, GA/Global Atlantic, ClearPoint, CIRGAS/At-Need) are
separate from the customer-facing quote PDFs and are individually field-mapped against
real templates. **Work on the quotes must not touch the contract download code**, and
vice versa, unless that's the actual request.

Fix the highest-impact bug in a list first, verify it, then move on.

## Two sessions run against this repo

Martice runs parallel sessions — typically one on the quote tool (`index.html`) and one on
the family guides/resources (`*-guide.html`, `docs/`). Therefore:

- **`git pull --rebase` before you start**, and again before you push.
- **Never `git add -A` or `git add .`** — stage only the files you changed by name.
  Another session's in-flight edits live in the same working tree.
- If your work and another session's both need `index.html`, don't share a working tree;
  use `git worktree add ../bw-quote-tool-<topic> -b <topic>` and merge back.
- `docs/BRAND_AND_BUILD_LOG.md` is the guides session's running log — read it before
  catalog/guide work, don't rewrite it wholesale.
