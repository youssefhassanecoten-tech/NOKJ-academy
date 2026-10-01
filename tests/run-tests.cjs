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
      // ids built inside JS, or assigned to a node at runtime, exist already
      const appearsBuilt = src.includes('id="' + id + '"') ||
        src.includes(".id = '" + id + "'") || src.includes('.id = "' + id + '"');
      if (appearsBuilt) dynamicIds.add(id);
      else missing.add(id);
    }
  }
}
check('no dangling getElementById refs', missing.size === 0, [...missing].join(', '));
check('dynamic ids are built in JS', [...dynamicIds].filter(id => {
  // every dynamic id must be emitted in markup or assigned to a node in a script
  return jsFiles.some(f => {
    const s = fs.readFileSync(f, 'utf8');
    return s.includes('id="' + id + '"') || s.includes(".id = '" + id + "'");
  });
}).length === dynamicIds.size, ...dynamicIds.length ? ['unverified: ' + [...dynamicIds].join(', ')] : []);

console.log('== World map block (vm) ==');
const vmMap = (() => {
  try {
    const vm = require('vm');
    const context = vm.createContext({ window: {}, document: { getElementById: () => null, head: { appendChild() {} } } });
    for (const s of ['task-blocks.js', 'task-blocks-core.js', 'task-blocks-map.js']) {
      vm.runInContext(fs.readFileSync(path.join(SCRIPTS_DIR, 'modules', s), 'utf8'), context);
    }
    const out = vm.runInContext(`(function () {
      var b = makeBlock('worldmap');
      var pts = [
        { id: 'p1', lat: 48.85, lon: 2.35, label: 'Paris', correct: true, partial: false },
        { id: 'p2', lat: 51.5, lon: -0.12, label: 'London', correct: true, partial: false },
        { id: 'p3', lat: 40.7, lon: -74.0, label: 'New York', correct: false, partial: false }
      ];
      b.props.points = pts;
      b.props.mode = '2d';
      var def = getBlockDef('worldmap');
      var html = renderTaskBlocks([b], {});
      var geo = JSON.stringify(pointsToGeoJSON(pts));

      // Grading: all correct points, or nothing.
      b.props.answerMode = 'full';
      var allRight = gradeTaskAnswers([b], { [b.id]: [0, 1] }).score === 2;
      var oneRight = gradeTaskAnswers([b], { [b.id]: [0] }).score === 0;
      var noneRight = gradeTaskAnswers([b], { [b.id]: [] }).score === 0;
      var onlyWrong = gradeTaskAnswers([b], { [b.id]: [2] }).score === 0;
      // Partial credit.
      b.props.answerMode = 'partial';
      var partialOne = gradeTaskAnswers([b], { [b.id]: [0] }).score === 1;
      var partialNone = gradeTaskAnswers([b], { [b.id]: [] }).score === 0;
      // No key at all must not award anything.
      b.props.points = [];
      b.props.answerMode = 'full';
      var noKey = gradeTaskAnswers([b], { [b.id]: [0] }).score === 0;

      return JSON.stringify({
        registered: !!def,
        graded: !!(def && def.graded),
        hasPoints: def && def.graded && def.defaultPoints > 0,
        hasMount: !!(def && def.mount), hasCollect: !!(def && def.collect), hasGrade: !!(def && def.grade),
        fieldCount: def ? def.fields.length : 0,
        modes: def ? def.fields.filter(function(f){return f.key==='mode';}).map(function(f){return f.options.map(function(o){return o[0];});})[0].join(',') : '',
        hasCanvas: html.indexOf('data-tb-map=') !== -1,
        hasTools: html.indexOf('tb-map-zoom-in') !== -1 && html.indexOf('tb-map-reset') !== -1,
        has3d: html.indexOf('data-tb-map-3d') !== -1,
        geoType: JSON.parse(geo).type, geoFeatures: JSON.parse(geo).features.length,
        allRight: allRight, oneRight: oneRight, noneRight: noneRight, onlyWrong: onlyWrong,
        partialOne: partialOne, partialNone: partialNone, noKey: noKey
      });
    })()`, context);
    return JSON.parse(out);
  } catch (err) {
    return { error: err.message };
  }
})();
check('the map block registers', vmMap.registered === true, JSON.stringify(vmMap));
check('the map block is graded with points', vmMap.graded === true && vmMap.hasPoints === true, JSON.stringify(vmMap));
check('the map block can mount, collect and grade', vmMap.hasMount && vmMap.hasCollect && vmMap.hasGrade, JSON.stringify(vmMap));
check('the map block offers 2d, 3d and topographic modes', vmMap.modes === '2d,3d,topo', vmMap.modes);
check('the map block has an inspector', vmMap.fieldCount >= 8, 'fields=' + vmMap.fieldCount);
check('the map renders a canvas and tools', vmMap.hasCanvas === true && vmMap.hasTools === true, JSON.stringify(vmMap));
check('the map offers a 3D toggle', vmMap.has3d === true, JSON.stringify(vmMap));
check('teacher points become GeoJSON features', vmMap.geoType === 'FeatureCollection' && vmMap.geoFeatures === 3, JSON.stringify(vmMap));
check('all correct points marked scores full marks', vmMap.allRight === true, JSON.stringify(vmMap));
check('a partly correct answer scores zero in full mode', vmMap.oneRight === true && vmMap.noneRight === true, JSON.stringify(vmMap));
check('marking only a wrong point scores zero', vmMap.onlyWrong === true, JSON.stringify(vmMap));
check('partial mode scores per correct point', vmMap.partialOne === true && vmMap.partialNone === true, JSON.stringify(vmMap));
check('a map with no key awards nothing', vmMap.noKey === true, JSON.stringify(vmMap));

console.log('== Landing/entry markers ==');
check('index.html loads app.js', html.includes('scripts/app.js'), '');
check('index.html has styles/variables.css', html.includes('styles/variables.css'), '');

console.log('== Course section merge ==');
const studioJs = fs.readFileSync(path.join(SCRIPTS_DIR, 'modules', 'studio.js'), 'utf8');
const routerJs = fs.readFileSync(path.join(SCRIPTS_DIR, 'router.js'), 'utf8');
const courseWorkJs = fs.readFileSync(path.join(SCRIPTS_DIR, 'modules', 'course-work.js'), 'utf8');
const suiteJs = fs.readFileSync(path.join(ROOT, 'frontend', 'suite', 'suite.js'), 'utf8');
const suiteHtml = fs.readFileSync(path.join(ROOT, 'frontend', 'suite', 'index.html'), 'utf8');

// Level 1: Lessons / Library / Settings / Analytics.
for (const pane of ['lessons', 'library', 'settings', 'analytics']) {
  check('studio pane ' + pane, html.includes('id="studio-pane-' + pane + '"'), '');
  check('studio tab ' + pane, html.includes('data-studio-tab="' + pane + '"'), '');
}
// Level 2, under Lessons: Lesson / Task / Assignment / Test.
for (const sub of ['lesson', 'task', 'assignment', 'test']) {
  check('studio sub-pane ' + sub, html.includes('id="studio-subpane-' + sub + '"'), '');
  check('studio sub-tab ' + sub, html.includes('data-studio-sub="' + sub + '"'), '');
}
// The old flat six-tab layout must not come back.
check('studio has no curriculum tab', !html.includes('data-studio-tab="curriculum"'), '');
check('studio has no top-level material tab', !html.includes('data-studio-tab="material"'), '');
check('studio has no top-level assignments tab', !html.includes('data-studio-tab="assignments"'), '');
check('studio has no top-level tests tab', !html.includes('data-studio-tab="tests"'), '');
check('studio tabs array matches markup', studioJs.includes("'lessons', 'library', 'settings', 'analytics'"), '');
check('studio subtabs array matches markup', studioJs.includes("['lesson', 'task', 'assignment', 'test']"), '');

check('standalone pages left the nav', !html.includes('data-page="tasks"') && !html.includes('data-page="tests"') && !html.includes('data-page="assignments"'), '');
check('router redirects merged pages to courses', /MERGED_PAGES = \['assignments', 'tasks', 'tests'\]/.test(routerJs) && /MERGED_PAGES\.indexOf\(pageName\) !== -1\) pageName = 'courses'/.test(routerJs), '');
// Rendered buttons are delegated through openPage too, so they must not aim
// at the merged pages either.
const staleLinks = [];
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/data-page=[\"']?(tasks|tests|assignments)[\"']?/g)) {
    staleLinks.push(path.relative(ROOT, f) + ' -> ' + m[0]);
  }
  for (const m of src.matchAll(/searchItem\(['"](tasks|tests|assignments)['"]/g)) {
    staleLinks.push(path.relative(ROOT, f) + ' -> ' + m[0]);
  }
}
check('no rendered link points at a merged page', staleLinks.length === 0, staleLinks.join(' | '));

check('build method chooser in markup', html.includes('id="build-method-overlay"') && html.includes('id="build-method-basic"') && html.includes('id="build-method-suite"'), '');
check('studio renders the three work sub-sections', /renderStudioWorkList\('material'\)/.test(studioJs) && /'studio-test-list'/.test(studioJs) && /'studio-assignment-list'/.test(studioJs), '');
check('studio opens the suite with course context', /suite\/index\.html\?course=/.test(studioJs), '');

check('course-work script loaded', html.includes('scripts/modules/course-work.js'), '');
const blockScripts = ['task-blocks.js', 'task-blocks-core.js', 'task-blocks-geo.js', 'task-blocks-math.js', 'task-blocks-english.js'];
const courseWorkPos = html.indexOf('scripts/modules/course-work.js');
check('course-work loads after every block module', blockScripts.every(s => html.indexOf('scripts/modules/' + s) < courseWorkPos), '');
check('student course view binds course work', /bindStudentCourseWork\(container\)/.test(fs.readFileSync(path.join(SCRIPTS_DIR, 'modules', 'courses.js'), 'utf8')), '');

check('suite reads course from the query string', /params\.get\('course'\)/.test(suiteJs) && /params\.get\('kind'\)/.test(suiteJs), '');
check('suite writes tests to nokj-tests', /writeTests\(list\)/.test(suiteJs) && /isTestDoc\(\) \? writeTests/.test(suiteJs), '');
check('suite refuses another teacher course', /belongs to another teacher/.test(suiteJs), '');
check('suite has a course context bar', suiteHtml.includes('id="suite-context"') && suiteHtml.includes('id="suite-back"'), '');
check('suite blocks land in the course', /SUITE\.doc\.courseId = SUITE\.courseId/.test(suiteJs) && /SUITE\.doc\.assignedIds = \[SUITE\.courseId\]/.test(suiteJs), '');
check('course work grades blocks on submit', /collectTaskAnswers\(host, item\.blocks\)/.test(courseWorkJs) && /gradeTaskAnswers\(item\.blocks, answers\)/.test(courseWorkJs), '');
check('course work keeps the teacher grade', /`grade` is left alone/.test(courseWorkJs), '');
check('course work tears blocks down', /stopStudentCourseWork/.test(courseWorkJs) && /stopTaskBlocks\(host\)/.test(courseWorkJs), '');

console.log('== Block grading round trip (vm) ==');
const vmRoundTrip = (() => {
  try {
    const vm = require('vm');
    const context = vm.createContext({ window: {}, document: { getElementById: () => null } });
    for (const s of ['task-blocks.js', 'task-blocks-core.js']) {
      vm.runInContext(fs.readFileSync(path.join(SCRIPTS_DIR, 'modules', s), 'utf8'), context);
    }
    const out = vm.runInContext(`(function () {
      var b = makeBlock('mcq');
      b.props.question = '2 + 2?';
      b.props.options = ['3', '4'];
      b.props.correct = 1;
      var right = gradeTaskAnswers([b], { [b.id]: 1 });
      var wrong = gradeTaskAnswers([b], { [b.id]: 0 });
      var blank = gradeTaskAnswers([b], {});
      return JSON.stringify({
        type: b.type, points: b.points,
        right: right.score, wrong: wrong.score, blank: blank.score, max: right.max,
        detail: !!right.detail[b.id]
      });
    })()`, context);
    return JSON.parse(out);
  } catch (err) {
    return { error: err.message };
  }
})();
check('block registry evaluates', !vmRoundTrip.error, vmRoundTrip.error || '');
check('mcq block grades a correct answer', vmRoundTrip.right === vmRoundTrip.max, JSON.stringify(vmRoundTrip));
check('mcq block grades a wrong answer as zero', vmRoundTrip.wrong === 0, JSON.stringify(vmRoundTrip));
check('mcq block grades a blank answer as zero', vmRoundTrip.blank === 0, JSON.stringify(vmRoundTrip));
check('mcq block carries a default point value', vmRoundTrip.points > 0, JSON.stringify(vmRoundTrip));
check('grading returns per-block detail', vmRoundTrip.detail === true, JSON.stringify(vmRoundTrip));

console.log('== Shape maths formulas (vm) ==');
// The cylinder used to be drawn and graded as a cuboid, and the round shapes
// halved `a` to get a radius while the field was labelled "radius".
const vmShapes = (() => {
  try {
    const vm = require('vm');
    const context = vm.createContext({ window: {}, document: { getElementById: () => null } });
    for (const s of ['task-blocks.js', 'task-blocks-core.js', 'task-blocks-math.js']) {
      vm.runInContext(fs.readFileSync(path.join(SCRIPTS_DIR, 'modules', s), 'utf8'), context);
    }
    const out = vm.runInContext(`(function () {
      function make(shape, ask, a, b, c) {
        var blk = makeBlock('shapemath');
        blk.props.question = '';
        blk.props.shape = shape; blk.props.ask = ask;
        blk.props.a = a; blk.props.b = b; blk.props.c = c;
        return blk;
      }
      function ans(blk) { return gradeTaskAnswers([blk], { [blk.id]: String(shapeAnswer(blk)) }).score === gradeTaskAnswers([blk], { [blk.id]: String(shapeAnswer(blk)) }).max; }
      var cyl = make('cyl', 'volume', 3, 4, 10);   // pi * 3^2 * 10
      var cir = make('circle', 'area', 4, 0, 0);  // pi * 4^2
      var cirC = make('circle', 'perimeter', 4, 0, 0); // 2*pi*4
      var sph = make('sphere', 'volume', 3, 0, 0);    // 4/3*pi*27
      var con = make('cone', 'volume', 3, 0, 6);      // 1/3*pi*9*6
      var cube = make('cube', 'volume', 3, 0, 0);     // 27
      var cub = make('cuboid', 'volume', 2, 3, 4);   // 24
      var tri = make('tri', 'area', 6, 4, 0);        // 12
      var rect = make('rect', 'area', 6, 4, 0);      // 24
      return JSON.stringify({
        cyl: shapeAnswer(cyl), cylGrads: ans(cyl),
        cir: shapeAnswer(cir), cirGrads: ans(cir),
        cirC: shapeAnswer(cirC),
        sph: shapeAnswer(sph), sphGrads: ans(sph),
        con: shapeAnswer(con), conGrads: ans(con),
        cube: shapeAnswer(cube), cub: shapeAnswer(cub),
        tri: shapeAnswer(tri), rect: shapeAnswer(rect),
        question: shapeQuestion(cir),
        dims: shapeDims(cyl)
      });
    })()`, context);
    return JSON.parse(out);
  } catch (err) {
    return { error: err.message };
  }
})();
check('shape maths evaluates', !vmShapes.error, vmShapes.error || '');
check('cylinder volume is pi r^2 h', Math.abs(vmShapes.cyl - Math.PI * 9 * 10) < 1e-6, 'got ' + vmShapes.cyl);
check('cylinder grades its own answer', vmShapes.cylGrads === true);
check('circle area is pi r^2 with a as the radius', Math.abs(vmShapes.cir - Math.PI * 16) < 1e-6, 'got ' + vmShapes.cir);
check('circle circumference is 2 pi r', Math.abs(vmShapes.cirC - 2 * Math.PI * 4) < 1e-6, 'got ' + vmShapes.cirC);
check('circle grades its own answer', vmShapes.cirGrads === true);
check('sphere volume is 4/3 pi r^3', Math.abs(vmShapes.sph - (4 / 3) * Math.PI * 27) < 1e-6, 'got ' + vmShapes.sph);
check('sphere grades its own answer', vmShapes.sphGrads === true);
check('cone volume is a third of the cylinder', Math.abs(vmShapes.con - (Math.PI * 9 * 6) / 3) < 1e-6, 'got ' + vmShapes.con);
check('cone grades its own answer', vmShapes.conGrads === true);
check('cube volume is a cubed', Math.abs(vmShapes.cube - 27) < 1e-6, 'got ' + vmShapes.cube);
check('cuboid volume is l x w x h', Math.abs(vmShapes.cub - 24) < 1e-6, 'got ' + vmShapes.cub);
check('triangle area is half base times height', Math.abs(vmShapes.tri - 12) < 1e-6, 'got ' + vmShapes.tri);
check('rectangle area is length times width', Math.abs(vmShapes.rect - 24) < 1e-6, 'got ' + vmShapes.rect);
check('the generated question names the shape and quantity', /circle/.test(vmShapes.question) && /area/.test(vmShapes.question), vmShapes.question);
check('the dimension label states the radius and height', /radius 3 cm/.test(vmShapes.dims) && /height 10 cm/.test(vmShapes.dims), vmShapes.dims);

console.log('== Student course sections (vm) ==');
// A small data world plus just enough DOM to render the three work sections
// and run one block submission end to end.
const vmStudent = (() => {
  try {
    const vm = require('vm');
    const storage = {};
    const doc = {
      _byId: {},
      getElementById(id) { return this._byId[id] || null; },
      createElement() { return { className: '', textContent: '', style: {}, dataset: {}, addEventListener() {}, appendChild() {} }; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    };
    const sandbox = {
      console,
      currentLang: 'en',
      setLanguage() {},
      storeGet() { return null; },
      storeSet() {},
      localStorage: { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } },
      sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      document: doc,
      window: { scrollY: 0, scrollX: 0, location: { search: '' } },
      alert() {},
      confirm() { return true; },
      prompt() { return null; },
      setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON,
      URLSearchParams
    };
    sandbox.window.localStorage = sandbox.localStorage;
    sandbox.globalThis = sandbox;
    const context = vm.createContext(sandbox);

    const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), context);
    const m = n => path.join(SCRIPTS_DIR, 'modules', n);
    // utils.js first: the section filters under test live there, so the real
    // implementation is what gets exercised rather than a stand-in.
    run(path.join(SCRIPTS_DIR, 'utils.js'));
    run(m('task-blocks.js'));
    run(m('task-blocks-core.js'));
    run(m('course-work.js'));

    const out = vm.runInContext(`(function () {
      // --- arrange: a student in a course with one block task and one draft ---
      var b = makeBlock('mcq');
      b.props.question = '2 + 2?';
      b.props.options = ['3', '4'];
      b.props.correct = 1;
      currentUser = { id: 7, role: 'Student' };
      // The rest of the academy data set, so the real saveData() can snapshot
      // normally. These are the exact globals NOKJ_STORE_READERS reads.
      students = [{ id: 7, name: 'Stu' }];
      teachers = [{ id: 1, name: 'Tea' }];
      admins = [];
      courses = [{ id: 5, name: 'Course', teacherId: 1 }];
      enrollments = [{ courseId: 5, studentId: 7 }];
      gradeData = [];
      budgetEntries = [];
      announcements = [];
      pendingTeachers = [];
      enrollRequests = [];
      courseRequests = [];
      courseMaterials = [];
      teacherAuthKeys = [];
      lessonProgress = [];
      homeworkOutcomes = [];
      pauseRequests = [];
      meetings = [];
      tasks = [
        { id: 1, title: 'Interactive task', type: 'interactive', courseId: 5, assignedTo: 'course', assignedIds: [5], published: true, blocks: [b] },
        { id: 2, title: 'Assignment', type: 'assignment', courseId: 5, assignedTo: 'course', assignedIds: [5], published: true, blocks: [] },
        { id: 3, title: 'Draft task', type: 'homework', courseId: 5, assignedTo: 'course', assignedIds: [5], published: false, blocks: [] },
        { id: 4, title: 'Other course', type: 'homework', courseId: 9, assignedTo: 'course', assignedIds: [9], published: true, blocks: [] }
      ];
      tests = [];
      taskSubmissions = {};
      testSubmissions = {};
      function teacherEnrolledStudentIds() { return [7]; }
      tr = function(s) { return s; };
      escapeHtml = function(s) { return String(s); };
      getEnrolledCourseIds = function() { return [5]; };
      isTaskPublished = function(t) { return !!t && t.published !== false; };
      isTaskDraft = function(t) { return !!t && t.published === false; };
      var alerts = [];
      // --- act: render each section ---
      var material = renderStudentCourseWork(5, 'material');
      var assignments = renderStudentCourseWork(5, 'assignments');
      var testsHtml = renderStudentCourseWork(5, 'tests');

      // --- act: submit the block task through the real code path ---
      // The stub host mirrors the real rendered shape: the collector looks for
      // [data-tb-id="<id>"] .tb-block-body and the mcq collector then looks for
      // the checked radio inside it.
      var blockBody = {
        querySelector: function(sel) { return sel === 'input:checked' ? { value: '1' } : null; },
        querySelectorAll: function() { return []; }
      };
      var host = {
        dataset: { mounted: '1', item: '1' },
        innerHTML: '',
        querySelector: function(sel) {
          if (sel === '[data-tb-id="' + b.id + '"] .tb-block-body') return blockBody;
          return null;
        },
        querySelectorAll: function() { return []; }
      };
      var originalGet = document.getElementById;
      document.getElementById = function(id) { return id === 'cw-host-material-1' ? host : null; };
      submitCourseWork(1, 'material', 'cw-host-material-1');
      document.getElementById = originalGet;
      var sub = taskSubmissions['1-7'];

      // saveData() is the real one, so persistence shows up in the snapshot.
      var snap = null;
      try { snap = JSON.parse(localStorage.getItem('nokj-db-snapshot')); } catch (e) { snap = null; }
      var snapSub = snap && snap.taskSubmissions ? snap.taskSubmissions['1-7'] : null;

      return JSON.stringify({
        materialHasTask: material.indexOf('Interactive task') !== -1,
        materialHasDraft: material.indexOf('Draft task') !== -1,
        materialHasOtherCourse: material.indexOf('Other course') !== -1,
        materialHasHost: material.indexOf('cw-host-material-1') !== -1,
        assignmentHasAssignment: assignments.indexOf('Assignment') !== -1,
        assignmentHasTask: assignments.indexOf('Interactive task') !== -1,
        testsEmpty: testsHtml.indexOf('No tests') !== -1,
        snapshotWritten: !!snap,
        snapshotHasSubmission: !!(snapSub && snapSub.score === 1),
        score: sub && sub.score,
        max: sub && sub.max,
        hasBlockAnswers: !!(sub && sub.blockAnswers && sub.blockAnswers[b.id] === 1),
        gradeUntouched: sub && sub.grade === null
      });
    })()`, context);
    return JSON.parse(out);
  } catch (err) {
    return { error: err.message + '\n' + err.stack };
  }
})();
check('student course sections evaluate', !vmStudent.error, vmStudent.error || '');
check('material section shows a block task', vmStudent.materialHasTask === true, JSON.stringify(vmStudent));
check('material section hides drafts', vmStudent.materialHasDraft === false, JSON.stringify(vmStudent));
check('material section hides other courses', vmStudent.materialHasOtherCourse === false, JSON.stringify(vmStudent));
check('material section mounts a block host', vmStudent.materialHasHost === true, JSON.stringify(vmStudent));
check('assignments section shows only assignments', vmStudent.assignmentHasAssignment === true && vmStudent.assignmentHasTask === false, JSON.stringify(vmStudent));
check('tests section reports empty', vmStudent.testsEmpty === true, JSON.stringify(vmStudent));
check('block submit persists a snapshot', vmStudent.snapshotWritten === true && vmStudent.snapshotHasSubmission === true, JSON.stringify(vmStudent));
check('block submit stores the graded score', vmStudent.score === 1 && vmStudent.max === 1, JSON.stringify(vmStudent));
check('block submit stores per-block answers', vmStudent.hasBlockAnswers === true, JSON.stringify(vmStudent));
check('block submit leaves the teacher grade alone', vmStudent.gradeUntouched === true, JSON.stringify(vmStudent));

console.log('');
console.log('Checks: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
