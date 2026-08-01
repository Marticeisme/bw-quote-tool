import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT, 10) || 3737;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.pdf':  'application/pdf',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
};

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Identity endpoint for scripts/served-tree-check.mjs: which tree does this server
  // actually serve? With several worktrees on one machine, whichever server grabbed the
  // port first answers for everybody — this makes the answer checkable in one request.
  // (Older servers without this route answer it with their index.html via the old
  // unconditional SPA fallback; the checker detects that and probes the tree instead.)
  if (req.url.split('?')[0] === '/__served-tree') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ servedTreeRoot: ROOT }));
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/save-pdf')) {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url, 'http://localhost');
      const rawName = url.searchParams.get('name') || 'test_output.pdf';
      const safeName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_') || 'test_output.pdf';
      const outPath = path.join(ROOT, safeName);
      fs.writeFileSync(outPath, Buffer.concat(chunks));
      console.log('[save-pdf] wrote', outPath);
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('saved:' + outPath);
    });
    return;
  }

  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  // SPA fallback for extensionless routes only. A missing FILE must 404: silently serving
  // index.html in its place is how a worktree's test page came back as another tree's
  // index.html and produced phantom results (GitHub Pages 404s here too).
  if (!fs.existsSync(filePath) && !path.extname(filePath)) filePath = path.join(ROOT, 'index.html');
  const ext = path.extname(filePath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(data);
  } catch(e) {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, () => console.log(`dev-server on ${PORT}`));
