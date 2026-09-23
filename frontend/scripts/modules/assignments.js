// ============================================================
      //  ASSIGNMENTS (student-facing list of tasks)
      // ============================================================
      function renderAssignments() {
        var list = document.getElementById('assignment-list');
        if (!list) return;
        if (!currentUser) {
          list.innerHTML = '';
          return;
        }

        var assigned = tasks.filter(function(t) {
          if (currentUser.role === 'Admin') return true;
          if (currentUser.role === 'Teacher') return true;
          var enrolledCourseIds = getEnrolledCourseIds(currentUser.id);
          if (t.courseId && enrolledCourseIds.indexOf(t.courseId) === -1) return t.assignedTo === 'all';
          if (t.assignedTo === 'specific') return (t.assignedIds || []).indexOf(currentUser.id) !== -1;
          return t.assignedTo === 'all';
        });

        if (!assigned.length) {
          list.innerHTML = '<p style="color:var(--muted);padding:24px 0;text-align:center;">No tasks assigned to you yet.</p>';
          setLanguage(currentLang);
          return;
        }

        var html = '';
        assigned.sort(function(a, b) { return new Date(a.deadline) - new Date(b.deadline); }).forEach(function(t) {
          var sub = taskSubmissions[(t.id + '-' + (currentUser.id || 1))];
          var status = 'not-started';
          if (sub && sub.grade !== null && sub.grade !== undefined) status = 'graded';
          else if (sub) status = 'submitted';

          var pillClass = 'pill';
          var pillText = tr('Not started');
          if (status === 'graded') { pillClass = 'pill'; pillText = tr('Graded'); }
          else if (status === 'submitted') { pillClass = 'pill warning'; pillText = tr('In progress'); }
          else if (new Date(t.deadline) < new Date()) { pillClass = 'pill danger'; pillText = tr('Overdue!'); }

          var icons = { homework: '✎', test: '✓', assignment: '📝' };
          var typeName = t.type === 'homework' ? tr('Homework') : (t.type === 'test' ? tr('Test') : tr('Assignment'));

          var manageLine = '';
          if (currentUser.role === 'Admin' || currentUser.role === 'Teacher') {
            var subs = Object.keys(taskSubmissions).filter(function(k) {
              return k.indexOf(t.id + '-') === 0;
            }).length;
            manageLine = '<span>' + tr('Submissions') + ': ' + subs + '</span>';
          }

          html += '<article class="assignment-card"><span class="round-icon ' + (t.type === 'homework' ? 'yellow' :
              (t.type === 'test' ? 'blue' : '')) + '">' + (icons[t.type] || '✎') + '</span>' +
            '<div class="row-main"><h3>' + escapeHtml(t.title) + '</h3><p>' + typeName + ' · ' + tr('Due') + ' ' +
            new Date(t.deadline).toLocaleDateString() + (manageLine ? ' · ' + manageLine : '') + '</p></div>' +
            '<span class="' + pillClass + '">' + pillText + '</span>' +
            '<button class="secondary-button assignment-button" data-page="tasks">' + tr('Open assignment') +
            '</button></article>';
        });
        list.innerHTML = html;
        setLanguage(currentLang);
      }