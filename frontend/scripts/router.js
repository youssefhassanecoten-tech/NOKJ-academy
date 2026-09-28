      // Tasks, tests and assignments are course sections now, so the old
      // standalone routes are gone. Anything still pointing at them (an old
      // link, a bookmark, a deep link) lands on the course list instead.
      var MERGED_PAGES = ['assignments', 'tasks', 'tests'];

      function openPage(pageName) {
        if (MERGED_PAGES.indexOf(pageName) !== -1) pageName = 'courses';
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
