      function openPage(pageName) {
        pages.forEach(function(page) { page.classList.toggle('active', page.id === pageName); });
        navButtons.forEach(function(btn) { btn.classList.toggle('active', btn.dataset.page === pageName); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (pageName === 'calendar') renderCalendar();
        if (pageName === 'classroom') renderMeetings();
        if (pageName === 'tests') renderTests();
        setLanguage(currentLang);
      }
