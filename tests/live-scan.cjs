'use strict';
// ============================================================
//  NOKJ live scan
//
//  Boots the real frontend/index.html in a headless DOM, signs in as each
//  role, and drives every portal. Anything that throws, logs an error, or
//  leaves a portal rendering an empty shell is reported.
//
//  jsdom is installed outside the repo on purpose so package.json stays clean.
//  Usage: node tests/live-scan.cjs
// ============================================================

const fs = require('fs');
const path = require('path');
// Resolved by run-live.cjs, which passes NOKJ_JSDOM through. Falls back to a
// normal resolution so the file also works when invoked directly.
const JSDOM_MODULE = (() => {
  const candidates = [];
  if (process.env.NOKJ_JSDOM) candidates.push(process.env.NOKJ_JSDOM);
  candidates.push('jsdom');
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try the next one */ }
  }
  console.error('jsdom could not be loaded. Run this via: npm run test:live');
  process.exit(1);
})();
const { JSDOM, VirtualConsole } = JSDOM_MODULE;

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'frontend', 'scripts');
const INDEX = path.join(ROOT, 'frontend', 'index.html');

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

// A real http origin is required: localStorage is blocked on opaque origins
// such as file://, and the app is entirely storage driven.
const APP_ORIGIN = process.env.NOKJ_ORIGIN || 'http://localhost:4173/';
const SUITE_URL = APP_ORIGIN + 'suite/index.html';
const INDEX_URL = APP_ORIGIN + 'index.html';
const SUITE_SCRIPTS = [
  '../scripts/modules/task-blocks.js',
  '../scripts/modules/task-blocks-core.js',
  '../scripts/modules/task-blocks-geo.js',
  '../scripts/modules/task-blocks-math.js',
  '../scripts/modules/task-blocks-english.js',
  'suite.js'
];

const SCRIPT_RE = /<script\s+src="([^"]+)"[^>]*>\s*<\/script>/g;

function seedStorage(role) {
  // Minimal but realistic data set: one teacher, one admin, two students,
  // a course with modules/lessons, and work in every course section.
  const teacher = { id: 1, name: 'Tara Teacher', email: 'teacher@nokj.test', role: 'Teacher', status: 'Active', subject: 'Maths' };
  const admin = { id: 2, name: 'Adam Admin', email: 'admin@nokj.test', role: 'Admin', status: 'Active' };
  const s1 = { id: 10, name: 'Sami Student', email: 'sami@nokj.test', role: 'Student', status: 'Active' };
  const s2 = { id: 11, name: 'Nour Student', email: 'nour@nokj.test', role: 'Student', status: 'Active' };
  const now = new Date().toISOString();
  const soon = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];
  const past = new Date(Date.now() - 2 * 864e5).toISOString().split('T')[0];

  const course = {
    id: 5, name: 'Geometry', teacherId: 1, emoji: '📐', code: 'GEO-101',
    description: 'Shapes and space', published: true, status: 'active',
    createdAt: now.split('T')[0], updatedAt: now.split('T')[0],
    modules: [{
      id: 501, title: 'Basics', published: true, order: 0, description: 'Start here',
      lessons: [
        { id: 5011, title: 'Points', body: '<p>A point.</p>', published: true, order: 0, type: 'text' },
        { id: 5012, title: 'Lines', body: '<p>A line.</p>', published: false, order: 1, type: 'text' }
      ]
    }],
    materials: [
      { id: 502, kind: 'note', title: 'Notes', body: 'Some notes', published: true, createdAt: now.split('T')[0] },
      { id: 503, kind: 'link', title: 'Ref', url: 'https://example.com', published: true, createdAt: now.split('T')[0] }
    ]
  };

  const tasks = [
    { id: 1, title: 'Interactive task', type: 'interactive', courseId: 5, teacherId: 1, assignedTo: 'course', assignedIds: [5], published: true, priority: 'medium', description: 'Do it', deadline: soon, createdAt: past, files: [], questions: [] },
    { id: 2, title: 'Assignment work', type: 'assignment', courseId: 5, teacherId: 1, assignedTo: 'course', assignedIds: [5], published: true, priority: 'high', description: 'Write it', deadline: soon, createdAt: past, files: [], questions: [] },
    { id: 3, title: 'Draft task', type: 'homework', courseId: 5, teacherId: 1, assignedTo: 'course', assignedIds: [5], published: false, priority: 'low', description: 'Hidden', deadline: soon, createdAt: past, files: [], questions: [] },
    { id: 4, title: 'Plain task', type: 'homework', courseId: 5, teacherId: 1, assignedTo: 'course', assignedIds: [5], published: true, priority: 'medium', description: 'Type an answer', deadline: soon, createdAt: past, files: [], questions: [] }
  ];
  const tests = [
    { id: 7, title: 'Course test', type: 'test', courseId: 5, teacherId: 1, published: true, description: 'A test', deadline: soon, createdAt: past, blocks: [], questions: [{ text: 'Q1', type: 'mcq', options: ['a', 'b'], correct: 0 }] }
  ];

  // Two courses so a student enrolled in more than one can be exercised: the
  // grades table is one row per student with a per-course breakdown.
  const course2 = {
    id: 6, name: 'Statistics', teacherId: 1, emoji: '📊', code: 'STA-201',
    description: 'Data and averages.', published: true, status: 'active',
    createdAt: now.split('T')[0], updatedAt: now.split('T')[0],
    modules: [{ id: 601, title: 'Averages', published: true, order: 0, description: 'Mean and median', lessons: [
      { id: 6011, title: 'Mean', body: '<p>Add them up, divide by how many.</p>', published: true, order: 0, type: 'text' }
    ] }],
    materials: []
  };

  const store = {
    'nokj-user': JSON.stringify(role === 'admin' ? admin : role === 'teacher' ? teacher : s1),
    'nokj-teachers': JSON.stringify([teacher]),
    'nokj-admins': JSON.stringify([admin]),
    'nokj-students': JSON.stringify([s1, s2]),
    'nokj-courses': JSON.stringify([course, course2]),
    'nokj-enrollments': JSON.stringify([
      { courseId: 5, studentId: 10 }, { courseId: 5, studentId: 11 },
      { courseId: 6, studentId: 10 }
    ]),
    'nokj-tasks': JSON.stringify(tasks),
    // A submission from the second student on task 1, so the teacher review
    // modal has something real to render. The first student's block task is
    // deliberately left unsubmitted for the student portal test.
    'nokj-submissions': JSON.stringify({
      '1-11': { answer: 'Finished the worksheet.', files: [], submittedAt: now, grade: 80, feedback: 'Good work' }
    }),
    'nokj-tests': JSON.stringify(tests),
    'nokj-test-submissions': JSON.stringify({
      '7-11': { answers: { 0: 0 }, submittedAt: now, score: 1, max: 1, grade: null, feedback: '' }
    }),
    'nokj-lesson-progress': '{}',
    'nokj-course-materials': JSON.stringify([
      { id: 502, courseId: 5, kind: 'note', title: 'Notes', body: 'Some notes', published: true, createdAt: now.split('T')[0] },
      { id: 503, courseId: 5, kind: 'link', title: 'Ref', url: 'https://example.com', published: true, createdAt: now.split('T')[0] }
    ])
  };
  return { store, course, tasks, tests, teacher, admin, s1, s2 };
}

// Browsers share one global lexical scope across <script> tags, so `const` in
// one file is visible to the next. Evaluating file by file breaks that, so the
// whole program is evaluated at once and error positions are mapped back to the
// originating file.
function loadProgram(win, root, rels, errors, extra) {
  const parts = [];
  const ranges = [];
  let pos = 0;
  for (const rel of rels) {
    const file = path.join(root, rel.replace(/\//g, path.sep));
    const code = fs.readFileSync(file, 'utf8');
    ranges.push({ rel, start: pos, end: pos + code.length });
    parts.push(code);
    pos += code.length + 1; // the joining newline
  }
  const all = parts.join('\n') + (extra ? '\n' + extra : '');

  // line start offsets, so a stack line:col can be resolved to a file
  const lineStart = [0];
  for (let i = 0; i < all.length; i++) {
    if (all[i] === '\n') lineStart.push(i + 1);
  }
  const locate = (line, col) => {
    const off = lineStart[line - 1];
    if (off === undefined) return '?';
    for (const r of ranges) {
      if (off + (col || 0) >= r.start && off + (col || 0) <= r.end) return r.rel;
    }
    return '?';
  };

  try {
    win.eval(all);
  } catch (e) {
    const m = /<anonymous>:(\d+):(\d+)/.exec(e.stack || '');
    const where = m ? locate(Number(m[1]), Number(m[2])) : '?';
    errors.push('LOAD ' + where + ': ' + e.message);
  }
  return ranges;
}

// Boots index.html with scripts executed in document order.
function boot(role, opts) {
  opts = opts || {};
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message + (e.detail ? ' :: ' + e.detail : '')));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));

  const html = fs.readFileSync(INDEX, 'utf8');
  // Strip the deferred script tags: jsdom does not fetch local file://
  // scripts for us, so we evaluate them ourselves in the same order.
  const order = [];
  for (const m of html.matchAll(SCRIPT_RE)) order.push(m[1]);
  const shell = html.replace(/<script\s+src="[^"]+"\s*defer><\/script>\s*/g, '');

  const dom = new JSDOM(shell, {
    url: INDEX_URL,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const win = dom.window;

  const data = seedStorage(role);
  for (const k of Object.keys(data.store)) {
    win.localStorage.setItem(k, data.store[k]);
  }
  if (opts.blocksPush) {
    // Give the teacher a block task so the block paths are live.
    try {
      const list = JSON.parse(win.localStorage.getItem('nokj-tasks'));
      const b = { id: 'blk1', type: 'mcq', props: { question: '2 + 2?', options: ['3', '4'], correct: 1, explain: '' }, points: 2, graded: true };
      const b2 = { id: 'blk2', type: 'shorttext', props: { question: 'Name a shape', answers: ['square'], caseSensitive: false }, points: 1, graded: true };
      list.push({ id: 6, title: 'Block task', type: 'interactive', courseId: 5, teacherId: 1, assignedTo: 'course', assignedIds: [5], published: true, priority: 'medium', description: 'Blocks', deadline: data.tasks[0].deadline, createdAt: '2024-01-01', files: [], questions: [], blocks: [b, b2] });
      win.localStorage.setItem('nokj-tasks', JSON.stringify(list));
    } catch (e) { /* later */ }
  }

  win.alert = () => {};
  win.confirm = () => true;
  win.prompt = () => 'New thing';
  // jsdom has no layout engine.
  win.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 });
  win.scrollTo = () => {};
  win.matchMedia = win.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  win.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve('') });

  loadProgram(win, path.join(ROOT, 'frontend'), order, errors);
  try { win.document.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); }
  catch (e) { errors.push('DOMContentLoaded: ' + e.message); }

  return { dom, win, errors, data, order };
}

function text(win, id) {
  const el = win.document.getElementById(id);
  return el ? (el.textContent || '') : null;
}

function activePage(win) {
  const p = win.document.querySelector('.page.active');
  return p ? p.id : null;
}

function nonEmpty(win, id) {
  const el = win.document.getElementById(id);
  if (!el) return false;
  return (el.textContent || '').trim().length > 0;
}

// Modal overlays are built with inline styles, and the DOM normalises the
// serialised form (e.g. "position:fixed" becomes "position: fixed"), so match
// on the parsed value rather than the raw attribute text.
function findOverlay(win) {
  for (const el of win.document.querySelectorAll('div[style]')) {
    if ((el.style && el.style.position === 'fixed') || (el.getAttribute('style') || '').indexOf('fixed') !== -1) {
      return el;
    }
  }
  return null;
}

// ---------------------------------------------------------------
// Portals
// ---------------------------------------------------------------

console.log('== Static DOM reference audit ==');
{
  // Every literal getElementById in a script must exist in the markup, unless
  // the file also builds that id itself.
  const htmlNow = fs.readFileSync(INDEX, 'utf8');
  const ids = new Set();
  for (const m of htmlNow.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
  const jsDirAll = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) jsDirAll.push(p);
    }
  })(path.join(ROOT, 'frontend', 'scripts'));
  const missing = [];
  for (const f of jsDirAll) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
      const id = m[1];
      if (ids.has(id)) continue;
      if (src.includes('id="' + id + '"')) continue; // built at runtime
      if (src.includes(".id = '" + id + "'")) continue; // assigned at runtime
      if (src.includes('.id = "' + id + '"')) continue;
      missing.push(path.relative(ROOT, f).replace(/\\/g, '/') + ' -> #' + id);
    }
  }
  check('no script references a removed element', missing.length === 0, missing.join('\n      '));
  // The retired pages must be gone from the markup entirely.
  for (const id of ['tasks', 'tests', 'assignments']) {
    check('page #' + id + ' is removed from the markup', !htmlNow.includes('class="page" id="' + id + '"'));
  }
  check('the interim in-app task designer is gone', !htmlNow.includes('task-designer') && !fs.existsSync(path.join(SCRIPTS_DIR, 'modules', 'task-designer.js')));
}

console.log('== Fresh install (no stored data at all) ==');
{
  // This is the exact case the parseInto() fix addressed: with every key
  // absent, the fallback thunk used to be stored as a function and the very
  // first .map() threw, taking the whole app down.
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const shell = fs.readFileSync(INDEX, 'utf8').replace(/<script\s+src="[^"]+"\s*defer><\/script>\s*/g, '');
  const dom = new JSDOM(shell, { url: INDEX_URL, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  const win = dom.window;
  win.alert = () => {};
  win.confirm = () => true;
  win.scrollTo = () => {};
  win.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
  loadProgram(win, path.join(ROOT, 'frontend'), [...fs.readFileSync(INDEX, 'utf8').matchAll(SCRIPT_RE)].map(m => m[1]), errors,
    // Appended to the program so it runs in the same scope as the app's data
    // variables, which a separate eval() cannot see.
    'window.__probe = (function () {' +
    ' try { return JSON.stringify({' +
    ' students: Array.isArray(students), tasks: Array.isArray(tasks),' +
    ' meetings: Array.isArray(meetings), courses: Array.isArray(courses),' +
    ' tests: Array.isArray(tests), enrollments: Array.isArray(enrollments),' +
    ' studentCount: students.length, courseCount: courses.length' +
    ' }); } catch (e) { return "ERR:" + e.message; }' +
    '})();'
  );
  try { win.document.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); }
  catch (e) { errors.push('DOMContentLoaded: ' + e.message); }
  check('a completely empty install boots', errors.length === 0, errors.join(' | '));
  check('the landing page still renders on first run', !!win.document.querySelector('.landing-hero'));

  // The seeded demo data must be present and be real arrays, not functions.
  const probe = String(win.__probe);
  check('seeded data is real arrays, not functions', probe.indexOf('ERR') === -1 &&
    probe.indexOf('"students":true') !== -1 && probe.indexOf('"tasks":true') !== -1 &&
    probe.indexOf('"meetings":true') !== -1, probe);

  // Signing in as a freshly seeded teacher has to work.
  win.localStorage.setItem('nokj-user', JSON.stringify({ id: 1, name: 'Demo Teacher', email: 'teacher@nokj.edu', role: 'Teacher', status: 'Active' }));
  const signIn = win.document.getElementById('login-form');
  if (signIn) {
    const before = errors.length;
    try { win.document.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { errors.push(e.message); }
    check('signing in on a fresh install does not throw', errors.length === before, errors.join(' | '));
  }
  try { win.openPage('courses'); check('the course page opens on a fresh install', activePage(win) === 'courses'); }
  catch (e) { check('the course page opens on a fresh install', false, e.message); }
  dom.window.close();
}

console.log('== Block grading wiring ==');
{
  // A block that grades must be marked graded, carry a default point value,
  // and expose a collector, otherwise it silently scores nothing.
  const blockFiles = ['task-blocks-core.js', 'task-blocks-geo.js', 'task-blocks-math.js', 'task-blocks-english.js'];
  const issues = [];
  let blockCount = 0;
  for (const f of blockFiles) {
    const src = fs.readFileSync(path.join(SCRIPTS_DIR, 'modules', f), 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const m = /defineBlock\('([^']+)',\s*\{/.exec(line);
      if (!m) return;
      blockCount++;
      let depth = 0, started = false, end = i;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '{') { depth++; started = true; }
          else if (ch === '}') depth--;
        }
        if (started && depth <= 0) { end = j; break; }
      }
      const body = lines.slice(i, end + 1).join('\n');
      const hasGrade = /(^|\n)\s*grade:/.test(body);
      const hasGraded = /graded:\s*true/.test(body);
      const hasCollect = /(^|\n)\s*collect:/.test(body);
      const hasPoints = /defaultPoints:\s*\d+/.test(body);
      const bad = [];
      if (hasGrade && !hasGraded) bad.push('grades but is not marked graded');
      if (hasGraded && !hasGrade) bad.push('marked graded but has no grade()');
      if (hasGraded && !hasPoints) bad.push('graded with no defaultPoints');
      if (hasGrade && !hasCollect) bad.push('grades with no collect()');
      if (bad.length) issues.push(f + ' ' + m[1] + ': ' + bad.join('; '));
    });
  }
  check('every block grading definition is consistent', issues.length === 0, issues.join(' | '));
  check('the block library is populated', blockCount >= 20, 'block count=' + blockCount);
}

console.log('== Guest / landing portal ==');
{
  const html = fs.readFileSync(INDEX, 'utf8');
  const dom = new JSDOM(html.replace(/<script\s+src="[^"]+"\s*defer><\/script>\s*/g, ''), {
    url: INDEX_URL, runScripts: 'dangerously', pretendToBeVisual: true
  });
  check('landing has a hero', !!dom.window.document.querySelector('.landing-hero'));
  check('landing has nav buttons', dom.window.document.querySelectorAll('.nav-button').length > 0);
  check('landing hides the app before sign-in', dom.window.document.getElementById('app').style.display === 'none' || !dom.window.document.getElementById('app').classList.contains('active'), 'app display=' + dom.window.document.getElementById('app').style.display);
  dom.window.close();
}

console.log('== Student portal ==');
try {
{
  const s = boot('student', { blocksPush: true });
  const win = s.win;
  check('student boot is error free', s.errors.length === 0, s.errors.join(' | '));
  check('app is visible for a signed-in student', win.document.getElementById('app').style.display !== 'none' || win.document.getElementById('app').classList.contains('active'), 'display=' + win.document.getElementById('app').style.display);
  check('student has no Course Studio button', win.document.getElementById('course-workspace-btn').style.display === 'none');
  check('student has no admin nav label', win.document.getElementById('admin-nav-label').style.display === 'none');

  win.openPage('courses');
  check('courses page opens', activePage(win) === 'courses', activePage(win));
  check('student sees enrolled course', /Geometry/.test(win.document.getElementById('courses').textContent));

  // Open the course detail and check the four sections render.
  win.openCourse(5);
  const detail = win.document.getElementById('student-courses-container').textContent;
  check('course detail shows the curriculum', /Basics/.test(detail), detail.slice(0, 160));
  check('course detail shows lessons section', /Lessons|Curriculum/.test(detail));
  check('course detail shows a material section', /Material/i.test(detail));
  check('course detail shows an assignments section', /Assignments/.test(detail));
  check('course detail shows a tests section', /Tests/.test(detail));
  check('course detail hides the draft task', !/Draft task/.test(detail));
  check('course detail shows the assignment', /Assignment work/.test(detail));

  // Section switching.
  win.switchCourseSection(5, 'tests');
  const visible = [...win.document.querySelectorAll('[data-course-section-panel]')].filter(p => !p.hidden).map(p => p.dataset.courseSectionPanel);
  check('section switch shows exactly one panel', visible.length === 1 && visible[0] === 'tests', JSON.stringify(visible));

  // Open a block task and submit it.
  const startBtn = win.document.querySelector('[data-cw-open]');
  check('a block task offers a start button', !!startBtn);
  if (startBtn) {
    startBtn.click();
    const host = win.document.getElementById(startBtn.dataset.cwHost);
    check('block document mounts', !!host && !host.hidden && host.innerHTML.length > 0);
    check('mounted blocks render their markup', host.querySelectorAll('.tb-block').length >= 1, String(host.querySelectorAll('.tb-block').length));
    // Answer both blocks.
    const radios = host.querySelectorAll('input[type=radio]');
    if (radios.length) radios[1].checked = true;
    const texts = host.querySelectorAll('input[type=text], textarea');
    for (const t of texts) t.value = 'square';
    const submit = win.document.querySelector('[data-cw-submit][data-cw-host="' + startBtn.dataset.cwHost + '"]');
    if (submit) submit.click();
    const subs = JSON.parse(win.localStorage.getItem('nokj-submissions') || '{}');
    // The block task is #6 and this student is #10, so that is the key to read.
    check('student submission is stored', !!subs['6-10'], JSON.stringify(Object.keys(subs)));
    if (subs['6-10']) {
      const sub = subs['6-10'];
      check('submission carries a block score', typeof sub.score === 'number' && typeof sub.max === 'number', JSON.stringify(sub));
      check('submission scores a fully correct document', sub.score === sub.max, 'score=' + sub.score + ' max=' + sub.max);
      check('submission carries block answers', !!sub.blockAnswers, JSON.stringify(sub.blockAnswers));
      check('submission carries per-block detail', !!sub.blockDetail, JSON.stringify(sub.blockDetail));
      check('submission reaches the db snapshot', (() => {
        const snap = JSON.parse(win.localStorage.getItem('nokj-db-snapshot') || '{}');
        return !!(snap.taskSubmissions && snap.taskSubmissions['6-10']);
      })(), '');
      check('submission leaves the teacher grade for the teacher', sub.grade === null || sub.grade === undefined, JSON.stringify(sub.grade));
    }
  }
  // A classic question test has to be takeable from the course section, and a
  // typed answer has to survive a reload.
  const testCard = win.document.querySelector('[data-cw-take-test]');
  check('a question test offers a start button', !!testCard, 'no take-test button');
  if (testCard) {
    testCard.click();
    const overlay = win.document.getElementById('take-test-modal-overlay');
    check('the take-test modal opens', overlay.classList.contains('open'));
    const radios = win.document.querySelectorAll('#take-test-questions input[type=radio]');
    check('the take-test modal lists the questions', radios.length >= 2, 'radios=' + radios.length);
    radios.forEach((r, i) => { if (i % 2 === 0) r.checked = true; });
    const chosen = win.document.querySelectorAll('#take-test-questions input[type=radio]:checked');
    check('answers can be selected', chosen.length >= 1, 'checked=' + chosen.length);
    win.submitTest(7);
    const ts = JSON.parse(win.localStorage.getItem('nokj-test-submissions') || '{}');
    check('a taken test is recorded', !!ts['7-10'], JSON.stringify(Object.keys(ts)));
    check('a taken test keeps the teacher grade slot', ts['7-10'] && (ts['7-10'].grade === null || ts['7-10'].grade === undefined),
      JSON.stringify(ts['7-10'] && ts['7-10'].grade));
  }
  const answerBox = win.document.querySelector('textarea[data-cw-text]');
  check('a text task offers an answer box', !!answerBox);
  if (answerBox) {
    answerBox.value = 'drafted answer';
    answerBox.dispatchEvent(new win.Event('input', { bubbles: true }));
  }
  s.dom.window.close();
}
} catch (e) {
  failed++;
  failures.push('student portal crashed the scan: ' + e.message);
  console.log('  FAIL  student portal crashed the scan  -> ' + e.message);
  console.log(e.stack);
}

console.log('== Teacher portal ==');
{
  const s = boot('teacher', { blocksPush: true });
  const win = s.win;
  check('teacher boot is error free', s.errors.length === 0, s.errors.join(' | '));
  check('teacher gets the Course Studio button', win.document.getElementById('course-workspace-btn').style.display !== 'none');
  check('teacher has no admin-only buttons', win.document.getElementById('admin-students-btn').style.display === 'none');
  // Phase 2: no separate courses page for a teacher, and budget is admin-only.
  check('teacher does not get the My courses page', win.document.getElementById('my-courses-btn').style.display === 'none',
    'display=' + win.document.getElementById('my-courses-btn').style.display);
  check('teacher does not get the budget nav', win.document.getElementById('admin-budget-btn').style.display === 'none');
  win.openPage('courses');
  check('a teacher asking for courses lands in Course Studio', activePage(win) === 'course-workspace', activePage(win));
  win.openPage('courses-admin');
  check('a teacher asking for the admin courses page is redirected', activePage(win) === 'course-workspace', activePage(win));
  win.openPage('budget');
  check('a teacher asking for budget is turned away', activePage(win) === 'course-workspace', activePage(win));
  check('the teacher never sees budget data', !/\$/.test(win.document.getElementById('course-workspace').textContent),
    'money on the teacher screen');
  // Teachers do still manage grades, so that route must keep working.
  win.openPage('grades');
  check('a teacher can still open Grades', activePage(win) === 'grades', activePage(win));
  // And they only ever see their own courses.
  win.openPage('course-workspace');
  const ownOnly = win.document.getElementById('studio-course-list').textContent;
  check('a teacher sees only their own course', /Geometry/.test(ownOnly), ownOnly.slice(0, 100));

  // Grades: one row per student, expanding to that student's courses.
  win.openPage('grades');
  const gtbody = win.document.getElementById('grade-table-body');
  const studentRows = gtbody.querySelectorAll('tr.grade-student-row');
  const courseRows = gtbody.querySelectorAll('tr.grade-course-row');
  check('grades lists one row per student', studentRows.length === 2, 'student rows=' + studentRows.length);
  check('grades has a course row per enrolment', courseRows.length === 3, 'course rows=' + courseRows.length);
  check('the course rows start collapsed', Array.from(courseRows).every(r => r.classList.contains('hidden')),
    'rows open on load');
  const firstExpander = gtbody.querySelector('[data-grade-expand]');
  check('a student row has an expander', !!firstExpander);
  if (firstExpander) {
    const gid = firstExpander.dataset.gradeExpand;
    firstExpander.click();
    const mine = gtbody.querySelectorAll('tr.grade-course-row[data-grade-for="' + gid + '"]');
    check('clicking a student reveals their courses', mine.length > 0 && Array.from(mine).every(r => !r.classList.contains('hidden')),
      'revealed=' + mine.length);
    check('the expander reports its state', firstExpander.getAttribute('aria-expanded') === 'true');
    firstExpander.click();
    check('clicking again collapses it', Array.from(mine).every(r => r.classList.contains('hidden')));
  }
  check('each course row keeps a grade input', gtbody.querySelectorAll('tr.grade-course-row input.grade-input').length === 3,
    'inputs=' + gtbody.querySelectorAll('tr.grade-course-row input.grade-input').length);
  // Saving from a nested row must still work through the existing delegation.
  const nestedSave = gtbody.querySelector('tr.grade-course-row .save-grade-btn');
  check('a nested course row has a save button', !!nestedSave);
  if (nestedSave) {
    nestedSave.closest('tr').classList.remove('hidden');
    const ginput = win.document.getElementById('grade-input-' + nestedSave.dataset.student + '-' + nestedSave.dataset.course);
    if (ginput) ginput.value = '77';
    nestedSave.click();
    const stored = JSON.parse(win.localStorage.getItem('nokj-grades') || '{}');
    const gkey = nestedSave.dataset.student + '-' + nestedSave.dataset.course;
    check('saving from the nested row stores the grade', stored[gkey] === 77, JSON.stringify(stored));
  }
  // Grades must be scoped: a teacher sees their own courses, not everyone's.
  const otherCourses = JSON.parse(win.localStorage.getItem('nokj-courses'));
  otherCourses.push({ id: 78, name: 'Someone Elses Subject', teacherId: 99, published: true, status: 'active', modules: [], materials: [] });
  win.localStorage.setItem('nokj-courses', JSON.stringify(otherCourses));
  win.loadData();
  win.openPage('grades');
  const filterText = win.document.getElementById('grade-course-filter').textContent;
  check('a teacher is only offered their own courses in Grades', !/Someone Elses Subject/.test(filterText), filterText.slice(0, 140));
  check('a teacher still sees their own course in Grades', /Geometry/.test(filterText), filterText.slice(0, 140));

  win.openPage('course-workspace');
  check('studio opens', activePage(win) === 'course-workspace', activePage(win));
  const studio = win.document.getElementById('course-workspace');
  check('studio lists the teacher course', /Geometry/.test(studio.textContent));

  // Select the course: level 1 is four tabs, Lessons carries the second level.
  win.studioSelectCourse(5);
  check('studio defaults to the lessons tab', win.document.getElementById('studio-pane-lessons').classList.contains('active'));
  check('studio has exactly four level-1 tabs', win.document.querySelectorAll('#studio-tabs [data-studio-tab]').length === 4,
    'tabs=' + win.document.querySelectorAll('#studio-tabs [data-studio-tab]').length);
  check('studio has four level-2 tabs under lessons', win.document.querySelectorAll('#studio-subtabs [data-studio-sub]').length === 4,
    'subtabs=' + win.document.querySelectorAll('#studio-subtabs [data-studio-sub]').length);
  check('lessons opens on the Lesson sub-tab', win.document.getElementById('studio-subpane-lesson').classList.contains('active'));
  check('lessons pane shows the module', /Basics/.test(win.document.getElementById('studio-module-list').textContent));
  check('lessons pane shows the draft lesson to its teacher', /Lines/.test(win.document.getElementById('studio-module-list').textContent));

  // Only one sub-pane is visible at a time.
  const visibleSubs = [...win.document.querySelectorAll('.studio-subpane')].filter(p => p.classList.contains('active')).map(p => p.id);
  check('only one sub-pane is active', visibleSubs.length === 1 && visibleSubs[0] === 'studio-subpane-lesson', JSON.stringify(visibleSubs));

  win.studioSetSubTab('task');
  check('task sub-pane activates', win.document.getElementById('studio-subpane-task').classList.contains('active'));
  const matList = win.document.getElementById('studio-material-tasks').textContent;
  check('task sub-section lists the interactive task', /Interactive task/.test(matList), matList.slice(0, 200));
  check('task sub-section lists the plain task', /Plain task/.test(matList));
  check('task sub-section lists the draft for the teacher', /Draft task/.test(matList));

  win.studioSetSubTab('assignment');
  check('assignment sub-pane activates', win.document.getElementById('studio-subpane-assignment').classList.contains('active'));
  const asgList = win.document.getElementById('studio-assignment-list').textContent;
  check('assignment sub-section lists only assignments', /Assignment work/.test(asgList) && !/Interactive task/.test(asgList), asgList.slice(0, 200));

  win.studioSetSubTab('test');
  check('test sub-pane activates', win.document.getElementById('studio-subpane-test').classList.contains('active'));
  const testList = win.document.getElementById('studio-test-list').textContent;
  check('test sub-section lists the course test', /Course test/.test(testList), testList.slice(0, 200));

  // Library is its own level-1 tab and must hold only library items.
  win.studioSetTab('library');
  check('library tab activates', win.document.getElementById('studio-pane-library').classList.contains('active'));
  check('the lessons tab is now hidden', !win.document.getElementById('studio-pane-lessons').classList.contains('active'));
  check('library lists the existing notes and links', /Notes|Ref/.test(win.document.getElementById('studio-lib-list').textContent),
    win.document.getElementById('studio-lib-list').textContent.slice(0, 120));
  check('library holds no task list', !win.document.getElementById('studio-pane-library').contains(win.document.getElementById('studio-material-tasks')));

  // The build-method prompt.
  win.studioSetTab('lessons');
  win.studioSetSubTab('task');
  win.askBuildMethod('material');
  const overlay = win.document.getElementById('build-method-overlay');
  check('build method overlay opens', overlay.classList.contains('open'));
  check('overlay offers both paths', !!win.document.getElementById('build-method-basic') && !!win.document.getElementById('build-method-suite'));
  win.document.getElementById('build-method-cancel').click();
  check('overlay closes on cancel', !overlay.classList.contains('open'));

  // The basic path should open the task modal pointed at this course.
  win.askBuildMethod('material');
  win.document.getElementById('build-method-basic').click();
  check('basic path opens the task modal', win.document.getElementById('task-modal-overlay').classList.contains('open'));
  check('basic path targets this course', win.document.getElementById('task-modal-assign').value === 'course');
  const checked = [...win.document.querySelectorAll('.task-assign-checkbox')].filter(c => c.checked).map(c => c.value);
  check('basic path pre-checks the current course', checked.length === 1 && checked[0] === '5', JSON.stringify(checked));

  // Create a task through the real form submit.
  win.document.getElementById('task-modal-title-input').value = 'Made in studio';
  win.document.getElementById('task-modal-description').value = 'From the course section';
  win.document.getElementById('task-modal-deadline').value = '2030-01-01';
  win.document.getElementById('task-modal-form').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  const after = JSON.parse(win.localStorage.getItem('nokj-tasks'));
  const made = after.filter(t => t.title === 'Made in studio')[0];
  check('basic upload creates a task', !!made);
  if (made) {
    check('created task is owned by the course', made.courseId === 5, JSON.stringify({ courseId: made.courseId, assignedIds: made.assignedIds }));
    check('created task is assigned to the course', made.assignedTo === 'course' && String(made.assignedIds) === '5', JSON.stringify(made.assignedIds));
  }
  check('studio section re-renders after create', /Made in studio/.test(win.document.getElementById('studio-material-tasks').textContent));

  // Deploy a draft.
  win.studioSetTab('material');
  const deploy = win.document.querySelector('[data-work-deploy]');
  check('a draft offers a deploy button', !!deploy);
  if (deploy) {
    deploy.click();
    const t2 = JSON.parse(win.localStorage.getItem('nokj-tasks')).filter(t => t.title === 'Draft task')[0];
    check('deploy publishes the draft', t2 && t2.published === true, JSON.stringify(t2 && t2.published));
  }

  // Ownership: the teacher must not manage another teacher's course.
  const other = JSON.parse(win.localStorage.getItem('nokj-courses'));
  other.push({ id: 77, name: 'Not mine', teacherId: 99, published: true, status: 'active', modules: [], materials: [] });
  win.localStorage.setItem('nokj-courses', JSON.stringify(other));
  win.loadData && win.loadData();
  check('teacher cannot open another course in the studio', win.canManageCourse(77) === false);

  // The submissions review and the basic test form used to hang off the
  // removed pages, so they must be reachable from the course sections.
  // Selectors are scoped to the list: the other sections keep their rendered
  // children in the DOM even while hidden, and ids can collide across kinds.
  win.openCourse(5);
  const subBtn = win.document.querySelector('#studio-material-tasks [data-work-submissions="1"]');
  check('the work list offers a submissions action', !!subBtn);
  if (subBtn) {
    subBtn.click();
    const overlay = findOverlay(win);
    check('submissions review opens a modal', !!overlay, 'no overlay found');
    check('submissions review names the student', !!overlay && /Nour Student/.test(overlay.textContent), overlay ? overlay.textContent.slice(0, 120) : '');
    check('submissions review shows the teacher grade', !!overlay && /80/.test(overlay.textContent), overlay ? overlay.textContent.slice(0, 120) : '');
    if (overlay) overlay.remove();
  }
  win.studioSetTab('tests');
  const testSubBtn = win.document.querySelector('#studio-test-list [data-work-submissions="7"]');
  check('the tests list offers a submissions action', !!testSubBtn);
  if (testSubBtn) {
    testSubBtn.click();
    const overlay = findOverlay(win);
    check('test submissions review opens a modal', !!overlay, 'no overlay found');
    check('test submissions review names the student', !!overlay && /Nour Student/.test(overlay.textContent), overlay ? overlay.textContent.slice(0, 160) : '');
    if (overlay) overlay.remove();
  }

  // The basic (question based) test form, opened from the Tests section.
  win.askBuildMethod('tests');
  win.document.getElementById('build-method-basic').click();
  check('basic test path opens the test modal', win.document.getElementById('test-modal-overlay').classList.contains('open'));
  const sel = win.document.getElementById('test-modal-course');
  check('basic test form targets the current course', sel.value === '5', 'value=' + sel.value);
  s.dom.window.close();
}

console.log('== Admin portal ==');
{
  const s = boot('admin');
  const win = s.win;
  check('admin boot is error free', s.errors.length === 0, s.errors.join(' | '));
  const adminIds = ['admin-students-btn', 'admin-budget-btn', 'admin-courses-btn', 'admin-grades-btn', 'admin-calendar-btn', 'admin-approvals-btn'];
  const hidden = adminIds.filter(id => win.document.getElementById(id).style.display === 'none');
  check('admin sees every management button', hidden.length === 0, 'hidden: ' + hidden.join(', '));
  check('admin can manage the course', win.canManageCourse(5) === true);

  // Walk every admin page; none may throw.
  for (const p of ['dashboard', 'timetable', 'courses', 'announcements', 'classroom', 'students', 'budget', 'courses-admin', 'course-workspace', 'grades', 'calendar', 'approvals', 'profile']) {
    const before = s.errors.length;
    try { win.openPage(p); } catch (e) { s.errors.push('openPage(' + p + '): ' + e.message); }
    check('admin can open ' + p, s.errors.length === before && activePage(win) === p, 'active=' + activePage(win));
  }
  s.dom.window.close();
}

console.log('== Interactive blocks (word / sentence builder) ==');
{
  // These two used to render the *unused* tiles inside the answer slot, so the
  // student's answer could never match. Drive them like a student would.
  const html2 = fs.readFileSync(INDEX, 'utf8');
  const order2 = [...html2.matchAll(/<script\s+src="([^"]+)"[^>]*>\s*<\/script>/g)].map(m => m[1]);
  const shell2 = html2.replace(/<script\s+src="[^"]+"\s*defer><\/script>\s*/g, '');
  const dom = new JSDOM(shell2, { url: INDEX_URL, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const win = dom.window;
  const errs = [];
  let all2 = '';
  for (const rel of order2) all2 += fs.readFileSync(path.join(ROOT, 'frontend', rel.replace(/\//g, path.sep)), 'utf8') + '\n';
  try { win.eval(all2); } catch (e) { errs.push(e.message); }
  check('block modules load', errs.length === 0, errs.join(' | '));

  const word = win.makeBlock('wordbuild');
  word.props.word = 'cat';
  word.props.clue = 'A small pet.';
  const host = win.document.createElement('div');
  host.innerHTML = win.renderTaskBlocks([word], { editing: false });
  win.mountTaskBlocks(host, [word], { editing: false });
  const tiles = host.querySelectorAll('.tb-tiles .tb-tile');
  check('word builder renders one tile per letter', tiles.length === 3, 'tiles=' + tiles.length);
  // Click the tiles in the order that spells the target word.
  const target = 'cat';
  for (const ch of target) {
    const t = [...tiles].find(el => el.textContent === ch && !el.disabled);
    if (t) t.click();
  }
  check('word builder collects the spelled word', win.collectTaskAnswers(host, [word])[word.id] === 'cat',
    'collected=' + JSON.stringify(win.collectTaskAnswers(host, [word])[word.id]));
  const wordResult = win.gradeTaskAnswers([word], win.collectTaskAnswers(host, [word]));
  check('word builder grades a correct spelling', wordResult.score === wordResult.max, JSON.stringify(wordResult));
  // Taking a letter back must change the answer.
  const placed = host.querySelector('.tb-slot .tb-tile-placed');
  check('placed letters can be taken back', !!placed);
  if (placed) {
    placed.click();
    const after = win.collectTaskAnswers(host, [word])[word.id];
    check('taking a letter back changes the answer', after !== 'cat', 'after=' + JSON.stringify(after));
  }
  check('the slot shows the answer, not the leftovers', host.querySelectorAll('.tb-slot .tb-tile-placed').length <= 3,
    'placed=' + host.querySelectorAll('.tb-slot .tb-tile-placed').length);

  const sent = win.makeBlock('unscramble');
  sent.props.sentence = 'the cat sat';
  sent.props.scramble = true;
  const host2 = win.document.createElement('div');
  host2.innerHTML = win.renderTaskBlocks([sent], { editing: false });
  win.mountTaskBlocks(host2, [sent], { editing: false });
  // Click the bank tiles in the order that spells the sentence.
  for (const w of sent.props.sentence.split(' ')) {
    const t = [...host2.querySelectorAll('.tb-tiles .tb-tile')].find(el => el.textContent === w && !el.disabled);
    if (t) t.click();
  }
  const got = win.collectTaskAnswers(host2, [sent])[sent.id];
  check('sentence builder collects the chosen order', got === 'the cat sat', 'collected=' + JSON.stringify(got));
  const sentResult = win.gradeTaskAnswers([sent], win.collectTaskAnswers(host2, [sent]));
  check('sentence builder grades the right order', sentResult.score === sentResult.max, JSON.stringify(sentResult));

  // Timers/listeners must be released on teardown.
  win.stopTaskBlocks(host);
  win.stopTaskBlocks(host2);
  check('teardown does not throw', true);
  dom.window.close();
}

console.log('== Removed standalone pages ==');
{
  const s = boot('teacher', { blocksPush: true });
  const win = s.win;
  // A teacher is sent on to Course Studio, which owns their courses.
  for (const p of ['tasks', 'tests', 'assignments']) {
    win.openPage(p);
    check(p + ' redirects a teacher into Course Studio', activePage(win) === 'course-workspace', activePage(win));
  }
  s.dom.window.close();
}
{
  const s = boot('student');
  const win = s.win;
  // A student is sent to their course list.
  for (const p of ['tasks', 'tests', 'assignments']) {
    win.openPage(p);
    check(p + ' redirects a student to their courses', activePage(win) === 'courses', activePage(win));
  }
  s.dom.window.close();
}

console.log('== Task Designer Suite ==');
{
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  const suiteHtml = path.join(ROOT, 'frontend', 'suite', 'index.html');
  const shell = fs.readFileSync(suiteHtml, 'utf8').replace(/<script\s+src="[^"]+"\s*defer><\/script>\s*/g, '');
  const dom = new JSDOM(shell, {
    url: SUITE_URL + '?course=5&kind=material',
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc
  });
  const win = dom.window;
  const teacher = { id: 1, name: 'T', email: 'teacher@nokj.test', role: 'Teacher', status: 'Active' };
  win.localStorage.setItem('nokj-user', JSON.stringify(teacher));
  win.localStorage.setItem('nokj-teachers', JSON.stringify([teacher]));
  win.localStorage.setItem('nokj-courses', JSON.stringify([{ id: 5, name: 'Geometry', teacherId: 1 }]));
  win.localStorage.setItem('nokj-tasks', '[]');
  win.localStorage.setItem('nokj-tests', '[]');
  win.alert = () => {};
  win.confirm = () => true;
  win.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
  loadProgram(win, path.join(ROOT, 'frontend', 'suite'), SUITE_SCRIPTS, errors);
  try { win.document.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); }
  catch (e) { errors.push('DOMContentLoaded: ' + e.message); }

  check('suite boot is error free', errors.length === 0, errors.join(' | '));
  check('suite lock is hidden for a teacher', win.document.getElementById('suite-lock').style.display === 'none' || win.document.getElementById('suite-lock').hidden);
  const ctx = win.document.getElementById('suite-context');
  check('suite shows the course context', ctx && !ctx.hidden && /Geometry/.test(ctx.textContent), ctx && ctx.textContent);
  check('suite shows a back-to-course control', win.document.getElementById('suite-back').hidden === false);
  check('palette is populated', win.document.querySelectorAll('#suite-palette [data-tb-type], #suite-palette button').length > 5, String(win.document.querySelectorAll('#suite-palette button').length));

  // Insert two blocks through the real palette, then preview and deploy.
  const palette = [...win.document.querySelectorAll('#suite-palette button')];
  if (palette.length > 0) {
    palette[0].click();
    palette[1] && palette[1].click();
    check('palette inserts blocks onto the canvas', win.document.querySelectorAll('#suite-blocks .tb-block').length >= 1, String(win.document.querySelectorAll('#suite-blocks .tb-block').length));
  }
  win.document.getElementById('suite-title').value = 'Suite task';
  win.document.getElementById('suite-title').dispatchEvent(new win.Event('input', { bubbles: true }));
  win.document.getElementById('suite-deploy').click();
  const stored = JSON.parse(win.localStorage.getItem('nokj-tasks'));
  check('suite deploy writes a task', stored.length === 1, JSON.stringify(stored.map(t => t.title)));
  if (stored.length) {
    check('suite task lands in the course', stored[0].courseId === 5 && String(stored[0].assignedIds) === '5', JSON.stringify({ courseId: stored[0].courseId, assignedIds: stored[0].assignedIds }));
    check('suite task uses the material type', stored[0].type === 'homework', stored[0].type);
    check('suite task is published', stored[0].published === true);
    check('suite task keeps its blocks', Array.isArray(stored[0].blocks) && stored[0].blocks.length >= 1);
  }
  const snap = win.localStorage.getItem('nokj-db-snapshot');
  check('suite updates the snapshot', !!snap);

  // ---- Suite editing improvements ----
  // Two blocks were already inserted above, so the strip count is n + 1.
  check('insert strips appear between and after blocks',
    win.document.querySelectorAll('#suite-blocks .suite-insert').length === 3,
    'strips=' + win.document.querySelectorAll('#suite-blocks .suite-insert').length);
  check('undo is enabled once something has been inserted', win.document.getElementById('suite-undo').disabled === false);
  // Delete the last block, then undo it back.
  const blocksBefore = win.document.querySelectorAll('#suite-blocks .tb-block').length;
  const delBtn = [...win.document.querySelectorAll('[data-tb-del]')].pop();
  delBtn && delBtn.click();
  const blocksAfterDelete = win.document.querySelectorAll('#suite-blocks .tb-block').length;
  check('deleting a block removes it', blocksAfterDelete === blocksBefore - 1,
    blocksBefore + ' -> ' + blocksAfterDelete);
  check('undo becomes available', win.document.getElementById('suite-undo').disabled === false);
  win.document.getElementById('suite-undo').click();
  check('undo restores the deleted block', win.document.querySelectorAll('#suite-blocks .tb-block').length === blocksBefore,
    'after undo=' + win.document.querySelectorAll('#suite-blocks .tb-block').length);
  check('redo becomes available', win.document.getElementById('suite-redo').disabled === false);
  // Folding a block must hide its body.
  const fold = win.document.querySelector('[data-tb-collapse]');
  check('a block has a fold control', !!fold);
  if (fold) {
    const id = fold.getAttribute('data-tb-collapse');
    fold.click();
    const card = win.document.querySelector('#suite-blocks [data-tb-id="' + id + '"]');
    check('folding a block hides its body', !!card && card.classList.contains('tb-collapsed'));
    fold.click();
  }
  // The outline lists what is on the page.
  check('the outline lists every block', win.document.querySelectorAll('#suite-outline .suite-outline-row').length === blocksBefore,
    'outline=' + win.document.querySelectorAll('#suite-outline .suite-outline-row').length);
  // The empty state appears when everything is removed. Each delete re-renders
  // the canvas, so the button has to be re-queried each time.
  let deleted = 0;
  for (let guard = 0; guard < 10; guard++) {
    const d = win.document.querySelector('[data-tb-del]');
    if (!d) break;
    d.click();
    deleted++;
  }
  check('an empty page shows the empty state', !!win.document.querySelector('.suite-canvas-empty'),
    'blocks left=' + win.document.querySelectorAll('#suite-blocks .tb-block').length);
  // Undo is one step per press, so step back once per deletion.
  for (let i = 0; i < deleted; i++) win.document.getElementById('suite-undo').click();
  check('undo brings the blocks back', win.document.querySelectorAll('#suite-blocks .tb-block').length === blocksBefore,
    'after ' + deleted + ' undos=' + win.document.querySelectorAll('#suite-blocks .tb-block').length + ' expected ' + blocksBefore);

  // ---- Suite language ----
  const langBtn = win.document.getElementById('suite-lang');
  check('the Suite has a language toggle', !!langBtn);
  if (langBtn) {
    check('the Suite starts in English', /EN/.test(langBtn.textContent), langBtn.textContent);
    langBtn.click();
    check('the toggle switches to Russian', /RU/.test(langBtn.textContent), langBtn.textContent);
    check('the palette is translated', /Заголовок|Текст|Вопрос/.test(win.document.getElementById('suite-palette').textContent),
      win.document.getElementById('suite-palette').textContent.slice(0, 80));
    check('the toolbar is translated', /Опубликовать/.test(win.document.getElementById('suite-deploy').textContent),
      win.document.getElementById('suite-deploy').textContent);
    check('the category names are translated', /География|Математика|Английский/.test(win.document.getElementById('suite-palette').textContent),
      win.document.getElementById('suite-palette').textContent.slice(0, 120));
    langBtn.click();
    check('the toggle switches back to English', /EN/.test(langBtn.textContent), langBtn.textContent);
  }

  // A test-kind suite must write to nokj-tests instead.
  const dom2 = new JSDOM(shell, {
    url: SUITE_URL + '?course=5&kind=test',
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole()
  });
  const w2 = dom2.window;
  w2.localStorage.setItem('nokj-user', JSON.stringify(teacher));
  w2.localStorage.setItem('nokj-teachers', JSON.stringify([teacher]));
  w2.localStorage.setItem('nokj-courses', JSON.stringify([{ id: 5, name: 'Geometry', teacherId: 1 }]));
  w2.localStorage.setItem('nokj-tasks', '[]');
  w2.localStorage.setItem('nokj-tests', '[]');
  w2.alert = () => {}; w2.confirm = () => true;
  w2.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
  for (const src of ['../scripts/modules/task-blocks.js', '../scripts/modules/task-blocks-core.js', '../scripts/modules/task-blocks-geo.js', '../scripts/modules/task-blocks-math.js', '../scripts/modules/task-blocks-english.js', 'suite.js']) {
    try { w2.eval(fs.readFileSync(path.join(ROOT, 'frontend', 'suite', src.replace(/\//g, path.sep)), 'utf8')); } catch (e) { errors.push('test-kind LOAD ' + src + ': ' + e.message); }
  }
  try { w2.document.dispatchEvent(new w2.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { errors.push('test-kind DOMContentLoaded: ' + e.message); }
  w2.document.getElementById('suite-title').value = 'Suite test';
  w2.document.getElementById('suite-title').dispatchEvent(new w2.Event('input', { bubbles: true }));
  const p2 = [...w2.document.querySelectorAll('#suite-palette button')];
  p2[0] && p2[0].click();
  w2.document.getElementById('suite-deploy').click();
  const t2 = JSON.parse(w2.localStorage.getItem('nokj-tests'));
  const k2 = JSON.parse(w2.localStorage.getItem('nokj-tasks'));
  check('a test-kind suite writes to nokj-tests', t2.length === 1 && t2[0].title === 'Suite test', JSON.stringify(t2.map(t => t.title)));
  check('a test-kind suite leaves nokj-tasks alone', k2.length === 0, JSON.stringify(k2.map(t => t.title)));
  if (t2.length) check('suite test is tied to the course', t2[0].courseId === 5, JSON.stringify(t2[0].courseId));

  // A teacher must not be able to open someone else's course in the suite.
  const dom3 = new JSDOM(shell, {
    url: SUITE_URL + '?course=6&kind=material',
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole()
  });
  const w3 = dom3.window;
  w3.localStorage.setItem('nokj-user', JSON.stringify(teacher));
  w3.localStorage.setItem('nokj-teachers', JSON.stringify([teacher]));
  w3.localStorage.setItem('nokj-courses', JSON.stringify([{ id: 6, name: 'Someone else', teacherId: 99 }]));
  w3.alert = () => {}; w3.confirm = () => true;
  loadProgram(w3, path.join(ROOT, 'frontend', 'suite'), SUITE_SCRIPTS, errors);
  try { w3.document.dispatchEvent(new w3.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { errors.push('foreign DOMContentLoaded: ' + e.message); }
  check('suite refuses another teacher course', /another teacher/.test(w3.document.getElementById('suite-lock-msg').textContent), w3.document.getElementById('suite-lock-msg').textContent);

  // A student must not get the editor at all.
  const dom4 = new JSDOM(shell, {
    url: SUITE_URL,
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole()
  });
  const w4 = dom4.window;
  w4.localStorage.setItem('nokj-user', JSON.stringify({ id: 10, name: 'S', email: 's@nokj.test', role: 'Student', status: 'Active' }));
  w4.localStorage.setItem('nokj-teachers', JSON.stringify([teacher]));
  loadProgram(w4, path.join(ROOT, 'frontend', 'suite'), SUITE_SCRIPTS, errors);
  try { w4.document.dispatchEvent(new w4.Event('DOMContentLoaded', { bubbles: true })); } catch (e) { errors.push('student DOMContentLoaded: ' + e.message); }
  check('suite locks out a student', /teachers and admins/.test(w4.document.getElementById('suite-lock-msg').textContent), w4.document.getElementById('suite-lock-msg').textContent);
  check('suite lock is shown to a student', w4.document.getElementById('suite-lock').style.display !== 'none');

  dom.window.close(); dom2.window.close(); dom3.window.close(); dom4.window.close();
}

console.log('');
console.log('Checks: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('');
  console.log('Failures:');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
