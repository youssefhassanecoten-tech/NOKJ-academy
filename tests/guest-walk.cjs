'use strict';
// ============================================================
//  NOKJ guest walk
//
//  Boots the real frontend/index.html in a headless DOM on a fresh install,
//  walks the signed-out experience, then signs in through the real form as
//  student, teacher and admin and visits every sidebar page in English and
//  Russian. Anything that throws, logs an error, or leaves a portal
//  rendering an empty shell is reported. Every asset referenced by the page
//  must also load over HTTP.
//
//  jsdom is installed outside the repo on purpose so package.json stays clean.
//  Usage: node tests/guest-walk.cjs  (via npm run test:guest)
// ============================================================

const fs = require('fs');
const path = require('path');
// Resolved by run-guest.cjs, which passes NOKJ_JSDOM through. Falls back to a
// normal resolution so the file also works when invoked directly.
const JSDOM_MODULE = (() => {
  const candidates = [];
  if (process.env.NOKJ_JSDOM) candidates.push(process.env.NOKJ_JSDOM);
  candidates.push('jsdom');
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try the next */ }
  }
  console.error('jsdom could not be loaded. Run this via: npm run test:guest');
  process.exit(1);
})();
const { JSDOM, VirtualConsole } = JSDOM_MODULE;

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'frontend', 'index.html');
const APP_ORIGIN = process.env.NOKJ_ORIGIN || 'http://localhost:4175/';
const SCRIPT_RE = /<script\s+src="([^"]+)"[^>]*>\s*<\/script>/g;

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) { passed++; console.log('  PASS  ' + name); }
  else { failed++; failures.push(name + (detail ? ' -> ' + detail : '')); console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}

// ---------------------------------------------------------------
// Boot helpers
// ---------------------------------------------------------------

function boot(label) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message + (e.detail ? ' :: ' + String(e.detail).split('\n')[0] : '')));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));

  const html = fs.readFileSync(INDEX, 'utf8');
  const order = [];
  for (const m of html.matchAll(SCRIPT_RE)) order.push(m[1]);
  const shell = html.replace(/<script\s+src="[^"]+"\s*defer><\/script>\s*/g, '');

  const dom = new JSDOM(shell, {
    url: APP_ORIGIN + 'index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;
  w.addEventListener('error', e => errors.push('window.error: ' + (e.message || e.error)));
  w.addEventListener('unhandledrejection', e => errors.push('unhandled rejection: ' + (e.reason && e.reason.message || e.reason)));

  // A guest arrives with empty storage: the app seeds its own demo data.
  w.alert = () => {};
  w.confirm = () => true;
  w.prompt = () => 'x';
  // jsdom has no layout engine.
  w.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 });
  w.scrollTo = () => {};
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  w.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve('') });

  let all = '';
  for (const rel of order) {
    const file = path.resolve(path.dirname(INDEX), rel);
    all += fs.readFileSync(file, 'utf8') + '\n';
  }
  try { w.eval(all + '\n//# sourceURL=bundle.js'); }
  catch (e) { errors.push('LOAD: ' + e.message); }
  try { w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true })); }
  catch (e) { errors.push('DOMContentLoaded: ' + e.message); }

  return { w, errors };
}

const tick = (ms) => new Promise(r => setTimeout(r, ms || 15));

function visible(el, w) {
  for (let n = el; n && n !== w.document.body; n = n.parentElement) {
    if (n.hidden) return false;
    if (n.classList && n.classList.contains('hidden')) return false;
    const st = n.getAttribute && n.getAttribute('style');
    if (st && /display\s*:\s*none/i.test(st)) return false;
  }
  return true;
}

function shown(id, w) {
  const el = w.document.getElementById(id);
  if (!el) return false;
  if (el.hidden || el.classList.contains('hidden')) return false;
  const st = el.getAttribute('style');
  if (st && /display\s*:\s*none/i.test(st)) return false;
  return true;
}

function activePage(w) {
  const p = w.document.querySelector('.page.active');
  return p ? p.id : null;
}

function click(el, w) {
  if (!el) return false;
  const ev = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  // jsdom runs hyperlink navigation even for <a> without an href (its
  // _followAHyperlink never checks the attribute), which navigates to the bare
  // URL, drops the hash and fires popstate. Real browsers do not activate an
  // href-less anchor at all, so cancel the default to match them.
  let guard = null;
  if (el.tagName === 'A' && !el.hasAttribute('href')) {
    guard = () => ev.preventDefault();
    el.addEventListener('click', guard, { capture: true, once: true });
  }
  try { el.dispatchEvent(ev); }
  catch (e) { check('click does not throw', false, e.message); return false; }
  if (guard) el.removeEventListener('click', guard, { capture: true });
  return true;
}

function setValue(id, value, w) {
  const el = w.document.getElementById(id);
  if (!el) { check('form field #' + id + ' exists', false); return; }
  el.value = value;
  try { el.dispatchEvent(new w.Event('input', { bubbles: true })); } catch (e) { /* optional */ }
}

// ---------------------------------------------------------------
// Phase A: the guest, signed out
// ---------------------------------------------------------------

async function walkGuest() {
  console.log('== Guest (signed out) ==');
  const { w, errors } = boot('guest');

  check('landing page shows on first visit', shown('landing-page', w));
  check('login screen hidden initially', !shown('login-screen', w));

  click(w.document.getElementById('landing-login-btn'), w);
  await tick();
  check('Sign In opens the login screen', shown('login-screen', w));
  check('landing hides behind login', !shown('landing-page', w));

  const demoBtns = w.document.querySelectorAll('#login-demo-accounts [data-demo-email]');
  check('demo accounts are listed', demoBtns.length > 0, String(demoBtns.length) + ' found');
  if (demoBtns.length) {
    click(demoBtns[0], w);
    await tick();
    check('clicking a demo account fills the form',
      w.document.getElementById('login-email').value === 'admin@nokj.com',
      w.document.getElementById('login-email').value);
  }

  setValue('login-email', 'admin@nokj.com', w);
  setValue('login-password', 'wrongpass', w);
  w.document.getElementById('login-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  const err1 = (w.document.getElementById('login-error').textContent || '').trim();
  check('wrong password shows an error', err1.length > 0, err1.slice(0, 60));

  setValue('login-email', 'nobody@nowhere.invalid', w);
  setValue('login-password', 'whatever123', w);
  w.document.getElementById('login-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  const err2 = (w.document.getElementById('login-error').textContent || '').trim();
  check('unknown address shows an error', err2.length > 0, err2.slice(0, 60));
  check('failed sign-in stays on the login screen', shown('login-screen', w));

  click(w.document.getElementById('login-to-register'), w);
  await tick();
  check('Join Class opens the register screen', shown('register-screen', w));
  click(w.document.getElementById('register-to-login'), w);
  await tick();
  check('register links back to login', shown('login-screen', w));
  click(w.document.getElementById('login-back-to-welcome'), w);
  await tick();
  check('back returns to the landing page', shown('landing-page', w));

  click(w.document.getElementById('landing-lang-toggle'), w);
  await tick();
  const landText = w.document.getElementById('landing-page').textContent || '';
  check('landing translates to Russian', /[Ѐ-ӿ]/.test(landText));
  click(w.document.getElementById('landing-lang-toggle'), w);
  await tick();

  check('guest phase raises no runtime errors', errors.length === 0, errors.join(' | '));
}

// ---------------------------------------------------------------
// Phases B-D: sign in through the real form, walk every page
// ---------------------------------------------------------------

const ROLES = [
  { name: 'student', email: 'student@nokj.com', pass: 'password123' },
  { name: 'teacher', email: 'wilson@nokj.com', pass: 'password123' },
  { name: 'admin', email: 'admin@nokj.com', pass: 'admin123' }
];

async function walkPortal(role) {
  console.log('== ' + role.name + ' portal ==');
  const label = role.name;
  const { w, errors } = boot(label + ':signin');

  click(w.document.getElementById('landing-login-btn'), w);
  await tick();
  setValue('login-email', role.email, w);
  setValue('login-password', role.pass, w);
  w.document.getElementById('login-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick(40);

  const appEl = w.document.getElementById('app');
  const signedIn = !!w.localStorage.getItem('nokj-user') && appEl.classList.contains('logged-in') && !shown('login-screen', w);
  check('signed in through the form as ' + role.email, signedIn);
  if (!signedIn) {
    const err = (w.document.getElementById('login-error').textContent || '').trim();
    check('could enter the portal', false, err);
    return;
  }

  // Walk every visible sidebar page, EN then RU. Pages hidden for the role
  // (auth.js hiddenPages) are skipped by design.
  for (const lang of ['en', 'ru']) {
    if (lang === 'ru') {
      click(w.document.getElementById('language-toggle'), w);
      await tick(30);
    }
    const buttons = Array.from(w.document.querySelectorAll('.sidebar [data-page]'))
      .filter(b => visible(b, w));
    const seenPages = new Set();
    for (const b of buttons) {
      const target = b.dataset.page;
      if (seenPages.has(target)) continue;
      seenPages.add(target);
      const before = errors.length;
      click(b, w);
      await tick(30);
      const active = activePage(w);
      const pageEl = active ? w.document.getElementById(active) : null;
      const body = pageEl ? (pageEl.textContent || '').trim() : '';
      check('[' + lang + '] ' + target + ' renders', active === target && body.length > 0,
        'active=' + active + ' chars=' + body.length);
      if (errors.length > before) {
        check('[' + lang + '] ' + target + ' raises no runtime errors', false,
          errors.slice(before).join(' | '));
      }
    }
    if (lang === 'ru') {
      click(w.document.getElementById('language-toggle'), w);
      await tick(30);
    }
  }

  check(role.name + ' portal raises no runtime errors', errors.length === 0, errors.join(' | '));
}

// ---------------------------------------------------------------
// Phase E: every referenced asset must load over HTTP
// ---------------------------------------------------------------

async function walkAssets() {
  console.log('== assets over HTTP ==');
  const base = new URL(APP_ORIGIN);
  const get = async (p) => {
    try {
      const r = await fetch(new URL(p, base).href);
      return { status: r.status, text: p.endsWith('.css') ? await r.text() : null };
    } catch (e) { return { status: 0, err: e.message }; }
  };
  const idx = await get('index.html');
  check('index.html loads', idx.status === 200, String(idx.status));
  const html = await (await fetch(APP_ORIGIN + 'index.html')).text();
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const u = m[1];
    if (/^(https?:|data:|mailto:|#)/.test(u)) continue;
    refs.add(u);
  }
  let broken = 0;
  for (const r of [...refs].sort()) {
    const res = await get(r);
    if (!(res.status >= 200 && res.status < 400)) { check('asset ' + r + ' loads', false, String(res.status)); broken++; }
    if (res.text) {
      for (const m of res.text.matchAll(/url\(([^)]+)\)/g)) {
        const u = m[1].replace(/['"]/g, '');
        if (/^(data:|https?:)/.test(u)) continue;
        const sub = await get(path.posix.join(path.posix.dirname(r), u));
        if (!(sub.status >= 200 && sub.status < 400)) { check('asset ' + r + ' -> ' + u + ' loads', false, String(sub.status)); broken++; }
      }
    }
  }
  check('all ' + refs.size + ' referenced assets load', broken === 0, broken + ' broken');
}

(async () => {
  await walkGuest();
  for (const r of ROLES) await walkPortal(r);
  await walkAssets();
  console.log('\nChecks: ' + passed + ' passed, ' + failed + ' failed');
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log('  - ' + f);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
