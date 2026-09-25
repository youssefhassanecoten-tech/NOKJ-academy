// ============================================================
      //  VIRTUAL CLASSROOM (meetings) - data-driven, role-aware
      //  Admin: full CRUD, any teacher, any time.
      //  Teacher: own classes only, scoped to their courses,
      //  edit/delete allowed only 24h+ before the meeting start.
      //  Rooms self-clean 1 minute after the session end time.
      // ============================================================
      function renderMeetings() {
        meetingGrid.innerHTML = '';
        if (!currentUser) return;

        var relevant = meetings.filter(function(m) {
          if (currentUser.role === 'Admin') return true;
          if (currentUser.role === 'Teacher') {
            return m.teacherId === currentUser.id || m.createdBy === currentUser.id || m.visibleToTeachers === true;
          }
          if (currentUser.role === 'Student') {
            if (m.visibleToStudents === false) return false;
            if (m.courseId && getEnrolledCourseIds(currentUser.id).indexOf(m.courseId) === -1) return false;
            return true;
          }
          return false;
        });

        var canManage = currentUser.role === 'Admin' || currentUser.role === 'Teacher';

        if (relevant.length === 0) {
          var empty = document.createElement('p');
          empty.style.cssText = 'color:var(--muted);text-align:center;padding:40px;grid-column:1/-1;';
          empty.textContent = tr('No upcoming classes. Check back later!');
          meetingGrid.appendChild(empty);
        } else {
          relevant.forEach(function(meeting) {
            meetingGrid.appendChild(buildMeetingCard(meeting));
          });
        }

        // The create option must always be available to admins and teachers,
        // even when there are no meetings yet.
        if (canManage) {
          var addCard = document.createElement('div');
          addCard.className = 'meeting-card';
          addCard.style.border = '2px dashed var(--line)';
          addCard.style.display = 'flex';
          addCard.style.alignItems = 'center';
          addCard.style.justifyContent = 'center';
          addCard.style.minHeight = '180px';
          addCard.innerHTML =
            '<div style="text-align:center;padding:20px;"><div style="font-size:40px;margin-bottom:10px;">➕</div><button class="primary-button" id="open-schedule-modal-btn">' +
            tr('Schedule New Class') + '</button></div>';
          meetingGrid.appendChild(addCard);
        }
        setLanguage(currentLang);
      }

      function buildMeetingCard(meeting) {
        var card = document.createElement('div');
        card.className = 'meeting-card';
        var teacher = getTeacherName(meeting.teacherId);
        var audience = meetingAudienceLabels(meeting).map(function(l) {
          return '<span class="audience-badge">' + l + '</span>';
        }).join('');
        var course = meeting.courseId ? '<span class="meeting-course">▣ ' + escapeHtml(getCourseName(meeting.courseId)) +
          '</span>' : '';

        var actions = '';
        if (meetingEditable(meeting)) {
          actions += '<button class="meeting-edit-btn secondary-button" data-meeting="' + meeting.id + '">✏️ ' + tr(
            'Edit') + '</button>';
          actions += '<button class="meeting-delete-btn danger-button" data-meeting="' + meeting.id + '">🗑 ' + tr(
            'Delete') + '</button>';
        }

        card.innerHTML =
          '<div class="meeting-header"><h3>' + escapeHtml(meeting.title) + '</h3><div class="teacher">👨‍🏫 ' +
          teacher + '</div></div>' +
          '<div class="meeting-body">' +
          '<div class="time">📅 ' + meeting.date + ' • 🕐 ' + meeting.time + ' (' + meeting.duration + ' min)</div>' +
          course +
          '<div class="meeting-audience">' + audience + '</div>' +
          (currentUser.role !== 'Student' ? '<div style="font-size:11px;color:var(--muted);margin-top:4px;">' + tr(
            'Session ends') + ' ' + new Date(meetingEndMs(meeting)).toLocaleString() + '</div>' : '') +
          '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="join-btn" data-meeting="' + meeting.id + '">' + tr('Join Meeting') + '</button>' +
          actions +
          '</div></div>';
        return card;
      }

      // ============================================================
      //  MEETING CRUD
      // ============================================================
      var editingMeetingId = null;
      var scheduleAttachment = null;

      function openScheduleModal(meetingId) {
        if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Teacher')) {
          alert(tr('Only Admins and Teachers can schedule classes.'));
          return;
        }

        editingMeetingId = null;
        var editing = null;
        if (meetingId) {
          editing = meetings.find(function(m) { return m.id === meetingId; });
          if (!editing) return;
          if (!meetingEditable(editing)) {
            alert(tr('This class can only be changed less than 24 hours before it starts. Contact an admin for changes.'));
            return;
          }
          editingMeetingId = meetingId;
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
          alert(tr('No teachers available. Please create a teacher account first.'));
          return;
        }

        // Course list: admin sees all courses, teachers only their own.
        var myCourses = currentUser.role === 'Teacher' ?
          courses.filter(function(c) { return c.teacherId === currentUser.id; }) : courses;
        scheduleCourse.innerHTML = '<option value="">' + tr('No course (general)') + '</option>';
        myCourses.forEach(function(c) {
          var o = document.createElement('option');
          o.value = c.id;
          o.textContent = c.name;
          scheduleCourse.appendChild(o);
        });
        if (currentUser.role === 'Teacher' && myCourses.length === 0) {
          alert(tr('Teachers can only schedule classes for their own courses. No courses are assigned to you yet.'));
          return;
        }

        if (editing) {
          scheduleTitle.value = editing.title;
          scheduleTeacher.value = editing.teacherId;
          scheduleDate.value = editing.date;
          scheduleTime.value = editing.time;
          scheduleDuration.value = String(editing.duration || 60);
          scheduleLink.value = editing.link || '';
          scheduleCourse.value = editing.courseId || '';
          document.getElementById('schedule-vis-students').checked = editing.visibleToStudents !== false;
          document.getElementById('schedule-vis-teachers').checked = editing.visibleToTeachers === true;
        } else {
          if (!scheduleDate.value) {
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            scheduleDate.value = tomorrow.toISOString().split('T')[0];
          }
          if (!scheduleTime.value) scheduleTime.value = '09:00';
          scheduleTitle.value = '';
          scheduleLink.value = '';
          document.getElementById('schedule-vis-students').checked = true;
          document.getElementById('schedule-vis-teachers').checked = false;
        }

        scheduleModalOverlay.classList.add('open');
        setLanguage(currentLang);
      }

      function scheduleClass(title, teacherId, date, time, duration, link, courseId, visibleToStudents, visibleToTeachers) {
        var base = {
          title: title,
          teacherId: parseInt(teacherId),
          date: date,
          time: time,
          duration: parseInt(duration),
          link: link || '#',
          courseId: courseId || null,
          visibleToStudents: visibleToStudents !== false,
          visibleToTeachers: visibleToTeachers === true
        };
        if (scheduleAttachment && scheduleAttachment.data) {
          base.attachment = { name: scheduleAttachment.name, data: scheduleAttachment.data };
        }
        if (editingMeetingId) {
          var idx = meetings.findIndex(function(m) { return m.id === editingMeetingId; });
          if (idx !== -1) {
            meetings[idx] = Object.assign({}, meetings[idx], base);
            if (scheduleAttachment && scheduleAttachment.data) {
              applyPresentationSource(meetings[idx].id, scheduleAttachment);
            }
          }
        } else {
          meetings.push(Object.assign({ id: meetings.length ? Math.max.apply(null, meetings.map(function(m) { return m.id; })) + 1 : 1,
            createdBy: currentUser ? currentUser.id : parseInt(teacherId) }, base));
          if (scheduleAttachment && scheduleAttachment.data) {
            applyPresentationSource(meetings[meetings.length - 1].id, scheduleAttachment);
          }
        }
        scheduleAttachment = null;
        var attachInput = document.getElementById('schedule-file-input');
        if (attachInput) attachInput.value = '';
        var attachName = document.getElementById('schedule-file-name');
        if (attachName) attachName.textContent = '';
        editingMeetingId = null;
        saveData();
        renderMeetings();
        renderCalendar();
        renderUpcomingClasses();
        renderDashboard();
        alert(tr('Class scheduled successfully!'));
        setLanguage(currentLang);
      }

      function applyPresentationSource(meetingId, attachment) {
        try {
          localStorage.setItem('nokj-pres-src-' + meetingId, JSON.stringify(attachment));
        } catch (e) { /* storage full or unavailable */ }
      }

      function initScheduleAttachment() {
        var input = document.getElementById('schedule-file-input');
        if (!input) return;
        input.addEventListener('change', function(e) {
          var file = e.target.files && e.target.files[0];
          var nameEl = document.getElementById('schedule-file-name');
          if (!file) { scheduleAttachment = null; if (nameEl) nameEl.textContent = ''; return; }
          var lower = file.name.toLowerCase();
          if (lower.indexOf('.pptx') === -1 && lower.indexOf('.ppt') === -1 && lower.indexOf('.pdf') === -1) {
            alert(tr('Only .pptx, .ppt or .pdf files can be attached to a class.'));
            input.value = '';
            scheduleAttachment = null;
            return;
          }
          var reader = new FileReader();
          reader.onload = function(ev) {
            scheduleAttachment = { name: file.name, data: ev.target.result };
            if (nameEl) nameEl.textContent = file.name;
          };
          reader.onerror = function() {
            alert(tr('Could not read that file. Please try again.'));
            input.value = '';
            scheduleAttachment = null;
          };
          reader.readAsDataURL(file);
        });
      }

      function openEditMeeting(meetingId) {
        openScheduleModal(meetingId);
      }

      function deleteMeeting(meetingId) {
        var m = meetings.find(function(x) { return x.id === meetingId; });
        if (!m) return;
        if (!meetingEditable(m)) {
          alert(tr('This class is locked for teacher changes. Contact an admin.'));
          return;
        }
        if (!confirm(tr('Delete this class?'))) return;
        meetings = meetings.filter(function(x) { return x.id !== meetingId; });
        saveData();
        renderMeetings();
        renderCalendar();
        renderUpcomingClasses();
        renderDashboard();
        setLanguage(currentLang);
      }

      // Rooms are removed one minute after the session end time.
      function cleanupExpiredMeetings() {
        var now = Date.now();
        var before = meetings.length;
        meetings = meetings.filter(function(m) {
          return meetingEndMs(m) + 60000 > now;
        });
        if (meetings.length !== before) {
          saveData();
          renderMeetings();
          renderCalendar();
          renderUpcomingClasses();
          renderDashboard();
        }
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