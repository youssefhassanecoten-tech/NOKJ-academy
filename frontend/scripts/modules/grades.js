      function renderGrades() {
        if (!currentUser) return;
        // A teacher manages the grades of their own students, so they get the
        // same management table as an admin, scoped to their own courses. Only
        // a student sees the personal "my grades" view.
        var manages = currentUser.role === 'Admin' || currentUser.role === 'Teacher';
        var adminView = document.getElementById('admin-grades-view');
        var studentView = document.getElementById('student-grades-view');
        if (!adminView || !studentView) return;
        if (manages) {
          adminView.style.display = 'block';
          studentView.style.display = 'none';
          var courseFilter = document.getElementById('grade-course-filter');
          var currentCourseFilter = courseFilter.value;
          // A teacher must not be offered, or see, another teacher's courses.
          var scope = gradeCourseScope();
          courseFilter.innerHTML = '<option value="all">' + tr('All Courses') + '</option>';
          scope.forEach(function(c) {
            courseFilter.innerHTML += '<option value="' + c.id + '" ' + (currentCourseFilter === String(c.id) ?
              'selected' : '') + '>' + escapeHtml(c.name) + '</option>';
          });
          var studentFilter = document.getElementById('grade-student-filter');
          var currentStudentFilter = studentFilter.value;
          var scopeStudents = gradeStudentScope(scope);
          studentFilter.innerHTML = '<option value="all">' + tr('All Students') + '</option>';
          scopeStudents.forEach(function(s) {
            studentFilter.innerHTML += '<option value="' + s.id + '" ' + (currentStudentFilter === String(s.id) ?
              'selected' : '') + '>' + escapeHtml(s.name) + '</option>';
          });
          renderGradeTable();
        } else {
          adminView.style.display = 'none';
          studentView.style.display = 'block';
          renderStudentGrades();
        }
        setLanguage(currentLang);
      }

      // The courses this viewer is allowed to grade. An admin sees everything;
      // a teacher only their own.
      function gradeCourseScope() {
        if (!currentUser) return [];
        if (currentUser.role === 'Admin') return courses;
        if (currentUser.role === 'Teacher') {
          return courses.filter(function(c) { return c.teacherId === currentUser.id; });
        }
        return [];
      }

      // The students enrolled in the courses this viewer may grade.
      function gradeStudentScope(scopeCourses) {
        var ids = {};
        scopeCourses.forEach(function(c) { ids[c.id] = true; });
        return students.filter(function(s) {
          return enrollments.some(function(e) { return e.studentId === s.id && ids[e.courseId]; });
        }).sort(function(a, b) { return a.name.localeCompare(b.name); });
      }

      // One row per student. Expanding a row reveals that student's courses and
      // the grade for each, so a teacher sees everything a student has without
      // a wall of near-identical rows.
      function renderGradeTable() {
        var courseFilter = document.getElementById('grade-course-filter').value;
        var studentFilter = document.getElementById('grade-student-filter').value;
        var onlyCourse = courseFilter === 'all' ? null : parseInt(courseFilter, 10);
        var scope = gradeCourseScope();
        var scopeIds = {};
        scope.forEach(function(c) { scopeIds[c.id] = true; });

        // Group the visible enrolments by student.
        var byStudent = new Map();
        enrollments.forEach(function(e) {
          if (!scopeIds[e.courseId]) return;
          var student = students.find(function(s) { return s.id === e.studentId; });
          var course = courses.find(function(c) { return c.id === e.courseId; });
          if (!student || !course) return;
          if (onlyCourse !== null && e.courseId !== onlyCourse) return;
          if (studentFilter !== 'all' && e.studentId !== parseInt(studentFilter, 10)) return;
          if (!byStudent.has(e.studentId)) byStudent.set(e.studentId, { id: e.studentId, name: student.name, rows: [] });
          byStudent.get(e.studentId).rows.push({ courseId: e.courseId, courseName: course.name });
        });

        var groups = Array.from(byStudent.values()).sort(function(a, b) { return a.name.localeCompare(b.name); });
        var tbody = document.getElementById('grade-table-body');
        tbody.innerHTML = '';

        var totalGrades = 0, passingCount = 0, failingCount = 0;
        var open = {};

        groups.forEach(function(group) {
          // The student filter means there is only one student, so open it.
          var expanded = studentFilter !== 'all';
          var graded = group.rows.filter(function(r) {
            var g = gradeData[group.id + '-' + r.courseId];
            return g !== null && g !== undefined;
          });
          var avg = graded.length
            ? Math.round(graded.reduce(function(sum, r) { return sum + gradeData[group.id + '-' + r.courseId]; }, 0) / graded.length)
            : null;
          var allPass = graded.length > 0 && graded.every(function(r) { return gradeData[group.id + '-' + r.courseId] >= 60; });
          var statusClass = avg === null ? '' : (allPass ? 'grade-pass' : 'grade-fail');
          var statusText = avg === null ? tr('Not graded')
            : (allPass ? '✅ ' + tr('Pass') : '❌ ' + tr('Fail'));

          var head = document.createElement('tr');
          head.className = 'grade-student-row' + (expanded ? ' open' : '');
          head.innerHTML =
            '<td class="grade-student-cell">' +
            '<button type="button" class="grade-expand-btn" data-grade-expand="' + group.id + '"' +
            ' aria-expanded="' + (expanded ? 'true' : 'false') + '">' +
            '<span class="grade-caret" aria-hidden="true">' + (expanded ? '▾' : '▸') + '</span>' +
            '<strong>' + escapeHtml(group.name) + '</strong></button></td>' +
            '<td>' + group.rows.length + ' ' + tr('courses') + '</td>' +
            '<td><strong>' + (avg === null ? '-' : avg + '%') + '</strong></td>' +
            '<td class="' + statusClass + '">' + statusText + '</td>' +
            '<td></td>';
          tbody.appendChild(head);

          group.rows.forEach(function(r) {
            var grade = gradeData[group.id + '-' + r.courseId];
            grade = (grade === undefined) ? null : grade;
            totalGrades++;
            if (grade !== null) { if (grade >= 60) passingCount++; else failingCount++; }
            var rowClass = grade !== null ? (grade >= 60 ? 'grade-pass' : 'grade-fail') : '';
            var rowText = grade !== null ? (grade >= 60 ? '✅ ' + tr('Pass') : '❌ ' + tr('Fail')) : tr('Not graded');

            var detail = document.createElement('tr');
            detail.className = 'grade-course-row' + (expanded ? '' : ' hidden');
            detail.dataset.gradeFor = group.id;
            detail.innerHTML =
              '<td class="grade-course-indent"></td>' +
              '<td>' + escapeHtml(r.courseName) + '</td>' +
              '<td class="grade-cell"><input type="number" class="grade-input" id="grade-input-' + group.id +
              '-' + r.courseId + '" value="' + (grade !== null ? grade : '') +
              '" min="0" max="100" placeholder="-" /><button class="save-grade-btn" data-student="' + group.id +
              '" data-course="' + r.courseId + '">' + tr('Save') + '</button></td>' +
              '<td class="' + rowClass + '">' + rowText + '</td>' +
              '<td><button class="action-btn delete" data-student="' + group.id + '" data-course="' + r.courseId +
              '" data-type="grade">🗑️</button></td>';
            tbody.appendChild(detail);
          });
          open[group.id] = expanded;
        });

        document.getElementById('grade-total').textContent = totalGrades;
        document.getElementById('grade-passing-count').textContent = passingCount;
        document.getElementById('grade-failing-count').textContent = failingCount;
        document.getElementById('grade-count').textContent = totalGrades + ' ' + tr('entries');
        var allGrades = [];
        enrollments.forEach(function(e) {
          if (!scopeIds[e.courseId]) return;
          var g = gradeData[e.studentId + '-' + e.courseId];
          if (g !== null && g !== undefined) allGrades.push(g);
        });
        var avgAll = allGrades.length > 0 ? Math.round(allGrades.reduce(function(a, b) { return a + b; }, 0) / allGrades.length) : 0;
        document.getElementById('avg-grade-all').textContent = avgAll + '%';
        document.getElementById('passing-students').textContent = allGrades.filter(function(g) { return g >= 60; }).length;
        document.getElementById('failing-students').textContent = allGrades.filter(function(g) { return g < 60; }).length;
        setLanguage(currentLang);
      }

      // Expanding a student is a pure view concern, so it is handled here
      // rather than re-rendering the whole table and losing scroll position.
      function toggleGradeStudent(studentId) {
        var rows = document.querySelectorAll('#grade-table-body .grade-course-row[data-grade-for="' + studentId + '"]');
        var head = document.querySelector('#grade-table-body .grade-expand-btn[data-grade-expand="' + studentId + '"]');
        var headRow = head ? head.closest('tr') : null;
        var isOpen = headRow && headRow.classList.contains('open');
        rows.forEach(function(r) { r.classList.toggle('hidden', !!isOpen); });
        if (headRow) {
          headRow.classList.toggle('open', !isOpen);
          head.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          var caret = head.querySelector('.grade-caret');
          if (caret) caret.textContent = isOpen ? '▸' : '▾';
        }
      }

      function renderStudentGrades() {
        if (!currentUser || currentUser.role !== 'Student') return;
        var studentId = currentUser.id;
        var enrolled = getEnrolledCourseIds(studentId);
        var tbody = document.getElementById('student-grade-table-body');
        tbody.innerHTML = '';
        var gradesList = [];
        enrolled.forEach(function(courseId) {
          var course = courses.find(function(c) { return c.id === courseId; });
          if (!course) return;
          var childGrade = gradeData[studentId + '-' + courseId];
          var grade = childGrade || null;
          var row = document.createElement('tr');
          var gradeDisplay = grade !== null ? grade : '-';
          var statusClass = grade !== null ? (grade >= 60 ? 'grade-pass' : 'grade-fail') : '';
          var statusText = grade !== null ? (grade >= 60 ? '✅ ' + tr('Pass') : '❌ ' + tr('Fail')) : tr('Not graded');
          if (grade !== null) gradesList.push(grade);
          row.innerHTML = '<td><strong>' + course.name + '</strong><br><span style="font-size:12px;color:var(--muted);">' +
            getTeacherName(course.teacherId) + '</span></td><td class="' + statusClass +
            '" style="font-size:18px;font-weight:700;">' + gradeDisplay + '%</td><td>' + statusText + '</td>';
          tbody.appendChild(row);
        });
        var avg = gradesList.length > 0 ? Math.round(gradesList.reduce(function(a, b) { return a + b; }, 0) / gradesList
          .length) : 0;
        document.getElementById('student-avg-grade-display').textContent = avg + '%';
        var passed = gradesList.filter(function(g) { return g >= 60; }).length;
        var failed = gradesList.filter(function(g) { return g < 60; }).length;
        document.getElementById('student-courses-passed').textContent = passed;
        document.getElementById('student-courses-failed').textContent = failed;
        setLanguage(currentLang);
      }
