// ============================================================
      //  ANNOUNCEMENTS
      // ============================================================
      function renderAnnouncements() {
        var list = document.getElementById('announcement-list');
        if (!list) return;

        var isAdmin = currentUser && currentUser.role === 'Admin';

        var addRow = document.getElementById('announcement-add-row');
        if (addRow) {
          addRow.style.display = isAdmin ? 'block' : 'none';
          if (isAdmin) {
            addRow.innerHTML = '<button class="primary-button" id="add-announcement-btn">+ Add Announcement</button>';
            var addBtn = document.getElementById('add-announcement-btn');
            if (addBtn && !addBtn._bound) {
              addBtn._bound = true;
              addBtn.addEventListener('click', function() { openModal('announcement', 'add'); });
            }
          } else {
            addRow.innerHTML = '';
          }
        }

        if (!announcements.length) {
          list.innerHTML = '<p style="color:var(--muted);padding:24px 0;text-align:center;">No announcements.</p>';
          setLanguage(currentLang);
          return;
        }

        var html = '';
        announcements.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).forEach(function(
        a) {
          var icon = ['📌', '📚', '🏆', '📢', '✏️', '🎓'][(a.id % 6)];
          var postedDate = a.date ? unixToTitle(a.date) : '';
          var actions = '';
          if (isAdmin) {
            actions = '<div class="announcement-actions">' +
              '<button class="secondary-button" onclick="openModal(\'announcement\', \'edit\', { id: ' + a.id +
              ' })">Edit</button>' +
              '<button class="danger-button" onclick="deleteEntry(\'announcement\', ' + a.id + ')">Delete</button></div>';
          }
          html += '<article class="announcement-card" data-id="' + a.id + '" role="button" tabindex="0">' +
            '<span class="round-icon">' + icon + '</span>' +
            '<div class="row-main"><h3>' + a.title + '</h3>' +
            (a.subtitle ? '<h4>' + a.subtitle + '</h4>' : '') +
            '<p>' + announcementSnippet(a) + '</p>' +
            '<p><strong>' + tr('Posted') + ' ' + postedDate + '</strong>' + (a.author ? ' · ' + a.author : '') +
            '</p></div>' +
            '<span class="read-more">' + tr('Read more') + ' ›</span>' +
            actions + '</article>';
        });
        list.innerHTML = html;
        setLanguage(currentLang);
      }

      function openAnnouncementDetail(id) {
        var a = announcements.find(function(x) { return x.id === id; });
        if (!a) return;
        document.getElementById('ann-detail-title').textContent = a.title;
        document.getElementById('ann-detail-subtitle').textContent = a.subtitle || (a.author ? a.author +
          (a.date ? ' · ' + unixToTitle(a.date) : '') : '');
        if (!a.subtitle) document.getElementById('ann-detail-subtitle').style.display = 'none';
        else document.getElementById('ann-detail-subtitle').style.display = '';
        document.getElementById('ann-detail-content').textContent = announcementText(a);
        var meta = '';
        if (a.author) meta += a.author;
        if (a.date) meta += (meta ? ' · ' : '') + unixToTitle(a.date);
        document.getElementById('ann-detail-meta').textContent = meta;
        document.getElementById('ann-detail-overlay').classList.add('open');
        setLanguage(currentLang);
      }

      function unixToTitle(v) {
        var d = new Date(v);
        if (isNaN(d.getTime())) return v;
        return d.toLocaleDateString();
      }