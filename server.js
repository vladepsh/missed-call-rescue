const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8879);
const ROOT = __dirname;
const PUBLIC_ROOT = path.join(ROOT, 'public');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  });
  res.end(body);
}

function safePath(urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }

  const relative = clean === '/' ? 'index.html' : clean.replace(/^\/public\//, '').replace(/^\//, '');
  const full = path.resolve(PUBLIC_ROOT, relative);
  return full === PUBLIC_ROOT || full.startsWith(`${PUBLIC_ROOT}${path.sep}`) ? full : null;
}

function createServer() {
  return http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      return send(res, 405, 'Method not allowed');
    }

    if (req.url === '/api/health') {
      return send(res, 200, JSON.stringify({ status: 'ok', mode: 'local-demo' }), types['.json']);
    }

    if (req.url === '/api/leads') {
      return send(res, 200, fs.readFileSync(path.join(ROOT, 'data/demo-leads.json'), 'utf8'), types['.json']);
    }

    const full = safePath(req.url);
    if (!full || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      return send(res, 404, 'Not found');
    }

    const ext = path.extname(full);
    send(res, 200, req.method === 'HEAD' ? '' : fs.readFileSync(full), types[ext] || 'application/octet-stream');
  });
}

function start(port = PORT) {
  const server = createServer();
  return server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    console.log(`Missed-Call Rescue Desk running at http://127.0.0.1:${address.port}/`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { createServer, safePath, start };
