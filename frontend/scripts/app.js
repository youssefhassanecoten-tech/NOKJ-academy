      // ============================================================
      //  DOM REFS
      // ============================================================
      const landingPage = document.getElementById('landing-page');
      const loginScreen = document.getElementById('login-screen');
      const registerScreen = document.getElementById('register-screen');
      const app = document.getElementById('app');
      const loginForm = document.getElementById('login-form');
      const loginEmail = document.getElementById('login-email');
      const loginPassword = document.getElementById('login-password');
      const loginError = document.getElementById('login-error');
      const registerForm = document.getElementById('register-form');
      const registerName = document.getElementById('register-name');
      const registerEmail = document.getElementById('register-email');
      const registerPassword = document.getElementById('register-password');
      const registerRole = document.getElementById('register-role');
      const registerError = document.getElementById('register-error');

      const userAvatar = document.getElementById('user-avatar');
      const userDisplayName = document.getElementById('user-display-name');
      const userRole = document.getElementById('user-role');
      const profileAvatar = document.getElementById('profile-avatar');
      const profileName = document.getElementById('profile-name');
      const profileRoleText = document.getElementById('profile-role-text');
      const profileEmail = document.getElementById('profile-email');
      const profileId = document.getElementById('profile-id');
      const profileRole = document.getElementById('profile-role');
      const profileSince = document.getElementById('profile-since');
      const greeting = document.getElementById('greeting');
      const logoutBtn = document.getElementById('logout-btn');
      const sidebarRole = document.getElementById('sidebar-role');

      const pages = document.querySelectorAll('.page');
      const navButtons = document.querySelectorAll('[data-page]');
      const langToggle = document.getElementById('language-toggle');
      const loginLangToggle = document.getElementById('login-lang-toggle');
      const registerLangToggle = document.getElementById('register-lang-toggle');

      const adminNavLabel = document.getElementById('admin-nav-label');
      const adminStudentsBtn = document.getElementById('admin-students-btn');
      const adminBudgetBtn = document.getElementById('admin-budget-btn');
      const adminCoursesBtn = document.getElementById('admin-courses-btn');
      const adminGradesBtn = document.getElementById('admin-grades-btn');
      const adminCalendarBtn = document.getElementById('admin-calendar-btn');
      const adminApprovalsBtn = document.getElementById('admin-approvals-btn');
      const adminStatsContainer = document.getElementById('admin-stats-container');

      const studentTableBody = document.getElementById('student-table-body');
      const studentSearch = document.getElementById('student-search');
      const studentFilter = document.getElementById('student-filter');
      const studentCount = document.getElementById('student-count');
      const studentTotal = document.getElementById('student-total');
      const addStudentBtn = document.getElementById('add-student-btn');
      const exportStudentsBtn = document.getElementById('export-students-btn');

      const meetingGrid = document.getElementById('meeting-grid');
      const calendarGrid = document.getElementById('calendar-grid');
      const calendarMonthLabel = document.getElementById('calendar-month-label');
      const upcomingClassesList = document.getElementById('upcoming-classes-list');
      const addClassBtn = document.getElementById('add-class-btn');
      const scheduleModalOverlay = document.getElementById('schedule-modal-overlay');
      const scheduleModalForm = document.getElementById('schedule-modal-form');
      const scheduleModalCancel = document.getElementById('schedule-modal-cancel');
      const scheduleModalSave = document.getElementById('schedule-modal-save');
      const scheduleTitle = document.getElementById('schedule-title');
      const scheduleTeacher = document.getElementById('schedule-teacher');
      const scheduleDate = document.getElementById('schedule-date');
      const scheduleTime = document.getElementById('schedule-time');
      const scheduleDuration = document.getElementById('schedule-duration');
      const scheduleLink = document.getElementById('schedule-link');
      const scheduleCourse = document.getElementById('schedule-course');

      const totalStudentsEl = document.getElementById('total-students');
      const totalCoursesEl = document.getElementById('total-courses');
      const totalEnrollmentsEl = document.getElementById('total-enrollments');
      const totalRevenueEl = document.getElementById('total-revenue');

      // ============================================================
      //  EVENT LISTENERS
      // ============================================================
      document.getElementById('landing-login-btn').addEventListener('click', showLoginScreen);
      document.getElementById('landing-register-btn').addEventListener('click', showRegisterScreen);
      document.getElementById('landing-start-btn').addEventListener('click', showRegisterScreen);
      document.getElementById('landing-signin-btn').addEventListener('click', showLoginScreen);
      document.getElementById('login-to-register').addEventListener('click', showRegisterScreen);
      document.getElementById('register-to-login').addEventListener('click', showLoginScreen);

      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        login(loginEmail.value.trim(), loginPassword.value.trim());
      });

      registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        register(registerName.value.trim(), registerEmail.value.trim(), registerPassword.value.trim(), registerRole
          .value);
      });

      logoutBtn.addEventListener('click', logout);

      navButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
          openPage(btn.dataset.page);
        });
      });

      langToggle.addEventListener('click', toggleLanguage);
      loginLangToggle.addEventListener('click', toggleLanguage);
      registerLangToggle.addEventListener('click', toggleLanguage);

      document.addEventListener('click', function(e) {
        var target = e.target.closest('.expandable-row');
        if (target && target.dataset.expandId) toggleExpand(target.dataset.expandId);
      });

      document.getElementById('notification-button').addEventListener('click', openNotifications);

      document.getElementById('help-btn').addEventListener('click', function() {
        document.getElementById('help-overlay').classList.add('open');
        setLanguage(currentLang);
      });
      document.getElementById('help-close').addEventListener('click', function() {
        document.getElementById('help-overlay').classList.remove('open');
      });
      document.getElementById('help-overlay').addEventListener('click', function(e) {
        if (e.target === this) document.getElementById('help-overlay').classList.remove('open');
      });

      document.getElementById('sidebar-brand').addEventListener('click', function() { openPage('dashboard'); });
      userAvatar.addEventListener('click', function() { openPage('profile'); });

      document.getElementById('notifications-close').addEventListener('click', function() {
        document.getElementById('notifications-overlay').classList.remove('open');
      });
      document.getElementById('notifications-ok').addEventListener('click', function() {
        document.getElementById('notifications-overlay').classList.remove('open');
      });
      document.getElementById('notifications-overlay').addEventListener('click', function(e) {
        if (e.target === this) document.getElementById('notifications-overlay').classList.remove('open');
      });

      function openNotifications() {
        var list = document.getElementById('notifications-list');
        var html = '';
        var listed = announcements.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 10);
        if (!listed.length) {
          html = '<p style="color:var(--muted);text-align:center;padding:20px;">' + tr('No announcements.') + '</p>';
        } else {
          listed.forEach(function(a) {
            html += '<div class="notification-item">' +
              '<div class="notification-icon">📌</div>' +
              '<div class="row-main"><strong>' + escapeHtml(a.title) + '</strong><span>' + escapeHtml(a.message) +
              '</span><em>' + (a.author || '') + ' · ' + (a.date ? new Date(a.date).toLocaleDateString() : '') +
              '</em></div></div>';
          });
        }
        list.innerHTML = html;
        document.getElementById('notifications-overlay').classList.add('open');
        setLanguage(currentLang);
      }

      document.querySelectorAll('.assignment-button').forEach(function(btn) {
        btn.addEventListener('click', function() {
          alert(tr('Assignment details and submissions will be added in the next development step.'));
        });
      });

      document.getElementById('file-preview-close').addEventListener('click', closeFilePreview);
      document.getElementById('file-preview-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeFilePreview();
      });

      studentTableBody.addEventListener('click', function(e) {
        var target = e.target.closest('button');
        if (!target) return;
        var id = parseInt(target.dataset.id);
        if (target.classList.contains('delete')) deleteEntry('student', id);
        else if (target.classList.contains('edit')) {
          var s = students.find(function(st) { return st.id === id; });
          if (s) openModal('student', 'edit', s);
        } else if (target.classList.contains('enroll')) openEnrollModal(id);
      });

      document.getElementById('budget-table-body').addEventListener('click', function(e) {
        var target = e.target.closest('button');
        if (!target) return;
        var id = parseInt(target.dataset.id);
        if (target.classList.contains('delete')) deleteEntry('budget', id);
        else if (target.classList.contains('edit')) {
          var b = budgetEntries.find(function(bg) { return bg.id === id; });
          if (b) openModal('budget', 'edit', b);
        }
      });

      document.getElementById('course-table-body').addEventListener('click', function(e) {
        var target = e.target.closest('button');
        if (!target) return;
        var id = parseInt(target.dataset.id);
        if (target.classList.contains('delete')) deleteEntry('course', id);
        else if (target.classList.contains('edit')) {
          var c = courses.find(function(co) { return co.id === id; });
          if (c) openModal('course', 'edit', c);
        }
      });

      document.getElementById('grade-table-body').addEventListener('click', function(e) {
        var target = e.target.closest('button');
        if (!target) return;
        if (target.classList.contains('save-grade-btn')) {
          var studentId = parseInt(target.dataset.student);
          var courseId = parseInt(target.dataset.course);
          var input = document.getElementById('grade-input-' + studentId + '-' + courseId);
          if (input) {
            var value = input.value.trim();
            if (value === '') { delete gradeData[studentId + '-' + courseId]; } else {
              var grade = parseFloat(value);
              if (!isNaN(grade) && grade >= 0 && grade <= 100) { gradeData[studentId + '-' + courseId] = grade; } else {
                alert(tr('Please enter a grade between 0 and 100.'));
                return;
              }
            }
            saveData();
            renderGrades();
            renderStudentCourses();
          }
        }
        if (target.classList.contains('delete') && target.dataset.type === 'grade') {
          var studentId = parseInt(target.dataset.student);
          var courseId = parseInt(target.dataset.course);
          if (confirm(tr('Remove this grade?'))) {
            delete gradeData[studentId + '-' + courseId];
            saveData();
            renderGrades();
            renderStudentCourses();
          }
        }
      });

      document.getElementById('grade-course-filter').addEventListener('change', renderGrades);
      document.getElementById('grade-student-filter').addEventListener('change', renderGrades);

      meetingGrid.addEventListener('click', function(e) {
        var target = e.target.closest('.join-btn');
        if (target) {
          var meetingId = parseInt(target.dataset.meeting);
          var m = meetings.find(function(x) { return x.id === meetingId; });
          if (m) openMeetingRoom(m.title, meetingId);
        }
        var editBtn = e.target.closest('.meeting-edit-btn');
        if (editBtn) {
          openEditMeeting(parseInt(editBtn.dataset.meeting));
        }
        var delBtn = e.target.closest('.meeting-delete-btn');
        if (delBtn) {
          deleteMeeting(parseInt(delBtn.dataset.meeting));
        }
        if (e.target.id === 'open-schedule-modal-btn' || e.target.closest('#open-schedule-modal-btn')) {
          openScheduleModal();
        }
      });

      // Delegate clicks on any element with data-page (covers dynamically rendered buttons).
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-page]');
        if (btn) {
          var resultsBox = document.getElementById('global-search-results');
          if (resultsBox) resultsBox.style.display = 'none';
          var searchInput = document.getElementById('global-search');
          if (searchInput) searchInput.blur();
          openPage(btn.dataset.page);
        }
      });

      document.getElementById('presentation-close').addEventListener('click', closePresentation);
      document.getElementById('presentation-next').addEventListener('click', nextSlide);
      document.getElementById('presentation-prev').addEventListener('click', prevSlide);
      document.getElementById('presentation-fullscreen').addEventListener('click', function() {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.body.requestFullscreen();
      });
      document.addEventListener('keydown', function(e) {
        if (document.getElementById('presentation-overlay').classList.contains('open')) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault();
            nextSlide(); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault();
            prevSlide(); } else if (e.key === 'Escape') closePresentation();
        }
      });

      document.getElementById('calendar-prev').addEventListener('click', function() {
        if (currentMonth === 0) { currentMonth = 11;
          currentYear--; } else { currentMonth--; }
        renderCalendar();
      });
      document.getElementById('calendar-next').addEventListener('click', function() {
        if (currentMonth === 11) { currentMonth = 0;
          currentYear++; } else { currentMonth++; }
        renderCalendar();
      });

      addClassBtn.addEventListener('click', openScheduleModal);
      scheduleModalCancel.addEventListener('click', function() { scheduleModalOverlay.classList.remove('open'); });
      scheduleModalOverlay.addEventListener('click', function(e) {
        if (e.target === this) scheduleModalOverlay.classList.remove('open');
      });

      scheduleModalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var title = scheduleTitle.value.trim();
        var teacherId = parseInt(scheduleTeacher.value);
        var date = scheduleDate.value;
        var time = scheduleTime.value;
        var duration = parseInt(scheduleDuration.value);
        var link = scheduleLink.value.trim();
        var courseId = scheduleCourse.value ? parseInt(scheduleCourse.value) : null;
        var visibleToStudents = document.getElementById('schedule-vis-students').checked;
        var visibleToTeachers = document.getElementById('schedule-vis-teachers').checked;

        if (!title || !date || !time) {
          alert(tr('Please fill in all required fields.'));
          return;
        }

        scheduleClass(title, teacherId, date, time, duration, link, courseId, visibleToStudents, visibleToTeachers);
        scheduleModalOverlay.classList.remove('open');
      });

      upcomingClassesList.addEventListener('click', function(e) {
        var target = e.target.closest('.join-btn');
        if (target) {
          var meetingId = parseInt(target.dataset.meeting);
          var m = meetings.find(function(x) { return x.id === meetingId; });
          if (m) openMeetingRoom(m.title, meetingId);
        }
      });

      // ----- TASK EVENTS -----
      document.getElementById('add-task-btn').addEventListener('click', function() {
        document.getElementById('task-modal-title').textContent = 'Create Task';
        document.getElementById('task-modal-sub').textContent = 'Fill in the task details below.';
        document.getElementById('task-modal-title-input').value = '';
        document.getElementById('task-modal-type').value = 'homework';
        document.getElementById('task-modal-priority').value = 'medium';
        document.getElementById('task-modal-description').value = '';
        document.getElementById('task-modal-deadline').value = '';
        document.getElementById('task-modal-assign').value = 'all';
        document.getElementById('task-modal-assign-options').style.display = 'none';
        document.getElementById('task-file-list').innerHTML = '';
        tempTaskFiles = [];
        document.getElementById('task-modal-save').textContent = 'Create Task';
        document.getElementById('task-modal-overlay').classList.add('open');
        setLanguage(currentLang);
      });

      document.getElementById('task-modal-cancel').addEventListener('click', function() {
        document.getElementById('task-modal-overlay').classList.remove('open');
      });
      document.getElementById('task-modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) document.getElementById('task-modal-overlay').classList.remove('open');
      });

      document.getElementById('task-file-input').addEventListener('change', function(e) {
        var files = Array.from(e.target.files);
        files.forEach(function(file) {
          var reader = new FileReader();
          reader.onload = function(event) {
            tempTaskFiles.push({ name: file.name, data: event.target.result });
            updateTaskFileList();
          };
          reader.readAsDataURL(file);
        });
      });


      document.getElementById('task-modal-assign').addEventListener('change', function() {
        var val = this.value;
        var optionsContainer = document.getElementById('task-modal-assign-options');
        if (val === 'all') { optionsContainer.style.display = 'none'; return; }
        optionsContainer.style.display = 'block';
        var html = '<label>Select ' + (val === 'course' ? 'Courses' : 'Students') + '</label>';
        if (val === 'course') {
          courses.forEach(function(c) {
            html += '<div class="enrollment-item"><input type="checkbox" class="task-assign-checkbox" value="' +
              c.id + '" /><label>' + c.name + '</label></div>';
          });
        } else {
          students.forEach(function(s) {
            html += '<div class="enrollment-item"><input type="checkbox" class="task-assign-checkbox" value="' +
              s.id + '" /><label>' + s.name + '</label></div>';
          });
        }
        optionsContainer.innerHTML = html;
      });

      document.getElementById('task-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var title = document.getElementById('task-modal-title-input').value.trim();
        var type = document.getElementById('task-modal-type').value;
        var priority = document.getElementById('task-modal-priority').value;
        var description = document.getElementById('task-modal-description').value.trim();
        var deadline = document.getElementById('task-modal-deadline').value;
        var assignTo = document.getElementById('task-modal-assign').value;

        if (!title || !description || !deadline) { alert(tr('Please fill in all required fields.')); return; }

        var assignedIds = [];
        if (assignTo !== 'all') {
          var checkboxes = document.getElementById('task-modal-assign-options').querySelectorAll(
            '.task-assign-checkbox:checked');
          checkboxes.forEach(function(cb) { assignedIds.push(parseInt(cb.value)); });
          if (assignedIds.length === 0) { alert(tr('Please select at least one') + ' ' + (assignTo === 'course' ?
              tr('Course') : tr('Student')) + '.'); return; }
        }

        var files = tempTaskFiles.map(function(f) { return { name: f.name, data: f.data }; });
        createTask(title, type, description, deadline, priority, assignTo, assignedIds, files);
        tempTaskFiles = [];
        document.getElementById('task-modal-overlay').classList.remove('open');
      });

      document.getElementById('task-search').addEventListener('input', renderTasks);
      document.getElementById('task-type-filter').addEventListener('change', renderTasks);
      document.getElementById('task-status-filter').addEventListener('change', renderTasks);

      document.getElementById('student-task-list').addEventListener('click', function(e) {
        var target = e.target.closest('.submit-btn');
        if (target) {
          var taskId = parseInt(target.dataset.task);
          var input = document.getElementById('answer-' + taskId);
          var fileInput = document.getElementById('file-' + taskId);
          var studentId = currentUser.id;

          var files = [];
          if (fileInput && fileInput.files && fileInput.files.length > 0) {
            files = Array.from(fileInput.files).map(function(f) {
              return { name: f.name, size: f.size, type: f.type };
            });
          }

          var answer = input ? input.value.trim() : '';
          if (!answer && files.length === 0) { alert(tr('Please enter your answer or upload a file.')); return; }

          submitTaskAnswer(taskId, studentId, answer, files);
        }
      });

      document.getElementById('admin-task-list').addEventListener('click', function(e) {
        var target = e.target.closest('.view-submissions-btn');
        if (target) {
          var taskId = parseInt(target.dataset.task);
          var task = tasks.find(function(t) { return t.id === taskId; });
          if (!task) return;

          var submissionKeys = Object.keys(taskSubmissions).filter(function(key) {
            return key.startsWith(taskId + '-');
          });

          if (submissionKeys.length === 0) {
            alert(tr('No submissions yet for this task.'));
            return;
          }

          var studentList = [];
          submissionKeys.forEach(function(key) {
            var studentId = parseInt(key.split('-')[1]);
            var student = students.find(function(s) { return s.id === studentId; });
            var submission = taskSubmissions[key];
            if (student) {
              studentList.push({
                id: studentId,
                name: student.name,
                status: submission.grade !== null && submission.grade !== undefined ? '✅ Graded: ' +
                  submission.grade + '%' : '⏳ Pending',
                submission: submission
              });
            }
          });

          studentList.sort(function(a, b) {
            var aGraded = a.submission.grade !== null && a.submission.grade !== undefined;
            var bGraded = b.submission.grade !== null && b.submission.grade !== undefined;
            if (!aGraded && bGraded) return -1;
            if (aGraded && !bGraded) return 1;
            return a.name.localeCompare(b.name);
          });

          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';

          var modal = document.createElement('div');
          modal.style.cssText = 'max-width:750px;width:100%;max-height:90vh;background:white;border-radius:18px;padding:24px;overflow:auto;box-shadow:0 25px 60px rgba(0,0,0,0.3);';

          var title = document.createElement('h2');
          title.textContent = '📋 Submissions: ' + task.title;
          title.style.marginTop = '0';
          title.style.marginBottom = '8px';

          var sub = document.createElement('p');
          sub.textContent = 'Total: ' + studentList.length + ' submissions';
          sub.style.color = '#6b7280';
          sub.style.marginBottom = '16px';

          modal.appendChild(title);
          modal.appendChild(sub);

          studentList.forEach(function(item) {
            var section = document.createElement('div');
            section.style.cssText = 'padding:12px;margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;';

            var nameRow = document.createElement('div');
            nameRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;';
            nameRow.innerHTML = '<strong>' + item.name + '</strong> <span>' + item.status + '</span>';
            section.appendChild(nameRow);

            var answerRow = document.createElement('div');
            answerRow.style.cssText = 'margin-top:6px;font-size:13px;color:#4b5563;';
            answerRow.textContent = '📝 ' + (item.submission.answer || 'No answer provided.');
            section.appendChild(answerRow);

            if (item.submission.files && item.submission.files.length > 0) {
              var filesRow = document.createElement('div');
              filesRow.style.cssText = 'margin-top:4px;font-size:12px;';
              filesRow.innerHTML = '<strong>📎 Files:</strong> ';
              item.submission.files.forEach(function(file) {
                var fileData = file.data || '';
                var escapedData = fileData.replace(/'/g, "\\'");
                var link = document.createElement('span');
                link.style.cssText =
                  'color:#4f46e5;text-decoration:underline;cursor:pointer;margin-right:8px;';
                link.textContent = file.name;
                link.onclick = function() { window.openFilePreview(file.name, fileData); };
                filesRow.appendChild(link);
              });
              section.appendChild(filesRow);
            }

            if (item.submission.grade === null || item.submission.grade === undefined) {
              var gradeBtn = document.createElement('button');
              gradeBtn.textContent = '⭐ Grade';
              gradeBtn.style.cssText = 'margin-top:8px;padding:4px 16px;background:#4f46e5;color:white;border:0;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px;';
              gradeBtn.onclick = function() {
                openGradeModal(taskId, item.id);
                document.body.removeChild(overlay);
              };
              section.appendChild(gradeBtn);
            } else if (item.submission.feedback) {
              var feedbackRow = document.createElement('div');
              feedbackRow.style.cssText = 'margin-top:4px;font-size:12px;color:#6b7280;';
              feedbackRow.textContent = '💬 Feedback: ' + item.submission.feedback;
              section.appendChild(feedbackRow);
            }

            modal.appendChild(section);
          });

          var closeBtn = document.createElement('button');
          closeBtn.textContent = 'Close';
          closeBtn.style.cssText = 'padding:10px 24px;background:#4f46e5;color:white;border:0;border-radius:8px;font-weight:700;cursor:pointer;margin-top:8px;';
          closeBtn.addEventListener('click', function() {
            document.body.removeChild(overlay);
          });

          var btnWrapper = document.createElement('div');
          btnWrapper.style.display = 'flex';
          btnWrapper.style.justifyContent = 'flex-end';
          btnWrapper.appendChild(closeBtn);
          modal.appendChild(btnWrapper);

          overlay.appendChild(modal);
          document.body.appendChild(overlay);

          overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
              document.body.removeChild(overlay);
            }
          });
        }
      });

      document.getElementById('admin-task-list').addEventListener('click', function(e) {
        var target = e.target.closest('.delete');
        if (target && target.dataset.type === 'task') {
          var taskId = parseInt(target.dataset.id);
          if (confirm(tr('Delete this task?'))) deleteTask(taskId);
        }
      });

      document.getElementById('grade-task-modal-cancel').addEventListener('click', function() {
        document.getElementById('grade-task-modal-overlay').classList.remove('open');
      });
      document.getElementById('grade-task-modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) document.getElementById('grade-task-modal-overlay').classList.remove('open');
      });

      document.getElementById('grade-task-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (gradingTaskId === null || gradingStudentId === null) return;

        var grade = parseFloat(document.getElementById('grade-task-grade').value);
        if (isNaN(grade) || grade < 0 || grade > 100) {
          alert(tr('Please enter a valid grade between 0 and 100.'));
          return;
        }

        var feedback = document.getElementById('grade-task-feedback').value.trim();
        gradeSubmission(gradingTaskId, gradingStudentId, grade, feedback);
        document.getElementById('grade-task-modal-overlay').classList.remove('open');
        renderTasks();
      });

      addStudentBtn.addEventListener('click', function() { openModal('student', 'add'); });
      document.getElementById('add-budget-btn').addEventListener('click', function() { openModal('budget', 'add'); });
      document.getElementById('add-course-btn').addEventListener('click', function() { openModal('course', 'add'); });
      document.getElementById('edit-profile-btn').addEventListener('click', function() { openModal('profile', 'edit'); });

      document.getElementById('approval-table-body').addEventListener('click', function(e) {
        var target = e.target.closest('button');
        if (!target) return;
        var id = parseInt(target.dataset.id);
        if (target.classList.contains('approve-btn')) approveTeacher(id);
        else if (target.dataset.action === 'refuse') refuseTeacher(id);
      });
      var approvalSearch = document.getElementById('approval-search');
      if (approvalSearch) approvalSearch.addEventListener('input', renderApprovals);

      exportStudentsBtn.addEventListener('click', function() {
        var headers = ['Name', 'Email', 'Status', 'Enrolled Courses'];
        var data = students.map(function(s) {
          var enrolledIds = getEnrolledCourseIds(s.id);
          var courseNames = enrolledIds.map(function(id) { return getCourseName(id); }).join('; ');
          return [s.name, s.email, s.status, courseNames];
        });
        var csv = headers.join(',') + '\n';
        data.forEach(function(row) { csv += row.join(',') + '\n'; });
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'students.csv';
        a.click();
        URL.revokeObjectURL(url);
      });

      document.getElementById('export-budget-btn').addEventListener('click', function() {
        var headers = ['Category', 'Type', 'Amount', 'Date', 'Status'];
        var data = budgetEntries.map(function(b) {
          var amountDisplay = b.type === 'Income' ? '+' + b.amount : '-' + Math.abs(b.amount);
          return [b.category, b.type, '$' + amountDisplay, b.date, b.status];
        });
        var csv = headers.join(',') + '\n';
        data.forEach(function(row) { csv += row.join(',') + '\n'; });
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'budget.csv';
        a.click();
        URL.revokeObjectURL(url);
      });

      studentSearch.addEventListener('input', renderStudents);
      studentFilter.addEventListener('change', renderStudents);
      document.getElementById('budget-search').addEventListener('input', renderBudget);
      document.getElementById('budget-filter').addEventListener('change', renderBudget);
      document.getElementById('course-search').addEventListener('input', renderCourses);

      document.getElementById('modal-cancel').addEventListener('click', closeModal);
      document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
      });
      document.getElementById('modal-form').addEventListener('submit', handleModalSubmit);

      document.getElementById('enroll-modal-cancel').addEventListener('click', closeEnrollModal);
      document.getElementById('enroll-modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeEnrollModal();
      });
      document.getElementById('enroll-modal-save').addEventListener('click', saveEnrollments);

      loginPassword.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') loginForm.dispatchEvent(new Event('submit'));
      });
      registerPassword.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') registerForm.dispatchEvent(new Event('submit'));
      });

      // ----- TEST EVENTS -----
      document.getElementById('create-test-btn').addEventListener('click', function() {
        document.getElementById('test-modal-title').textContent = 'Create Test';
        document.getElementById('test-modal-sub').textContent = 'Build your test with multiple choice questions.';
        document.getElementById('test-modal-title-input').value = '';
        document.getElementById('test-modal-description').value = '';
        document.getElementById('test-modal-deadline').value = '';

        var courseSelect = document.getElementById('test-modal-course');
        courseSelect.innerHTML = '';
        courses.forEach(function(c) {
          var opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          courseSelect.appendChild(opt);
        });

        document.getElementById('questions-container').innerHTML = '';
        questionCounter = 0;
        document.getElementById('test-modal-overlay').classList.add('open');
        setLanguage(currentLang);
      });

      document.getElementById('add-question-btn').addEventListener('click', function() {
        var container = document.getElementById('questions-container');
        var qNum = questionCounter + 1;
        var div = document.createElement('div');
        div.className = 'question-builder';
        div.dataset.qIndex = questionCounter;

        // Create unique name for radio group
        var radioName = 'correct-' + questionCounter + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

        div.innerHTML =
          '<div class="question-header"><span class="q-number">Question ' + qNum +
          '</span><button type="button" class="remove-question" data-qindex="' + questionCounter +
          '">✕ Remove</button></div>' +
          '<input type="text" class="q-text-input" placeholder="Enter question text..." style="width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:6px;font-size:14px;" />' +
          '<div class="options-group">' +
          '<div class="option-item"><input type="radio" name="' + radioName +
          '" value="0" checked /><input type="text" class="option-input" placeholder="Option A" style="flex:1;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;" /></div>' +
          '<div class="option-item"><input type="radio" name="' + radioName +
          '" value="1" /><input type="text" class="option-input" placeholder="Option B" style="flex:1;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;" /></div>' +
          '<div class="option-item"><input type="radio" name="' + radioName +
          '" value="2" /><input type="text" class="option-input" placeholder="Option C" style="flex:1;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;" /></div>' +
          '<div class="option-item"><input type="radio" name="' + radioName +
          '" value="3" /><input type="text" class="option-input" placeholder="Option D" style="flex:1;padding:6px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;" /></div>' +
          '</div>';

        container.appendChild(div);

        div.querySelector('.remove-question').addEventListener('click', function() {
          div.remove();
          // Renumber remaining questions
          var questions = container.querySelectorAll('.question-builder');
          questions.forEach(function(q, idx) {
            q.querySelector('.q-number').textContent = 'Question ' + (idx + 1);
          });
        });

        questionCounter++;
        setLanguage(currentLang);
      });

      document.getElementById('test-modal-cancel').addEventListener('click', function() {
        document.getElementById('test-modal-overlay').classList.remove('open');
      });
      document.getElementById('test-modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) document.getElementById('test-modal-overlay').classList.remove('open');
      });

      document.getElementById('test-modal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var title = document.getElementById('test-modal-title-input').value.trim();
        var courseId = document.getElementById('test-modal-course').value;
        var description = document.getElementById('test-modal-description').value.trim();
        var deadline = document.getElementById('test-modal-deadline').value;

        if (!title || !courseId || !deadline) {
          alert(tr('Please fill in all required fields.'));
          return;
        }

        var questionDivs = document.querySelectorAll('.question-builder');
        if (questionDivs.length === 0) {
          alert(tr('Please add at least one question.'));
          return;
        }

        var questions = [];
        var valid = true;
        questionDivs.forEach(function(qDiv, index) {
          var qText = qDiv.querySelector('.q-text-input').value.trim();
          var options = qDiv.querySelectorAll('.option-input');
          var optionTexts = [];
          options.forEach(function(opt) { optionTexts.push(opt.value.trim()); });
          var correctRadio = qDiv.querySelector('input[type="radio"]:checked');
          var correctAnswer = correctRadio ? parseInt(correctRadio.value) : 0;

          if (!qText) { alert(tr('Please enter text for question') + ' ' + (index + 1) + '.'); valid = false; return; }
          if (optionTexts.some(function(opt) { return opt === ''; })) {
            alert(tr('Please fill in all options for question') + ' ' + (index + 1) + '.');
            valid = false;
            return;
          }

          questions.push({
            question: qText,
            options: optionTexts,
            correctAnswer: correctAnswer
          });
        });

        if (!valid) return;

        createTest(title, courseId, description, deadline, questions);
        document.getElementById('test-modal-overlay').classList.remove('open');
      });

      document.getElementById('take-test-cancel').addEventListener('click', function() {
        document.getElementById('take-test-modal-overlay').classList.remove('open');
      });
      document.getElementById('take-test-modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) document.getElementById('take-test-modal-overlay').classList.remove('open');
      });

      document.getElementById('take-test-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var testId = parseInt(this.dataset.testId);
        submitTest(testId);
      });

      // ----- Init -----
      loadData();
      setLanguage(currentLang);
      checkSession();
      setInterval(function() {
        cleanupExpiredMeetings();
      }, 30000);
