// ============================================================
//  NOKJ TASK DESIGNER SUITE
//  Tilda-style editor for building interactive tasks out of blocks.
//
//  The block definitions come from the shared registry, so what a
//  teacher builds here renders and grades identically in the student
//  app. Only the editing chrome lives in this file.
// ============================================================

  (function() {
    'use strict';

    var DRAFT_KEY = 'nokj-suite-draft';
    var THEME_KEY = 'nokj-suite-theme';

    var SUITE = {
      user: null,
      doc: null,
      selectedId: null,
      tasks: [],
      statusTimer: null,
      // Set when the Suite is opened from a course section.
      courseId: null,
      courseName: '',
      kind: 'free',
      returnTo: ''
    };

    // ---------- storage ----------
    function sGet(key) {
      try {
        var v = localStorage.getItem(key);
        if (v !== null) return v;
      } catch (e) { /* localStorage blocked */ }
      try {
        var s = sessionStorage.getItem(key);
        if (s !== null) return s;
      } catch (e2) { /* sessionStorage blocked */ }
      return null;
    }
    function sSet(key, value) {
      try {
        localStorage.setItem(key, value);
        try { sessionStorage.removeItem(key); } catch (e) { /* noop */ }
        return 'local';
      } catch (e) {
        try {
          sessionStorage.setItem(key, value);
          return 'session';
        } catch (e2) {
          return 'failed';
        }
      }
    }
    function sRemove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* noop */ }
      try { sessionStorage.removeItem(key); } catch (e2) { /* noop */ }
    }
    function sGetJson(key, fallback) {
      var raw = sGet(key);
      if (!raw) return fallback;
      try {
        var parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch (e) {
        return fallback;
      }
    }

    function readTasks() {
      var list = sGetJson('nokj-tasks', []);
      return Array.isArray(list) ? list : [];
    }

    function readTests() {
      var list = sGetJson('nokj-tests', []);
      return Array.isArray(list) ? list : [];
    }

    // Keeps the consolidated snapshot in step with the individual key, so the
    // student app can always repair itself from it. The snapshot is created if
    // it is missing, otherwise a teacher who only ever uses the Suite would
    // leave the academy with no consolidated copy at all.
    function writeStore(key, snapshotKey, list) {
      var result = sSet(key, JSON.stringify(list));
      try {
        var snap = {};
        var raw = localStorage.getItem('nokj-db-snapshot');
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') snap = parsed;
        }
        snap[snapshotKey] = list;
        localStorage.setItem('nokj-db-snapshot', JSON.stringify(snap));
      } catch (e) { /* snapshot is best effort */ }
      return result;
    }

    function writeTasks(list) {
      return writeStore('nokj-tasks', 'tasks', list);
    }

    function writeTests(list) {
      return writeStore('nokj-tests', 'tests', list);
    }

    // ---------- auth ----------
    function findUser(email) {
      var pools = [sGetJson('nokj-admins', []), sGetJson('nokj-teachers', [])];
      for (var i = 0; i < pools.length; i++) {
        if (!Array.isArray(pools[i])) continue;
        for (var j = 0; j < pools[i].length; j++) {
          if (pools[i][j] && pools[i][j].email === email) return pools[i][j];
        }
      }
      return null;
    }

    // The lock screen is a fixed full-screen overlay, so it has to be taken
    // out of the flow explicitly once the visitor is allowed in. The inline
    // display is needed because the stylesheet sets `display: flex`, which
    // would otherwise win over the `hidden` attribute.
    function hideLock() {
      var lock = $('suite-lock');
      if (!lock) return;
      lock.hidden = true;
      lock.style.display = 'none';
    }

    function requireUser() {
      var saved = sGetJson('nokj-user', null);
      var msg = document.getElementById('suite-lock-msg');
      if (!saved || !saved.email) {
        msg.textContent = 'No academy session found. Sign in to the academy first, then open the Suite.';
        return null;
      }
      if (saved.role !== 'Teacher' && saved.role !== 'Admin') {
        msg.textContent = 'The Task Designer Suite is for teachers and admins. You are signed in as ' +
          (saved.role || 'a guest') + '.';
        return null;
      }
      // Mirrors the academy sign-in check: the session must still match a
      // real account. A completely empty install is allowed through so a
      // first-run teacher is not locked out of the editor.
      var hasAnyPool = !!sGet('nokj-admins') || !!sGet('nokj-teachers');
      if (hasAnyPool && !findUser(saved.email)) {
        msg.textContent = 'This account is no longer in the teacher or admin list. Sign in again from the academy.';
        return null;
      }
      return saved;
    }

    // ---------- document ----------
    function today() {
      return new Date().toISOString().split('T')[0];
    }
    function inDays(n) {
      var d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    }

    // A doc is a test when the Suite was opened for the Tests section, and a
    // task/assignment otherwise. The course sections use the plain task types
    // so the existing task list, submissions and grading keep working.
    function docType() {
      if (SUITE.kind === 'assignment') return 'assignment';
      if (SUITE.kind === 'material') return 'homework';
      return 'interactive';
    }
    function isTestDoc() {
      return SUITE.kind === 'test';
    }
    function storeList() {
      return isTestDoc() ? readTests() : readTasks();
    }
    function noun() {
      return isTestDoc() ? 'test' : (SUITE.kind === 'assignment' ? 'assignment' : 'task');
    }

    function newDoc() {
      return {
        id: null,
        title: '',
        type: docType(),
        description: '',
        deadline: inDays(7),
        priority: 'medium',
        assignedTo: SUITE.courseId ? 'course' : 'all',
        assignedIds: SUITE.courseId ? [SUITE.courseId] : [],
        courseId: SUITE.courseId,
        files: [],
        questions: [],
        blocks: [],
        published: false,
        publishedAt: null,
        createdAt: today(),
        updatedAt: today(),
        teacherId: SUITE.user.id,
        kind: 'suite'
      };
    }

    function toDoc(record) {
      var doc = newDoc();
      doc.id = record.id;
      doc.title = record.title || '';
      doc.type = isTestDoc() ? 'test' : (record.type || doc.type);
      doc.description = record.description || '';
      doc.deadline = record.deadline || doc.deadline;
      doc.priority = record.priority || 'medium';
      doc.assignedTo = record.assignedTo || (SUITE.courseId ? 'course' : 'all');
      doc.assignedIds = Array.isArray(record.assignedIds) ? record.assignedIds.slice() : [];
      doc.courseId = record.courseId !== undefined ? record.courseId : SUITE.courseId;
      doc.files = Array.isArray(record.files) ? record.files.slice() : [];
      doc.blocks = Array.isArray(record.blocks) ? JSON.parse(JSON.stringify(record.blocks)) : [];
      doc.published = record.published !== false;
      doc.publishedAt = record.publishedAt || null;
      doc.createdAt = record.createdAt || doc.createdAt;
      doc.updatedAt = record.updatedAt || doc.updatedAt;
      doc.teacherId = record.teacherId || SUITE.user.id;
      doc.kind = 'suite';
      return doc;
    }

    function nextId() {
      var max = 0;
      storeList().forEach(function(t) {
        var n = parseInt(t.id, 10);
        if (!isNaN(n) && n > max) max = n;
      });
      return max + 1;
    }

    // A teacher may only open the Suite for a course they own, and only for
    // the section the Suite was opened from.
    function resolveContext() {
      var params = new URLSearchParams(window.location.search);
      var rawKind = (params.get('kind') || '').toLowerCase();
      if (rawKind === 'material' || rawKind === 'assignment' || rawKind === 'test' || rawKind === 'tests') {
        SUITE.kind = rawKind === 'tests' ? 'test' : rawKind;
      }
      var rawCourse = parseInt(params.get('course'), 10);
      if (isNaN(rawCourse)) return true;
      var courses = sGetJson('nokj-courses', []);
      if (!Array.isArray(courses)) return true;
      var course = courses.filter(function(c) { return c && c.id === rawCourse; })[0];
      if (!course) return true;
      if (SUITE.user.role !== 'Admin' && course.teacherId !== SUITE.user.id) {
        var el = $('suite-lock-msg');
        if (el) el.textContent = 'That course belongs to another teacher. Open the Suite from your own course.';
        return false;
      }
      SUITE.courseId = course.id;
      SUITE.courseName = course.name || '';
      return true;
    }

    function paintContext() {
      var bar = $('suite-context');
      if (!bar) return;
      var head = $('suite-list-head');
      if (head) head.textContent = SUITE.courseId
        ? noun() + 's in this course'
        : 'My ' + noun() + 's';
      var inspectorHead = $('suite-inspector-head');
      if (inspectorHead && !SUITE.selectedId) {
        inspectorHead.textContent = SUITE.courseId
          ? capitalize(noun()) + ' settings'
          : capitalize(noun()) + ' settings';
      }
      if (!SUITE.courseId) { bar.hidden = true; return; }
      bar.hidden = false;
      bar.textContent = 'Building a ' + noun() + ' for “' + SUITE.courseName + '”';
      var back = $('suite-back');
      if (back) {
        back.hidden = false;
        back.addEventListener('click', function() {
          var base = SUITE.returnTo || '../';
          window.location.href = base + 'index.html#courses';
        });
      }
    }

    function capitalize(s) {
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    }

    function canManage(task) {
      if (!task) return true;
      if (SUITE.user.role === 'Admin') return true;
      return !task.teacherId || task.teacherId === SUITE.user.id;
    }

    // ---------- ui helpers ----------
    function $(id) {
      return document.getElementById(id);
    }
    function setStatus(msg, kind) {
      var el = $('suite-status');
      el.textContent = msg || '';
      el.className = 'suite-status' + (kind ? ' ' + kind : '');
      if (SUITE.statusTimer) clearTimeout(SUITE.statusTimer);
      if (msg) {
        SUITE.statusTimer = setTimeout(function() {
          el.textContent = '';
          el.className = 'suite-status';
        }, 6000);
      }
    }

    // ---------- palette ----------
    function renderPalette(filterText) {
      var host = $('suite-palette');
      var q = String(filterText || '').trim().toLowerCase();
      host.textContent = '';
      blockCategories().forEach(function(cat) {
        var types = blocksInCategory(cat).filter(function(t) {
          if (!q) return true;
          var def = NOKJ_BLOCKS[t];
          return (def.label + ' ' + t + ' ' + cat).toLowerCase().indexOf(q) !== -1;
        });
        if (!types.length) return;
        var group = document.createElement('div');
        group.className = 'suite-group';
        var head = document.createElement('div');
        head.className = 'suite-group-t';
        head.textContent = cat;
        group.appendChild(head);
        var chips = document.createElement('div');
        chips.className = 'suite-chips';
        types.forEach(function(t) {
          var def = NOKJ_BLOCKS[t];
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'suite-chip';
          chip.draggable = true;
          chip.setAttribute('data-type', t);
          var icon = document.createElement('i');
          icon.textContent = def.icon;
          var label = document.createElement('span');
          label.textContent = def.label;
          chip.appendChild(icon);
          chip.appendChild(label);
          chip.addEventListener('click', function() { addBlock(t); });
          chip.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/nokj-block', t);
            e.dataTransfer.effectAllowed = 'copy';
          });
          chips.appendChild(chip);
        });
        group.appendChild(chips);
        host.appendChild(group);
      });
    }

    // ---------- canvas ----------
    function currentBlock() {
      if (!SUITE.doc || !SUITE.selectedId) return null;
      return SUITE.doc.blocks.find(function(b) { return b.id === SUITE.selectedId; }) || null;
    }

    function renderCanvas() {
      var host = $('suite-blocks');
      stopTaskBlocks(host);
      host.innerHTML = renderTaskBlocks(SUITE.doc.blocks, {
        editing: true,
        selectedId: SUITE.selectedId
      });
      mountTaskBlocks(host, SUITE.doc.blocks, { editing: true });
      // Native drag reorder between existing blocks.
      Array.prototype.forEach.call(host.querySelectorAll('.tb-block'), function(node) {
        node.draggable = true;
        node.addEventListener('dragstart', function(e) {
          e.dataTransfer.setData('text/nokj-move', node.getAttribute('data-tb-id'));
          e.dataTransfer.effectAllowed = 'move';
        });
        node.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        node.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var moveId = e.dataTransfer.getData('text/nokj-move');
          var newType = e.dataTransfer.getData('text/nokj-block');
          if (moveId) {
            var target = node.getAttribute('data-tb-id');
            if (target && target !== moveId) moveBlock(moveId, target);
          } else if (newType) {
            var at = SUITE.doc.blocks.findIndex(function(b) { return b.id === node.getAttribute('data-tb-id'); });
            insertBlock(newType, at);
          }
        });
      });
      updateMeta();
    }

    function updateMeta() {
      var pts = blockTotalPoints(SUITE.doc.blocks);
      $('suite-meta').textContent = pts + ' point' + (pts === 1 ? '' : 's') + ' · ' +
        SUITE.doc.blocks.length + ' block' + (SUITE.doc.blocks.length === 1 ? '' : 's');
      $('suite-page-h').textContent = SUITE.doc.title || 'Untitled task';
    }

    function selectBlock(id) {
      SUITE.selectedId = id;
      renderCanvas();
      renderInspector();
    }

    function insertBlock(type, at) {
      var block = makeBlock(type);
      if (!block) return;
      if (at === undefined || at < 0) at = SUITE.doc.blocks.length;
      SUITE.doc.blocks.splice(at, 0, block);
      SUITE.selectedId = block.id;
      renderCanvas();
      renderInspector();
      autosave();
    }

    function addBlock(type) {
      insertBlock(type);
    }

    function moveBlock(id, targetId) {
      var from = SUITE.doc.blocks.findIndex(function(b) { return b.id === id; });
      if (from < 0) return;
      var block = SUITE.doc.blocks.splice(from, 1)[0];
      var to = SUITE.doc.blocks.findIndex(function(b) { return b.id === targetId; });
      if (to < 0) to = SUITE.doc.blocks.length;
      SUITE.doc.blocks.splice(to, 0, block);
      renderCanvas();
      autosave();
    }

    function shiftBlock(id, dir) {
      var i = SUITE.doc.blocks.findIndex(function(b) { return b.id === id; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= SUITE.doc.blocks.length) return;
      var tmp = SUITE.doc.blocks[i];
      SUITE.doc.blocks[i] = SUITE.doc.blocks[j];
      SUITE.doc.blocks[j] = tmp;
      renderCanvas();
      autosave();
    }

    function duplicateBlock(id) {
      var i = SUITE.doc.blocks.findIndex(function(b) { return b.id === id; });
      if (i < 0) return;
      var copy = JSON.parse(JSON.stringify(SUITE.doc.blocks[i]));
      copy.id = newBlockId();
      SUITE.doc.blocks.splice(i + 1, 0, copy);
      SUITE.selectedId = copy.id;
      renderCanvas();
      renderInspector();
      autosave();
    }

    function deleteBlock(id) {
      SUITE.doc.blocks = SUITE.doc.blocks.filter(function(b) { return b.id !== id; });
      if (SUITE.selectedId === id) SUITE.selectedId = null;
      renderCanvas();
      renderInspector();
      autosave();
    }

    // ---------- inspector ----------
    function fieldInput(block, field) {
      var wrap = document.createElement('div');
      wrap.className = 'suite-field';
      var value = block.props[field.key];
      var set = function(v) {
        block.props[field.key] = v;
        renderCanvas();
        autosave();
      };

      if (field.type === 'bool') {
        var row = document.createElement('label');
        row.className = 'suite-check';
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = !!value;
        box.addEventListener('change', function() { set(box.checked); });
        var text = document.createElement('span');
        text.textContent = field.label;
        row.appendChild(box);
        row.appendChild(text);
        wrap.appendChild(row);
        return wrap;
      }

      var label = document.createElement('label');
      label.textContent = field.label;
      wrap.appendChild(label);

      if (field.type === 'textarea' || field.type === 'options') {
        var ta = document.createElement('textarea');
        ta.value = field.type === 'options'
          ? (Array.isArray(value) ? value.join('\n') : '')
          : (value === undefined || value === null ? '' : String(value));
        ta.placeholder = field.type === 'options' ? 'One per line' : '';
        ta.addEventListener('input', function() {
          if (field.type === 'options') {
            set(ta.value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean));
          } else {
            block.props[field.key] = ta.value;
            autosave();
            scheduleCanvas();
          }
        });
        wrap.appendChild(ta);
        return wrap;
      }

      if (field.type === 'select') {
        var sel = document.createElement('select');
        (field.options || []).forEach(function(opt) {
          var o = document.createElement('option');
          o.value = opt[0];
          o.textContent = opt[1];
          if (String(value) === String(opt[0])) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function() { set(sel.value); });
        wrap.appendChild(sel);
        return wrap;
      }

      if (field.type === 'multi') {
        var opts = Array.isArray(block.props.options) ? block.props.options : [];
        var picked = Array.isArray(value) ? value.slice() : [];
        var grid = document.createElement('div');
        grid.className = 'suite-multi';
        opts.forEach(function(text, i) {
          var l = document.createElement('label');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = picked.indexOf(i) !== -1;
          cb.addEventListener('change', function() {
            picked = picked.filter(function(v) { return v !== i; });
            if (cb.checked) picked.push(i);
            picked.sort(function(a, b) { return a - b; });
            set(picked);
          });
          var s = document.createElement('span');
          s.textContent = (i + 1) + '. ' + text;
          l.appendChild(cb);
          l.appendChild(s);
          grid.appendChild(l);
        });
        wrap.appendChild(grid);
        return wrap;
      }

      if (field.type === 'pairs' || field.type === 'rows') {
        var list = Array.isArray(value) ? value : [];
        var box2 = document.createElement('div');
        box2.className = 'suite-pairs';
        function paintPairs() {
          box2.textContent = '';
          list.forEach(function(pair, index) {
            var row = document.createElement('div');
            row.className = 'suite-pair';
            var a = document.createElement('input');
            a.type = 'text';
            a.value = pair[0] === undefined ? '' : pair[0];
            a.addEventListener('input', function() { list[index][0] = a.value; autosave(); });
            var b = document.createElement('input');
            b.type = 'text';
            b.value = pair[1] === undefined ? '' : pair[1];
            b.addEventListener('input', function() { list[index][1] = b.value; autosave(); });
            var del = document.createElement('button');
            del.type = 'button';
            del.textContent = '✕';
            del.addEventListener('click', function() {
              list.splice(index, 1);
              paintPairs();
              autosave();
              renderCanvas();
            });
            row.appendChild(a);
            row.appendChild(b);
            row.appendChild(del);
            box2.appendChild(row);
          });
          var add = document.createElement('button');
          add.type = 'button';
          add.className = 'suite-pair-add';
          add.textContent = '+ Add row';
          add.addEventListener('click', function() {
            list.push(['', '']);
            paintPairs();
            autosave();
            renderCanvas();
          });
          box2.appendChild(add);
        }
        paintPairs();
        wrap.appendChild(box2);
        return wrap;
      }

      if (field.type === 'hotspots') {
        var spots = Array.isArray(value) ? value : [];
        var host = document.createElement('div');
        function paintSpots() {
          host.textContent = '';
          spots.forEach(function(s, index) {
            var row = document.createElement('div');
            row.className = 'suite-hot';
            var x = document.createElement('input');
            x.type = 'number';
            x.min = '0';
            x.max = '100';
            x.value = s.x === undefined ? 50 : s.x;
            x.title = 'x %';
            x.addEventListener('input', function() { spots[index].x = parseFloat(x.value) || 0; autosave(); renderCanvas(); });
            var y = document.createElement('input');
            y.type = 'number';
            y.min = '0';
            y.max = '100';
            y.value = s.y === undefined ? 50 : s.y;
            y.title = 'y %';
            y.addEventListener('input', function() { spots[index].y = parseFloat(y.value) || 0; autosave(); renderCanvas(); });
            var name = document.createElement('input');
            name.type = 'text';
            name.value = s.label || '';
            name.placeholder = 'label';
            name.addEventListener('input', function() { spots[index].label = name.value; autosave(); });
            var ok = document.createElement('button');
            ok.type = 'button';
            ok.textContent = s.correct ? '✓' : '✕';
            ok.title = 'Mark as the correct spot';
            ok.style.color = s.correct ? 'var(--success)' : 'var(--danger)';
            ok.addEventListener('click', function() {
              spots[index].correct = !spots[index].correct;
              paintSpots();
              autosave();
            });
            row.appendChild(x);
            row.appendChild(y);
            row.appendChild(name);
            row.appendChild(ok);
            host.appendChild(row);
          });
          var add = document.createElement('button');
          add.type = 'button';
          add.className = 'suite-pair-add';
          add.textContent = '+ Add hotspot';
          add.addEventListener('click', function() {
            spots.push({ x: 50, y: 50, label: 'spot ' + (spots.length + 1), correct: spots.length === 0 });
            paintSpots();
            autosave();
            renderCanvas();
          });
          host.appendChild(add);
        }
        paintSpots();
        wrap.appendChild(host);
        return wrap;
      }

      var input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      if (field.min !== undefined) input.min = field.min;
      if (field.max !== undefined) input.max = field.max;
      input.step = field.type === 'number' ? 'any' : '';
      input.value = value === undefined || value === null ? '' : value;
      input.addEventListener('input', function() {
        if (field.type === 'number') set(input.value === '' ? '' : parseFloat(input.value));
        else {
          block.props[field.key] = input.value;
          autosave();
          scheduleCanvas();
        }
      });
      wrap.appendChild(input);
      return wrap;
    }

    var canvasTimer = null;
    function scheduleCanvas() {
      if (canvasTimer) clearTimeout(canvasTimer);
      canvasTimer = setTimeout(function() {
        canvasTimer = null;
        renderCanvas();
      }, 320);
    }

    function textField(labelText, value, onInput, multiline) {
      var wrap = document.createElement('div');
      wrap.className = 'suite-field';
      var label = document.createElement('label');
      label.textContent = labelText;
      wrap.appendChild(label);
      var el = document.createElement(multiline ? 'textarea' : 'input');
      if (!multiline) el.type = 'text';
      el.value = value === undefined || value === null ? '' : value;
      el.addEventListener('input', function() { onInput(el.value); });
      wrap.appendChild(el);
      return wrap;
    }

    function taskSettings() {
      var host = $('suite-inspector');
      host.textContent = '';
      $('suite-inspector-head').textContent = capitalize(noun()) + ' settings';

      host.appendChild(textField('Title', SUITE.doc.title, function(v) {
        SUITE.doc.title = v;
        $('suite-title').value = v;
        updateMeta();
        autosave();
      }));
      host.appendChild(textField('Description', SUITE.doc.description, function(v) {
        SUITE.doc.description = v;
        autosave();
      }, true));

      var deadline = document.createElement('div');
      deadline.className = 'suite-field';
      var dLabel = document.createElement('label');
      dLabel.textContent = 'Deadline';
      deadline.appendChild(dLabel);
      var dInput = document.createElement('input');
      dInput.type = 'date';
      dInput.value = SUITE.doc.deadline || today();
      dInput.addEventListener('change', function() {
        SUITE.doc.deadline = dInput.value;
        autosave();
      });
      deadline.appendChild(dInput);
      host.appendChild(deadline);

      var prio = document.createElement('div');
      prio.className = 'suite-field';
      var pLabel = document.createElement('label');
      pLabel.textContent = 'Priority';
      prio.appendChild(pLabel);
      var pSel = document.createElement('select');
      [['high', '🔴 High'], ['medium', '🟡 Medium'], ['low', '🟢 Low']].forEach(function(o) {
        var opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        if (SUITE.doc.priority === o[0]) opt.selected = true;
        pSel.appendChild(opt);
      });
      pSel.addEventListener('change', function() {
        SUITE.doc.priority = pSel.value;
        autosave();
      });
      prio.appendChild(pSel);
      host.appendChild(prio);

      var assign = document.createElement('div');
      assign.className = 'suite-field';
      var aLabel = document.createElement('label');
      aLabel.textContent = 'Assign to';
      assign.appendChild(aLabel);
      var aSel = document.createElement('select');
      [['all', 'All my students'], ['student', 'Specific students'], ['course', 'A course']].forEach(function(o) {
        var opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        if (SUITE.doc.assignedTo === o[0]) opt.selected = true;
        aSel.appendChild(opt);
      });
      assign.appendChild(aSel);
      var idsWrap = document.createElement('div');
      idsWrap.className = 'suite-multi';
      idsWrap.style.marginTop = '8px';
      assign.appendChild(idsWrap);

      function paintTargets() {
        idsWrap.textContent = '';
        if (aSel.value === 'all') return;
        var pool = aSel.value === 'student'
          ? Array.isArray(sGetJson('nokj-students', [])) ? sGetJson('nokj-students', []) : []
          : Array.isArray(sGetJson('nokj-courses', [])) ? sGetJson('nokj-courses', []) : [];
        if (aSel.value === 'course') {
          pool = pool.filter(function(c) {
            return SUITE.user.role === 'Admin' || !c.teacherId || c.teacherId === SUITE.user.id;
          });
        }
        if (!pool.length) {
          var none = document.createElement('span');
          none.style.fontSize = '13px';
          none.style.color = 'var(--muted)';
          none.textContent = 'Nothing to choose from yet.';
          idsWrap.appendChild(none);
          return;
        }
        pool.forEach(function(item) {
          var l = document.createElement('label');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = SUITE.doc.assignedIds.indexOf(item.id) !== -1;
          cb.addEventListener('change', function() {
            SUITE.doc.assignedIds = SUITE.doc.assignedIds.filter(function(id) { return id !== item.id; });
            if (cb.checked) SUITE.doc.assignedIds.push(item.id);
            autosave();
          });
          var s = document.createElement('span');
          s.textContent = item.name || item.title || item.id;
          l.appendChild(cb);
          l.appendChild(s);
          idsWrap.appendChild(l);
        });
      }
      aSel.addEventListener('change', function() {
        SUITE.doc.assignedTo = aSel.value;
        SUITE.doc.assignedIds = [];
        paintTargets();
        autosave();
      });
      paintTargets();
      host.appendChild(assign);

      var state = document.createElement('div');
      state.className = 'suite-field';
      var sLine = document.createElement('label');
      sLine.textContent = SUITE.doc.published === false
        ? 'State: draft (hidden from students)'
        : 'State: deployed (visible to students)';
      state.appendChild(sLine);
      host.appendChild(state);
    }

    function renderInspector() {
      var host = $('suite-inspector');
      var block = currentBlock();
      if (!block) {
        taskSettings();
        return;
      }
      var def = getBlockDef(block.type);
      $('suite-inspector-head').textContent = def ? def.label : 'Block';
      host.textContent = '';

      if (block.graded) {
        var pts = document.createElement('div');
        pts.className = 'suite-field';
        var pLabel = document.createElement('label');
        pLabel.textContent = 'Points';
        pts.appendChild(pLabel);
        var pInput = document.createElement('input');
        pInput.type = 'number';
        pInput.min = '0';
        pInput.step = '0.5';
        pInput.value = block.points || 0;
        pInput.addEventListener('input', function() {
          block.points = parseFloat(pInput.value) || 0;
          updateMeta();
          autosave();
        });
        pts.appendChild(pInput);
        host.appendChild(pts);
      }

      (def && def.fields ? def.fields : []).forEach(function(field) {
        host.appendChild(fieldInput(block, field));
      });

      var actions = document.createElement('div');
      actions.className = 'suite-field';
      var dup = document.createElement('button');
      dup.type = 'button';
      dup.className = 'suite-btn';
      dup.textContent = '⧉ Duplicate';
      dup.addEventListener('click', function() { duplicateBlock(block.id); });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'suite-btn';
      del.style.color = 'var(--danger)';
      del.style.marginLeft = '6px';
      del.textContent = '✕ Delete';
      del.addEventListener('click', function() { deleteBlock(block.id); });
      actions.appendChild(dup);
      actions.appendChild(del);
      host.appendChild(actions);
    }

    // ---------- task list ----------
    function renderTaskList() {
      var host = $('suite-task-list');
      host.textContent = '';
      var mine = storeList().filter(function(t) {
        if (SUITE.user.role !== 'Admin' && t.teacherId && t.teacherId !== SUITE.user.id) return false;
        // When opened from a course section, only that course's items of that
        // kind are in scope.
        if (SUITE.courseId) {
          var owner = t.courseId !== undefined && t.courseId !== null ? t.courseId
            : (Array.isArray(t.assignedIds) ? t.assignedIds[0] : null);
          if (owner !== SUITE.courseId) return false;
        }
        if (isTestDoc()) return true;
        if (SUITE.kind === 'assignment') return t.type === 'assignment';
        if (SUITE.kind === 'material') return t.type !== 'assignment';
        return true;
      });
      SUITE.tasks = mine;
      if (!mine.length) {
        var p = document.createElement('p');
        p.style.color = 'var(--muted)';
        p.style.fontSize = '13px';
        p.textContent = SUITE.courseId
          ? 'No ' + noun() + 's in this course yet. Build one and deploy it.'
          : 'No ' + noun() + 's yet. Build one and deploy it to your students.';
        host.appendChild(p);
        return;
      }
      mine.slice().reverse().forEach(function(t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'suite-list-item' + (SUITE.doc && t.id === SUITE.doc.id ? ' active' : '');
        b.textContent = t.title || 'Untitled ' + noun();
        var small = document.createElement('small');
        small.textContent = (t.published === false ? 'Draft' : 'Deployed') + ' · ' +
          (t.blocks ? t.blocks.length : 0) + ' blocks · ' + t.deadline;
        b.appendChild(small);
        b.addEventListener('click', function() { openTask(t.id); });
        host.appendChild(b);
      });
    }

    // ---------- persistence ----------
    function autosave() {
      clearTimeout(autosave.timer);
      autosave.timer = setTimeout(function() {
        try {
          sSet(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), doc: SUITE.doc }));
        } catch (e) { /* storage full */ }
      }, 500);
    }

    function validate() {
      if (!SUITE.doc.title.trim()) return 'Give the ' + noun() + ' a title first.';
      if (!SUITE.doc.blocks.length) return 'Add at least one block.';
      var unknown = SUITE.doc.blocks.filter(function(b) { return !getBlockDef(b.type); });
      if (unknown.length) return 'One or more blocks are no longer supported. Remove them before deploying.';
      return null;
    }

    function persist(publish) {
      var problem = validate();
      if (problem) {
        setStatus(problem, 'bad');
        return false;
      }
      var list = storeList();
      var existing = null;
      if (SUITE.doc.id !== null && SUITE.doc.id !== undefined) {
        existing = list.filter(function(t) { return t.id === SUITE.doc.id; })[0] || null;
      }
      if (existing && !canManage(existing)) {
        setStatus('This ' + noun() + ' belongs to another teacher.', 'bad');
        return false;
      }
      if (!existing) SUITE.doc.id = nextId();

      SUITE.doc.updatedAt = today();
      SUITE.doc.published = publish;
      SUITE.doc.publishedAt = publish ? new Date().toISOString() : (SUITE.doc.publishedAt || null);
      SUITE.doc.teacherId = SUITE.doc.teacherId || SUITE.user.id;
      if (SUITE.courseId) {
        SUITE.doc.courseId = SUITE.courseId;
        SUITE.doc.assignedTo = 'course';
        SUITE.doc.assignedIds = [SUITE.courseId];
      }

      var record = {
        id: SUITE.doc.id,
        title: SUITE.doc.title,
        type: docType(),
        description: SUITE.doc.description,
        deadline: SUITE.doc.deadline,
        priority: SUITE.doc.priority,
        assignedTo: SUITE.doc.assignedTo,
        assignedIds: SUITE.doc.assignedIds,
        courseId: SUITE.doc.courseId === undefined ? null : SUITE.doc.courseId,
        files: SUITE.doc.files,
        questions: [],
        blocks: SUITE.doc.blocks,
        published: SUITE.doc.published,
        publishedAt: SUITE.doc.publishedAt,
        createdAt: SUITE.doc.createdAt,
        updatedAt: SUITE.doc.updatedAt,
        teacherId: SUITE.doc.teacherId,
        kind: 'suite'
      };

      if (existing) {
        list = list.map(function(t) { return t.id === existing.id ? record : t; });
      } else {
        list.push(record);
      }
      var result = isTestDoc() ? writeTests(list) : writeTasks(list);
      if (result === 'failed') {
        setStatus('Could not save: this browser is blocking local storage.', 'bad');
        return false;
      }
      sRemove(DRAFT_KEY);
      setStatus(publish
        ? 'Deployed to students as ' + noun() + ' #' + record.id
        : 'Draft saved as ' + noun() + ' #' + record.id, 'ok');
      renderTaskList();
      renderInspector();
      return true;
    }

    function openTask(id) {
      var record = storeList().filter(function(t) { return t.id === id; })[0];
      if (!record) return;
      if (!canManage(record)) {
        setStatus('This ' + noun() + ' belongs to another teacher.', 'bad');
        return;
      }
      SUITE.doc = toDoc(record);
      SUITE.selectedId = null;
      $('suite-title').value = SUITE.doc.title;
      renderCanvas();
      renderInspector();
      renderTaskList();
      setStatus('');
    }

    // ---------- preview ----------
    function openPreview() {
      var body = $('suite-preview-body');
      stopTaskBlocks(body);
      $('suite-preview-h').textContent = SUITE.doc.title || 'Untitled task';
      body.innerHTML = renderTaskBlocks(SUITE.doc.blocks, { editing: false });
      mountTaskBlocks(body, SUITE.doc.blocks, { editing: false });
      var bar = document.createElement('div');
      bar.style.display = 'flex';
      bar.style.gap = '10px';
      bar.style.flexWrap = 'wrap';
      bar.style.alignItems = 'center';
      var gradeBtn = document.createElement('button');
      gradeBtn.type = 'button';
      gradeBtn.className = 'suite-btn primary';
      gradeBtn.textContent = 'Grade this attempt';
      var out = document.createElement('span');
      out.className = 'suite-status';
      gradeBtn.addEventListener('click', function() {
        var res = gradeTaskBlocks(body, SUITE.doc.blocks);
        out.className = 'suite-status ' + (res.score === res.max ? 'ok' : '');
        out.textContent = 'Score ' + res.score + ' / ' + res.max;
      });
      bar.appendChild(gradeBtn);
      bar.appendChild(out);
      body.appendChild(bar);
      $('suite-preview').hidden = false;
    }

    // ---------- theme ----------
    function applyTheme(name) {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(name);
      document.body.classList.add('suite');
      $('suite-theme').textContent = name === 'dark' ? '☀️' : '🌙';
      try { sSet(THEME_KEY, name); } catch (e) { /* noop */ }
    }

    // ---------- boot ----------
    function boot() {
      var theme = sGet(THEME_KEY) === 'dark' ? 'dark' : 'light';
      applyTheme(theme);
      $('suite-theme').addEventListener('click', function() {
        applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
      });

      SUITE.user = requireUser();
      if (!SUITE.user) return;
      hideLock();
      if (!resolveContext()) return;
      paintContext();

      var draft = sGetJson(DRAFT_KEY, null);
      if (draft && draft.doc && draft.doc.blocks) SUITE.doc = draft.doc;
      else SUITE.doc = newDoc();
      if (!Array.isArray(SUITE.doc.blocks)) SUITE.doc.blocks = [];
      // The draft may have come from a different section, so the destination is
      // always re-stamped from the URL.
      if (SUITE.courseId) {
        SUITE.doc.courseId = SUITE.courseId;
        SUITE.doc.assignedTo = 'course';
        SUITE.doc.assignedIds = [SUITE.courseId];
      }
      if (!isTestDoc()) SUITE.doc.type = docType();

      $('suite-title').value = SUITE.doc.title || '';
      $('suite-title').addEventListener('input', function() {
        SUITE.doc.title = $('suite-title').value;
        updateMeta();
        autosave();
      });
      $('suite-block-search').addEventListener('input', function() {
        renderPalette($('suite-block-search').value);
      });
      $('suite-new').addEventListener('click', function() {
        if (SUITE.doc.blocks.length && !confirm('Start a new ' + noun() + '? The current one keeps its last saved state.')) return;
        SUITE.doc = newDoc();
        SUITE.selectedId = null;
        $('suite-title').value = '';
        renderCanvas();
        renderInspector();
        renderTaskList();
      });
      $('suite-save').addEventListener('click', function() { persist(false); });
      $('suite-deploy').addEventListener('click', function() { persist(true); });
      $('suite-reload').addEventListener('click', function() {
        renderTaskList();
        setStatus('Reloaded from this browser.', 'ok');
      });
      $('suite-preview-btn').addEventListener('click', openPreview);
      $('suite-preview-close').addEventListener('click', function() {
        stopTaskBlocks($('suite-preview-body'));
        $('suite-preview').hidden = true;
      });

      var blocks = $('suite-blocks');
      blocks.addEventListener('click', function(e) {
        var up = e.target.closest('[data-tb-move="up"]');
        if (up) {
          shiftBlock(up.getAttribute('data-tb-id'), -1);
          return;
        }
        var down = e.target.closest('[data-tb-move="down"]');
        if (down) {
          shiftBlock(down.getAttribute('data-tb-id'), 1);
          return;
        }
        var dup = e.target.closest('[data-tb-dup]');
        if (dup) {
          duplicateBlock(dup.getAttribute('data-tb-dup'));
          return;
        }
        var del = e.target.closest('[data-tb-del]');
        if (del) {
          deleteBlock(del.getAttribute('data-tb-del'));
          return;
        }
        var node = e.target.closest('[data-tb-id]');
        if (node) selectBlock(node.getAttribute('data-tb-id'));
      });

      var canvas = $('suite-canvas');
      canvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        canvas.classList.add('dragover');
      });
      canvas.addEventListener('dragleave', function() {
        canvas.classList.remove('dragover');
      });
      canvas.addEventListener('drop', function(e) {
        e.preventDefault();
        canvas.classList.remove('dragover');
        var type = e.dataTransfer.getData('text/nokj-block');
        if (type) addBlock(type);
      });

      document.addEventListener('keydown', function(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && SUITE.selectedId &&
          !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
          deleteBlock(SUITE.selectedId);
        }
      });

      renderPalette('');
      renderTaskList();
      renderCanvas();
      renderInspector();
      if (draft && draft.doc) setStatus('Recovered your unsaved draft.', 'ok');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  })();
