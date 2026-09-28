'use strict';
// Runs the live scan: boots a static server for the real origin, runs the
// scan, then shuts the server down.
//
// jsdom is a test-only dependency, so it is NOT listed in package.json and the
// committed tree stays dependency-free. It is resolved in this order:
//   1. an explicit NOKJ_JSDOM path (point at a module or a node_modules dir)
//   2. a normal `jsdom` resolution, if it happens to be installed
// If neither works, the script explains how to install it somewhere harmless.
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.NOKJ_PORT || 4173;

function resolveJsdom() {
  const candidates = [];
  if (process.env.NOKJ_JSDOM) candidates.push(process.env.NOKJ_JSDOM);
  candidates.push('jsdom');
  for (const c of candidates) {
    try { return require.resolve(c); } catch (e) { /* try the next one */ }
  }
  return null;
}

const jsdomEntry = resolveJsdom();
if (!jsdomEntry) {
  console.log('The live scan needs jsdom, which is not a project dependency.');
  console.log('Install it outside the repo so package.json stays clean:');
  console.log('  npm install jsdom --prefix ./.nokj-testdeps');
  console.log('then either add a "jsdom" field to package.json or run:');
  console.log('  set NOKJ_JSDOM=./.nokj-testdeps/node_modules/jsdom && npm run test:live');
  console.log('The static test suite (npm test) does not need jsdom.');
  process.exit(1);
}

const server = spawn(process.execPath, [path.join(__dirname, 'serve.cjs')], {
  env: { ...process.env, NOKJ_PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let up = false;
server.stdout.on('data', d => { if (String(d).includes('listening')) up = true; });
server.stderr.on('data', d => process.stderr.write(d));

function cleanup(code) {
  if (!server.killed) server.kill();
  process.exit(code);
}

const scan = spawn(process.execPath, [path.join(__dirname, 'live-scan.cjs')], {
  env: { ...process.env, NOKJ_PORT: String(PORT), NOKJ_JSDOM: jsdomEntry },
  stdio: 'inherit'
});

// Give the server a moment to bind before the scan talks to it.
setTimeout(() => {
  if (!up) console.log('(server did not report ready; continuing)');
}, 300);

scan.on('exit', code => cleanup(code === 0 ? 0 : 1));
