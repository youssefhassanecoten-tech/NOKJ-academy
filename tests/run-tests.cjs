'use strict';
// NOKJ Academy integrity harness.
// Usage: node tests/run-tests.cjs  (or: npm test)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'frontend', 'scripts');
const CSS_DIR = path.join(ROOT, 'frontend', 'styles');
const HTML_FILE = path.join(ROOT, 'frontend', 'index.html');

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log('  PASS  ' + name);
  } else {
    failed++;
    console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  }
}

function walk(dir, predicate) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, predicate));
    else if (predicate(entry.name)) out.push(p);
  }
  return out;
}

console.log('== Frontend script syntax ==');
const jsFiles = walk(SCRIPTS_DIR, n => /\.js$/.test(n)).sort();
for (const file of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  check('syntax ' + path.relative(ROOT, file), r.status === 0, r.stderr.trim());
}

console.log('== CSS/JS file integrity ==');
const cssFiles = walk(CSS_DIR, n => /\.css$/.test(n)).sort();
const html = fs.readFileSync(HTML_FILE, 'utf8');
const cssRefs = [];
for (const m of html.matchAll(/href="(styles\/[^"]+\.css)"/g)) cssRefs.push(m[1]);
const missingCss = cssRefs.filter(ref => !fs.existsSync(path.join(ROOT, 'frontend', ref)));
check('all css linked in index.html exist', missingCss.length === 0, missingCss.join(', '));
const unlinkedCss = cssFiles.filter(f => {
  return !cssRefs.includes(path.relative(path.join(ROOT, 'frontend'), f).replace(/\\/g, '/'));
});
check('all css in frontend/styles are linked', unlinkedCss.length === 0, unlinkedCss.map(f => path.relative(ROOT, f).replace(/\\/g, '/')).join(', '));
const jsCount = jsFiles.length;
const jsRefs = [];
for (const m of html.matchAll(/src="(scripts\/[^"]+\.js)"/g)) jsRefs.push(m[1]);
const missingJs = jsRefs.filter(ref => !fs.existsSync(path.join(ROOT, 'frontend', ref)));
check('all scripts linked in index.html exist', missingJs.length === 0, missingJs.join(', '));
const unloadedJs = jsFiles.filter(f => {
  return !jsRefs.includes(path.relative(path.join(ROOT, 'frontend'), f).replace(/\\/g, '/'));
});
check('all js in frontend/scripts are loaded', unloadedJs.length === 0, unloadedJs.map(f => path.relative(ROOT, f).replace(/\\/g, '/')).join(', '));

console.log('== DOM id integrity ==');
const ids = new Set();
for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);

const missing = new Set();
const dynamicIds = new Set();
for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
    const id = m[1];
    if (!ids.has(id)) {
      // ids built inside JS template literals are created at runtime
      const appearsBuilt = src.includes('id="' + id + '"');
      if (appearsBuilt) dynamicIds.add(id);
      else missing.add(id);
    }
  }
}
check('no dangling getElementById refs', missing.size === 0, [...missing].join(', '));
check('dynamic ids are built in JS', [...dynamicIds].filter(id => {
  // every dynamic id must actually be emitted in some script as id="..."
  return jsFiles.some(f => fs.readFileSync(f, 'utf8').includes('id="' + id + '"'));
}).length === dynamicIds.size, ...dynamicIds.length ? ['unverified: ' + [...dynamicIds].join(', ')] : []);

console.log('== Landing/entry markers ==');
check('index.html loads app.js', html.includes('scripts/app.js'), '');
check('index.html has styles/variables.css', html.includes('styles/variables.css'), '');

console.log('');
console.log('Checks: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);