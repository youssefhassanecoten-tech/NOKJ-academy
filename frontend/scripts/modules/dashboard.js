function updateAdminStats() {
        if (!currentUser || currentUser.role !== 'Admin') return;
        totalStudentsEl.textContent = activeStudentCount();
        totalCoursesEl.textContent = courses.length;
        totalEnrollmentsEl.textContent = enrollments.length;
        var totalIncome = budgetEntries.filter(function(b) { return b.type === 'Income'; }).reduce(function(sum, b) { return sum +
            b.amount; }, 0);
        totalRevenueEl.textContent = '$' + totalIncome.toLocaleString();
        // Keep the dashboard hero stat fresh (e.g. after a status change).
        renderDashboard();
      }

      // ============================================================
      //  DASHBOARD CONTENT (role-aware, data-driven)
      // ============================================================
      function renderDashboard() {
        if (!currentUser) return;
        var grid = document.getElementById('dashboard-grid');
        if (!grid) return;
        var isAdmin = currentUser.role === 'Admin';
        var isTeacher = currentUser.role === 'Teacher';

        var content = '';

        if (isAdmin) {
          content += renderAdminDashboard();
        } else if (isTeacher) {
          content += renderTeacherDashboard();
        } else {
          content += renderStudentDashboard();
        }

        grid.innerHTML = content;
        setLanguage(currentLang);
      }

      function renderAdminDashboard() {
        var html = '';
        html += '<div class="hero">' +
          '<div><p class="eyebrow">' + new Date().toLocaleDateString() + '</p><h2>' + tr('Manage Academy') +
          '</h2><p class="hero-sub">' + tr('Here is everything you need to stay on track today.|admin') + '</p></div>' +
          '<button class="primary-button" data-page="students">' + tr('Add student') + '</button>' +
          '</div>';
        html += '<div class="stats">' +
          statCard(tr('Active students'), activeStudentCount(), tr('Active this term'), '▦') +
          statCard(tr('Total Courses'), courses.length, tr('Across all courses'), '▣') +
          statCard(tr('Total Enrollments'), enrollments.length, tr('Active this term'), '✓') +
          statCard(tr('Revenue'), '$' + budgetEntries.filter(function(b) { return b.type === 'Income'; }).reduce(function(
              s, b) { return s + b.amount; }, 0).toLocaleString(), tr('This month'), '↗') +
          '</div>';
        html += '<div class="dashboard-grid">' +
          '<div class="stack">' +
          panel(tr('Quick actions'),
          '<div class="quick-actions">' +
          '<button class="primary-button" data-page="course-workspace">🧩 ' + tr('Create course') + '</button>' +
          '<button class="primary-button" data-page="tasks">📝 ' + tr('Create task') + '</button>' +
          '<button class="primary-button" data-page="calendar">📅 ' + tr('Schedule class') + '</button>' +
          '<button class="primary-button" data-page="grades">⭐ ' + tr('Manage grades') + '</button>' +
          '<button class="primary-button" onclick="openModal(\'announcement\', \'add\')">📌 ' + tr('Create announcement') +
          '</button></div>') +
          panel(tr('Announcements'), renderDashboardAnnouncements()) +
          '</div>' +
          '<div class="stack">' +
          panel(tr('Lessons today'), renderDashboardMeetings()) +
          panel(tr('Developer feedback'), renderDeveloperFeedback()) +
          '</div>' +
          '</div>';
        return html;
      }

      function renderTeacherDashboard() {
        var myMeetings = meetings.filter(function(m) { return m.teacherId === currentUser.id; });
        var html = '';
        html += '<div class="hero">' +
          '<div><p class="eyebrow">' + new Date().toLocaleDateString() + '</p><h2>' + tr('Good day') + ' ' +
          escapeHtml(currentUser.name.split(' ')[0]) + ' 👋</h2><p class="hero-sub">' +
          tr('Here is everything you need to stay on track today.|teacher') +
          '</p></div>' +
          '<button class="primary-button" data-page="calendar">' + tr('Schedule class') + '</button></div>';
        html += '<div class="stats">' +
          statCard(tr('Lessons today'), myMeetings.length, tr('View timetable'), '▦') +
          statCard(tr('Pending work'), tasks.filter(function(t) { return t.assignedTo === 'all'; }).length, tr(
            'Due soon'), '✓') +
          statCard(tr('Active students'), activeStudentCount(), tr('Active this term'), '👥') +
          statCard(tr('Total Courses'), courses.filter(function(c) { return c.teacherId === currentUser.id; }).length, tr(
            'Across all courses'), '▣') +
          '</div>';
        html += '<div class="dashboard-grid">' +
          '<div class="stack">' +
          panel(tr('Today\'s timetable'), renderDashboardMeetings()) +
          panel(tr('Upcoming assignments'), renderDashboardTasks()) +
          '</div>' +
          '<div class="stack">' +
          panel(tr('Announcements'), renderDashboardAnnouncements()) +
          panel(tr('Latest updates'),
          '<p style="color:var(--muted);padding:14px 0;">' + tr('No lessons scheduled for today.') + '</p>') +
          '</div>' +
          '</div>';
        return html;
      }

      function renderStudentDashboard() {
        var today = new Date().toISOString().split('T')[0];
        var todays = meetings.filter(function(m) { return m.date === today; });
        var subTasks = tasks.filter(function(t) {
          if (t.assignedTo === 'specific') return (t.assignedIds || []).indexOf(currentUser.id) !== -1;
          return t.assignedTo === 'all';
        });
        var pendingCount = subTasks.filter(function(t) { return !taskSubmissions[(t.id + '-' + currentUser.id)]; }).length;
        var gradesList = Object.keys(gradeData).filter(function(k) {
          return k.split('-')[0] == currentUser.id;
        }).map(function(k) { return gradeData[k]; });

        var avg = gradesList.length ? Math.round(gradesList.reduce(function(a, b) { return a + b; }, 0) / gradesList.length) : 0;

        var html = '';
        html += '<div class="hero">' +
          '<div><p class="eyebrow">' + new Date().toLocaleDateString() + '</p><h2>' + tr('Good morning') + ', ' +
          escapeHtml(currentUser.name.split(' ')[0]) + ' 👋</h2><p class="hero-sub">' +
          tr('Here is everything you need to stay on track today.|student') +
          '</p></div>' +
          '<button class="primary-button" data-page="timetable">' + tr('View timetable') + '</button></div>';
        html += renderOverallProgressBar();
        html += '<div class="stats">' +
          statCard(tr('Lessons today'), todays.length, tr('View timetable'), '▦') +
          statCard(tr('Pending work'), pendingCount, tr('Due soon'), '✓') +
          statCard(tr('Average grade'), (avg ? avg + '%' : '—'), tr('This month'), '★') +
          statCard(tr('Course progress'), progressPercent(currentUser.id) + '%', tr('Across all courses'), '↗') +
          '</div>';
        html += '<div class="dashboard-grid">' +
          '<div class="stack">' +
          panel(tr('Today\'s timetable'), renderDashboardMeetings()) +
          panel(tr('Upcoming assignments'), renderDashboardTasks()) +
          '</div>' +
          '<div class="stack">' +
          panel(tr('Your progress'), renderDashboardProgress()) +
          panel(tr('Latest updates'), renderDashboardAnnouncements()) +
          '</div>' +
          '</div>';
        return html;
      }

      function statCard(label, value, note, icon) {
        return '<article class="stat-card"><div class="stat-head"><span>' + label + '</span><span>' + icon +
          '</span></div><div class="stat-number">' + value + '</div><div class="stat-note">' + note + '</div></article>';
      }

      function panel(title, body) {
        return '<article class="panel"><div class="panel-title"><h3>' + title + '</h3></div>' + body + '</article>';
      }

      function renderDashboardMeetings() {
        var today = new Date().toISOString().split('T')[0];
        var upcoming = meetings.filter(function(m) { return m.date >= today; }).sort(function(a, b) {
          return (a.date + a.time).localeCompare(b.date + b.time);
        }).slice(0, 3);
        if (!upcoming.length) return '<p style="color:var(--muted);padding:14px 0;">' + tr(
          'No lessons scheduled for today.') + '</p>';
        var html = '';
        upcoming.forEach(function(m) {
          var teacher = getTeacherName(m.teacherId);
          var link = currentUser && currentUser.role === 'Student' ? '' :
            '<button class="link-button" onclick="openMeetingRoom(\'' + m.title.replace(/['\\]/g, '') + '\', ' + m.id +
            ')">' + tr('Join') + '</button>';
          html += '<div class="lesson-row"><span class="time">' + m.time + '</span><span class="color-bar"></span>' +
            '<div class="row-main"><strong>' + m.title + '</strong><span>' + teacher + ' · ' + m.duration + ' min</span></div>' +
            (link ? link : '') + '</div>';
        });
        return html;
      }

      function renderDashboardTasks() {
        var pending = tasks.slice().sort(function(a, b) {
          return new Date(a.deadline) - new Date(b.deadline);
        }).slice(0, 3);
        if (!pending.length) return '<p style="color:var(--muted);padding:14px 0;">' + tr('No upcoming assignments.') +
          '</p>';
        var html = '';
        pending.forEach(function(t) {
          var overdue = new Date(t.deadline) < new Date();
          var pill = overdue ? '<span class="pill danger">' + tr('Overdue!') + '</span>' :
            '<span class="pill warning">' + tr('Due soon') + '</span>';
          var icons = { homework: '✎', test: '✓', assignment: '📝' };
          html += '<div class="simple-row"><span class="round-icon">' + (icons[t.type] || '✎') +
            '</span><div class="row-main"><strong>' + t.title + '</strong><span>' + tr('Due') + ' ' + new Date(t.deadline)
            .toLocaleDateString() + '</span></div>' + pill + '</div>';
        });
        return html;
      }

      function renderDashboardProgress() {
        var enrolled = getEnrolledCourseIds(currentUser.id);
        if (!enrolled.length) return '<p style="color:var(--muted);padding:14px 0;">' + tr('No courses yet.') + '</p>';
        var html = '';
        enrolled.slice(0, 3).forEach(function(courseId) {
          var pct = courseProgress(courseId, currentUser.id);
          html += '<div class="progress-item"><div class="progress-top"><span>' + escapeHtml(getCourseName(courseId)) +
            '</span><span class="' + progressColorClass(pct) + '">' + pct + '%</span></div>' +
            '<div class="track ' + progressColorClass(pct) + '"><div class="fill" style="width:' + Math.max(pct, 2) +
            '%"></div></div></div>';
        });
        return html;
      }

      function renderDashboardAnnouncements() {
        if (!announcements.length) return '<p style="color:var(--muted);padding:14px 0;">' + tr('No announcements.') +
          '</p>';
        var html = '';
        announcements.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 2).forEach(
          function(a) {
            html += '<div class="simple-row" style="cursor:pointer;" onclick="openAnnouncementDetail(' + a.id +
              ')"><span class="round-icon">📌</span><div class="row-main"><strong>' + a.title +
              '</strong><span>' + announcementSnippet(a, 90) + '</span></div></div>';
          });
        return html;
      }

      function progressPercent(studentId) {
        var enrolled = getEnrolledCourseIds(studentId);
        if (!enrolled.length) return 0;
        var sum = 0;
        enrolled.forEach(function(courseId) { sum += courseProgress(courseId, studentId); });
        return Math.round(sum / enrolled.length);
      }

      function progressColorClass(pct) {
        if (pct >= 75) return 'progress-good';
        if (pct >= 40) return 'progress-mid';
        if (pct > 0) return 'progress-low';
        return 'progress-none';
      }

      function courseProgress(courseId, studentId) {
        var relevant = tasks.filter(function(t) {
          if (t.assignedTo === 'course') return t.assignedIds && t.assignedIds.indexOf(courseId) !== -1;
          if (t.assignedTo === 'student') return t.assignedIds && t.assignedIds.indexOf(studentId) !== -1;
          if (t.assignedTo === 'all') return !t.teacherId;
          return false;
        });
        var taskIds = relevant.map(function(t) { return t.id; });
        var subKeys = Object.keys(taskSubmissions).filter(function(k) {
          var parts = k.split('-');
          if (String(parts[1]) !== String(studentId)) return false;
          return taskIds.indexOf(parseInt(parts[0])) !== -1;
        });
        if (!subKeys.length) return 0;
        var graded = subKeys.filter(function(k) { return taskSubmissions[k].grade !== null && taskSubmissions[k].grade !==
            undefined; });
        var base = Math.round((graded.length / Math.max(subKeys.length, 1)) * 100);
        var avgGrade = 0;
        graded.forEach(function(k) { avgGrade += taskSubmissions[k].grade; });
        var viaGrade = graded.length ? Math.round(avgGrade / graded.length) : 50;
        return Math.max(base, Math.min(100, viaGrade));
      }

      // ============================================================
      //  TIMETABLE (data-driven)
      // ============================================================
      var timetableCursor = null;

      function timetableMonthStart() {
        if (timetableCursor) return new Date(timetableCursor.getFullYear(), timetableCursor.getMonth(), 1);
        var n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
      }

      function timetableVisibleMeetings() {
        return meetings.filter(function(m) {
          if (m.visibleToTeachers === true) return currentUser && currentUser.role !== 'Student';
          return m.visibleToStudents !== false;
        });
      }

      function renderTimetable() {
        var container = document.getElementById('timetable-content');
        if (!container || !currentUser) return;
        var monthStart = timetableMonthStart();
        var year = monthStart.getFullYear();
        var month = monthStart.getMonth();

        var byDate = {};
        timetableVisibleMeetings().forEach(function(m) {
          (byDate[m.date] = byDate[m.date] || []).push(m);
        });
        Object.keys(byDate).forEach(function(d) {
          byDate[d].sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
        });

        var firstDow = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var todayKey = new Date().toISOString().slice(0, 10);
        var monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

        var html = '<div class="cal-head">' +
          '<button class="cal-nav" id="timetable-prev" title="' + tr('Previous month') + '">‹</button>' +
          '<h3 class="cal-month">' + escapeHtml(monthLabel) + '</h3>' +
          '<button class="cal-nav" id="timetable-next" title="' + tr('Next month') + '">›</button>' +
          '<button class="cal-nav cal-today" id="timetable-today">' + tr('Today') + '</button>' +
          '</div><div class="cal-grid">';

        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function(d) {
          html += '<div class="cal-dow">' + tr(d + '|calendar') + '</div>';
        });

        for (var i = 0; i < firstDow; i++) html += '<div class="cal-cell cal-out"></div>';

        for (var day = 1; day <= daysInMonth; day++) {
          var key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          var list = byDate[key] || [];
          var isToday = key === todayKey;
          html += '<div class="cal-cell' + (isToday ? ' cal-today-cell' : '') + (list.length ? ' cal-has' : '') + '">' +
            '<span class="cal-date">' + day + '</span><div class="cal-events">';
          list.slice(0, 3).forEach(function(m) {
            html += '<button class="cal-event" data-meeting="' + m.id + '" title="' +
              escapeHtml(m.time + ' · ' + m.title) + '"><span class="cal-event-time">' + escapeHtml(m.time || '') +
              '</span><span class="cal-event-name">' + escapeHtml(m.title) + '</span></button>';
          });
          if (list.length > 3) {
            html += '<span class="cal-more">+' + (list.length - 3) + '</span>';
          }
          html += '</div></div>';
        }

        var trailing = (7 - ((firstDow + daysInMonth) % 7)) % 7;
        for (var t = 0; t < trailing; t++) html += '<div class="cal-cell cal-out"></div>';
        html += '</div>';

        var upcoming = timetableVisibleMeetings().filter(function(m) { return m.date >= todayKey; })
          .sort(function(a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).slice(0, 6);
        html += '<div class="cal-upcoming"><h4>' + tr('Upcoming lessons') + '</h4>';
        if (!upcoming.length) {
          html += '<p style="color:var(--muted);padding:10px 0;">' + tr('No lessons scheduled this week.') + '</p>';
        } else {
          upcoming.forEach(function(m) {
            html += '<div class="lesson-row"><span class="time">' + escapeHtml(m.time) + '</span>' +
              '<span class="color-bar"></span><div class="row-main"><strong>' + escapeHtml(m.title) +
              '</strong><span>' + new Date(m.date).toLocaleDateString() + ' · ' + escapeHtml(getTeacherName(m.teacherId)) +
              ' · ' + m.duration + ' min</span></div></div>';
          });
        }
        html += '</div>';

        container.innerHTML = html;

        var prev = document.getElementById('timetable-prev');
        var next = document.getElementById('timetable-next');
        var todayBtn = document.getElementById('timetable-today');
        if (prev) prev.addEventListener('click', function() {
          timetableCursor = new Date(year, month - 1, 1);
          renderTimetable();
        });
        if (next) next.addEventListener('click', function() {
          timetableCursor = new Date(year, month + 1, 1);
          renderTimetable();
        });
        if (todayBtn) todayBtn.addEventListener('click', function() {
          timetableCursor = null;
          renderTimetable();
        });
        Array.prototype.forEach.call(container.querySelectorAll('.cal-event'), function(btn) {
          btn.addEventListener('click', function() {
            var mid = parseInt(btn.dataset.meeting);
            var m = meetings.find(function(x) { return x.id === mid; });
            openMeetingRoom(m ? m.title : '', mid);
          });
        });
        setLanguage(currentLang);
      }

      // ============================================================
      //  DEVELOPER FEEDBACK (admin) + OVERALL PROGRESS (student)
      // ============================================================
      function getDeveloperFeedback() {
        try { return JSON.parse(localStorage.getItem('nokj-dev-feedback')) || []; } catch (e) { return []; }
      }

      function saveDeveloperFeedback(list) {
        localStorage.setItem('nokj-dev-feedback', JSON.stringify(list));
      }

      function getGithubToken() {
        return localStorage.getItem('nokj-github-token') || '';
      }

      function saveGithubToken(token) {
        localStorage.setItem('nokj-github-token', token);
      }

      function renderDeveloperFeedback() {
        var flags = (window.nokjGithubIssues || []).length;
        return '<div class="feedback-wrap">' +
          '<p style="color:var(--muted);margin:0 0 12px;">' + tr('Collect feedback for the developers. Local notes can also be posted straight to the NOKJ GitHub repository.') + '</p>' +
          '<div class="feedback-compose"><input id="feedback-input" placeholder="' + tr('Write your feedback or request a feature...') + '" />' +
          '<button class="primary-button" id="feedback-submit">' + tr('Post') + '</button></div>' +
          '<div class="feedback-tools"><button class="secondary-button" id="feedback-refresh">⟳ ' + tr('Refresh GitHub') + '</button>' +
          '<input class="github-token-input" id="github-token-input" type="password" placeholder="' + tr('GitHub token (optional)') + '" value="' + escapeHtml(getGithubToken()) + '" />' +
          '<span class="feedback-status" id="feedback-status"></span></div>' +
          '<div class="feedback-list" id="feedback-list"></div>' +
          '</div>';
      }

      function updateFeedbackList() {
        var wrap = document.getElementById('feedback-list');
        if (!wrap) return;
        var local = getDeveloperFeedback();
        var gh = window.nokjGithubIssues || [];
        var html = '';
        local.forEach(function(it) {
          html += '<div class="feedback-item"><div class="row-main"><strong>' + escapeHtml(it.title) +
            '</strong><span>' + tr('Local note') + ' · ' + escapeHtml(it.date) + '</span></div>' +
            '<span class="pill">' + tr('Local') + '</span>' +
            '<button class="action-btn delete feedback-delete" data-id="' + encodeURIComponent(it.id) + '" title="' + tr('Delete') + '">✕</button></div>';
        });
        gh.forEach(function(issue) {
          var labels = (issue.labels || []).map(function(l) { return '#' + escapeHtml(l.name); }).join(' ');
          html += '<div class="feedback-item"><div class="row-main"><strong><a href="' + escapeHtml(issue.html_url) +
            '" target="_blank" rel="noopener">' + escapeHtml(issue.title) + '</a></strong><span>GitHub Issue #' +
            escapeHtml(String(issue.number)) + (labels ? ' · ' + labels : '') + '</span></div>' +
            '<span class="pill warning">' + tr('GitHub') + '</span></div>';
        });
        if (!html) html = '<p style="color:var(--muted);padding:14px 0;">' + tr('No feedback or open GitHub issues yet.') + '</p>';
        wrap.innerHTML = html;
        setLanguage(currentLang);
      }

      function fetchGithubIssues(force) {
        if (!force && window.nokjGithubFetched) { updateFeedbackList(); return; }
        var status = document.getElementById('feedback-status');
        if (status) status.textContent = tr('Fetching GitHub issues...');
        fetch('https://api.github.com/repos/youssefhassanecoten-tech/NOKJ-academy/issues?state=open&per_page=10&sort=updated')
          .then(function(res) {
            if (!res.ok) throw new Error(String(res.status));
            return res.json();
          })
          .then(function(issues) {
            if (!Array.isArray(issues)) throw new Error('bad-response');
            window.nokjGithubIssues = issues;
            window.nokjGithubFetched = true;
            updateFeedbackList();
          })
          .catch(function() {
            window.nokjGithubFetched = true;
            updateFeedbackList();
            var s = document.getElementById('feedback-status');
            if (s) s.textContent = tr('Could not load GitHub issues. Check your connection.');
          });
      }

      function addDeveloperFeedback() {
        var input = document.getElementById('feedback-input');
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;
        var list = getDeveloperFeedback();
        list.unshift({ id: String(Date.now()) + '-' + Math.random().toString(36).substr(2, 6), title: text, date: new Date().toLocaleDateString() });
        saveDeveloperFeedback(list);
        input.value = '';
        postToGithub(text);
        updateFeedbackList();
      }

      function deleteDeveloperFeedback(id) {
        var list = getDeveloperFeedback().filter(function(it) { return String(it.id) !== String(id); });
        saveDeveloperFeedback(list);
        updateFeedbackList();
      }

      function postToGithub(title) {
        var token = getGithubToken();
        var statusEl = document.getElementById('feedback-status');
        if (!token) return;
        if (statusEl) statusEl.textContent = tr('Posting to GitHub...');
        fetch('https://api.github.com/repos/youssefhassanecoten-tech/NOKJ-academy/issues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ title: title, body: 'Created from the NOKJ Academy admin dashboard.' })
          })
          .then(function(res) { return res.json().catch(function() { return {}; }).then(function(data) { return { ok: res.ok, data: data }; }); })
          .then(function(out) {
            if (out.ok) {
              if (statusEl) statusEl.textContent = tr('Posted to GitHub as issue #') + (out.data.number || '') + '.';
              fetchGithubIssues(true);
            } else {
              if (statusEl) statusEl.textContent = tr('GitHub posting failed. Check your token.') + (out.data && out.data.message ? ' — ' + out.data.message : '');
            }
          });
      }

      // ----- Overall student progress -----
      function studentTotalProgress(studentId) {
        var enrolled = getEnrolledCourseIds(studentId);
        var courseSum = 0;
        enrolled.forEach(function(courseId) { courseSum += courseProgress(courseId, studentId); });
        var coursePct = enrolled.length ? courseSum / enrolled.length : 0;

        var assigned = 0;
        tasks.forEach(function(t) {
          if (t.assignedTo === 'all' || (t.assignedTo === 'specific' && (t.assignedIds || []).indexOf(studentId) !== -1)) assigned++;
        });
        var subCount = Object.keys(taskSubmissions).filter(function(k) { return k.split('-')[1] == studentId; }).length;
        var taskPct = assigned ? (subCount / assigned) * 100 : 0;

        var enrolledSet = {};
        enrolled.forEach(function(c) { enrolledSet[c] = 1; });
        var eligibleTests = tests.filter(function(x) { return enrolledSet[x.courseId]; });
        var attempted = eligibleTests.filter(function(x) { return testSubmissions[x.id + '-' + studentId]; }).length;
        var testPct = eligibleTests.length ? (attempted / eligibleTests.length) * 100 : 0;

        var gradesList = Object.keys(gradeData).filter(function(k) { return k.split('-')[0] == studentId; }).map(function(k) { return gradeData[k]; });
        var avg = gradesList.length ? gradesList.reduce(function(a, b) { return a + b; }, 0) / gradesList.length : 0;
        var bonus = 0;
        if (avg >= 90) bonus += 5;
        if (avg >= 95) bonus += 5;
        if (eligibleTests.length && attempted >= eligibleTests.length) bonus += 5;
        if (assigned && subCount >= assigned) bonus += 5;

        return Math.min(120, Math.round(coursePct * 0.45 + taskPct * 0.35 + testPct * 0.2) + bonus);
      }

      function renderOverallProgressBar() {
        var total = studentTotalProgress(currentUser.id);
        var state = total > 100 ? 'over' : total >= 75 ? 'high' : total >= 25 ? 'mid' : 'low';
        var fillWidth = Math.min(100, total);
        var great = total > 100 ? '<span class="progress-great">★ ' + tr('You are doing great!') + '</span>' : '';
        return '<div class="overall-progress" id="overall-progress">' +
          '<button class="progress-bar-toggle" aria-expanded="false">' +
          '<span class="overall-progress-labels"><span>' + tr('Overall progress') + '</span>' +
          '<strong id="overall-progress-pct">' + total + '%</strong></span>' +
          '<span class="progress-track overall state-' + state + '"><span class="progress-fill" style="width:' + fillWidth + '%"></span>' + great + '</span>' +
          '</button>' +
          '<div class="progress-tips" id="progress-tips">' +
          '<button data-page="tasks">📝 ' + tr('Complete your pending tasks') + '</button>' +
          '<button data-page="tasks">💬 ' + tr('Ask your teacher for extra tasks') + '</button>' +
          '<button data-page="tests">🧪 ' + tr('Finish your scheduled tests') + '</button>' +
          '<button data-page="tests">⭐ ' + tr('Take optional tests for bonus points') + '</button>' +
          '<button data-page="courses">📚 ' + tr('Review your course material') + '</button>' +
          '</div>' +
          '</div>';
      }

      function toggleProgressTips() {
        var tips = document.getElementById('progress-tips');
        var bar = document.querySelector('#overall-progress .progress-bar-toggle');
        if (!tips) return;
        var open = tips.classList.toggle('open');
        if (bar) bar.setAttribute('aria-expanded', open ? 'true' : 'false');
      }