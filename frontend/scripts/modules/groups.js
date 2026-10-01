      // ============================================================
      //  COURSE GROUPS
      //
      //  A course is a subject. One teacher often runs the same subject for
      //  several groups at once, and each group is managed on its own: its
      //  own settings, its own students, its own content and its own
      //  semester. Content can be copied into a new group so a teacher does
      //  not rebuild the same material for every group.
      //
      //  A group is stored as a course record that also carries `groupName`.
      //  Everything that already keys off a course id -- enrolments, tasks,
      //  grades, lesson progress -- therefore keeps working unchanged, and a
      //  group is simply a course that has a group name.
      // ============================================================

      var GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      function isGroupCourse(course) {
        return !!(course && String(course.groupName || '').trim());
      }

      // Two records belong to the same subject when they share the subject
      // name and the teacher. Older records predate groups, so they fall back
      // to their own id, which keeps them as a subject of one.
      function courseSubjectKey(course) {
        if (!course) return '';
        var subject = String(course.subjectName || course.name || '').trim();
        return subject + '::' + (course.teacherId === undefined ? '' : course.teacherId);
      }

      // Every course record that belongs to the same subject, including this
      // one. Ordered so the original comes first.
      function courseSubjectFamily(course) {
        if (!course) return [];
        var key = courseSubjectKey(course);
        var family = courses.filter(function(c) {
          return courseSubjectKey(c) === key;
        });
        family.sort(function(a, b) {
          var ga = isGroupCourse(a) ? String(a.groupName) : '';
          var gb = isGroupCourse(b) ? String(b.groupName) : '';
          if (!ga && gb) return -1;
          if (ga && !gb) return 1;
          return ga.localeCompare(gb);
        });
        return family;
      }

      // The first group letter not already taken, so a teacher adding groups
      // in order gets A, B, C without having to name them.
      function nextSuggestedGroupName(course) {
        var taken = {};
        courseSubjectFamily(course).forEach(function(c) {
          if (isGroupCourse(c)) taken[String(c.groupName).trim().toUpperCase()] = true;
        });
        for (var i = 0; i < GROUP_LETTERS.length; i++) {
          var letter = GROUP_LETTERS[i];
          if (!taken[letter]) return letter;
        }
        return '';
      }

      // What to show wherever a course is named. A group reads as
      // "Subject - Group A" so a teacher running three groups can tell them
      // apart at a glance.
      function courseLabel(course) {
        if (!course) return '';
        var subject = String(course.subjectName || course.name || '').trim();
        if (!isGroupCourse(course)) return subject;
        return subject + ' - ' + tr('Group') + ' ' + course.groupName;
      }

      function courseShortLabel(course) {
        if (!course) return '';
        var subject = String(course.subjectName || course.name || '').trim();
        if (!isGroupCourse(course)) return subject;
        return course.groupName ? String(course.groupName) : subject;
      }

      // ---------------------------------------------------------------
      //  Copying course content
      // ---------------------------------------------------------------

      // Modules and lessons are copied with fresh ids. Reusing ids would let
      // lesson progress from one group leak into another, because progress is
      // recorded against a lesson id.
      function copyModulesInto(sourceCourse, targetCourse) {
        if (!Array.isArray(sourceCourse.modules)) return;
        targetCourse.modules = sourceCourse.modules.map(function(mod) {
          var copy = {};
          Object.keys(mod).forEach(function(k) { copy[k] = mod[k]; });
          copy.id = studioNextId('m');
          if (Array.isArray(mod.lessons)) {
            copy.lessons = mod.lessons.map(function(lesson) {
              var l = {};
              Object.keys(lesson).forEach(function(k) { l[k] = lesson[k]; });
              l.id = studioNextId('l');
              return l;
            });
          }
          return copy;
        });
      }

      function copySectionsInto(sourceCourse, targetCourse) {
        if (!Array.isArray(sourceCourse.sections)) return;
        targetCourse.sections = sourceCourse.sections.map(function(sec) {
          var copy = {};
          Object.keys(sec).forEach(function(k) { copy[k] = sec[k]; });
          return copy;
        });
      }

      // Tasks and tests belong to the group they were created in, so they are
      // copied as new records pointed at the new group. Submissions are not
      // copied: those belong to the students of the original group.
      function copyWorkInto(sourceCourse, targetCourse) {
        var newId = studioNextId('w');
        var made = [];
        tasks.filter(function(t) { return t.courseId === sourceCourse.id; }).forEach(function(t) {
          var copy = JSON.parse(JSON.stringify(t));
          copy.id = newId + '-' + made.length;
          copy.courseId = targetCourse.id;
          copy.parentTaskId = t.id;
          copy.createdAt = new Date().toISOString().split('T')[0];
          made.push(copy);
        });
        if (made.length) {
          tasks = tasks.concat(made);
        }
        return made.length;
      }

      // ---------------------------------------------------------------
      //  Creating a group
      // ---------------------------------------------------------------

      // Creates a new group of the same subject. Settings start as copies of
      // the source so a teacher can then change them freely -- each group is
      // independent from that point on. Nothing is shared afterwards.
      function createCourseGroup(sourceCourse, groupName, opts) {
        if (!sourceCourse) return null;
        opts = opts || {};
        var name = String(groupName || '').trim();
        if (!name) return null;

        var group = {
          id: studioNextId('c'),
          name: sourceCourse.name,
          subjectName: String(sourceCourse.subjectName || sourceCourse.name || '').trim(),
          groupName: name,
          parentCourseId: sourceCourse.id,
          teacherId: sourceCourse.teacherId,
          description: sourceCourse.description || '',
          color: sourceCourse.color || '',
          code: '',
          visibility: sourceCourse.visibility || 'private',
          capacity: sourceCourse.capacity || 0,
          passingScore: sourceCourse.passingScore === undefined ? 60 : sourceCourse.passingScore,
          sections: defaultCourseSections(),
          modules: [],
          // A group starts with its own semester clock.
          semesterStart: opts.semesterStart || '',
          semesterDays: opts.semesterDays || SEMESTER_DEFAULT_DAYS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (opts.copyContent !== false) copyModulesInto(sourceCourse, group);
        copySectionsInto(sourceCourse, group);
        var copiedWork = 0;
        if (opts.copyWork) copiedWork = copyWorkInto(sourceCourse, group);

        courses.push(group);
        return { group: group, copiedWork: copiedWork };
      }

      // Copies the content of one group into another that already exists, for
      // the case where a teacher wants to bring them level later.
      function syncCourseContentBetween(sourceCourse, targetCourse, opts) {
        if (!sourceCourse || !targetCourse || sourceCourse.id === targetCourse.id) return 0;
        opts = opts || {};
        copyModulesInto(sourceCourse, targetCourse);
        copySectionsInto(sourceCourse, targetCourse);
        targetCourse.updatedAt = new Date().toISOString();
        return opts.copyWork ? copyWorkInto(sourceCourse, targetCourse) : 0;
      }
