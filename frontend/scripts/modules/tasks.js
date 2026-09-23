      // ============================================================
      //  TASKS
      // ============================================================
      function renderTasks() {
        if (!currentUser) return;
        var isAdmin = currentUser.role === 'Admin';
        var isTeacher = currentUser.role === 'Teacher';
        var adminView = document.getElementById('admin-tasks-view');
        var studentView = document.getElementById('student-tasks-view');

        if (isAdmin || isTeacher) {
          adminView.style.display = 'block';
          studentView.style.display = 'none';
          renderAdminTasks();
        } else {
          adminView.style.display = 'none';
          studentView.style.display = 'block';
          renderStudentTasks();
        }
        setLanguage(currentLang);
      }

      function renderAdminTasks() {
        var search = document.getElementById('task-search').value.toLowerCase();
        var typeFilter = document.getElementById('task-type-filter').value;

        var filtered = tasks.filter(function(t) {
          var matchesSearch = t.title.toLowerCase().includes(search) || t.description.toLowerCase().includes(search);
          var matchesType = typeFilter === 'all' || t.type === typeFilter;
          return matchesSearch && matchesType;
        });

        var container = document.getElementById('admin-task-list');
        container.innerHTML = '';

        if (filtered.length === 0) {
          container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px;">No tasks found.</p>';
          return;
        }

        var totalTasks = tasks.length;
        var pendingCount = 0,
          submittedCount = 0,
          gradedCount = 0;
        tasks.forEach(function(task) {
          var submissions = Object.keys(taskSubmissions).filter(function(key) { return key.startsWith(task.id +
            '-'); });
          var graded = submissions.filter(function(key) {
            return taskSubmissions[key] && taskSubmissions[key].grade !== null && taskSubmissions[key].grade !==
            undefined;
          });
          if (graded.length === submissions.length && submissions.length > 0) { gradedCount++; } else if (submissions
            .length > 0) { submittedCount++; } else { pendingCount++; }
        });
        document.getElementById('task-total').textContent = totalTasks;
        document.getElementById('task-pending').textContent = pendingCount;
        document.getElementById('task-submitted').textContent = submittedCount;
        document.getElementById('task-graded').textContent = gradedCount;

        filtered.forEach(function(task) {
          var submissionKeys = Object.keys(taskSubmissions).filter(function(key) { return key.startsWith(task.id +
            '-'); });
          var totalStudents = students.length;
          var submittedCount = submissionKeys.length;

          var card = document.createElement('div');
          card.className = 'task-card';
          var deadlineClass = task.deadline < new Date().toISOString().split('T')[0] ? 'overdue' : 'on-time';
          var priorityLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' } [task.priority] || 'Medium';
          var priorityClass = task.priority || 'medium';

          var filesHtml = '';
          if (task.files && task.files.length > 0) {
            filesHtml = '<div class="task-files"><strong>📎 Attached Files:</strong>';
            task.files.forEach(function(file) {
              var fileData = file.data || '';
              var escapedData = fileData.replace(/'/g, "\\'");
              filesHtml += '<div class="file-item"><span class="file-icon">📄</span><span class="file-link" onclick="window.openFilePreview(\'' +
                file.name + '\', \'' + escapedData + '\')">' + file.name + '</span></div>';
            });
            filesHtml += '</div>';
          }

          card.innerHTML =
            '<div class="task-header"><div><h3>' + task.title + '</h3><div style="margin-top:4px;font-size:12px;color:var(--muted);">Assigned to: ' +
            (task.assignedTo === 'all' ? 'All Students' : 'Specific') +
            '</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><span class="task-priority ' +
            priorityClass + '">' + priorityLabel + '</span><span class="task-type ' + task.type + '">' + task.type
            .charAt(0).toUpperCase() + task.type.slice(1) + '</span></div></div>' +
            '<div class="task-body"><div class="task-description">' + task.description + '</div><div class="task-deadline ' +
            deadlineClass + '">⏰ Due: ' + task.deadline + (deadlineClass === 'overdue' ? ' (Overdue!)' : '') +
            '</div>' + filesHtml +
            '<div style="margin-top:8px;font-size:12px;color:var(--muted);">📊 ' + submittedCount + ' / ' +
            totalStudents + ' students submitted</div></div>' +
            '<div class="task-footer"><button class="secondary-button view-submissions-btn" data-task="' + task.id +
            '">📋 View Submissions (' + submittedCount + ')</button><button class="action-btn delete" data-id="' +
            task.id + '" data-type="task">🗑️ Delete</button></div>';
          container.appendChild(card);
        });
        setLanguage(currentLang);
      }

      function renderStudentTasks() {
        var studentId = currentUser.id;
        var container = document.getElementById('student-task-list');
        var assignedTasks = tasks.filter(function(task) {
          if (task.assignedTo === 'all') return true;
          if (task.assignedTo === 'student') return task.assignedIds && task.assignedIds.includes(studentId);
          if (task.assignedTo === 'course') {
            var studentCourses = getEnrolledCourseIds(studentId);
            return task.assignedIds && task.assignedIds.some(function(cid) { return studentCourses.includes(cid); });
          }
          return false;
        });

        var pendingCount = 0,
          submittedCount = 0,
          gradedCount = 0;
        assignedTasks.forEach(function(task) {
          var key = task.id + '-' + studentId;
          var sub = taskSubmissions[key];
          if (sub && sub.grade !== null && sub.grade !== undefined) gradedCount++;
          else if (sub) submittedCount++;
          else pendingCount++;
        });

        document.getElementById('student-task-total').textContent = assignedTasks.length;
        document.getElementById('student-task-pending').textContent = pendingCount;
        document.getElementById('student-task-submitted').textContent = submittedCount;
        document.getElementById('student-task-graded').textContent = gradedCount;

        container.innerHTML = '';

        if (assignedTasks.length === 0) {
          container.innerHTML =
            '<p style="color:var(--muted);text-align:center;padding:40px;">No tasks assigned to you yet.</p>';
          return;
        }

        assignedTasks.sort(function(a, b) {
          var aOverdue = a.deadline < new Date().toISOString().split('T')[0];
          var bOverdue = b.deadline < new Date().toISOString().split('T')[0];
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          return a.deadline.localeCompare(b.deadline);
        });

        assignedTasks.forEach(function(task) {
          var key = task.id + '-' + studentId;
          var submission = taskSubmissions[key];
          var status = submission ? (submission.grade !== null && submission.grade !== undefined ? 'graded' :
            'submitted') : 'pending';
          var deadlineClass = task.deadline < new Date().toISOString().split('T')[0] ? 'overdue' : 'on-time';
          var priorityLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' } [task.priority] || 'Medium';
          var priorityClass = task.priority || 'medium';

          var filesHtml = '';
          if (task.files && task.files.length > 0) {
            filesHtml = '<div class="task-files"><strong>📎 Attached Files:</strong>';
            task.files.forEach(function(file) {
              var fileData = file.data || '';
              var escapedData = fileData.replace(/'/g, "\\'");
              filesHtml += '<div class="file-item"><span class="file-icon">📄</span><span class="file-link" onclick="window.openFilePreview(\'' +
                file.name + '\', \'' + escapedData + '\')">' + file.name + '</span></div>';
            });
            filesHtml += '</div>';
          }

          var card = document.createElement('div');
          card.className = 'task-card';

          var statusDisplay = '';
          var footerHtml = '';

          if (status === 'graded') {
            statusDisplay = '<span class="graded-status">✅ Graded: ' + submission.grade + '%</span>';
            footerHtml = '<div class="graded-status">✅ Graded: ' + submission.grade + '%</div>' + (submission
              .feedback ? '<div style="font-size:12px;color:var(--muted);">📝 ' + submission.feedback + '</div>' :
              '');
          } else if (status === 'submitted') {
            statusDisplay = '<span class="submitted-status">⏳ Submitted</span>';
            footerHtml =
              '<div class="submitted-status">⏳ Submitted</div><div style="font-size:12px;color:var(--muted);">Waiting for grading...</div>';
            if (submission.files && submission.files.length > 0) {
              var fileLinks = '';
              submission.files.forEach(function(file) {
                var fileData = file.data || '';
                var escapedData = fileData.replace(/'/g, "\\'");
                fileLinks += '<span class="item-tag" style="cursor:pointer;color:var(--primary);text-decoration:underline;margin-right:6px;" onclick="window.openFilePreview(\'' +
                  file.name + '\', \'' + escapedData + '\')">📄 ' + file.name + '</span>';
              });
              footerHtml += '<div style="font-size:12px;color:var(--muted);margin-top:4px;">📎 ' + fileLinks +
                '</div>';
            }
          } else {
            statusDisplay = '<span class="pill danger">⚠️ Pending</span>';
            footerHtml =
              '<input type="text" class="answer-input" id="answer-' + task.id + '" placeholder="Enter your answer..." />' +
              '<input type="file" id="file-' + task.id + '" style="display:none;" multiple />' +
              '<button class="file-upload-btn" onclick="document.getElementById(\'file-' + task.id +
              '\').click()">📎 Upload Files</button>' +
              '<span id="file-name-' + task.id + '" class="file-name">No files chosen</span>' +
              '<button class="submit-btn" data-task="' + task.id + '">Submit</button>';
          }

          card.innerHTML =
            '<div class="task-header"><div><h3>' + task.title + '</h3><div style="margin-top:4px;font-size:12px;color:var(--muted);">' +
            task.type.charAt(0).toUpperCase() + task.type.slice(1) +
            '</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><span class="task-priority ' +
            priorityClass + '">' + priorityLabel + '</span>' + statusDisplay + '</div></div>' +
            '<div class="task-body"><div class="task-description">' + task.description + '</div><div class="task-deadline ' +
            deadlineClass + '">⏰ Due: ' + task.deadline + (deadlineClass === 'overdue' ? ' ⚠️ Overdue!' : '') +
            '</div>' + filesHtml + '</div>' +
            '<div class="task-footer">' + footerHtml + '</div>';
          container.appendChild(card);

          var fileInput = document.getElementById('file-' + task.id);
          if (fileInput) {
            fileInput.addEventListener('change', function(e) {
              var fileNameSpan = document.getElementById('file-name-' + task.id);
              if (e.target.files && e.target.files.length > 0) {
                var names = Array.from(e.target.files).map(function(f) { return f.name; }).join(', ');
                fileNameSpan.textContent = names;
                var key = task.id + '-' + studentId;
                if (!taskSubmissions[key]) {
                  taskSubmissions[key] = { answer: '', submittedAt: null, grade: null, feedback: null,
                    files: [] };
                }
                var filesData = [];
                var completed = 0;
                Array.from(e.target.files).forEach(function(file, index) {
                  var reader = new FileReader();
                  reader.onload = function(event) {
                    filesData[index] = { name: file.name, size: file.size, type: file.type,
                      data: event.target.result };
                    completed++;
                    if (completed === e.target.files.length) {
                      taskSubmissions[key].files = filesData;
                      saveData();
                    }
                  };
                  reader.readAsDataURL(file);
                });
              } else {
                fileNameSpan.textContent = 'No files chosen';
              }
            });
          }
        });
        setLanguage(currentLang);
      }
      // ============================================================
      //  GRADE TASK MODAL
      // ============================================================
      function openGradeModal(taskId, studentId) {
        gradingTaskId = taskId;
        gradingStudentId = studentId;
        var key = taskId + '-' + studentId;
        var submission = taskSubmissions[key];
        if (!submission) return;

        var task = tasks.find(function(t) { return t.id === taskId; });
        var student = students.find(function(s) { return s.id === studentId; });
        if (!task || !student) return;

        document.getElementById('grade-task-student-name').value = student.name;
        document.getElementById('grade-task-task-title').value = task.title;
        document.getElementById('grade-task-submission-text').value = submission.answer || 'No answer provided.';
        document.getElementById('grade-task-grade').value = submission.grade || '';
        document.getElementById('grade-task-feedback').value = submission.feedback || '';

        var fileContainer = document.getElementById('grade-task-submission-file');
        if (submission.files && submission.files.length > 0) {
          var html = '<strong>📎 Submission Files:</strong><div style="margin-top:4px;">';
          submission.files.forEach(function(file) {
            var fileData = file.data || '';
            var escapedData = fileData.replace(/'/g, "\\'");
            html += '<span class="item-tag" style="display:inline-block;padding:2px 8px;margin:2px;background:#f3f4f6;border-radius:4px;font-size:12px;cursor:pointer;color:var(--primary);text-decoration:underline;" onclick="window.openFilePreview(\'' +
              file.name + '\', \'' + escapedData + '\')">📄 ' + file.name + '</span>';
          });
          html += '</div>';
          fileContainer.innerHTML = html;
        } else {
          fileContainer.innerHTML = '<span style="color:var(--muted);font-size:12px;">No files uploaded.</span>';
        }

        document.getElementById('grade-task-modal-overlay').classList.add('open');
        setLanguage(currentLang);
      }

      function gradeSubmission(taskId, studentId, grade, feedback) {
        var key = taskId + '-' + studentId;
        if (taskSubmissions[key]) {
          taskSubmissions[key].grade = Math.min(100, Math.max(0, Math.round(parseFloat(grade))));
          taskSubmissions[key].feedback = feedback || '';
          saveData();
          renderTasks();
          alert(tr('Grade saved successfully!'));
          setLanguage(currentLang);
        }
      }

      function createTask(title, type, description, deadline, priority, assignedTo, assignedIds, files) {
        tasks.push({
          id: tasks.length + 1,
          title: title,
          type: type,
          description: description,
          deadline: deadline,
          priority: priority || 'medium',
          assignedTo: assignedTo || 'all',
          assignedIds: assignedIds || [],
          files: files || [],
          createdAt: new Date().toISOString().split('T')[0]
        });
        saveData();
        renderTasks();
        alert(tr('Task created successfully!'));
        setLanguage(currentLang);
      }

      function deleteTask(taskId) {
        tasks = tasks.filter(function(t) { return t.id !== taskId; });
        Object.keys(taskSubmissions).forEach(function(key) {
          if (key.startsWith(taskId + '-')) delete taskSubmissions[key];
        });
        saveData();
        renderTasks();
        setLanguage(currentLang);
      }

      function submitTaskAnswer(taskId, studentId, answer, files) {
        var key = taskId + '-' + studentId;
        if (!taskSubmissions[key]) {
          taskSubmissions[key] = { answer: '', submittedAt: null, grade: null, feedback: null, files: [] };
        }
        taskSubmissions[key].answer = answer;
        taskSubmissions[key].submittedAt = new Date().toISOString();
        if (files && files.length > 0) {
          taskSubmissions[key].files = files;
        }
        saveData();
        renderTasks();
        alert(tr('Task submitted!'));
        setLanguage(currentLang);
      }
      function updateTaskFileList() {
        var list = document.getElementById('task-file-list');
        list.innerHTML = '';
        tempTaskFiles.forEach(function(file, index) {
          var tag = document.createElement('span');
          tag.className = 'file-tag';
          tag.innerHTML = '📄 ' + file.name + ' <span class="remove-file" data-index="' + index + '">✕</span>';
          list.appendChild(tag);
        });
        list.querySelectorAll('.remove-file').forEach(function(el) {
          el.addEventListener('click', function() {
            var index = parseInt(this.dataset.index);
            tempTaskFiles.splice(index, 1);
            updateTaskFileList();
          });
        });
      }
