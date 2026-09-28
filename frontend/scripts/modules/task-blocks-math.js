// ============================================================
//  TASK BLOCKS — mathematics
//
//  Every visual is drawn on canvas or plain DOM, so nothing here
//  needs a library. Values the student should reach are recomputed
//  from props at grade time instead of being trusted from the DOM.
// ============================================================

      // Numeric compare with a tolerance, because 4.999 is not 5.
      function numClose(a, b, tol) {
        var x = parseFloat(a), y = parseFloat(b);
        if (isNaN(x) || isNaN(y)) return false;
        return Math.abs(x - y) <= (tol === undefined ? 0.01 : tol);
      }

      // ---------- animated equation stepper ----------
      defineBlock('equation', {
        label: 'Equation steps', icon: '∑', category: 'Maths', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'equation', type: 'text', label: 'Equation' },
          { key: 'steps', type: 'options', label: 'Steps (one per line)' },
          { key: 'answer', type: 'number', label: 'Answer for x' },
          { key: 'tol', type: 'number', label: 'Tolerance', min: 0, max: 5 }
        ],
        defaults: () => ({
          question: 'Solve for x, one step at a time.',
          equation: '3x + 5 = 20',
          steps: ['Subtract 5 from both sides: 3x = 15', 'Divide both sides by 3: x = 5'],
          answer: 5, tol: 0.01
        }),
        render: (b) => {
          var steps = Array.isArray(b.props.steps) ? b.props.steps : [];
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-eq" data-tb-eq="' + b.id + '">' + esc(b.props.equation) + '</div>' +
            '<ol class="tb-steps" data-tb-steps="' + b.id + '"></ol>' +
            '<button type="button" class="tb-next" data-tb-next="' + b.id + '">Show next step</button>' +
            '<div class="tb-q-sub">x = <input type="text" class="tb-input tb-num" data-tb-x="' + b.id + '"/></div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var steps = Array.isArray(b.props.steps) ? b.props.steps : [];
          var list = el.querySelector('[data-tb-steps]');
          var next = el.querySelector('[data-tb-next]');
          var fb = el.querySelector('[data-tb-fb]');
          var shown = 0;
          next.addEventListener('click', function() {
            if (shown >= steps.length) {
              next.disabled = true;
              return;
            }
            var li = document.createElement('li');
            li.className = 'tb-step-new';
            li.textContent = steps[shown++];
            list.appendChild(li);
            // Let the browser paint the class before the transition starts.
            requestAnimationFrame(function() { li.classList.remove('tb-step-new'); });
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = el.querySelector('[data-tb-x]').value.trim();
            var ok = numClose(v, b.props.answer, parseFloat(b.props.tol) || 0.01);
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Not yet — ' + steps.join(' → ');
          });
        },
        collect: (b, el) => el.querySelector('[data-tb-x]').value.trim(),
        grade: (b, resp) => ({ correct: numClose(resp, b.props.answer, parseFloat(b.props.tol) || 0.01) })
      });

      // ---------- fraction bars ----------
      defineBlock('fraction', {
        label: 'Fraction bars', icon: '▤', category: 'Maths', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'aNum', type: 'number', label: 'First numerator', min: 1, max: 12 },
          { key: 'aDen', type: 'number', label: 'First denominator', min: 1, max: 12 },
          { key: 'bNum', type: 'number', label: 'Second numerator', min: 1, max: 12 },
          { key: 'bDen', type: 'number', label: 'Second denominator', min: 1, max: 12 }
        ],
        defaults: () => ({
          question: 'Which fraction is larger? Use the bars, then answer 1 or 2.',
          aNum: 3, aDen: 4, bNum: 5, bDen: 8
        }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<div class="tb-fracs">' +
          '<div class="tb-frac"><div class="tb-frac-n">' + esc(b.props.aNum) + '</div>' +
          '<div class="tb-frac-bar" data-tb-bar="a" data-n="' + esc(b.props.aNum) + '" data-d="' + esc(b.props.aDen) + '"></div>' +
          '<div class="tb-frac-d">' + esc(b.props.aDen) + '</div></div>' +
          '<div class="tb-frac"><div class="tb-frac-n">' + esc(b.props.bNum) + '</div>' +
          '<div class="tb-frac-bar" data-tb-bar="b" data-n="' + esc(b.props.bNum) + '" data-d="' + esc(b.props.bDen) + '"></div>' +
          '<div class="tb-frac-d">' + esc(b.props.bDen) + '</div></div></div>' +
          '<div class="tb-q-sub">The larger fraction is number ' +
          '<input type="text" class="tb-input tb-num" data-tb-x="' + b.id + '" maxlength="1"/></div>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          el.querySelectorAll('[data-tb-bar]').forEach(function(bar) {
            var n = parseInt(bar.getAttribute('data-n'), 10) || 1;
            var d = parseInt(bar.getAttribute('data-d'), 10) || 1;
            var fill = document.createElement('div');
            fill.className = 'tb-frac-fill';
            fill.style.width = '0%';
            bar.appendChild(fill);
            requestAnimationFrame(function() {
              requestAnimationFrame(function() { fill.style.width = (n / d * 100) + '%'; });
            });
          });
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = parseInt(el.querySelector('[data-tb-x]').value.trim(), 10);
            var a = (parseInt(b.props.aNum, 10) || 0) / (parseInt(b.props.aDen, 10) || 1);
            var bb = (parseInt(b.props.bNum, 10) || 0) / (parseInt(b.props.bDen, 10) || 1);
            var want = a === bb ? 0 : (a > bb ? 1 : 2);
            var ok = v === want;
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!'
              : '✕ ' + (want === 0 ? 'They are equal.' : (want === 1 ? 'Fraction 1' : 'Fraction 2') + ' is larger.');
          });
        },
        collect: (b, el) => el.querySelector('[data-tb-x]').value.trim(),
        grade: (b, resp) => {
          var a = (parseInt(b.props.aNum, 10) || 0) / (parseInt(b.props.aDen, 10) || 1);
          var bb = (parseInt(b.props.bNum, 10) || 0) / (parseInt(b.props.bDen, 10) || 1);
          var want = a === bb ? 0 : (a > bb ? 1 : 2);
          return { correct: parseInt(resp, 10) === want };
        }
      });

      // ---------- number line ----------
      defineBlock('numberline', {
        label: 'Number line', icon: '↔', category: 'Maths', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'min', type: 'number', label: 'Minimum', min: -100, max: 100 },
          { key: 'max', type: 'number', label: 'Maximum', min: -100, max: 100 },
          { key: 'target', type: 'number', label: 'Target value' },
          { key: 'tol', type: 'number', label: 'Tolerance', min: 0, max: 10 }
        ],
        defaults: () => ({
          question: 'Mark −2.5 on the number line.',
          min: -10, max: 10, target: -2.5, tol: 0.25
        }),
        render: (b) => {
          var min = parseFloat(b.props.min), max = parseFloat(b.props.max);
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-line" data-tb-line="' + b.id + '" data-min="' + min + '" data-max="' + max + '">' +
            '<div class="tb-line-rail"></div><div class="tb-line-mark" data-tb-mark></div></div>' +
            '<div class="tb-line-ticks" data-tb-ticks="' + b.id + '"></div>' +
            '<div class="tb-readout" data-tb-read="' + b.id + '">Click the line to mark a value.</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var min = parseFloat(b.props.min), max = parseFloat(b.props.max);
          var box = el.querySelector('[data-tb-line]');
          var mark = el.querySelector('[data-tb-mark]');
          var ticks = el.querySelector('[data-tb-ticks]');
          var read = el.querySelector('[data-tb-read]');
          var fb = el.querySelector('[data-tb-fb]');
          var picked = null;
          // Whole numbers across the range, so the line stays readable.
          for (var v = min; v <= max; v += (max - min) / 10) {
            var t = document.createElement('span');
            t.className = 'tb-tick';
            t.style.left = ((v - min) / (max - min) * 100) + '%';
            t.textContent = Math.round(v);
            ticks.appendChild(t);
          }
          box.addEventListener('click', function(e) {
            var r = box.getBoundingClientRect();
            var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            picked = min + p * (max - min);
            mark.style.left = (p * 100) + '%';
            read.textContent = 'Marked value: ' + (Math.round(picked * 100) / 100);
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            if (picked === null) { fb.className = 'tb-feedback'; fb.textContent = 'Mark a value first.'; return; }
            var ok = numClose(picked, b.props.target, parseFloat(b.props.tol) || 0.25);
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Look at the ticks and try again.';
          });
          el.__picked = function() { return picked; };
        },
        collect: (b, el) => el.__picked ? el.__picked() : null,
        grade: (b, resp) => ({ correct: resp !== null && numClose(resp, b.props.target, parseFloat(b.props.tol) || 0.25) })
      });

      // ---------- function plot ----------
      // y = ax + b, or y = ax² + bx + c. The question is recomputed
      // from props so the mark can never drift from the sliders.
      function plotValue(b, x) {
        var a = parseFloat(b.props.a) || 0;
        var bb = parseFloat(b.props.b) || 0;
        var c = parseFloat(b.props.c) || 0;
        return b.props.kind === 'quadratic'
          ? a * x * x + bb * x + c
          : a * x + bb;
      }
      function plotAnswer(b) {
        var x = parseFloat(b.props.at) || 0;
        var a = parseFloat(b.props.a) || 0;
        var bb = parseFloat(b.props.b) || 0;
        var c = parseFloat(b.props.c) || 0;
        if (b.props.ask === 'gradient') {
          return b.props.kind === 'quadratic' ? 2 * a * x + bb : a;
        }
        if (b.props.ask === 'yint') return b.props.kind === 'quadratic' ? c : bb;
        return plotValue(b, x);
      }

      defineBlock('funcplot', {
        label: 'Function plot', icon: '📈', category: 'Maths', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'kind', type: 'select', label: 'Type', options: [['linear', 'Straight line'], ['quadratic', 'Parabola']] },
          { key: 'ask', type: 'select', label: 'Ask for', options: [['gradient', 'Gradient'], ['yint', 'y-intercept'], ['value', 'Value at x']] },
          { key: 'at', type: 'number', label: 'x value', min: -10, max: 10 },
          { key: 'a', type: 'number', label: 'a', min: -6, max: 6 },
          { key: 'b', type: 'number', label: 'b', min: -6, max: 6 },
          { key: 'c', type: 'number', label: 'c', min: -6, max: 6 },
          { key: 'hide', type: 'bool', label: 'Hide the coefficients' }
        ],
        defaults: () => ({
          question: 'Move the sliders. What is the gradient of this line?',
          kind: 'linear', ask: 'gradient', at: 0, a: 2, b: 1, c: 0, hide: true
        }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<canvas class="tb-plot" width="520" height="300" data-tb-plot="' + b.id + '"></canvas>' +
          '<div class="tb-mesh-ctrl">' +
          '<label>a <input type="range" min="-6" max="6" step="0.5" value="' + esc(b.props.a) + '" data-tb-a/></label>' +
          '<label>b <input type="range" min="-6" max="6" step="0.5" value="' + esc(b.props.b) + '" data-tb-b/></label>' +
          (b.props.kind === 'quadratic'
            ? '<label>c <input type="range" min="-6" max="6" step="0.5" value="' + esc(b.props.c) + '" data-tb-c/></label>'
            : '') +
          '</div>' +
          '<div class="tb-readout" data-tb-read="' + b.id + '"></div>' +
          '<div class="tb-q-sub">Answer: <input type="text" class="tb-input tb-num" data-tb-x="' + b.id + '"/></div>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          var canvas = el.querySelector('[data-tb-plot]');
          var ctx = canvas.getContext('2d');
          var read = el.querySelector('[data-tb-read]');
          var live = { a: parseFloat(b.props.a) || 0, b: parseFloat(b.props.b) || 0, c: parseFloat(b.props.c) || 0 };
          var X0 = -6, X1 = 6, Y0 = -8, Y1 = 8;
          function px(x) { return (x - X0) / (X1 - X0) * canvas.width; }
          function py(y) { return canvas.height - (y - Y0) / (Y1 - Y0) * canvas.height; }
          function paint() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            for (var gx = X0; gx <= X1; gx++) {
              ctx.beginPath(); ctx.moveTo(px(gx), 0); ctx.lineTo(px(gx), canvas.height); ctx.stroke();
            }
            for (var gy = Y0; gy <= Y1; gy++) {
              ctx.beginPath(); ctx.moveTo(0, py(gy)); ctx.lineTo(canvas.width, py(gy)); ctx.stroke();
            }
            ctx.strokeStyle = '#94a3b8';
            ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(canvas.width, py(0)); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), canvas.height); ctx.stroke();
            ctx.strokeStyle = b.props.kind === 'quadratic' ? '#7c3aed' : '#0d9488';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            var started = false;
            for (var t = X0; t <= X1 + 0.01; t += 0.05) {
              var y = plotValue({
                props: { kind: b.props.kind, a: live.a, b: live.b, c: live.c }
              }, t);
              if (y < Y0 - 20 || y > Y1 + 20) { started = false; continue; }
              if (!started) { ctx.moveTo(px(t), py(y)); started = true; }
              else ctx.lineTo(px(t), py(y));
            }
            ctx.stroke();
            read.textContent = b.props.hide
              ? 'y = ' + b.props.kind + ' function · ' + b.props.ask
              : 'y = ' + live.a + (b.props.kind === 'quadratic' ? 'x² + ' + live.b + 'x + ' + live.c
                : 'x + ' + live.b);
          }
          function bind(sel, key) {
            var input = el.querySelector(sel);
            if (!input) return;
            input.addEventListener('input', function() {
              live[key] = parseFloat(input.value) || 0;
              paint();
            });
          }
          bind('[data-tb-a]', 'a');
          bind('[data-tb-b]', 'b');
          bind('[data-tb-c]', 'c');
          paint();
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = el.querySelector('[data-tb-x]').value.trim();
            var want = plotAnswer(b);
            var ok = numClose(v, want, 0.05);
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Work it out from the graph.';
          });
        },
        collect: (b, el) => el.querySelector('[data-tb-x]').value.trim(),
        grade: (b, resp) => ({ correct: numClose(resp, plotAnswer(b), 0.05) })
      });

      // ---------- shape maths ----------
      function shapeAnswer(b) {
        var a = parseFloat(b.props.a) || 0, bb = parseFloat(b.props.b) || 0, c = parseFloat(b.props.c) || 0;
        var r = a / 2;
        switch (b.props.shape) {
          case 'rect': return b.props.ask === 'area' ? a * bb : 2 * (a + bb);
          case 'tri': return b.props.ask === 'area' ? a * bb / 2 : a + bb + Math.sqrt(a * a + bb * bb);
          case 'circle': return b.props.ask === 'area' ? Math.PI * r * r : 2 * Math.PI * r;
          case 'cube': return b.props.ask === 'volume' ? a * a * a : 6 * a * a;
          case 'cuboid': return b.props.ask === 'volume' ? a * bb * c : 2 * (a * bb + a * c + bb * c);
          case 'cyl': return b.props.ask === 'volume' ? Math.PI * r * r * a : 2 * Math.PI * r * (r + a);
          default: return 0;
        }
      }
      var SHAPES = [
        ['rect', 'Rectangle'], ['tri', 'Triangle'], ['circle', 'Circle'],
        ['cube', 'Cube'], ['cuboid', 'Cuboid'], ['cyl', 'Cylinder']
      ];

      defineBlock('shapemath', {
        label: 'Shape maths', icon: '△', category: 'Maths', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'shape', type: 'select', label: 'Shape', options: SHAPES },
          { key: 'ask', type: 'select', label: 'Find', options: [['area', 'Area'], ['perimeter', 'Perimeter / surface area'], ['volume', 'Volume']] },
          { key: 'a', type: 'number', label: 'Length / radius', min: 0, max: 20 },
          { key: 'b', type: 'number', label: 'Width', min: 0, max: 20 },
          { key: 'c', type: 'number', label: 'Height', min: 0, max: 20 }
        ],
        defaults: () => ({
          question: 'Find the area of the shape. Use 3.14 for π.',
          shape: 'rect', ask: 'area', a: 8, b: 5, c: 3
        }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<canvas class="tb-shape" width="260" height="200" data-tb-shape="' + b.id + '"></canvas>' +
          '<div class="tb-shape-dims" data-tb-dims="' + b.id + '"></div>' +
          '<div class="tb-q-sub">Answer: <input type="text" class="tb-input tb-num" data-tb-x="' + b.id + '"/></div>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          var canvas = el.querySelector('[data-tb-shape]');
          var ctx = canvas.getContext('2d');
          var dims = el.querySelector('[data-tb-dims]');
          var a = parseFloat(b.props.a) || 0, bb = parseFloat(b.props.b) || 0, c = parseFloat(b.props.c) || 0;
          function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var sc = 12;
            ctx.fillStyle = 'rgba(13,148,136,0.14)';
            ctx.strokeStyle = '#0f766e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (b.props.shape === 'rect') {
              ctx.rect(20, 20, a * sc, bb * sc);
            } else if (b.props.shape === 'tri') {
              ctx.moveTo(20, 20 + bb * sc); ctx.lineTo(20 + a * sc, 20 + bb * sc); ctx.lineTo(20, 20);
            } else if (b.props.shape === 'circle') {
              ctx.arc(20 + a * sc / 2, 100, a * sc / 2, 0, Math.PI * 2);
            } else if (b.props.shape === 'cube' || b.props.shape === 'cuboid' || b.props.shape === 'cyl') {
              var w = (b.props.shape === 'cuboid' ? a : a) * sc;
              var h = (b.props.shape === 'cuboid' ? c : a) * sc;
              var d = 26;
              ctx.moveTo(30, 150 - h); ctx.lineTo(30 + w, 150 - h);
              ctx.lineTo(30 + w, 150); ctx.lineTo(30, 150);
              ctx.moveTo(30 + w, 150 - h); ctx.lineTo(30 + w + d, 150 - h - d);
              ctx.lineTo(30 + w + d, 150 - d); ctx.lineTo(30 + w, 150);
              ctx.moveTo(30, 150); ctx.lineTo(30 + d, 150 - d); ctx.lineTo(30 + w + d, 150 - d);
            } else {
              ctx.rect(20, 20, a * sc, bb * sc);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          draw();
          var shown = b.props.shape === 'tri' ? 'base ' + a + ', height ' + bb
            : (b.props.shape === 'circle' || b.props.shape === 'cyl' ? 'radius ' + a
              : (b.props.shape === 'cube' ? 'side ' + a
                : (b.props.shape === 'cuboid' ? a + ' × ' + bb + ' × ' + c : a + ' × ' + bb)));
          dims.textContent = shown;
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = el.querySelector('[data-tb-x]').value.trim();
            // π answers are accepted within 1% so 3.14 and 3.1416 both pass.
            var want = shapeAnswer(b);
            var ok = numClose(v, want, Math.max(0.05, Math.abs(want) * 0.01));
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Check the formula for this shape.';
          });
        },
        collect: (b, el) => el.querySelector('[data-tb-x]').value.trim(),
        grade: (b, resp) => ({ correct: numClose(resp, shapeAnswer(b), Math.max(0.05, Math.abs(shapeAnswer(b)) * 0.01)) })
      });

      // ---------- memory / match pairs (maths) ----------
      defineBlock('mathpairs', {
        label: 'Pairs game', icon: '🃏', category: 'Game', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'seed', type: 'number', label: 'Seed', min: 1, max: 99999 },
          { key: 'pairs', type: 'number', label: 'Pairs', min: 3, max: 8 }
        ],
        defaults: () => ({
          question: 'Flip the cards and match each sum to its answer.',
          seed: 314, pairs: 4
        }),
        render: (b) => {
          var n = Math.max(3, Math.min(8, parseInt(b.props.pairs, 10) || 4));
          var rnd = randSeed(parseInt(b.props.seed, 10) || 1);
          var qs = [];
          for (var i = 0; i < n; i++) {
            var x = 2 + Math.floor(rnd() * 17), y = 2 + Math.floor(rnd() * 17);
            var op = rnd() < 0.5 ? '+' : '×';
            qs.push({ q: x + ' ' + op + ' ' + y, a: op === '+' ? x + y : x * y });
          }
          var cards = [];
          qs.forEach(function(p, i) {
            cards.push({ pair: i, text: p.q, side: 'q' });
            cards.push({ pair: i, text: String(p.a), side: 'a' });
          });
          for (var s = cards.length - 1; s > 0; s--) {
            var j = Math.floor(rnd() * (s + 1));
            var t = cards[s]; cards[s] = cards[j]; cards[j] = t;
          }
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-cards" data-tb-cards="' + b.id + '">' + cards.map(function(c, i) {
              return '<button type="button" class="tb-card" data-card="' + i + '" data-pair="' + c.pair + '">' +
                '<span class="tb-card-in"><span class="tb-card-f">?</span><span class="tb-card-b">' +
                esc(c.text) + '</span></span></button>';
            }).join('') + '</div>' +
            '<div class="tb-readout" data-tb-read="' + b.id + '">0 pairs found.</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Finish</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var grid = el.querySelector('[data-tb-cards]');
          var read = el.querySelector('[data-tb-read]');
          var fb = el.querySelector('[data-tb-fb]');
          var open = [], matched = 0, moves = 0, started = Date.now();
          grid.addEventListener('click', function(e) {
            var card = e.target.closest('.tb-card');
            if (!card || card.classList.contains('done')) return;
            card.classList.add('flip');
            open.push(card);
            if (open.length < 2) return;
            moves++;
            var a = open[0], c = open[1];
            if (a.getAttribute('data-pair') === c.getAttribute('data-pair') &&
              a.getAttribute('data-card') !== c.getAttribute('data-card')) {
              a.classList.add('done'); c.classList.add('done');
              matched++;
              open = [];
              read.textContent = matched + ' pairs found in ' + moves + ' moves.';
            } else {
              setTimeout(function() {
                a.classList.remove('flip'); c.classList.remove('flip');
                open = [];
              }, 700);
            }
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var total = el.querySelectorAll('.tb-card').length / 2;
            var ok = matched === total;
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ All matched in ' + moves + ' moves!'
              : '✕ ' + (total - matched) + ' pair(s) still open.';
          });
          el.__state = function() { return { matched: matched, moves: moves, secs: (Date.now() - started) / 1000 }; };
        },
        collect: (b, el) => el.__state ? el.__state() : null,
        grade: (b, resp) => {
          var total = Math.max(3, Math.min(8, parseInt(b.props.pairs, 10) || 4));
          return { correct: !!resp && resp.matched === total };
        }
      });

      // ---------- dice probability ----------
      function diceAnswer(b) {
        switch (b.props.ask) {
          case 'sum7': return 6;
          case 'even': return 18;
          case 'gt8': return 15;
          case 'div3': return 12;
          case 'six': return 6;
          case 'same': return 6;
          default: return 0;
        }
      }
      function drawDie(ctx, size, value) {
        var g = size / 2, r = size / 8;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(g, g, size / 2 - 3, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0f172a';
        var spots = {
          1: [[g, g]], 2: [[g - r, g - r], [g + r, g + r]],
          3: [[g - r, g - r], [g, g], [g + r, g + r]],
          4: [[g - r, g - r], [g + r, g - r], [g - r, g + r], [g + r, g + r]],
          5: [[g - r, g - r], [g + r, g - r], [g, g], [g - r, g + r], [g + r, g + r]],
          6: [[g - r, g - r], [g + r, g - r], [g - r, g], [g + r, g], [g - r, g + r], [g + r, g + r]]
        };
        (spots[value] || []).forEach(function(p) {
          ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.7, 0, Math.PI * 2); ctx.fill();
        });
      }

      defineBlock('dice', {
        label: 'Dice probability', icon: '🎲', category: 'Maths', graded: true, defaultPoints: 1,
        fields: [
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'ask', type: 'select', label: 'Outcomes', options: [['sum7', 'Total of 7'], ['even', 'Total is even'], ['gt8', 'Total over 8'], ['div3', 'Total is a multiple of 3'], ['six', 'A 6 shows'], ['same', 'Both dice match']] },
          { key: 'rolls', type: 'number', label: 'Trial rolls', min: 1, max: 200 }
        ],
        defaults: () => ({
          question: 'Two fair dice are thrown. How many of the 36 outcomes give a total of 7?',
          ask: 'sum7', rolls: 1
        }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<div class="tb-dice"><canvas class="tb-die" width="90" height="90" data-tb-d1></canvas>' +
          '<canvas class="tb-die" width="90" height="90" data-tb-d2></canvas>' +
          '<button type="button" class="tb-roll" data-tb-roll>Roll</button></div>' +
          '<div class="tb-readout" data-tb-read="' + b.id + '">Roll the dice to collect trial data.</div>' +
          '<div class="tb-q-sub">Favourable outcomes (of 36): ' +
          '<input type="text" class="tb-input tb-num" data-tb-x="' + b.id + '"/></div>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          var c1 = el.querySelector('[data-tb-d1]').getContext('2d');
          var c2 = el.querySelector('[data-tb-d2]').getContext('2d');
          var read = el.querySelector('[data-tb-read]');
          var fb = el.querySelector('[data-tb-fb]');
          var t1 = 1 + Math.floor(Math.random() * 6), t2 = 1 + Math.floor(Math.random() * 6);
          var rolling = false;
          function paint() { drawDie(c1, 90, t1); drawDie(c2, 90, t2); }
          paint();
          el.querySelector('[data-tb-roll]').addEventListener('click', function() {
            if (rolling) return;
            rolling = true;
            var n = Math.max(1, Math.min(200, parseInt(b.props.rolls, 10) || 1));
            var ticks = 0;
            var timer = setInterval(function() {
              t1 = 1 + Math.floor(Math.random() * 6);
              t2 = 1 + Math.floor(Math.random() * 6);
              paint();
              if (++ticks >= 8) {
                clearInterval(timer);
                rolling = false;
                read.textContent = 'Rolled ' + t1 + ' and ' + t2 + ' (total ' + (t1 + t2) + ').';
              }
            }, 70);
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = parseInt(el.querySelector('[data-tb-x]').value.trim(), 10);
            var ok = v === diceAnswer(b);
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct — 36 equally likely outcomes.'
              : '✕ There are 6 × 6 = 36 equally likely outcomes.';
          });
        },
        collect: (b, el) => el.querySelector('[data-tb-x]').value.trim(),
        grade: (b, resp) => ({ correct: parseInt(resp, 10) === diceAnswer(b) })
      });
