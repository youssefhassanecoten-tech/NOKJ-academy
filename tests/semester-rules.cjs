'use strict';
// ============================================================
//  Semester, homework gating, group and progress-retention rules
//
//  These rules decide whether a student keeps access to material and whether
//  a course outcome is recorded, so they are tested directly against the real
//  implementations in semester.js and groups.js rather than through the UI.
//
//  Every rule takes an explicit `now`, so the tests never depend on the wall
//  clock. Usage: node tests/semester-rules.cjs
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'frontend', 'scripts');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) { passed++; console.log('  PASS  ' + name); }
  else { failed++; failures.push(name + (detail ? ' -> ' + detail : '')); console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}

// ---------------------------------------------------------------
// Harness
// ---------------------------------------------------------------

function freshApp() {
  const store = {};
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; }
    },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { documentElement: {} },
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    isNaN,
    parseInt,
    parseFloat,
    setTimeout: () => {},
    clearTimeout: () => {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);

  const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), context);
  const m = n => path.join(SCRIPTS_DIR, 'modules', n);

  // The two modules under test, loaded in the same order as the app.
  run(m('semester.js'));
  run(m('groups.js'));

  return { context, sandbox, run, m };
}

const DAY = 24 * 60 * 60 * 1000;
function iso(daysFromEpochStart) {
  return new Date(Date.UTC(2026, 0, 1) + daysFromEpochStart * DAY).toISOString();
}

// A group that starts on day 0, with a 90 day semester.
function seed(app) {
  const g = app.context;
  vm.runInContext(`
    students = [{ id: 10, name: 'Ada' }, { id: 11, name: 'Ben' }];
    teachers = [{ id: 1, name: 'Tara' }];
    admins = [{ id: 2, name: 'Adam' }];
    courses = [];
    enrollments = [];
    gradeData = {};
    tasks = [];
    taskSubmissions = {};
    tests = [];
    testSubmissions = {};
    budgetEntries = [];
    announcements = [];
    pendingTeachers = [];
    enrollRequests = [];
    courseRequests = [];
    courseMaterials = [];
    teacherAuthKeys = [];
    meetings = [];
    lessonProgress = {};
    homeworkOutcomes = [];
    pauseRequests = [];
    currentUser = { id: 10, role: 'Student' };
    var idc = 0;
    studioNextId = function (p) { idc++; return p + '-' + idc; };
    defaultCourseSections = function () { return [{ key: 'lessons', title: 'Lessons' }]; };
    saveData = function () {};
    tr = function (s) { return s; };
    escapeHtml = function (s) { return String(s); };
    taskCourseId = function (t) {
      if (t.courseId !== undefined && t.courseId !== null) return t.courseId;
      if (t.assignedTo === 'course' && t.assignedIds && t.assignedIds.length) return t.assignedIds[0];
      return null;
    };
    migrateAssignmentWorkToHomework = function () {
      var changed = 0;
      tasks.forEach(function (t) { if (t && t.type === 'assignment') { t.type = 'homework'; changed++; } });
      return changed;
    };
  `, g);
}

function makeGroup(app, opts) {
  opts = opts || {};
  const c = {
    id: opts.id || 'g1',
    name: opts.name || 'Algebra',
    subjectName: opts.subjectName || opts.name || 'Algebra',
    groupName: opts.groupName || '',
    teacherId: 1,
    semesterStart: opts.semesterStart === undefined ? iso(0) : opts.semesterStart,
    semesterDays: opts.semesterDays === undefined ? 90 : opts.semesterDays,
    courseDurationDays: opts.courseDurationDays === undefined ? 365 : opts.courseDurationDays,
    sections: [{ key: 'lessons', title: 'Lessons' }],
    modules: opts.modules || []
  };
  app.context.courses.push(c);
  return c;
}

function lesson(id, title, order, hwId) {
  return { id, title, order, published: true, homeworkId: hwId || null };
}

// ---------------------------------------------------------------

console.log('== Semester dates ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, {});
  const unset = makeGroup(app, { id: 'g2', semesterStart: '' });

  check('a group whose teacher has not set a start has no end date',
    app.sandbox.groupSemesterEnd(unset) === null);
  check('a group that has set a start does have an end date',
    app.sandbox.groupSemesterEnd(c) !== null);

  check('the default semester is 90 days',
    app.sandbox.semesterDaysFor(c) === 90, String(app.sandbox.semesterDaysFor(c)));

  const end = app.sandbox.groupSemesterEnd(c);
  check('the semester ends 90 days after it starts',
    end.getTime() === Date.parse(iso(90)), end && end.toISOString());

  check('a group may set its own length',
    app.sandbox.semesterDaysFor({ semesterDays: 30 }) === 30);

  check('a nonsense length falls back to 90',
    app.sandbox.semesterDaysFor({ semesterDays: -4 }) === 90);
}

console.log('== Homework gating ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, {
    modules: [{ id: 'm1', lessons: [lesson('l1', 'First', 0), lesson('l2', 'Second', 1)] }]
  });
  vm.runInContext(`
    tasks = [{ id: 'h1', type: 'homework', courseId: 'g1', lessonId: 'l1', title: 'HW one' }];
    taskSubmissions = {};
  `, app.context);

  const lessons = app.sandbox.groupLessonSequence(c);
  check('lessons come back in order', lessons.length === 2 && lessons[0].id === 'l1');

  const first = app.sandbox.lessonLockState(c, lessons[0], 10);
  check('the first lesson is never locked', first.locked === false);

  const second = app.sandbox.lessonLockState(c, lessons[1], 10);
  check('the next lesson is locked while homework is outstanding', second.locked === true,
    JSON.stringify(second));
  check('the lock names the lesson that blocks it', second.blockingLessonId === 'l1');
  check('the lock counts the outstanding homework', second.blockingHomework === 1);

  vm.runInContext("taskSubmissions = { 'h1-10': { answer: 'done' } };", app.context);
  const afterSubmit = app.sandbox.lessonLockState(c, lessons[1], 10);
  check('the lesson unlocks once the homework is handed in', afterSubmit.locked === false,
    JSON.stringify(afterSubmit));

  check('another student is still locked', app.sandbox.lessonLockState(c, lessons[1], 11).locked === true);

  // A lesson with no homework attached never blocks the next one.
  vm.runInContext("tasks = [{ id: 'h1', type: 'homework', courseId: 'g1', lessonId: 'l1' }]; taskSubmissions = {};", app.context);
  const g2 = makeGroup(app, {
    id: 'g2',
    modules: [{ id: 'm2', lessons: [lesson('a1', 'A', 0), lesson('a2', 'B', 1)] }]
  });
  const noHw = app.sandbox.lessonLockState(g2, app.sandbox.groupLessonSequence(g2)[1], 10);
  check('a lesson with no homework does not lock the next one', noHw.locked === false);
}

console.log('== Zero homework at the end of a semester ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, { semesterDays: 90, courseDurationDays: 3650 });
  vm.runInContext(`
    tasks = [{ id: 'h1', type: 'homework', courseId: 'g1', title: 'HW' }];
    taskSubmissions = {};
    enrollments = [{ studentId: 10, courseId: 'g1' }, { studentId: 11, courseId: 'g1' }];
    taskSubmissions = { 'h1-11': { answer: 'done' } };
  `, app.context);

  const early = app.sandbox.evaluateStudentOutcome(c, 10, iso(89));
  check('nothing is flagged while the semester is still running', early === null);

  const flagged = app.sandbox.evaluateStudentOutcome(c, 10, iso(91));
  check('a student with no homework is flagged once it ends', flagged && flagged.status === 'flagged',
    flagged && flagged.status);
  check('the flag records why', flagged && flagged.reason === 'no-homework');

  check('a student who did the homework is not flagged',
    app.sandbox.evaluateStudentOutcome(c, 11, iso(91)) === null);

  check('the flag is not yet a failure',
    app.sandbox.isGroupFailed(10, 'g1') === false);

  vm.runInContext("currentUser = { id: 1, role: 'Teacher' };", app.context);
  const confirmed = app.sandbox.confirmOutcomeFailure(flagged.id, 1, iso(92));
  check('a teacher confirms the flag into a failure', confirmed.status === 'failed');
  check('the failure records who confirmed it', confirmed.confirmedBy === 1);
  check('the student now counts as failed', app.sandbox.isGroupFailed(10, 'g1') === true);

  const retain = app.sandbox.retentionDaysLeft(confirmed, iso(92));
  check('progress is retained for 30 days from the failure', retain === 30, String(retain));
}

console.log('== Only an admin can undo a failure ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, { courseDurationDays: 3650 });
  vm.runInContext(`
    tasks = []; taskSubmissions = {};
    enrollments = [{ studentId: 10, courseId: 'g1' }];
  `, app.context);
  const flagged = app.sandbox.evaluateStudentOutcome(c, 10, iso(91));
  app.sandbox.confirmOutcomeFailure(flagged.id, 1, iso(92));

  vm.runInContext("currentUser = { id: 1, role: 'Teacher' };", app.context);
  check('a teacher cannot un-fail a student',
    app.sandbox.restoreOutcome(flagged.id, 1, iso(93)) === null);
  check('the student is still failed after a teacher tries',
    app.sandbox.isGroupFailed(10, 'g1') === true);

  vm.runInContext("currentUser = { id: 2, role: 'Admin' };", app.context);
  const restored = app.sandbox.restoreOutcome(flagged.id, 2, iso(93));
  check('an admin can un-fail a student', restored && restored.status === 'passed');
  check('the un-fail records who did it', restored.resolvedBy === 2);
  check('the student is no longer failed', app.sandbox.isGroupFailed(10, 'g1') === false);
}

console.log('== The automatic limit ==');
{
  const app = freshApp();
  seed(app);
  // A twelve month course: 365 days less the three month grace.
  const c = makeGroup(app, { courseDurationDays: 365, semesterDays: 90 });
  vm.runInContext(`
    tasks = [{ id: 'h1', type: 'homework', courseId: 'g1' }];
    taskSubmissions = { 'h1-10': { answer: 'done' } };
    enrollments = [{ studentId: 10, courseId: 'g1' }];
  `, app.context);

  const limit = app.sandbox.studentActiveDayLimit(c);
  check('the limit is the course length less three months', limit === 365 - 90, String(limit));

  check('inside the limit nothing happens',
    app.sandbox.evaluateStudentOutcome(c, 10, iso(limit - 1)) === null);

  const auto = app.sandbox.evaluateStudentOutcome(c, 10, iso(limit + 1));
  check('passing the limit fails the student automatically',
    auto && auto.status === 'failed', auto && auto.status);
  check('the automatic failure is marked as such', auto && auto.autoFailed === true);
  check('no confirmation was needed', auto && auto.confirmedBy === null);
  check('the student counts as failed', app.sandbox.isGroupFailed(10, 'g1') === true);
}

console.log('== Pausing the clock ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, { semesterDays: 90, courseDurationDays: 3650 });
  vm.runInContext(`
    tasks = []; taskSubmissions = {};
    enrollments = [{ studentId: 10, courseId: 'g1' }];
    pauseRequests = [];
    currentUser = { id: 10, role: 'Student' };
  `, app.context);

  vm.runInContext("currentUser = { id: 1, role: 'Teacher' };", app.context);
  const req = app.sandbox.requestPause(10, 'g1', iso(0), iso(30), 'illness');
  check('a pause can be requested', req && req.status === 'pending');

  check('a pending pause does not stop the clock',
    app.sandbox.pausedDaysFor(10, 'g1', iso(30)) === 0);

  app.sandbox.decidePause(req.id, true, 1, iso(1));
  check('an accepted pause stops the clock',
    app.sandbox.pausedDaysFor(10, 'g1', iso(31)) === 30,
    String(app.sandbox.pausedDaysFor(10, 'g1', iso(31))));

  const end = app.sandbox.studentSemesterEnd(c, 10, iso(31));
  check('the student deadline moves out by the pause',
    end.getTime() === Date.parse(iso(120)), end.toISOString());

  check('without the pause they would have failed at day 90',
    app.sandbox.evaluateStudentOutcome(c, 10, iso(91)) === null);

  check('another student is unaffected by the pause',
    app.sandbox.evaluateStudentOutcome(c, 11, iso(91)) === null);

  vm.runInContext("enrollments = [{ studentId: 10, courseId: 'g1' }, { studentId: 11, courseId: 'g1' }];", app.context);
  const other = app.sandbox.evaluateStudentOutcome(c, 11, iso(91));
  check('a student who did not pause still fails on time', other && other.status === 'flagged',
    other && other.status);

  check('a second pause request while one is open is refused',
    app.sandbox.requestPause(10, 'g1', iso(40), iso(60), 'again') === null);
}

console.log('== Progress is never deleted early ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, { courseDurationDays: 100, semesterDays: 90 });
  vm.runInContext(`
    tasks = [{ id: 'h1', type: 'homework', courseId: 'g1', lessonId: 'l1' }];
    taskSubmissions = { 'h1-10': { answer: 'my work' } };
    enrollments = [{ studentId: 10, courseId: 'g1' }];
    lessonProgress = { 'g1::l1::10': { completed: true } };
    gradeData = { '10-g1': 88 };
    homeworkOutcomes = [];
    currentUser = { id: 1, role: 'Teacher' };
  `, app.context);

  // A short course, so the automatic limit is what ends it. The student still
  // has work on record, which is exactly the case that must not be deleted.
  const flagged = app.sandbox.evaluateStudentOutcome(c, 10, iso(20));
  check('the student is failed by the automatic limit', flagged && flagged.status === 'failed',
    flagged && flagged.status);
  app.sandbox.confirmOutcomeFailure(flagged.id, 1, iso(20));

  check('lesson progress survives the failure',
    !!app.sandbox.lessonProgress['g1::l1::10']);
  check('the homework submission survives the failure',
    !!app.sandbox.taskSubmissions['h1-10']);
  check('the grade survives the failure',
    app.sandbox.gradeData['10-g1'] === 88);

  app.sandbox.purgeExpiredProgress(iso(40));
  check('nothing is purged inside the retention window',
    !!app.sandbox.lessonProgress['g1::l1::10'] && !!app.sandbox.taskSubmissions['h1-10'],
    'lessonProgress=' + JSON.stringify(app.sandbox.lessonProgress));

  const removed = app.sandbox.purgeExpiredProgress(iso(51));
  check('progress is purged once 30 days have passed', removed > 0, String(removed));
  check('lesson progress is gone after the window',
    !app.sandbox.lessonProgress['g1::l1::10']);
  check('the submission is gone after the window',
    !app.sandbox.taskSubmissions['h1-10']);
  check('the grade is gone after the window',
    app.sandbox.gradeData['10-g1'] === undefined);
  check('the outcome record is cleared once purged',
    app.sandbox.outcomeFor(10, 'g1') === null);
}

console.log('== Dropping out also keeps progress ==');
{
  const app = freshApp();
  seed(app);
  makeGroup(app, {});
  vm.runInContext(`
    tasks = [{ id: 'h1', type: 'homework', courseId: 'g1', lessonId: 'l1' }];
    taskSubmissions = { 'h1-10': { answer: 'my work' } };
    enrollments = [{ studentId: 10, courseId: 'g1' }];
    lessonProgress = { 'g1::l1::10': { completed: true } };
    homeworkOutcomes = [];
    currentUser = { id: 1, role: 'Teacher' };
  `, app.context);

  const rec = app.sandbox.startProgressRetention(10, 'g1', iso(10));
  check('dropping out is recorded as withdrawn', rec.status === 'withdrawn', rec.status);
  check('the retention window is 30 days',
    app.sandbox.retentionDaysLeft(rec, iso(10)) === 30);

  app.sandbox.purgeExpiredProgress(iso(20));
  check('progress survives immediately after dropping out',
    !!app.sandbox.lessonProgress['g1::l1::10']);

  app.sandbox.purgeExpiredProgress(iso(41));
  check('progress is dropped once the window closes',
    !app.sandbox.lessonProgress['g1::l1::10']);
}

console.log('== Course groups ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, {
    groupName: '',
    modules: [{ id: 'm1', title: 'Module one', lessons: [lesson('l1', 'One', 0), lesson('l2', 'Two', 1)] }]
  });
  vm.runInContext(`
    tasks = [{ id: 'h1', type: 'homework', courseId: 'g1', title: 'HW' }];
    taskSubmissions = {};
    enrollments = [{ studentId: 10, courseId: 'g1' }];
  `, app.context);

  check('a course with no group name is not a group', app.sandbox.isGroupCourse(c) === false);
  check('the subject name defaults to the course name', c.subjectName === 'Algebra');
  check('a new group starts as the next letter', app.sandbox.nextSuggestedGroupName(c) === 'A');

  const made = app.sandbox.createCourseGroup(c, 'A', { copyContent: true, copyWork: true });
  const g = made.group;
  check('the group is created', !!g);
  check('the group shares the subject name', g.subjectName === 'Algebra');
  check('the group carries its own name', g.groupName === 'A');
  check('the group is a different record', g.id !== c.id);
  check('the group has its own semester',
    g.semesterDays === 90 && g.semesterStart === '');

  check('course content was copied', Array.isArray(g.modules) && g.modules.length === 1);
  check('the copied module has a fresh id', g.modules[0].id !== 'm1');
  check('copied lessons have fresh ids so progress cannot leak',
    g.modules[0].lessons[0].id !== 'l1' && g.modules[0].lessons[1].id !== 'l2');

  check('work was copied', made.copiedWork === 1);
  const copiedWork = app.sandbox.tasks.filter(function(t) { return t.courseId === g.id; });
  check('the copied work points at the new group', copiedWork.length === 1);
  check('the copied work keeps a link to its original',
    copiedWork[0].parentTaskId === 'h1');

  check('the original group is untouched',
    app.sandbox.tasks.filter(function(t) { return t.courseId === 'g1'; }).length === 1);

  check('both belong to the same subject family',
    app.sandbox.courseSubjectFamily(c).length === 2);
  check('the next group letter follows on',
    app.sandbox.nextSuggestedGroupName(c) === 'B');

  check('a group reads as subject and group',
    app.sandbox.courseLabel(g) === 'Algebra - Group A', app.sandbox.courseLabel(g));

  const second = app.sandbox.createCourseGroup(c, 'B', { copyContent: false });
  check('content copying can be skipped', second.group.modules.length === 0);
  check('a group with no copied content still exists', !!second.group.id);

  // Independent settings: changing one group must not touch the other.
  g.passingScore = 40;
  c.passingScore = 90;
  check('group settings are independent', g.passingScore === 40 && c.passingScore === 90);

  check('a blank group name is refused', app.sandbox.createCourseGroup(c, '  ') === null);
}

// ---------------------------------------------------------------

console.log('== Linking homework to a lesson ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, {
    id: 'g1',
    modules: [{ id: 'm1', lessons: [lesson('l1', 'One', 0), lesson('l2', 'Two', 1)] }]
  });
  makeGroup(app, { id: 'g2', name: 'Other', modules: [{ id: 'm9', lessons: [lesson('z1', 'Zed', 0)] }] });
  vm.runInContext(`
    tasks = [{ id: 'h1', type: 'homework', courseId: 'g1', title: 'HW' }];
    taskSubmissions = {};
  `, app.context);

  check('homework with no lesson link is accepted',
    app.sandbox.linkHomeworkToLesson('h1', 'l1') !== null);
  check('the lesson is recorded on the homework',
    app.sandbox.tasks[0].lessonId === 'l1', app.sandbox.tasks[0].lessonId);

  check('a lesson from another group is refused',
    app.sandbox.linkHomeworkToLesson('h1', 'z1') === null);
  check('the refused link left the original in place',
    app.sandbox.tasks[0].lessonId === 'l1');

  check('the link gates the following lesson',
    app.sandbox.lessonLockState(c, app.sandbox.groupLessonSequence(c)[1], 10).locked === true);

  app.sandbox.linkHomeworkToLesson('h1', '');
  check('clearing the link removes it',
    app.sandbox.tasks[0].lessonId === undefined);
  check('without a link nothing is gated',
    app.sandbox.lessonLockState(c, app.sandbox.groupLessonSequence(c)[1], 10).locked === false);

  check('an unknown task is refused', app.sandbox.linkHomeworkToLesson('nope', 'l1') === null);
}

console.log('== A teacher may close a flag without failing the student ==');
{
  const app = freshApp();
  seed(app);
  const c = makeGroup(app, { courseDurationDays: 3650 });
  vm.runInContext(`
    tasks = []; taskSubmissions = {};
    enrollments = [{ studentId: 10, courseId: 'g1' }];
    homeworkOutcomes = [];
    currentUser = { id: 1, role: 'Teacher' };
  `, app.context);

  const flagged = app.sandbox.evaluateStudentOutcome(c, 10, iso(91));
  const closed = app.sandbox.dismissOutcomeFlag(flagged.id, 1);
  check('the flag can be closed by the teacher', closed && closed.status === 'dismissed');
  check('a closed flag is not a failure', app.sandbox.isGroupFailed(10, 'g1') === false);
  check('a closed flag is not raised again',
    app.sandbox.evaluateStudentOutcome(c, 10, iso(120)) === null);
  check('a closed flag schedules no purge', app.sandbox.retentionDaysLeft(closed) === null);
  check('a dismissed outcome cannot be dismissed twice',
    app.sandbox.dismissOutcomeFlag(flagged.id, 1) === null);
}

console.log('== Assignment is folded into homework ==');
{
  const app = freshApp();
  seed(app);
  vm.runInContext(`
    tasks = [
      { id: 1, type: 'assignment', courseId: 'g1', title: 'Old assignment' },
      { id: 2, type: 'homework', courseId: 'g1', title: 'Already homework' },
      { id: 3, type: 'interactive', courseId: 'g1', title: 'Block task' }
    ];
  `, app.context);

  const changed = app.sandbox.migrateAssignmentWorkToHomework();
  check('one record was migrated', changed === 1, String(changed));
  check('the assignment became homework', app.sandbox.tasks[0].type === 'homework');
  check('the existing homework is untouched', app.sandbox.tasks[1].type === 'homework');
  check('other types are untouched', app.sandbox.tasks[2].type === 'interactive');
  check('no record is lost', app.sandbox.tasks.length === 3);
  check('running it again changes nothing',
    app.sandbox.migrateAssignmentWorkToHomework() === 0);
}

console.log('\nChecks: ' + passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  - ' + f));
}
process.exit(failed === 0 ? 0 : 1);
