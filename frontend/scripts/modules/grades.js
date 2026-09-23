      function renderGrades() {
        if (!currentUser) return;
        var isAdmin = currentUser.role === 'Admin';
        var adminView = document.getElementById('admin-grades-view');
        var studentView = document.getElementById('student-grades-view');
        if (isAdmin) {
          adminView.style.display = 'block';
          studentView.style.display = 'none';
          var courseFilter = document.getElementById('grade-course-filter');
          var currentCourseFilter = courseFilter.value;
          courseFilter.innerHTML = '<option value="all">All Courses</option>';
          courses.forEach(function(c) {
            courseFilter.innerHTML += '<option value="' + c.id + '" ' + (currentCourseFilter === String(c.id) ?
              'selected' : '') + '>' + c.name + '</option>';
          });
          var studentFilter = document.getElementById('grade-student-filter');
          var currentStudentFilter = studentFilter.value;
          studentFilter.innerHTML = '<option value="all">All Students</option>';
          students.forEach(function(s) {
            studentFilter.innerHTML += '<option value="' + s.id + '" ' + (currentStudentFilter === String(s.id) ?
              'selected' : '') + '>' + s.name + '</option>';
          });
          renderGradeTable();
        } else {
          adminView.style.display = 'none';
          studentView.style.display = 'block';
          renderStudentGrades();
        }
        setLanguage(currentLang);
      }

      function renderGradeTable() {
        var courseFilter = document.getElementById('grade-course-filter').value;
        var studentFilter = document.getElementById('grade-student-filter').value;
        var filtered = [];
        enrollments.forEach(function(e) {
          var student = students.find(function(s) { return s.id === e.studentId; });
          var course = courses.find(function(c) { return c.id === e.courseId; });
          if (!student || !course) return;
          var courseMatch = courseFilter === 'all' || e.courseId === parseInt(courseFilter);
          var studentMatch = studentFilter === 'all' || e.studentId === parseInt(studentFilter);
          if (courseMatch && studentMatch) filtered.push({ studentId: e.studentId, studentName: student.name,
            courseId: e.courseId, courseName: course.name });
        });
        filtered.sort(function(a, b) { return a.studentName.localeCompare(b.studentName); });
        var tbody = document.getElementById('grade-table-body');
        tbody.innerHTML = '';
        var totalGrades = 0,
          passingCount = 0,
          failingCount = 0;
        filtered.forEach(function(item) {
          var grade = gradeData[item.studentId + '-' + item.courseId] || null;
          totalGrades++;
          var tr = document.createElement('tr');
          var gradeDisplay = grade !== null ? grade : '-';
          var statusClass = grade !== null ? (grade >= 60 ? 'grade-pass' : 'grade-fail') : '';
          var statusText = grade !== null ? (grade >= 60 ? '✅ Pass' : '❌ Fail') : 'Not graded';
          if (grade !== null) { if (grade >= 60) passingCount++;
            else failingCount++; }
          tr.innerHTML = '<td><strong>' + item.studentName + '</strong></td><td>' + item.courseName +
            '</td><td class="grade-cell"><input type="number" class="grade-input" id="grade-input-' + item.studentId +
            '-' + item.courseId + '" value="' + (grade !== null ? grade : '') +
            '" min="0" max="100" placeholder="-" /><button class="save-grade-btn" data-student="' + item.studentId +
            '" data-course="' + item.courseId + '">Save</button></td><td class="' + statusClass + '">' + statusText +
            '</td><td><button class="action-btn delete" data-student="' + item.studentId + '" data-course="' + item
            .courseId + '" data-type="grade">🗑️</button></td>';
          tbody.appendChild(tr);
        });
        document.getElementById('grade-total').textContent = totalGrades;
        document.getElementById('grade-passing-count').textContent = passingCount;
        document.getElementById('grade-failing-count').textContent = failingCount;
        document.getElementById('grade-count').textContent = filtered.length + ' entries';
        var allGrades = [];
        enrollments.forEach(function(e) {
          var g = gradeData[e.studentId + '-' + e.courseId] || null;
          if (g !== null) allGrades.push(g);
        });
        var avgAll = allGrades.length > 0 ? Math.round(allGrades.reduce(function(a, b) { return a + b; }, 0) / allGrades
          .length) : 0;
        document.getElementById('avg-grade-all').textContent = avgAll + '%';
        var passing = allGrades.filter(function(g) { return g >= 60; }).length;
        var failing = allGrades.filter(function(g) { return g < 60; }).length;
        document.getElementById('passing-students').textContent = passing;
        document.getElementById('failing-students').textContent = failing;
        setLanguage(currentLang);
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
          var grade = gradeData[studentId + '-' + courseId] || null;
          var tr = document.createElement('tr');
          var gradeDisplay = grade !== null ? grade : '-';
          var statusClass = grade !== null ? (grade >= 60 ? 'grade-pass' : 'grade-fail') : '';
          var statusText = grade !== null ? (grade >= 60 ? '✅ Pass' : '❌ Fail') : 'Not graded';
          if (grade !== null) gradesList.push(grade);
          tr.innerHTML = '<td><strong>' + course.name + '</strong><br><span style="font-size:12px;color:var(--muted);">' +
            getTeacherName(course.teacherId) + '</span></td><td class="' + statusClass +
            '" style="font-size:18px;font-weight:700;">' + gradeDisplay + '%</td><td>' + statusText + '</td>';
          tbody.appendChild(tr);
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
