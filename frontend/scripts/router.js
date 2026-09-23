      function openPage(pageName) {
        if (pageName === 'assignments' && currentUser && currentUser.role === 'Admin') pageName = 'dashboard';
        pages.forEach(function(page) { page.classList.toggle('active', page.id === pageName); });
        navButtons.forEach(function(btn) { btn.classList.toggle('active', btn.dataset.page === pageName); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (pageName === 'dashboard') renderDashboard();
        if (pageName === 'timetable') renderTimetable();
        if (pageName === 'assignments') renderAssignments();
        if (pageName === 'announcements') renderAnnouncements();
        if (pageName === 'calendar') renderCalendar();
        if (pageName === 'classroom') renderMeetings();
        if (pageName === 'tests') renderTests();
        if (pageName === 'approvals') renderApprovals();
        setLanguage(currentLang);
      }
