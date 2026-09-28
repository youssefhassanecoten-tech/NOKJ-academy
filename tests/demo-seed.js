/* ============================================================
   NOKJ demo seeder — for eyeballing the course sections locally.

   NOT part of the app. Nothing loads this file. To use it:
     1. open http://localhost:8080/ and sign in
     2. open DevTools (F12) -> Console
     3. paste this whole file and press Enter
     4. the page reloads with a fully populated course

   It only writes to localStorage, so it cannot affect the repo or
   any other browser. To go back to a clean slate, run:
     localStorage.clear(); location.reload();
   ============================================================ */
(function seedDemo() {
  var today = new Date();
  var iso = today.toISOString().split('T')[0];
  function plus(days) {
    var d = new Date(today.getTime() + days * 864e5);
    return d.toISOString().split('T')[0];
  }

  // ---------- blocks (shape matches scripts/modules/task-blocks-*.js) ----------
  var blocks = [
    {
      id: 'b_head1', type: 'heading', props: { text: 'Fractions checkpoint', level: 'h2' },
      points: 0, graded: false
    },
    {
      id: 'b_key1', type: 'keyvalue', props: {
        rows: [
          ['Numerator', 'the top number'],
          ['Denominator', 'the bottom number']
        ]
      },
      points: 0, graded: false
    },
    {
      id: 'b_mcq1', type: 'mcq', props: {
        question: 'What is 3/4 written as a decimal?',
        options: ['0.34', '0.75', '1.33', '4.30'],
        correct: 1,
        explain: '3 divided by 4 is 0.75.'
      },
      points: 2, graded: true
    },
    {
      id: 'b_short1', type: 'shorttext', props: {
        question: 'Name the shape with four equal sides.',
        answers: ['square', 'rhombus'],
        caseSensitive: false
      },
      points: 2, graded: true
    },
    {
      id: 'b_order1', type: 'order', props: {
        question: 'Put the steps in order.',
        items: ['Measure the side', 'Cut the square', 'Fold the corners', 'Glue the tabs']
      },
      points: 2, graded: true
    }
  ];

  // ---------- course with lessons and library items ----------
  var course = {
    id: 1,
    name: 'Geometry Essentials',
    teacherId: 1,
    emoji: '📐',
    code: 'GEO-101',
    description: 'Shapes, angles and area. Everything you need for the unit exam.',
    published: true,
    status: 'active',
    createdAt: iso,
    updatedAt: iso,
    passingScore: 60,
    modules: [
      {
        id: 101, title: 'Shapes and angles', published: true, order: 0,
        description: 'The building blocks of geometry.',
        lessons: [
          { id: 1011, title: 'Points, lines and planes', body: '<p>A point has no size. A line goes on forever.</p>', published: true, order: 0, type: 'text' },
          { id: 1012, title: 'Angle vocabulary', body: '<p>Acute, right, obtuse, straight.</p>', published: true, order: 1, type: 'text' },
          { id: 1013, title: 'Draft: trigonometry intro', body: '<p>Not finished yet.</p>', published: false, order: 2, type: 'text' }
        ]
      },
      {
        id: 102, title: 'Area and perimeter', published: true, order: 1,
        description: 'Measuring the space shapes take up.',
        lessons: [
          { id: 1021, title: 'Perimeter', body: '<p>Add up the outside edges.</p>', published: true, order: 0, type: 'text' }
        ]
      }
    ]
  };

  var materials = [
    { id: 201, courseId: 1, kind: 'note', title: 'Formula sheet', body: 'Area of a rectangle = length x width.', published: true, createdAt: iso },
    { id: 202, courseId: 1, kind: 'link', title: 'Interactive glossary', url: 'https://example.com/glossary', published: true, createdAt: iso },
    { id: 203, courseId: 1, kind: 'note', title: 'Draft: exam tips', body: 'Still writing these.', published: false, createdAt: iso }
  ];

  // ---------- work in every course section ----------
  var tasks = [
    {
      id: 1, title: 'Fractions checkpoint', type: 'interactive', courseId: 1, teacherId: 1,
      assignedTo: 'course', assignedIds: [1], published: true, priority: 'high',
      description: 'Six questions on fractions. Auto-marked, you can retry.',
      deadline: plus(4), createdAt: iso, files: [], questions: [],
      blocks: blocks, kind: 'suite'
    },
    {
      id: 2, title: 'Homework: shape hunt', type: 'homework', courseId: 1, teacherId: 1,
      assignedTo: 'course', assignedIds: [1], published: true, priority: 'medium',
      description: 'Find five shapes at home and name each one.',
      deadline: plus(7), createdAt: iso, files: [], questions: []
    },
    {
      id: 3, title: 'Draft: end of unit quiz', type: 'homework', courseId: 1, teacherId: 1,
      assignedTo: 'course', assignedIds: [1], published: false, priority: 'low',
      description: 'Still building this one.', deadline: plus(14), createdAt: iso,
      files: [], questions: [], kind: 'suite'
    },
    {
      id: 4, title: 'Area worksheet', type: 'assignment', courseId: 1, teacherId: 1,
      assignedTo: 'course', assignedIds: [1], published: true, priority: 'high',
      description: 'Complete the worksheet and upload your working.',
      deadline: plus(9), createdAt: iso, questions: [],
      files: [{ name: 'worksheet.txt', data: 'data:text/plain;base64,' + btoa('1. Find the area of a 4x6 rectangle.\n2. Find the area of a triangle with base 10 and height 5.\n') }]
    }
  ];

  var tests = [
    {
      id: 1, title: 'Unit 1 quiz', type: 'test', courseId: 1, teacherId: 1, published: true,
      description: 'Two multiple choice questions.', deadline: plus(10), createdAt: iso,
      blocks: [],
      questions: [
        { question: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correctAnswer: 1 },
        { question: 'What is the sum of angles in a triangle?', options: ['90', '180', '270', '360'], correctAnswer: 1 }
      ]
    }
  ];

  // ---------- existing submissions, so the teacher views are not empty ----------
  var students = JSON.parse(localStorage.getItem('nokj-students') || '[]');
  var me = students[0];
  var submissions = {};
  var testSubmissions = {};
  if (me) {
    submissions['1-' + me.id] = {
      answer: '', files: [], submittedAt: new Date().toISOString(), grade: null, feedback: '',
      blockAnswers: { b_mcq1: 1, b_short1: 'square', b_order1: ['Measure the side', 'Cut the square', 'Fold the corners', 'Glue the tabs'] },
      score: 6, max: 6,
      blockDetail: {
        b_mcq1: { correct: true, response: 1 },
        b_short1: { correct: true, response: 'square' },
        b_order1: { correct: true, response: ['Measure the side', 'Cut the square', 'Fold the corners', 'Glue the tabs'] }
      }
    };
    submissions['2-' + me.id] = {
      answer: 'Found a square window, a rectangular door, a clock circle, a triangular roof and a rhombus kite.',
      files: [], submittedAt: new Date().toISOString(), grade: 90, feedback: 'Great examples, well explained.'
    };
    testSubmissions['1-' + me.id] = {
      answers: { 0: 1, 1: 1 }, score: 100, correct: 2, total: 2,
      submittedAt: new Date().toISOString(), grade: null, feedback: ''
    };
  }

  // ---------- write ----------
  var set = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };
  set('nokj-courses', [course]);
  set('nokj-course-materials', materials);
  set('nokj-tasks', tasks);
  set('nokj-tests', tests);
  set('nokj-submissions', submissions);
  set('nokj-test-submissions', testSubmissions);
  set('nokj-enrollments', (JSON.parse(localStorage.getItem('nokj-enrollments') || '[]')).concat([
    { courseId: 1, studentId: 1 }, { courseId: 1, studentId: 2 }
  ]).filter(function (e, i, a) {
    return a.findIndex(function (x) { return x.courseId === e.courseId && x.studentId === e.studentId; }) === i;
  }));
  set('nokj-teachers', JSON.parse(localStorage.getItem('nokj-teachers') || '[]'));
  set('nokj-students', students);

  // The consolidated snapshot is a repair copy; drop it so the app rebuilds it
  // from the keys above rather than restoring stale values.
  localStorage.removeItem('nokj-db-snapshot');

  console.log('Seeded. Reloading...');
  location.reload();
})();
