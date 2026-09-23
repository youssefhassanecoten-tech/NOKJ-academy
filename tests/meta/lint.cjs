'use strict';
// Lightweight style lint for frontend JS.
// Usage: npm run lint

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const dirs = ['frontend/scripts', 'backend/src', 'tests', 'scripts'];

let problems = 0;

function lintFile(file) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/\t/.test(line)) { console.log('TAB       ' + rel + ':' + (i + 1)); problems++; }
    if (/\s+$/.test(line)) { console.log('TRAIL     ' + rel + ':' + (i + 1)); problems++; }
    if (line.includes('DEBUG') && /^\/\//.test(line)) { console.log('DEBUGLOG  ' + rel + ':' + (i + 1)); problems++; }
  });
}

for (const dir of dirs) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  (function collect(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) collect(p);
      else if (/\.(js|cjs|css|html)$/.test(entry.name)) lintFile(p);
    }
  })(abs);
}

console.log(problems === 0 ? 'Lint clean.' : problems + ' problem(s) found.');
process.exit(problems === 0 ? 0 : 1);