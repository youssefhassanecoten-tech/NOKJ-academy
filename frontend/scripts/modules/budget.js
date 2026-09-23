      function renderBudget() {
        var search = document.getElementById('budget-search').value.toLowerCase();
        var filter = document.getElementById('budget-filter').value;
        var filtered = budgetEntries.filter(function(b) {
          return b.category.toLowerCase().includes(search) && (filter === 'all' || b.type === filter);
        });
        filtered.sort(function(a, b) { return b.date.localeCompare(a.date); });
        document.getElementById('budget-table-body').innerHTML = '';
        filtered.forEach(function(b) {
          var isIncome = b.type === 'Income';
          var amountDisplay = isIncome ? '+' + b.amount : '-' + Math.abs(b.amount);
          var amountClass = isIncome ? 'income' : 'expense';
          var tr = document.createElement('tr');
          tr.innerHTML = '<td><strong>' + b.category + '</strong></td><td>' + b.type + '</td><td class="' + amountClass +
            '" style="font-weight:700;">$' + amountDisplay + '</td><td>' + b.date + '</td><td><span class="status-badge ' +
            b.status.toLowerCase() + '">' + b.status + '</span></td><td><button class="action-btn edit" data-id="' + b.id +
            '" data-type="budget">✏️</button><button class="action-btn delete" data-id="' + b.id +
            '" data-type="budget">🗑️</button></td>';
          document.getElementById('budget-table-body').appendChild(tr);
        });
        var total = budgetEntries.length;
        document.getElementById('budget-count').textContent = filtered.length + ' entries';
        var totalIncome = budgetEntries.filter(function(b) { return b.type === 'Income'; }).reduce(function(sum, b) { return sum +
            b.amount; }, 0);
        var totalExpense = budgetEntries.filter(function(b) { return b.type === 'Expense'; }).reduce(function(sum, b) { return sum +
            Math.abs(b.amount); }, 0);
        document.getElementById('budget-total-income').textContent = '$' + totalIncome.toLocaleString();
        document.getElementById('budget-total-expense').textContent = '$' + totalExpense.toLocaleString();
        document.getElementById('budget-net').textContent = '$' + (totalIncome - totalExpense).toLocaleString();
        document.getElementById('budget-net').style.color = (totalIncome - totalExpense) >= 0 ? 'var(--success)' :
          'var(--danger)';
        updateAdminStats();
        setLanguage(currentLang);
      }
