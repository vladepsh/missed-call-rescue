const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const skipDirectories = new Set(['.git', 'node_modules', 'playwright-report', 'test-results']);
const skipFiles = new Set(['scripts/scan-sensitive.js']);
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.svg', '.yml', '.yaml']);

const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
  ['OpenAI-style secret', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
  ['absolute user path', /\/Users\/[A-Za-z0-9._-]+\//],
  ['private project/person marker', /\b(?:Vlad|Kate|Vosyn|Leviathan|RedAuraAI)\b/i],
  ['assigned secret', /\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i]
];

function listFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirectories.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) listFiles(full, files);
    else files.push(full);
  }
  return files;
}

const findings = [];
for (const file of listFiles(root)) {
  const relative = path.relative(root, file);
  if (skipFiles.has(relative) || !textExtensions.has(path.extname(file))) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [name, pattern] of rules) {
      if (pattern.test(line)) findings.push(`${relative}:${index + 1} ${name}`);
    }
  });
}

if (findings.length) {
  console.error('Sensitive-content scan failed:');
  findings.forEach(finding => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log('Sensitive-content scan passed.');
}

