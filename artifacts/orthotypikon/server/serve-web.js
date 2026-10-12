const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'web-build');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
};

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const candidate = path.resolve(root, `.${pathname}`);
  if (!candidate.startsWith(`${root}${path.sep}`) && candidate !== root) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let file = candidate;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(pathname) || pathname.startsWith('/api/')) {
      res.writeHead(404).end('Not found');
      return;
    }
    file = path.join(root, 'index.html');
  }

  if (!fs.existsSync(file)) {
    res.writeHead(503).end('Website build is not available');
    return;
  }

  const contentType = mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const cacheControl = file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'Content-Length': fs.statSync(file).size,
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT || 4173), '0.0.0.0', () => {
  console.log(`Serving the OrthoTypikon web app on port ${process.env.PORT || 4173}`);
});
