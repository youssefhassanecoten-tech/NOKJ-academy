      function renderMeetings() {
        meetingGrid.innerHTML = '';
        var userMeetings = meetings.filter(function(m) {
          if (!currentUser) return false;
          if (currentUser.role === 'Admin') return true;
          if (currentUser.role === 'Teacher') return m.teacherId === currentUser.id;
          if (currentUser.role === 'Student') return true;
          return false;
        });
        if (userMeetings.length === 0) {
          meetingGrid.innerHTML =
            '<p style="color:var(--muted);text-align:center;padding:40px;">No upcoming classes. Check back later!</p>';
          return;
        }
        userMeetings.forEach(function(meeting) {
          var card = document.createElement('div');
          card.className = 'meeting-card';
          var isTeacher = currentUser && currentUser.role === 'Teacher' && meeting.teacherId === currentUser.id;
          card.innerHTML = '<div class="meeting-header"><h3>' + meeting.title + '</h3><div class="teacher">👨‍🏫 ' +
            getTeacherName(meeting.teacherId) + '</div></div><div class="meeting-body"><div class="time">📅 ' + meeting
            .date + ' • 🕐 ' + meeting.time + ' (' + meeting.duration + ' min)</div>' + (isTeacher ?
            '<div style="font-size:11px;color:var(--muted);margin-top:4px;">📋 You are teaching this class</div>' :
            '') + '<button class="join-btn" data-meeting="' + meeting.id + '">Join Meeting</button></div>';
          meetingGrid.appendChild(card);
        });
        if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Teacher')) {
          var addCard = document.createElement('div');
          addCard.className = 'meeting-card';
          addCard.style.border = '2px dashed var(--line)';
          addCard.style.display = 'flex';
          addCard.style.alignItems = 'center';
          addCard.style.justifyContent = 'center';
          addCard.style.minHeight = '180px';
          addCard.innerHTML =
            '<div style="text-align:center;padding:20px;"><div style="font-size:40px;margin-bottom:10px;">➕</div><button class="primary-button" id="open-schedule-modal-btn">Schedule New Class</button></div>';
          meetingGrid.appendChild(addCard);
        }
        setLanguage(currentLang);
      }

      function openPresentation(meetingId) {
        var meeting = meetings.find(function(m) { return m.id === meetingId; });
        if (!meeting) return;
        presentationSlides = DEFAULT_PRESENTATION;
        currentSlide = 0;
        document.getElementById('presentation-title').textContent = meeting.title + ' - Presentation';
        document.getElementById('presentation-overlay').classList.add('open');
        updateSlide();
      }

      function updateSlide() {
        var slide = presentationSlides[currentSlide];
        document.getElementById('presentation-slide-title').textContent = slide.title;
        document.getElementById('presentation-slide-text').textContent = slide.content;
        document.getElementById('presentation-slide-counter').textContent = 'Slide ' + (currentSlide + 1) + ' of ' +
          presentationSlides.length;
      }

      function closePresentation() {
        document.getElementById('presentation-overlay').classList.remove('open');
      }

      function nextSlide() {
        if (currentSlide < presentationSlides.length - 1) { currentSlide++;
          updateSlide(); }
      }

      function prevSlide() {
        if (currentSlide > 0) { currentSlide--;
          updateSlide(); }
      }
      function openScheduleModal() {
        if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Teacher')) {
          alert('Only Admins and Teachers can schedule classes.');
          return;
        }

        scheduleTeacher.innerHTML = '';
        if (currentUser.role === 'Admin') {
          teachers.forEach(function(t) {
            var opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            scheduleTeacher.appendChild(opt);
          });
        } else {
          var opt = document.createElement('option');
          opt.value = currentUser.id;
          opt.textContent = currentUser.name;
          scheduleTeacher.appendChild(opt);
        }

        if (scheduleTeacher.options.length === 0) {
          alert('No teachers available. Please create a teacher account first.');
          return;
        }

        if (!scheduleDate.value) {
          var tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          scheduleDate.value = tomorrow.toISOString().split('T')[0];
        }
        if (!scheduleTime.value) scheduleTime.value = '09:00';

        scheduleTitle.value = '';
        scheduleLink.value = '';

        scheduleModalOverlay.classList.add('open');
        setLanguage(currentLang);
      }

      function scheduleClass(title, teacherId, date, time, duration, link) {
        meetings.push({
          id: meetings.length + 1,
          title: title,
          teacherId: parseInt(teacherId),
          date: date,
          time: time,
          duration: parseInt(duration),
          link: link || '#'
        });
        saveData();
        renderMeetings();
        renderCalendar();
        renderUpcomingClasses();
        alert('Class scheduled successfully!');
        setLanguage(currentLang);
      }
