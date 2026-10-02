      // ============================================================
      //  RESILIENT STORAGE
      //  Primary: localStorage. Overflow: sessionStorage (survives reload,
      //  immune to persistent quota pressure). A consolidated snapshot is
      //  written first so a quota error can never leave a half-written DB.
      // ============================================================
      var NOKJ_STORE_KEYS = [
        ['nokj-students', 'students'],
        ['nokj-teachers', 'teachers'],
        ['nokj-admins', 'admins'],
        ['nokj-courses', 'courses'],
        ['nokj-enrollments', 'enrollments'],
        ['nokj-meetings', 'meetings'],
        ['nokj-grades', 'grades'],
        ['nokj-tasks', 'tasks'],
        ['nokj-submissions', 'taskSubmissions'],
        ['nokj-budget', 'budgetEntries'],
        ['nokj-tests', 'tests'],
        ['nokj-test-submissions', 'testSubmissions'],
        ['nokj-announcements', 'announcements'],
        ['nokj-pending-teachers', 'pendingTeachers'],
        ['nokj-enroll-requests', 'enrollRequests'],
        ['nokj-course-requests', 'courseRequests'],
        ['nokj-course-materials', 'courseMaterials'],
        ['nokj-teacher-auth-keys', 'teacherAuthKeys'],
        ['nokj-lesson-progress', 'lessonProgress'],
        ['nokj-homework-outcomes', 'homeworkOutcomes'],
        ['nokj-pause-requests', 'pauseRequests']
      ];

      function storeGet(key) {
        try {
          var v = localStorage.getItem(key);
          if (v !== null) return v;
        } catch (e) { /* localStorage blocked */ }
        try {
          var s = sessionStorage.getItem(key);
          if (s !== null) return s;
        } catch (e2) { /* sessionStorage blocked */ }
        return null;
      }

      function storeSet(key, value) {
        try {
          localStorage.setItem(key, value);
          try { sessionStorage.removeItem(key); } catch (e) { /* noop */ }
          return 'local';
        } catch (e) {
          try {
            sessionStorage.setItem(key, value);
            return 'session';
          } catch (e2) {
            return 'failed';
          }
        }
      }

      function storeRemove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* noop */ }
        try { sessionStorage.removeItem(key); } catch (e2) { /* noop */ }
      }

      var NOKJ_STORE_READERS = {
        students: function() { return students; },
        teachers: function() { return teachers; },
        admins: function() { return admins; },
        courses: function() { return courses; },
        enrollments: function() { return enrollments; },
        meetings: function() { return meetings; },
        grades: function() { return gradeData; },
        tasks: function() { return tasks; },
        taskSubmissions: function() { return taskSubmissions; },
        budgetEntries: function() { return budgetEntries; },
        tests: function() { return tests; },
        testSubmissions: function() { return testSubmissions; },
        announcements: function() { return announcements; },
        pendingTeachers: function() { return pendingTeachers; },
        enrollRequests: function() { return enrollRequests; },
        courseRequests: function() { return courseRequests; },
        courseMaterials: function() { return courseMaterials; },
        teacherAuthKeys: function() { return teacherAuthKeys; },
        lessonProgress: function() { return lessonProgress; },
        homeworkOutcomes: function() { return homeworkOutcomes; },
        pauseRequests: function() { return pauseRequests; }
      };

      function currentSnapshot() {
        var snap = {};
        NOKJ_STORE_KEYS.forEach(function(pair) {
          var reader = NOKJ_STORE_READERS[pair[1]];
          if (reader) snap[pair[1]] = reader();
        });
        return snap;
      }

      // Keeps a consolidated copy so a corrupt/partial individual key can be repaired on load.
      function writeSnapshot(snap) {
        try { localStorage.setItem('nokj-db-snapshot', JSON.stringify(snap)); } catch (e) { /* noop */ }
      }

      function readSnapshot() {
        try {
          var raw = localStorage.getItem('nokj-db-snapshot');
          if (!raw) return null;
          var parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e) {
          return null;
        }
      }

      // ============================================================
      //  DRAFTS — in-progress work survives reloads and connectivity loss
      // ============================================================
      // Collapses a burst of calls into one. Used for search-as-you-type and
      // for autosaving drafts, where the old code did a full list re-render
      // or a synchronous localStorage write on every single keystroke.
      function debounce(fn, wait) {
        var timer = null;
        function wrapped() {
          var args = arguments, self = this;
          if (timer) clearTimeout(timer);
          timer = setTimeout(function() { timer = null; fn.apply(self, args); }, wait || 200);
        }
        // Lets a caller force the pending call, e.g. on submit or blur.
        wrapped.flush = function() {
          if (!timer) return;
          clearTimeout(timer);
          timer = null;
          fn.apply(this, arguments);
        };
        return wrapped;
      }

      function saveDraft(key, payload) {
        return storeSet('nokj-draft-' + key, JSON.stringify({
          savedAt: Date.now(),
          data: payload
        }));
      }

      function loadDraft(key) {
        var raw = storeGet('nokj-draft-' + key);
        if (!raw) return null;
        try {
          var parsed = JSON.parse(raw);
          return parsed && parsed.data !== undefined ? parsed.data : null;
        } catch (e) {
          storeRemove('nokj-draft-' + key);
          return null;
        }
      }

      function clearDraft(key) {
        storeRemove('nokj-draft-' + key);
      }

      // ============================================================
      //  DATA MANAGEMENT
      // ============================================================
      function loadData() {
        const savedStudents = storeGet('nokj-students');
        const savedTeachers = storeGet('nokj-teachers');
        const savedAdmins = storeGet('nokj-admins');
        const savedCourses = storeGet('nokj-courses');
        const savedEnrollments = storeGet('nokj-enrollments');
        const savedMeetings = storeGet('nokj-meetings');
        const savedGrades = storeGet('nokj-grades');
        const savedTasks = storeGet('nokj-tasks');
        const savedSubmissions = storeGet('nokj-submissions');
        const savedBudget = storeGet('nokj-budget');
        const savedTests = storeGet('nokj-tests');
        const savedTestSubmissions = storeGet('nokj-test-submissions');
        const savedAnnouncements = storeGet('nokj-announcements');
        const savedPendingTeachers = storeGet('nokj-pending-teachers');
        const savedEnrollRequests = storeGet('nokj-enroll-requests');
        const savedCourseRequests = storeGet('nokj-course-requests');
        const savedCourseMaterials = storeGet('nokj-course-materials');
        const savedTeacherAuthKeys = storeGet('nokj-teacher-auth-keys');
        const savedLessonProgress = storeGet('nokj-lesson-progress');
        var snap = readSnapshot();

        if (savedStudents) { try { students = JSON.parse(savedStudents); } catch (e) { students = DEFAULT_STUDENTS.slice(); } } else { students =
            DEFAULT_STUDENTS.slice(); }
        // Parse each key, recording which ones were unreadable so the repair
        // pass below knows exactly what to restore from the snapshot.
        var corrupt = {};
        function parseInto(name, raw, fallback, apply) {
          // `fallback` is a thunk for the seeded defaults, so it has to be
          // called. Passing the function through would put a function where an
          // array belongs and break the first .map() on a fresh install.
          var seed = typeof fallback === 'function' ? fallback() : fallback;
          if (!raw) { apply(seed); return; }
          var parsed = null;
          var ok = false;
          try { parsed = JSON.parse(raw); ok = true; } catch (e) { ok = false; }
          // A stored `null` would be just as fatal as a broken value, so it is
          // treated the same as unreadable.
          if (!ok || parsed === null || parsed === undefined) {
            if (ok) corrupt[name] = true;
            apply(seed);
            return;
          }
          apply(parsed);
        }
        function asCopy(arr) { return function() { return arr.slice(); }; }

        parseInto('students', savedStudents, asCopy(DEFAULT_STUDENTS), function(v) { students = v; });
        parseInto('teachers', savedTeachers, asCopy(DEFAULT_TEACHERS), function(v) { teachers = v; });
        parseInto('admins', savedAdmins, asCopy(DEFAULT_ADMINS), function(v) { admins = v; });
        parseInto('courses', savedCourses, asCopy(DEFAULT_COURSES), function(v) { courses = v; });
        parseInto('enrollments', savedEnrollments, asCopy(DEFAULT_ENROLLMENTS), function(v) { enrollments = v; });
        parseInto('meetings', savedMeetings, asCopy(DEFAULT_MEETINGS), function(v) { meetings = v; });
        parseInto('grades', savedGrades, function() { return DEFAULT_GRADES; }, function(v) { gradeData = v; });
        parseInto('tasks', savedTasks, asCopy(DEFAULT_TASKS), function(v) { tasks = v; });
        parseInto('taskSubmissions', savedSubmissions, function() { return DEFAULT_TASK_SUBMISSIONS; },
          function(v) { taskSubmissions = v; });
        parseInto('budgetEntries', savedBudget, asCopy(DEFAULT_BUDGET), function(v) { budgetEntries = v; });
        parseInto('tests', savedTests, function() { return []; }, function(v) { tests = v; });
        parseInto('testSubmissions', savedTestSubmissions, function() { return {}; },
          function(v) { testSubmissions = v; });
        parseInto('announcements', savedAnnouncements, asCopy(DEFAULT_ANNOUNCEMENTS), function(v) { announcements = v; });
        parseInto('pendingTeachers', savedPendingTeachers, function() { return []; },
          function(v) { pendingTeachers = v; });
        parseInto('enrollRequests', savedEnrollRequests, function() { return []; }, function(v) { enrollRequests = v; });
        parseInto('courseRequests', savedCourseRequests, function() { return []; },
          function(v) { courseRequests = v; });
        parseInto('courseMaterials', savedCourseMaterials, function() { return []; },
          function(v) { courseMaterials = v; });
        parseInto('teacherAuthKeys', savedTeacherAuthKeys, function() { return []; },
          function(v) { teacherAuthKeys = v; });
        parseInto('lessonProgress', savedLessonProgress, function() { return {}; },
          function(v) { lessonProgress = v; });

        var savedHomeworkOutcomes = storeGet('nokj-homework-outcomes');
        var savedPauseRequests = storeGet('nokj-pause-requests');
        parseInto('homeworkOutcomes', savedHomeworkOutcomes, function() { return []; },
          function(v) { homeworkOutcomes = v; });
        parseInto('pauseRequests', savedPauseRequests, function() { return []; },
          function(v) { pauseRequests = v; });

        // Older data stored individual work under a second name for the same
        // thing. Fold it into homework so no student loses a record, then keep
        // the corrected data.
        if (migrateAssignmentWorkToHomework()) saveData();

        // Repair pass: if an individual key was lost or corrupt, fall back to the
        // last consolidated snapshot so existing records are never dropped.
        var present = {
          students: !!savedStudents, teachers: !!savedTeachers, admins: !!savedAdmins,
          courses: !!savedCourses, enrollments: !!savedEnrollments, meetings: !!savedMeetings,
          grades: !!savedGrades, tasks: !!savedTasks, taskSubmissions: !!savedSubmissions,
          budgetEntries: !!savedBudget, tests: !!savedTests, testSubmissions: !!savedTestSubmissions,
          announcements: !!savedAnnouncements, pendingTeachers: !!savedPendingTeachers,
          enrollRequests: !!savedEnrollRequests, courseRequests: !!savedCourseRequests,
          courseMaterials: !!savedCourseMaterials, teacherAuthKeys: !!savedTeacherAuthKeys,
          lessonProgress: !!savedLessonProgress,
          homeworkOutcomes: !!savedHomeworkOutcomes, pauseRequests: !!savedPauseRequests
        };
        if (snap) {
          var repaired = false;
          NOKJ_STORE_KEYS.forEach(function(pair) {
            var name = pair[1];
            var broken = !present[name] || corrupt[name];
            if (!broken || snap[name] === undefined) return;
            try {
              var val = JSON.parse(JSON.stringify(snap[name]));
              switch (name) {
                case 'students': students = val; break;
                case 'teachers': teachers = val; break;
                case 'admins': admins = val; break;
                case 'courses': courses = val; break;
                case 'enrollments': enrollments = val; break;
                case 'meetings': meetings = val; break;
                case 'grades': gradeData = val; break;
                case 'tasks': tasks = val; break;
                case 'taskSubmissions': taskSubmissions = val; break;
                case 'budgetEntries': budgetEntries = val; break;
                case 'tests': tests = val; break;
                case 'testSubmissions': testSubmissions = val; break;
                case 'announcements': announcements = val; break;
                case 'pendingTeachers': pendingTeachers = val; break;
                case 'enrollRequests': enrollRequests = val; break;
                case 'courseRequests': courseRequests = val; break;
                case 'courseMaterials': courseMaterials = val; break;
                case 'teacherAuthKeys': teacherAuthKeys = val; break;
                case 'lessonProgress': lessonProgress = val; break;
                case 'homeworkOutcomes': homeworkOutcomes = val; break;
                case 'pauseRequests': pauseRequests = val; break;
              }
              repaired = true;
            } catch (e) { /* ignore unparseable snapshot entry */ }
          });
          if (repaired) saveData();
        }

        // The demo accounts must always be available so login never breaks,
        // even if local storage holds older seed data.
        students = mergeDemoUsers(students, DEFAULT_STUDENTS);
        teachers = mergeDemoUsers(teachers, DEFAULT_TEACHERS);
        admins = mergeDemoUsers(admins, DEFAULT_ADMINS);

        // Ensure seeded meetings land in the future so the classroom is usable.
        if (!savedMeetings) {
          meetings = meetings.map(function(m, i) {
            var copy = Object.assign({}, m);
            copy.date = futureMeetingDate(i + 1);
            return copy;
          });
        }
      }

      function mergeDemoUsers(list, defaults) {
        var result = Array.isArray(list) ? list : defaults.slice();
        defaults.forEach(function(def) {
          var exists = result.some(function(u) { return u && u.email === def.email; });
          if (!exists) result.push(def);
        });
        return result;
      }

      function saveData() {
        var payload = {};
        NOKJ_STORE_KEYS.forEach(function(pair) {
          var reader = NOKJ_STORE_READERS[pair[1]];
          try {
            payload[pair[0]] = reader ? JSON.stringify(reader()) : 'null';
          } catch (e) {
            payload[pair[0]] = 'null';
          }
        });
        // Snapshot first: if this succeeds the whole database is recoverable.
        writeSnapshot(currentSnapshot());
        var degraded = false;
        var failed = false;
        Object.keys(payload).forEach(function(key) {
          var result = storeSet(key, payload[key]);
          if (result === 'session') degraded = true;
          else if (result === 'failed') failed = true;
        });
        if (failed || degraded) {
          try { sessionStorage.setItem('nokj-save-failed', '1'); } catch (e) { /* storage unavailable */ }
        } else {
          try { sessionStorage.removeItem('nokj-save-failed'); } catch (e2) { /* noop */ }
        }
      }

      // ============================================================
      //  HELPER FUNCTIONS
      // ============================================================
      //  COURSE STUDIO DATA MODEL
      //  These helpers only ADD fields. Existing values are never discarded,
      //  so upgrading the studio cannot destroy a teacher's data.
      // ============================================================
      var STUDIO_LESSON_TYPES = [
        { value: 'text', icon: '📄' },
        { value: 'video', icon: '🎬' },
        { value: 'link', icon: '🔗' },
        { value: 'file', icon: '📎' },
        { value: 'assignment', icon: '📝' },
        { value: 'quiz', icon: '❓' },
        { value: 'live', icon: '🔴' },
        { value: 'embed', icon: '🧩' }
      ];

      var STUDIO_ACCENTS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0f172a'];

      function studioLessonTypeIcon(type) {
        var found = STUDIO_LESSON_TYPES.find(function(t) { return t.value === type; });
        return found ? found.icon : '📄';
      }

      function studioNextId(prefix) {
        return prefix + '-' + Date.now().toString(36) + '-' +
          Math.floor(Math.random() * 1e6).toString(36);
      }

      // Every course preloads these four sections. Tasks, assignments and
      // tests used to live on separate pages; they are now sections of the
      // course itself, so one course is the single place a teacher works in.
      var COURSE_SECTIONS = [
        { key: 'lessons', icon: '📘', title: 'Lessons' },
        { key: 'material-tasks', icon: '📎', title: 'Tasks' },
        { key: 'assignments', icon: '📝', title: 'Homework' },
        { key: 'tests', icon: '📋', title: 'Tests' }
      ];

      function defaultCourseSections() {
        return COURSE_SECTIONS.map(function(s, i) {
          return { key: s.key, title: s.title, icon: s.icon, published: true, order: i };
        });
      }

      // Adds any missing studio field to a course in place. Never removes or
      // overwrites a field that already has a value.
      function ensureCourseShape(course) {
        if (!course || typeof course !== 'object') return course;
        if (course.emoji === undefined) course.emoji = '📘';
        if (course.color === undefined) course.color = '#4f46e5';
        if (course.code === undefined) course.code = '';
        if (course.visibility === undefined) course.visibility = 'private';
        if (course.capacity === undefined) course.capacity = 0;
        if (course.passingScore === undefined) course.passingScore = 60;
        if (course.archived === undefined) course.archived = false;
        if (course.updatedAt === undefined) course.updatedAt = course.createdAt || new Date().toISOString();
        // Group and semester fields. Older records predate groups, so they
        // become a subject of one with no group name and no semester set.
        if (course.groupName === undefined) course.groupName = '';
        if (course.subjectName === undefined) course.subjectName = course.name || '';
        if (course.semesterStart === undefined) course.semesterStart = '';
        // semester.js holds the default; fall back to the literal so this
        // normaliser still works when loaded without it.
        if (course.semesterDays === undefined) {
          course.semesterDays = (typeof SEMESTER_DEFAULT_DAYS === 'number') ? SEMESTER_DEFAULT_DAYS : 90;
        }
        if (course.courseDurationDays === undefined) course.courseDurationDays = 365;
        // Preloaded on first sight of the course, then left alone forever, so
        // a teacher can reorder or retitle sections without losing them.
        if (!Array.isArray(course.sections) || !course.sections.length) {
          course.sections = defaultCourseSections();
        }
        if (!Array.isArray(course.modules)) course.modules = [];
        course.modules.forEach(function(mod) {
          if (!mod || typeof mod !== 'object') return;
          if (mod.id === undefined) mod.id = studioNextId('m');
          if (mod.title === undefined) mod.title = tr('Untitled module');
          if (mod.description === undefined) mod.description = '';
          if (mod.published === undefined) mod.published = false;
          if (mod.collapsed === undefined) mod.collapsed = false;
          if (!Array.isArray(mod.lessons)) mod.lessons = [];
          mod.lessons.forEach(function(lesson) {
            if (!lesson || typeof lesson !== 'object') return;
            if (lesson.id === undefined) lesson.id = studioNextId('l');
            if (lesson.title === undefined) lesson.title = tr('Untitled lesson');
            if (lesson.type === undefined) lesson.type = 'text';
            if (lesson.body === undefined) lesson.body = '';
            if (lesson.url === undefined) lesson.url = '';
            if (lesson.fileName === undefined) lesson.fileName = '';
            if (lesson.fileData === undefined) lesson.fileData = '';
            if (lesson.duration === undefined) lesson.duration = 0;
            if (lesson.published === undefined) lesson.published = false;
            if (lesson.order === undefined) lesson.order = 0;
          });
          mod.lessons.forEach(function(lesson, index) { lesson.order = index; });
        });
        return course;
      }

      function ensureAllCourseShapes() {
        courses.forEach(ensureCourseShape);
      }

      function getCourseModules(courseId) {
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c) return [];
        ensureCourseShape(c);
        return c.modules;
      }

      // includeDrafts=true counts every lesson regardless of state.
      // includeDrafts=false counts only what students can actually see, so a
      // lesson inside an unpublished module is never counted as published.
      function countCourseLessons(courseId, includeDrafts) {
        return getCourseModules(courseId).reduce(function(sum, mod) {
          if (!includeDrafts && !mod.published) return sum;
          return sum + mod.lessons.filter(function(l) { return includeDrafts || l.published; }).length;
        }, 0);
      }

      function countCourseModules(courseId) {
        return getCourseModules(courseId).length;
      }

      function isCoursePublished(course) {
        if (!course) return false;
        var mods = getCourseModules(course.id);
        if (!mods.length) return false;
        return mods.some(function(m) {
          return m.published && m.lessons.some(function(l) { return l.published; });
        });
      }

      // Completion for a single student across a course curriculum.
      function courseCompletion(courseId, studentId) {
        var lessons = [];
        getCourseModules(courseId).forEach(function(mod) {
          if (!mod.published) return;
          mod.lessons.forEach(function(l) { if (l.published) lessons.push(l); });
        });
        if (!lessons.length) return 0;
        var done = lessons.filter(function(l) { return isLessonComplete(courseId, l.id, studentId); }).length;
        return Math.round((done / lessons.length) * 100);
      }

      function lessonProgressKey(courseId, lessonId, studentId) {
        return courseId + '::' + lessonId + '::' + studentId;
      }

      function isLessonComplete(courseId, lessonId, studentId) {
        var rec = lessonProgress[lessonProgressKey(courseId, lessonId, studentId)];
        return !!(rec && rec.completed);
      }

      function setLessonComplete(courseId, lessonId, studentId, completed) {
        var key = lessonProgressKey(courseId, lessonId, studentId);
        if (completed) {
          lessonProgress[key] = { completed: true, completedAt: new Date().toISOString() };
        } else {
          delete lessonProgress[key];
        }
        saveData();
      }

      function getTeacherName(id) {
        var t = teachers.find(function(tc) { return tc.id === id; });
        return t ? t.name : tr('Unknown');
      }

      function getStudentName(id) {
        var s = students.find(function(st) { return st.id === id; });
        return s ? s.name : tr('Unknown');
      }

      function getCourseName(id) {
        var c = courses.find(function(co) { return co.id === id; });
        return c ? c.name : tr('Unknown');
      }

      function getEnrolledCourseIds(studentId) {
        return enrollments.filter(function(e) { return e.studentId === studentId; }).map(function(e) { return e.courseId; });
      }

      function getEnrolledStudentIds(courseId) {
        return enrollments.filter(function(e) { return e.courseId === courseId; }).map(function(e) { return e.studentId; });
      }

      // ============================================================
      //  COURSE SECTIONS
      //  Tasks, assignments and tests belong to a course, so they are
      //  listed per course instead of on separate pages.
      // ============================================================
      // Tasks used to be linked by assignedTo/assignedIds only. Older records
      // have no courseId, so the first course id is used as a fallback.
      function taskCourseId(task) {
        if (!task) return null;
        if (task.courseId !== undefined && task.courseId !== null) return task.courseId;
        if (task.assignedTo === 'course' && Array.isArray(task.assignedIds) && task.assignedIds.length) {
          return task.assignedIds[0];
        }
        return null;
      }

      // A task is a course section, so who may see it is decided by the same
      // assignment rules the old standalone task list used. Drafts and
      // unpublished items are never visible.
      function taskVisibleToStudent(task, studentId) {
        if (!task || !studentId) return false;
        if (!isTaskPublished(task)) return false;
        if (task.assignedTo === 'course') {
          var enrolled = getEnrolledCourseIds(studentId);
          return Array.isArray(task.assignedIds) && task.assignedIds.some(function(cid) {
            return enrolled.indexOf(cid) !== -1;
          });
        }
        if (task.assignedTo === 'student') {
          return Array.isArray(task.assignedIds) && task.assignedIds.indexOf(studentId) !== -1;
        }
        if (task.assignedTo === 'all') {
          if (task.teacherId && typeof teacherEnrolledStudentIds === 'function') {
            return teacherEnrolledStudentIds().indexOf(studentId) !== -1;
          }
          return true;
        }
        return false;
      }

      function testVisibleToStudent(test, studentId) {
        if (!test || !studentId) return false;
        if (test.published === false) return false;
        if (Array.isArray(test.courseIds) && test.courseIds.length) {
          var enrolled = getEnrolledCourseIds(studentId);
          return test.courseIds.some(function(cid) { return enrolled.indexOf(cid) !== -1; });
        }
        // A test tied to a course is visible to whoever is in that course.
        if (test.courseId) return getEnrolledCourseIds(studentId).indexOf(test.courseId) !== -1;
        return true;
      }

      // Work types. Assignment and Homework were two names for the same
      // thing, which produced two identical options in the create menu and an
      // empty section on one of them. Everything stored as an assignment is
      // migrated to homework, and `assignment` is kept only as a legacy key
      // for the course section and the Studio sub-tab, whose keys are already
      // persisted in saved data.
      var WORK_TYPE_HOMEWORK = 'homework';

      // Runs once on load. Idempotent, so a second run costs nothing.
      function migrateAssignmentWorkToHomework() {
        var changed = 0;
        tasks.forEach(function(t) {
          if (t && t.type === 'assignment') {
            t.type = WORK_TYPE_HOMEWORK;
            changed++;
          }
        });
        return changed;
      }

      // What a given student can actually open in a course section.
      function courseWorkForStudent(courseId, section, studentId) {
        if (section === 'tests') {
          return tests.filter(function(t) {
            return t.courseId === courseId && testVisibleToStudent(t, studentId);
          });
        }
        if (section === 'material' || section === 'assignments') {
          var onlyHomework = section === 'assignments';
          return tasks.filter(function(t) {
            // The homework section holds individual work the student must
            // finish alone. Everything else is class or extra work.
            var isHomework = t.type === WORK_TYPE_HOMEWORK;
            if (onlyHomework ? !isHomework : isHomework) return false;
            if (taskCourseId(t) !== courseId) return false;
            return taskVisibleToStudent(t, studentId);
          });
        }
        return [];
      }

      // Everything a student must finish in one course, in section order.
      // With no studentId this is the teacher's view: every published item in
      // the course, regardless of who it was assigned to.
      function courseWorkCounts(courseId, studentId) {
        var publishedTasks = tasks.filter(function(t) {
          if (isTaskDraft(t)) return false;
          return taskCourseId(t) === courseId;
        });
        var publishedTests = tests.filter(function(t) {
          return t.published !== false && t.courseId === courseId;
        });
        if (!studentId) {
          return {
            material: publishedTasks.filter(function(t) { return t.type !== WORK_TYPE_HOMEWORK; }).length,
            assignments: publishedTasks.filter(function(t) { return t.type === WORK_TYPE_HOMEWORK; }).length,
            tests: publishedTests.length,
            pending: 0
          };
        }
        var material = courseWorkForStudent(courseId, 'material', studentId);
        var assignments = courseWorkForStudent(courseId, 'assignments', studentId);
        var courseTestList = courseWorkForStudent(courseId, 'tests', studentId);
        var pendingTasks = material.concat(assignments).filter(function(t) {
          return !taskSubmissions[t.id + '-' + studentId];
        }).length;
        var pendingTests = courseTestList.filter(function(t) {
          return !testSubmissions[t.id + '-' + studentId];
        }).length;
        return {
          material: material.length,
          assignments: assignments.length,
          tests: courseTestList.length,
          pending: pendingTasks + pendingTests
        };
      }

      function getCourseStudentCount(courseId) {
        return enrollments.filter(function(e) { return e.courseId === courseId; }).length;
      }

      // ----- Course pass mark (Studio settings) -----
      function getCoursePassingScore(courseId) {
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c || c.passingScore === undefined || c.passingScore === null) return 60;
        return Math.min(100, Math.max(0, Number(c.passingScore) || 0));
      }

      // The course-level grade, or null when the teacher has not set one.
      function getCourseGrade(studentId, courseId) {
        var g = gradeData[studentId + '-' + courseId];
        if (g === undefined || g === null || g === '') return null;
        var n = Number(g);
        return isNaN(n) ? null : n;
      }

      // null = not graded yet, so the pass mark cannot be judged either.
      function isCoursePassed(studentId, courseId) {
        var g = getCourseGrade(studentId, courseId);
        if (g === null) return null;
        return g >= getCoursePassingScore(courseId);
      }

      // ----- Course enrollment rules (Studio settings) -----
      // capacity === 0 means unlimited.
      function isCourseFull(courseId) {
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c || !c.capacity || c.capacity <= 0) return false;
        return getCourseStudentCount(courseId) >= c.capacity;
      }

      // Private courses are invite-only: they never appear in the public
      // enrollment list. A student can still reach one with its course code.
      function isCoursePublic(courseId) {
        var c = courses.find(function(x) { return x.id === courseId; });
        return !!c && c.visibility !== 'private';
      }

      // A course is listable when it is public and not archived. Full courses
      // stay listable so students can see them, but every action checks
      // isCourseFull() before enrolling anyone.
      function isCourseListableForEnrollment(course) {
        if (!course) return false;
        if (course.archived) return false;
        return isCoursePublic(course.id);
      }

      // Case-insensitive, whitespace-tolerant course-code lookup.
      function findCourseByCode(code) {
        var needle = String(code || '').trim().toLowerCase();
        if (!needle) return null;
        return courses.find(function(c) {
          return c.code && String(c.code).trim().toLowerCase() === needle;
        }) || null;
      }

      function getUserByEmail(email) {
        // Compared case-insensitively and without surrounding whitespace, so
        // the same account is always found by the same typed address.
        var wanted = String(email === undefined || email === null ? '' : email).trim().toLowerCase();
        var match = function(list) {
          return list.find(function(u) {
            return String(u.email || '').trim().toLowerCase() === wanted;
          });
        };
        return match(students) || match(teachers) || match(admins) || null;
      }

      function getAllUsers() {
        return [].concat(students, teachers, admins);
      }

      function generateId() {
        var maxId = 1;
        getAllUsers().forEach(function(u) {
          if (u.id > maxId) maxId = u.id;
        });
        return maxId + 1;
      }

      function escapeHtml(str) {
        return String(str === null || str === undefined ? '' : str)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }

      // ----- Meeting time helpers -----
      function meetingStartMs(m) {
        return new Date(m.date + 'T' + (m.time || '00:00')).getTime();
      }

      function meetingEndMs(m) {
        return meetingStartMs(m) + ((m.duration || 60) * 60000);
      }

      function meetingEditable(m) {
        if (!currentUser || !m) return false;
        if (currentUser.role === 'Admin') return true;
        if (currentUser.role !== 'Teacher') return false;
        var now = Date.now();
        return (m.teacherId === currentUser.id || m.createdBy === currentUser.id) &&
          now < meetingStartMs(m) - (24 * 60 * 60 * 1000);
      }

      function meetingAudienceLabels(m) {
        var labels = [];
        if (m.visibleToStudents !== false) labels.push(tr('Students'));
        if (m.visibleToTeachers) labels.push(tr('Teachers'));
        if (!labels.length) labels.push(tr('Admins'));
        return labels;
      }

      function initialsOf(name) {
        if (!name) return '?';
        return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
      }

      function activeStudentCount() {
        return students.filter(function(s) { return s.status === 'Active'; }).length;
      }

      function nextCourseId() {
        var maxId = 0;
        courses.forEach(function(c) { if (Number(c.id) > maxId) maxId = Number(c.id); });
        courseRequests.forEach(function(r) {
          if (r.id && Number(r.id) > maxId && (r.type === 'create')) maxId = Number(r.id);
        });
        return maxId + 1;
      }

      function downloadBlob(content, mime, filename) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      function csvCell(value) {
        var s = value === null || value === undefined ? '' : String(value);
        if (/^[=+\-@]/.test(s)) s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
      }

      // Builds a real .xls (SpreadsheetML) workbook without any external library.
      function exportToExcel(sheets, filename) {
        var xml = '<?xml version="1.0"?>\n' +
          '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
          'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
          '<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/></Style></Styles>';
        sheets.forEach(function(sheet) {
          xml += '<Worksheet ss:Name="' + String(sheet.name).replace(/"/g, '') + '"><Table>';
          (sheet.rows || []).forEach(function(row, rowIdx) {
            xml += '<Row>';
            row.forEach(function(cell) {
              var style = rowIdx === 0 ? ' ss:StyleID="hdr"' : '';
              xml += '<Cell' + style + '><Data ss:Type="String">' +
                String(cell === null || cell === undefined ? '' : cell)
                  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                '</Data></Cell>';
            });
            xml += '</Row>';
          });
          xml += '</Table></Worksheet>';
        });
        xml += '</Workbook>';
        downloadBlob(xml, 'application/vnd.ms-excel', filename || ('nokj-export-' +
          new Date().toISOString().split('T')[0] + '.xls'));
      }

      function exportAdminWorkbook() {
        if (!currentUser || currentUser.role !== 'Admin') return;
        var enrolledCourseNames = {};
        enrollments.forEach(function(e) {
          enrolledCourseNames[e.studentId] = enrolledCourseNames[e.studentId] || [];
          var c = courses.find(function(x) { return x.id === e.courseId; });
          if (c) enrolledCourseNames[e.studentId].push(c.name);
        });
        exportToExcel([
          {
            name: 'Students',
            rows: [['ID', 'Name', 'Email', 'Role', 'Status', 'Created', 'Courses']].concat(
              students.map(function(s) {
                return [s.id, s.name, s.email, 'Student', s.status, s.createdAt || '',
                  (enrolledCourseNames[s.id] || []).join(' / ')];
              }))
          },
          {
            name: 'Teachers',
            rows: [['ID', 'Name', 'Email', 'Teacher Code', 'Status', 'Created']].concat(
              teachers.map(function(t) {
                return [t.id, t.name, t.email, t.teacherCode || '', t.status, t.createdAt || ''];
              }))
          },
          {
            name: 'Courses',
            rows: [['ID', 'Name', 'Teacher', 'Description', 'Enrolled']].concat(
              courses.map(function(c) {
                return [c.id, c.name, getTeacherName(c.teacherId), c.description || '',
                  getCourseStudentCount(c.id)];
              }))
          },
          {
            name: 'Tasks',
            rows: [['ID', 'Title', 'Type', 'Priority', 'Deadline', 'Assigned To', 'Submissions', 'Graded']].concat(
              tasks.map(function(t) {
                var keys = Object.keys(taskSubmissions).filter(function(k) { return k.startsWith(t.id + '-'); });
                var graded = keys.filter(function(k) {
                  return taskSubmissions[k] && taskSubmissions[k].grade !== null &&
                    taskSubmissions[k].grade !== undefined;
                });
                return [t.id, t.title, t.type, t.priority, t.deadline, t.assignedTo, keys.length, graded.length];
              }))
          },
          {
            name: 'Budget',
            rows: [['Category', 'Type', 'Amount', 'Date', 'Status']].concat(
              budgetEntries.map(function(b) {
                return [b.category, b.type, b.amount, b.date, b.status];
              }))
          },
          {
            name: 'Teacher Keys',
            rows: [['Key', 'Status', 'Used By', 'Created']].concat(
              teacherAuthKeys.map(function(k) {
                return [k.key, k.used ? 'Used' : 'Active', k.usedByName || '', k.createdAt || ''];
              }))
          }
        ], 'nokj-academy-' + new Date().toISOString().split('T')[0] + '.xls');
      }

      // Export the whole academy database as a downloadable JSON backup.
      function exportAppData() {
        var payload = {
          exportedAt: new Date().toISOString(),
          version: 'NOKJ 2.3',
          students: students,
          teachers: teachers,
          admins: admins,
          courses: courses,
          enrollments: enrollments,
          meetings: meetings,
          grades: gradeData,
          tasks: tasks,
          taskSubmissions: taskSubmissions,
          budget: budgetEntries,
          tests: tests,
          testSubmissions: testSubmissions,
          announcements: announcements,
          pendingTeachers: pendingTeachers,
          enrollRequests: enrollRequests,
          courseRequests: courseRequests,
          courseMaterials: courseMaterials,
          teacherAuthKeys: teacherAuthKeys,
          brandLogo: (function() { try { return localStorage.getItem('nokj-logo'); } catch (e) { return null; } })()
        };
        downloadBlob(JSON.stringify(payload, null, 2), 'application/json',
          'nokj-backup-' + new Date().toISOString().split('T')[0] + '.json');
      }

      // Render a user's photo onto an avatar element (span). Falls back to initials.
      function renderAvatar(el, user) {
        if (!el) return;
        el.style.backgroundImage = '';
        el.style.backgroundSize = '';
        el.style.backgroundPosition = '';
        if (user && user.avatar) {
          el.style.backgroundImage = 'url("' + user.avatar + '")';
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
          el.style.fontSize = '0';
        } else {
          el.textContent = initialsOf(user ? user.name : '');
        }
      }

      // Apply the stored NOKJ logo to every brand mark across screens.
      function applyBrandLogo() {
        var saved = null;
        try { saved = localStorage.getItem('nokj-logo') || null; } catch (e) { saved = null; }
        document.querySelectorAll('.brand-mark').forEach(function(el) {
          if (saved) {
            el.style.backgroundImage = 'url("' + saved + '")';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.textContent = '';
          } else {
            el.style.backgroundImage = '';
            el.textContent = 'N';
          }
        });
      }

      function applyTheme(theme) {
        theme = theme || 'light';
        if (theme !== 'light' && theme !== 'dark' && theme !== 'soft') theme = 'light';
        document.body.classList.remove('theme-dark', 'theme-soft');
        if (theme !== 'light') document.body.classList.add('theme-' + theme);
        try { localStorage.setItem('nokj-theme', theme); } catch (e) { /* noop */ }
        document.querySelectorAll('.theme-select').forEach(function(el) { el.value = theme; });
      }

      function saveBrandLogo(dataUrl) {
        if (dataUrl) localStorage.setItem('nokj-logo', dataUrl);
        else localStorage.removeItem('nokj-logo');
        applyBrandLogo();
      }

      function announcementText(a) {
        if (!a) return '';
        return a.content || a.message || '';
      }

      function announcementSnippet(a, len) {
        var text = announcementText(a);
        len = len || 120;
        if (text.length > len) return text.slice(0, len).trim() + '…';
        return text;
      }
