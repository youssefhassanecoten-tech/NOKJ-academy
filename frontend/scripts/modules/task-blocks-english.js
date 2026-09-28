// ============================================================
//  TASK BLOCKS — English
//
//  Vocabulary lists are stored as plain pairs in props so a teacher
//  can edit everything from the inspector without a vocabulary API.
// ============================================================

      function enPairs(b) {
        var list = Array.isArray(b.props.pairs) ? b.props.pairs : [];
        return list.filter(function(p) { return p && p[0] !== undefined && p[1] !== undefined; });
      }

      // ---------- flashcards ----------
      defineBlock('flashcards', {
        label: 'Flashcards', icon: '🃏', category: 'English',
        fields: [
          { key: 'question', type: 'textarea', label: 'Instruction' },
          { key: 'pairs', type: 'pairs', label: 'Cards' },
          { key: 'shuffle', type: 'bool', label: 'Shuffle start card' }
        ],
        defaults: () => ({
          question: 'Read the front, then flip to check the back.',
          pairs: [['vocabulary', 'useful words'], ['fluent', 'speaking easily'], ['evidence', 'facts that prove a claim']],
          shuffle: false
        }),
        render: (b) => {
          var pairs = enPairs(b);
          if (!pairs.length) return '<div class="tb-placeholder">Add at least one card.</div>';
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-flash" data-tb-flash="' + b.id + '">' +
            '<button type="button" class="tb-flash-face tb-front" data-tb-flip>' +
            '<span class="tb-flash-in"><span class="tb-flash-f">' + esc(pairs[0][0]) + '</span>' +
            '<span class="tb-flash-b">' + esc(pairs[0][1]) + '</span></span></button>' +
            '<div class="tb-flash-nav"><button type="button" data-tb-prev>←</button>' +
            '<span data-tb-count>1 / ' + pairs.length + '</span>' +
            '<button type="button" data-tb-next>→</button></div></div>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var pairs = enPairs(b);
          var face = el.querySelector('[data-tb-flip]');
          var count = el.querySelector('[data-tb-count]');
          var i = 0;
          if (b.props.shuffle && pairs.length > 1) {
            i = Math.floor(Math.random() * pairs.length);
          }
          function paint() {
            face.querySelector('.tb-flash-f').textContent = pairs[i][0];
            face.querySelector('.tb-flash-b').textContent = pairs[i][1];
            count.textContent = (i + 1) + ' / ' + pairs.length;
          }
          paint();
          face.addEventListener('click', function() { face.classList.toggle('flip'); });
          el.querySelector('[data-tb-next]').addEventListener('click', function() {
            i = (i + 1) % pairs.length;
            face.classList.remove('flip');
            paint();
          });
          el.querySelector('[data-tb-prev]').addEventListener('click', function() {
            i = (i - 1 + pairs.length) % pairs.length;
            face.classList.remove('flip');
            paint();
          });
        }
      });

      // ---------- vocabulary matching ----------
      defineBlock('vocabmatch', {
        label: 'Vocab match', icon: '⇄', category: 'English', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'pairs', type: 'pairs', label: 'Word / meaning' }
        ],
        defaults: () => ({
          question: 'Match each word to its meaning.',
          pairs: [['accurate', 'exact and correct'], ['brief', 'short'], ['reluctant', 'unwilling']]
        }),
        render: (b) => {
          var pairs = enPairs(b);
          var rnd = randSeed(pairs.length * 31337);
          var right = pairs.map(function(p) { return p[1]; });
          for (var s = right.length - 1; s > 0; s--) {
            var j = Math.floor(rnd() * (s + 1));
            var t = right[s]; right[s] = right[j]; right[j] = t;
          }
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-vocab">' + pairs.map(function(p, i) {
              return '<div class="tb-vocab-row"><span class="tb-vocab-word">' + esc(p[0]) + '</span>' +
                '<select class="tb-match-sel" data-tb-pair="' + i + '"><option value="">—</option>' +
                right.map(function(r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join('') +
                '</select></div>';
            }).join('') + '</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check matches</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var pairs = enPairs(b);
          var fb = el.querySelector('[data-tb-fb]');
          function verify() {
            var ok = pairs.every(function(p, i) {
              var sel = el.querySelector('[data-tb-pair="' + i + '"]');
              return sel && sel.value === p[1];
            });
            return ok;
          }
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var ok = verify();
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ All matched!' : '✕ Some meanings are wrong.';
          });
        },
        collect: (b, el) => {
          return enPairs(b).map(function(p, i) {
            var sel = el.querySelector('[data-tb-pair="' + i + '"]');
            return sel ? sel.value : null;
          });
        },
        grade: (b, resp) => {
          var pairs = enPairs(b);
          var ok = (resp || []).length === pairs.length && pairs.every(function(p, i) {
            return resp[i] === p[1];
          });
          return { correct: ok };
        }
      });

      // ---------- word builder ----------
      defineBlock('wordbuild', {
        label: 'Word builder', icon: '🔤', category: 'English', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'word', type: 'text', label: 'Target word' },
          { key: 'clue', type: 'text', label: 'Clue' }
        ],
        defaults: () => ({
          question: 'Build the word that matches the clue.',
          word: 'environment', clue: 'The air, water and land around us.'
        }),
        render: (b) => {
          var word = String(b.props.word || '');
          var rnd = randSeed(word.length * 6151);
          var tiles = word.split('');
          for (var s = tiles.length - 1; s > 0; s--) {
            var j = Math.floor(rnd() * (s + 1));
            var t = tiles[s]; tiles[s] = tiles[j]; tiles[j] = t;
          }
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-clue">' + esc(b.props.clue) + '</div>' +
            '<div class="tb-slot" data-tb-slot="' + b.id + '"></div>' +
            '<div class="tb-tiles" data-tb-tiles="' + b.id + '">' + tiles.map(function(t, i) {
              return '<button type="button" class="tb-tile" data-tile="' + i + '">' + esc(t) + '</button>';
            }).join('') + '</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check word</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var slot = el.querySelector('[data-tb-slot]');
          var tiles = el.querySelector('[data-tb-tiles]');
          var fb = el.querySelector('[data-tb-fb]');
          // picked holds the tile indices the student has placed, in order.
          // The slot shows the answer so far; the bank shows what is left.
          var picked = [];

          function current() {
            return picked.map(function(i) {
              return tiles.querySelector('[data-tile="' + i + '"]').textContent;
            }).join('');
          }

          function paint() {
            slot.textContent = '';
            picked.forEach(function(i, pos) {
              var chip = document.createElement('button');
              chip.type = 'button';
              chip.className = 'tb-tile tb-tile-placed';
              chip.textContent = tiles.querySelector('[data-tile="' + i + '"]').textContent;
              chip.title = 'Take it back';
              // Clicking a placed letter returns it to the bank.
              chip.addEventListener('click', function() {
                picked.splice(pos, 1);
                paint();
              });
              slot.appendChild(chip);
            });
            Array.from(tiles.querySelectorAll('.tb-tile')).forEach(function(t) {
              var i = t.getAttribute('data-tile');
              t.classList.toggle('used', picked.indexOf(i) !== -1);
              t.disabled = picked.indexOf(i) !== -1;
            });
          }

          tiles.addEventListener('click', function(e) {
            var t = e.target.closest('.tb-tile');
            if (!t || t.disabled) return;
            var i = t.getAttribute('data-tile');
            if (picked.indexOf(i) !== -1) return;
            picked.push(i);
            paint();
          });

          function ok(a, want) {
            return String(a).trim().toLowerCase() === String(want || '').trim().toLowerCase();
          }

          paint();
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var guess = current();
            fb.className = 'tb-feedback ' + (ok(guess, b.props.word) ? 'ok' : 'bad');
            fb.textContent = ok(guess, b.props.word)
              ? '✓ ' + b.props.word + ' — well done!'
              : '✕ Look at the clue and try again.';
          });
          el.__guess = current;
        },
        collect: (b, el) => el.__guess ? el.__guess() : '',
        grade: (b, resp) => ({
          correct: String(resp || '').trim().toLowerCase() === String(b.props.word || '').trim().toLowerCase()
        })
      });

      // ---------- sentence unscramble ----------
      defineBlock('unscramble', {
        label: 'Sentence builder', icon: '📝', category: 'English', graded: true, defaultPoints: 1,
        fields: [
          { key: 'sentence', type: 'textarea', label: 'Correct sentence' },
          { key: 'scramble', type: 'bool', label: 'Shuffle the words' }
        ],
        defaults: () => ({
          sentence: 'The evidence supported the argument clearly.',
          scramble: true
        }),
        render: (b) => {
          var words = String(b.props.sentence || '').split(/\s+/).filter(Boolean);
          if (words.length < 2) return '<div class="tb-placeholder">Add a sentence of two words or more.</div>';
          var show = words.slice();
          if (b.props.scramble) {
            var rnd = randSeed(words.join('').length * 7919);
            for (var s = show.length - 1; s > 0; s--) {
              var j = Math.floor(rnd() * (s + 1));
              var t = show[s]; show[s] = show[j]; show[j] = t;
            }
            if (show.join(' ') === words.join(' ')) show.reverse();
          }
          return '<div class="tb-q"><div class="tb-q-text">Put the words in the right order.</div>' +
            '<div class="tb-slot tb-slot-sentence" data-tb-slot="' + b.id + '"></div>' +
            '<div class="tb-tiles" data-tb-tiles="' + b.id + '">' + show.map(function(w, i) {
              return '<button type="button" class="tb-tile tb-tile-w" data-tile="' + i + '">' + esc(w) + '</button>';
            }).join('') + '</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check sentence</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var slot = el.querySelector('[data-tb-slot]');
          var tiles = el.querySelector('[data-tb-tiles]');
          var fb = el.querySelector('[data-tb-fb]');
          // picked holds the tile indices the student has placed, in order.
          var picked = [];

          function current() {
            return picked.map(function(i) {
              return tiles.querySelector('[data-tile="' + i + '"]').textContent;
            }).join(' ');
          }

          function paint() {
            slot.textContent = '';
            picked.forEach(function(i, pos) {
              var chip = document.createElement('button');
              chip.type = 'button';
              chip.className = 'tb-tile tb-tile-w tb-tile-placed';
              chip.textContent = tiles.querySelector('[data-tile="' + i + '"]').textContent;
              chip.title = 'Take it back';
              chip.addEventListener('click', function() {
                picked.splice(pos, 1);
                paint();
              });
              slot.appendChild(chip);
            });
            Array.from(tiles.querySelectorAll('.tb-tile')).forEach(function(t) {
              var i = t.getAttribute('data-tile');
              t.classList.toggle('used', picked.indexOf(i) !== -1);
              t.disabled = picked.indexOf(i) !== -1;
            });
          }

          tiles.addEventListener('click', function(e) {
            var t = e.target.closest('.tb-tile');
            if (!t || t.disabled) return;
            var i = t.getAttribute('data-tile');
            if (picked.indexOf(i) !== -1) return;
            picked.push(i);
            paint();
          });

          paint();
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var guess = current();
            var right = guess.trim().toLowerCase() === String(b.props.sentence || '').trim().toLowerCase();
            fb.className = 'tb-feedback ' + (right ? 'ok' : 'bad');
            fb.textContent = right ? '✓ Perfect word order!' : '✕ Read it again and reorder.';
          });
          el.__guess = current;
        },
        collect: (b, el) => el.__guess ? el.__guess() : '',
        grade: (b, resp) => ({
          correct: String(resp || '').trim().toLowerCase() === String(b.props.sentence || '').trim().toLowerCase()
        })
      });

      // ---------- grammar picker ----------
      defineBlock('grammar', {
        label: 'Grammar check', icon: '✓', category: 'English', graded: true, defaultPoints: 1,
        fields: [
          { key: 'sentence', type: 'textarea', label: 'Sentence with an error' },
          { key: 'error', type: 'number', label: 'Wrong word (1-based)', min: 1, max: 30 },
          { key: 'fix', type: 'text', label: 'Correct word' }
        ],
        defaults: () => ({
          sentence: 'She walk to school every morning.',
          error: 2, fix: 'walks'
        }),
        render: (b) => {
          var words = String(b.props.sentence || '').split(/\s+/);
          var err = parseInt(b.props.error, 10) || 0;
          return '<div class="tb-q"><div class="tb-q-text">Find and correct the mistake.</div>' +
            '<div class="tb-grammar-sentence">' + words.map(function(w, i) {
              var bad = (i + 1) === err;
              return '<span class="tb-gw' + (bad ? ' bad' : '') + '" data-tb-gw="' + i + '">' + esc(w) + '</span>';
            }).join(' ') + '</div>' +
            '<div class="tb-q-sub">Replace word ' + (err || '?') + ' with: ' +
            '<input type="text" class="tb-input" data-tb-x="' + b.id + '"/></div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check correction</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelectorAll('[data-tb-gw]').forEach(function(w) {
            w.addEventListener('click', function() {
              w.classList.toggle('pick');
              el.querySelector('[data-tb-x]').value = w.textContent;
            });
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = el.querySelector('[data-tb-x]').value.trim().toLowerCase();
            var ok = v === String(b.props.fix || '').trim().toLowerCase();
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct — ' + esc(b.props.fix) + '.' : '✕ Read the sentence again.';
          });
        },
        collect: (b, el) => el.querySelector('[data-tb-x]').value.trim(),
        grade: (b, resp) => ({
          correct: String(resp || '').trim().toLowerCase() === String(b.props.fix || '').trim().toLowerCase()
        })
      });
