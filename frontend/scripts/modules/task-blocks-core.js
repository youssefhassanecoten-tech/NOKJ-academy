// ============================================================
//  TASK BLOCKS — layout, media and question blocks
// ============================================================
      defineBlock('heading', {
        label: 'Heading', icon: 'H1', category: 'Layout',
        fields: [
          { key: 'text', type: 'text', label: 'Text' },
          { key: 'level', type: 'select', label: 'Level', options: [['h1', 'H1'], ['h2', 'H2'], ['h3', 'H3']] }
        ],
        defaults: () => ({ text: 'Section heading', level: 'h2' }),
        render: (b) => {
          var lv = ['h1', 'h2', 'h3'].indexOf(b.props.level) !== -1 ? b.props.level : 'h2';
          return '<' + lv + '>' + esc(b.props.text) + '</' + lv + '>';
        }
      });

      defineBlock('text', {
        label: 'Text', icon: '¶', category: 'Layout',
        fields: [
          { key: 'text', type: 'textarea', label: 'Text' },
          { key: 'align', type: 'select', label: 'Align', options: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] }
        ],
        defaults: () => ({ text: 'Write your explanation here. **Bold** and *italic* work.', align: 'left' }),
        render: (b) => '<p style="text-align:' + esc(b.props.align || 'left') + '">' + miniMd(b.props.text) + '</p>'
      });

      defineBlock('callout', {
        label: 'Callout', icon: '!', category: 'Layout',
        fields: [
          { key: 'kind', type: 'select', label: 'Style', options: [['info', 'Info'], ['tip', 'Tip'], ['warn', 'Warning'], ['goal', 'Goal']] },
          { key: 'title', type: 'text', label: 'Title' },
          { key: 'text', type: 'textarea', label: 'Text' }
        ],
        defaults: () => ({ kind: 'info', title: 'Remember', text: 'Key point for this lesson.' }),
        render: (b) => {
          var icons = { info: 'ℹ', tip: '💡', warn: '⚠️', goal: '🎯' };
          var k = icons[b.props.kind] ? b.props.kind : 'info';
          return '<div class="tb-callout tb-callout-' + k + '">' +
            '<div class="tb-callout-t">' + icons[k] + ' ' + esc(b.props.title) + '</div>' +
            '<div>' + miniMd(b.props.text) + '</div></div>';
        }
      });

      defineBlock('divider', {
        label: 'Divider', icon: '—', category: 'Layout',
        fields: [{ key: 'space', type: 'number', label: 'Space (px)', min: 0, max: 120 }],
        defaults: () => ({ space: 24 }),
        render: (b) => '<hr style="margin:' + (parseInt(b.props.space, 10) || 24) + 'px 0;"/>'
      });

      defineBlock('image', {
        label: 'Image', icon: '🖼', category: 'Media',
        fields: [
          { key: 'src', type: 'text', label: 'Image URL' },
          { key: 'alt', type: 'text', label: 'Alt text' },
          { key: 'caption', type: 'text', label: 'Caption' },
          { key: 'width', type: 'select', label: 'Width', options: [['100', 'Full'], ['70', '70%'], ['50', '50%'], ['33', '33%']] }
        ],
        defaults: () => ({ src: '', alt: '', caption: '', width: '100' }),
        render: (b) => {
          if (!b.props.src) return '<div class="tb-placeholder">🖼 Image — set a URL in the inspector</div>';
          var w = ['100', '70', '50', '33'].indexOf(String(b.props.width)) !== -1 ? b.props.width : '100';
          return '<figure class="tb-figure"><img src="' + esc(b.props.src) + '" alt="' + esc(b.props.alt) +
            '" style="width:' + w + '%"/>' +
            (b.props.caption ? '<figcaption>' + esc(b.props.caption) + '</figcaption>' : '') + '</figure>';
        }
      });

      defineBlock('video', {
        label: 'Video', icon: '▶', category: 'Media',
        fields: [
          { key: 'src', type: 'text', label: 'Video or embed URL' },
          { key: 'caption', type: 'text', label: 'Caption' }
        ],
        defaults: () => ({ src: '', caption: '' }),
        render: (b) => {
          if (!b.props.src) return '<div class="tb-placeholder">▶ Video — set a URL in the inspector</div>';
          return '<figure class="tb-figure"><div class="tb-video">' +
            '<iframe src="' + esc(b.props.src) + '" title="' + esc(b.props.caption || 'video') +
            '" allowfullscreen loading="lazy"></iframe></div>' +
            (b.props.caption ? '<figcaption>' + esc(b.props.caption) + '</figcaption>' : '') + '</figure>';
        }
      });

      defineBlock('keyvalue', {
        label: 'Key facts', icon: '≡', category: 'Layout',
        fields: [
          { key: 'rows', type: 'rows', label: 'Rows' }
        ],
        defaults: () => ({ rows: [['Term', 'Definition'], ['Plate boundary', 'Where two plates meet']] }),
        render: (b) => {
          var rows = Array.isArray(b.props.rows) ? b.props.rows : [];
          if (!rows.length) return '<div class="tb-placeholder">No rows yet.</div>';
          return '<table class="tb-kv"><tbody>' + rows.map(function(r) {
            return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
          }).join('') + '</tbody></table>';
        }
      });

      // ---------- graded questions ----------
      defineBlock('mcq', {
        label: 'Multiple choice', icon: '☑', category: 'Question', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'options', type: 'options', label: 'Options' },
          { key: 'correct', type: 'number', label: 'Correct option (0-based)', min: 0, max: 9 },
          { key: 'explain', type: 'textarea', label: 'Explanation' }
        ],
        defaults: () => ({
          question: 'Which option is correct?',
          options: ['First option', 'Second option', 'Third option'],
          correct: 0, explain: ''
        }),
        render: (b) => {
          var opts = Array.isArray(b.props.options) ? b.props.options : [];
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-opts">' + opts.map(function(o, i) {
              return '<label class="tb-opt"><input type="radio" name="tb-' + b.id + '" value="' + i + '"/> ' +
                esc(o) + '</label>';
            }).join('') + '</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el, ctx) => {
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var picked = el.querySelector('input:checked');
            if (!picked) { fb.textContent = 'Choose an answer first.'; fb.className = 'tb-feedback'; return; }
            var ok = parseInt(picked.value, 10) === (parseInt(b.props.correct, 10) || 0);
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Not quite. ' + (b.props.explain || '');
          });
        },
        collect: (b, el) => {
          var p = el.querySelector('input:checked');
          return p ? parseInt(p.value, 10) : null;
        },
        grade: (b, resp) => ({ correct: resp !== null && resp === (parseInt(b.props.correct, 10) || 0) })
      });

      defineBlock('shorttext', {
        label: 'Short answer', icon: '⌨', category: 'Question', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'answers', type: 'options', label: 'Accepted answers (one per line)' },
          { key: 'caseSensitive', type: 'bool', label: 'Case sensitive' }
        ],
        defaults: () => ({ question: 'Type your answer', answers: ['answer'], caseSensitive: false }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<input type="text" class="tb-input" placeholder="Your answer..."/>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = el.querySelector('.tb-input').value.trim();
            var acc = (Array.isArray(b.props.answers) ? b.props.answers : []).map(function(a) {
              return String(a).trim();
            }).filter(Boolean);
            var ok = acc.some(function(a) {
              return b.props.caseSensitive ? v === a : v.toLowerCase() === a.toLowerCase();
            });
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Not yet. Accepted: ' + acc.join(' / ');
          });
        },
        collect: (b, el) => el.querySelector('.tb-input').value.trim(),
        grade: (b, resp) => {
          var v = String(resp || '').trim();
          var acc = (Array.isArray(b.props.answers) ? b.props.answers : []).map(function(a) {
            return String(a).trim();
          }).filter(Boolean);
          var ok = !!v && acc.some(function(a) {
            return b.props.caseSensitive ? v === a : v.toLowerCase() === a.toLowerCase();
          });
          return { correct: ok };
        }
      });

      defineBlock('multi', {
        label: 'Multiple answers', icon: '☐', category: 'Question', graded: true, defaultPoints: 2,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'options', type: 'options', label: 'Options' },
          { key: 'correct', type: 'multi', label: 'Correct options' }
        ],
        defaults: () => ({ question: 'Select every correct answer', options: ['A', 'B', 'C'], correct: [0] }),
        render: (b) => {
          var opts = Array.isArray(b.props.options) ? b.props.options : [];
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-opts">' + opts.map(function(o, i) {
              return '<label class="tb-opt"><input type="checkbox" name="tbm-' + b.id + '" value="' + i + '"/> ' +
                esc(o) + '</label>';
            }).join('') + '</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var picked = Array.from(el.querySelectorAll('input:checked')).map(function(i) {
              return parseInt(i.value, 10);
            }).sort();
            var want = (Array.isArray(b.props.correct) ? b.props.correct : []).slice().sort();
            var ok = picked.length === want.length && picked.every(function(v, i) { return v === want[i]; });
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Not quite.';
          });
        },
        collect: (b, el) => Array.from(el.querySelectorAll('input:checked')).map(function(i) {
          return parseInt(i.value, 10);
        }).sort(),
        grade: (b, resp) => {
          var picked = (resp || []).slice().sort();
          var want = (Array.isArray(b.props.correct) ? b.props.correct : []).slice().sort();
          return { correct: picked.length === want.length && picked.every(function(v, i) { return v === want[i]; }) };
        }
      });

      defineBlock('order', {
        label: 'Ordering', icon: '↕', category: 'Question', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'items', type: 'options', label: 'Items in correct order' }
        ],
        defaults: () => ({ question: 'Put the stages in order', items: ['First', 'Second', 'Third'] }),
        render: (b) => {
          var items = (Array.isArray(b.props.items) ? b.props.items : []).slice();
          var shuffled = items.slice();
          // Deterministic shuffle so teacher and student see the same order.
          var rnd = randSeed(b.id.length * 7919);
          for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
          }
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<ol class="tb-order" data-tb-order="' + b.id + '">' + shuffled.map(function(s) {
              return '<li class="tb-order-item">' + esc(s) + '</li>';
            }).join('') + '</ol>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check order</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var list = el.querySelector('[data-tb-order]');
          var fb = el.querySelector('[data-tb-fb]');
          // Click to move an item up; click again to move it down.
          list.addEventListener('click', function(e) {
            var li = e.target.closest('.tb-order-item');
            if (!li) return;
            if (li.dataset.dir === 'down' && li.nextElementSibling) {
              li.parentNode.insertBefore(li.nextElementSibling, li);
            } else {
              if (li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
            }
            li.dataset.dir = li.dataset.dir === 'down' ? 'up' : 'down';
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var now = Array.from(list.querySelectorAll('.tb-order-item')).map(function(li) {
              return li.textContent.trim();
            });
            var want = (Array.isArray(b.props.items) ? b.props.items : []).map(function(s) {
              return String(s).trim();
            });
            var ok = now.length === want.length && now.every(function(v, i) { return v === want[i]; });
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct order!' : '✕ Keep trying — click an item to move it.';
          });
        },
        collect: (b, el) => Array.from(el.querySelectorAll('.tb-order-item')).map(function(li) {
          return li.textContent.trim();
        }),
        grade: (b, resp) => {
          var now = (resp || []).map(function(s) { return String(s).trim(); });
          var want = (Array.isArray(b.props.items) ? b.props.items : []).map(function(s) { return String(s).trim(); });
          return { correct: now.length === want.length && now.every(function(v, i) { return v === want[i]; }) };
        }
      });

      defineBlock('match', {
        label: 'Matching pairs', icon: '⇄', category: 'Question', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'pairs', type: 'pairs', label: 'Pairs' }
        ],
        defaults: () => ({ question: 'Match each term to its meaning', pairs: [['Water', 'H2O'], ['Salt', 'NaCl']] }),
        render: (b) => {
          var pairs = Array.isArray(b.props.pairs) ? b.props.pairs : [];
          var right = pairs.map(function(p) { return p[1]; });
          var rnd = randSeed(pairs.length * 104729);
          var shuffled = right.slice();
          for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
          }
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-match">' +
            '<div class="tb-match-col">' + pairs.map(function(p, i) {
              return '<select class="tb-match-sel" data-tb-pair="' + i + '"><option value="">—</option>' +
                shuffled.map(function(s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('') +
                '</select><div class="tb-match-left">' + esc(p[0]) + '</div>';
            }).join('') + '</div>' +
            '</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check matches</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var pairs = Array.isArray(b.props.pairs) ? b.props.pairs : [];
            var ok = pairs.every(function(p, i) {
              var sel = el.querySelector('[data-tb-pair="' + i + '"]');
              return sel && sel.value === p[1];
            });
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ All matched!' : '✕ Some pairs are wrong.';
          });
        },
        collect: (b, el) => {
          var pairs = Array.isArray(b.props.pairs) ? b.props.pairs : [];
          return pairs.map(function(p, i) {
            var sel = el.querySelector('[data-tb-pair="' + i + '"]');
            return sel ? sel.value : null;
          });
        },
        grade: (b, resp) => {
          var pairs = Array.isArray(b.props.pairs) ? b.props.pairs : [];
          var ok = (resp || []).length === pairs.length && pairs.every(function(p, i) {
            return resp[i] === p[1];
          });
          return { correct: ok };
        }
      });

      defineBlock('spot', {
        label: 'Hotspot', icon: '🎯', category: 'Question', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'image', type: 'text', label: 'Background image URL' },
          { key: 'hotspots', type: 'hotspots', label: 'Hotspots' }
        ],
        defaults: () => ({ question: 'Click the right spot', image: '', hotspots: [] }),
        render: (b) => {
          var spots = Array.isArray(b.props.hotspots) ? b.props.hotspots : [];
          var h = b.props.image
            ? '<img src="' + esc(b.props.image) + '" alt="" class="tb-spot-img"/>'
            : '<div class="tb-spot-bg">background image</div>';
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-spot" data-tb-spot="' + b.id + '">' + h +
            spots.map(function(s, i) {
              return '<button type="button" class="tb-hot" data-spot="' + i + '" style="left:' +
                (s.x || 50) + '%;top:' + (s.y || 50) + '%" title="' + esc(s.label || 'spot') + '"></button>';
            }).join('') + '</div>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('.tb-spot').addEventListener('click', function(e) {
            var btn = e.target.closest('.tb-hot');
            if (!btn) return;
            var spots = Array.isArray(b.props.hotspots) ? b.props.hotspots : [];
            var s = spots[parseInt(btn.getAttribute('data-spot'), 10)];
            var ok = s && s.correct;
            btn.classList.add(ok ? 'ok' : 'bad');
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ ' + (s.label || 'Correct!') : '✕ Try another spot.';
          });
        },
        collect: (b, el) => {
          var hit = el.querySelector('.tb-hot.ok, .tb-hot.bad');
          if (!hit) return null;
          var spots = Array.isArray(b.props.hotspots) ? b.props.hotspots : [];
          return spots[parseInt(hit.getAttribute('data-spot'), 10)] || null;
        },
        grade: (b, resp) => ({ correct: !!(resp && resp.correct) })
      });
