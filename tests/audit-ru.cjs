'use strict';
// ============================================================
//  NOKJ Russian coverage audit
//
//  Enforces the project rule: if the interface language is Russian, everything
//  the user can read is Russian. The only exceptions are values the user
//  entered -- course names, personal names, file names, e-mail addresses and
//  other data rather than interface text.
//
//  This is a runtime check, not a static one: it boots the real frontend as
//  each role with Russian selected, walks every page, and reads the rendered
//  text. That is the only way to catch strings that JavaScript builds at
//  runtime, which the static text-node walker cannot see.
//
//  Usage: node tests/audit-ru.cjs
// ============================================================

const fs = require('fs');
const path = require('path');

const JSDOM_MODULE = (() => {
  const candidates = [];
  if (process.env.NOKJ_JSDOM) candidates.push(process.env.NOKJ_JSDOM);
  candidates.push('jsdom');
  for (const c of candidates) { try { return require(c); } catch (e) { /* next */ } }
  console.error('jsdom could not be loaded. Run this via: npm run test:live');
  process.exit(1);
})();
const { JSDOM, VirtualConsole } = JSDOM_MODULE;

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'frontend', 'index.html');
const APP_ORIGIN = process.env.NOKJ_ORIGIN || 'http://localhost:4173/';
const INDEX_URL = APP_ORIGIN + 'index.html';
const SCRIPT_RE = /<script\s+src="([^"]+)"[^>]*>\s*<\/script>/g;

// ---------------------------------------------------------------
// Reuse the live-scan seeding so pages have realistic content
// ---------------------------------------------------------------
// Pull a top-level function declaration out of live-scan.cjs by matching
// braces, so nested functions and braces inside strings do not confuse it.
const scanSrc = fs.readFileSync(path.join(__dirname, 'live-scan.cjs'), 'utf8');

function extractFunction(name) {
  const start = scanSrc.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('could not find ' + name + ' in live-scan.cjs');
  let i = scanSrc.indexOf('{', start);
  const open = i;
  let depth = 0;
  let quote = null;
  while (i < scanSrc.length) {
    const c = scanSrc[i];
    if (quote) {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (c === '/' && scanSrc[i + 1] === '/') {
      while (i < scanSrc.length && scanSrc[i] !== '\n') i++;
      continue;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
    i++;
  }
  if (depth !== 0) throw new Error('unbalanced braces in ' + name);
  // Return the whole declaration, signature included, so it parses as a
  // function expression.
  return scanSrc.slice(start, i);
}

const seedStorage = new Function('fs', 'path', 'return (' + extractFunction('seedStorage') + ')')(fs, path);
const loadProgram = new Function('fs', 'path', 'return (' + extractFunction('loadProgram') + ')')(fs, path);

function boot(role) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));

  const html = fs.readFileSync(INDEX, 'utf8');
  const order = [];
  for (const m of html.matchAll(SCRIPT_RE)) order.push(m[1]);
  const shell = html.replace(/<script\s+src="[^"]+"\s+defer><\/script>\s*/g, '');

  const dom = new JSDOM(shell, {
    url: INDEX_URL, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc
  });
  const win = dom.window;

  const data = seedStorage(role);
  for (const k of Object.keys(data.store)) win.localStorage.setItem(k, data.store[k]);
  // Select Russian before any script runs.
  win.localStorage.setItem('nokj-language', 'ru');

  win.alert = () => {};
  win.confirm = () => true;
  win.prompt = () => 'Новое';
  win.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 });
  win.scrollTo = () => {};
  win.matchMedia = win.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {} }));
  win.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve('') });

  loadProgram(win, path.join(ROOT, 'frontend'), order, errors);
  try { win.document.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { errors.push('DOMContentLoaded: ' + e.message); }
  return { dom, win, errors };
}

// ---------------------------------------------------------------
// What counts as untranslated
// ---------------------------------------------------------------

// Values that are legitimately not Russian even in a Russian interface.
const ALLOWED = [
  // Brand and product names
  /nokj/i, /github/i, /google/i, /excel/i, /json/i, /csv/i, /pdf/i, /pptx?/i,
  /^\d+$/, /^\d+\s?(kb|mb|gb|%|px|mm)$/i,
  // Formats and identifiers
  /https?:\/\//i, /^[a-z0-9._%+-]+@[a-z0-9.-]+$/i,
  /^NOKJ-/, /^TCHR-/, /^[A-Z]{2,4}-\d+$/,
  // Seeded test data: names the user "typed" in the fixture
  /tara|adam|sami|nour|alex|maria/i,

  // Bare single letters used as formatting buttons (B, I, U)
  /^[BIU]$/,
  // Heading levels
  /^H[1-6]$/,
  // Emoji-only or symbol-only
  /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s©·•→←▸◀▶✓✕✏📎📥📊📄📁🎤📷🖥💬⛶☀🌙🍂⚙]/u,
  // Time and dates that JS formats numerically
  /^\d{1,2}[:.]\d{2}$/, /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  // Units rendered in latin
  /^\d+\s?(min|mins|hr|hrs|kb|mb|gb)$/i,

  // ---------------------------------------------------------
  // Seeded demo content from tests/live-scan.cjs. This is course
  // names, teacher names, announcements and budget lines that the
  // fixture "typed in". Under the project rule these are data, not
  // interface text, so they are correctly left alone -- in a real
  // Russian install this content would itself be Russian.
  // ---------------------------------------------------------
  /English Literature|Macbeth Analysis|Biology|Cell Structure|Mathematics|Quadratic Equations/,
  /Ms\. Evans|Marcus Webb|Sarah Chen/,
  /science fair/i,
  /school library|library will remain open/i,
  /timetable for mid-term|mid-term assessment/i,
  /Extended library opening hours/,
  /Staff Salaries|Student Fees/,
  /Shapes and space|Data and averages\.|^Statistics$|^Geometry$/,
  /Basics$|^Notes$|^Ref$|^Some notes$|^Start here$|Plain task|Type an answer/,
  /Points, lines and planes|^Points$/
];

function isLatinVisible(s) {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  // Must contain a real English word: three or more consecutive latin letters.
  if (!/[A-Za-z]{3,}/.test(t)) return false;
  if (!/\s|[.,!?;:]/.test(t) && t.length <= 2) return false;
  for (const re of ALLOWED) if (re.test(t)) return false;
  return true;
}

// Elements whose text is user data, not interface chrome.
function isUserData(el) {
  for (let n = el; n && n !== el.ownerDocument.body; n = n.parentElement) {
    if (n.hasAttribute && (n.hasAttribute('data-i18n-skip') || n.hasAttribute('data-user'))) return true;
    if (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA') return true;
  }
  return false;
}

function visibleLatinOn(win) {
  const doc = win.document;
  const found = new Map();
  const add = (text, where) => {
    const key = text.length > 80 ? text.slice(0, 80) + '…' : text;
    if (!found.has(key)) found.set(key, where);
  };

  // The app keeps inactive pages in the DOM and hides them, so a naive walk of
  // <body> would read text the user cannot see and misattribute it. Only count
  // nodes inside the active page, plus interface chrome that lives outside any
  // page, plus any modal currently on screen.
  function isOnScreen(el) {
    const page = el.closest ? el.closest('.page') : null;
    if (page && !page.classList.contains('active')) return false;
    for (let n = el; n && n !== doc.body; n = n.parentElement) {
      if (n.style && (n.style.display === 'none' || n.style.visibility === 'hidden')) return false;
      if (n.hasAttribute && n.hasAttribute('hidden')) return false;
    }
    const style = win.getComputedStyle ? win.getComputedStyle(el) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    return true;
  }

  // Rendered text
  const walker = doc.createTreeWalker(doc.body, 4);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;
    const tag = parent.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') continue;
    if (isUserData(parent)) continue;
    if (!isOnScreen(parent)) continue;
    const t = node.nodeValue.replace(/\s+/g, ' ').trim();
    if (isLatinVisible(t)) {
      const inPage = parent.closest ? parent.closest('.page') : null;
      add(t, inPage ? tag.toLowerCase() : 'chrome');
    }
  }

  // Placeholders, titles, aria-labels, and option labels
  for (const attr of ['placeholder', 'title', 'aria-label']) {
    doc.querySelectorAll('[' + attr + ']').forEach(el => {
      if (isUserData(el)) return;
      if (!isOnScreen(el)) return;
      const v = (el.getAttribute(attr) || '').trim();
      if (isLatinVisible(v)) add(v, attr + '@' + el.tagName.toLowerCase());
    });
  }
  return found;
}

// ---------------------------------------------------------------
// Read the Russian dictionary, so we can tell "no entry" apart from
// "entry exists but is never applied to runtime-built text".
// ---------------------------------------------------------------
const tSrc = fs.readFileSync(path.join(ROOT, 'frontend', 'scripts', 'translations.js'), 'utf8');
const ruStart = tSrc.indexOf('ru: {');
const enRoleStart = tSrc.indexOf('I18N_EN_ROLE = {');
const ruBlock = tSrc.slice(ruStart, enRoleStart > ruStart ? enRoleStart : undefined);
const RU = Object.create(null);
const entryRe = /^\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)',?\s*$/gm;
let em;
while ((em = entryRe.exec(ruBlock))) RU[em[1]] = em[2];

// ---------------------------------------------------------------
// Drive every page in every role
// ---------------------------------------------------------------

const PAGES = {
  student: ['dashboard', 'courses', 'timetable', 'classroom', 'profile', 'grades', 'courses-admin'],
  teacher: ['dashboard', 'course-workspace', 'grades', 'classroom', 'timetable', 'profile'],
  admin: ['dashboard', 'timetable', 'courses', 'announcements', 'classroom', 'students',
    'budget', 'courses-admin', 'course-workspace', 'grades', 'calendar', 'approvals', 'profile']
};

// Panels behind a tab or a click. Each entry is a named function that opens
// that panel, so its text is inspected exactly as the user would meet it.
const SUB_VIEWS = {
  'teacher/course-workspace': [
    function studioSettings(win) {
      win.studioSetTab('settings');
      win.setLanguage('ru');
    }
  ],
  'student/courses': [
    function firstCourse(win) {
      win.openCourse(5);
      win.setLanguage('ru');
    }
  ]
};

const untranslated = new Map();   // text -> Set of "role/page"
let pagesChecked = 0;
const roleConfirmed = [];

for (const role of Object.keys(PAGES)) {
  const s = boot(role);
  const win = s.win;

  if (win.document.documentElement.lang !== 'ru') {
    roleConfirmed.push(role + ': document.lang=' + win.document.documentElement.lang);
  }
  // Belt and braces: force it, in case storage was overwritten on boot.
  try { win.setLanguage('ru'); } catch (e) { /* reported below */ }

  for (const p of PAGES[role]) {
    try { win.openPage(p); } catch (e) { roleConfirmed.push('openPage(' + p + ') threw: ' + e.message); continue; }
    const active = win.document.querySelector('.page.active');
    if (!active || active.id !== p) continue;
    pagesChecked++;
    const found = visibleLatinOn(win);
    for (const [text, where] of found) {
      if (!untranslated.has(text)) untranslated.set(text, new Set());
      untranslated.get(text).add(role + '/' + p + (where === 'chrome' ? '' : '') + (where === 'chrome' ? '' : ' [' + where + ']'));
    }

    // Panels that only exist behind a tab or a click are still visible to the
    // user, so they have to be opened or their text goes unchecked.
    const subViews = SUB_VIEWS[role + '/' + p];
    if (subViews) {
      for (const open of subViews) {
        try { open(win); } catch (e) { roleConfirmed.push(p + ' sub-view failed: ' + e.message); continue; }
        pagesChecked++;
        const more = visibleLatinOn(win);
        for (const [text, where] of more) {
          if (!untranslated.has(text)) untranslated.set(text, new Set());
          untranslated.get(text).add(role + '/' + p + '/' + open.name + (where === 'chrome' ? '' : ' [' + where + ']'));
        }
      }
    }
  }
  s.dom.window.close();
}

// ---------------------------------------------------------------
// Report
// ---------------------------------------------------------------

const lines = [];
const say = s => lines.push(s);

say('Russian coverage audit');
say('  pages inspected: ' + pagesChecked);
say('  untranslated strings: ' + untranslated.size);

// Split the two causes: a missing dictionary entry needs writing; an entry
// that already exists but was never applied means the runtime path skips it.
const missingEntry = [];
const notApplied = [];
for (const [text, where] of untranslated) {
  const entry = RU[text];
  if (entry !== undefined && /[A-Za-z]{3,}/.test(String(entry))) notApplied.push([text, where]);
  else missingEntry.push([text, where]);
}

if (roleConfirmed.length) {
  say('');
  say('== SETUP PROBLEMS ==');
  roleConfirmed.forEach(r => say('   ' + r));
}

function dump(title, rows) {
  if (!rows.length) return;
  say('');
  say('== ' + title + ' (' + rows.length + ') ==');
  const sorted = rows.slice().sort((a, b) => a[0].localeCompare(b[0]));
  for (const [text, where] of sorted) {
    say('   ' + JSON.stringify(text));
    say('        seen on: ' + [...where].slice(0, 3).join('  '));
  }
}

dump('NO DICTIONARY ENTRY -- wording has to be written', missingEntry);
dump('ENTRY EXISTS BUT NEVER APPLIED -- runtime path bug', notApplied);

say('');
say('RESULT: ' + (untranslated.size === 0 && roleConfirmed.length === 0
  ? 'fully Russian.'
  : untranslated.size + ' strings still in English (' +
    missingEntry.length + ' need wording, ' + notApplied.length + ' need wiring).'));

const report = lines.join('\n');
// Written directly so the console encoding cannot corrupt Cyrillic.
fs.writeFileSync(path.join(__dirname, 'ru-coverage-report.txt'), report + '\n', 'utf8');
console.log(report);
process.exit(untranslated.size === 0 && roleConfirmed.length === 0 ? 0 : 1);
