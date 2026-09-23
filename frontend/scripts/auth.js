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
        setLanguage(currentLang);
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
          loginError.textContent = 'Invalid email or password. Please try again.';
          return false;
        }
      }

      function register(name, email, password, role) {
        if (getUserByEmail(email)) {
          registerError.textContent = 'Email already registered. Please sign in.';
          return false;
        }
        if (password.length < 6) {
          registerError.textContent = 'Password must be at least 6 characters.';
          return false;
        }
        var newUser = {
          id: generateId(),
          name: name,
          email: email,
          password: password,
          role: role,
          createdAt: new Date().toISOString().split('T')[0],
          status: 'Active'
        };
        if (role === 'Student') {
          students.push(newUser);
        } else if (role === 'Teacher') {
          teachers.push(newUser);
        } else {
          admins.push(newUser);
        }
        saveData();
        registerError.textContent = '';
        showLoginScreen();
        alert('Account created! Please sign in.');
        return true;
      }

      function showApp(user) {
        loginScreen.classList.remove('open');
        loginScreen.classList.add('hidden');
        registerScreen.classList.remove('open');
        registerScreen.classList.add('hidden');
        landingPage.classList.add('hidden');
        app.classList.add('logged-in');

        var initials = user.name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
        userAvatar.textContent = initials;
        userAvatar.className = 'avatar' + (user.role === 'Admin' ? ' admin-avatar' : user.role === 'Teacher' ?
          ' teacher-avatar' : '');
        userDisplayName.textContent = user.name;
        userRole.textContent = user.role;
        sidebarRole.textContent = user.role + ' Portal';
        profileAvatar.textContent = initials;
        profileAvatar.className = 'avatar' + (user.role === 'Admin' ? ' admin-avatar' : user.role === 'Teacher' ?
          ' teacher-avatar' : '');
        profileName.textContent = user.name;
        profileRoleText.textContent = user.role + ' · NOKJ Academy';
        profileEmail.textContent = user.email;
        profileId.textContent = 'NOKJ-' + String(user.id).padStart(4, '0');
        profileRole.textContent = user.role;
        profileSince.textContent = user.createdAt || '2026';

        var time = new Date().getHours();
        var greetingText = (time < 12) ? 'Good morning' : (time < 17) ? 'Good afternoon' : 'Good evening';
        greeting.textContent = greetingText + ', ' + user.name + ' 👋';

        if (user.role === 'Admin') {
          adminNavLabel.style.display = 'block';
          adminStudentsBtn.style.display = 'flex';
          adminBudgetBtn.style.display = 'flex';
          adminCoursesBtn.style.display = 'flex';
          adminGradesBtn.style.display = 'flex';
          adminCalendarBtn.style.display = 'flex';
          adminStatsContainer.style.display = 'block';
          renderStudents();
          renderBudget();
          renderCourses();
          renderGrades();
          updateAdminStats();
        } else {
          adminNavLabel.style.display = 'none';
          adminStudentsBtn.style.display = 'none';
          adminBudgetBtn.style.display = 'none';
          adminCoursesBtn.style.display = 'none';
          adminGradesBtn.style.display = 'none';
          adminCalendarBtn.style.display = 'none';
          adminStatsContainer.style.display = 'none';
        }

        renderStudentCourses();
        renderMeetings();
        renderTasks();
        renderTests();
        renderCalendar();
        renderUpcomingClasses();
        setLanguage(currentLang);
      }

      function logout() {
        localStorage.removeItem('nokj-user');
        currentUser = null;
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
