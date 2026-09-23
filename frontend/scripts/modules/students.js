      // ============================================================
      //  RENDER FUNCTIONS
      // ============================================================
      function renderStudents() {
        var search = studentSearch.value.toLowerCase();
        var filter = studentFilter.value;
        var filtered = students.filter(function(s) {
          return (s.name.toLowerCase().includes(search) || s.email.toLowerCase().includes(search)) &&
            (filter === 'all' || s.status === filter);
        });
        filtered.sort(function(a, b) { return a.name.localeCompare(b.name); });
        studentTableBody.innerHTML = '';
        filtered.forEach(function(s) {
          var isExpanded = expandedRows['student-' + s.id] || false;
          var icon = isExpanded ? '▼' : '▶';
          var row = document.createElement('tr');
          row.className = 'expandable-row';
          row.dataset.expandId = 'student-' + s.id;
          row.innerHTML = '<td style="cursor:pointer;"><span class="expand-icon' + (isExpanded ? ' open' : '') + '">' + icon +
            '</span> <strong>' + s.name + '</strong></td><td>' + s.email + '</td><td><span class="status-badge ' + s.status
            .toLowerCase() + '">' + tr(s.status) + '</span></td><td><button class="action-btn edit" data-id="' + s.id +
            '" data-type="student">✏️</button><button class="action-btn delete" data-id="' + s.id +
            '" data-type="student">🗑️</button><button class="action-btn enroll" data-id="' + s.id +
            '" data-type="enroll">📚 ' + tr('Enroll') + '</button></td>';
          studentTableBody.appendChild(row);
          var detailTr = document.createElement('tr');
          detailTr.className = 'expandable-detail' + (isExpanded ? ' open' : '');
          detailTr.dataset.parentId = 'student-' + s.id;
          var courseIds = getEnrolledCourseIds(s.id);
          var detailHtml = '<div class="detail-content"><strong>' + tr('Enrolled Courses:') + '</strong> ';
          if (courseIds.length === 0) detailHtml += '<span class="empty-msg">' + tr('Not enrolled in any courses.') +
            '</span>';
          else {
            courseIds.forEach(function(cid) {
              var c = courses.find(function(co) { return co.id === cid; });
              if (c) detailHtml += '<span class="item-tag">📚 ' + c.name + ' <span style="color:var(--muted);font-size:11px;">(' +
                c.teacherId + ')</span></span>';
            });
          }
          detailHtml += '</div>';
          if (s.status === 'Warning') {
            detailHtml += '<div class="warning-note">⚠️ <strong>' + tr('Warning:') + '</strong> ' +
              escapeHtml(s.warningNote || tr('No reason provided.')) + '</div>';
          }
          if (s.phone || s.dob || s.country || s.address || s.emergencyContact) {
            detailHtml += '<div class="student-info-grid"><strong>' + tr('Contact details:') + '</strong>' +
              '<span>' + (s.phone ? '📞 ' + escapeHtml(s.phone) : '') + '</span>' +
              '<span>' + (s.dob ? '🎂 ' + s.dob : '') + '</span>' +
              '<span>' + (s.country ? '🌍 ' + escapeHtml(s.country) : '') + '</span>' +
              '<span>' + (s.address ? '📍 ' + escapeHtml(s.address) : '') + '</span>' +
              '<span>' + (s.emergencyContact ? '☎️ ' + escapeHtml(s.emergencyContact) : '') + '</span></div>';
          }
          detailTr.innerHTML = '<td colspan="4">' + detailHtml + '</td>';
          studentTableBody.appendChild(detailTr);
        });
        studentCount.textContent = filtered.length + ' ' + tr('students');
        studentTotal.textContent = students.length;
        updateAdminStats();
        setLanguage(currentLang);
      }
