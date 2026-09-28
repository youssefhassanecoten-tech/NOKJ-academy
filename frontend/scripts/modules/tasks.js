      // ============================================================
      //  TASKS
      //
      //  Tasks are course sections, not a page of their own. The list a
      //  teacher works with lives in the Course Studio, and a student reaches
      // their tasks through the course they are enrolled in.
      // ============================================================
      function renderTasks() {
        if (!currentUser) return;
        if (typeof renderStudioCurrentSection === 'function' && studio && studio.courseId) {
          renderStudioCurrentSection();
        }
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

      function nextTaskId() {
        var maxId = 0;
        tasks.forEach(function(t) {
          var n = parseInt(t.id);
          if (!isNaN(n) && n > maxId) maxId = n;
        });
        return maxId + 1;
      }

      function isTaskPublished(task) {
        return !!task && task.published !== false;
      }
      function isTaskDraft(task) {
        return !!task && task.published === false;
      }
      function setTaskPublished(task, published) {
        if (!task) return;
        task.published = !!published;
        task.publishedAt = published ? new Date().toISOString() : (task.publishedAt || null);
      }

      function createTask(title, type, description, deadline, priority, assignedTo, assignedIds, files, questions, published, courseId) {
        var task = {
          id: nextTaskId(),
          title: title,
          type: type,
          description: description,
          deadline: deadline,
          priority: priority || 'medium',
          assignedTo: assignedTo || 'all',
          assignedIds: assignedIds || [],
          files: files || [],
          questions: questions || [],
          // Tasks are sections of a course, so the owning course is recorded
          // explicitly. Older tasks fall back to the first assigned course.
          courseId: courseId !== undefined ? courseId : (assignedTo === 'course' && assignedIds && assignedIds.length ? assignedIds[0] : null),
          teacherId: currentUser && currentUser.role === 'Teacher' ? currentUser.id : null,
          createdAt: new Date().toISOString().split('T')[0]
        };
        if (published === false) {
          task.published = false;
          task.publishedAt = null;
        } else {
          task.published = true;
          task.publishedAt = new Date().toISOString();
        }
        tasks.push(task);
        saveData();
        renderTasks();
        alert(published === false ? tr('Task saved as draft.') : tr('Task created and deployed to students!'));
        setLanguage(currentLang);
        return task;
      }

      // Editing from a course section keeps the item inside its course, so the
      // owning course is never dropped while changing details.
      function updateTask(taskId, title, type, description, deadline, priority, assignedTo, assignedIds, files, questions, courseId) {
        var task = tasks.find(function(t) { return t.id === taskId; });
        if (!task) return null;
        if (!canManageTaskById(taskId)) return null;
        task.title = title;
        task.type = type;
        task.description = description;
        task.deadline = deadline;
        task.priority = priority || 'medium';
        task.assignedTo = assignedTo || 'all';
        task.assignedIds = assignedIds || [];
        if (courseId !== undefined && courseId !== null) {
          task.courseId = courseId;
          task.assignedTo = 'course';
          task.assignedIds = [courseId];
        }
        if (files && files.length) task.files = files;
        if (questions && questions.length) task.questions = questions;
        task.updatedAt = new Date().toISOString();
        saveData();
        renderTasks();
        setLanguage(currentLang);
        return task;
      }

      function canManageTaskById(taskId) {
        if (!currentUser) return false;
        if (currentUser.role === 'Admin') return true;
        if (currentUser.role !== 'Teacher') return false;
        var task = tasks.find(function(t) { return t.id === taskId; });
        if (!task) return false;
        if (task.teacherId === currentUser.id) return true;        if (typeof teacherOwnCourseIds === 'function' && task.assignedTo === 'course' && task.assignedIds &&
          task.assignedIds.some(function(id) { return teacherOwnCourseIds().indexOf(id) !== -1; })) return true;
        if (typeof teacherEnrolledStudentIds === 'function' && task.assignedTo === 'student' && task.assignedIds &&
          task.assignedIds.some(function(id) { return teacherEnrolledStudentIds().indexOf(id) !== -1; })) return true;
        return false;
      }

      function deleteTask(taskId) {
        if (!canManageTaskById(taskId)) {
          alert(tr('You can only remove your own tasks.'));
          return false;
        }
        tasks = tasks.filter(function(t) { return t.id !== taskId; });
        Object.keys(taskSubmissions).forEach(function(key) {
          if (key.indexOf(taskId + '-') === 0) delete taskSubmissions[key];
        });
        saveData();
        renderTasks();
        setLanguage(currentLang);
        return true;
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
