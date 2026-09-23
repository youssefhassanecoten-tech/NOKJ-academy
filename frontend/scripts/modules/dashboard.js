function updateAdminStats() {
        if (!currentUser || currentUser.role !== 'Admin') return;
        totalStudentsEl.textContent = students.length;
        totalCoursesEl.textContent = courses.length;
        totalEnrollmentsEl.textContent = enrollments.length;
        var totalIncome = budgetEntries.filter(function(b) { return b.type === 'Income'; }).reduce(function(sum, b) { return sum +
            b.amount; }, 0);
        totalRevenueEl.textContent = '$' + totalIncome.toLocaleString();
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
          '</h2><p>' + tr('Here is everything you need to stay on track today.') + '</p></div>' +
          '<button class="primary-button" data-page="students">' + tr('Add student') + '</button>' +
          '</div>';
        html += '<div class="stats">' +
          statCard(tr('Total Students'), students.length, tr('Active this term'), '▦') +
          statCard(tr('Total Courses'), courses.length, tr('Across all courses'), '▣') +
          statCard(tr('Total Enrollments'), enrollments.length, tr('Active this term'), '✓') +
          statCard(tr('Revenue'), '$' + budgetEntries.filter(function(b) { return b.type === 'Income'; }).reduce(function(
              s, b) { return s + b.amount; }, 0).toLocaleString(), tr('This month'), '↗') +
          '</div>';
        html += '<div class="dashboard-grid">' +
          '<div class="stack">' +
          panel(tr('Quick actions'),
          '<div class="quick-actions">' +
          '<button class="primary-button" data-page="students">👥 ' + tr('Add student') + '</button>' +
          '<button class="primary-button" data-page="calendar">📅 ' + tr('Schedule class') + '</button>' +
          '<button class="primary-button" data-page="tasks">📝 ' + tr('Create task') + '</button>' +
          '<button class="primary-button" onclick="openModal(\'announcement\', \'add\')">📌 ' + tr('Create announcement') +
          '</button></div>') +
          panel(tr('Announcements'), renderDashboardAnnouncements()) +
          '</div>' +
          '<div class="stack">' +
          panel(tr('Lessons today'), renderDashboardMeetings()) +
          panel(tr('Upcoming assignments'), renderDashboardTasks()) +
          '</div>' +
          '</div>';
        return html;
      }

      function renderTeacherDashboard() {
        var myMeetings = meetings.filter(function(m) { return m.teacherId === currentUser.id; });
        var html = '';
        html += '<div class="hero">' +
          '<div><p class="eyebrow">' + new Date().toLocaleDateString() + '</p><h2>' + tr('Good day') + ' ' +
          currentUser.name.split(' ')[0] + ' 👋</h2><p>' + tr('Here is everything you need to stay on track today.') +
          '</p></div>' +
          '<button class="primary-button" data-page="calendar">' + tr('Schedule class') + '</button></div>';
        html += '<div class="stats">' +
          statCard(tr('Lessons today'), myMeetings.length, tr('View timetable'), '▦') +
          statCard(tr('Pending work'), tasks.filter(function(t) { return t.assignedTo === 'all'; }).length, tr(
            'Due soon'), '✓') +
          statCard(tr('Total Students'), students.length, tr('Active this term'), '👥') +
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
          return k.split('-')[1] == currentUser.id;
        }).map(function(k) { return gradeData[k]; });

        var avg = gradesList.length ? Math.round(gradesList.reduce(function(a, b) { return a + b; }, 0) / gradesList.length) : 0;

        var html = '';
        html += '<div class="hero">' +
          '<div><p class="eyebrow">' + new Date().toLocaleDateString() + '</p><h2>' + tr('Good morning') + ', ' +
          currentUser.name.split(' ')[0] + ' 👋</h2><p>' + tr('Here is everything you need to stay on track today.') +
          '</p></div>' +
          '<button class="primary-button" data-page="timetable">' + tr('View timetable') + '</button></div>';
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
          html += '<div class="progress-item"><div class="progress-top"><span>' + getCourseName(courseId) +
            '</span><span>' + pct + '%</span></div><div class="track"><div class="fill" style="width:' + pct +
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
            html += '<div class="simple-row"><span class="round-icon">📌</span><div class="row-main"><strong>' + a.title +
              '</strong><span>' + a.message + '</span></div></div>';
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

      function courseProgress(courseId, studentId) {
        var subKeys = Object.keys(taskSubmissions).filter(function(k) {
          var parts = k.split('-');
          return parts[1] == studentId;
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
      function renderTimetable() {
        var container = document.getElementById('timetable-content');
        if (!container || !currentUser) return;
        var today = new Date().toISOString().split('T')[0];
        var weekRows = meetings.filter(function(m) { return m.date >= today; }).sort(function(a, b) {
          return (a.date + a.time).localeCompare(b.date + b.time);
        }).slice(0, 7);

        if (!weekRows.length) {
          container.innerHTML = '<p style="color:var(--muted);padding:24px 0;">' + tr(
            'No lessons scheduled this week.') + '</p>';
          setLanguage(currentLang);
          return;
        }

        var html = '';
        weekRows.forEach(function(m) {
          var teacher = getTeacherName(m.teacherId);
          var link = currentUser && currentUser.role === 'Student' ? '' :
            '<button class="link-button" onclick="openMeetingRoom(\'' + m.title.replace(/['\\]/g, '') + '\', ' + m.id +
            ')">' + tr('Join') + '</button>';
          html += '<article class="panel" style="margin-bottom:14px;">' +
            '<div class="panel-title"><h3>' + new Date(m.date).toLocaleDateString() + ' · ' + m.time + '</h3>' + link +
            '</div>' +
            '<div class="lesson-row"><span class="time">' + m.time + '</span><span class="color-bar"></span>' +
            '<div class="row-main"><strong>' + m.title + '</strong><span>' + teacher + ' · ' + m.duration + ' min</span></div>' +
            '<span class="pill">' + tr('Next') + '</span></div></article>';
        });
        container.innerHTML = html;
        setLanguage(currentLang);
      }