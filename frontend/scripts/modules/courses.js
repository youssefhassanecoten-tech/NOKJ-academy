      function renderCourses() {
        var search = document.getElementById('course-search').value.toLowerCase();
        var filtered = courses.filter(function(c) { return c.name.toLowerCase().includes(search); });
        filtered.sort(function(a, b) { return a.name.localeCompare(b.name); });
        document.getElementById('course-table-body').innerHTML = '';
        filtered.forEach(function(c) {
          var studentCount = getCourseStudentCount(c.id);
          var isExpanded = expandedRows['course-' + c.id] || false;
          var icon = isExpanded ? '▼' : '▶';
          var row = document.createElement('tr');
          row.className = 'expandable-row';
          row.dataset.expandId = 'course-' + c.id;
          row.innerHTML = '<td style="cursor:pointer;"><span class="expand-icon' + (isExpanded ? ' open' : '') + '">' + icon +
            '</span> <strong>' + c.name + '</strong><br><span style="font-size:12px;color:var(--muted);">' + c.description +
            '</span></td><td>' + getTeacherName(c.teacherId) + '</td><td>' + studentCount +
            ' ' + tr('students') + '</td><td><button class="action-btn edit" data-id="' + c.id +
            '" data-type="course">✏️</button><button class="action-btn delete" data-id="' + c.id +
            '" data-type="course">🗑️</button></td>';
          document.getElementById('course-table-body').appendChild(row);
          var detailTr = document.createElement('tr');
          detailTr.className = 'expandable-detail' + (isExpanded ? ' open' : '');
          detailTr.dataset.parentId = 'course-' + c.id;
          var studentIds = getEnrolledStudentIds(c.id);
          var detailHtml = '<div class="detail-content"><strong>' + tr('Enrolled Students:') + '</strong> ';
          if (studentIds.length === 0) detailHtml += '<span class="empty-msg">' + tr('No students enrolled.') + '</span>';
          else {
            studentIds.forEach(function(sid) {
              var s = students.find(function(st) { return st.id === sid; });
              if (s) detailHtml += '<span class="item-tag">👤 ' + s.name + ' <span class="status-badge ' + s.status
                .toLowerCase() + '">' + tr(s.status) + '</span></span>';
            });
          }
          detailHtml += '</div>';
          detailTr.innerHTML = '<td colspan="4">' + detailHtml + '</td>';
          document.getElementById('course-table-body').appendChild(detailTr);
        });
        document.getElementById('course-count').textContent = filtered.length + ' ' + tr('courses');
        document.getElementById('course-total').textContent = courses.length;
        document.getElementById('course-enrollments-total').textContent = enrollments.length;
        updateAdminStats();
        setLanguage(currentLang);
      }
      function renderStudentCourses() {
        if (!currentUser || currentUser.role !== 'Student') return;
        var container = document.getElementById('student-courses-container');
        var studentId = currentUser.id;
        var enrolledIds = getEnrolledCourseIds(studentId);
        var enrolledCourses = courses.filter(function(c) { return enrolledIds.includes(c.id); });
        var blocked = currentUser.status !== 'Active';
        var pendingCourseIds = enrollRequests.filter(function(r) {
          return r.studentId === studentId && r.status === 'pending';
        }).map(function(r) { return r.courseId; });
        var available = courses.filter(function(c) { return enrolledIds.indexOf(c.id) === -1; });

        var html = '';
        if (enrolledCourses.length === 0) {
          html += '<p style="color:var(--muted);">' + tr('You are not enrolled in any courses yet.') + '</p>';
        } else {
          html += '<div class="course-grid">';
          enrolledCourses.forEach(function(c) {
            var colors = ['', 'orange-cover', 'green-cover'];
            var colorClass = colors[c.id % 3];
            var progress = courseProgress(c.id, studentId);
            html += '<article class="course"><div class="course-cover ' + colorClass + '">' + c.name +
              '</div><div class="course-body"><h3>' + c.name + '</h3><p>' + tr('Teacher:') + ' ' + getTeacherName(c.teacherId) +
              '</p><div class="track"><div class="fill" style="width:' + progress +
              '%"></div></div><div class="course-footer"><span>' + progress +
              '% ' + tr('complete') + '</span><button class="link-button">' + tr('Open course') +
              '</button></div></div></article>';
          });
          html += '</div>';
        }

        if (available.length) {
          html += '<h3 style="margin-top:30px;">' + tr('Available for enrollment') + '</h3>';
          if (blocked) {
            html += '<p style="color:var(--danger);background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;">' +
              tr('Enrollment is blocked while your account has a Warning or Inactive status.') + '</p>';
          }
          html += '<div class="course-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));">';
          available.forEach(function(c) {
            html += '<article class="course"><div class="course-cover">' + c.name +
              '</div><div class="course-body"><h3>' + c.name + '</h3><p>' + tr('Teacher:') + ' ' + getTeacherName(c.teacherId) +
              '</p><div class="course-footer" style="justify-content:flex-start;">';
            if (blocked) {
              html += '<span class="pill danger">' + tr('Enrollment blocked') + '</span>';
            } else if (pendingCourseIds.indexOf(c.id) !== -1) {
              html += '<span class="pill warning">' + tr('Application pending') + '</span>';
            } else {
              html += '<button class="apply-course-btn secondary-button" data-course="' + c.id + '">' + tr('Apply') +
                '</button>';
            }
            html += '</div></div></article>';
          });
          html += '</div>';
        }

        container.innerHTML = html;
        setCoursesHeading();
        setLanguage(currentLang);
      }

      function applyCourse(courseId) {
        if (!currentUser || currentUser.role !== 'Student') return;
        if (currentUser.status !== 'Active') {
          alert(tr('You cannot apply while your account has a Warning or Inactive status.'));
          return;
        }
        if (getEnrolledCourseIds(currentUser.id).indexOf(courseId) !== -1) return;
        if (enrollRequests.some(function(r) { return r.studentId === currentUser.id && r.courseId === courseId; })) return;
        enrollRequests.push({ id: Date.now(), studentId: currentUser.id, courseId: courseId, status: 'pending',
          date: new Date().toISOString() });
        saveData();
        renderStudentCourses();
        setLanguage(currentLang);
      }

      // ============================================================
      //  TEACHER COURSES (suggest / edit / remove, admin-approval)
      // ============================================================
      function renderTeacherCourses() {
        if (!currentUser || currentUser.role !== 'Teacher') return;
        var container = document.getElementById('student-courses-container');
        if (!container) return;
        var teacherId = currentUser.id;
        var mine = courses.filter(function(c) { return c.teacherId === teacherId; });
        var pending = courseRequests.filter(function(r) { return r.teacherId === teacherId && r.status === 'pending'; });

        var html = '<div class="teacher-courses-toolbar">' +
          '<button class="primary-button" onclick="openModal(\'courseRequest\', \'add\')">➕ ' + tr('Suggest a new course') + '</button>' +
          '<span class="pill">' + pending.length + ' ' + tr('pending') + '</span>' +
          '</div>';

        if (!mine.length && !pending.length) {
          html += '<p style="color:var(--muted);">' + tr('You have no courses yet. Suggest a new course or ask an admin to assign one — it appears for students once approved.') + '</p>';
        }

        html += '<div class="course-grid">';
        mine.forEach(function(c) {
          var studentCount = getEnrolledStudentIds(c.id).length;
          var editReq = pending.find(function(r) { return r.courseId === c.id && r.type === 'edit'; });
          var delReq = pending.find(function(r) { return r.courseId === c.id && r.type === 'delete'; });
          var pill = editReq ? '<span class="pill warning">' + tr('Edit pending') + '</span>' :
            (delReq ? '<span class="pill warning">' + tr('Delete pending') + '</span>' :
            '<span class="pill">' + tr('Active') + '</span>');
          html += '<article class="course"><div class="course-cover">' + c.name +
            '</div><div class="course-body"><h3>' + c.name + '</h3><p>' + escapeHtml(c.description || '') +
            '</p><p>' + studentCount + ' ' + tr('students') + '</p>' +
            '<div class="course-footer" style="flex-wrap:wrap;">' + pill +
            '<button class="secondary-button" onclick="openModal(\'courseRequest\', \'edit\', {id:' + c.id + '})">✏️ ' + tr('Edit description') + '</button>' +
            '<button class="action-btn delete" onclick="suggestCourseDelete(' + c.id + ')" title="' + tr('Suggest removal') + '">🗑️</button>' +
            '</div></div></article>';
        });
        pending.forEach(function(r) {
          if (r.type === 'create') {
            html += '<article class="course"><div class="course-cover pending-cover">' + escapeHtml(r.name) +
              '</div><div class="course-body"><h3>' + escapeHtml(r.name) + '</h3><p>' + escapeHtml(r.description || '') +
              '</p><div class="course-footer"><span class="pill warning">' + tr('Awaiting admin approval') + '</span>' +
              '<button class="action-btn delete" onclick="cancelCourseRequest(' + r.id + ')" title="' + tr('Cancel') + '">✕</button>' +
              '</div></div></article>';
          }
        });
        html += '</div>';

        container.innerHTML = html;
        setCoursesHeading();
        setLanguage(currentLang);
      }

      function setCoursesHeading() {
        var sub = document.getElementById('courses-sub');
        if (!sub || !currentUser) return;
        sub.textContent = tr('Continue learning and track your progress in every course.');
      }

      function suggestCourseDelete(courseId) {
        if (!currentUser || currentUser.role !== 'Teacher') return;
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c || c.teacherId !== currentUser.id) return;
        if (courseRequests.some(function(r) { return r.type === 'delete' && r.courseId === courseId && r.status === 'pending'; })) {
          alert(tr('A removal request for this course is already pending.'));
          return;
        }
        if (confirm(tr('Suggest removing this course? Students lose access only after an admin approves.'))) {
          courseRequests.push({ id: Date.now(), type: 'delete', status: 'pending', teacherId: currentUser.id, courseId: courseId,
            name: c.name, date: new Date().toISOString() });
          saveData();
          renderTeacherCourses();
          renderCourseRequests();
        }
      }

      function cancelCourseRequest(reqId) {
        if (!currentUser || currentUser.role !== 'Teacher') return;
        courseRequests = courseRequests.filter(function(r) { return r.id !== reqId; });
        saveData();
        renderTeacherCourses();
        renderCourseRequests();
        setLanguage(currentLang);
      }
