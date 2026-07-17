import http from 'http';
import fs from 'fs';
const out = process.argv[2] || 'C:\\Users\\Martice\\Desktop\\test_ga_contract.pdf';
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(out, Buffer.concat(chunks));
      console.log('Saved:', out);
      res.writeHead(200); res.end('saved');
      server.close();
    });
  }
});
server.listen(4747, () => console.log('Listening on 4747...'));
