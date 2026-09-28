// ============================================================
//  TASK DESIGNER (teacher-only)
//
//  A dedicated builder for tasks. Two distinct commit paths:
//    Save only        -> draft, visible to the teacher alone
//    Save and deploy  -> published, immediately visible to students
//    Cancel           -> discard, no write
// ============================================================
      var taskDesignerState = null;

      function isTaskDesignerOpen() {
        var panel = document.getElementById('task-designer-panel');
        return !!(panel && panel.style.display !== 'none' && taskDesignerState);
      }

      // Only Teachers (and Admin, who can manage everything) get the designer.
      function canOpenTaskDesigner() {
        if (!currentUser) return false;
        return currentUser.role === 'Teacher' || currentUser.role === 'Admin';
      }

      function openTaskDesigner(taskId) {
        if (!canOpenTaskDesigner()) return;
        if (taskId !== undefined && taskId !== null) {
          if (!canManageTaskById(taskId)) {
            alert(tr('You can only edit your own tasks.'));
            return;
          }
        }
        var existing = (taskId === undefined || taskId === null) ? null :
          tasks.find(function(t) { return t.id === taskId; });

        taskDesignerState = {
          editingId: existing ? existing.id : null,
          questions: existing && existing.questions ? existing.questions.map(function(q) {
            return {
              type: q.type || 'mcq',
              question: q.question || '',
              options: (q.options || []).slice(0, 4),
              correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : -1
            };
          }) : []
        };

        var panel = document.getElementById('task-designer-panel');
        if (!panel) return;
        panel.style.display = 'block';

        document.getElementById('task-designer-title').textContent =
          existing ? tr('Edit Task') : tr('Design a Task');
        document.getElementById('task-designer-sub').textContent = existing ?
          tr('Update the task, then save it as a draft or deploy it to students.') :
          tr('Build your task, then save it as a draft or deploy it to students.');

        document.getElementById('task-d-title').value = existing ? existing.title : '';
        document.getElementById('task-d-type').value = existing ? existing.type : 'homework';
        document.getElementById('task-d-priority').value = existing ? (existing.priority || 'medium') : 'medium';
        document.getElementById('task-d-description').value = existing ? (existing.description || '') : '';
        document.getElementById('task-d-deadline').value = existing ? (existing.deadline || '') : '';
        document.getElementById('task-d-assign').value = existing ? (existing.assignedTo || 'all') : 'all';

        renderTaskDesignerAssignOptions(existing);
        renderTaskDesignerQuestions();
        syncTaskDesignerQuestionSection();
        renderTaskDesignerFiles(existing ? (existing.files || []) : []);

        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setLanguage(currentLang);
      }

      function closeTaskDesigner() {
        var panel = document.getElementById('task-designer-panel');
        if (panel) panel.style.display = 'none';
        taskDesignerState = null;
      }

      function renderTaskDesignerAssignOptions(existing) {
        var wrap = document.getElementById('task-d-assign-options');
        if (!wrap) return;
        var mode = document.getElementById('task-d-assign').value;
        wrap.style.display = mode === 'all' ? 'none' : 'block';
        var selected = existing && existing.assignedIds ? existing.assignedIds : [];

        if (mode === 'all') { wrap.innerHTML = ''; return; }

        if (mode === 'course') {
          var myCourses = (currentUser.role === 'Admin' ? courses.slice() :
            courses.filter(function(c) { return c.teacherId === currentUser.id; }));
          if (!myCourses.length) {
            wrap.innerHTML = '<p class="task-d-empty">' + tr('You have no courses yet.') + '</p>';
            return;
          }
          wrap.innerHTML = myCourses.map(function(c) {
            return '<label class="task-d-check"><input type="checkbox" class="task-d-assign-checkbox" value="' + c.id +
              '"' + (selected.indexOf(c.id) !== -1 ? ' checked' : '') + ' /> ' + escapeHtml(c.name) + '</label>';
          }).join('');
        } else {
          var myStudents = typeof teacherEnrolledStudentIds === 'function' ? teacherEnrolledStudentIds() : [];
          if (!myStudents.length) {
            wrap.innerHTML = '<p class="task-d-empty">' + tr('You have no students yet.') + '</p>';
            return;
          }
          wrap.innerHTML = myStudents.map(function(id) {
            var s = students.find(function(x) { return x.id === id; });
            if (!s) return '';
            return '<label class="task-d-check"><input type="checkbox" class="task-d-assign-checkbox" value="' + s.id +
              '"' + (selected.indexOf(s.id) !== -1 ? ' checked' : '') + ' /> ' + escapeHtml(s.name) + '</label>';
          }).join('');
        }
      }

      function syncTaskDesignerQuestionSection() {
        var type = document.getElementById('task-d-type').value;
        var section = document.getElementById('task-d-questions');
        if (section) section.style.display = type === 'interactive' ? 'block' : 'none';
      }

      function renderTaskDesignerFiles(files) {
        var wrap = document.getElementById('task-d-files');
        if (!wrap) return;
        taskDesignerState.files = files || [];
        if (!taskDesignerState.files.length) {
          wrap.innerHTML = '<p class="task-d-empty">' + tr('No files attached.') + '</p>';
          return;
        }
        wrap.innerHTML = taskDesignerState.files.map(function(f, i) {
          return '<div class="task-d-file"><span>📄 ' + escapeHtml(f.name) + '</span>' +
            '<button type="button" class="task-d-file-remove" data-index="' + i + '">✕</button></div>';
        }).join('');
      }

      function renderTaskDesignerQuestions() {
        var wrap = document.getElementById('task-d-questions-list');
        if (!wrap) return;
        if (!taskDesignerState.questions.length) {
          wrap.innerHTML = '<p class="task-d-empty">' + tr('No questions yet.') + '</p>';
          return;
        }
        wrap.innerHTML = taskDesignerState.questions.map(function(q, i) {
          var isMcq = q.type !== 'text';
          var opts = '';
          if (isMcq) {
            opts = '<div class="task-d-options">' + [0, 1, 2, 3].map(function(o) {
              var val = (q.options[o] || '');
              var letter = String.fromCharCode(65 + o);
              return '<div class="task-d-option-row">' +
                '<label class="task-d-radio"><input type="radio" name="q-correct-' + i + '" value="' + o + '"' +
                (q.correctAnswer === o ? ' checked' : '') + ' /><span>' + letter + '</span></label>' +
                '<input type="text" class="task-d-option-input" data-q="' + i + '" data-o="' + o +
                '" value="' + escapeHtml(val) + '" placeholder="' + tr('Option') + ' ' + letter + '" /></div>';
            }).join('') + '</div>';
          }
          return '<div class="task-d-question" data-index="' + i + '">' +
            '<div class="task-d-q-head"><strong>' + tr('Question') + ' ' + (i + 1) + '</strong>' +
            '<div style="display:flex;gap:6px;">' +
            '<select class="task-d-q-type" data-q="' + i + '"><option value="mcq"' + (isMcq ? ' selected' : '') +
            '>MCQ</option><option value="text"' + (isMcq ? '' : ' selected') + '>Short Text</option></select>' +
            '<button type="button" class="task-d-q-remove" data-index="' + i + '">✕</button></div></div>' +
            '<input type="text" class="task-d-q-text" data-q="' + i + '" value="' + escapeHtml(q.question || '') +
            '" placeholder="' + tr('Enter your question...') + '" />' + opts + '</div>';
        }).join('');
      }

      function addTaskDesignerQuestion() {
        if (!taskDesignerState) return;
        taskDesignerState.questions.push({ type: 'mcq', question: '', options: ['', '', '', ''], correctAnswer: 0 });
        renderTaskDesignerQuestions();
      }

      // Reads the live DOM back into state so nothing is lost on re-render.
      function captureTaskDesignerQuestions() {
        if (!taskDesignerState) return;
        document.querySelectorAll('#task-d-questions-list .task-d-question').forEach(function(node) {
          var i = parseInt(node.getAttribute('data-index'), 10);
          if (isNaN(i) || !taskDesignerState.questions[i]) return;
          var textInput = node.querySelector('.task-d-q-text');
          if (textInput) taskDesignerState.questions[i].question = textInput.value;
          var typeSelect = node.querySelector('.task-d-q-type');
          if (typeSelect) taskDesignerState.questions[i].type = typeSelect.value;
          var checked = node.querySelector('input[type="radio"]:checked');
          if (checked) taskDesignerState.questions[i].correctAnswer = parseInt(checked.value, 10);
          node.querySelectorAll('.task-d-option-input').forEach(function(inp) {
            var q = parseInt(inp.getAttribute('data-q'), 10);
            var o = parseInt(inp.getAttribute('data-o'), 10);
            if (taskDesignerState.questions[q]) taskDesignerState.questions[q].options[o] = inp.value;
          });
        });
      }

      function collectTaskDesignerQuestions() {
        captureTaskDesignerQuestions();
        if (document.getElementById('task-d-type').value !== 'interactive') return [];
        var out = [];
        for (var i = 0; i < taskDesignerState.questions.length; i++) {
          var q = taskDesignerState.questions[i];
          if (!q.question.trim()) {
            alert(tr('Please enter text for question') + ' ' + (i + 1) + '.');
            return null;
          }
          if (q.type === 'mcq') {
            if (q.options.some(function(o) { return !String(o).trim(); })) {
              alert(tr('Please fill in all options for question') + ' ' + (i + 1) + '.');
              return null;
            }
            if (q.correctAnswer < 0) {
              alert(tr('Select correct answer letter.'));
              return null;
            }
            out.push({ type: 'mcq', question: q.question.trim(), options: q.options.map(function(o) { return String(o).trim(); }),
              correctAnswer: q.correctAnswer });
          } else {
            out.push({ type: 'text', question: q.question.trim(), options: [], correctAnswer: -1 });
          }
        }
        if (!out.length) {
          alert(tr('Please add at least one question.'));
          return null;
        }
        return out;
      }

      function readTaskDesignerForm() {
        var assignTo = document.getElementById('task-d-assign').value;
        var assignedIds = [];
        if (assignTo !== 'all') {
          document.querySelectorAll('#task-d-assign-options .task-d-assign-checkbox:checked').forEach(function(cb) {
            assignedIds.push(parseInt(cb.value, 10));
          });
          if (!assignedIds.length) {
            alert(tr('Please select at least one') + ' ' + (assignTo === 'course' ? tr('Course') : tr('Student')) + '.');
            return null;
          }
        }
        return {
          title: document.getElementById('task-d-title').value.trim(),
          type: document.getElementById('task-d-type').value,
          description: document.getElementById('task-d-description').value.trim(),
          deadline: document.getElementById('task-d-deadline').value,
          priority: document.getElementById('task-d-priority').value,
          assignedTo: assignTo,
          assignedIds: assignedIds,
          files: taskDesignerState ? (taskDesignerState.files || []).slice() : []
        };
      }

      // The single commit path behind both Save only and Save and deploy.
      function saveTaskFromDesigner(deploy) {
        if (!canOpenTaskDesigner() || !taskDesignerState) return;
        var data = readTaskDesignerForm();
        if (!data) return;
        if (!data.title || !data.description || !data.deadline) {
          alert(tr('Please fill in all required fields.'));
          return;
        }
        var questions = collectTaskDesignerQuestions();
        if (questions === null) return;

        if (taskDesignerState.editingId !== null) {
          var task = tasks.find(function(t) { return t.id === taskDesignerState.editingId; });
          if (!task || !canManageTaskById(task.id)) {
            alert(tr('You can only edit your own tasks.'));
            return;
          }
          task.title = data.title;
          task.type = data.type;
          task.description = data.description;
          task.deadline = data.deadline;
          task.priority = data.priority;
          task.assignedTo = data.assignedTo;
          task.assignedIds = data.assignedIds;
          task.files = data.files;
          task.questions = questions;
          setTaskPublished(task, deploy);
          saveData();
          alert(deploy ? tr('Task updated and deployed to students!') : tr('Task updated and saved as draft.'));
        } else {
          createTask(data.title, data.type, data.description, data.deadline, data.priority, data.assignedTo,
            data.assignedIds, data.files, questions, deploy);
        }
        closeTaskDesigner();
        renderTasks();
        setLanguage(currentLang);
      }

      function bindTaskDesigner() {
        var openBtn = document.getElementById('open-task-designer-btn');
        if (openBtn) openBtn.addEventListener('click', function() { openTaskDesigner(); });

        var closeBtn = document.getElementById('task-designer-close');
        if (closeBtn) closeBtn.addEventListener('click', closeTaskDesigner);

        var cancelBtn = document.getElementById('task-d-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeTaskDesigner);

        var saveDraftBtn = document.getElementById('task-d-save');
        if (saveDraftBtn) saveDraftBtn.addEventListener('click', function() { saveTaskFromDesigner(false); });

        var deployBtn = document.getElementById('task-d-deploy');
        if (deployBtn) deployBtn.addEventListener('click', function() { saveTaskFromDesigner(true); });

        var typeSel = document.getElementById('task-d-type');
        if (typeSel) typeSel.addEventListener('change', function() {
          captureTaskDesignerQuestions();
          syncTaskDesignerQuestionSection();
        });

        var assignSel = document.getElementById('task-d-assign');
        if (assignSel) assignSel.addEventListener('change', function() {
          var mode = assignSel.value;
          document.getElementById('task-d-assign-options').style.display = mode === 'all' ? 'none' : 'block';
          renderTaskDesignerAssignOptions({
            assignedIds: Array.prototype.slice.call(
              document.querySelectorAll('#task-d-assign-options .task-d-assign-checkbox:checked')
            ).map(function(cb) { return parseInt(cb.value, 10); })
          });
        });

        var addQ = document.getElementById('task-d-add-question');
        if (addQ) addQ.addEventListener('click', function() {
          captureTaskDesignerQuestions();
          addTaskDesignerQuestion();
        });

        var list = document.getElementById('task-d-questions-list');
        if (list) {
          list.addEventListener('click', function(e) {
            var rm = e.target.closest('.task-d-q-remove');
            if (rm) {
              captureTaskDesignerQuestions();
              var i = parseInt(rm.getAttribute('data-index'), 10);
              taskDesignerState.questions.splice(i, 1);
              renderTaskDesignerQuestions();
              return;
            }
          });
          list.addEventListener('change', function(e) {
            if (e.target.classList.contains('task-d-q-type')) {
              captureTaskDesignerQuestions();
              renderTaskDesignerQuestions();
            }
          });
        }

        var filesWrap = document.getElementById('task-d-files');
        if (filesWrap) {
          filesWrap.addEventListener('click', function(e) {
            var rm = e.target.closest('.task-d-file-remove');
            if (rm && taskDesignerState) {
              var i = parseInt(rm.getAttribute('data-index'), 10);
              taskDesignerState.files.splice(i, 1);
              renderTaskDesignerFiles(taskDesignerState.files);
            }
          });
        }

        var fileInput = document.getElementById('task-d-file-input');
        if (fileInput) {
          fileInput.addEventListener('change', function(e) {
            var chosen = Array.from(e.target.files);
            if (!chosen.length || !taskDesignerState) return;
            var pending = chosen.length;
            chosen.forEach(function(file) {
              var reader = new FileReader();
              reader.onload = function(ev) {
                taskDesignerState.files.push({ name: file.name, data: ev.target.result });
                if (--pending === 0) renderTaskDesignerFiles(taskDesignerState.files);
              };
              reader.readAsDataURL(file);
            });
            e.target.value = '';
          });
        }
      }
