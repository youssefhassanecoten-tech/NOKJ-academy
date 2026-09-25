
      // ----- DEMO ACCOUNTS -----
      const DEMO_USERS = {
        'admin@nokj.com': { password: 'admin123', role: 'Admin' },
        'student@nokj.com': { password: 'password123', role: 'Student' },
        'wilson@nokj.com': { password: 'password123', role: 'Teacher' },
        'evans@nokj.com': { password: 'password123', role: 'Teacher' }
      };

      // ----- DEFAULT DATA -----
      const DEFAULT_STUDENTS = [
        { id: 1, name: 'Alex Student', email: 'student@nokj.com', password: 'password123', role: 'Student', status: 'Active',
          createdAt: '2026-08-01' },
        { id: 2, name: 'Sarah Chen', email: 'sarah@example.com', password: 'password123', role: 'Student', status: 'Active',
          createdAt: '2026-08-15' },
        { id: 3, name: 'Marcus Webb', email: 'marcus@example.com', password: 'password123', role: 'Student', status: 'Warning',
          createdAt: '2026-08-20' }
      ];

      const DEFAULT_TEACHERS = [
        { id: 1, name: 'Dr. Wilson', email: 'wilson@nokj.com', password: 'password123', role: 'Teacher',
          createdAt: '2026-08-01' },
        { id: 2, name: 'Ms. Evans', email: 'evans@nokj.com', password: 'password123', role: 'Teacher',
          createdAt: '2026-08-10' }
      ];

      const DEFAULT_ADMINS = [
        { id: 1, name: 'Admin User', email: 'admin@nokj.com', password: 'admin123', role: 'Admin', createdAt: '2026-08-01' }
      ];

      const DEFAULT_COURSES = [
        { id: 1, name: 'Mathematics', teacherId: 1, description: 'Year 10 Mathematics' },
        { id: 2, name: 'Biology', teacherId: 1, description: 'Year 10 Biology' },
        { id: 3, name: 'English Literature', teacherId: 2, description: 'Year 10 English Literature' }
      ];

      const DEFAULT_ENROLLMENTS = [
        { studentId: 1, courseId: 1 }, { studentId: 1, courseId: 2 }, { studentId: 1, courseId: 3 },
        { studentId: 2, courseId: 1 }, { studentId: 2, courseId: 3 },
        { studentId: 3, courseId: 2 }
      ];

      // Dates are filled with future dates at seed time (see futureMeetingDate).
      const DEFAULT_MEETINGS = [
        { id: 1, title: 'Mathematics: Quadratic Equations', teacherId: 1, date: null, time: '15:30', duration: 60,
          link: '#', courseId: 1, createdBy: 1, visibleToStudents: true, visibleToTeachers: false },
        { id: 2, title: 'Biology: Cell Structure', teacherId: 1, date: null, time: '12:00', duration: 60, link: '#',
          courseId: 2, createdBy: 1, visibleToStudents: true, visibleToTeachers: false },
        { id: 3, title: 'English Literature: Macbeth Analysis', teacherId: 2, date: null, time: '09:00', duration: 60,
          link: '#', courseId: 3, createdBy: 2, visibleToStudents: true, visibleToTeachers: false }
      ];

      function futureMeetingDate(days) {
        var d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      }

      const DEFAULT_TASKS = [
        { id: 1, title: 'Quadratic Equations Practice', type: 'homework', description: 'Solve problems 1-20 from the textbook.',
          deadline: '2026-09-05', priority: 'high', assignedTo: 'all', assignedIds: [], files: [],
          createdAt: '2026-08-28' },
        { id: 2, title: 'Macbeth Essay', type: 'assignment', description: 'Write a 500-word essay on ambition.',
          deadline: '2026-09-10', priority: 'medium', assignedTo: 'all', assignedIds: [], files: [],
          createdAt: '2026-08-28' },
        { id: 3, title: 'Cell Biology Quiz', type: 'test', description: 'Multiple choice quiz on cell structure.',
          deadline: '2026-09-03', priority: 'medium', assignedTo: 'all', assignedIds: [], files: [],
          createdAt: '2026-08-28' }
      ];

      const DEFAULT_TASK_SUBMISSIONS = {
        '1-1': {
          answer: 'x = -2, x = -3',
          submittedAt: '2026-08-29T10:00:00',
          grade: null,
          feedback: null,
          files: []
        },
        '2-1': {
          answer: 'Ambition is the driving force in Macbeth...',
          submittedAt: '2026-08-30T14:00:00',
          grade: 85,
          feedback: 'Good analysis, could use more quotes.',
          files: []
        },
        '3-1': {
          answer: '1. B, 2. A, 3. C, 4. D, 5. B',
          submittedAt: '2026-08-31T16:00:00',
          grade: null,
          feedback: null,
          files: []
        }
      };

      const DEFAULT_BUDGET = [
        { id: 1, category: 'Student Fees', type: 'Income', amount: 12000, date: '2026-08-01', status: 'Paid' },
        { id: 2, category: 'Staff Salaries', type: 'Expense', amount: -8500, date: '2026-08-05', status: 'Paid' }
      ];

      const DEFAULT_GRADES = { '1-1': 85, '1-2': 78, '1-3': 92, '2-1': 88, '2-3': 95, '3-2': 65 };

      const DEFAULT_ANNOUNCEMENTS = [
        { id: 1, title: 'Mid-term assessment timetable published',
          message: 'The timetable for mid-term assessments is now available. Check your course pages and speak with your teacher if you have any questions.',
          author: 'Admin User', date: '2026-08-27T09:00:00' },
        { id: 2, title: 'Extended library opening hours',
          message: 'The school library will remain open until 18:00 from Monday to Thursday during assessment week.',
          author: 'Admin User', date: '2026-08-26T09:00:00' },
        { id: 3, title: 'Student science fair registration',
          message: 'Registration for the annual student science fair is open until 5 September. Speak with your science teacher to take part.',
          author: 'Admin User', date: '2026-08-25T09:00:00' }
      ];
      const DEFAULT_PRESENTATION = [
        { title: 'Quadratic Equations', content: 'Introduction to solving quadratic equations.' },
        { title: 'Formula', content: 'x = (-b ± √(b² - 4ac)) / 2a' },
        { title: 'Example 1', content: 'Solve: x² + 5x + 6 = 0\nAnswer: x = -2, x = -3' },
        { title: 'Example 2', content: 'Solve: 2x² - 4x - 6 = 0\nAnswer: x = 3, x = -1' },
        { title: 'Practice', content: 'Try these on your own:\n1) x² - 7x + 12 = 0\n2) 3x² + 2x - 1 = 0' }
      ];

      // ----- Data Storage -----
      let students = [],
        teachers = [],
        admins = [],
        courses = [],
        enrollments = [],
        meetings = [];
      let gradeData = {},
        tasks = [],
        taskSubmissions = {},
        budgetEntries = [];
      let tests = [],
        testSubmissions = {};
      let announcements = [];
      let pendingTeachers = [];
      let enrollRequests = [];
      let courseRequests = [];
      let courseMaterials = [];
      let teacherAuthKeys = [];
      let currentUser = null,
        expandedRows = {},
        currentSlide = 0,
        presentationSlides = [];
      let tempTaskFiles = [],
        gradingTaskId = null,
        gradingStudentId = null;
      let currentMonth = new Date().getMonth(),
        currentYear = new Date().getFullYear();
      let questionCounter = 0;
