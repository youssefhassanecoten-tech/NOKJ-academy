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
