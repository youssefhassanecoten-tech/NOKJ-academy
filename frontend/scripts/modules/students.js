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
          var tr = document.createElement('tr');
          tr.className = 'expandable-row';
          tr.dataset.expandId = 'student-' + s.id;
          tr.innerHTML = '<td style="cursor:pointer;"><span class="expand-icon' + (isExpanded ? ' open' : '') + '">' + icon +
            '</span> <strong>' + s.name + '</strong></td><td>' + s.email + '</td><td><span class="status-badge ' + s.status
            .toLowerCase() + '">' + s.status + '</span></td><td><button class="action-btn edit" data-id="' + s.id +
            '" data-type="student">✏️</button><button class="action-btn delete" data-id="' + s.id +
            '" data-type="student">🗑️</button><button class="action-btn enroll" data-id="' + s.id +
            '" data-type="enroll">📚 Enroll</button></td>';
          studentTableBody.appendChild(tr);
          var detailTr = document.createElement('tr');
          detailTr.className = 'expandable-detail' + (isExpanded ? ' open' : '');
          detailTr.dataset.parentId = 'student-' + s.id;
          var courseIds = getEnrolledCourseIds(s.id);
          var detailHtml = '<div class="detail-content"><strong>Enrolled Courses:</strong> ';
          if (courseIds.length === 0) detailHtml += '<span class="empty-msg">Not enrolled in any courses.</span>';
          else {
            courseIds.forEach(function(cid) {
              var c = courses.find(function(co) { return co.id === cid; });
              if (c) detailHtml += '<span class="item-tag">📚 ' + c.name + ' <span style="color:var(--muted);font-size:11px;">(' +
                c.teacherId + ')</span></span>';
            });
          }
          detailHtml += '</div>';
          detailTr.innerHTML = '<td colspan="4">' + detailHtml + '</td>';
          studentTableBody.appendChild(detailTr);
        });
        studentCount.textContent = filtered.length + ' students';
        studentTotal.textContent = students.length;
        updateAdminStats();
        setLanguage(currentLang);
      }
