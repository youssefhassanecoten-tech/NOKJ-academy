      // ============================================================
      //  DATA MANAGEMENT
      // ============================================================
      function loadData() {
        const savedStudents = localStorage.getItem('nokj-students');
        const savedTeachers = localStorage.getItem('nokj-teachers');
        const savedAdmins = localStorage.getItem('nokj-admins');
        const savedCourses = localStorage.getItem('nokj-courses');
        const savedEnrollments = localStorage.getItem('nokj-enrollments');
        const savedMeetings = localStorage.getItem('nokj-meetings');
        const savedGrades = localStorage.getItem('nokj-grades');
        const savedTasks = localStorage.getItem('nokj-tasks');
        const savedSubmissions = localStorage.getItem('nokj-submissions');
        const savedBudget = localStorage.getItem('nokj-budget');
        const savedTests = localStorage.getItem('nokj-tests');
        const savedTestSubmissions = localStorage.getItem('nokj-test-submissions');
        const savedAnnouncements = localStorage.getItem('nokj-announcements');
        const savedPendingTeachers = localStorage.getItem('nokj-pending-teachers');
        const savedEnrollRequests = localStorage.getItem('nokj-enroll-requests');
        const savedCourseRequests = localStorage.getItem('nokj-course-requests');

        if (savedStudents) { try { students = JSON.parse(savedStudents); } catch (e) { students = DEFAULT_STUDENTS.slice(); } } else { students =
            DEFAULT_STUDENTS.slice(); }
        if (savedTeachers) { try { teachers = JSON.parse(savedTeachers); } catch (e) { teachers = DEFAULT_TEACHERS.slice(); } } else { teachers =
            DEFAULT_TEACHERS.slice(); }
        if (savedAdmins) { try { admins = JSON.parse(savedAdmins); } catch (e) { admins = DEFAULT_ADMINS.slice(); } } else { admins =
            DEFAULT_ADMINS.slice(); }
        if (savedCourses) { try { courses = JSON.parse(savedCourses); } catch (e) { courses = DEFAULT_COURSES.slice(); } } else { courses =
            DEFAULT_COURSES.slice(); }
        if (savedEnrollments) { try { enrollments = JSON.parse(savedEnrollments); } catch (e) { enrollments = DEFAULT_ENROLLMENTS.slice(); } } else { enrollments =
            DEFAULT_ENROLLMENTS.slice(); }
        if (savedMeetings) { try { meetings = JSON.parse(savedMeetings); } catch (e) { meetings = DEFAULT_MEETINGS.slice(); } } else { meetings =
            DEFAULT_MEETINGS.slice(); }
        if (savedGrades) { try { gradeData = JSON.parse(savedGrades); } catch (e) { gradeData = DEFAULT_GRADES; } } else { gradeData =
            DEFAULT_GRADES; }
        if (savedTasks) { try { tasks = JSON.parse(savedTasks); } catch (e) { tasks = DEFAULT_TASKS.slice(); } } else { tasks =
            DEFAULT_TASKS.slice(); }
        if (savedSubmissions) { try { taskSubmissions = JSON.parse(savedSubmissions); } catch (e) { taskSubmissions =
              DEFAULT_TASK_SUBMISSIONS; } } else { taskSubmissions = DEFAULT_TASK_SUBMISSIONS; }
        if (savedBudget) { try { budgetEntries = JSON.parse(savedBudget); } catch (e) { budgetEntries = DEFAULT_BUDGET.slice(); } } else { budgetEntries =
            DEFAULT_BUDGET.slice(); }
        if (savedTests) { try { tests = JSON.parse(savedTests); } catch (e) { tests = []; } } else { tests = []; }
        if (savedTestSubmissions) { try { testSubmissions = JSON.parse(savedTestSubmissions); } catch (e) { testSubmissions =
              {}; } } else { testSubmissions = {}; }
        if (savedAnnouncements) { try { announcements = JSON.parse(savedAnnouncements); } catch (e) { announcements =
            DEFAULT_ANNOUNCEMENTS.slice(); } } else { announcements = DEFAULT_ANNOUNCEMENTS.slice(); }
        if (savedPendingTeachers) { try { pendingTeachers = JSON.parse(savedPendingTeachers); } catch (e) { pendingTeachers = []; } } else { pendingTeachers = []; }
        if (savedEnrollRequests) { try { enrollRequests = JSON.parse(savedEnrollRequests); } catch (e) { enrollRequests = []; } } else { enrollRequests = []; }
        if (savedCourseRequests) { try { courseRequests = JSON.parse(savedCourseRequests); } catch (e) { courseRequests = []; } } else { courseRequests = []; }

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
        localStorage.setItem('nokj-students', JSON.stringify(students));
        localStorage.setItem('nokj-teachers', JSON.stringify(teachers));
        localStorage.setItem('nokj-admins', JSON.stringify(admins));
        localStorage.setItem('nokj-courses', JSON.stringify(courses));
        localStorage.setItem('nokj-enrollments', JSON.stringify(enrollments));
        localStorage.setItem('nokj-meetings', JSON.stringify(meetings));
        localStorage.setItem('nokj-grades', JSON.stringify(gradeData));
        localStorage.setItem('nokj-tasks', JSON.stringify(tasks));
        localStorage.setItem('nokj-submissions', JSON.stringify(taskSubmissions));
        localStorage.setItem('nokj-budget', JSON.stringify(budgetEntries));
        localStorage.setItem('nokj-tests', JSON.stringify(tests));
        localStorage.setItem('nokj-test-submissions', JSON.stringify(testSubmissions));
        localStorage.setItem('nokj-announcements', JSON.stringify(announcements));
        localStorage.setItem('nokj-pending-teachers', JSON.stringify(pendingTeachers));
        localStorage.setItem('nokj-enroll-requests', JSON.stringify(enrollRequests));
        localStorage.setItem('nokj-course-requests', JSON.stringify(courseRequests));
      }

      // ============================================================
      //  HELPER FUNCTIONS
      // ============================================================
      function getTeacherName(id) {
        var t = teachers.find(function(tc) { return tc.id === id; });
        return t ? t.name : 'Unknown';
      }

      function getStudentName(id) {
        var s = students.find(function(st) { return st.id === id; });
        return s ? s.name : 'Unknown';
      }

      function getCourseName(id) {
        var c = courses.find(function(co) { return co.id === id; });
        return c ? c.name : 'Unknown';
      }

      function getEnrolledCourseIds(studentId) {
        return enrollments.filter(function(e) { return e.studentId === studentId; }).map(function(e) { return e.courseId; });
      }

      function getEnrolledStudentIds(courseId) {
        return enrollments.filter(function(e) { return e.courseId === courseId; }).map(function(e) { return e.studentId; });
      }

      function getCourseStudentCount(courseId) {
        return enrollments.filter(function(e) { return e.courseId === courseId; }).length;
      }

      function getUserByEmail(email) {
        var user = students.find(function(s) { return s.email === email; });
        if (user) return user;
        user = teachers.find(function(t) { return t.email === email; });
        if (user) return user;
        user = admins.find(function(a) { return a.email === email; });
        return user || null;
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
        if (!currentUser) return false;
        if (currentUser.role === 'Admin') return true;
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
          brandLogo: (function() { try { return localStorage.getItem('nokj-logo'); } catch (e) { return null; } })()
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'nokj-backup-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        var sel = document.getElementById('theme-select');
        if (sel) sel.value = theme;
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
