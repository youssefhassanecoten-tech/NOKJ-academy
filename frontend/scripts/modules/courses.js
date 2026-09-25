      function renderCourses() {
        var search = document.getElementById('course-search').value.toLowerCase();
        var filtered = courses.filter(function(c) { return c.name.toLowerCase().includes(search); });
        filtered.sort(function(a, b) { return a.name.localeCompare(b.name); });
        document.getElementById('course-table-body').innerHTML = '';
        filtered.forEach(function(c) {
          var studentCount = getCourseStudentCount(c.id);
          var isExpanded = expandedRows['course-' + c.id] || false;
          var icon = isExpanded ? '▼' : '▶';
          var row = document.createElement('tr');
          row.className = 'expandable-row';
          row.dataset.expandId = 'course-' + c.id;
          row.innerHTML = '<td style="cursor:pointer;"><span class="expand-icon' + (isExpanded ? ' open' : '') + '">' + icon +
            '</span> <strong>' + c.name + '</strong><br><span style="font-size:12px;color:var(--muted);">' + c.description +
            '</span></td><td>' + getTeacherName(c.teacherId) + '</td><td>' + studentCount +
            ' ' + tr('students') + '</td><td><button class="action-btn edit" data-id="' + c.id +
            '" data-type="course">✏️</button><button class="action-btn delete" data-id="' + c.id +
            '" data-type="course">🗑️</button></td>';
          document.getElementById('course-table-body').appendChild(row);
          var detailTr = document.createElement('tr');
          detailTr.className = 'expandable-detail' + (isExpanded ? ' open' : '');
          detailTr.dataset.parentId = 'course-' + c.id;
          var studentIds = getEnrolledStudentIds(c.id);
          var detailHtml = '<div class="detail-content"><strong>' + tr('Enrolled Students:') + '</strong> ';
          if (studentIds.length === 0) detailHtml += '<span class="empty-msg">' + tr('No students enrolled.') + '</span>';
          else {
            studentIds.forEach(function(sid) {
              var s = students.find(function(st) { return st.id === sid; });
              if (s) detailHtml += '<span class="item-tag">👤 ' + s.name + ' <span class="status-badge ' + s.status
                .toLowerCase() + '">' + tr(s.status) + '</span></span>';
            });
          }
          detailHtml += '</div>';
          detailTr.innerHTML = '<td colspan="4">' + detailHtml + '</td>';
          document.getElementById('course-table-body').appendChild(detailTr);
        });
        document.getElementById('course-count').textContent = filtered.length + ' ' + tr('courses');
        document.getElementById('course-total').textContent = courses.length;
        document.getElementById('course-enrollments-total').textContent = enrollments.length;
        updateAdminStats();
        setLanguage(currentLang);
      }
      function renderStudentCourses() {
        if (!currentUser || currentUser.role !== 'Student') return;
        var container = document.getElementById('student-courses-container');
        var studentId = currentUser.id;
        var enrolledIds = getEnrolledCourseIds(studentId);
        var enrolledCourses = courses.filter(function(c) { return enrolledIds.includes(c.id); });
        var blocked = currentUser.status !== 'Active';
        var pendingCourseIds = enrollRequests.filter(function(r) {
          return r.studentId === studentId && r.status === 'pending';
        }).map(function(r) { return r.courseId; });
        var available = courses.filter(function(c) { return enrolledIds.indexOf(c.id) === -1; });

        var html = '';
        if (enrolledCourses.length === 0 && available.length === 0) {
          html += '<div class="detail-content" style="padding:40px;text-align:center;">' +
            '<h3>' + tr('No courses currently available') + '</h3>' +
            '<p style="color:var(--muted);">' + tr('You are already enrolled in all available courses, or new courses have not been published yet. Check back soon!') + '</p>' +
            '</div>';
          container.innerHTML = html;
          setCoursesHeading();
          setLanguage(currentLang);
          return;
        }
        if (enrolledCourses.length === 0) {
          html += '<p style="color:var(--muted);">' + tr('You are not enrolled in any courses yet.') + '</p>';
        } else {
          html += '<div class="course-grid">';
          enrolledCourses.forEach(function(c) {
            var colors = ['', 'orange-cover', 'green-cover'];
            var colorClass = colors[c.id % 3];
            var progress = courseProgress(c.id, studentId);
            var matCount = getCourseMaterials(c.id).filter(function(m) { return m.published; }).length;
            html += '<article class="course"><div class="course-cover ' + colorClass + '">' + c.name +
              '</div><div class="course-body"><h3>' + c.name + '</h3><p>' + tr('Teacher:') + ' ' + getTeacherName(c.teacherId) +
              '</p><p style="font-size:12px;color:var(--muted);">' + matCount + ' ' + tr('materials') + '</p>' +
              '<div class="track ' + progressColorClass(progress) + '"><div class="fill" style="width:' + Math.max(progress, 2) +
              '%"></div></div><div class="course-footer"><span class="' + progressColorClass(progress) + '">' + progress +
              '% ' + tr('complete') + '</span><button class="link-button" onclick="openCourse(' + c.id + ')">' + tr('Open course') +
              '</button></div></div></article>';
          });
          html += '</div>';
        }

        if (available.length) {
          html += '<h3 style="margin-top:30px;">' + tr('Available for enrollment') + '</h3>';
          if (blocked) {
            html += '<p style="color:var(--danger);background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;">' +
              tr('Enrollment is blocked while your account has a Warning or Inactive status.') + '</p>';
          }
          html += '<div class="course-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));">';
          available.forEach(function(c) {
            html += '<article class="course"><div class="course-cover">' + c.name +
              '</div><div class="course-body"><h3>' + c.name + '</h3><p>' + tr('Teacher:') + ' ' + getTeacherName(c.teacherId) +
              '</p><div class="course-footer" style="justify-content:flex-start;">';
            if (blocked) {
              html += '<span class="pill danger">' + tr('Enrollment blocked') + '</span>';
            } else if (pendingCourseIds.indexOf(c.id) !== -1) {
              html += '<span class="pill warning">' + tr('Application pending') + '</span>';
            } else {
              html += '<button class="apply-course-btn secondary-button" data-course="' + c.id + '">' + tr('Apply') +
                '</button>';
            }
            html += '</div></div></article>';
          });
          html += '</div>';
        }

        container.innerHTML = html;
        setCoursesHeading();
        setLanguage(currentLang);
      }

      function applyCourse(courseId) {
        if (!currentUser || currentUser.role !== 'Student') return;
        if (currentUser.status !== 'Active') {
          alert(tr('You cannot apply while your account has a Warning or Inactive status.'));
          return;
        }
        if (getEnrolledCourseIds(currentUser.id).indexOf(courseId) !== -1) return;
        if (enrollRequests.some(function(r) { return r.studentId === currentUser.id && r.courseId === courseId; })) return;
        enrollRequests.push({ id: Date.now(), studentId: currentUser.id, courseId: courseId, status: 'pending',
          date: new Date().toISOString() });
        saveData();
        renderStudentCourses();
        setLanguage(currentLang);
      }

      // ============================================================
      //  TEACHER COURSES (suggest / edit / remove, admin-approval)
      // ============================================================
      function renderTeacherCourses() {
        if (!currentUser || currentUser.role !== 'Teacher') return;
        var container = document.getElementById('student-courses-container');
        if (!container) return;
        var teacherId = currentUser.id;
        var mine = courses.filter(function(c) { return c.teacherId === teacherId; });
        var pending = courseRequests.filter(function(r) { return r.teacherId === teacherId && r.status === 'pending'; });

        var html = '<div class="teacher-courses-toolbar">' +
          '<button class="primary-button" onclick="openModal(\'courseRequest\', \'add\')">➕ ' + tr('Suggest a new course') + '</button>' +
          '<span class="pill">' + pending.length + ' ' + tr('pending') + '</span>' +
          '</div>';

        if (!mine.length && !pending.length) {
          html += '<p style="color:var(--muted);">' + tr('You have no courses yet. Suggest a new course or ask an admin to assign one — it appears for students once approved.') + '</p>';
        }

        html += '<div class="course-grid">';
        mine.forEach(function(c) {
          var studentCount = getEnrolledStudentIds(c.id).length;
          var editReq = pending.find(function(r) { return r.courseId === c.id && r.type === 'edit'; });
          var delReq = pending.find(function(r) { return r.courseId === c.id && r.type === 'delete'; });
          var pill = editReq ? '<span class="pill warning">' + tr('Edit pending') + '</span>' :
            (delReq ? '<span class="pill warning">' + tr('Delete pending') + '</span>' :
            '<span class="pill">' + tr('Active') + '</span>');
          html += '<article class="course"><div class="course-cover">' + c.name +
            '</div><div class="course-body"><h3>' + c.name + '</h3><p>' + escapeHtml(c.description || '') +
            '</p><p>' + studentCount + ' ' + tr('students') + '</p>' +
            '<div class="course-footer" style="flex-wrap:wrap;">' + pill +
            '<button class="secondary-button" onclick="openModal(\'courseRequest\', \'edit\', {id:' + c.id + '})">✏️ ' + tr('Edit description') + '</button>' +
            '<button class="action-btn delete" onclick="suggestCourseDelete(' + c.id + ')" title="' + tr('Suggest removal') + '">🗑️</button>' +
            '</div></div></article>';
        });
        pending.forEach(function(r) {
          if (r.type === 'create') {
            html += '<article class="course"><div class="course-cover pending-cover">' + escapeHtml(r.name) +
              '</div><div class="course-body"><h3>' + escapeHtml(r.name) + '</h3><p>' + escapeHtml(r.description || '') +
              '</p><div class="course-footer"><span class="pill warning">' + tr('Awaiting admin approval') + '</span>' +
              '<button class="action-btn delete" onclick="cancelCourseRequest(' + r.id + ')" title="' + tr('Cancel') + '">✕</button>' +
              '</div></div></article>';
          }
        });
        html += '</div>';

        container.innerHTML = html;
        setCoursesHeading();
        setLanguage(currentLang);
      }

      function setCoursesHeading() {
        var sub = document.getElementById('courses-sub');
        if (!sub || !currentUser) return;
        sub.textContent = tr('Continue learning and track your progress in every course.');
      }

      function suggestCourseDelete(courseId) {
        if (!currentUser || currentUser.role !== 'Teacher') return;
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c || c.teacherId !== currentUser.id) return;
        if (courseRequests.some(function(r) { return r.type === 'delete' && r.courseId === courseId && r.status === 'pending'; })) {
          alert(tr('A removal request for this course is already pending.'));
          return;
        }
        if (confirm(tr('Suggest removing this course? Students lose access only after an admin approves.'))) {
          courseRequests.push({ id: Date.now(), type: 'delete', status: 'pending', teacherId: currentUser.id, courseId: courseId,
            name: c.name, date: new Date().toISOString() });
          saveData();
          renderTeacherCourses();
          renderCourseRequests();
        }
      }

      function cancelCourseRequest(reqId) {
        if (!currentUser || currentUser.role !== 'Teacher') return;
        courseRequests = courseRequests.filter(function(r) { return r.id !== reqId; });
        saveData();
        renderTeacherCourses();
        renderCourseRequests();
        setLanguage(currentLang);
      }

      // ============================================================
      //  OWNERSHIP / PERMISSION HELPERS
      // ============================================================
      function isAdminUser() {
        return !!currentUser && currentUser.role === 'Admin';
      }
      function isTeacherUser() {
        return !!currentUser && currentUser.role === 'Teacher';
      }
      function ownsCourse(courseId) {
        if (!currentUser) return false;
        var c = courses.find(function(x) { return x.id === courseId; });
        return !!c && c.teacherId === currentUser.id;
      }
      function canManageCourse(courseId) {
        if (isAdminUser()) return true;
        if (isTeacherUser()) return ownsCourse(courseId);
        return false;
      }
      function canManageTask(task) {
        if (!currentUser || !task) return false;
        if (isAdminUser()) return true;
        if (isTeacherUser()) return task.teacherId === currentUser.id;
        return false;
      }
      function teacherOwnCourseIds() {
        if (!currentUser) return [];
        return courses.filter(function(c) { return c.teacherId === currentUser.id; }).map(function(c) { return c.id; });
      }
      function teacherEnrolledStudentIds() {
        if (!currentUser) return [];
        var ids = [];
        teacherOwnCourseIds().forEach(function(cid) {
          getEnrolledStudentIds(cid).forEach(function(sid) {
            if (ids.indexOf(sid) === -1) ids.push(sid);
          });
        });
        return ids;
      }
      function getCourseMaterials(courseId) {
        return courseMaterials.filter(function(m) { return m.courseId === courseId; });
      }

      // ============================================================
      //  COURSE STUDIO (teachers create/manage own; admin sees all)
      // ============================================================
      var studioSelectedCourseId = null;
      var studioTempFile = null;

      function renderCourseStudio() {
        var view = document.getElementById('course-workspace-view');
        if (!view || !currentUser) return;
        var allowed = isAdminUser() || isTeacherUser();
        view.style.display = allowed ? 'block' : 'none';
        if (!allowed) return;

        var list = isAdminUser() ? courses.slice() : courses.filter(function(c) { return c.teacherId === currentUser.id; });
        list.sort(function(a, b) { return a.name.localeCompare(b.name); });

        var countEl = document.getElementById('studio-course-count');
        if (countEl) countEl.textContent = list.length + ' ' + tr('courses');
        var sub = document.getElementById('course-studio-sub');
        if (sub) sub.textContent = isAdminUser() ? tr('Create courses and manage the study material for every course.') :
          tr('Create your own courses and manage the study material for your students.');

        var container = document.getElementById('studio-course-list');
        if (!container) return;
        if (studioSelectedCourseId && !list.some(function(c) { return c.id === studioSelectedCourseId; })) {
          studioSelectedCourseId = null;
        }

        if (list.length === 0) {
          container.innerHTML = '<p style="color:var(--muted);padding:20px;">' + tr('No courses yet. Create your first course to start adding study material.') + '</p>';
        } else {
          container.innerHTML = '';
          list.forEach(function(c) {
            var matCount = getCourseMaterials(c.id).length;
            var studentCount = getEnrolledStudentIds(c.id).length;
            var card = document.createElement('article');
            card.className = 'course';
            card.innerHTML = '<div class="course-cover">' + escapeHtml(c.name) + '</div>' +
              '<div class="course-body"><h3>' + escapeHtml(c.name) + '</h3>' +
              '<p>' + escapeHtml(c.description || '') + '</p>' +
              '<p>' + matCount + ' ' + tr('materials') + ' · ' + studentCount + ' ' + tr('students') + '</p>' +
              '<div class="course-footer" style="flex-wrap:wrap;">' +
              '<button class="primary-button" data-studio-open="' + c.id + '">📂 ' + tr('Manage materials') + '</button>' +
              (canManageCourse(c.id) ? '<button class="action-btn delete" data-studio-delete="' + c.id + '" title="' +
                tr('Delete course') + '">🗑️</button>' : '') +
              '</div></div>';
            container.appendChild(card);
          });
        }

        container.querySelectorAll('[data-studio-open]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            studioSelectCourse(parseInt(btn.dataset.studioOpen));
          });
        });
        container.querySelectorAll('[data-studio-delete]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            studioDeleteCourse(parseInt(btn.dataset.studioDelete));
          });
        });

        renderStudioMaterials();
      }

      function studioSelectCourse(courseId) {
        if (!canManageCourse(courseId)) return;
        studioSelectedCourseId = courseId;
        var panel = document.getElementById('studio-material-panel');
        if (panel) panel.style.display = 'block';
        renderStudioMaterials();
        if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function renderStudioMaterials() {
        var nameEl = document.getElementById('studio-material-course-name');
        var listEl = document.getElementById('studio-material-list');
        if (!nameEl || !listEl) return;
        if (!studioSelectedCourseId) {
          nameEl.textContent = '';
          listEl.innerHTML = '';
          return;
        }
        var course = courses.find(function(c) { return c.id === studioSelectedCourseId; });
        nameEl.textContent = course ? course.name : '';
        var mats = getCourseMaterials(studioSelectedCourseId);
        if (mats.length === 0) {
          listEl.innerHTML = '<p style="color:var(--muted);padding:14px;">' + tr('No study material yet. Add your first note, link or file below.') + '</p>';
          return;
        }
        var html = '<table><thead><tr><th>' + tr('Title') + '</th><th>' + tr('Type') + '</th><th>' + tr('Status') +
          '</th><th>' + tr('Actions') + '</th></tr></thead><tbody>';
        mats.forEach(function(m) {
          html += '<tr><td><strong>' + escapeHtml(m.title) + '</strong>' +
            (m.fileName ? '<br><span style="font-size:12px;color:var(--muted);">' + escapeHtml(m.fileName) + '</span>' : '') +
            '</td><td>' + tr(m.kind) + '</td><td>' + (m.published ? '<span class="pill">' + tr('Published') +
            '</span>' : '<span class="pill warning">' + tr('Draft') + '</span>') + '</td><td>' +
            '<button class="action-btn edit" data-mat-toggle="' + m.id + '" title="' + tr('Toggle published') + '">👁️</button>' +
            '<button class="action-btn delete" data-mat-delete="' + m.id + '" title="' + tr('Delete') + '">🗑️</button>' +
            '</td></tr>';
          if (m.kind === 'link' && m.url) {
            html += '<tr class="expandable-detail open"><td colspan="4"><a href="' + escapeHtml(m.url) +
              '" target="_blank" rel="noopener">' + escapeHtml(m.url) + '</a></td></tr>';
          } else if (m.kind === 'note' && m.body) {
            html += '<tr class="expandable-detail open"><td colspan="4">' + escapeHtml(m.body) + '</td></tr>';
          } else if (m.kind === 'file' && m.fileData) {
            html += '<tr class="expandable-detail open"><td colspan="4"><span class="file-link" onclick="window.openFilePreview(\'' +
              escapeHtml(m.fileName || 'file') + '\', \'' + String(m.fileData).replace(/'/g, "\\'") + '\')">' +
              escapeHtml(m.fileName || tr('Open file')) + '</span></td></tr>';
          }
        });
        html += '</tbody></table>';
        listEl.innerHTML = html;

        listEl.querySelectorAll('[data-mat-toggle]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (!canManageCourse(studioSelectedCourseId)) return;
            var id = parseInt(btn.dataset.matToggle);
            var mat = courseMaterials.find(function(m) { return m.id === id; });
            if (mat) { mat.published = !mat.published; saveData(); renderStudioMaterials(); }
          });
        });
        listEl.querySelectorAll('[data-mat-delete]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (!canManageCourse(studioSelectedCourseId)) return;
            var id = parseInt(btn.dataset.matDelete);
            if (!confirm(tr('Delete this material?'))) return;
            courseMaterials = courseMaterials.filter(function(m) { return m.id !== id; });
            saveData();
            renderStudioMaterials();
          });
        });
      }

      function studioSaveMaterial() {
        if (!canManageCourse(studioSelectedCourseId)) return;
        var title = document.getElementById('studio-material-title').value.trim();
        var kind = document.getElementById('studio-material-kind').value;
        var body = document.getElementById('studio-material-body').value.trim();
        var url = document.getElementById('studio-material-url').value.trim();
        var published = document.getElementById('studio-material-published').checked;
        if (!title) { alert(tr('Please enter a title.')); return; }
        if (kind === 'link' && !url) { alert(tr('Please enter a link URL.')); return; }
        if (kind === 'file' && !studioTempFile) { alert(tr('Please choose a file.')); return; }

        var mat = {
          id: Date.now(),
          courseId: studioSelectedCourseId,
          createdBy: currentUser.id,
          title: title,
          description: '',
          kind: kind,
          body: kind === 'note' ? body : '',
          url: kind === 'link' ? url : '',
          fileName: kind === 'file' && studioTempFile ? studioTempFile.name : '',
          fileData: kind === 'file' && studioTempFile ? studioTempFile.data : '',
          published: published,
          createdAt: new Date().toISOString()
        };
        courseMaterials.push(mat);
        saveData();
        studioTempFile = null;
        document.getElementById('studio-material-title').value = '';
        document.getElementById('studio-material-body').value = '';
        document.getElementById('studio-material-url').value = '';
        document.getElementById('studio-material-file').value = '';
        var fn = document.getElementById('studio-material-file-name');
        if (fn) fn.textContent = tr('No file chosen');
        renderStudioMaterials();
        setLanguage(currentLang);
      }

      function studioClearMaterialForm() {
        document.getElementById('studio-material-title').value = '';
        document.getElementById('studio-material-body').value = '';
        document.getElementById('studio-material-url').value = '';
        document.getElementById('studio-material-file').value = '';
        var fn = document.getElementById('studio-material-file-name');
        if (fn) fn.textContent = tr('No file chosen');
        studioTempFile = null;
      }

      function studioCreateCourse() {
        if (!isAdminUser() && !isTeacherUser()) return;
        var input = document.getElementById('studio-course-name');
        var name = input.value.trim();
        if (!name) { alert(tr('Please enter a course name.')); return; }
        var teacherId = isAdminUser() ? (teachers[0] ? teachers[0].id : null) : currentUser.id;
        courses.push({
          id: nextCourseId(),
          name: name,
          description: tr('Created in Course Studio.'),
          teacherId: teacherId,
          createdAt: new Date().toISOString()
        });
        input.value = '';
        saveData();
        renderCourseStudio();
        if (isAdminUser()) renderCourses();
        setLanguage(currentLang);
      }

      function studioDeleteCourse(courseId) {
        if (!canManageCourse(courseId)) return;
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c) return;
        if (!confirm(tr('Delete this course? Its study material will be removed too.'))) return;
        courses = courses.filter(function(x) { return x.id !== courseId; });
        courseMaterials = courseMaterials.filter(function(m) { return m.courseId !== courseId; });
        if (studioSelectedCourseId === courseId) {
          studioSelectedCourseId = null;
          var panel = document.getElementById('studio-material-panel');
          if (panel) panel.style.display = 'none';
        }
        saveData();
        renderCourseStudio();
        if (isAdminUser()) renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
      }

      function initCourseStudio() {
        var kindSel = document.getElementById('studio-material-kind');
        if (kindSel) {
          kindSel.addEventListener('change', function() {
            var v = this.value;
            document.getElementById('studio-material-note-wrap').style.display = v === 'note' ? 'block' : 'none';
            document.getElementById('studio-material-link-wrap').style.display = v === 'link' ? 'block' : 'none';
            document.getElementById('studio-material-file-wrap').style.display = v === 'file' ? 'block' : 'none';
          });
        }
        var createBtn = document.getElementById('studio-create-course-btn');
        if (createBtn) createBtn.addEventListener('click', studioCreateCourse);
        var saveBtn = document.getElementById('studio-material-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', studioSaveMaterial);
        var cancelBtn = document.getElementById('studio-material-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', studioClearMaterialForm);
        var closeBtn = document.getElementById('studio-material-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', function() {
          studioSelectedCourseId = null;
          var panel = document.getElementById('studio-material-panel');
          if (panel) panel.style.display = 'none';
          renderStudioMaterials();
        });
        var fileInput = document.getElementById('studio-material-file');
        if (fileInput) {
          fileInput.addEventListener('change', function(e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
              studioTempFile = { name: file.name, data: ev.target.result };
              var fn = document.getElementById('studio-material-file-name');
              if (fn) fn.textContent = file.name;
            };
            reader.readAsDataURL(file);
          });
        }
      }

      function openCourse(courseId) {
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c) return;
        if (currentUser && currentUser.role === 'Student') {
          var enrolled = getEnrolledCourseIds(currentUser.id);
          if (enrolled.indexOf(courseId) === -1) { applyCourse(courseId); return; }
          if (c.materialsOpenState !== undefined) { /* reserved */ }
          renderStudentCourseDetail(c);
          return;
        }
        studioSelectCourse(courseId);
        openPage('course-workspace');
      }

      function renderStudentCourseDetail(course) {
        var container = document.getElementById('student-courses-container');
        if (!container || !course) return;
        var mats = getCourseMaterials(course.id).filter(function(m) { return m.published; });
        var enrolled = getEnrolledCourseIds(currentUser.id);
        if (enrolled.indexOf(course.id) === -1) {
          container.innerHTML = '<p style="color:var(--muted);padding:20px;">' + tr('You are not enrolled in this course yet.') +
            ' <button class="secondary-button" onclick="applyCourse(' + course.id + ')">' + tr('Apply') + '</button></p>';
          setLanguage(currentLang);
          return;
        }
        var html = '<div class="detail-content" style="margin-bottom:16px;"><button class="secondary-button" onclick="renderStudentCourses()">← ' +
          tr('Back to My courses') + '</button></div>';
        html += '<h3>' + escapeHtml(course.name) + '</h3>';
        html += '<p>' + tr('Teacher:') + ' ' + getTeacherName(course.teacherId) + '</p>';
        if (mats.length === 0) {
          html += '<p style="color:var(--muted);padding:18px;">' + tr('No study material published yet for this course.') + '</p>';
        } else {
          html += '<div class="course-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));">';
          mats.forEach(function(m) {
            html += '<article class="course"><div class="course-body"><span class="pill">' + tr(m.kind) + '</span>' +
              '<h3>' + escapeHtml(m.title) + '</h3>';
            if (m.kind === 'note' && m.body) html += '<p>' + escapeHtml(m.body) + '</p>';
            if (m.kind === 'link' && m.url) html += '<p><a href="' + escapeHtml(m.url) + '" target="_blank" rel="noopener">' + escapeHtml(m.url) + '</a></p>';
            if (m.kind === 'file' && m.fileData) html += '<p><span class="file-link" onclick="window.openFilePreview(\'' +
              escapeHtml(m.fileName || 'file') + '\', \'' + String(m.fileData).replace(/'/g, "\\'") + '\')">' +
              escapeHtml(m.fileName || tr('Open file')) + '</span></p>';
            html += '<p style="font-size:12px;color:var(--muted);">' + (m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '') + '</p>';
            html += '</div></article>';
          });
          html += '</div>';
        }
        container.innerHTML = html;
        setLanguage(currentLang);
      }
