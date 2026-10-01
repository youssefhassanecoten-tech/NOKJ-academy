'use strict';
// Runs the Russian coverage audit. Boots the real frontend in every role with
// Russian selected and fails if any interface text is left in English.
//
// Like the live scan, jsdom is resolved without being a project dependency:
//   1. an explicit NOKJ_JSDOM path
//   2. a normal `jsdom` resolution
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.NOKJ_PORT || 4174;

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
  console.log('The Russian coverage audit needs jsdom, which is not a project dependency.');
  console.log('Install it outside the repo so package.json stays clean:');
  console.log('  npm install jsdom --prefix ./.nokj-testdeps');
  console.log('then run:');
  console.log('  set NOKJ_JSDOM=./.nokj-testdeps/node_modules/jsdom && npm run test:i18n');
  process.exit(1);
}

const server = spawn(process.execPath, [path.join(__dirname, 'serve.cjs')], {
  env: { ...process.env, NOKJ_PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', () => {});
server.stderr.on('data', d => process.stderr.write(d));

function cleanup(code) {
  if (!server.killed) server.kill();
  process.exit(code);
}

const audit = spawn(process.execPath, [path.join(__dirname, 'audit-ru.cjs')], {
  env: { ...process.env, NOKJ_PORT: String(PORT), NOKJ_JSDOM: jsdomEntry },
  stdio: 'inherit'
});

audit.on('exit', code => cleanup(code === 0 ? 0 : 1));
