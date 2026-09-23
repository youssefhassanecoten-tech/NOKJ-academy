      function renderCourses() {
        var search = document.getElementById('course-search').value.toLowerCase();
        var filtered = courses.filter(function(c) { return c.name.toLowerCase().includes(search); });
        filtered.sort(function(a, b) { return a.name.localeCompare(b.name); });
        document.getElementById('course-table-body').innerHTML = '';
        filtered.forEach(function(c) {
          var studentCount = getCourseStudentCount(c.id);
          var isExpanded = expandedRows['course-' + c.id] || false;
          var icon = isExpanded ? '▼' : '▶';
          var tr = document.createElement('tr');
          tr.className = 'expandable-row';
          tr.dataset.expandId = 'course-' + c.id;
          tr.innerHTML = '<td style="cursor:pointer;"><span class="expand-icon' + (isExpanded ? ' open' : '') + '">' + icon +
            '</span> <strong>' + c.name + '</strong><br><span style="font-size:12px;color:var(--muted);">' + c.description +
            '</span></td><td>' + getTeacherName(c.teacherId) + '</td><td>' + studentCount +
            ' students</td><td><button class="action-btn edit" data-id="' + c.id +
            '" data-type="course">✏️</button><button class="action-btn delete" data-id="' + c.id +
            '" data-type="course">🗑️</button></td>';
          document.getElementById('course-table-body').appendChild(tr);
          var detailTr = document.createElement('tr');
          detailTr.className = 'expandable-detail' + (isExpanded ? ' open' : '');
          detailTr.dataset.parentId = 'course-' + c.id;
          var studentIds = getEnrolledStudentIds(c.id);
          var detailHtml = '<div class="detail-content"><strong>Enrolled Students:</strong> ';
          if (studentIds.length === 0) detailHtml += '<span class="empty-msg">No students enrolled.</span>';
          else {
            studentIds.forEach(function(sid) {
              var s = students.find(function(st) { return st.id === sid; });
              if (s) detailHtml += '<span class="item-tag">👤 ' + s.name + ' <span class="status-badge ' + s.status
                .toLowerCase() + '">' + s.status + '</span></span>';
            });
          }
          detailHtml += '</div>';
          detailTr.innerHTML = '<td colspan="4">' + detailHtml + '</td>';
          document.getElementById('course-table-body').appendChild(detailTr);
        });
        document.getElementById('course-count').textContent = filtered.length + ' courses';
        document.getElementById('course-total').textContent = courses.length;
        document.getElementById('course-enrollments-total').textContent = enrollments.length;
        updateAdminStats();
        setLanguage(currentLang);
      }
      function renderStudentCourses() {
        if (!currentUser || currentUser.role !== 'Student') return;
        var studentId = currentUser.id;
        var enrolledIds = getEnrolledCourseIds(studentId);
        var enrolledCourses = courses.filter(function(c) { return enrolledIds.includes(c.id); });
        if (enrolledCourses.length === 0) {
          document.getElementById('student-courses-container').innerHTML =
            '<p style="color:var(--muted);">You are not enrolled in any courses yet.</p>';
          return;
        }
        var html = '<div class="course-grid">';
        enrolledCourses.forEach(function(c) {
          var colors = ['', 'orange-cover', 'green-cover'];
          var colorClass = colors[c.id % 3];
          var progress = Math.floor(Math.random() * 30) + 60;
          html += '<article class="course"><div class="course-cover ' + colorClass + '">' + c.name +
            '</div><div class="course-body"><h3>' + c.name + '</h3><p>Teacher: ' + getTeacherName(c.teacherId) +
            '</p><div class="track"><div class="fill" style="width:' + progress +
            '%"></div></div><div class="course-footer"><span>' + progress +
            '% complete</span><button class="link-button">Open course</button></div></div></article>';
        });
        html += '</div>';
        document.getElementById('student-courses-container').innerHTML = html;
        setLanguage(currentLang);
      }
