      // ============================================================
      //  TESTS
      // ============================================================
      // Tests live in the course Tests section now, so there is no standalone
      // tests page. This entry point only refreshes the studio section.
      function renderTests() {
        if (!currentUser) return;
        if (typeof renderStudioCurrentSection === 'function' && studio && studio.courseId) {
          renderStudioCurrentSection();
        }
      }

      function openTakeTestModal(testId) {
        var test = tests.find(function(t) { return t.id === testId; });
        if (!test) return;
        var questions = Array.isArray(test.questions) ? test.questions : [];
        if (!questions.length) {
          // A block test has no questions; it is answered inside the course.
          alert(tr('This test is made of interactive blocks. Open it from the course to start.'));
          return;
        }

        var titleEl = document.getElementById('take-test-title');
        var subEl = document.getElementById('take-test-sub');
        var container = document.getElementById('take-test-questions');
        var overlay = document.getElementById('take-test-modal-overlay');
        if (!container || !overlay) return;
        if (titleEl) titleEl.textContent = test.title || '';
        if (subEl) {
          subEl.textContent = (test.description || '') + ' · ' + questions.length + ' ' + tr('questions');
        }

        // A resubmission starts from the previous answers so "Review" is useful.
        var previous = testSubmissions[testId + '-' + (currentUser ? currentUser.id : '')];
        var prevAnswers = (previous && previous.answers) || {};

        container.innerHTML = '';
        questions.forEach(function(q, index) {
          var div = document.createElement('div');
          div.className = 'test-question';
          var opts = Array.isArray(q.options) ? q.options : [];
          var html = '<div class="q-text">' + (index + 1) + '. ' + escapeHtml(q.question || '') + '</div><div class="q-options">';
          opts.forEach(function(option, optIndex) {
            var letter = String.fromCharCode(65 + optIndex);
            var checked = prevAnswers[index] === optIndex ? ' checked' : '';
            html += '<label><input type="radio" name="q-' + index + '" value="' + optIndex + '"' + checked + ' /> ' +
              letter + '. ' + escapeHtml(option) + '</label>';
          });
          div.innerHTML = html + '</div>';
          container.appendChild(div);
        });

        overlay.classList.add('open');
        document.getElementById('take-test-form').dataset.testId = testId;
        setLanguage(currentLang);
      }

      // Reviews who has submitted a test. Tests are course sections now, so the
      // Course Studio Tests section calls this directly.
      function viewTestSubmissions(testId) {
        var test = tests.find(function(t) { return t.id === testId; });
        if (!test) return;

        var keys = Object.keys(testSubmissions).filter(function(key) {
          return key.indexOf(testId + '-') === 0;
        });
        if (!keys.length) {
          alert(tr('No submissions yet for this test.'));
          return;
        }

        var rows = keys.map(function(key) {
          var studentId = parseInt(key.split('-')[1], 10);
          var student = students.filter(function(s) { return s.id === studentId; })[0];
          var sub = testSubmissions[key];
          return {
            name: student ? student.name : tr('Student') + ' #' + studentId,
            score: typeof sub.score === 'number' ? sub.score : null,
            max: typeof sub.max === 'number' ? sub.max : null,
            answers: sub.answers || null
          };
        }).sort(function(a, b) { return a.name.localeCompare(b.name); });

        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';
        var modal = document.createElement('div');
        modal.style.cssText = 'max-width:640px;width:100%;max-height:90vh;overflow:auto;background:white;border-radius:18px;padding:24px;';

        var title = document.createElement('h2');
        title.textContent = tr('Submissions') + ': ' + test.title;
        title.style.marginTop = '0';
        modal.appendChild(title);

        var summary = document.createElement('p');
        summary.style.color = '#6b7280';
        summary.textContent = tr('Total') + ': ' + rows.length + ' ' + tr('submissions');
        modal.appendChild(summary);

        rows.forEach(function(r) {
          var card = document.createElement('div');
          card.style.cssText = 'padding:12px;margin-bottom:10px;border:1px solid #e5e7eb;border-radius:8px;';
          var head = document.createElement('div');
          head.textContent = r.name;
          head.style.fontWeight = '700';
          card.appendChild(head);
          var score = document.createElement('div');
          score.style.cssText = 'margin-top:4px;font-size:13px;color:#4b5563;';
          score.textContent = r.score !== null
            ? '🧩 ' + r.score + ' / ' + (r.max || 0) + ' ' + tr('points')
            : '📝 ' + tr('submitted');
          card.appendChild(score);
          modal.appendChild(card);
        });

        var closeBtn = document.createElement('button');
        closeBtn.textContent = tr('Close');
        closeBtn.style.cssText = 'padding:10px 24px;background:#4f46e5;color:white;border:0;border-radius:8px;font-weight:700;cursor:pointer;margin-top:8px;';
        closeBtn.addEventListener('click', function() { document.body.removeChild(overlay); });

        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;justify-content:flex-end;';
        wrap.appendChild(closeBtn);
        modal.appendChild(wrap);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
      }

      function submitTest(testId) {
        var test = tests.find(function(t) { return t.id === testId; });
        if (!test) return;
        var questions = Array.isArray(test.questions) ? test.questions : [];
        if (!questions.length) return;

        var studentId = currentUser.id;
        var answers = {};
        var allAnswered = true;

        questions.forEach(function(q, index) {
          var selected = document.querySelector('input[name="q-' + index + '"]:checked');
          if (selected) {
            answers[index] = parseInt(selected.value, 10);
          } else {
            allAnswered = false;
          }
        });

        if (!allAnswered) {
          alert(tr('Please answer all questions before submitting.'));
          return;
        }

        var correct = 0;
        questions.forEach(function(q, index) {
          if (answers[index] === q.correctAnswer) correct++;
        });
        var score = Math.round((correct / questions.length) * 100);

        var key = testId + '-' + studentId;
        var prev = testSubmissions[key] || {};
        testSubmissions[key] = {
          answers: answers,
          score: score,
          correct: correct,
          total: questions.length,
          submittedAt: new Date().toISOString(),
          // The teacher still owns the final mark, so a resubmission must not
          // wipe a grade that has already been given.
          grade: prev.grade === undefined ? null : prev.grade,
          feedback: prev.feedback || ''
        };

        saveData();
        var overlay = document.getElementById('take-test-modal-overlay');
        if (overlay) overlay.classList.remove('open');
        alert(tr('Test submitted successfully!') + ' ' + tr('Your Score') + ': ' + score + '%');
        renderTests();
        setLanguage(currentLang);
      }

      // `tests.length + 1` collides as soon as a test is deleted or ids were
      // never a dense 1..n, which silently overwrites another test's record.
      function nextTestId() {
        var max = 0;
        tests.forEach(function(t) {
          var n = parseInt(t.id, 10);
          if (!isNaN(n) && n > max) max = n;
        });
        return max + 1;
      }

      function createTest(title, courseId, description, deadline, questions) {
        tests.push({
          id: nextTestId(),
          title: title,
          courseId: parseInt(courseId, 10),
          description: description,
          deadline: deadline,
          questions: questions || [],
          published: true,
          teacherId: currentUser && currentUser.role === 'Teacher' ? currentUser.id : null,
          createdAt: new Date().toISOString().split('T')[0]
        });
        saveData();
        renderTests();
        alert(tr('Test created successfully!'));
        setLanguage(currentLang);
      }
