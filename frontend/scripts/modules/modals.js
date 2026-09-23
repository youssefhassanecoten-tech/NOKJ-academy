      function toggleExpand(expandId) {
        expandedRows[expandId] = !expandedRows[expandId];
        var activePage = document.querySelector('.page.active');
        if (activePage) {
          if (activePage.id === 'students') renderStudents();
          else if (activePage.id === 'courses-admin') renderCourses();
        }
        setLanguage(currentLang);
      }

      // ============================================================
      //  MODAL HELPERS
      // ============================================================
      var modalType, modalMode, editingId, enrollStudentId;

      function openModal(type, mode, data) {
        modalType = type;
        modalMode = mode;
        if (mode === 'add') {
          if (type === 'student') {
            document.getElementById('modal-title').textContent = 'Add Student';
            document.getElementById('modal-sub').textContent = 'Enter student details';
            document.getElementById('modal-fields').innerHTML =
              '<label>Name</label><input type="text" id="modal-name" placeholder="Full name" />' +
              '<label>Email</label><input type="email" id="modal-email" placeholder="student@example.com" />' +
              '<label>Password</label><input type="password" id="modal-password" placeholder="Min 6 characters" />' +
              '<label>Status</label><select id="modal-status"><option value="Active">Active</option><option value="Warning">Warning</option><option value="Inactive">Inactive</option></select>';
            editingId = null;
          } else if (type === 'course') {
            document.getElementById('modal-title').textContent = 'Add Course';
            document.getElementById('modal-sub').textContent = 'Enter course details';
            document.getElementById('modal-fields').innerHTML =
              '<label>Course Name</label><input type="text" id="modal-course-name" placeholder="e.g. Physics" />' +
              '<label>Teacher</label><select id="modal-course-teacher">' + teachers.map(function(t) {
                return '<option value="' + t.id + '">' + t.name + '</option>';
              }).join('') + '</select>' +
              '<label>Description</label><input type="text" id="modal-course-description" placeholder="e.g. Year 10 Physics" />';
            editingId = null;
          } else {
            document.getElementById('modal-title').textContent = 'Add Budget Entry';
            document.getElementById('modal-sub').textContent = 'Enter budget details';
            document.getElementById('modal-fields').innerHTML =
              '<label>Category</label><input type="text" id="modal-category" placeholder="e.g. Student Fees" />' +
              '<label>Type</label><select id="modal-type"><option value="Income">Income</option><option value="Expense">Expense</option></select>' +
              '<label>Amount ($)</label><input type="number" id="modal-amount" placeholder="Enter amount" min="0" step="1" />' +
              '<label>Date</label><input type="date" id="modal-date" />' +
              '<label>Status</label><select id="modal-status"><option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Unpaid">Unpaid</option></select>';
            editingId = null;
          }
        } else {
          if (type === 'student') {
            var s = students.find(function(st) { return st.id === data.id; });
            if (s) {
              editingId = s.id;
              document.getElementById('modal-fields').innerHTML =
                '<label>Name</label><input type="text" id="modal-name" value="' + s.name + '" />' +
                '<label>Email</label><input type="email" id="modal-email" value="' + s.email + '" />' +
                '<label>Password</label><input type="password" id="modal-password" placeholder="Leave blank to keep current" />' +
                '<label>Status</label><select id="modal-status"><option value="Active"' + (s.status === 'Active' ?
                  ' selected' : '') + '>Active</option><option value="Warning"' + (s.status === 'Warning' ?
                  ' selected' : '') + '>Warning</option><option value="Inactive"' + (s.status === 'Inactive' ?
                  ' selected' : '') + '>Inactive</option></select>';
            }
          } else if (type === 'course') {
            var c = courses.find(function(co) { return co.id === data.id; });
            if (c) {
              editingId = c.id;
              document.getElementById('modal-fields').innerHTML =
                '<label>Course Name</label><input type="text" id="modal-course-name" value="' + c.name + '" />' +
                '<label>Teacher</label><select id="modal-course-teacher">' + teachers.map(function(t) {
                  return '<option value="' + t.id + '"' + (t.id === c.teacherId ? ' selected' : '') + '>' + t
                    .name + '</option>';
                }).join('') + '</select>' +
                '<label>Description</label><input type="text" id="modal-course-description" value="' + c
                .description + '" />';
            }
          } else {
            var b = budgetEntries.find(function(bg) { return bg.id === data.id; });
            if (b) {
              editingId = b.id;
              var isIncome = b.type === 'Income';
              document.getElementById('modal-fields').innerHTML =
                '<label>Category</label><input type="text" id="modal-category" value="' + b.category + '" />' +
                '<label>Type</label><select id="modal-type"><option value="Income"' + (isIncome ? ' selected' :
                  '') + '>Income</option><option value="Expense"' + (!isIncome ? ' selected' : '') +
                '>Expense</option></select>' +
                '<label>Amount ($)</label><input type="number" id="modal-amount" value="' + Math.abs(b.amount) +
                '" min="0" step="1" />' +
                '<label>Date</label><input type="date" id="modal-date" value="' + b.date + '" />' +
                '<label>Status</label><select id="modal-status"><option value="Paid"' + (b.status === 'Paid' ?
                  ' selected' : '') + '>Paid</option><option value="Pending"' + (b.status === 'Pending' ?
                  ' selected' : '') + '>Pending</option><option value="Unpaid"' + (b.status === 'Unpaid' ?
                  ' selected' : '') + '>Unpaid</option></select>';
            }
          }
        }
        document.getElementById('modal-overlay').classList.add('open');
        setLanguage(currentLang);
      }

      function closeModal() {
        document.getElementById('modal-overlay').classList.remove('open');
        document.getElementById('modal-form').reset();
      }

      function handleModalSubmit(e) {
        e.preventDefault();
        var type = modalType;
        if (type === 'student') {
          var name = document.getElementById('modal-name').value.trim();
          var email = document.getElementById('modal-email').value.trim();
          var password = document.getElementById('modal-password').value.trim();
          var status = document.getElementById('modal-status').value;
          if (!name || !email) { alert('Please fill in all fields'); return; }
          if (modalMode === 'add') {
            if (getUserByEmail(email)) { alert('Email already exists.'); return; }
            students.push({ id: generateId(), name: name, email: email, password: password || 'password123',
              role: 'Student', status: status, createdAt: new Date().toISOString().split('T')[0] });
          } else {
            var index = students.findIndex(function(s) { return s.id === editingId; });
            if (index !== -1) {
              students[index].name = name;
              students[index].email = email;
              if (password) students[index].password = password;
              students[index].status = status;
            }
          }
          saveData();
          renderStudents();
          closeModal();
        } else if (type === 'course') {
          var name = document.getElementById('modal-course-name').value.trim();
          var teacherId = parseInt(document.getElementById('modal-course-teacher').value);
          var description = document.getElementById('modal-course-description').value.trim();
          if (!name || !teacherId) { alert('Please fill in all fields'); return; }
          if (modalMode === 'add') {
            courses.push({ id: courses.length + 1, name: name, teacherId: teacherId, description: description });
          } else {
            var index = courses.findIndex(function(c) { return c.id === editingId; });
            if (index !== -1) { courses[index] = { id: editingId, name: name, teacherId: teacherId,
              description: description }; }
          }
          saveData();
          renderCourses();
          renderStudentCourses();
          closeModal();
        } else {
          var category = document.getElementById('modal-category').value.trim();
          var type = document.getElementById('modal-type').value;
          var amount = parseFloat(document.getElementById('modal-amount').value);
          var date = document.getElementById('modal-date').value;
          var status = document.getElementById('modal-status').value;
          if (!category || isNaN(amount) || !date) { alert('Please fill in all fields'); return; }
          var finalAmount = type === 'Income' ? amount : -amount;
          if (modalMode === 'add') {
            budgetEntries.push({ id: budgetEntries.length + 1, category: category, type: type, amount: finalAmount,
              date: date, status: status });
          } else {
            var index = budgetEntries.findIndex(function(b) { return b.id === editingId; });
            if (index !== -1) { budgetEntries[index] = { id: editingId, category: category, type: type,
                amount: finalAmount, date: date, status: status }; }
          }
          saveData();
          renderBudget();
          closeModal();
        }
        setLanguage(currentLang);
      }

      function deleteEntry(type, id) {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        if (type === 'student') {
          enrollments = enrollments.filter(function(e) { return e.studentId !== id; });
          students = students.filter(function(s) { return s.id !== id; });
          renderStudents();
          renderStudentCourses();
        } else if (type === 'course') {
          enrollments = enrollments.filter(function(e) { return e.courseId !== id; });
          courses = courses.filter(function(c) { return c.id !== id; });
          renderCourses();
          renderStudentCourses();
        } else if (type === 'budget') {
          budgetEntries = budgetEntries.filter(function(b) { return b.id !== id; });
          renderBudget();
        }
        saveData();
        updateAdminStats();
        setLanguage(currentLang);
      }

      function openEnrollModal(studentId) {
        enrollStudentId = studentId;
        var student = students.find(function(s) { return s.id === studentId; });
        if (!student) return;
        document.getElementById('enroll-modal-title').textContent = 'Enroll Student';
        document.getElementById('enroll-modal-sub').textContent = 'Select courses for ' + student.name;
        var enrolledIds = getEnrolledCourseIds(studentId);
        var html = '';
        if (courses.length === 0) html = '<p style="color:var(--muted);padding:20px;text-align:center;">No courses available.</p>';
        else courses.forEach(function(c) {
          var checked = enrolledIds.includes(c.id) ? 'checked' : '';
          html += '<div class="enrollment-item"><input type="checkbox" id="enroll-course-' + c.id + '" value="' + c
            .id + '" ' + checked + ' /><label for="enroll-course-' + c.id + '"><strong>' + c.name +
            '</strong></label><span class="course-teacher">' + getTeacherName(c.teacherId) + '</span></div>';
        });
        document.getElementById('enrollment-list').innerHTML = html;
        document.getElementById('enroll-modal-overlay').classList.add('open');
        setLanguage(currentLang);
      }

      function closeEnrollModal() {
        document.getElementById('enroll-modal-overlay').classList.remove('open');
        enrollStudentId = null;
      }

      function saveEnrollments() {
        if (enrollStudentId === null) return;
        var checkboxes = document.getElementById('enrollment-list').querySelectorAll('input[type="checkbox"]');
        var selectedIds = [];
        checkboxes.forEach(function(cb) { if (cb.checked) selectedIds.push(parseInt(cb.value)); });
        enrollments = enrollments.filter(function(e) { return e.studentId !== enrollStudentId; });
        selectedIds.forEach(function(courseId) { enrollments.push({ studentId: enrollStudentId, courseId: courseId }); });
        saveData();
        renderStudents();
        renderCourses();
        renderStudentCourses();
        closeEnrollModal();
        setLanguage(currentLang);
      }
