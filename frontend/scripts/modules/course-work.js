// ============================================================
//  COURSE WORK — the student side of the merged course sections
//
//  Tasks, assignments and tests used to have their own pages. They
//  are now sections of the course, so a student reaches them from the
//  course they are enrolled in and never from a separate menu.
//
//  Block documents (built in the Task Designer Suite) are rendered and
//  graded here with the same registry the Suite used, so a teacher
//  sees exactly what the student saw.
// ============================================================

  var COURSE_WORK = {
    open: {}
  };

  // ---------- lookup ----------

  function courseWorkTasks(courseId, section) {
    return courseWorkForStudent(courseId, section, currentUser.id);
  }

  function courseWorkTests(courseId) {
    return courseWorkForStudent(courseId, 'tests', currentUser.id);
  }

  // ---------- section shell ----------

  function renderStudentWorkSection(courseId, section, innerHtml, count) {
    var labels = {
      material: ['Material &amp; Tasks', '📎'],
      assignments: ['Assignments', '📝'],
      tests: ['Tests', '📋']
    };
    var pair = labels[section] || [section, '•'];
    return '<section class="course-section" data-course-section="' + section + '">' +
      '<div class="course-section-head"><h4>' + pair[1] + ' ' + pair[0] + '</h4>' +
      '<span class="pill">' + count + '</span></div>' +
      innerHtml + '</section>';
  }

  // ---------- item card ----------

  function courseWorkSubmission(itemId) {
    if (!currentUser) return null;
    return taskSubmissions[itemId + '-' + currentUser.id] || null;
  }

  function renderCourseWorkCard(item, section) {
    var sub = section === 'tests' ? (function() {
      return testSubmissions[item.id + '-' + currentUser.id] || null;
    })() : courseWorkSubmission(item.id);

    var hasBlocks = Array.isArray(item.blocks) && item.blocks.length > 0;
    var hostId = 'cw-host-' + section + '-' + item.id;
    var submitted = !!sub;
    var graded = sub && (sub.grade !== null && sub.grade !== undefined);

    var meta = [];
    if (item.deadline) {
      var overdue = item.deadline < new Date().toISOString().split('T')[0];
      meta.push('<span class="pill' + (overdue && !submitted ? ' danger' : '') + '">⏰ ' +
        escapeHtml(item.deadline) + '</span>');
    }
    if (item.priority) meta.push('<span class="studio-meta-chip">' + escapeHtml(item.priority) + '</span>');
    if (hasBlocks) {
      meta.push('<span class="studio-meta-chip">🧩 ' + item.blocks.length + ' ' + escapeHtml(tr('blocks')) + '</span>');
    }
    if (graded) {
      meta.push('<span class="pill success">✓ ' + escapeHtml(tr('graded')) + ' · ' + sub.grade + '</span>');
    } else if (sub) {
      if (sub.score !== null && sub.score !== undefined && sub.max) {
        meta.push('<span class="pill warning">📊 ' + sub.score + ' / ' + sub.max + '</span>');
      } else {
        meta.push('<span class="pill success">✓ ' + escapeHtml(tr('submitted')) + '</span>');
      }
    }

    var body = '';
    if (item.description) body += '<p class="course-work-desc">' + escapeHtml(item.description) + '</p>';

    // A test may still be the classic question list, a task may still be a
    // text answer. Only block documents get the interactive host.
    var hasQuestions = !hasBlocks && Array.isArray(item.questions) && item.questions.length > 0;
    if (hasBlocks) {
      body += '<div class="course-work-host" id="' + hostId + '" hidden></div>';
    } else if (hasQuestions) {
      // The classic question test is answered in the take-test modal, so the
      // card just previews what is inside and offers the button.
      body += '<div class="course-work-questions">' + item.questions.map(function(q, qi) {
        return '<div class="course-work-q"><span class="course-work-qn">' + (qi + 1) + '.</span> ' +
          escapeHtml(q.text || q.question || '') + '</div>';
      }).join('') + '</div>';
    } else {
      body += '<div class="course-work-answer"><textarea data-cw-text="' + item.id +
        '" placeholder="' + escapeHtml(tr('Write your answer here...')) + '">' +
        escapeHtml(sub ? (sub.answer || '') : '') + '</textarea></div>';
    }

    if (Array.isArray(item.files) && item.files.length) {
      body += '<div class="task-files"><strong>📎 ' + escapeHtml(tr('Attached files')) + ':</strong>' +
        item.files.map(function(f) {
          return '<div class="file-item"><span class="file-icon">📄</span><span class="file-link" onclick="window.openFilePreview(\'' +
            escapeHtml(f.name) + '\', \'' + String(f.data || '').replace(/'/g, "\\'") + '\')">' +
            escapeHtml(f.name) + '</span></div>';
        }).join('') + '</div>';
    }

    if (sub && sub.feedback) {
      body += '<div class="course-work-feedback"><strong>' + escapeHtml(tr('Teacher feedback')) + ':</strong> ' +
        escapeHtml(sub.feedback) + '</div>';
    }

    body += '<div class="course-work-actions">';
    if (hasBlocks) {
      body += '<button type="button" class="primary-button" data-cw-open="' + item.id + '" data-cw-section="' + section +
        '" data-cw-host="' + hostId + '">' + (submitted ? escapeHtml(tr('Review')) : escapeHtml(tr('Start'))) + '</button>';
    }
    if (hasQuestions) {
      // A classic question test is answered in the take-test modal.
      body += '<button type="button" class="primary-button" data-cw-take-test="' + item.id + '">' +
        escapeHtml(submitted ? tr('Review') : tr('Start')) + '</button>';
    } else {
      body += '<button type="button" class="' + (hasBlocks ? 'secondary-button' : 'primary-button') +
        '" data-cw-submit="' + item.id + '" data-cw-section="' + section + '" data-cw-host="' + hostId + '">' +
        escapeHtml(submitted ? tr('Submit again') : tr('Submit')) + '</button>';
    }
    body += '</div>';

    return '<article class="course course-work" data-cw-id="' + item.id + '" data-cw-kind="' + section + '">' +
      '<div class="course-body"><div class="course-work-meta">' + meta.join('') + '</div>' +
      '<h3>' + escapeHtml(item.title) + '</h3>' + body + '</div></article>';
  }

  function renderStudentCourseWork(courseId, section) {
    if (section === 'tests') {
      var list = courseWorkTests(courseId);
      if (!list.length) {
        return renderStudentWorkSection(courseId, 'tests',
          '<p class="empty-msg">' + escapeHtml(tr('No tests have been published for this course yet.')) + '</p>', 0);
      }
      return renderStudentWorkSection(courseId, 'tests',
        '<div class="course-grid course-work-grid">' + list.map(function(t) {
          return renderCourseWorkCard(t, 'tests');
        }).join('') + '</div>', list.length);
    }
    var items = courseWorkTasks(courseId, section);
    if (!items.length) {
      var msg = section === 'assignments'
        ? tr('No assignments have been published for this course yet.')
        : tr('No tasks have been published for this course yet.');
      return renderStudentWorkSection(courseId, section, '<p class="empty-msg">' + escapeHtml(msg) + '</p>', 0);
    }
    return renderStudentWorkSection(courseId, section,
      '<div class="course-grid course-work-grid">' + items.map(function(t) {
        return renderCourseWorkCard(t, section);
      }).join('') + '</div>', items.length);
  }

  // ---------- mounting blocks ----------

  function courseWorkItem(id, section) {
    if (section === 'tests') {
      return tests.filter(function(t) { return t.id === id; })[0] || null;
    }
    return tasks.filter(function(t) { return t.id === id; })[0] || null;
  }

  // Renders the block document once and keeps it mounted until the student
  // leaves the course, so answers survive tab switches inside the section.
  function openCourseWork(id, section, hostId) {
    var item = courseWorkItem(id, section);
    var host = document.getElementById(hostId);
    if (!item || !host) return;
    COURSE_WORK.open[hostId] = id;

    if (host.dataset.mounted === '1' && host.dataset.item === String(id)) {
      host.hidden = false;
      return;
    }
    stopTaskBlocks(host);
    host.innerHTML = renderTaskBlocks(item.blocks, { editing: false });
    mountTaskBlocks(host, item.blocks, { editing: false });
    host.dataset.mounted = '1';
    host.dataset.item = String(id);
    host.hidden = false;
  }

  // ---------- submitting ----------

  function submitCourseWork(id, section, hostId) {
    if (!currentUser) return;
    var item = courseWorkItem(id, section);
    if (!item) return;
    var host = document.getElementById(hostId);
    var key = id + '-' + currentUser.id;
    var hasBlocks = Array.isArray(item.blocks) && item.blocks.length > 0;

    var answers = null;
    var result = null;
    if (hasBlocks && host && host.dataset.mounted === '1') {
      answers = collectTaskAnswers(host, item.blocks);
      result = gradeTaskAnswers(item.blocks, answers);
    } else {
      var box = document.querySelector('[data-cw-text="' + id + '"]');
      var text = box ? box.value : '';
      if (!text.trim()) {
        alert(tr('Please write an answer first.'));
        return;
      }
    }

    var record;
    if (section === 'tests') {
      record = testSubmissions[key] || { answers: [], submittedAt: null, score: null, grade: null, feedback: '' };
      record.answers = answers ? answers : record.answers;
      record.blockAnswers = answers || null;
      record.submittedAt = new Date().toISOString();
      if (result) {
        record.score = result.score;
        record.max = result.max;
        record.blockDetail = result.detail;
      }
      // The teacher still owns the final mark, so `grade` is left alone.
      testSubmissions[key] = record;
    } else {
      record = taskSubmissions[key] || { answer: '', files: [], submittedAt: null, grade: null, feedback: '' };
      if (answers) {
        record.blockAnswers = answers;
        record.answer = '';
      } else {
        var box2 = document.querySelector('[data-cw-text="' + id + '"]');
        record.answer = box2 ? box2.value.trim() : '';
      }
      record.submittedAt = new Date().toISOString();
      if (result) {
        record.score = result.score;
        record.max = result.max;
        record.blockDetail = result.detail;
      }
      taskSubmissions[key] = record;
    }
    saveData();
    alert(result
      ? tr('Submitted. Your score:') + ' ' + result.score + ' / ' + result.max
      : tr('Submitted successfully!'));
    setLanguage(currentLang);
  }

  // ---------- answer drafts ----------

  function draftKeyFor(taskId, studentId) {
    return 'answer-' + taskId + '-' + studentId;
  }

  // A reload or a dropped connection must never lose a typed answer.
  function bindCourseWorkDrafts(root) {
    if (!root || !currentUser) return;
    var studentId = currentUser.id;
    root.querySelectorAll('textarea[data-cw-text]').forEach(function(box) {
      var taskId = parseInt(box.dataset.cwText, 10);
      if (isNaN(taskId)) return;
      var key = draftKeyFor(taskId, studentId);
      var saved = loadDraft(key);
      if (saved && saved.answer && !box.value) box.value = saved.answer;
      // localStorage writes are synchronous and block the main thread, so a
      // long answer used to stall the browser on every keystroke.
      var persist = debounce(function() {
        if (box.value.trim()) saveDraft(key, { answer: box.value, taskId: taskId });
        else clearDraft(key);
      }, 400);
      box.addEventListener('input', persist);
      // Commit the pending write before the page can be closed.
      box.addEventListener('blur', persist.flush);
    });
  }

  function clearCourseWorkDraft(taskId, studentId) {
    clearDraft(draftKeyFor(taskId, studentId));
  }

  // ---------- binding ----------

  function bindStudentCourseWork(root) {
    if (!root) return;
    bindCourseWorkDrafts(root);
    root.addEventListener('click', function(e) {
      var openBtn = e.target.closest('[data-cw-open]');
      if (openBtn) {
        openCourseWork(parseInt(openBtn.dataset.cwOpen, 10), openBtn.dataset.cwSection, openBtn.dataset.cwHost);
        return;
      }
      var takeBtn = e.target.closest('[data-cw-take-test]');
      if (takeBtn) {
        if (typeof openTakeTestModal === 'function') openTakeTestModal(parseInt(takeBtn.dataset.cwTakeTest, 10));
        return;
      }
      var submitBtn = e.target.closest('[data-cw-submit]');
      if (submitBtn) {
        var id = parseInt(submitBtn.dataset.cwSubmit, 10);
        submitCourseWork(id, submitBtn.dataset.cwSection, submitBtn.dataset.cwHost);
        // The answer is stored now, so the working copy is no longer needed.
        if (currentUser) clearCourseWorkDraft(id, currentUser.id);
      }
    });
  }

  // Section switcher for the student course view. Everything is rendered up
  // front so switching is instant and keeps answers in memory.
  function switchCourseSection(courseId, section) {
    var scope = document.querySelector('[data-course-sections="' + courseId + '"]');
    if (!scope) return;
    scope.querySelectorAll('[data-course-section-btn]').forEach(function(b) {
      b.classList.toggle('active', b.dataset.courseSectionBtn === section);
    });
    scope.querySelectorAll('[data-course-section-panel]').forEach(function(p) {
      p.hidden = p.dataset.courseSectionPanel !== section;
    });
  }

  // Tearing the blocks down matters: several of them keep timers and window
  // listeners, and the student view can be re-rendered at any time.
  function stopStudentCourseWork() {
    Object.keys(COURSE_WORK.open).forEach(function(hostId) {
      var host = document.getElementById(hostId);
      if (host) stopTaskBlocks(host);
    });
    COURSE_WORK.open = {};
  }
