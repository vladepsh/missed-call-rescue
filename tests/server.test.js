const assert = require('node:assert/strict');
const { after, before, describe, test } = require('node:test');
const { createServer, safePath } = require('../server');

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe('HTTP server', () => {
  test('serves the dashboard with security headers', async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(body, /Missed-Call Rescue Desk/);
  });

  test('returns only synthetic lead fixtures', async () => {
    const response = await fetch(`${baseUrl}/api/leads`);
    const leads = await response.json();

    assert.equal(response.status, 200);
    assert.equal(leads.length, 3);
    assert.ok(leads.every(lead => /555-/.test(lead.phone)));
    assert.ok(leads.some(lead => lead.consentStatus === 'opted_out'));
  });

  test('exposes a local-demo health endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.deepEqual(await response.json(), { status: 'ok', mode: 'local-demo' });
  });

  test('rejects unsupported methods', async () => {
    const response = await fetch(`${baseUrl}/api/leads`, { method: 'POST' });
    assert.equal(response.status, 405);
  });

  test('keeps file access inside public/', () => {
    assert.equal(safePath('/public/../../server.js'), null);
    assert.equal(safePath('/%E0%A4%A'), null);
    assert.match(safePath('/public/style.css'), /public\/style\.css$/);
  });

  test('returns 404 for unknown files', async () => {
    const response = await fetch(`${baseUrl}/not-a-real-file.txt`);
    assert.equal(response.status, 404);
  });
});

