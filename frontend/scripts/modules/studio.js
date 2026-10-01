
      // ============================================================
      //  COURSE STUDIO
      //  Sidebar (course list) + canvas (curriculum / library /
      //  settings / analytics). Teachers manage their own courses,
      //  admins manage every course.
      // ============================================================
      var studio = {
        courseId: null,
        tab: 'lessons',
        // Second level under Lessons: lesson | task | assignment | test
        sub: 'lesson',
        query: '',
        filter: 'active',
        selected: {},
        lessonType: 'text',
        libFile: null,
        lessonFile: null,
        dragModuleId: null,
        dragLesson: null,
        bound: false,
        // Pending context for the build-method prompt and the basic form.
        buildKind: 'material',
        pendingCourseId: null,
        pendingKind: 'material',
        editingTaskId: null
      };

      var STUDIO_EMOJI = ['📘', '📐', '🧬', '📖', '🧪', '🌍', '💻', '🎨', '🎵', '⚖️', '🩺', '💰', '🚀', '🗺️', '🏛️', '🧮', '🔬', '✍️'];
      // Level 1: the four top tabs of a course.
      var STUDIO_TABS = ['lessons', 'library', 'settings', 'analytics'];
      // Level 2: what lives under Lessons. The key `assignment` is a legacy
      // name kept because it is already persisted in saved Studio state; it
      // shows and creates homework.
      var STUDIO_SUBTABS = ['lesson', 'task', 'assignment', 'test'];
      var STUDIO_TYPE_LABELS = {
        text: 'Text', video: 'Video', link: 'Link', file: 'File',
        assignment: 'Assignment', quiz: 'Quiz', live: 'Live', embed: 'Embed'
      };

      function studioCourse() {
        if (studio.courseId === null) return null;
        var c = courses.find(function(x) { return x.id === studio.courseId; });
        return c ? ensureCourseShape(c) : null;
      }

      function studioCanEdit() {
        return isAdminUser() || isTeacherUser();
      }

      function studioOwnedCourses() {
        ensureAllCourseShapes();
        var list = isAdminUser() ? courses.slice() :
          courses.filter(function(c) { return c.teacherId === currentUser.id; });
        list.sort(function(a, b) { return a.name.localeCompare(b.name); });
        return list;
      }

      function studioMatchesFilter(c) {
        switch (studio.filter) {
          case 'all': return true;
          case 'archived': return !!c.archived;
          case 'published': return !c.archived && isCoursePublished(c);
          case 'draft': return !c.archived && !isCoursePublished(c);
          default: return !c.archived;
        }
      }

      function studioVisibleCourses() {
        var q = studio.query.trim().toLowerCase();
        return studioOwnedCourses().filter(function(c) {
          if (!studioMatchesFilter(c)) return false;
          if (!q) return true;
          return (c.name || '').toLowerCase().indexOf(q) !== -1 ||
            (c.code || '').toLowerCase().indexOf(q) !== -1 ||
            (c.description || '').toLowerCase().indexOf(q) !== -1;
        });
      }

      function studioMarkSaved() {
        var el = document.getElementById('studio-saved-state');
        if (!el) return;
        el.classList.add('saving');
        el.textContent = tr('Saving…');
        if (studio.saveTimer) clearTimeout(studio.saveTimer);
        studio.saveTimer = setTimeout(function() {
          el.classList.remove('saving');
          el.textContent = tr('All changes saved');
        }, 650);
      }

      function studioCommit() {
        studioMarkSaved();
        saveData();
      }

      // ============================================================
      //  SIDEBAR
      // ============================================================
      function renderStudioSidebar() {
        var listEl = document.getElementById('studio-course-list');
        if (!listEl) return;
        var list = studioVisibleCourses();
        var countEl = document.getElementById('studio-course-count');
        if (countEl) {
          countEl.textContent = list.length + ' ' + (list.length === 1 ? tr('course') : tr('courses'));
        }

        if (!list.length) {
          listEl.innerHTML = '<p class="studio-list-empty">' +
            (studioOwnedCourses().length ? tr('No courses match your search.') :
              tr('No courses yet. Create your first course to start adding study material.')) + '</p>';
          updateStudioBulkBar();
          return;
        }

        var html = '';
        list.forEach(function(c) {
          var mods = countCourseModules(c.id);
          var lessons = countCourseLessons(c.id, true);
          var students = getEnrolledStudentIds(c.id).length;
          var status = c.archived ? tr('Archived') : (isCoursePublished(c) ? tr('Published') : tr('Draft'));
          var sub = status + ' · ' + lessons + ' ' + (lessons === 1 ? tr('lesson') : tr('lessons')) +
            ' · ' + students + ' ' + (students === 1 ? tr('student') : tr('students'));
          html += '<div class="studio-item' + (c.id === studio.courseId ? ' selected' : '') + '" data-studio-pick="' +
            c.id + '" role="button" tabindex="0">' +
            '<input type="checkbox" class="studio-item-check" data-studio-check="' + c.id + '"' +
            (studio.selected[c.id] ? ' checked' : '') + ' aria-label="' + tr('Select') + '" />' +
            '<span class="studio-item-emoji" style="background:' + escapeHtml(c.color || '#4f46e5') +
            '22;color:' + escapeHtml(c.color || '#4f46e5') + ';">' + escapeHtml(c.emoji || '📘') + '</span>' +
            '<span class="studio-item-main"><span class="studio-item-title">' + escapeHtml(c.name) + '</span>' +
            '<span class="studio-item-sub">' + escapeHtml(sub) + '</span></span></div>';
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('[data-studio-pick]').forEach(function(row) {
          row.addEventListener('click', function(e) {
            if (e.target.classList.contains('studio-item-check')) return;
            studioSelectCourse(parseInt(row.dataset.studioPick));
          });
          row.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              studioSelectCourse(parseInt(row.dataset.studioPick));
            }
          });
        });
        listEl.querySelectorAll('[data-studio-check]').forEach(function(box) {
          box.addEventListener('change', function() {
            var id = parseInt(box.dataset.studioCheck);
            if (box.checked) studio.selected[id] = true;
            else delete studio.selected[id];
            updateStudioBulkBar();
          });
        });
        updateStudioBulkBar();
      }

      function updateStudioBulkBar() {
        var bar = document.getElementById('studio-bulk-bar');
        var countEl = document.getElementById('studio-bulk-count');
        if (!bar || !countEl) return;
        var ids = Object.keys(studio.selected);
        bar.style.display = ids.length ? 'flex' : 'none';
        countEl.textContent = ids.length + ' ' + (ids.length === 1 ? tr('selected') : tr('selected'));
      }

      function studioSelectedCourses() {
        return Object.keys(studio.selected).map(function(id) {
          return courses.find(function(c) { return c.id === parseInt(id); });
        }).filter(function(c) { return c && canManageCourse(c.id); });
      }

      function studioBulkPublish(publish) {
        var list = studioSelectedCourses();
        if (!list.length) return;
        list.forEach(function(c) {
          ensureCourseShape(c);
          c.modules.forEach(function(m) {
            m.published = publish;
            m.lessons.forEach(function(l) { l.published = publish; });
          });
          c.updatedAt = new Date().toISOString();
        });
        studio.selected = {};
        studioCommit();
        renderStudioSidebar();
        renderStudioEditor();
        renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
      }

      function studioBulkArchive() {
        var list = studioSelectedCourses();
        if (!list.length) return;
        if (!confirm(tr('Archive the selected courses? They stay recoverable and keep all their data.'))) return;
        list.forEach(function(c) { c.archived = true; c.updatedAt = new Date().toISOString(); });
        studio.selected = {};
        if (list.some(function(c) { return c.id === studio.courseId; })) studio.courseId = null;
        studioCommit();
        renderStudioSidebar();
        renderStudioEditor();
        renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
      }

      // ============================================================
      //  COURSE CREATE / SELECT / ARCHIVE / DUPLICATE / DELETE
      // ============================================================
      function studioCreateCourse(name) {
        if (!studioCanEdit()) return null;
        name = (name || tr('Untitled course')).trim();
        if (!name) name = tr('Untitled course');
        var course = ensureCourseShape({
          id: nextCourseId(),
          name: name,
          description: '',
          teacherId: isAdminUser() ? (teachers[0] ? teachers[0].id : currentUser.id) : currentUser.id,
          code: '',
          createdAt: new Date().toISOString()
        });
        course.updatedAt = new Date().toISOString();
        courses.push(course);
        studioCommit();
        renderStudioSidebar();
        renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
        return course;
      }

      function studioSelectCourse(courseId) {
        if (!canManageCourse(courseId)) return;
        studio.courseId = courseId;
        studio.tab = 'lessons';
        studio.sub = 'lesson';
        studioSelectEmoji = false;
        renderStudioSidebar();
        renderStudioEditor();
      }

      function studioArchiveCourse() {
        var c = studioCourse();
        if (!c) return;
        if (!canManageCourse(c.id)) return;
        if (!confirm(tr('Archive this course? It stays recoverable and keeps all its data.'))) return;
        c.archived = !c.archived;
        c.updatedAt = new Date().toISOString();
        studioCommit();
        renderStudioSidebar();
        renderStudioEditor();
        renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
      }

      function studioDeleteCourse() {
        var c = studioCourse();
        if (!c) return;
        if (!canManageCourse(c.id)) return;
        if (!confirm(tr('Permanently delete this course, its curriculum and its library items? This cannot be undone. Consider archiving instead.'))) return;
        courses = courses.filter(function(x) { return x.id !== c.id; });
        courseMaterials = courseMaterials.filter(function(m) { return m.courseId !== c.id; });
        Object.keys(lessonProgress).forEach(function(k) {
          if (k.indexOf(c.id + '::') === 0) delete lessonProgress[k];
        });
        studio.courseId = null;
        studioCommit();
        renderStudioSidebar();
        renderStudioEditor();
        renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
      }

      function studioDuplicateCourse() {
        var c = studioCourse();
        if (!c) return;
        if (!canManageCourse(c.id)) return;
        var clone = JSON.parse(JSON.stringify(c));
        clone.id = nextCourseId();
        clone.name = c.name + ' ' + tr('(copy)');
        clone.archived = false;
        clone.createdAt = new Date().toISOString();
        clone.updatedAt = clone.createdAt;
        ensureCourseShape(clone);
        var stamp = Date.now();
        clone.modules.forEach(function(m, mi) {
          m.id = studioNextId('m') + '-' + mi;
          m.lessons.forEach(function(l, li) {
            l.id = studioNextId('l') + '-' + mi + '-' + li;
            l.published = false;
          });
          m.published = false;
        });
        courses.push(clone);
        studioCommit();
        studio.courseId = clone.id;
        renderStudioSidebar();
        renderStudioEditor();
        renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
      }

      // ============================================================
      //  EDITOR SHELL
      // ============================================================
      function renderStudioEditor() {
        var empty = document.getElementById('studio-empty');
        var editor = document.getElementById('studio-editor');
        var c = studioCourse();
        if (!c || !canManageCourse(c.id)) {
          if (empty) empty.style.display = 'flex';
          if (editor) editor.style.display = 'none';
          return;
        }
        if (empty) empty.style.display = 'none';
        if (editor) editor.style.display = 'block';

        var emojiBtn = document.getElementById('studio-emoji-btn');
        if (emojiBtn) {
          emojiBtn.textContent = c.emoji || '📘';
          emojiBtn.style.background = (c.color || '#4f46e5') + '22';
        }
        var titleInput = document.getElementById('studio-course-title-input');
        if (titleInput && document.activeElement !== titleInput) titleInput.value = c.name;
        var pill = document.getElementById('studio-status-pill');
        if (pill) {
          pill.textContent = c.archived ? tr('Archived') : (isCoursePublished(c) ? tr('Published') : tr('Draft'));
          pill.className = 'pill' + (isCoursePublished(c) && !c.archived ? '' : ' warning');
        }
        var codeChip = document.getElementById('studio-meta-code');
        if (codeChip) codeChip.textContent = c.code ? tr('Code') + ': ' + c.code : '';
        var stuChip = document.getElementById('studio-meta-students');
        if (stuChip) stuChip.textContent = getEnrolledStudentIds(c.id).length + ' ' + tr('students');
        var lesChip = document.getElementById('studio-meta-lessons');
        if (lesChip) {
          lesChip.textContent = countCourseLessons(c.id, true) + ' ' + tr('lessons') + ' · ' +
            countCourseModules(c.id) + ' ' + tr('modules');
        }

        studioRenderTabs();
        renderStudioCurrentSection();
      }

      // The first tab is Lessons and the second Library; the last two are
      // course-level views that are not content sections.
      function studioRenderTabs() {
        STUDIO_TABS.forEach(function(name) {
          var tab = document.getElementById('studio-tab-' + name);
          var pane = document.getElementById('studio-pane-' + name);
          if (tab) tab.classList.toggle('active', studio.tab === name);
          if (pane) pane.classList.toggle('active', studio.tab === name);
        });
        studioRenderSubtabs();
      }

      function studioRenderSubtabs() {
        // The second level only exists inside the Lessons tab.
        STUDIO_SUBTABS.forEach(function(name) {
          var tab = document.getElementById('studio-subtab-' + name);
          var pane = document.getElementById('studio-subpane-' + name);
          if (tab) tab.classList.toggle('active', studio.sub === name);
          if (pane) pane.classList.toggle('active', studio.sub === name);
        });
      }

      function studioSetTab(name) {
        studio.tab = name;
        studioRenderTabs();
        renderStudioCurrentSection();
      }

      function studioSetSubTab(name) {
        studio.sub = name;
        studioRenderSubtabs();
        renderStudioCurrentSection();
      }

      // Single entry point for "draw whatever the active section needs".
      // The basic form and the suite both come back to this after saving.
      function renderStudioCurrentSection() {
        if (!studio.courseId) return;
        if (studio.tab === 'lessons') {
          if (studio.sub === 'task') renderStudioWorkList('material');
          else if (studio.sub === 'assignment') renderStudioWorkList('homework');
          else if (studio.sub === 'test') renderStudioWorkList('tests');
          else renderStudioCurriculum();
          return;
        }
        if (studio.tab === 'library') { renderStudioLibrary(); return; }
        if (studio.tab === 'settings') renderStudioSettings();
        else if (studio.tab === 'analytics') renderStudioAnalytics();
      }

      // ============================================================
      //  CURRICULUM — modules + lessons
      // ============================================================
      function renderStudioCurriculum() {
        var c = studioCourse();
        var listEl = document.getElementById('studio-module-list');
        if (!c || !listEl) return;
        var mods = getCourseModules(c.id);

        var emptyEl = document.getElementById('studio-curriculum-empty');
        if (emptyEl) emptyEl.style.display = mods.length ? 'none' : 'block';
        listEl.style.display = mods.length ? 'flex' : 'none';

        var html = '';
        mods.forEach(function(mod, mi) {
          var publishedLessons = mod.published ? mod.lessons.filter(function(l) { return l.published; }).length : 0;
          html += '<section class="studio-module" data-studio-module="' + escapeHtml(mod.id) + '" draggable="true">';
          html += '<div class="studio-module-head">' +
            '<span class="studio-drag" title="' + tr('Drag to reorder') + '">⠿</span>' +
            '<span class="studio-module-title">' + escapeHtml(mod.title) + '</span>' +
            '<span class="pill' + (mod.published ? '' : ' warning') + '">' + (mod.published ? tr('Published') : tr('Draft')) +
            '</span>' +
            '<span class="studio-meta-chip">' + mod.lessons.length + ' ' + tr('lessons') + ' · ' + publishedLessons +
            ' ' + tr('live') + '</span>' +
            '<div class="studio-module-actions">' +
            '<button class="icon-btn' + (mod.published ? ' on' : '') + '" data-mod-publish="' + escapeHtml(mod.id) +
            '" title="' + tr('Toggle published') + '">' + (mod.published ? '✓' : '◌') + '</button>' +
            '<button class="icon-btn" data-mod-up="' + escapeHtml(mod.id) + '" title="' + tr('Move up') + '"' +
            (mi === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="icon-btn" data-mod-down="' + escapeHtml(mod.id) + '" title="' + tr('Move down') + '"' +
            (mi === mods.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button class="icon-btn" data-mod-collapse="' + escapeHtml(mod.id) + '" title="' + tr('Collapse') + '">' +
            (mod.collapsed ? '▸' : '▾') + '</button>' +
            '<button class="icon-btn" data-mod-add="' + escapeHtml(mod.id) + '" title="' + tr('Add lesson') + '">＋</button>' +
            '<button class="icon-btn" data-mod-edit="' + escapeHtml(mod.id) + '" title="' + tr('Edit module') + '">✏️</button>' +
            '<button class="icon-btn danger" data-mod-delete="' + escapeHtml(mod.id) + '" title="' + tr('Delete module') +
            '">🗑</button>' +
            '</div></div>';
          if (mod.description) {
            html += '<p class="studio-module-sub">' + escapeHtml(mod.description) + '</p>';
          }

          if (!mod.collapsed) {
            html += '<div class="studio-lesson-list" data-studio-lessons="' + escapeHtml(mod.id) + '">';
            if (!mod.lessons.length) {
              html += '<p class="studio-list-empty">' + tr('No lessons in this module yet.') + '</p>';
            }
            mod.lessons.forEach(function(lesson, li) {
              var meta = [];
              if (lesson.duration) meta.push(lesson.duration + ' ' + tr('min'));
              if (lesson.type === 'assignment' && lesson.url) meta.push(tr('Linked task'));
              if (lesson.type === 'quiz' && lesson.url) meta.push(tr('Linked quiz'));
              html += '<div class="studio-lesson" data-studio-lesson="' + escapeHtml(lesson.id) + '" draggable="true">' +
                '<span class="studio-drag">⠿</span>' +
                '<span class="studio-lesson-icon">' + studioLessonTypeIcon(lesson.type) + '</span>' +
                '<span class="studio-lesson-main"><span class="studio-lesson-title">' + escapeHtml(lesson.title) + '</span>' +
                '<span class="studio-lesson-sub">' + escapeHtml(STUDIO_TYPE_LABELS[lesson.type] || lesson.type) +
                (meta.length ? ' · ' + escapeHtml(meta.join(' · ')) : '') + '</span></span>' +
                '<span class="studio-lesson-actions">' +
                '<button class="icon-btn' + (lesson.published ? ' on' : '') + '" data-lesson-publish="' +
                escapeHtml(lesson.id) + '" title="' + tr('Toggle published') + '">' + (lesson.published ? '✓' : '◌') + '</button>' +
                '<button class="icon-btn" data-lesson-up="' + escapeHtml(lesson.id) + '" title="' + tr('Move up') + '"' +
                (li === 0 ? ' disabled' : '') + '>↑</button>' +
                '<button class="icon-btn" data-lesson-down="' + escapeHtml(lesson.id) + '" title="' + tr('Move down') +
                '"' + (li === mod.lessons.length - 1 ? ' disabled' : '') + '>↓</button>' +
                '<button class="icon-btn" data-lesson-edit="' + escapeHtml(lesson.id) + '" title="' + tr('Edit lesson') +
                '">✏️</button>' +
                '<button class="icon-btn danger" data-lesson-delete="' + escapeHtml(lesson.id) + '" title="' +
                tr('Delete lesson') + '">🗑</button>' +
                '</span></div>';
            });
            html += '</div>' +
              '<button class="secondary-button studio-add-lesson" data-mod-add="' + escapeHtml(mod.id) + '">＋ ' +
              tr('Add lesson') + '</button>';
          }
          html += '</section>';
        });
        listEl.innerHTML = html;
        studioBindCurriculumEvents(listEl, c);
      }

      function studioBindCurriculumEvents(root, course) {
        var mods = getCourseModules(course.id);

        function findMod(id) {
          return mods.find(function(m) { return m.id === id; });
        }
        function findLesson(id) {
          for (var i = 0; i < mods.length; i++) {
            var found = mods[i].lessons.find(function(l) { return l.id === id; });
            if (found) return { mod: mods[i], lesson: found };
          }
          return null;
        }
        function move(arr, from, to) {
          if (to < 0 || to >= arr.length) return false;
          var item = arr.splice(from, 1)[0];
          arr.splice(to, 0, item);
          return true;
        }

        root.querySelectorAll('[data-mod-publish]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var m = findMod(btn.dataset.modPublish);
            if (!m) return;
            m.published = !m.published;
            m.lessons.forEach(function(l) { l.published = m.published; });
            studioCommit();
            renderStudioCurriculum();
            renderStudioSidebar();
          });
        });
        root.querySelectorAll('[data-mod-up]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var idx = mods.findIndex(function(m) { return m.id === btn.dataset.modUp; });
            if (move(mods, idx, idx - 1)) { studioCommit(); renderStudioCurriculum(); renderStudioSidebar(); }
          });
        });
        root.querySelectorAll('[data-mod-down]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var idx = mods.findIndex(function(m) { return m.id === btn.dataset.modDown; });
            if (move(mods, idx, idx + 1)) { studioCommit(); renderStudioCurriculum(); renderStudioSidebar(); }
          });
        });
        root.querySelectorAll('[data-mod-collapse]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var m = findMod(btn.dataset.modCollapse);
            if (!m) return;
            m.collapsed = !m.collapsed;
            studioCommit();
            renderStudioCurriculum();
          });
        });
        root.querySelectorAll('[data-mod-add]').forEach(function(btn) {
          btn.addEventListener('click', function() { openStudioLessonModal(btn.dataset.modAdd, null); });
        });
        root.querySelectorAll('[data-mod-edit]').forEach(function(btn) {
          btn.addEventListener('click', function() { openStudioModuleModal(btn.dataset.modEdit); });
        });
        root.querySelectorAll('[data-mod-delete]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var m = findMod(btn.dataset.modDelete);
            if (!m) return;
            if (!confirm(tr('Delete this module and its lessons?'))) return;
            var i = mods.indexOf(m);
            mods.splice(i, 1);
            studioCommit();
            renderStudioCurriculum();
            renderStudioSidebar();
          });
        });
        root.querySelectorAll('[data-lesson-publish]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var found = findLesson(btn.dataset.lessonPublish);
            if (!found) return;
            found.lesson.published = !found.lesson.published;
            studioCommit();
            renderStudioCurriculum();
            renderStudioSidebar();
          });
        });
        root.querySelectorAll('[data-lesson-up]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var found = findLesson(btn.dataset.lessonUp);
            if (!found) return;
            var arr = found.mod.lessons;
            var idx = arr.indexOf(found.lesson);
            if (move(arr, idx, idx - 1)) { studioCommit(); renderStudioCurriculum(); }
          });
        });
        root.querySelectorAll('[data-lesson-down]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var found = findLesson(btn.dataset.lessonDown);
            if (!found) return;
            var arr = found.mod.lessons;
            var idx = arr.indexOf(found.lesson);
            if (move(arr, idx, idx + 1)) { studioCommit(); renderStudioCurriculum(); }
          });
        });
        root.querySelectorAll('[data-lesson-edit]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var found = findLesson(btn.dataset.lessonEdit);
            if (found) openStudioLessonModal(found.mod.id, found.lesson);
          });
        });
        root.querySelectorAll('[data-lesson-delete]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var found = findLesson(btn.dataset.lessonDelete);
            if (!found) return;
            if (!confirm(tr('Delete this lesson?'))) return;
            var arr = found.mod.lessons;
            arr.splice(arr.indexOf(found.lesson), 1);
            Object.keys(lessonProgress).forEach(function(k) {
              if (k.indexOf(course.id + '::' + found.lesson.id + '::') === 0) delete lessonProgress[k];
            });
            studioCommit();
            renderStudioCurriculum();
            renderStudioSidebar();
          });
        });

        // --- Drag & drop reordering ---
        var moduleEls = Array.prototype.slice.call(root.querySelectorAll('[data-studio-module]'));
        moduleEls.forEach(function(el) {
          el.addEventListener('dragstart', function(e) {
            studio.dragModuleId = el.getAttribute('data-studio-module');
            studio.dragLesson = null;
            el.classList.add('dragging');
            try { e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* older browsers */ }
            try { e.dataTransfer.setData('text/plain', studio.dragModuleId); } catch (err2) { /* noop */ }
          });
          el.addEventListener('dragend', function() {
            el.classList.remove('dragging');
            moduleEls.forEach(function(x) { x.classList.remove('drop-target'); });
            studio.dragModuleId = null;
          });
          el.addEventListener('dragover', function(e) {
            if (!studio.dragModuleId) return;
            e.preventDefault();
            el.classList.add('drop-target');
          });
          el.addEventListener('dragleave', function() { el.classList.remove('drop-target'); });
          el.addEventListener('drop', function(e) {
            e.preventDefault();
            el.classList.remove('drop-target');
            var fromId = studio.dragModuleId;
            var toId = el.getAttribute('data-studio-module');
            if (!fromId || fromId === toId) return;
            var from = mods.findIndex(function(m) { return m.id === fromId; });
            var to = mods.findIndex(function(m) { return m.id === toId; });
            if (move(mods, from, to)) { studioCommit(); renderStudioCurriculum(); renderStudioSidebar(); }
          });
        });

        root.querySelectorAll('[data-studio-lesson]').forEach(function(el) {
          el.addEventListener('dragstart', function(e) {
            e.stopPropagation();
            var lessonId = el.getAttribute('data-studio-lesson');
            var modEl = el.closest('[data-studio-module]');
            studio.dragLesson = { lessonId: lessonId, moduleId: modEl.getAttribute('data-studio-module') };
            studio.dragModuleId = null;
            el.classList.add('dragging');
            try { e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* older browsers */ }
            try { e.dataTransfer.setData('text/plain', lessonId); } catch (err2) { /* noop */ }
          });
          el.addEventListener('dragend', function() {
            el.classList.remove('dragging');
            root.querySelectorAll('.studio-lesson').forEach(function(x) { x.classList.remove('drop-target'); });
            studio.dragLesson = null;
          });
          el.addEventListener('dragover', function(e) {
            if (!studio.dragLesson) return;
            e.preventDefault();
            e.stopPropagation();
            el.classList.add('drop-target');
          });
          el.addEventListener('dragleave', function() { el.classList.remove('drop-target'); });
          el.addEventListener('drop', function(e) {
            if (!studio.dragLesson) return;
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('drop-target');
            var targetLessonId = el.getAttribute('data-studio-lesson');
            var targetMod = el.closest('[data-studio-lessons]');
            var targetModuleId = targetMod ? targetMod.getAttribute('data-studio-lessons') : null;
            var srcMod = mods.find(function(m) { return m.id === studio.dragLesson.moduleId; });
            var dstMod = mods.find(function(m) { return m.id === targetModuleId; });
            if (!srcMod || !dstMod) return;
            var srcIdx = srcMod.lessons.findIndex(function(l) { return l.id === studio.dragLesson.lessonId; });
            if (srcIdx === -1) return;
            var moved = srcMod.lessons.splice(srcIdx, 1)[0];
            var dstIdx = dstMod.lessons.findIndex(function(l) { return l.id === targetLessonId; });
            dstMod.lessons.splice(dstIdx === -1 ? dstMod.lessons.length : dstIdx, 0, moved);
            studioCommit();
            renderStudioCurriculum();
          });
        });
      }

      // ============================================================
      //  MODULE MODAL
      // ============================================================
      function openStudioModuleModal(moduleId) {
        var c = studioCourse();
        if (!c) return;
        var overlay = document.getElementById('studio-module-modal-overlay');
        if (!overlay) return;
        var editId = document.getElementById('studio-module-edit-id');
        var title = document.getElementById('studio-module-title');
        var desc = document.getElementById('studio-module-description');
        var pub = document.getElementById('studio-module-published');
        var heading = document.getElementById('studio-module-modal-title');

        var mods = getCourseModules(c.id);
        var mod = moduleId ? mods.find(function(m) { return m.id === moduleId; }) : null;
        if (editId) editId.value = mod ? mod.id : '';
        if (heading) heading.textContent = mod ? tr('Edit module') : tr('Add module');
        if (title) title.value = mod ? mod.title : '';
        if (desc) desc.value = mod ? (mod.description || '') : '';
        if (pub) pub.checked = mod ? !!mod.published : false;
        overlay.classList.add('open');
        if (title) title.focus();
      }

      function saveStudioModule() {
        var c = studioCourse();
        if (!c || !canManageCourse(c.id)) return;
        var editId = document.getElementById('studio-module-edit-id').value;
        var title = document.getElementById('studio-module-title').value.trim();
        var desc = document.getElementById('studio-module-description').value.trim();
        var pub = document.getElementById('studio-module-published').checked;
        if (!title) { alert(tr('Please enter a module title.')); return; }

        var mods = getCourseModules(c.id);
        if (editId) {
          var mod = mods.find(function(m) { return m.id === editId; });
          if (mod) {
            mod.title = title;
            mod.description = desc;
            mod.published = pub;
          }
        } else {
          mods.push({
            id: studioNextId('m'),
            title: title,
            description: desc,
            published: pub,
            collapsed: false,
            lessons: []
          });
        }
        c.updatedAt = new Date().toISOString();
        studioCommit();
        document.getElementById('studio-module-modal-overlay').classList.remove('open');
        renderStudioCurriculum();
        renderStudioSidebar();
        setLanguage(currentLang);
      }

      // ============================================================
      //  LESSON MODAL + RICH TEXT EDITOR
      // ============================================================
      function openStudioLessonModal(moduleId, lesson) {
        var c = studioCourse();
        if (!c) return;
        var overlay = document.getElementById('studio-lesson-modal-overlay');
        if (!overlay) return;
        studio.lessonType = lesson ? lesson.type : 'text';
        studio.lessonFile = lesson && lesson.fileData ? { name: lesson.fileName, data: lesson.fileData } : null;

        document.getElementById('studio-lesson-module-id').value = moduleId || '';
        document.getElementById('studio-lesson-edit-id').value = lesson ? lesson.id : '';
        document.getElementById('studio-lesson-title').value = lesson ? lesson.title : '';
        document.getElementById('studio-lesson-duration').value = lesson && lesson.duration ? lesson.duration : '';
        document.getElementById('studio-lesson-url').value = lesson ? (lesson.url || '') : '';
        document.getElementById('studio-lesson-published').checked = lesson ? !!lesson.published : false;
        var body = document.getElementById('studio-lesson-body');
        if (body) body.innerHTML = lesson ? (lesson.body || '') : '';
        var fileName = document.getElementById('studio-lesson-file-name');
        if (fileName) fileName.textContent = studio.lessonFile ? studio.lessonFile.name : tr('No file chosen');
        var heading = document.getElementById('studio-lesson-modal-title');
        if (heading) heading.textContent = lesson ? tr('Edit lesson') : tr('Add lesson');

        renderStudioTypeGrid();
        studioSyncLessonTypeFields();
        studioRefreshRtePreview();
        overlay.classList.add('open');
        var titleInput = document.getElementById('studio-lesson-title');
        if (titleInput) titleInput.focus();
      }

      function renderStudioTypeGrid() {
        var grid = document.getElementById('studio-type-grid');
        if (!grid) return;
        var html = '';
        STUDIO_LESSON_TYPES.forEach(function(t) {
          html += '<button type="button" class="studio-type' + (studio.lessonType === t.value ? ' active' : '') +
            '" data-studio-type="' + t.value + '"><span>' + t.icon + '</span><span>' +
            escapeHtml(tr(STUDIO_TYPE_LABELS[t.value])) + '</span></button>';
        });
        grid.innerHTML = html;
        grid.querySelectorAll('[data-studio-type]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            studio.lessonType = btn.dataset.studioType;
            renderStudioTypeGrid();
            studioSyncLessonTypeFields();
          });
        });
      }

      function studioSyncLessonTypeFields() {
        var t = studio.lessonType;
        var map = {
          'studio-body-text': ['text', 'video', 'live', 'embed'].indexOf(t) !== -1,
          'studio-body-url': ['link', 'video', 'live', 'embed'].indexOf(t) !== -1,
          'studio-body-file': t === 'file',
          'studio-body-assignment': t === 'assignment',
          'studio-body-quiz': t === 'quiz'
        };
        Object.keys(map).forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.style.display = map[id] ? 'block' : 'none';
        });

        if (t === 'assignment') {
          var sel = document.getElementById('studio-lesson-assignment');
          if (sel) {
            var own = tasks.filter(function(x) {
              return x.assignedTo === 'course' && x.assignedIds && x.assignedIds.indexOf(studio.courseId) !== -1;
            });
            sel.innerHTML = '<option value="">' + tr('None') + '</option>' + own.map(function(x) {
              return '<option value="' + x.id + '">' + escapeHtml(x.title) + '</option>';
            }).join('');
          }
        }
        if (t === 'quiz') {
          var qsel = document.getElementById('studio-lesson-quiz');
          if (qsel) {
            var quizzes = (tests || []).filter(function(x) { return x.courseId === studio.courseId; });
            qsel.innerHTML = '<option value="">' + tr('None') + '</option>' + quizzes.map(function(x) {
              return '<option value="' + x.id + '">' + escapeHtml(x.title) + '</option>';
            }).join('');
          }
        }
      }

      function studioRefreshRtePreview() {
        var preview = document.getElementById('studio-lesson-preview');
        var body = document.getElementById('studio-lesson-body');
        if (preview && body) preview.innerHTML = body.innerHTML || '<p style="color:var(--muted)">' +
          tr('Nothing to preview yet.') + '</p>';
      }

      function saveStudioLesson() {
        var c = studioCourse();
        if (!c || !canManageCourse(c.id)) return;
        var moduleId = document.getElementById('studio-lesson-module-id').value;
        var editId = document.getElementById('studio-lesson-edit-id').value;
        var title = document.getElementById('studio-lesson-title').value.trim();
        var duration = parseInt(document.getElementById('studio-lesson-duration').value, 10) || 0;
        var url = document.getElementById('studio-lesson-url').value.trim();
        var published = document.getElementById('studio-lesson-published').checked;
        var bodyEl = document.getElementById('studio-lesson-body');
        var html = bodyEl ? sanitizeRichHtml(bodyEl.innerHTML) : '';

        if (!title) { alert(tr('Please enter a lesson title.')); return; }
        if (studio.lessonType === 'link' && !url) { alert(tr('Please enter a link URL.')); return; }
        if (studio.lessonType === 'file' && !studio.lessonFile) { alert(tr('Please choose a file.')); return; }

        var linkedId = '';
        if (studio.lessonType === 'assignment') {
          linkedId = document.getElementById('studio-lesson-assignment').value;
        } else if (studio.lessonType === 'quiz') {
          linkedId = document.getElementById('studio-lesson-quiz').value;
        }

        var mods = getCourseModules(c.id);
        var targetMod = mods.find(function(m) { return m.id === moduleId; }) || mods[0];
        if (!targetMod) {
          targetMod = { id: studioNextId('m'), title: tr('Lessons'), description: '', published: false, lessons: [] };
          mods.push(targetMod);
        }

        if (editId) {
          var existing = targetMod.lessons.find(function(l) { return l.id === editId; });
          if (!existing) {
            mods.forEach(function(m) {
              if (!existing) existing = m.lessons.find(function(l) { return l.id === editId; });
            });
          }
          if (existing) {
            existing.title = title;
            existing.type = studio.lessonType;
            existing.duration = duration;
            existing.body = ['text', 'video', 'live', 'embed'].indexOf(studio.lessonType) !== -1 ? html : '';
            existing.url = url || linkedId || '';
            existing.published = published;
            if (studio.lessonFile) {
              existing.fileName = studio.lessonFile.name;
              existing.fileData = studio.lessonFile.data;
            }
          }
        } else {
          targetMod.lessons.push({
            id: studioNextId('l'),
            title: title,
            type: studio.lessonType,
            body: ['text', 'video', 'live', 'embed'].indexOf(studio.lessonType) !== -1 ? html : '',
            url: url || linkedId || '',
            fileName: studio.lessonFile ? studio.lessonFile.name : '',
            fileData: studio.lessonFile ? studio.lessonFile.data : '',
            duration: duration,
            published: published,
            order: targetMod.lessons.length
          });
        }
        c.updatedAt = new Date().toISOString();
        studioCommit();
        document.getElementById('studio-lesson-modal-overlay').classList.remove('open');
        renderStudioCurriculum();
        renderStudioSidebar();
        setLanguage(currentLang);
      }

      // Strips scripts, event handlers and dangerous URLs from lesson HTML.
      function sanitizeRichHtml(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html || '';
        wrapper.querySelectorAll('script,style,iframe[src*="javascript"],object,embed,form,link,meta').forEach(function(node) {
          node.remove();
        });
        Array.prototype.forEach.call(wrapper.querySelectorAll('*'), function(node) {
          Array.prototype.slice.call(node.attributes).forEach(function(attr) {
            var name = attr.name.toLowerCase();
            var value = (attr.value || '').trim().toLowerCase();
            if (name.indexOf('on') === 0) node.removeAttribute(attr.name);
            else if ((name === 'href' || name === 'src') && value.indexOf('javascript:') === 0) node.removeAttribute(attr.name);
          });
          if (node.tagName === 'A') {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        });
        return wrapper.innerHTML;
      }

      function initStudioRte() {
        var toolbar = document.getElementById('studio-rte-toolbar');
        if (!toolbar) return;
        toolbar.querySelectorAll('[data-cmd]').forEach(function(btn) {
          btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
          btn.addEventListener('click', function() {
            var body = document.getElementById('studio-lesson-body');
            if (!body) return;
            body.focus();
            var cmd = btn.dataset.cmd;
            if (cmd === 'formatBlock') {
              document.execCommand('formatBlock', false, btn.dataset.value);
            } else {
              document.execCommand(cmd, false, null);
            }
            studioRefreshRtePreview();
          });
        });
        toolbar.querySelectorAll('[data-block]').forEach(function(btn) {
          btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
          btn.addEventListener('click', function() {
            var body = document.getElementById('studio-lesson-body');
            if (!body) return;
            body.focus();
            document.execCommand('formatBlock', false, btn.dataset.block);
            studioRefreshRtePreview();
          });
        });
        var previewToggle = document.getElementById('studio-rte-preview-toggle');
        if (previewToggle) {
          previewToggle.addEventListener('click', function() {
            var area = document.getElementById('studio-lesson-body');
            var preview = document.getElementById('studio-lesson-preview');
            if (!area || !preview) return;
            var showPreview = area.style.display !== 'none';
            area.style.display = showPreview ? 'none' : 'block';
            preview.style.display = showPreview ? 'block' : 'none';
            previewToggle.classList.toggle('active', showPreview);
            studioRefreshRtePreview();
          });
        }
        var body = document.getElementById('studio-lesson-body');
        if (body) body.addEventListener('input', studioRefreshRtePreview);
      }

      // ============================================================
      //  COURSE WORK SECTIONS
      //  Tasks, assignments and tests used to live on their own pages.
      //  They are now sections of the course, so everything a teacher
      //  hands out is created from inside the course.
      // ============================================================
      // One row renderer for all three work sections.
      function studioWorkRow(opts) {
        return '<div class="studio-work" data-work-id="' + opts.id + '" data-work-kind="' + opts.kind + '">' +
          '<span class="studio-work-icon" aria-hidden="true">' + opts.icon + '</span>' +
          '<div class="studio-work-main"><div class="studio-work-title">' + escapeHtml(opts.title) + '</div>' +
          '<div class="studio-work-sub">' + opts.sub + '</div></div>' +
          '<div class="studio-work-actions">' + opts.actions + '</div></div>';
      }

      function studioSubmissionCount(taskId) {
        return Object.keys(taskSubmissions).filter(function(key) {
          return key.indexOf(taskId + '-') === 0;
        }).length;
      }

      function studioTestSubmissionCount(testId) {
        return Object.keys(testSubmissions).filter(function(key) {
          return key.indexOf(testId + '-') === 0;
        }).length;
      }

      function renderStudioWorkList(kind) {
        var c = studioCourse();
        var hostId = kind === 'material' ? 'studio-material-tasks'
          : (kind === 'tests' ? 'studio-test-list' : 'studio-assignment-list');        var listEl = document.getElementById(hostId);
        if (!c || !listEl) return;
        if (!canManageCourse(c.id)) {
          listEl.innerHTML = '';
          return;
        }

        var items = [];
        if (kind === 'tests') {
          // Drafts are listed too, so a teacher can finish and deploy them.
          items = tests.filter(function(t) { return t.courseId === c.id; });
        } else {
          // Legacy interactive tasks count as material so nothing that used to
          // be visible drops out of the course. Drafts stay listed because the
          // teacher has to be able to deploy them.
          items = tasks.filter(function(t) {
            // `homework` is the individual work a student must finish alone;
            // everything else is class or extra work.
            var isHomework = t.type === 'homework';
            if (kind === 'homework' ? !isHomework : isHomework) return false;
            return taskCourseId(t) === c.id;
          });
        }

        if (!items.length) {
          listEl.innerHTML = '<div class="studio-work-empty">' + escapeHtml(
            kind === 'tests'
              ? tr('No tests in this course yet. Use “Add test” to create one.')
              : (kind === 'homework'
                ? tr('No homework in this course yet. Use “Add homework” to create one.')
                : tr('No tasks in this course yet. Use “Add task” to create one.'))) + '</div>';
          return;
        }

        items.sort(function(a, b) { return String(a.deadline || '').localeCompare(String(b.deadline || '')); });

        var html = '';
        items.forEach(function(item) {
          var draft = item.published === false;
          var subCount = kind === 'tests' ? studioTestSubmissionCount(item.id) : studioSubmissionCount(item.id);
          var pieces = [];
          if (item.deadline) pieces.push('⏰ ' + escapeHtml(item.deadline));
          if (item.blocks && item.blocks.length) {
            pieces.push('🧩 ' + item.blocks.length + ' ' + tr('blocks') + ' · ' +
              blockTotalPoints(item.blocks) + ' ' + tr('points'));
          } else if (kind === 'tests' && item.questions && item.questions.length) {
            pieces.push('❓ ' + item.questions.length + ' ' + tr('questions'));
          } else if (item.files && item.files.length) {
            pieces.push('📎 ' + item.files.length + ' ' + tr('files'));
          }
          pieces.push('👤 ' + subCount + ' ' + tr('submissions'));
          pieces.push('<span class="' + (draft ? 'studio-work-draft' : '') + '">' +
            (draft ? tr('Draft') : tr('Deployed')) + '</span>');

          var actions = '';
          if (kind === 'tests') {
            actions += '<button data-work-submissions="' + item.id + '">👥 ' + escapeHtml(tr('Submissions')) + '</button>';
          } else {
            if (draft) {
              actions += '<button data-work-deploy="' + item.id + '">🚀 ' + escapeHtml(tr('Deploy')) + '</button>';
            }
            if (item.kind !== 'suite') {
              actions += '<button data-work-edit="' + item.id + '">✏️ ' + escapeHtml(tr('Edit')) + '</button>';
            }
            actions += '<button data-work-submissions="' + item.id + '">👥 ' + escapeHtml(tr('Submissions')) + '</button>';
          }
          actions += '<button class="danger" data-work-delete="' + item.id + '">🗑 ' + escapeHtml(tr('Delete')) + '</button>';

          html += studioWorkRow({
            id: item.id,
            kind: kind,
            icon: kind === 'tests' ? '📋' : (kind === 'assignment' ? '📝' : '📎'),
            title: item.title,
            sub: pieces.join(' · '),
            actions: actions
          });
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('[data-work-deploy]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = parseInt(btn.dataset.workDeploy, 10);
            if (kind === 'tests') {
              var test = tests.find(function(t) { return t.id === id; });
              if (!test) return;
              test.published = true;
              test.publishedAt = new Date().toISOString();
              studioCommit();
            } else {
              // deployTaskById owns the ownership check and the save.
              if (!deployTaskById(id)) return;
            }
            renderStudioWorkList(kind);
            renderTasks();
            setLanguage(currentLang);
          });
        });

        listEl.querySelectorAll('[data-work-submissions]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (kind === 'tests') { viewTestSubmissions(parseInt(btn.dataset.workSubmissions, 10)); return; }
            viewTaskSubmissions(parseInt(btn.dataset.workSubmissions, 10));
          });
        });

        listEl.querySelectorAll('[data-work-edit]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            openBasicTaskModal(c.id, kind, parseInt(btn.dataset.workEdit, 10));
          });
        });

        listEl.querySelectorAll('[data-work-delete]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = parseInt(btn.dataset.workDelete, 10);
            var item = kind === 'tests' ? tests.find(function(t) { return t.id === id; })
              : tasks.find(function(t) { return t.id === id; });
            if (!item) return;
            if (!confirm(tr('Delete') + ': ' + item.title + '?')) return;
            if (kind === 'tests') {
              tests = tests.filter(function(t) { return t.id !== id; });
              Object.keys(testSubmissions).forEach(function(key) {
                if (key.indexOf(id + '-') === 0) delete testSubmissions[key];
              });
              studioCommit();
            } else {
              // deleteTask owns the ownership check and submission cleanup.
              if (!deleteTask(id)) return;
            }
            renderStudioWorkList(kind);
            renderTasks();
            setLanguage(currentLang);
          });
        });
      }

      // ============================================================
      //  BUILD METHOD PROMPT
      //  Every new task, assignment or test asks the teacher whether
      //  they want the quick form or the full Task Designer Suite.
      // ============================================================
      function askBuildMethod(kind) {
        var c = studioCourse();
        if (!c) return;
        var overlay = document.getElementById('build-method-overlay');
        if (!overlay) { openStudioBasic(c.id, kind); return; }
        studio.buildKind = kind;
        var titles = { material: tr('task'), assignment: tr('assignment'), tests: tr('test') };
        var titleEl = document.getElementById('build-method-title');
        var subEl = document.getElementById('build-method-sub');
        if (titleEl) titleEl.textContent = tr('How do you want to build this?');
        if (subEl) {
          subEl.textContent = tr('New') + ' ' + titles[kind] + ' — ' + escapeHtml(c.name) + '. ' +
            tr('Choose a starting point.');
        }
        overlay.classList.add('open');
        setLanguage(currentLang);
      }

      // Basic upload: the plain title / description / deadline form, pre-pointed
      // at this course. Tasks and assignments share the task form; a test uses
      // the question based test form.
      function openStudioBasic(courseId, kind) {
        if (kind === 'tests') { openBasicTestModal(courseId); return; }
        openBasicTaskModal(courseId, kind);
      }

      function openBasicTaskModal(courseId, kind, editId) {
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c) return;
        if (!canManageCourse(courseId)) return;
        studio.pendingCourseId = courseId;
        studio.pendingKind = kind;
        var editing = null;
        if (editId) {
          editing = tasks.find(function(t) { return t.id === editId; });
          if (editing && !canManageTaskById(editId)) return;
        }

        var overlay = document.getElementById('task-modal-overlay');
        if (!overlay) return;
        var titleEl = document.getElementById('task-modal-title');
        var subEl = document.getElementById('task-modal-sub');
        var titleInput = document.getElementById('task-modal-title-input');
        var typeSel = document.getElementById('task-modal-type');
        var assignSel = document.getElementById('task-modal-assign');
        var optionsEl = document.getElementById('task-modal-assign-options');
        var saveBtn = document.getElementById('task-modal-save');
        var qBuilder = document.getElementById('task-questions-builder');
        var qContainer = document.getElementById('task-questions-container');

        if (qContainer) qContainer.innerHTML = '';
        if (qBuilder) qBuilder.style.display = 'none';
        document.getElementById('task-modal-priority').value = 'medium';
        document.getElementById('task-modal-description').value = '';
        document.getElementById('task-modal-deadline').value = '';
        populateHomeworkLessonPicker();
        syncHomeworkLessonField();
        document.getElementById('task-file-list').innerHTML = '';
        tempTaskFiles = [];
        studio.editingTaskId = editing ? editing.id : null;

        if (editing) {
          if (titleEl) titleEl.textContent = tr('Edit task');
          if (subEl) subEl.textContent = escapeHtml(c.name);
          titleInput.value = editing.title || '';
          typeSel.value = editing.type || (kind === 'assignment' ? 'assignment' : 'homework');
          document.getElementById('task-modal-priority').value = editing.priority || 'medium';
          document.getElementById('task-modal-description').value = editing.description || '';
          document.getElementById('task-modal-deadline').value = editing.deadline || '';
          assignSel.value = editing.assignedTo || 'course';
        } else {
          if (titleEl) titleEl.textContent = tr('Create') + ' ' + tr(kind === 'assignment' ? 'assignment' : 'task');
          if (subEl) subEl.textContent = escapeHtml(c.name) + ' — ' + tr('fill in the details below');
          titleInput.value = '';
          typeSel.value = kind === 'assignment' ? 'assignment' : 'homework';
        }

        // The course is the destination, so the picker starts on it with
        // this course already ticked.
        assignSel.value = 'course';
        optionsEl.style.display = 'block';
        var html = '<label>' + escapeHtml(tr('Select course')) + '</label>';
        var pool = isAdminUser() ? courses.slice() : courses.filter(function(x) { return x.teacherId === currentUser.id; });
        pool.forEach(function(x) {
          var on = x.id === courseId;
          html += '<div class="enrollment-item"><input type="checkbox" class="task-assign-checkbox" value="' +
            x.id + '"' + (on ? ' checked' : '') + ' /><label>' + escapeHtml(x.name) + '</label></div>';
        });
        optionsEl.innerHTML = html;

        if (saveBtn) saveBtn.textContent = editing ? tr('Save changes') : tr('Create task');
        overlay.classList.add('open');
        setLanguage(currentLang);
      }

      // Task Designer Suite: same origin, so the course and the kind travel
      // in the query string and the suite comes back already pointed at them.
      function openStudioSuite(courseId, kind) {
        var c = courses.find(function(x) { return x.id === courseId; });
        if (!c) return;
        if (!canManageCourse(courseId)) return;
        var suiteKind = kind === 'tests' ? 'test' : (kind === 'assignment' ? 'assignment' : 'material');
        // Remember exactly where the teacher was, so the Suite's back button
        // returns to this tab instead of the course list.
        try {
          sessionStorage.setItem('nokj-studio-back', 'courses/' + courseId + '/' + studioKind);
        } catch (e) { /* noop */ }
        window.location.href = 'suite/index.html?course=' + encodeURIComponent(courseId) +
          '&kind=' + encodeURIComponent(suiteKind);
      }

      // ============================================================
      //  LIBRARY (existing notes / links / files)
      // ============================================================
      function renderStudioLibrary() {
        var c = studioCourse();
        var listEl = document.getElementById('studio-lib-list');
        if (!c || !listEl) return;
        var mats = getCourseMaterials(c.id);
        if (!mats.length) {
          listEl.innerHTML = '<p class="studio-list-empty">' +
            tr('No study material yet. Add your first note, link or file above.') + '</p>';
          return;
        }
        var html = '';
        mats.forEach(function(m) {
          var detail = '';
          if (m.kind === 'link' && m.url) {
            detail = '<a class="studio-preview-link" href="' + escapeHtml(m.url) + '" target="_blank" rel="noopener">' +
              escapeHtml(m.url) + '</a>';
          } else if (m.kind === 'note' && m.body) {
            detail = '<div class="studio-lib-body">' + escapeHtml(m.body) + '</div>';
          } else if (m.kind === 'file' && m.fileData) {
            detail = '<span class="file-link" onclick="window.openFilePreview(\'' +
              escapeHtml(m.fileName || 'file') + '\', \'' + String(m.fileData).replace(/'/g, "\\'") + '\')">' +
              escapeHtml(m.fileName || tr('Open file')) + '</span>';
          }
          html += '<div class="studio-lib-item" data-lib-id="' + m.id + '">' +
            '<span class="studio-lesson-icon">' + (m.kind === 'link' ? '🔗' : m.kind === 'file' ? '📎' : '📄') + '</span>' +
            '<div class="studio-lib-main"><div class="studio-lib-title">' + escapeHtml(m.title) + '</div>' +
            (m.fileName && m.kind === 'file' ? '<div class="studio-lib-body">' + escapeHtml(m.fileName) + '</div>' : '') +
            detail +
            '<div class="studio-lib-meta"><span class="pill' + (m.published ? '' : ' warning') + '">' +
            (m.published ? tr('Published') : tr('Draft')) + '</span>' +
            '<span class="studio-meta-chip">' + escapeHtml(tr(m.kind)) + '</span></div></div>' +
            '<div class="studio-lib-actions">' +
            '<button class="icon-btn' + (m.published ? ' on' : '') + '" data-lib-toggle="' + m.id + '" title="' +
            tr('Toggle published') + '">' + (m.published ? '✓' : '◌') + '</button>' +
            '<button class="icon-btn" data-lib-edit="' + m.id + '" title="' + tr('Edit') + '">✏️</button>' +
            '<button class="icon-btn danger" data-lib-delete="' + m.id + '" title="' + tr('Delete') + '">🗑</button>' +
            '</div></div>';
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('[data-lib-toggle]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (!canManageCourse(c.id)) return;
            var mat = courseMaterials.find(function(m) { return m.id === parseInt(btn.dataset.libToggle); });
            if (mat) { mat.published = !mat.published; studioCommit(); renderStudioLibrary(); }
          });
        });
        listEl.querySelectorAll('[data-lib-edit]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var mat = courseMaterials.find(function(m) { return m.id === parseInt(btn.dataset.libEdit); });
            if (mat) studioEditLibraryItem(mat);
          });
        });
        listEl.querySelectorAll('[data-lib-delete]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            if (!canManageCourse(c.id)) return;
            if (!confirm(tr('Delete this material?'))) return;
            courseMaterials = courseMaterials.filter(function(m) { return m.id !== parseInt(btn.dataset.libDelete); });
            studioCommit();
            renderStudioLibrary();
          });
        });
      }

      function studioResetLibraryForm() {
        document.getElementById('studio-lib-edit-id').value = '';
        document.getElementById('studio-lib-title').value = '';
        document.getElementById('studio-lib-body').value = '';
        document.getElementById('studio-lib-url').value = '';
        document.getElementById('studio-lib-file').value = '';
        document.getElementById('studio-lib-file-name').textContent = tr('No file chosen');
        document.getElementById('studio-lib-published').checked = true;
        studio.libFile = null;
      }

      function studioEditLibraryItem(mat) {
        document.getElementById('studio-lib-edit-id').value = mat.id;
        document.getElementById('studio-lib-title').value = mat.title || '';
        document.getElementById('studio-lib-kind').value = mat.kind || 'note';
        document.getElementById('studio-lib-body').value = mat.body || '';
        document.getElementById('studio-lib-url').value = mat.url || '';
        document.getElementById('studio-lib-published').checked = !!mat.published;
        studio.libFile = mat.fileData ? { name: mat.fileName, data: mat.fileData } : null;
        document.getElementById('studio-lib-file-name').textContent = mat.fileName || tr('No file chosen');
        studioSyncLibraryFields();
        document.getElementById('studio-lib-title').focus();
      }

      function studioSyncLibraryFields() {
        var v = document.getElementById('studio-lib-kind').value;
        document.getElementById('studio-lib-note-wrap').style.display = v === 'note' ? 'block' : 'none';
        document.getElementById('studio-lib-link-wrap').style.display = v === 'link' ? 'block' : 'none';
        document.getElementById('studio-lib-file-wrap').style.display = v === 'file' ? 'block' : 'none';
      }

      function saveStudioLibraryItem() {
        var c = studioCourse();
        if (!c || !canManageCourse(c.id)) return;
        var editId = parseInt(document.getElementById('studio-lib-edit-id').value, 10);
        var title = document.getElementById('studio-lib-title').value.trim();
        var kind = document.getElementById('studio-lib-kind').value;
        var body = document.getElementById('studio-lib-body').value.trim();
        var url = document.getElementById('studio-lib-url').value.trim();
        var published = document.getElementById('studio-lib-published').checked;
        if (!title) { alert(tr('Please enter a title.')); return; }
        if (kind === 'link' && !url && !editId) { alert(tr('Please enter a link URL.')); return; }
        if (kind === 'file' && !studio.libFile && !editId) { alert(tr('Please choose a file.')); return; }

        var mat = editId ? courseMaterials.find(function(m) { return m.id === editId; }) : null;
        if (mat) {
          mat.title = title;
          mat.kind = kind;
          mat.body = kind === 'note' ? body : (mat.body || '');
          mat.url = kind === 'link' ? url : '';
          mat.published = published;
          if (studio.libFile) {
            mat.fileName = studio.libFile.name;
            mat.fileData = studio.libFile.data;
          }
        } else {
          courseMaterials.push({
            id: Date.now(),
            courseId: c.id,
            createdBy: currentUser.id,
            title: title,
            description: '',
            kind: kind,
            body: kind === 'note' ? body : '',
            url: kind === 'link' ? url : '',
            fileName: kind === 'file' && studio.libFile ? studio.libFile.name : '',
            fileData: kind === 'file' && studio.libFile ? studio.libFile.data : '',
            published: published,
            createdAt: new Date().toISOString()
          });
        }
        studioResetLibraryForm();
        studioCommit();
        renderStudioLibrary();
        setLanguage(currentLang);
      }

      // ============================================================
      //  SETTINGS
      // ============================================================
      function renderStudioSettings() {
        var c = studioCourse();
        if (!c) return;
        var desc = document.getElementById('studio-set-description');
        if (desc && document.activeElement !== desc) desc.value = c.description || '';
        var code = document.getElementById('studio-set-code');
        if (code && document.activeElement !== code) code.value = c.code || '';
        var vis = document.getElementById('studio-set-visibility');
        if (vis) vis.value = c.visibility || 'private';
        var cap = document.getElementById('studio-set-capacity');
        if (cap && document.activeElement !== cap) cap.value = c.capacity || 0;
        var pass = document.getElementById('studio-set-passing');
        if (pass && document.activeElement !== pass) pass.value = c.passingScore === undefined ? 60 : c.passingScore;

        var semStart = document.getElementById('studio-set-semester-start');
        if (semStart && document.activeElement !== semStart) semStart.value = c.semesterStart || '';
        var semDays = document.getElementById('studio-set-semester-days');
        if (semDays && document.activeElement !== semDays) semDays.value = semesterDaysFor(c);
        var courseDaysEl = document.getElementById('studio-set-course-days');
        if (courseDaysEl && document.activeElement !== courseDaysEl) courseDaysEl.value = courseDurationDaysFor(c);

        renderStudioSemesterSummary(c);
        renderStudioGroups(c);
        renderStudioPauses(c);
        renderStudioFlags(c);

        var sw = document.getElementById('studio-color-swatches');
        if (sw) {
          sw.innerHTML = STUDIO_ACCENTS.map(function(color) {
            return '<button type="button" class="studio-swatch' + (color === c.color ? ' active' : '') +
              '" data-studio-color="' + color + '" style="background:' + color + '" title="' + color + '"></button>';
          }).join('');
          sw.querySelectorAll('[data-studio-color]').forEach(function(btn) {
            btn.addEventListener('click', function() {
              c.color = btn.dataset.studioColor;
              c.updatedAt = new Date().toISOString();
              studioCommit();
              renderStudioSettings();
              renderStudioSidebar();
            });
          });
        }
      }

      // ============================================================
      //  SEMESTER, GROUPS AND OUTCOME CONFIRMATION
      // ============================================================

      // Which lesson does this homework belong to? Only lessons in the group
      // the work is being created in, so a teacher can never gate material
      // from a different group by accident.
      function populateHomeworkLessonPicker() {
        var sel = document.getElementById('task-modal-lesson');
        if (!sel) return;
        var c = studioCourse();
        var current = sel.value;
        sel.innerHTML = '<option value="">' + escapeHtml(tr('Not linked to a lesson')) + '</option>';
        if (!c) return;
        groupLessonSequence(c).forEach(function(lesson) {
          var opt = document.createElement('option');
          opt.value = lesson.id;
          opt.textContent = lesson.title || tr('Untitled lesson');
          sel.appendChild(opt);
        });
        if (current) sel.value = current;
      }

      // The lesson field only makes sense for homework. Anything else would
      // imply gating that the rules do not apply to.
      function syncHomeworkLessonField() {
        var field = document.getElementById('task-modal-lesson-field');
        var typeSel = document.getElementById('task-modal-type');
        if (!field || !typeSel) return;
        var isHomework = typeSel.value === 'homework';
        field.style.display = isHomework ? '' : 'none';
      }

      function selectedHomeworkLessonId() {
        var sel = document.getElementById('task-modal-lesson');
        return sel ? sel.value : '';
      }

      function renderStudioSemesterSummary(c) {
        var el = document.getElementById('studio-semester-summary');
        if (!el) return;
        var end = groupSemesterEnd(c);
        if (!end) {
          el.textContent = tr('Set a start date to begin the semester.');
          return;
        }
        var activeLimit = studentActiveDayLimit(c);
        el.textContent = trf('Semester ends {date}. A student may take at most {limit} days before the course ends for them.',
          { date: formatDate(end), limit: activeLimit });
      }

      // Flags are produced by the rules, never invented here. This only reads
      // them and offers the teacher the one decision they are allowed to make.
      function renderStudioFlags(c) {
        var host = document.getElementById('studio-flags-list');
        if (!host) return;

        // Running the rules here means a teacher sees a student the moment the
        // semester lapses, without waiting for an unrelated page to open.
        evaluateGroupOutcomes(c);
        purgeExpiredProgress();

        var flagged = homeworkOutcomes.filter(function(o) {
          return o.courseId === c.id && o.status === 'flagged';
        });
        var failed = homeworkOutcomes.filter(function(o) {
          return o.courseId === c.id && o.status === 'failed';
        });

        if (!flagged.length && !failed.length) {
          host.innerHTML = '<div class="studio-work-empty">' +
            escapeHtml(tr('Nothing needs your confirmation right now.')) + '</div>';
          return;
        }

        var html = '';
        flagged.forEach(function(o) {
          var name = getStudentName(o.studentId);
          var done = completedHomeworkCount(c.id, o.studentId);
          var total = groupHomework(c.id).length;
          html += '<div class="studio-flag-row flagged">' +
            '<div class="studio-flag-main">' +
            '<strong>' + escapeHtml(name) + '</strong>' +
            '<span>' + escapeHtml(trf('{done} of {total} homework completed', { done: done, total: total })) + '</span>' +
            '</div>' +
            '<div class="studio-flag-actions">' +
            '<button type="button" class="studio-btn danger" data-studio-flag-confirm="' + o.id + '">' +
            escapeHtml(tr('Confirm not passed')) + '</button>' +
            '<button type="button" class="studio-btn" data-studio-flag-dismiss="' + o.id + '">' +
            escapeHtml(tr('Keep enrolled')) + '</button>' +
            '</div></div>';
        });

        failed.forEach(function(o) {
          var name = getStudentName(o.studentId);
          var left = retentionDaysLeft(o);
          html += '<div class="studio-flag-row failed">' +
            '<div class="studio-flag-main">' +
            '<strong>' + escapeHtml(name) + '</strong>' +
            '<span>' + escapeHtml(trf('Not passed. Progress is kept for {days} more days.', { days: left })) + '</span>' +
            '</div>' +
            '<div class="studio-flag-actions"><span class="studio-flag-note">' +
            escapeHtml(tr('Only an administrator can undo this.')) +
            '</span></div></div>';
        });

        host.innerHTML = html;

        host.querySelectorAll('[data-studio-flag-confirm]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            confirmOutcomeFailure(btn.dataset.studioFlagConfirm, currentUser.id);
            renderStudioFlags(c);
            renderStudioSidebar();
          });
        });
        host.querySelectorAll('[data-studio-flag-dismiss]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            dismissOutcomeFlag(btn.dataset.studioFlagDismiss, currentUser.id);
            renderStudioFlags(c);
          });
        });
      }

      function renderStudioGroups(c) {
        var host = document.getElementById('studio-groups-list');
        if (!host) return;
        var family = courseSubjectFamily(c);
        if (family.length <= 1) {
          host.innerHTML = '<div class="studio-work-empty">' +
            escapeHtml(tr('This group is the only one for this subject so far.')) + '</div>';
          return;
        }
        host.innerHTML = family.map(function(g) {
          var isCurrent = g.id === c.id;
          var count = enrolledStudentIds(g.id).length;
          return '<div class="studio-group-row' + (isCurrent ? ' current' : '') + '">' +
            '<button type="button" class="studio-group-link" data-studio-open-group="' + g.id + '">' +
            escapeHtml(courseLabel(g)) + '</button>' +
            '<span class="studio-group-meta">' + escapeHtml(
              trf('{count} students', { count: count })) + '</span>' +
            (isCurrent ? '<span class="studio-group-badge">' + escapeHtml(tr('Current')) + '</span>' : '') +
            '</div>';
        }).join('');

        host.querySelectorAll('[data-studio-open-group]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            studioSelectCourse(btn.dataset.studioOpenGroup);
          });
        });
      }

      // Pause requests waiting on a decision, plus the ones already accepted so
      // a teacher can see whose clock is stopped and end it on their return.
      function renderStudioPauses(c) {
        var host = document.getElementById('studio-pauses-list');
        if (!host) return;
        var rows = pauseRequests.filter(function(p) {
          return p.courseId === c.id && (p.status === 'pending' || p.status === 'accepted');
        });
        if (!rows.length) {
          host.innerHTML = '<div class="studio-work-empty">' +
            escapeHtml(tr('No pause requests.')) + '</div>';
          return;
        }

        var family = courseSubjectFamily(c);
        host.innerHTML = rows.map(function(p) {
          var name = getStudentName(p.studentId);
          var options = family.map(function(g) {
            return '<option value="' + escapeHtml(g.id) + '"' +
              (g.id === p.courseId ? ' selected' : '') + '>' +
              escapeHtml(courseShortLabel(g)) + '</option>';
          }).join('');
          if (p.status === 'pending') {
            return '<div class="studio-flag-row flagged">' +
              '<div class="studio-flag-main"><strong>' + escapeHtml(name) + '</strong>' +
              '<span>' + escapeHtml(p.note ? p.note : tr('No reason given.')) + '</span></div>' +
              '<div class="studio-flag-actions">' +
              '<button type="button" class="studio-btn" data-pause-accept="' + p.id + '">' +
              escapeHtml(tr('Accept pause')) + '</button>' +
              '<button type="button" class="studio-btn" data-pause-decline="' + p.id + '">' +
              escapeHtml(tr('Decline')) + '</button>' +
              '</div></div>';
          }
          return '<div class="studio-flag-row failed">' +
            '<div class="studio-flag-main"><strong>' + escapeHtml(name) + '</strong>' +
            '<span>' + escapeHtml(tr('Pause accepted. Clock stopped.')) + '</span></div>' +
            '<div class="studio-flag-actions">' +
            '<select class="table-input" data-pause-group="' + p.id + '">' + options + '</select>' +
            '<button type="button" class="studio-btn" data-pause-resume="' + p.id + '">' +
            escapeHtml(tr('Mark as returned')) + '</button>' +
            '</div></div>';
        }).join('');

        host.querySelectorAll('[data-pause-accept]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            decidePause(btn.dataset.pauseAccept, true, currentUser.id);
            renderStudioPauses(c);
            renderStudioFlags(c);
          });
        });
        host.querySelectorAll('[data-pause-decline]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            decidePause(btn.dataset.pauseDecline, false, currentUser.id);
            renderStudioPauses(c);
          });
        });
        host.querySelectorAll('[data-pause-resume]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var sel = host.querySelector('[data-pause-group="' + btn.dataset.pauseResume + '"]');
            resumeFromPause(btn.dataset.pauseResume, sel ? sel.value : '');
            renderStudioPauses(c);
            renderStudioSettings();
          });
        });
      }

      // Wires the semester, group and flag controls once, when the Studio opens.
      function bindStudioSettingsExtras() {
        var addBtn = document.getElementById('studio-group-add-btn');
        if (addBtn && addBtn.dataset.bound !== '1') {
          addBtn.dataset.bound = '1';
          addBtn.addEventListener('click', function() {
            var c = studioCourse();
            if (!c || !canManageCourse(c.id)) return;
            var nameEl = document.getElementById('studio-group-name');
            var name = nameEl ? nameEl.value.trim() : '';
            if (!name) {
              name = nextSuggestedGroupName(c);
            }
            var copyContent = document.getElementById('studio-group-copy-content');
            var copyWork = document.getElementById('studio-group-copy-work');
            var made = createCourseGroup(c, name, {
              copyContent: copyContent ? copyContent.checked : true,
              copyWork: copyWork ? copyWork.checked : true
            });
            if (!made) return;
            saveData();
            if (nameEl) nameEl.value = '';
            studioSelectCourse(made.group.id);
            studio.tab = 'settings';
            renderStudioSettings();
            renderStudioSidebar();
          });
        }
      }

      function saveStudioSettings() {
        var c = studioCourse();
        if (!c || !canManageCourse(c.id)) return;
        c.description = document.getElementById('studio-set-description').value.trim();
        c.code = document.getElementById('studio-set-code').value.trim();
        c.visibility = document.getElementById('studio-set-visibility').value === 'public' ? 'public' : 'private';
        c.capacity = Math.max(0, parseInt(document.getElementById('studio-set-capacity').value, 10) || 0);
        c.passingScore = Math.min(100, Math.max(0, parseInt(document.getElementById('studio-set-passing').value, 10) || 0));
        c.semesterStart = document.getElementById('studio-set-semester-start').value || '';
        var days = parseInt(document.getElementById('studio-set-semester-days').value, 10);
        c.semesterDays = isNaN(days) || days <= 0 ? SEMESTER_DEFAULT_DAYS : days;
        var courseDays = parseInt(document.getElementById('studio-set-course-days').value, 10);
        c.courseDurationDays = isNaN(courseDays) || courseDays <= 0 ? 365 : courseDays;
        c.updatedAt = new Date().toISOString();
        studioCommit();
        renderStudioSettings();
        renderStudioSidebar();
        renderStudioEditor();
        renderCourses();
        if (isTeacherUser()) renderTeacherCourses();
        setLanguage(currentLang);
      }

      // ============================================================
      //  ANALYTICS
      // ============================================================
      function renderStudioAnalytics() {
        var c = studioCourse();
        if (!c) return;
        var studentIds = getEnrolledStudentIds(c.id);
        var mods = getCourseModules(c.id);
        var totalLessons = countCourseLessons(c.id, true);
        var publishedLessons = countCourseLessons(c.id, false);
        var avgProgress = studentIds.length ?
          Math.round(studentIds.reduce(function(sum, sid) { return sum + courseCompletion(c.id, sid); }, 0) / studentIds.length) : 0;

        // gradeData is keyed "<studentId>-<courseId>".
        var gradeKeys = Object.keys(gradeData).filter(function(k) {
          return parseInt(k.split('-')[1], 10) === c.id;
        });
        var avgGrade = gradeKeys.length ?
          Math.round(gradeKeys.reduce(function(sum, k) { return sum + (gradeData[k] || 0); }, 0) / gradeKeys.length) : 0;

        var kpis = document.getElementById('studio-kpis');
        if (kpis) {
          // The four course sections, counted from the same place the student
          // view counts them, so the numbers cannot drift apart.
          var work = courseWorkCounts(c.id);
          kpis.innerHTML =
            studioKpi(tr('Enrolled students'), studentIds.length, c.capacity ? tr('Limit') + ': ' + c.capacity : tr('Unlimited')) +
            studioKpi(tr('Published lessons'), publishedLessons, totalLessons + ' ' + tr('total')) +
            studioKpi(tr('Tasks'), work.material, tr('in this course')) +
            studioKpi(tr('Homework'), work.assignments, tr('in this course')) +
            studioKpi(tr('Tests'), work.tests, tr('in this course')) +
            studioKpi(tr('Avg completion'), avgProgress + '%', studentIds.length ? tr('across enrolled') : tr('no students yet')) +
            studioKpi(tr('Average grade'), avgGrade ? avgGrade + '%' : '—', tr('graded work'));
        }

        var progEl = document.getElementById('studio-student-progress');
        if (progEl) {
          if (!studentIds.length) {
            progEl.innerHTML = '<p class="studio-analytics-empty">' + tr('No students enrolled yet.') + '</p>';
          } else {
            progEl.innerHTML = studentIds.map(function(sid) {
              var pct = courseCompletion(c.id, sid);
              return studioBar(getStudentName(sid) + ' — ' + pct + '%', pct);
            }).join('');
          }
        }

        var engEl = document.getElementById('studio-lesson-engagement');
        if (engEl) {
          var rows = [];
          mods.forEach(function(mod) {
            mod.lessons.forEach(function(lesson) {
              var done = studentIds.filter(function(sid) {
                return isLessonComplete(c.id, lesson.id, sid);
              }).length;
              var pct = studentIds.length ? Math.round((done / studentIds.length) * 100) : 0;
              rows.push(studioBar(mod.title + ' › ' + lesson.title, pct, done + ' / ' + studentIds.length));
            });
          });
          engEl.innerHTML = rows.length ? rows.join('') :
            '<p class="studio-analytics-empty">' + tr('Add lessons to track engagement.') + '</p>';
        }
      }

      function studioKpi(label, value, note) {
        return '<div class="studio-kpi"><div class="studio-kpi-label">' + escapeHtml(label) + '</div>' +
          '<div class="studio-kpi-value">' + escapeHtml(String(value)) + '</div>' +
          '<div class="studio-kpi-note">' + escapeHtml(note) + '</div></div>';
      }

      function studioBar(label, pct, note) {
        return '<div class="studio-bar-row"><div class="studio-bar-top"><span>' + escapeHtml(label) + '</span>' +
          (note ? '<span>' + escapeHtml(note) + '</span>' : '') + '</div>' +
          '<div class="studio-bar"><div class="studio-bar-fill" style="width:' + Math.max(pct, 1) + '%"></div></div></div>';
      }

      // ============================================================
      //  STUDENT PREVIEW
      // ============================================================
      function openStudioPreview() {
        var c = studioCourse();
        var overlay = document.getElementById('studio-preview-overlay');
        if (!c || !overlay) return;
        document.getElementById('studio-preview-title').textContent = c.name;
        var sub = document.getElementById('studio-preview-sub');
        if (sub) {
          sub.textContent = (c.description || tr('No description yet.')) + ' · ' +
            getTeacherName(c.teacherId) + ' · ' + getEnrolledStudentIds(c.id).length + ' ' + tr('students');
        }

        var body = document.getElementById('studio-preview-body');
        var html = '<div class="studio-preview-cover" style="background:linear-gradient(120deg,' +
          escapeHtml(c.color || '#4f46e5') + ',' + escapeHtml(c.color || '#4f46e5') + 'cc)">' +
          '<h2>' + escapeHtml(c.emoji || '📘') + ' ' + escapeHtml(c.name) + '</h2>' +
          '<p>' + escapeHtml(c.description || '') + '</p></div>';

        var mods = getCourseModules(c.id);
        if (!mods.length) {
          html += '<p class="studio-analytics-empty">' + tr('This course has no modules yet.') + '</p>';
        }
        mods.forEach(function(mod) {
          html += '<div class="studio-preview-mod"><div class="studio-preview-mod-head">' + escapeHtml(mod.title) + '</div>';
          if (!mod.lessons.length) {
            html += '<div class="studio-preview-lesson studio-analytics-empty">' + tr('No lessons yet.') + '</div>';
          }
          mod.lessons.forEach(function(lesson) {
            html += '<div class="studio-preview-lesson">' +
              '<div class="studio-preview-lesson-title">' + studioLessonTypeIcon(lesson.type) + ' ' +
              escapeHtml(lesson.title) + '</div>';
            if (lesson.body) html += '<div class="studio-prose studio-preview-lesson-body">' + lesson.body + '</div>';
            if (lesson.type === 'link' && lesson.url) {
              html += '<a class="studio-preview-link" href="' + escapeHtml(lesson.url) +
                '" target="_blank" rel="noopener">' + escapeHtml(lesson.url) + '</a>';
            }
            if (lesson.type === 'video' && lesson.url) {
              html += '<div class="studio-preview-lesson-body"><iframe src="' + escapeHtml(lesson.url) +
                '" width="100%" height="240" frameborder="0" allowfullscreen title="' + escapeHtml(lesson.title) +
                '"></iframe></div>';
            }
            if (lesson.type === 'file' && lesson.fileData) {
              html += '<span class="file-link" onclick="window.openFilePreview(\'' +
                escapeHtml(lesson.fileName || 'file') + '\', \'' + String(lesson.fileData).replace(/'/g, "\\'") + '\')">' +
                escapeHtml(lesson.fileName || tr('Open file')) + '</span>';
            }
            if (!lesson.published) {
              html += '<div class="studio-preview-draft-note">' + tr('Draft — students cannot see this yet.') + '</div>';
            }
            html += '</div>';
          });
          if (!mod.published) {
            html += '<div class="studio-preview-draft-note">' + tr('This module is a draft.') + '</div>';
          }
          html += '</div>';
        });
        body.innerHTML = html;
        overlay.classList.add('open');
      }

      // ============================================================
      //  EMOJI PICKER
      // ============================================================
      var studioSelectEmoji = false;

      function toggleStudioEmojiPicker() {
        var btn = document.getElementById('studio-emoji-btn');
        var picker = document.getElementById('studio-emoji-picker');
        if (!btn || !picker) return;
        studioSelectEmoji = !studioSelectEmoji;
        picker.hidden = !studioSelectEmoji;
        if (!studioSelectEmoji) return;
        var c = studioCourse();
        if (!c) return;
        picker.innerHTML = STUDIO_EMOJI.map(function(e) {
          return '<button type="button" data-studio-emoji="' + e + '">' + e + '</button>';
        }).join('');
        picker.hidden = false;
        var rect = btn.getBoundingClientRect();
        picker.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        picker.style.left = (rect.left + window.scrollX) + 'px';
        picker.querySelectorAll('[data-studio-emoji]').forEach(function(b) {
          b.addEventListener('click', function() {
            c.emoji = b.dataset.studioEmoji;
            c.updatedAt = new Date().toISOString();
            studioCommit();
            picker.remove();
            picker.hidden = true;
            studioSelectEmoji = false;
            renderStudioEditor();
            renderStudioSidebar();
          });
        });
        setTimeout(function() {
          document.addEventListener('click', function close(ev) {
            if (picker.contains(ev.target) || btn.contains(ev.target)) return;
            picker.remove();
            picker.hidden = true;
            studioSelectEmoji = false;
            document.removeEventListener('click', close);
          });
        }, 0);
      }

      // ============================================================
      //  BINDING / INIT
      // ============================================================
      function initStudio() {
        var view = document.getElementById('course-workspace-view');
        if (!view || !currentUser) return;
        var allowed = isAdminUser() || isTeacherUser();
        view.style.display = allowed ? 'flex' : 'none';
        if (!allowed) return;
        ensureAllCourseShapes();

        var sub = document.getElementById('course-studio-sub');
        if (sub) sub.textContent = isAdminUser() ?
          tr('Create courses and manage the study material for every course.') :
          tr('Create your own courses and manage the study material for your students.');

        renderStudioSidebar();
        renderStudioEditor();
        if (studio.bound) return;
        studio.bound = true;
        bindStudioEvents();
        initStudioRte();
        restoreStudioFromHash();
      }

      // Returning from the Task Designer Suite carries a hash of the form
      // courses/<id>/<kind>, which reopens that course on the same tab.
      var STUDIO_KIND_TO_SUB = { material: 'task', assignment: 'assignment', test: 'test' };
      function restoreStudioFromHash() {
        var hash = (window.location.hash || '').replace(/^#/, '');
        if (hash.indexOf('courses/') !== 0) return;
        var parts = hash.split('/');
        var courseId = parseInt(parts[1], 10);
        var sub = STUDIO_KIND_TO_SUB[parts[2]] || 'lesson';
        if (isNaN(courseId) || !canManageCourse(courseId)) return;
        openPage('course-workspace');
        studioSelectCourse(courseId);
        studio.tab = 'lessons';
        studio.sub = sub;
        studioRenderTabs();
        renderStudioCurrentSection();
        // The hash has done its job, so drop it to keep the back button sane.
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }

      function bindStudioEvents() {
        var search = document.getElementById('studio-search');
        if (search) search.addEventListener('input', debounce(function() {
          studio.query = search.value;
          renderStudioSidebar();
        }, 180));
        var filter = document.getElementById('studio-filter');
        if (filter) filter.addEventListener('change', function() {
          studio.filter = this.value;
          renderStudioSidebar();
        });

        function onCreate() {
          var name = window.prompt(tr('Name your new course'), tr('Untitled course'));
          if (name === null) return;
          var c = studioCreateCourse(name);
          if (c) studioSelectCourse(c.id);
        }
        var newBtn = document.getElementById('studio-new-course-btn');
        if (newBtn) newBtn.addEventListener('click', onCreate);
        var emptyCreate = document.getElementById('studio-empty-create');
        if (emptyCreate) emptyCreate.addEventListener('click', onCreate);

        var selectAll = document.getElementById('studio-select-all');
        if (selectAll) selectAll.addEventListener('click', function() {
          var list = studioVisibleCourses();
          var allSelected = list.every(function(c) { return studio.selected[c.id]; });
          studio.selected = {};
          if (!allSelected) {
            list.forEach(function(c) { studio.selected[c.id] = true; });
          }
          renderStudioSidebar();
        });

        var bulkPub = document.getElementById('studio-bulk-publish');
        if (bulkPub) bulkPub.addEventListener('click', function() { studioBulkPublish(true); });
        var bulkUnpub = document.getElementById('studio-bulk-unpublish');
        if (bulkUnpub) bulkUnpub.addEventListener('click', function() { studioBulkPublish(false); });
        var bulkArchive = document.getElementById('studio-bulk-archive');
        if (bulkArchive) bulkArchive.addEventListener('click', studioBulkArchive);

        document.querySelectorAll('[data-studio-tab]').forEach(function(btn) {
          btn.addEventListener('click', function() { studioSetTab(btn.dataset.studioTab); });
        });
        document.querySelectorAll('[data-studio-sub]').forEach(function(btn) {
          btn.addEventListener('click', function() { studioSetSubTab(btn.dataset.studioSub); });
        });

        // Each work section opens the build-method prompt, not the form
        // directly, so the teacher always gets the choice.
        [['studio-add-material-task-btn', 'material'],
         ['studio-add-assignment-btn', 'assignment'],
         ['studio-add-test-btn', 'tests']].forEach(function(pair) {
          var btn = document.getElementById(pair[0]);
          if (btn) btn.addEventListener('click', function() { askBuildMethod(pair[1]); });
        });

        var buildOverlay = document.getElementById('build-method-overlay');
        if (buildOverlay) {
          var basicBtn = document.getElementById('build-method-basic');
          var suiteBtn = document.getElementById('build-method-suite');
          var cancelBtn = document.getElementById('build-method-cancel');
          // The course and kind are read at click time, not captured here: the
          // binding happens once, long before the teacher picks a course.
          if (basicBtn) basicBtn.addEventListener('click', function() {
            buildOverlay.classList.remove('open');
            openStudioBasic(studio.courseId, studio.buildKind);
          });
          if (suiteBtn) suiteBtn.addEventListener('click', function() {
            buildOverlay.classList.remove('open');
            openStudioSuite(studio.courseId, studio.buildKind);
          });
          if (cancelBtn) cancelBtn.addEventListener('click', function() {
            buildOverlay.classList.remove('open');
          });
          buildOverlay.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('open');
          });
        }

        var titleInput = document.getElementById('studio-course-title-input');
        if (titleInput) {
          // This used to serialise and write the whole data set and rebuild the
          // sidebar on every single keystroke.
          var persistTitle = debounce(function() {
            studioMarkSaved();
            studioCommit();
            renderStudioSidebar();
          }, 350);
          titleInput.addEventListener('input', function() {
            var c = studioCourse();
            if (!c) return;
            c.name = titleInput.value || tr('Untitled course');
            c.updatedAt = new Date().toISOString();
            persistTitle();
          });
          titleInput.addEventListener('blur', persistTitle.flush);
        }
        var emojiBtn = document.getElementById('studio-emoji-btn');
        if (emojiBtn) emojiBtn.addEventListener('click', toggleStudioEmojiPicker);

        var back = document.getElementById('studio-back-to-list');
        if (back) back.addEventListener('click', function() {
          studio.courseId = null;
          renderStudioSidebar();
          renderStudioEditor();
        });
        var previewBtn = document.getElementById('studio-preview-btn');
        if (previewBtn) previewBtn.addEventListener('click', openStudioPreview);
        var dupBtn = document.getElementById('studio-duplicate-btn');
        if (dupBtn) dupBtn.addEventListener('click', studioDuplicateCourse);
        var archBtn = document.getElementById('studio-archive-btn');
        if (archBtn) archBtn.addEventListener('click', studioArchiveCourse);
        var delBtn = document.getElementById('studio-delete-btn');
        if (delBtn) delBtn.addEventListener('click', studioDeleteCourse);

        var addModule = document.getElementById('studio-add-module-btn');
        if (addModule) addModule.addEventListener('click', function() { openStudioModuleModal(null); });
        var moduleForm = document.getElementById('studio-module-form');
        if (moduleForm) moduleForm.addEventListener('submit', function(e) {
          e.preventDefault();
          saveStudioModule();
        });
        var moduleCancel = document.getElementById('studio-module-cancel-btn');
        if (moduleCancel) moduleCancel.addEventListener('click', function() {
          document.getElementById('studio-module-modal-overlay').classList.remove('open');
        });
        var moduleOverlay = document.getElementById('studio-module-modal-overlay');
        if (moduleOverlay) moduleOverlay.addEventListener('click', function(e) {
          if (e.target === this) this.classList.remove('open');
        });

        var lessonForm = document.getElementById('studio-lesson-form');
        if (lessonForm) lessonForm.addEventListener('submit', function(e) {
          e.preventDefault();
          saveStudioLesson();
        });
        var lessonCancel = document.getElementById('studio-lesson-cancel-btn');
        if (lessonCancel) lessonCancel.addEventListener('click', function() {
          document.getElementById('studio-lesson-modal-overlay').classList.remove('open');
        });
        var lessonOverlay = document.getElementById('studio-lesson-modal-overlay');
        if (lessonOverlay) lessonOverlay.addEventListener('click', function(e) {
          if (e.target === this) this.classList.remove('open');
        });
        var lessonFile = document.getElementById('studio-lesson-file');
        if (lessonFile) lessonFile.addEventListener('change', function() {
          var f = this.files && this.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function(ev) {
            studio.lessonFile = { name: f.name, data: ev.target.result };
            document.getElementById('studio-lesson-file-name').textContent = f.name;
          };
          reader.readAsDataURL(f);
        });

        var libKind = document.getElementById('studio-lib-kind');
        if (libKind) libKind.addEventListener('change', studioSyncLibraryFields);
        var libSave = document.getElementById('studio-lib-save-btn');
        if (libSave) libSave.addEventListener('click', saveStudioLibraryItem);
        var libClear = document.getElementById('studio-lib-clear-btn');
        if (libClear) libClear.addEventListener('click', function() {
          studioResetLibraryForm();
          studioSyncLibraryFields();
        });
        var libFile = document.getElementById('studio-lib-file');
        if (libFile) libFile.addEventListener('change', function() {
          var f = this.files && this.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function(ev) {
            studio.libFile = { name: f.name, data: ev.target.result };
            document.getElementById('studio-lib-file-name').textContent = f.name;
          };
          reader.readAsDataURL(f);
        });

        var settingsInputs = ['studio-set-description', 'studio-set-code', 'studio-set-visibility',
          'studio-set-capacity', 'studio-set-passing',
          'studio-set-semester-start', 'studio-set-semester-days', 'studio-set-course-days'];
        settingsInputs.forEach(function(id) {
          var el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('change', saveStudioSettings);
          el.addEventListener('blur', saveStudioSettings);
        });

        bindStudioSettingsExtras();

        var previewClose = document.getElementById('studio-preview-close');
        if (previewClose) previewClose.addEventListener('click', function() {
          document.getElementById('studio-preview-overlay').classList.remove('open');
        });
        var previewOverlay = document.getElementById('studio-preview-overlay');
        if (previewOverlay) previewOverlay.addEventListener('click', function(e) {
          if (e.target === this) this.classList.remove('open');
        });
      }
