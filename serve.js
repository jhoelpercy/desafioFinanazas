// Servidor estático mínimo para desarrollo local: node serve.js [puerto]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.argv[2]) || 5173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(root, rel === '/' ? 'index.html' : rel));
  if (!file.startsWith(root)) { res.writeHead(403).end('Prohibido'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('No encontrado'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
}).listen(port, () => console.log('http://localhost:' + port));
