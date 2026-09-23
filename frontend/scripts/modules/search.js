// ============================================================
      //  GLOBAL SEARCH
      // ============================================================
      function initGlobalSearch() {
        var input = document.getElementById('global-search');
        var resultsBox = document.getElementById('global-search-results');
        if (!input || !resultsBox) return;

        input.addEventListener('input', function() {
          var q = input.value.trim().toLowerCase();
          if (!q) {
            resultsBox.style.display = 'none';
            return;
          }
          renderSearchResults(q);
        });

        input.addEventListener('focus', function() {
          if (input.value.trim()) renderSearchResults(input.value.trim().toLowerCase());
        });

        document.addEventListener('click', function(e) {
          if (!resultsBox.contains(e.target) && e.target.id !== 'global-search') {
            resultsBox.style.display = 'none';
          }
        });
      }

      function renderSearchResults(q) {
        var resultsBox = document.getElementById('global-search-results');
        if (!resultsBox) return;
        var html = '';
        var count = 0;

        courses.forEach(function(c) {
          if (c.name.toLowerCase().indexOf(q) !== -1) {
            html += searchItem('courses', c.name, tr('Course'), '○');
            count++;
          }
        });

        meetings.forEach(function(m) {
          if (m.title.toLowerCase().indexOf(q) !== -1) {
            html += searchItem('classroom', m.title, tr('Lesson'), '🎥');
            count++;
          }
        });

        tasks.forEach(function(t) {
          if ((t.title || '').toLowerCase().indexOf(q) !== -1) {
            html += searchItem('tasks', t.title, tr('Task'), '📝');
            count++;
          }
        });

        announcements.forEach(function(a) {
          if ((a.title || '').toLowerCase().indexOf(q) !== -1) {
            html += searchItem('announcements', a.title, tr('Announcement'), '📌');
            count++;
          }
        });

        students.forEach(function(s) {
          if ((s.name || '').toLowerCase().indexOf(q) !== -1) {
            html += searchItem('students', s.name, tr('Student'), '👥');
            count++;
          }
        });

        if (!count) html = '<div class="search-empty">' + tr('No results found.') + '</div>';

        resultsBox.innerHTML = html;
        resultsBox.style.display = 'block';
      }

      function searchItem(page, title, type, icon) {
        return '<button class="search-result" data-page="' + page + '"><span class="search-result-icon">' + icon +
          '</span><span class="search-result-main"><strong>' + escapeHtml(title) + '</strong><em>' + type +
          '</em></span></button>';
      }

      document.addEventListener('DOMContentLoaded', initGlobalSearch);
      if (document.readyState !== 'loading') initGlobalSearch();