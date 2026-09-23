      function renderCalendar() {
        var firstDay = new Date(currentYear, currentMonth, 1).getDay();
        var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        var today = new Date();
        var todayStr = today.toISOString().split('T')[0];

        calendarMonthLabel.textContent = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long',
          year: 'numeric' });
        calendarGrid.innerHTML = '';

        var dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayLabels.forEach(function(label) {
          var div = document.createElement('div');
          div.className = 'day-label';
          div.textContent = label;
          calendarGrid.appendChild(div);
        });

        for (var i = 0; i < firstDay; i++) {
          var div = document.createElement('div');
          div.className = 'day-cell empty';
          calendarGrid.appendChild(div);
        }

        for (var day = 1; day <= daysInMonth; day++) {
          var dateStr = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          var div = document.createElement('div');
          div.className = 'day-cell' + (dateStr === todayStr ? ' today' : '');
          div.dataset.date = dateStr;

          var number = document.createElement('div');
          number.className = 'day-number';
          number.textContent = day;
          div.appendChild(number);

          var dayMeetings = meetings.filter(function(m) { return m.date === dateStr; });
          if (dayMeetings.length > 0) {
            var eventsDiv = document.createElement('div');
            eventsDiv.className = 'day-events';
            dayMeetings.forEach(function(m) {
              var dot = document.createElement('div');
              dot.className = 'event-dot' + (m.teacherId === (currentUser ? currentUser.id : null) ? ' teacher' :
                '');
              dot.textContent = '• ' + m.title + ' (' + m.time + ')';
              eventsDiv.appendChild(dot);
            });
            div.appendChild(eventsDiv);
          }

          div.addEventListener('click', function() {
            var date = this.dataset.date;
            if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Teacher')) {
              scheduleDate.value = date;
              openScheduleModal();
            } else {
              var dayMeetings = meetings.filter(function(m) { return m.date === date; });
              alert('Classes on ' + date + ': ' + (dayMeetings.length > 0 ? dayMeetings.map(function(m) { return m
                  .title; }).join(', ') : 'No classes scheduled.'));
            }
          });

          calendarGrid.appendChild(div);
        }

        renderUpcomingClasses();
        setLanguage(currentLang);
      }

      function renderUpcomingClasses() {
        var today = new Date().toISOString().split('T')[0];
        var upcoming = meetings.filter(function(m) { return m.date >= today; }).sort(function(a, b) { return a.date
            .localeCompare(b.date) || a.time.localeCompare(b.time); });

        if (upcoming.length === 0) {
          upcomingClassesList.innerHTML = '<p style="color:var(--muted);">No upcoming classes scheduled.</p>';
          return;
        }

        var html = '';
        upcoming.slice(0, 10).forEach(function(m) {
          var isTeacher = currentUser && currentUser.role === 'Teacher' && m.teacherId === currentUser.id;
          html +=
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid var(--line);border-radius:8px;background:white;">' +
            '<div><strong>' + m.title + '</strong><br><span style="font-size:12px;color:var(--muted);">📅 ' + m.date +
            ' at ' + m.time + ' · ' + getTeacherName(m.teacherId) + (isTeacher ? ' (You)' : '') + '</span></div>' +
            '<button class="join-btn" data-meeting="' + m.id +
            '" style="padding:6px 16px;border:0;border-radius:6px;background:var(--primary);color:white;font-weight:600;">Join</button>' +
            '</div>';
        });
        upcomingClassesList.innerHTML = html;

        upcomingClassesList.querySelectorAll('.join-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var meetingId = parseInt(this.dataset.meeting);
            openPresentation(meetingId);
          });
        });
        setLanguage(currentLang);
      }
