      // Tasks, tests and assignments are course sections now, so the old
      // standalone routes are gone. Anything still pointing at them (an old
      // link, a bookmark, a deep link) lands on the course list instead.
      var MERGED_PAGES = ['assignments', 'tasks', 'tests'];

      // A teacher works inside Course Studio, which already shows only their
      // own courses, so they have no separate courses page to reach.
      function isTeacher() {
        return !!currentUser && currentUser.role === 'Teacher';
      }

      // Budget is the academy finances and is an admin concern only. Teachers
      // are turned away from it rather than shown an empty page. Grades is
      // deliberately NOT here: teachers do manage student grades.
      var ADMIN_ONLY_PAGES = ['budget'];

      function openPage(pageName) {
        if (MERGED_PAGES.indexOf(pageName) !== -1) pageName = 'courses';
        if ((pageName === 'courses' || pageName === 'courses-admin') && isTeacher()) {
          pageName = 'course-workspace';
        }
        if (ADMIN_ONLY_PAGES.indexOf(pageName) !== -1 && currentUser && currentUser.role !== 'Admin') {
          pageName = isTeacher() ? 'course-workspace' : 'dashboard';
        }
        if ((pageName === 'course-workspace' || pageName === 'courses-admin') && currentUser && currentUser.role === 'Student') {
          pageName = 'dashboard';
        }
        pages.forEach(function(page) { page.classList.toggle('active', page.id === pageName); });
        navButtons.forEach(function(btn) { btn.classList.toggle('active', btn.dataset.page === pageName); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (pageName === 'dashboard') renderDashboard();
        if (pageName === 'courses') {
          if (currentUser && currentUser.role === 'Teacher') renderTeacherCourses();
          else renderStudentCourses();
        }
        if (pageName === 'timetable') renderTimetable();
        if (pageName === 'announcements') renderAnnouncements();
        if (pageName === 'calendar') renderCalendar();
        if (pageName === 'classroom') renderMeetings();
        if (pageName === 'approvals') { renderApprovals(); renderTeacherAuthKeys(); }
        if (pageName === 'course-workspace') renderCourseStudio();
        setLanguage(currentLang);
      }
