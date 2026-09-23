      // ============================================================
      //  TESTS
      // ============================================================
      function renderTests() {
        if (!currentUser) return;
        var isAdmin = currentUser.role === 'Admin';
        var isTeacher = currentUser.role === 'Teacher';
        var adminView = document.getElementById('admin-tests-view');
        var studentView = document.getElementById('student-tests-view');

        if (isAdmin || isTeacher) {
          adminView.style.display = 'block';
          studentView.style.display = 'none';
          renderAdminTests();
        } else {
          adminView.style.display = 'none';
          studentView.style.display = 'block';
          renderStudentTests();
        }
        setLanguage(currentLang);
      }

      function renderAdminTests() {
        var container = document.getElementById('admin-test-list');
        container.innerHTML = '';

        if (tests.length === 0) {
          container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px;">No tests created yet.</p>';
          return;
        }

        tests.forEach(function(test) {
          var card = document.createElement('div');
          card.className = 'task-card';
          var subCount = Object.keys(testSubmissions).filter(function(key) { return key.startsWith(test.id + '-'); })
            .length;

          card.innerHTML =
            '<div class="task-header"><div><h3>' + test.title + '</h3><div style="margin-top:4px;font-size:12px;color:var(--muted);">' +
            getCourseName(test.courseId) + ' · ' + test.questions.length + ' questions</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><span class="task-type test">Test</span></div></div>' +
            '<div class="task-body"><div class="task-description">' + test.description + '</div><div class="task-deadline on-time">⏰ Due: ' +
            test.deadline + '</div><div style="margin-top:8px;font-size:12px;color:var(--muted);">📊 ' + subCount +
            ' submissions</div></div>' +
            '<div class="task-footer"><button class="secondary-button view-test-results" data-test="' + test.id +
            '">📊 View Results</button><button class="action-btn delete" data-id="' + test.id +
            '" data-type="test">🗑️ Delete</button></div>';
          container.appendChild(card);
        });

        container.querySelectorAll('.view-test-results').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var testId = parseInt(this.dataset.test);
            viewTestResults(testId);
          });
        });

        container.querySelectorAll('.delete[data-type="test"]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var testId = parseInt(this.dataset.id);
            if (confirm('Delete this test?')) {
              tests = tests.filter(function(t) { return t.id !== testId; });
              Object.keys(testSubmissions).forEach(function(key) {
                if (key.startsWith(testId + '-')) delete testSubmissions[key];
              });
              saveData();
              renderTests();
            }
          });
        });
        setLanguage(currentLang);
      }

      function renderStudentTests() {
        var studentId = currentUser.id;
        var container = document.getElementById('student-test-list');
        var enrolledCourses = getEnrolledCourseIds(studentId);

        var assignedTests = tests.filter(function(test) {
          return enrolledCourses.includes(test.courseId);
        });

        container.innerHTML = '';

        if (assignedTests.length === 0) {
          container.innerHTML =
            '<p style="color:var(--muted);text-align:center;padding:40px;">No tests assigned to you yet.</p>';
          return;
        }

        assignedTests.forEach(function(test) {
          var key = test.id + '-' + studentId;
          var submission = testSubmissions[key];
          var status = submission ? 'submitted' : 'pending';
          var score = submission ? submission.score : null;

          var card = document.createElement('div');
          card.className = 'task-card';
          var deadlineClass = test.deadline < new Date().toISOString().split('T')[0] ? 'overdue' : 'on-time';

          var actionHtml = '';
          if (status === 'submitted') {
            actionHtml = '<div><span class="submitted-status">✅ Submitted</span>' +
              (score !== null ? ' · Score: ' + score + '%' : '') +
              '</div><button class="secondary-button view-test-results-btn" data-test="' + test.id +
              '" style="margin-top:8px;">📊 View Results</button>';
          } else {
            actionHtml = '<button class="primary-button take-test-btn" data-test="' + test.id +
              '" style="padding:8px 20px;">Take Test</button>';
          }

          card.innerHTML =
            '<div class="task-header"><div><h3>' + test.title + '</h3><div style="margin-top:4px;font-size:12px;color:var(--muted);">' +
            getCourseName(test.courseId) + ' · ' + test.questions.length + ' questions</div></div><span class="task-type test">Test</span></div>' +
            '<div class="task-body"><div class="task-description">' + test.description + '</div><div class="task-deadline ' +
            deadlineClass + '">⏰ Due: ' + test.deadline + (deadlineClass === 'overdue' ? ' ⚠️ Overdue!' : '') +
            '</div></div>' +
            '<div class="task-footer">' + actionHtml + '</div>';
          container.appendChild(card);
        });

        container.querySelectorAll('.take-test-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var testId = parseInt(this.dataset.test);
            openTakeTestModal(testId);
          });
        });

        container.querySelectorAll('.view-test-results-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var testId = parseInt(this.dataset.test);
            viewStudentTestResults(testId);
          });
        });
        setLanguage(currentLang);
      }

      function openTakeTestModal(testId) {
        var test = tests.find(function(t) { return t.id === testId; });
        if (!test) return;

        document.getElementById('take-test-title').textContent = test.title;
        document.getElementById('take-test-sub').textContent = test.description + ' · ' + test.questions.length +
          ' questions';

        var container = document.getElementById('take-test-questions');
        container.innerHTML = '';

        test.questions.forEach(function(q, index) {
          var div = document.createElement('div');
          div.className = 'test-question';
          div.innerHTML = '<div class="q-text">' + (index + 1) + '. ' + q.question + '</div><div class="q-options">';
          q.options.forEach(function(option, optIndex) {
            var letter = String.fromCharCode(65 + optIndex);
            div.innerHTML +=
              '<label><input type="radio" name="q-' + index + '" value="' + optIndex + '" /> ' + letter +
              '. ' + option + '</label>';
          });
          div.innerHTML += '</div>';
          container.appendChild(div);
        });

        document.getElementById('take-test-modal-overlay').classList.add('open');
        document.getElementById('take-test-form').dataset.testId = testId;
        setLanguage(currentLang);
      }

      function submitTest(testId) {
        var test = tests.find(function(t) { return t.id === testId; });
        if (!test) return;

        var studentId = currentUser.id;
        var answers = {};
        var allAnswered = true;

        test.questions.forEach(function(q, index) {
          var selected = document.querySelector('input[name="q-' + index + '"]:checked');
          if (selected) {
            answers[index] = parseInt(selected.value);
          } else {
            allAnswered = false;
          }
        });

        if (!allAnswered) {
          alert('Please answer all questions before submitting.');
          return;
        }

        // Calculate score
        var correct = 0;
        test.questions.forEach(function(q, index) {
          if (answers[index] === q.correctAnswer) correct++;
        });
        var score = Math.round((correct / test.questions.length) * 100);

        var key = testId + '-' + studentId;
        testSubmissions[key] = {
          answers: answers,
          score: score,
          correct: correct,
          total: test.questions.length,
          submittedAt: new Date().toISOString()
        };

        saveData();
        document.getElementById('take-test-modal-overlay').classList.remove('open');
        alert('Test submitted successfully! Your score: ' + score + '%');
        renderTests();
        setLanguage(currentLang);
      }

      function viewStudentTestResults(testId) {
        var studentId = currentUser.id;
        var key = testId + '-' + studentId;
        var submission = testSubmissions[key];
        if (!submission) {
          alert('No submission found.');
          return;
        }

        var test = tests.find(function(t) { return t.id === testId; });
        if (!test) return;

        var msg = '📊 Test Results: ' + test.title + '\n\n';
        msg += 'Score: ' + submission.score + '% (' + submission.correct + '/' + submission.total + ')\n\n';
        msg += 'Question Details:\n';
        test.questions.forEach(function(q, index) {
          var userAnswer = submission.answers[index];
          var isCorrect = userAnswer === q.correctAnswer;
          var letter = String.fromCharCode(65 + (userAnswer !== undefined ? userAnswer : 0));
          msg += (index + 1) + '. ' + (isCorrect ? '✅' : '❌') + ' ' + q.question + '\n';
          msg += '   Your answer: ' + letter + '. ' + (userAnswer !== undefined ? q.options[userAnswer] : 'Not answered') +
            '\n';
          msg += '   Correct: ' + String.fromCharCode(65 + q.correctAnswer) + '. ' + q.options[q.correctAnswer] + '\n\n';
        });

        alert(msg);
        setLanguage(currentLang);
      }

      function viewTestResults(testId) {
        var test = tests.find(function(t) { return t.id === testId; });
        if (!test) return;

        var submissions = Object.keys(testSubmissions).filter(function(key) { return key.startsWith(testId + '-'); });

        if (submissions.length === 0) {
          alert('No submissions for this test yet.');
          return;
        }

        var msg = '📊 Test Results: ' + test.title + '\n\n';
        submissions.forEach(function(key) {
          var studentId = parseInt(key.split('-')[1]);
          var student = students.find(function(s) { return s.id === studentId; });
          var sub = testSubmissions[key];
          if (student) {
            msg += '👤 ' + student.name + ': ' + sub.score + '% (' + sub.correct + '/' + sub.total + ')\n';
          }
        });

        // Calculate average
        var scores = submissions.map(function(key) { return testSubmissions[key].score; });
        var avg = scores.length > 0 ? Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length) : 0;
        msg += '\n📊 Average Score: ' + avg + '%';

        alert(msg);
        setLanguage(currentLang);
      }

      function createTest(title, courseId, description, deadline, questions) {
        tests.push({
          id: tests.length + 1,
          title: title,
          courseId: parseInt(courseId),
          description: description,
          deadline: deadline,
          questions: questions,
          createdAt: new Date().toISOString().split('T')[0]
        });
        saveData();
        renderTests();
        alert('Test created successfully!');
        setLanguage(currentLang);
      }
