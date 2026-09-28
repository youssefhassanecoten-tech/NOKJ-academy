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
      returnTo: '',
      // Undo/redo, plus which blocks the teacher has folded away.
      past: [],
      future: [],
      historyLimit: 60,
      historyKey: null,
      historyAt: 0,
      collapsed: {},
      // Editor language, independent of the academy UI language.
      lang: 'en'
    };

    // ---------- i18n ----------
    // The suite is a separate page, so it carries its own dictionary rather
    // than relying on the academy's. A teacher can flip language mid-edit and
    // the choice is remembered for the next visit.
    var LANG_KEY = 'nokj-suite-lang';
    var I18N = {
      en: {
        'Task Designer Suite': 'Task Designer Suite',
        'Back to course': 'Back to course',
        'Undo': 'Undo', 'Redo': 'Redo', 'Preview': 'Preview', 'New': 'New',
        'Save draft': 'Save draft', 'Deploy': 'Deploy',
        'My tasks': 'My tasks', 'tasks in this course': 'tasks in this course',
        'On this page': 'On this page', 'Blocks': 'Blocks',
        'Search blocks...': 'Search blocks...',
        'No blocks yet. Add one from the panel.': 'No blocks yet. Add one from the panel.',
        'Nothing on the page yet': 'Nothing on the page yet',
        'Click a block in the panel on the left, or drag one onto this page, to start building.':
          'Click a block in the panel on the left, or drag one onto this page, to start building.',
        'Untitled task': 'Untitled task', 'Untitled test': 'Untitled test',
        'Untitled assignment': 'Untitled assignment',
        'Drop a block here': 'Drop a block here',
        'More blocks...': 'More blocks...',
        'Insert a block here': 'Insert a block here', 'Fold this block': 'Fold this block',
        'Move up': 'Move up', 'Move down': 'Move down',
        'Duplicate': 'Duplicate', 'Delete': 'Delete',
        'Title': 'Title', 'Description': 'Description', 'Deadline': 'Deadline', 'Priority': 'Priority',
        'High': 'High', 'Medium': 'Medium', 'Low': 'Low',
        'Points': 'Points', 'Save only': 'Save only',
        'Task settings': 'Task settings', 'Test settings': 'Test settings',
        'Assignment settings': 'Assignment settings',
        'Preview this task as a student sees it': 'Preview this task as a student sees it',
        'Grade this attempt': 'Grade this attempt', 'Close': 'Close',
        'Draft': 'Draft', 'Deployed': 'Deployed',
        'Exam rules': 'Exam rules', 'Timing': 'Timing',
        'Show a timer while the student works': 'Show a timer while the student works',
        'Counting': 'Counting',
        'Down to zero, then submit': 'Down to zero, then submit',
        'Up from zero': 'Up from zero',
        'Minutes': 'Minutes', 'Warn at (minutes left)': 'Warn at (minutes left)',
        'A countdown that reaches zero submits the attempt automatically.':
          'A countdown that reaches zero submits the attempt automatically.',
        'Tab switching': 'Tab switching',
        'If the student leaves the tab': 'If the student leaves the tab',
        'Allow it, do nothing': 'Allow it, do nothing',
        'Warn them and count it': 'Warn them and count it',
        'Submit the test and close it': 'Submit the test and close it',
        'This is a deterrent, not a lock: a determined student can always use a second device.':
          'This is a deterrent, not a lock: a determined student can always use a second device.',
        'Give the task a title first.': 'Give the task a title first.',
        'Give the test a title first.': 'Give the test a title first.',
        'Give the assignment a title first.': 'Give the assignment a title first.',
        'Reloaded from this browser.': 'Reloaded from this browser.',
        'Recovered your unsaved draft.': 'Recovered your unsaved draft.',
        'Nothing to choose from yet.': 'Nothing to choose from yet.',
        'Add at least one block.': 'Add at least one block.',
        'One or more blocks are no longer supported. Remove them before deploying.':
          'One or more blocks are no longer supported. Remove them before deploying.',
        'Draft saved': 'Draft saved', 'Deployed to students': 'Deployed to students',
        'Could not save: this browser is blocking local storage.':
          'Could not save: this browser is blocking local storage.',
        'Start a new item? The current one keeps its last saved state.':
          'Start a new item? The current one keeps its last saved state.',
        'No academy session found. Sign in to the academy first, then open the Suite.':
          'No academy session found. Sign in to the academy first, then open the Suite.',
        'The Task Designer Suite is for teachers and admins.':
          'The Task Designer Suite is for teachers and admins.',
        'This account is no longer in the teacher or admin list.':
          'This account is no longer in the teacher or admin list.',
        'That course belongs to another teacher.': 'That course belongs to another teacher.',
        'Building a task for': 'Building a task for', 'Building a test for': 'Building a test for',
        'Building an assignment for': 'Building an assignment for',
        'Points and points left: block properties': 'Points and points left: block properties',
        'Unassigned': 'Unassigned',
        'points': 'points', 'blocks': 'blocks',
        'No tasks in this course yet. Build one and deploy it.':
          'No tasks in this course yet. Build one and deploy it.',
        'No tests in this course yet. Build one and deploy it.':
          'No tests in this course yet. Build one and deploy it.',
        'No assignments in this course yet. Build one and deploy it.':
          'No assignments in this course yet. Build one and deploy it.',
        'No tasks yet. Build one and deploy it to your students.':
          'No tasks yet. Build one and deploy it to your students.',
        'No tests yet. Build one and deploy it to your students.':
          'No tests yet. Build one and deploy it to your students.',
        'No assignments yet. Build one and deploy it to your students.':
          'No assignments yet. Build one and deploy it to your students.',
        'Layout': 'Layout', 'Media': 'Media', 'Question': 'Question',
        'Geography': 'Geography', 'Maths': 'Maths', 'English': 'English', 'Game': 'Game'
      },
      ru: {
        'Task Designer Suite': 'Конструктор заданий',
        'Back to course': 'Назад в курс',
        'Undo': 'Отменить', 'Redo': 'Повторить', 'Preview': 'Просмотр', 'New': 'Создать',
        'Save draft': 'Сохранить черновик', 'Deploy': 'Опубликовать',
        'My tasks': 'Мои задания', 'tasks in this course': 'заданий в этом курсе',
        'On this page': 'На этой странице', 'Blocks': 'Блоки',
        'Search blocks...': 'Поиск блоков...',
        'No blocks yet. Add one from the panel.': 'Пока нет блоков. Добавьте из панели.',
        'Nothing on the page yet': 'На странице пока пусто',
        'Click a block in the panel on the left, or drag one onto this page, to start building.':
          'Нажмите на блок в панели слева или перетащите его на страницу, чтобы начать.',
        'Untitled task': 'Задание без названия', 'Untitled test': 'Тест без названия',
        'Untitled assignment': 'Работа без названия',
        'Drop a block here': 'Перетащите блок сюда',
        'More blocks...': 'Ещё блоки...',
        'Insert a block here': 'Вставить блок здесь', 'Fold this block': 'Свернуть блок',
        'Move up': 'Выше', 'Move down': 'Ниже',
        'Duplicate': 'Дублировать', 'Delete': 'Удалить',
        'Title': 'Название', 'Description': 'Описание', 'Deadline': 'Срок', 'Priority': 'Приоритет',
        'High': 'Высокий', 'Medium': 'Средний', 'Low': 'Низкий',
        'Points': 'Баллы', 'Save only': 'Только сохранить',
        'Task settings': 'Настройки задания', 'Test settings': 'Настройки теста',
        'Assignment settings': 'Настройки работы',
        'Preview this task as a student sees it': 'Предпросмотр так, как увидит ученик',
        'Grade this attempt': 'Проверить ответы', 'Close': 'Закрыть',
        'Draft': 'Черновик', 'Deployed': 'Опубликовано',
        'Exam rules': 'Правила экзамена', 'Timing': 'Время',
        'Show a timer while the student works': 'Показывать таймер во время работы',
        'Counting': 'Отсчёт',
        'Down to zero, then submit': 'Обратный отсчёт, затем отправка',
        'Up from zero': 'Прямой отсчёт от нуля',
        'Minutes': 'Минуты', 'Warn at (minutes left)': 'Предупредить за (минут)',
        'A countdown that reaches zero submits the attempt automatically.':
          'При обратном отсчёте до нуля работа отправляется автоматически.',
        'Tab switching': 'Переключение вкладок',
        'If the student leaves the tab': 'Если ученик уходит со вкладки',
        'Allow it, do nothing': 'Разрешить, ничего не делать',
        'Warn them and count it': 'Предупредить и посчитать',
        'Submit the test and close it': 'Отправить тест и закрыть',
        'This is a deterrent, not a lock: a determined student can always use a second device.':
          'Это не блокировка, а напоминание: решительный ученик может использовать второе устройство.',
        'Give the task a title first.': 'Сначала введите название задания.',
        'Give the test a title first.': 'Сначала введите название теста.',
        'Give the assignment a title first.': 'Сначала введите название работы.',
        'Reloaded from this browser.': 'Данные перезагружены из этого браузера.',
        'Recovered your unsaved draft.': 'Восстановлен несохранённый черновик.',
        'Nothing to choose from yet.': 'Пока нечего выбирать.',
        'Add at least one block.': 'Добавьте хотя бы один блок.',
        'One or more blocks are no longer supported. Remove them before deploying.':
          'Один или несколько блоков больше не поддерживаются. Удалите их перед публикацией.',
        'Draft saved': 'Черновик сохранён', 'Deployed to students': 'Опубликовано для учеников',
        'Could not save: this browser is blocking local storage.':
          'Не удалось сохранить: браузер блокирует локальное хранилище.',
        'Start a new item? The current one keeps its last saved state.':
          'Создать новый элемент? Текущий сохранится в последнем виде.',
        'No academy session found. Sign in to the academy first, then open the Suite.':
          'Сессия не найдена. Сначала войдите в систему, затем откройте конструктор.',
        'The Task Designer Suite is for teachers and admins.':
          'Конструктор заданий доступен только преподавателям и администраторам.',
        'This account is no longer in the teacher or admin list.':
          'Эта учётная запись больше не значится среди преподавателей или администраторов.',
        'That course belongs to another teacher.': 'Этот курс принадлежит другому преподавателю.',
        'Building a task for': 'Создаётся задание для', 'Building a test for': 'Создаётся тест для',
        'Building an assignment for': 'Создаётся работа для',
        'Points and points left: block properties': 'Баллы: свойства блока',
        'Unassigned': 'Не назначено',
        'points': 'баллов', 'blocks': 'блоков',
        'No tasks in this course yet. Build one and deploy it.':
          'В этом курсе пока нет заданий. Создайте и опубликуйте.',
        'No tests in this course yet. Build one and deploy it.':
          'В этом курсе пока нет тестов. Создайте и опубликуйте.',
        'No assignments in this course yet. Build one and deploy it.':
          'В этом курсе пока нет работ. Создайте и опубликуйте.',
        'No tasks yet. Build one and deploy it to your students.':
          'Заданий пока нет. Создайте и опубликуйте для учеников.',
        'No tests yet. Build one and deploy it to your students.':
          'Тестов пока нет. Создайте и опубликуйте для учеников.',
        'No assignments yet. Build one and deploy it to your students.':
          'Работ пока нет. Создайте и опубликуйте для учеников.',
        'Layout': 'Структура', 'Media': 'Медиа', 'Question': 'Вопрос',
        'Geography': 'География', 'Maths': 'Математика', 'English': 'Английский', 'Game': 'Игра'
      }
    };

    // ---------- block labels ----------
    // Block labels live with the block definitions, so the Suite translates
    // them here rather than teaching every block about language.
    var BLOCK_LABELS_RU = {
      heading: 'Заголовок', text: 'Текст', callout: 'Врезка', divider: 'Разделитель',
      image: 'Изображение', video: 'Видео', keyvalue: 'Ключевые факты',
      mcq: 'Один вариант', shorttext: 'Короткий ответ', multi: 'Несколько вариантов',
      order: 'Порядок', match: 'Соответствие', spot: 'Точки на картинке',
      terrain: 'Карта рельефа', gps: 'GPS-трек', terrain3d: '3D-рельеф',
      minerals: 'Минералы', weather: 'Погода',
      equation: 'Шаги решения', fraction: 'Дроби', numberline: 'Числовая прямая',
      funcplot: 'График функции', shapemath: 'Геометрия', mathpairs: 'Пары', dice: 'Кубики',
      flashcards: 'Карточки', vocabmatch: 'Слова и значения', wordbuild: 'Собери слово',
      unscramble: 'Собери предложение', grammar: 'Грамматика'
    };

    function blockLabel(type) {
      var def = getBlockDef(type);
      if (SUITE.lang !== 'ru') return def ? def.label : type;
      return BLOCK_LABELS_RU[type] || (def ? def.label : type);
    }

    function fieldLabel(text) {
      // Inspector field labels are authored in English; map the common ones.
      if (SUITE.lang !== 'ru') return text;
      var map = {
        'Question': 'Вопрос', 'Correct option (0-based)': 'Правильный вариант (с 0)',
        'Explanation': 'Пояснение', 'Options': 'Варианты', 'Rows': 'Строки',
        'Text': 'Текст', 'Level': 'Уровень', 'Image URL': 'Ссылка на изображение',
        'Caption': 'Подпись', 'Video URL': 'Ссылка на видео', 'YouTube or file': 'YouTube или файл',
        'Title': 'Название', 'Key': 'Ключ', 'Value': 'Значение',
        'Answer (one per line)': 'Ответ (по одному в строке)',
        'Accepted answers (one per line)': 'Принимаемые ответы (по одному в строка)',
        'Case sensitive': 'Учитывать регистр', 'Accepted': 'Принимается',
        'Pairs': 'Пары', 'Left': 'Слева', 'Right': 'Справа',
        'Shape': 'Фигура', 'Find': 'Найти', 'Length / radius': 'Длина / радиус',
        'Width': 'Ширина', 'Height': 'Высота', 'Target word': 'Нужное слово',
        'Clue': 'Подсказка', 'Correct sentence': 'Верное предложение',
        'Shuffle the words': 'Перемешать слова', 'Seed': 'Начальное значение',
        'Rows and columns': 'Строки и столбцы', 'Grid': 'Сетка',
        'How many are correct': 'Сколько верных'
      };
      return map[text] || text;
    }

    function trSuite(key) {
      var lang = SUITE.lang;
      var dict = I18N[lang] || I18N.en;
      if (dict[key]) return dict[key];
      return I18N.en[key] || key;
    }

    // Sets the language without re-rendering, so it is safe to call before the
    // document exists.
    function initSuiteLang() {
      SUITE.lang = sGet(LANG_KEY) === 'ru' ? 'ru' : 'en';
      document.documentElement.lang = SUITE.lang;
      var btn = $('suite-lang');
      if (btn) btn.textContent = SUITE.lang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN';
    }

    function setSuiteLang(lang) {
      initSuiteLang();
      if (lang && I18N[lang]) SUITE.lang = lang;
      try { sSet(LANG_KEY, SUITE.lang); } catch (e) { /* noop */ }
      document.documentElement.lang = SUITE.lang;
      var btn = $('suite-lang');
      if (btn) btn.textContent = SUITE.lang === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN';
      applySuiteLang();
    }

    // Re-labels everything that was written into the DOM.
    function applySuiteLang() {
      setStatus('');
      document.title = trSuite('Task Designer Suite');
      var map = [
        ['suite-back', 'Back to course'], ['suite-undo', 'Undo'], ['suite-redo', 'Redo'],
        ['suite-preview-btn', 'Preview'], ['suite-new', 'New'],
        ['suite-save', 'Save draft'], ['suite-deploy', 'Deploy'],
        ['suite-list-head', SUITE.courseId ? 'tasks in this course' : 'My tasks'],
        ['suite-block-search', null]
      ];
      map.forEach(function(pair) {
        var el2 = $(pair[0]);
        if (!el2) return;
        if (pair[0] === 'suite-back') el2.textContent = '← ' + trSuite(pair[1]);
        else if (pair[0] === 'suite-list-head') {
          el2.textContent = SUITE.courseId ? trSuite(pair[1]) : trSuite('My tasks');
        } else if (pair[0] === 'suite-block-search') el2.placeholder = trSuite('Search blocks...');
        else el2.textContent = trSuite(pair[1]);
      });
      var sideHeads = document.querySelectorAll('.suite-side-head span');
      if (sideHeads.length) {
        sideHeads[0].textContent = SUITE.courseId ? trSuite('tasks in this course') : trSuite('My tasks');
        sideHeads[1].textContent = trSuite('On this page');
        sideHeads[2].textContent = trSuite('Blocks');
      }
      var drop = document.querySelector('.suite-drop');
      if (drop) drop.textContent = trSuite('Drop a block here');
      paintContext();
      renderPalette($('suite-block-search') ? $('suite-block-search').value : '');
      renderCanvas();
      renderInspector();
      renderTaskList();
      paintHistoryButtons();
    }

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
        msg.textContent = trSuite('No academy session found. Sign in to the academy first, then open the Suite.');
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

    // ---------- history ----------
    // Structural edits and inspector commits push a snapshot, so undo covers
    // what a teacher actually did rather than each keystroke.
    function snapshot() {
      return JSON.stringify({
        blocks: SUITE.doc.blocks,
        title: SUITE.doc.title,
        description: SUITE.doc.description,
        deadline: SUITE.doc.deadline,
        priority: SUITE.doc.priority,
        timer: SUITE.doc.timer,
        guard: SUITE.doc.guard
      });
    }

    function applySnapshot(json) {
      var s = JSON.parse(json);
      SUITE.doc.blocks = s.blocks;
      SUITE.doc.title = s.title;
      SUITE.doc.description = s.description;
      SUITE.doc.deadline = s.deadline;
      SUITE.doc.priority = s.priority;
      SUITE.doc.timer = s.timer;
      SUITE.doc.guard = s.guard;
      $('suite-title').value = SUITE.doc.title || '';
    }

    // Push the state as it is *now* (i.e. before the caller's change) so undo
    // has somewhere to return to. Consecutive edits with the same coalesceKey
    // inside a short window are treated as one, so typing does not flood the
    // history.
    function markDirty(coalesceKey) {
      var now = Date.now();
      if (coalesceKey && SUITE.historyKey === coalesceKey && (now - SUITE.historyAt) < 900) return;
      SUITE.past.push(snapshot());
      if (SUITE.past.length > SUITE.historyLimit) SUITE.past.shift();
      SUITE.future = [];
      SUITE.historyKey = coalesceKey || null;
      SUITE.historyAt = now;
      paintHistoryButtons();
    }

    function undo() {
      if (!SUITE.past.length) return false;
      SUITE.future.push(snapshot());
      applySnapshot(SUITE.past.pop());
      SUITE.historyKey = null;
      afterHistory();
      return true;
    }

    function redo() {
      if (!SUITE.future.length) return false;
      SUITE.past.push(snapshot());
      applySnapshot(SUITE.future.pop());
      SUITE.historyKey = null;
      afterHistory();
      return true;
    }

    function afterHistory() {
      SUITE.selectedId = null;
      renderCanvas();
      renderInspector();
      autosave();
      paintHistoryButtons();
    }

    function paintHistoryButtons() {
      var u = $('suite-undo');
      var r = $('suite-redo');
      if (u) u.disabled = !SUITE.past.length;
      if (r) r.disabled = !SUITE.future.length;
    }

    // ---------- back to the course ----------
    // The studio records which tab (and which sub-tab) the teacher was on, so
    // coming back lands them exactly where they left rather than on the list.
    function backToCourse() {
      var base = SUITE.returnTo || '../';
      var back = '';
      try { back = sessionStorage.getItem('nokj-studio-back') || ''; } catch (e) { /* noop */ }
      var target = base + 'index.html';
      if (back) target += '#' + back;
      window.location.href = target;
    }

    // ---------- exam controls: timer and tab guard ----------
    function ensureExamSettings() {
      if (!SUITE.doc.timer || typeof SUITE.doc.timer !== 'object') {
        SUITE.doc.timer = { enabled: false, mode: 'countdown', minutes: 20, warnAt: 5 };
      }
      if (!SUITE.doc.guard || typeof SUITE.doc.guard !== 'object') {
        // 'off' | 'warn' | 'submit'
        SUITE.doc.guard = { mode: 'off' };
      }
    }

    function examSettings() {
      var host = $('suite-inspector');
      ensureExamSettings();
      host.appendChild(el('hr', 'suite-sep'));
      host.appendChild(sectionTitle(isTestDoc() ? 'Exam rules' : 'Timing'));

      // ---- timer ----
      var timerEnabled = document.createElement('label');
      timerEnabled.className = 'suite-check';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!SUITE.doc.timer.enabled;
      var cbText = document.createElement('span');
      cbText.textContent = trSuite('Show a timer while the student works');
      timerEnabled.appendChild(cb);
      timerEnabled.appendChild(cbText);
      host.appendChild(timerEnabled);

      var timerBody = document.createElement('div');
      timerBody.className = 'suite-sub';
      timerBody.hidden = !SUITE.doc.timer.enabled;

      timerBody.appendChild(selectRow('Counting', SUITE.doc.timer.mode, [
        ['countdown', 'Down to zero, then submit'],
        ['up', 'Up from zero']
      ], function(v) {
        markDirty('timer-mode');
        SUITE.doc.timer.mode = v;
        autosave();
      }));
      timerBody.appendChild(numberRow('Minutes', SUITE.doc.timer.minutes, 1, 600, function(v) {
        markDirty('timer-min');
        SUITE.doc.timer.minutes = v;
        autosave();
      }, 1));
      timerBody.appendChild(numberRow('Warn at (minutes left)', SUITE.doc.timer.warnAt, 0, 60, function(v) {
        markDirty('timer-warn');
        SUITE.doc.timer.warnAt = v;
        autosave();
      }, 1));
      var timerNote = document.createElement('p');
      timerNote.className = 'suite-hint';
      timerNote.textContent = trSuite('A countdown that reaches zero submits the attempt automatically.');
      timerBody.appendChild(timerNote);
      host.appendChild(timerBody);

      cb.addEventListener('change', function() {
        markDirty();
        SUITE.doc.timer.enabled = cb.checked;
        timerBody.hidden = !cb.checked;
        autosave();
      });

      // ---- tab guard (tests only) ----
      if (isTestDoc()) {
        host.appendChild(sectionTitle('Tab switching'));
        host.appendChild(selectRow('If the student leaves the tab', SUITE.doc.guard.mode, [
          ['off', 'Allow it, do nothing'],
          ['warn', 'Warn them and count it'],
          ['submit', 'Submit the test and close it']
        ], function(v) {
          markDirty('guard-mode');
          SUITE.doc.guard.mode = v;
          autosave();
        }));
        var g = document.createElement('p');
        g.className = 'suite-hint';
        g.textContent = 'This is a deterrent, not a lock: a determined student can always use a second device.';
        host.appendChild(g);
      }
    }

    function sectionTitle(text) {
      var h = document.createElement('h4');
      h.className = 'suite-section';
      h.textContent = text;
      return h;
    }

    function el(tag, cls) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      return e;
    }

    function selectRow(label, value, options, onChange) {
      var wrap = document.createElement('div');
      wrap.className = 'suite-field';
      var l = document.createElement('label');
      l.textContent = label;
      wrap.appendChild(l);
      var s = document.createElement('select');
      options.forEach(function(o) {
        var opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        if (value === o[0]) opt.selected = true;
        s.appendChild(opt);
      });
      s.addEventListener('change', function() { onChange(s.value); });
      wrap.appendChild(s);
      return wrap;
    }

    function numberRow(label, value, min, max, onChange, step) {
      var wrap = document.createElement('div');
      wrap.className = 'suite-field';
      var l = document.createElement('label');
      l.textContent = label;
      wrap.appendChild(l);
      var i = document.createElement('input');
      i.type = 'number';
      if (min !== undefined) i.min = min;
      if (max !== undefined) i.max = max;
      if (step) i.step = step;
      i.value = value;
      i.addEventListener('change', function() {
        var n = parseInt(i.value, 10);
        if (isNaN(n)) return;
        if (min !== undefined && n < min) n = min;
        if (max !== undefined && n > max) n = max;
        i.value = n;
        onChange(n);
      });
      wrap.appendChild(i);
      return wrap;
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
        kind: 'suite',
        // Exam controls. The guard only applies to tests, but the shape is
        // stored the same way so switching a task into a test keeps settings.
        timer: { enabled: false, mode: 'countdown', minutes: 20, warnAt: 5 },
        guard: { mode: 'off' }
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
      doc.timer = (record.timer && typeof record.timer === 'object') ? record.timer : doc.timer;
      doc.guard = (record.guard && typeof record.guard === 'object') ? record.guard : doc.guard;
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
      bar.textContent = trSuite('Building a ' + noun()) + ' \u201C' + SUITE.courseName + '\u201D';
      var back = $('suite-back');
      if (back) {
        back.hidden = false;
        back.addEventListener('click', backToCourse);
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
          return (def.label + ' ' + blockLabel(t) + ' ' + trSuite(cat) + ' ' + t).toLowerCase().indexOf(q) !== -1;
        });
        if (!types.length) return;
        var group = document.createElement('div');
        group.className = 'suite-group';
        var head = document.createElement('div');
        head.className = 'suite-group-t';
        head.textContent = trSuite(cat);
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
          label.textContent = blockLabel(t);
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

    // An "insert here" strip sits between every block and after the last one,
    // so a block can be placed at an exact position instead of only appended.
    function insertBar(at) {
      return '<div class="suite-insert" data-insert-at="' + at + '">' +
        '<button type="button" class="suite-insert-btn" data-insert-at="' + at + '" title="Insert a block here">＋</button>' +
        '</div>';
    }

    function renderCanvas() {
      var host = $('suite-blocks');
      stopTaskBlocks(host);
      if (!SUITE.doc.blocks.length) {
        host.innerHTML = '<div class="suite-canvas-empty">' +
          '<div class="suite-canvas-empty-art">🧩</div>' +
          '<h3>Nothing on the page yet</h3>' +
          '<p>Click a block in the panel on the left, or drag one onto this page, to start building.</p>' +
          '</div>';
        renderOutline();
        updateMeta();
        return;
      }
      host.innerHTML = renderTaskBlocks(SUITE.doc.blocks, {
        editing: true,
        selectedId: SUITE.selectedId,
        collapsed: SUITE.collapsed
      });
      // Re-insert the strips between blocks.
      var cards = host.querySelectorAll('.tb-block');
      Array.prototype.forEach.call(cards, function(card, i) {
        card.parentNode.insertBefore(insertNode(i), card);
        if (SUITE.collapsed[card.getAttribute('data-tb-id')]) card.classList.add('tb-collapsed');
      });
      host.appendChild(insertNode(SUITE.doc.blocks.length));
      mountTaskBlocks(host, SUITE.doc.blocks, { editing: true });
      // A strip turns into a small palette when it is clicked or hovered.
      host.querySelectorAll('.suite-insert-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          openInsertMenu(parseInt(btn.dataset.insertAt, 10), btn);
        });
      });
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
      renderOutline();
      updateMeta();
    }

    function insertNode(at) {
      var tpl = document.createElement('div');
      tpl.innerHTML = insertBar(at);
      return tpl.firstChild;
    }

    // Clicking a strip opens a compact palette limited to common blocks, so a
    // teacher can insert without hunting the left panel.
    var INSERT_FAVOURITES = ['heading', 'text', 'callout', 'image', 'mcq', 'shorttext', 'match', 'order', 'divider'];
    function openInsertMenu(at, anchor) {
      closeInsertMenu();
      var menu = document.createElement('div');
      menu.className = 'suite-insert-menu';
      INSERT_FAVOURITES.forEach(function(type) {
        var def = getBlockDef(type);
        if (!def) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = def.icon + '  ' + blockLabel(type);
        b.addEventListener('click', function() {
          closeInsertMenu();
          insertBlock(type, at);
        });
        menu.appendChild(b);
      });
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'suite-insert-more';
      more.textContent = trSuite('More blocks...');
      more.addEventListener('click', function() {
        closeInsertMenu();
        var search = $('suite-block-search');
        if (search) { search.focus(); search.value = ''; renderPalette(''); }
        $('suite-side').scrollTop = $('suite-side').scrollHeight;
      });
      menu.appendChild(more);
      document.body.appendChild(menu);
      var r = anchor.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - 240)) + 'px';
      menu.style.top = (window.scrollY + r.bottom + window.scrollY + 6) + 'px';
      SUITE.insertMenu = menu;
      setTimeout(function() { document.addEventListener('click', closeInsertMenu, { once: true }); }, 0);
    }

    function closeInsertMenu() {
      if (SUITE.insertMenu && SUITE.insertMenu.parentNode) SUITE.insertMenu.parentNode.removeChild(SUITE.insertMenu);
      SUITE.insertMenu = null;
    }

    // A flat list of what is on the page, so a long document stays navigable.
    function renderOutline() {
      var host = $('suite-outline');
      if (!host) return;
      host.textContent = '';
      if (!SUITE.doc.blocks.length) return;
      SUITE.doc.blocks.forEach(function(b, i) {
        var def = getBlockDef(b.type);
        if (!def) return;
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'suite-outline-row' + (SUITE.selectedId === b.id ? ' active' : '');
        row.textContent = (i + 1) + '.  ' + def.icon + '  ' + blockLabel(b.type);
        row.addEventListener('click', function() {
          selectBlock(b.id);
          var card = document.querySelector('#suite-blocks [data-tb-id="' + b.id + '"]');
          if (card) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
        host.appendChild(row);
      });
    }

    function updateMeta() {
      var pts = blockTotalPoints(SUITE.doc.blocks);
      $('suite-meta').textContent = pts + ' ' + trSuite('points') + ' · ' +
        SUITE.doc.blocks.length + ' ' + trSuite('blocks').toLowerCase();
      $('suite-page-h').textContent = SUITE.doc.title || trSuite('Untitled ' + noun());
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
      markDirty();
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
      markDirty();
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
      markDirty();
      var tmp = SUITE.doc.blocks[i];
      SUITE.doc.blocks[i] = SUITE.doc.blocks[j];
      SUITE.doc.blocks[j] = tmp;
      renderCanvas();
      autosave();
    }

    function duplicateBlock(id) {
      var i = SUITE.doc.blocks.findIndex(function(b) { return b.id === id; });
      if (i < 0) return;
      markDirty();
      var copy = JSON.parse(JSON.stringify(SUITE.doc.blocks[i]));
      copy.id = newBlockId();
      SUITE.doc.blocks.splice(i + 1, 0, copy);
      SUITE.selectedId = copy.id;
      renderCanvas();
      renderInspector();
      autosave();
    }

    function deleteBlock(id) {
      markDirty();
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
        text.textContent = fieldLabel(field.label);
        row.appendChild(box);
        row.appendChild(text);
        wrap.appendChild(row);
        return wrap;
      }

      var label = document.createElement('label');
      label.textContent = fieldLabel(field.label);
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

      host.appendChild(textField(trSuite('Title'), SUITE.doc.title, function(v) {
        SUITE.doc.title = v;
        $('suite-title').value = v;
        updateMeta();
        autosave();
      }));
      host.appendChild(textField(trSuite('Description'), SUITE.doc.description, function(v) {
        SUITE.doc.description = v;
        autosave();
      }, true));

      var deadline = document.createElement('div');
      deadline.className = 'suite-field';
      var dLabel = document.createElement('label');
      dLabel.textContent = trSuite('Deadline');
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
      pLabel.textContent = trSuite('Priority');
      prio.appendChild(pLabel);
      var pSel = document.createElement('select');
      [['high', '🔴 ' + trSuite('High')], ['medium', '🟡 ' + trSuite('Medium')], ['low', '🟢 ' + trSuite('Low')]].forEach(function(o) {
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
      aLabel.textContent = trSuite('Assign to');
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
        examSettings();
        return;
      }
      var def = getBlockDef(block.type);
      $('suite-inspector-head').textContent = def ? blockLabel(block.type) : 'Block';
      host.textContent = '';

      if (block.graded) {
        var pts = document.createElement('div');
        pts.className = 'suite-field';
        var pLabel = document.createElement('label');
        pLabel.textContent = trSuite('Points');
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
      dup.textContent = '⧉ ' + trSuite('Duplicate');
      dup.addEventListener('click', function() { duplicateBlock(block.id); });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'suite-btn';
      del.style.color = 'var(--danger)';
      del.style.marginLeft = '6px';
      del.textContent = '✕ ' + trSuite('Delete');
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
          ? trSuite('No ' + noun() + 's in this course yet. Build one and deploy it.')
          : trSuite('No ' + noun() + 's yet. Build one and deploy it to your students.');
        host.appendChild(p);
        return;
      }
      mine.slice().reverse().forEach(function(t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'suite-list-item' + (SUITE.doc && t.id === SUITE.doc.id ? ' active' : '');
        b.textContent = t.title || 'Untitled ' + noun();
        var small = document.createElement('small');
        small.textContent = (t.published === false ? trSuite('Draft') : trSuite('Deployed')) + ' · ' +
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
      if (!SUITE.doc.title.trim()) return trSuite('Give the ' + noun() + ' a title first.');
      if (!SUITE.doc.blocks.length) return trSuite('Add at least one block.');
      var unknown = SUITE.doc.blocks.filter(function(b) { return !getBlockDef(b.type); });
      if (unknown.length) return trSuite('One or more blocks are no longer supported. Remove them before deploying.');
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
        kind: 'suite',
        timer: SUITE.doc.timer,
        guard: SUITE.doc.guard
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
      gradeBtn.textContent = trSuite('Grade this attempt');
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

      initSuiteLang();
      $('suite-lang').addEventListener('click', function() {
        setSuiteLang(SUITE.lang === 'ru' ? 'en' : 'ru');
      });
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
        setStatus(trSuite('Reloaded from this browser.'), 'ok');
      });
      $('suite-preview-btn').addEventListener('click', openPreview);
      $('suite-undo').addEventListener('click', undo);
      $('suite-redo').addEventListener('click', redo);
      paintHistoryButtons();
      $('suite-preview-close').addEventListener('click', function() {
        stopTaskBlocks($('suite-preview-body'));
        $('suite-preview').hidden = true;
      });

      var blocks = $('suite-blocks');
      blocks.addEventListener('click', function(e) {
        var fold = e.target.closest('[data-tb-collapse]');
        if (fold) {
          var fid = fold.getAttribute('data-tb-collapse');
          if (SUITE.collapsed[fid]) delete SUITE.collapsed[fid];
          else SUITE.collapsed[fid] = true;
          renderCanvas();
          return;
        }
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
        var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

        // Undo/redo work even while typing in the inspector.
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        if (inField) return;

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          if (!SUITE.selectedId) return;
          e.preventDefault();
          duplicateBlock(SUITE.selectedId);
          return;
        }
        if (e.key === 'Escape') {
          if (SUITE.insertMenu) { closeInsertMenu(); return; }
          SUITE.selectedId = null;
          renderCanvas();
          renderInspector();
          return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && SUITE.selectedId) {
          e.preventDefault();
          deleteBlock(SUITE.selectedId);
        }
      });

      // The document exists by now, so the saved language can be painted in.
      setSuiteLang(SUITE.lang);
      if (draft && draft.doc) setStatus(trSuite('Recovered your unsaved draft.'), 'ok');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  })();
