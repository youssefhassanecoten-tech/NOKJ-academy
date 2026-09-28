'use strict';
// Lightweight style lint for frontend JS.
// Usage: npm run lint

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// tests/meta/lint.cjs -> repo root is two levels up, not one.
const ROOT = path.resolve(__dirname, '..', '..');
const dirs = ['frontend/scripts', 'backend/src', 'tests', 'scripts'];
const encDirs = ['frontend'];

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

// Catches text mangled by a shell/editor that read UTF-8 as the system
// codepage: PowerShell Get-Content + Set-Content, for example, turns an
// em-dash into "a-tilde-euro-quote" and emoji into U+FFFD.
const cp1252 = new TextDecoder('windows-1252');
const charToByte = new Map();
for (let b = 0x80; b <= 0xff; b++) {
  const ch = cp1252.decode(Uint8Array.from([b]));
  if (ch.length === 1) charToByte.set(ch, b);
}

function lintEncoding(file) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  src.split(/\r?\n/).forEach((line, i) => {
    if (line.includes('�')) {
      console.log('MOJIBAKE  ' + rel + ':' + (i + 1) + '  (U+FFFD replacement character)');
      problems++;
      return;
    }
    for (const run of line.matchAll(/[^\x00-\x7F]+/g)) {
      const bytes = [];
      for (const ch of run[0]) {
        const b = charToByte.get(ch);
        if (b === undefined) { bytes.length = 0; break; }
        bytes.push(b);
      }
      if (!bytes.length) continue;
      // A run that decodes back to valid UTF-8 was almost certainly garbled.
      if (!Buffer.from(bytes).toString('utf8').includes('�')) {
        console.log('MOJIBAKE  ' + rel + ':' + (i + 1) + '  ' + JSON.stringify(run[0]));
        problems++;
      }
    }
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

for (const dir of encDirs) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) { console.error('Lint root missing: ' + abs); continue; }
  (function collect(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) collect(p);
      else if (/\.(js|cjs|css|html)$/.test(entry.name)) lintEncoding(p);
    }
  })(abs);
}

console.log(problems === 0 ? 'Lint clean.' : problems + ' problem(s) found.');
// exitCode, not exit(): process.exit() can truncate buffered output on a pipe.
process.exitCode = problems === 0 ? 0 : 1;