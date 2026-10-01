'use strict';
// Verifies the eyeball demo seeder really produces a populated, working app,
// so it is not handed over untested. Boots the app, runs the seeder, then
// checks every portal renders real content.
const fs = require('fs');
const path = require('path');
const JSDOM_MODULE = (() => {
  const c = [];
  if (process.env.NOKJ_JSDOM) c.push(process.env.NOKJ_JSDOM);
  c.push('jsdom');
  for (const x of c) { try { return require(x); } catch (e) {} }
  console.error('jsdom not available');
  process.exit(1);
})();
const { JSDOM, VirtualConsole } = JSDOM_MODULE;

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'frontend', 'index.html');
const ORIGIN = process.env.NOKJ_ORIGIN || 'http://localhost:4173/';

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}

function appProgram() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const order = [...html.matchAll(/<script\s+src="([^"]+)"[^>]*>\s*<\/script>/g)].map(m => m[1]);
  let all = '';
  for (const rel of order) all += fs.readFileSync(path.join(ROOT, 'frontend', rel.replace(/\//g, path.sep)), 'utf8') + '\n';
  return all;
}

// Each jsdom instance has its own isolated localStorage, so a real "reload"
// has to be simulated by re-evaluating the program in the same window.
function boot() {
  const errors = [];
  const html = fs.readFileSync(INDEX, 'utf8');
  const shell = html.replace(/<script\s+src="[^"]+"\s*defer><\/script>\s*/g, '');
  const dom = new JSDOM(shell, { url: ORIGIN + 'index.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.alert = () => {};
  w.confirm = () => true;
  w.prompt = () => 'X';
  w.scrollTo = () => {};
  w.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
  return { dom, win: w, errors };
}

function loadApp(win, errors, extra) {
  try { win.eval(appProgram() + (extra ? '\n' + extra : '')); } catch (e) { errors.push('LOAD: ' + e.message); }
  try { win.document.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true })); }
  catch (e) { errors.push('DCL: ' + e.message); }
}

const seedSrc = fs.readFileSync(path.join(__dirname, 'demo-seed.js'), 'utf8')
  // jsdom cannot navigate, so drop the trailing reload.
  .replace(/location\.reload\(\);?/g, '');

// Mirrors the real flow: the seeder writes to storage, then the page loads and
// reads it. The app program is evaluated exactly once so there is a single
// clean scope, which a double eval would not give us.
function seedAndBoot(user) {
  const { dom, win, errors } = boot();
  win.localStorage.setItem('nokj-user', JSON.stringify(user));
  // The seeder reads these pools; a real user has them because the app has
  // already run and seeded them.
  if (!win.localStorage.getItem('nokj-students')) {
    win.localStorage.setItem('nokj-students', JSON.stringify([
      { id: 1, name: 'Alex Student', email: 'student@nokj.com', role: 'Student', status: 'Active' },
      { id: 2, name: 'Sarah Chen', email: 'sarah@example.com', role: 'Student', status: 'Active' }
    ]));
  }
  if (!win.localStorage.getItem('nokj-teachers')) {
    win.localStorage.setItem('nokj-teachers', JSON.stringify([
      { id: 1, name: 'Dr. Wilson', email: 'wilson@nokj.com', role: 'Teacher', status: 'Active' }
    ]));
  }
  if (!win.localStorage.getItem('nokj-enrollments')) win.localStorage.setItem('nokj-enrollments', '[]');
  try { win.eval(seedSrc); } catch (e) { errors.push('SEED: ' + e.message); }
  loadApp(win, errors, process.env.SEED_DEBUG
    ? 'window.__dbg = (function(){try{return "courses="+courses.length+" teachers="+teachers.length+" role="+(currentUser&&currentUser.role)+" manage1="+canManageCourse(1)+" mods="+JSON.stringify((courses[0]&&courses[0].modules||[]).length)+" rawuser="+String(localStorage.getItem("nokj-user")).slice(0,40)+" byEmail="+!!getUserByEmail("wilson@nokj.com")+" landed="+!!document.querySelector(".landing-hero");}catch(e){return "ERR:"+e.message;}})();'
    : '');
  return { dom, win, errors };
}

const teacher = { id: 1, name: 'Dr. Wilson', email: 'wilson@nokj.com', role: 'Teacher', status: 'Active' };
const student = { id: 1, name: 'Alex Student', email: 'student@nokj.com', role: 'Student', status: 'Active' };

console.log('== Seeder produces a populated teacher studio ==');
{
  const { dom, win, errors } = seedAndBoot(teacher);
  if (process.env.SEED_DEBUG) {
    console.log('    [debug] ' + win.__dbg);
    console.log('    [debug] studio list = ' + JSON.stringify(win.document.getElementById('studio-course-list').textContent.slice(0, 80)));
  }
  check('seed + boot is error free', errors.length === 0, errors.join(' | '));
  win.openPage('course-workspace');
  win.studioSelectCourse(1);
  const lessons = win.document.getElementById('studio-module-list').textContent;
  check('lessons show both modules', /Shapes and angles/.test(lessons) && /Area and perimeter/.test(lessons), lessons.slice(0, 120));
  check('lessons show the draft lesson to the teacher', /trigonometry intro/.test(lessons));
  win.studioSetTab('lessons');
  win.studioSetSubTab('task');
  const mat = win.document.getElementById('studio-material-tasks').textContent;
  check('material shows the block task', /Fractions checkpoint/.test(mat), mat.slice(0, 160));
  check('material shows the draft task', /Draft: end of unit quiz/.test(mat));
  // Homework is the individual work a student must finish alone, so it lives
  // in the homework section rather than alongside class and extra work.
  check('material does not list homework', !/Homework: shape hunt/.test(mat), mat.slice(0, 160));
  win.studioSetSubTab('assignment');
  const hw = win.document.getElementById('studio-assignment-list').textContent;
  check('homework shows the shape hunt', /Homework: shape hunt/.test(hw), hw.slice(0, 160));
  check('homework shows the migrated worksheet', /Area worksheet/.test(hw), hw.slice(0, 160));
  win.studioSetSubTab('task');
  win.studioSetTab('library');
  check('library shows the published items', /Formula sheet/.test(win.document.getElementById('studio-pane-library').textContent));
  check('library shows the draft note to its teacher', /Draft: exam tips/.test(win.document.getElementById('studio-pane-library').textContent));
  win.studioSetTab('lessons');
  win.studioSetSubTab('assignment');
  check('assignments shows the worksheet', /Area worksheet/.test(win.document.getElementById('studio-assignment-list').textContent));
  win.studioSetSubTab('test');
  check('tests shows the quiz', /Unit 1 quiz/.test(win.document.getElementById('studio-test-list').textContent));
  // submissions review must find the seeded work
  const btn = win.document.querySelector('#studio-material-tasks [data-work-submissions="1"]');
  check('block task offers submissions', !!btn);
  if (btn) {
    btn.click();
    let overlay = null;
    for (const d of win.document.querySelectorAll('div[style]')) {
      if (d.getAttribute('style').indexOf('fixed') !== -1) { overlay = d; break; }
    }
    check('submissions review opens with the seeded score', !!overlay && /6 \/ 6/.test(overlay.textContent),
      overlay ? overlay.textContent.slice(0, 140) : 'no overlay');
    if (overlay) overlay.remove();
  }
  dom.window.close();
}

console.log('== Seeder produces a populated student course ==');
{
  const { dom, win, errors } = seedAndBoot(student);
  check('seed + boot is error free', errors.length === 0, errors.join(' | '));
  win.openCourse(1);
  const detail = win.document.getElementById('student-courses-container').textContent;
  check('student sees the course', /Geometry Essentials/.test(detail));
  check('student sees the lessons', /Points, lines and planes/.test(detail));
  check('student cannot see the draft lesson', !/trigonometry intro/.test(detail), 'draft leaked to student');
  check('student cannot see the draft task', !/Draft: end of unit quiz/.test(detail), 'draft task leaked to student');
  check('student sees the assignment', /Area worksheet/.test(detail));
  check('student sees the library notes', /Formula sheet/.test(detail));

  // The block document must mount and render every seeded block.
  const start = win.document.querySelector('[data-cw-open]');
  check('a block task offers Start', !!start);
  if (start) {
    start.click();
    const host = win.document.getElementById(start.dataset.cwHost);
    check('block document mounts', !!host && !host.hidden);
    const kinds = [...host.querySelectorAll('.tb-block')].map(b => b.className);
    check('all five seeded blocks render', host.querySelectorAll('.tb-block').length === 5,
      'count=' + host.querySelectorAll('.tb-block').length);
    check('the key facts table renders as a table', !!host.querySelector('.tb-kv'), kinds.join(' | '));
    check('the ordering block renders its list', !!host.querySelector('[data-tb-order]'));
    // Answer the mcq correctly and submit, to prove grading end to end.
    const radios = host.querySelectorAll('input[type=radio]');
    if (radios.length) radios[1].checked = true;
    const sub = win.document.querySelector('[data-cw-submit][data-cw-host="' + start.dataset.cwHost + '"]');
    if (sub) sub.click();
    const subs = JSON.parse(win.localStorage.getItem('nokj-submissions') || '{}');
    check('a resubmission is stored', Object.keys(subs).length >= 2, JSON.stringify(Object.keys(subs)));
  }
  // The question test must be takeable from the course.
  const take = win.document.querySelector('[data-cw-take-test]');
  check('a question test offers Start', !!take);
  if (take) {
    take.click();
    check('the take-test modal opens from the course', win.document.getElementById('take-test-modal-overlay').classList.contains('open'));
    // 2 questions x 4 options each.
    check('the take-test modal lists its questions', win.document.querySelectorAll('#take-test-questions input[type=radio]').length === 8,
      'radios=' + win.document.querySelectorAll('#take-test-questions input[type=radio]').length);
  }
  dom.window.close();
}

console.log('');
console.log('Checks: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
