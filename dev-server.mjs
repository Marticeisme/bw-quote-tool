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
  if (!fs.existsSync(filePath)) filePath = path.join(ROOT, 'index.html'); // SPA fallback
  const ext = path.extname(filePath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(data);
  } catch(e) {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, () => console.log(`dev-server on ${PORT}`));
