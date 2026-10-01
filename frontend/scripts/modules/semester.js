      // ============================================================
      //  SEMESTER, HOMEWORK GATING AND COURSE OUTCOMES
      //
      //  The rules this file implements:
      //
      //   * Homework is done by the student alone and is required to pass.
      //   * If the homework belonging to a lesson is not finished, the next
      //     lesson's material stays locked.
      //   * Every group runs its own semester. The teacher sets the start and
      //     the length; the length defaults to 90 days.
      //   * If a student has completed no homework at all by the time their
      //     semester ends, the case is flagged. Nothing fails on its own: a
      //     teacher confirms it.
      //   * A pause stops the clock for that student only, so their deadline
      //     moves out by the length of the pause.
      //   * A student may take at most (course length - 3 months). Passing
      //     that limit fails them automatically, with no confirmation.
      //   * Only an administrator can undo a failure.
      //   * Progress is never deleted when a student fails or drops out. It is
      //     cached for 30 days from that date and only then purged.
      //
      //  Every date here is measured against a caller-supplied `now` so the
      //  rules can be tested without waiting for the calendar to move.
      // ============================================================

      var SEMESTER_DEFAULT_DAYS = 90;
      var PROGRESS_RETENTION_DAYS = 30;
      var PAUSE_GRACE_MONTHS = 3;
      var MS_PER_DAY = 24 * 60 * 60 * 1000;

      function semesterDaysFor(group) {
        var n = parseInt(group && group.semesterDays, 10);
        return isNaN(n) || n <= 0 ? SEMESTER_DEFAULT_DAYS : n;
      }

      // How long the whole course may run. The student may not use more of it
      // than the length minus the three month grace.
      function courseDurationDaysFor(group) {
        var n = parseInt(group && group.courseDurationDays, 10);
        return isNaN(n) || n <= 0 ? 365 : n;
      }

      function semesterStartFor(group) {
        if (!group || !group.semesterStart) return null;
        var d = new Date(group.semesterStart);
        return isNaN(d.getTime()) ? null : d;
      }

      function addDays(date, days) {
        return new Date(date.getTime() + days * MS_PER_DAY);
      }

      // The clock runs from the start of the semester, as the teacher set it.
      function groupSemesterEnd(group) {
        var start = semesterStartFor(group);
        if (!start) return null;
        return addDays(start, semesterDaysFor(group));
      }

      // ---------------------------------------------------------------
      //  Pauses
      // ---------------------------------------------------------------

      function studentPauses(studentId, groupId) {
        return pauseRequests.filter(function(p) {
          return p.studentId === studentId && p.courseId === groupId && p.status === 'accepted';
        });
      }

      // Time the student was paused does not count against them. Only an
      // accepted pause counts, and only up to today: a pause that is still
      // running has not yet stopped any days.
      function pausedDaysFor(studentId, groupId, now) {
        var at = now ? new Date(now) : new Date();
        return studentPauses(studentId, groupId).reduce(function(total, p) {
          var from = new Date(p.from || p.decidedAt || p.requestedAt);
          var to = p.to ? new Date(p.to) : at;
          if (isNaN(from.getTime()) || isNaN(to.getTime())) return total;
          var ms = to.getTime() - from.getTime();
          if (ms <= 0) return total;
          return total + Math.floor(ms / MS_PER_DAY);
        }, 0);
      }

      // A student's own deadline: the group deadline pushed out by however
      // long they have been paused.
      function studentSemesterEnd(group, studentId, now) {
        var end = groupSemesterEnd(group);
        if (!end) return null;
        return addDays(end, pausedDaysFor(studentId, group.id, now));
      }

      function studentSemesterDaysLeft(group, studentId, now) {
        var end = studentSemesterEnd(group, studentId, now);
        if (!end) return null;
        var at = now ? new Date(now) : new Date();
        return Math.ceil((end.getTime() - at.getTime()) / MS_PER_DAY);
      }

      // ---------------------------------------------------------------
      //  The automatic limit: course length minus the three month grace.
      // ---------------------------------------------------------------

      function studentActiveDays(group, studentId, now) {
        var start = semesterStartFor(group);
        if (!start) return null;
        var at = now ? new Date(now) : new Date();
        var elapsed = Math.floor((at.getTime() - start.getTime()) / MS_PER_DAY);
        if (elapsed <= 0) return 0;
        return elapsed - pausedDaysFor(studentId, group.id, now);
      }

      function studentActiveDayLimit(group) {
        return courseDurationDaysFor(group) - PAUSE_GRACE_MONTHS * 30;
      }

      function hasPassedActiveLimit(group, studentId, now) {
        var used = studentActiveDays(group, studentId, now);
        if (used === null) return false;
        return used > studentActiveDayLimit(group);
      }

      // ---------------------------------------------------------------
      //  Homework
      // ---------------------------------------------------------------

      function groupHomework(groupId) {
        return tasks.filter(function(t) {
          return t.courseId === groupId && t.type === 'homework';
        });
      }

      function homeworkForLesson(groupId, lessonId) {
        if (!lessonId) return [];
        return groupHomework(groupId).filter(function(t) { return t.lessonId === lessonId; });
      }

      // Attaches homework to the lesson it belongs to, or detaches it. The
      // lesson must belong to the same group, so gating can never reach across
      // groups. Returns the task, or null when the link is not valid.
      function linkHomeworkToLesson(taskId, lessonId) {
        var t = tasks.find(function(x) { return x.id === taskId; });
        if (!t) return null;
        if (!lessonId) {
          if (t.lessonId) delete t.lessonId;
          saveData();
          return t;
        }
        var groupId = taskCourseId(t);
        var inGroup = groupLessonSequence(courses.find(function(c) { return c.id === groupId; }) || {})
          .some(function(l) { return l.id === lessonId; });
        if (!inGroup) return null;
        t.lessonId = lessonId;
        saveData();
        return t;
      }

      function hasHomeworkSubmission(taskId, studentId) {
        return !!taskSubmissions[taskId + '-' + studentId];
      }

      function completedHomeworkCount(groupId, studentId) {
        return groupHomework(groupId).filter(function(t) {
          return hasHomeworkSubmission(t.id, studentId);
        }).length;
      }

      // ---------------------------------------------------------------
      //  Lesson locking
      //
      //  Lessons are gated in reading order across the whole group. A lesson
      //  is locked when the lesson before it still has unfinished homework.
      //  The first lesson is never locked, so a student can always begin.
      // ---------------------------------------------------------------

      function groupLessonSequence(group) {
        var out = [];
        if (!group || !Array.isArray(group.modules)) return out;
        group.modules.forEach(function(mod) {
          if (!Array.isArray(mod.lessons)) return;
          mod.lessons.forEach(function(lesson) {
            out.push(lesson);
          });
        });
        out.sort(function(a, b) {
          return (a.order === undefined ? 0 : a.order) - (b.order === undefined ? 0 : b.order);
        });
        return out;
      }

      // Returns { locked, reason, blockingLessonId, blockingHomework }.
      function lessonLockState(group, lesson, studentId) {
        var seq = groupLessonSequence(group);
        var idx = seq.findIndex(function(l) { return l.id === lesson.id; });
        if (idx <= 0) return { locked: false };

        var previous = seq[idx - 1];
        var pending = homeworkForLesson(group.id, previous.id).filter(function(t) {
          return !hasHomeworkSubmission(t.id, studentId);
        });
        if (!pending.length) return { locked: false };

        return {
          locked: true,
          reason: 'homework',
          blockingLessonId: previous.id,
          blockingLessonTitle: previous.title || '',
          blockingHomework: pending.length,
          blockingHomeworkTitle: pending.length === 1 ? pending[0].title : ''
        };
      }

      // ---------------------------------------------------------------
      //  Outcomes: flagged, failed, restored
      // ---------------------------------------------------------------

      function outcomeFor(studentId, groupId) {
        return homeworkOutcomes.find(function(o) {
          return o.studentId === studentId && o.courseId === groupId;
        }) || null;
      }

      function isGroupFailed(studentId, groupId) {
        var o = outcomeFor(studentId, groupId);
        return !!o && o.status === 'failed';
      }

      function setOutcome(record) {
        var existing = outcomeFor(record.studentId, record.courseId);
        if (existing) {
          Object.keys(record).forEach(function(k) { existing[k] = record[k]; });
          return existing;
        }
        homeworkOutcomes.push(record);
        return record;
      }

      // An outcome that has already been decided is terminal. Without this a
      // flag the teacher chose to close would simply reappear on the next
      // visit, and dismissing it would be impossible.
      var TERMINAL_OUTCOMES = ['failed', 'passed', 'dismissed', 'withdrawn'];

      function isOutcomeTerminal(status) {
        return TERMINAL_OUTCOMES.indexOf(status) !== -1;
      }

      // Runs the two fail rules for one student in one group.
      //   - no homework at all once the semester is over -> flagged, and a
      //     teacher has to confirm it;
      //   - more active days than the course allows -> failed immediately.
      // Returns the outcome if one was created, otherwise null.
      function evaluateStudentOutcome(group, studentId, now) {
        var at = now ? new Date(now) : new Date();
        var existing = outcomeFor(studentId, group.id);
        if (existing && isOutcomeTerminal(existing.status)) return null;
        if (!isStudentEnrolledIn(studentId, group.id)) return null;

        if (hasPassedActiveLimit(group, studentId, at)) {
          return setOutcome({
            id: studioNextId('o'),
            studentId: studentId,
            courseId: group.id,
            status: 'failed',
            reason: 'active-limit',
            flaggedAt: (existing && existing.flaggedAt) || at.toISOString(),
            failedAt: at.toISOString(),
            autoFailed: true,
            confirmedBy: null,
            confirmedAt: at.toISOString(),
            resolvedBy: null,
            resolvedAt: null,
            retainUntil: addDays(at, PROGRESS_RETENTION_DAYS).toISOString()
          });
        }

        var end = studentSemesterEnd(group, studentId, at);
        if (!end || at.getTime() <= end.getTime()) return null;
        if (completedHomeworkCount(group.id, studentId) > 0) return null;

        return setOutcome({
          id: (existing && existing.id) || studioNextId('o'),
          studentId: studentId,
          courseId: group.id,
          status: 'flagged',
          reason: 'no-homework',
          flaggedAt: at.toISOString(),
          failedAt: null,
          autoFailed: false,
          confirmedBy: null,
          confirmedAt: null,
          resolvedBy: null,
          resolvedAt: null,
          retainUntil: null
        });
      }

      function evaluateGroupOutcomes(group, now) {
        var made = [];
        enrolledStudentIds(group.id).forEach(function(studentId) {
          var created = evaluateStudentOutcome(group, studentId, now);
          if (created) made.push(created);
        });
        if (made.length) saveData();
        return made;
      }

      // A teacher turns a flag into a real failure. Progress is then kept for
      // the retention window rather than deleted.
      function confirmOutcomeFailure(outcomeId, teacherId, now) {
        var o = homeworkOutcomes.find(function(x) { return x.id === outcomeId; });
        if (!o || o.status === 'failed') return null;
        var at = now ? new Date(now) : new Date();
        o.status = 'failed';
        o.failedAt = at.toISOString();
        o.confirmedBy = teacherId || null;
        o.confirmedAt = at.toISOString();
        o.retainUntil = addDays(at, PROGRESS_RETENTION_DAYS).toISOString();
        saveData();
        return o;
      }

      // A teacher may also decide the student is fine and leave them enrolled.
      // That is neither a pass nor a failure: the case is closed, and because a
      // closed outcome is terminal the rule will not raise it again.
      function dismissOutcomeFlag(outcomeId, teacherId) {
        var o = homeworkOutcomes.find(function(x) { return x.id === outcomeId; });
        if (!o || o.status !== 'flagged') return null;
        o.status = 'dismissed';
        o.confirmedBy = teacherId || null;
        o.confirmedAt = new Date().toISOString();
        saveData();
        return o;
      }

      // Only an administrator may undo a failure. Teachers can confirm one but
      // cannot clear it.
      function restoreOutcome(outcomeId, adminId, now) {
        if (!currentUser || currentUser.role !== 'Admin') return null;
        var o = homeworkOutcomes.find(function(x) { return x.id === outcomeId; });
        if (!o || o.status !== 'failed') return null;
        var at = now ? new Date(now) : new Date();
        o.status = 'passed';
        o.resolvedBy = adminId || (currentUser && currentUser.id) || null;
        o.resolvedAt = at.toISOString();
        saveData();
        return o;
      }

      // ---------------------------------------------------------------
      //  Progress retention
      //
      //  Failing or dropping out never deletes progress. The record simply
      //  carries a date after which it may be purged, so an accidental fail is
      //  recoverable and a genuine one still eventually tidies up.
      // ---------------------------------------------------------------

      function retentionDeadline(fromDate) {
        return addDays(fromDate, PROGRESS_RETENTION_DAYS).toISOString();
      }

      // Called when a student is removed from a group.
      function startProgressRetention(studentId, groupId, now) {
        var at = now ? new Date(now) : new Date();
        var existing = outcomeFor(studentId, groupId);
        if (existing) {
          existing.retainUntil = retentionDeadline(at);
          existing.status = existing.status === 'failed' ? 'failed' : (existing.status || 'withdrawn');
          saveData();
          return existing;
        }
        return setOutcome({
          id: studioNextId('o'),
          studentId: studentId,
          courseId: groupId,
          status: 'withdrawn',
          reason: 'dropped-out',
          flaggedAt: at.toISOString(),
          failedAt: null,
          autoFailed: false,
          confirmedBy: null,
          confirmedAt: null,
          resolvedBy: null,
          resolvedAt: null,
          retainUntil: retentionDeadline(at)
        });
      }

      function purgeStudentProgress(studentId, groupId) {
        var removed = 0;

        Object.keys(lessonProgress).forEach(function(key) {
          var parts = key.split('::');
          if (parts[0] === String(groupId) && String(parts[2]) === String(studentId)) {
            delete lessonProgress[key];
            removed++;
          }
        });

        groupHomework(groupId).forEach(function(t) {
          var key = t.id + '-' + studentId;
          if (taskSubmissions[key]) { delete taskSubmissions[key]; removed++; }
        });

        var gradeKey = studentId + '-' + groupId;
        if (gradeData[gradeKey] !== undefined) { delete gradeData[gradeKey]; removed++; }

        return removed;
      }

      // Drops anything whose retention window has closed. Anything still
      // inside the window is left completely untouched.
      function purgeExpiredProgress(now) {
        var at = now ? new Date(now) : new Date();
        var purged = 0;
        homeworkOutcomes.slice().forEach(function(o) {
          if (!o.retainUntil) return;
          if (new Date(o.retainUntil).getTime() > at.getTime()) return;
          purged += purgeStudentProgress(o.studentId, o.courseId);
          homeworkOutcomes.splice(homeworkOutcomes.indexOf(o), 1);
        });
        if (purged) saveData();
        return purged;
      }

      // Days left before this student's progress is eligible for purging.
      function retentionDaysLeft(outcome, now) {
        if (!outcome || !outcome.retainUntil) return null;
        var at = now ? new Date(now) : new Date();
        return Math.ceil((new Date(outcome.retainUntil).getTime() - at.getTime()) / MS_PER_DAY);
      }

      // ---------------------------------------------------------------
      //  Pause requests
      // ---------------------------------------------------------------

      function openPauseRequest(studentId, groupId) {
        return pauseRequests.find(function(p) {
          return p.studentId === studentId && p.courseId === groupId &&
            (p.status === 'pending' || p.status === 'accepted');
        }) || null;
      }

      function requestPause(studentId, groupId, from, to, note) {
        if (openPauseRequest(studentId, groupId)) return null;
        var record = {
          id: studioNextId('p'),
          studentId: studentId,
          courseId: groupId,
          from: from || new Date().toISOString().split('T')[0],
          to: to || '',
          note: note || '',
          status: 'pending',
          requestedAt: new Date().toISOString(),
          decidedBy: null,
          decidedAt: null,
          resumedAt: null,
          newGroupId: null
        };
        pauseRequests.push(record);
        saveData();
        return record;
      }

      function decidePause(pauseId, accept, teacherId, now) {
        var p = pauseRequests.find(function(x) { return x.id === pauseId; });
        if (!p || p.status !== 'pending') return null;
        var at = now ? new Date(now) : new Date();
        p.status = accept ? 'accepted' : 'declined';
        p.decidedBy = teacherId || null;
        p.decidedAt = at.toISOString();
        saveData();
        return p;
      }

      // On return the teacher may move the student to whichever group matches
      // the level they stopped at. The pause is closed and the move recorded.
      function resumeFromPause(pauseId, newGroupId, now) {
        var p = pauseRequests.find(function(x) { return x.id === pauseId; });
        if (!p || p.status !== 'accepted') return null;
        var at = now ? new Date(now) : new Date();
        p.to = p.to || at.toISOString().split('T')[0];
        p.status = 'resumed';
        p.resumedAt = at.toISOString();
        if (newGroupId) {
          p.newGroupId = newGroupId;
          enrollments = enrollments.filter(function(e) {
            return !(e.studentId === p.studentId && e.courseId === p.courseId);
          });
          enrollments.push({ studentId: p.studentId, courseId: newGroupId });
          // Progress follows the student so they resume where they stopped.
          moveProgressBetweenGroups(p.studentId, p.courseId, newGroupId);
        }
        saveData();
        return p;
      }

      // Moves lesson progress and homework submissions into the new group,
      // remapping lesson ids through the module map produced when the content
      // was copied.
      function moveProgressBetweenGroups(studentId, fromGroupId, toGroupId) {
        var toGroup = courses.find(function(c) { return c.id === toGroupId; });
        if (!toGroup) return 0;
        var moved = 0;

        var targetLessons = groupLessonSequence(toGroup);
        var byIndex = {};
        targetLessons.forEach(function(l, i) { byIndex[i] = l; });

        var fromLessons = groupLessonSequence(courses.find(function(c) { return c.id === fromGroupId }) || {});
        fromLessons.forEach(function(oldLesson, i) {
          var newLesson = byIndex[i];
          if (!newLesson) return;
          var fromKey = lessonProgressKey(fromGroupId, oldLesson.id, studentId);
          var rec = lessonProgress[fromKey];
          if (!rec) return;
          lessonProgress[lessonProgressKey(toGroupId, newLesson.id, studentId)] = rec;
          delete lessonProgress[fromKey];
          moved++;
        });

        groupHomework(fromGroupId).forEach(function(t, i) {
          var key = t.id + '-' + studentId;
          var sub = taskSubmissions[key];
          if (!sub) return;
          var targets = groupHomework(toGroupId);
          if (!targets[i]) return;
          taskSubmissions[targets[i].id + '-' + studentId] = sub;
          delete taskSubmissions[key];
          moved++;
        });

        return moved;
      }

      // ---------------------------------------------------------------
      //  Helpers that need the enrolment tables
      // ---------------------------------------------------------------

      function isStudentEnrolledIn(studentId, groupId) {
        return enrollments.some(function(e) {
          return e.studentId === studentId && e.courseId === groupId;
        });
      }

      function enrolledStudentIds(groupId) {
        return enrollments.filter(function(e) { return e.courseId === groupId; })
          .map(function(e) { return e.studentId; });
      }
