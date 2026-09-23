      function updateAdminStats() {
        if (!currentUser || currentUser.role !== 'Admin') return;
        totalStudentsEl.textContent = students.length;
        totalCoursesEl.textContent = courses.length;
        totalEnrollmentsEl.textContent = enrollments.length;
        var totalIncome = budgetEntries.filter(function(b) { return b.type === 'Income'; }).reduce(function(sum, b) { return sum +
            b.amount; }, 0);
        totalRevenueEl.textContent = '$' + totalIncome.toLocaleString();
      }
