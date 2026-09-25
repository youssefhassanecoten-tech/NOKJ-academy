      // ============================================================
      //  NAVIGATION
      // ============================================================
      function showLanding() {
        landingPage.classList.remove('hidden');
        loginScreen.classList.remove('open');
        loginScreen.classList.add('hidden');
        registerScreen.classList.remove('open');
        registerScreen.classList.add('hidden');
        app.classList.remove('logged-in');
        setLanguage(currentLang);
        pushAuthHistory('welcome');
      }

      // Keeps the SPA on one history entry so the browser Back button walks
      // Welcome -> Login -> Welcome instead of leaving the site.
      function pushAuthHistory(view) {
        try {
          if (window.location.hash !== '#' + view) {
            history.pushState({ nokjView: view }, '', '#' + view);
          }
        } catch (e) { /* history unavailable */ }
      }
      function initAuthHistory() {
        window.addEventListener('popstate', function() {
          var view = (window.location.hash || '').replace('#', '');
          if (view === 'login') showLoginScreen();
          else if (view === 'register') showRegisterScreen();
          else showLanding();
        });
        if (!window.location.hash) pushAuthHistory('welcome');
      }

      function showLoginScreen() {
        landingPage.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('open');
        registerScreen.classList.remove('open');
        registerScreen.classList.add('hidden');
        app.classList.remove('logged-in');
        loginError.textContent = '';
        loginEmail.value = '';
        loginPassword.value = '';
        pushAuthHistory('login');
        setLanguage(currentLang);
      }

      function showRegisterScreen() {
        landingPage.classList.add('hidden');
        registerScreen.classList.remove('hidden');
        registerScreen.classList.add('open');
        loginScreen.classList.remove('open');
        loginScreen.classList.add('hidden');
        app.classList.remove('logged-in');
        registerError.textContent = '';
        registerName.value = '';
        registerEmail.value = '';
        registerPassword.value = '';
        registerRole.value = 'Student';
        showRegisterStep('role');
        pushAuthHistory('register');
        setLanguage(currentLang);
      }

      function showRegisterStep(step) {
        var roleStep = document.getElementById('register-step-role');
        var studentStep = document.getElementById('register-step-student');
        var teacherStep = document.getElementById('register-step-teacher');
        var footer = document.getElementById('register-footer-login');
        if (!roleStep || !studentStep || !teacherStep) return;
        roleStep.style.display = step === 'role' ? 'block' : 'none';
        studentStep.style.display = step === 'student' ? 'block' : 'none';
        teacherStep.style.display = step === 'teacher' ? 'block' : 'none';
        if (footer) footer.style.display = step === 'role' ? 'block' : 'none';
        var teacherErr = document.getElementById('register-teacher-error');
        if (teacherErr) teacherErr.textContent = '';
      }

      function generateTeacherAuthKey() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var body = '';
        for (var i = 0; i < 8; i++) body += chars.charAt(Math.floor(Math.random() * chars.length));
        return 'TCHR-' + body;
      }

      function createTeacherAuthKey() {
        if (!currentUser || currentUser.role !== 'Admin') return null;
        var key = generateTeacherAuthKey();
        while (teacherAuthKeys.some(function(k) { return k.key === key; })) key = generateTeacherAuthKey();
        var record = {
          id: Date.now(),
          key: key,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
          status: 'active',
          used: false,
          usedBy: '',
          usedByName: ''
        };
        teacherAuthKeys.push(record);
        saveData();
        return record;
      }

      function findTeacherAuthKey(rawKey) {
        var key = String(rawKey || '').trim().toUpperCase().replace(/\s+/g, '');
        if (!key) return null;
        return teacherAuthKeys.find(function(k) {
          return k.key === key && k.status === 'active' && !k.used;
        }) || null;
      }

      function registerTeacherWithKey(name, email, password, rawKey) {
        if (!currentUser && !isAdminContext()) { /* anyone may attempt, key is the gate */ }
        if (getUserByEmail(email)) {
          setRegisterTeacherError(tr('Email already registered. Please sign in.'));
          return false;
        }
        if (name.length < 2) {
          setRegisterTeacherError(tr('Please enter your full name.'));
          return false;
        }
        if (password.length < 6) {
          setRegisterTeacherError(tr('Password must be at least 6 characters.'));
          return false;
        }
        var keyRecord = findTeacherAuthKey(rawKey);
        if (!keyRecord) {
          setRegisterTeacherError(tr('Invalid or already used authorisation key. Ask your academy admin for a new one.'));
          return false;
        }
        var newUser = {
          id: generateId(),
          name: name,
          email: email,
          password: password,
          role: 'Teacher',
          createdAt: new Date().toISOString().split('T')[0],
          status: 'Active',
          phone: '',
          dob: '',
          country: '',
          address: '',
          emergencyContact: '',
          bio: '',
          teacherCode: keyRecord.key
        };
        teachers.push(newUser);
        keyRecord.used = true;
        keyRecord.usedBy = newUser.id;
        keyRecord.usedByName = newUser.name;
        keyRecord.status = 'used';
        keyRecord.usedAt = new Date().toISOString();
        saveData();
        setRegisterTeacherError('');
        showLoginScreen();
        alert(tr('Teacher account created! Your teacher ID is your authorisation key. Please sign in.'));
        setLanguage(currentLang);
        return true;
      }

      function isAdminContext() {
        return false;
      }

      function setRegisterTeacherError(message) {
        var el = document.getElementById('register-teacher-error');
        if (!el) return;
        el.textContent = message;
        if (message) setLanguage(currentLang);
      }
      // ============================================================
      //  LOGIN / REGISTER
      // ============================================================
      function login(email, password) {
        var user = getUserByEmail(email);
        if (user && user.password === password) {
          currentUser = user;
          localStorage.setItem('nokj-user', JSON.stringify(user));
          showApp(user);
          loginError.textContent = '';
          return true;
        } else {
          loginError.textContent = tr('Invalid email or password. Please try again.');
          setLanguage(currentLang);
          return false;
        }
      }

      function register(name, email, password, role) {
        if (getUserByEmail(email)) {
          registerError.textContent = tr('Email already registered. Please sign in.');
          setLanguage(currentLang);
          return false;
        }
        if (password.length < 6) {
          registerError.textContent = tr('Password must be at least 6 characters.');
          setLanguage(currentLang);
          return false;
        }
        var newUser = {
          id: generateId(),
          name: name,
          email: email,
          password: password,
          role: role,
          createdAt: new Date().toISOString().split('T')[0],
          status: 'Active',
          phone: '',
          dob: '',
          country: '',
          address: '',
          emergencyContact: '',
          bio: ''
        };
        if (role === 'Teacher') {
          // Teacher signup requires admin approval.
          pendingTeachers.push(Object.assign({}, newUser, { appliedAt: new Date().toISOString(), status: 'pending' }));
          saveData();
          showLoginScreen();
          registerError.textContent = '';
          alert(tr('Your teacher application was submitted and is pending admin approval.'));
          setLanguage(currentLang);
          return true;
        }
        if (role === 'Student') {
          students.push(newUser);
        } else {
          admins.push(newUser);
        }
        saveData();
        registerError.textContent = '';
        showLoginScreen();
        alert(tr('Account created! Please sign in.'));
        return true;
      }

      function showApp(user) {
        loginScreen.classList.remove('open');
        loginScreen.classList.add('hidden');
        registerScreen.classList.remove('open');
        registerScreen.classList.add('hidden');
        landingPage.classList.add('hidden');
        app.classList.add('logged-in');

        document.body.dataset.theme = (user.role === 'Teacher') ? 'teacher' : (user.role === 'Student' ? 'student' :
          'admin');
        window.nokjRole = (user.role || '').toLowerCase();

        var initials = initialsOf(user.name);
        renderAvatar(userAvatar, user);
        userAvatar.className = 'avatar' + (user.role === 'Admin' ? ' admin-avatar' : user.role === 'Teacher' ?
          ' teacher-avatar' : '');
        userDisplayName.textContent = user.name;
        userRole.textContent = user.role;
        sidebarRole.textContent = user.role + ' Portal';
        renderAvatar(profileAvatar, user);
        profileAvatar.className = 'avatar' + (user.role === 'Admin' ? ' admin-avatar' : user.role === 'Teacher' ?
          ' teacher-avatar' : '');
        profileName.textContent = user.name;
        profileRoleText.textContent = user.role + ' · NOKJ Academy';
        profileEmail.textContent = user.email;
        profileId.textContent = 'NOKJ-' + String(user.id).padStart(4, '0');
        profileRole.textContent = user.role;
        profileSince.textContent = user.createdAt || '2026';
        fillProfileDetails(user);

        var time = new Date().getHours();
        var greetingText = (time < 12) ? 'Good morning' : (time < 17) ? 'Good afternoon' : 'Good evening';
        greeting.textContent = tr(greetingText) + ', ' + user.name + ' 👋';

        // Role-based visibility of navigation entries.
        var hiddenPages = {};
        if (user.role === 'Admin') hiddenPages = { timetable: 1, courses: 1, tasks: 1, tests: 1, assignments: 1 };
        else if (user.role === 'Teacher') hiddenPages = { announcements: 1 };
        else hiddenPages = { announcements: 1, 'course-workspace': 1, 'courses-admin': 1 };

        document.querySelectorAll('.sidebar .nav-button').forEach(function(btn) {
          btn.style.display = hiddenPages[btn.dataset.page] ? 'none' : 'flex';
        });
        document.querySelectorAll('.mobile-nav .nav-button').forEach(function(btn) {
          if (hiddenPages[btn.dataset.page]) {
            btn.style.display = 'none';
          } else {
            btn.style.display = '';
          }
        });

        if (user.role === 'Admin') {
          adminNavLabel.style.display = 'block';
          adminStudentsBtn.style.display = 'flex';
          adminBudgetBtn.style.display = 'flex';
          adminCoursesBtn.style.display = 'flex';
          courseWorkspaceBtn.style.display = 'flex';
          adminGradesBtn.style.display = 'flex';
          adminCalendarBtn.style.display = 'flex';
          adminApprovalsBtn.style.display = 'flex';
          teacherApprovalsBtn.style.display = 'none';
          adminStatsContainer.style.display = 'block';
          renderStudents();
          renderBudget();
          renderCourses();
          renderGrades();
          renderApprovals();
          updateAdminStats();
        } else if (user.role === 'Teacher') {
          adminNavLabel.style.display = 'none';
          adminStudentsBtn.style.display = 'none';
          adminBudgetBtn.style.display = 'none';
          adminCoursesBtn.style.display = 'none';
          adminGradesBtn.style.display = 'none';
          adminCalendarBtn.style.display = 'none';
          adminApprovalsBtn.style.display = 'none';
          teacherApprovalsBtn.style.display = 'flex';
          courseWorkspaceBtn.style.display = 'flex';
          adminStatsContainer.style.display = 'none';
          renderApprovals();
          renderTeacherAuthKeys();
        } else {
          adminNavLabel.style.display = 'none';
          adminStudentsBtn.style.display = 'none';
          adminBudgetBtn.style.display = 'none';
          adminCoursesBtn.style.display = 'none';
          adminGradesBtn.style.display = 'none';
          adminCalendarBtn.style.display = 'none';
          adminApprovalsBtn.style.display = 'none';
          teacherApprovalsBtn.style.display = 'none';
          courseWorkspaceBtn.style.display = 'none';
          adminStatsContainer.style.display = 'none';
        }

        if (user.role === 'Teacher') renderTeacherCourses(); else renderStudentCourses();
        renderMeetings();
        renderTasks();
        renderTests();
        renderCalendar();
        renderUpcomingClasses();
        renderDashboard();
        renderAnnouncements();
        renderAssignments();
        updateGreeting();
        cleanupExpiredMeetings();
        setLanguage(currentLang);
      }

      function updateGreeting() {
        if (!currentUser) return;
        var el = document.getElementById('greeting');
        if (!el) return;
        var time = new Date().getHours();
        var text = (time < 12) ? 'Good morning' : (time < 17) ? 'Good afternoon' : 'Good evening';
        el.textContent = tr(text) + ', ' + currentUser.name + ' 👋';
      }

      function logout() {
        localStorage.removeItem('nokj-user');
        currentUser = null;
        window.nokjRole = '';
        document.body.removeAttribute('data-theme');
        app.classList.remove('logged-in');
        showLanding();
        loginPassword.value = '';
        loginError.textContent = '';
        expandedRows = {};
        setLanguage(currentLang);
      }

      function checkSession() {
        var saved = localStorage.getItem('nokj-user');
        if (saved) {
          try {
            var user = JSON.parse(saved);
            if (user && getUserByEmail(user.email)) {
              currentUser = user;
              showApp(user);
              return;
            }
          } catch (e) {}
        }
        showLanding();
      }
