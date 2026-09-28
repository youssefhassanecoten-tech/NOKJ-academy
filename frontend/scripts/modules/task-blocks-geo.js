// ============================================================
//  TASK BLOCKS — geography
//
//  Terrain and mineral data are generated from a seed so a block is
//  reproducible: the teacher, the student and the grader all see the
//  same landscape from the same block.
// ============================================================

      // Value noise with bilinear interpolation, seeded.
      function noiseField(seed, cols, rows) {
        var rnd = randSeed(seed);
        var g = [];
        for (var y = 0; y <= rows; y++) {
          g[y] = [];
          for (var x = 0; x <= cols; x++) g[y][x] = rnd();
        }
        function smooth(t) { return t * t * (3 - 2 * t); }
        var out = [];
        for (var j = 0; j < rows; j++) {
          out[j] = [];
          for (var i = 0; i < cols; i++) {
            var x0 = Math.floor(i), y0 = Math.floor(j);
            var x1 = Math.min(x0 + 1, cols), y1 = Math.min(y0 + 1, rows);
            var fx = smooth(i - x0), fy = smooth(j - y0);
            var a = g[y0][x0] * (1 - fx) + g[y0][x1] * fx;
            var b = g[y1][x0] * (1 - fx) + g[y1][x1] * fx;
            out[j][i] = a * (1 - fy) + b * fy;
          }
        }
        return out;
      }

      // Fractal sum: multiple octaves give ridges and valleys, not blobs.
      function terrainField(seed, cols, rows) {
        var acc = [];
        var total = 0;
        for (var oct = 0; oct < 4; oct++) {
          var amp = Math.pow(0.5, oct);
          var layer = noiseField(seed + oct * 7919, cols, rows);
          total += amp;
          for (var y = 0; y < rows; y++) {
            acc[y] = acc[y] || [];
            for (var x = 0; x < cols; x++) acc[y][x] = (acc[y][x] || 0) + layer[y][x] * amp;
          }
        }
        for (var y2 = 0; y2 < rows; y2++) {
          for (var x2 = 0; x2 < cols; x2++) acc[y2][x2] /= total;
        }
        return acc;
      }

      // Elevation in metres, so labels look like a real map.
      function terrainMetres(seed, cols, rows) {
        var f = terrainField(seed, cols, rows);
        return f.map(function(row) {
          return row.map(function(v) { return Math.round(v * 2400 + 20); });
        });
      }

      var TERRAIN_BANDS = [
        { max: 40, color: '#2f6f9f', name: 'Deep water' },
        { max: 120, color: '#4a90c2', name: 'Shallow water' },
        { max: 260, color: '#e8d9a0', name: 'Coastal plain' },
        { max: 600, color: '#8fbf6a', name: 'Lowland' },
        { max: 1100, color: '#c9b06a', name: 'Upland' },
        { max: 1700, color: '#9c7f5a', name: 'Highland' },
        { max: 99999, color: '#f2f2f2', name: 'Peak' }
      ];

      function terrainColor(m) {
        for (var i = 0; i < TERRAIN_BANDS.length; i++) {
          if (m <= TERRAIN_BANDS[i].max) return TERRAIN_BANDS[i].color;
        }
        return '#ffffff';
      }
      function terrainBandName(m) {
        for (var i = 0; i < TERRAIN_BANDS.length; i++) {
          if (m <= TERRAIN_BANDS[i].max) return TERRAIN_BANDS[i].name;
        }
        return 'Peak';
      }

      function drawTerrainCanvas(canvas, metres, cols, rows, contour) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        var cw = w / cols, ch = h / rows;
        for (var y = 0; y < rows; y++) {
          for (var x = 0; x < cols; x++) {
            ctx.fillStyle = terrainColor(metres[y][x]);
            ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
          }
        }
        if (contour) {
          // Simple marching-squares pass for one level.
          var level = parseInt(contour, 10) || 500;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (var y2 = 0; y2 < rows - 1; y2++) {
            for (var x2 = 0; x2 < cols - 1; x2++) {
              var a = metres[y2][x2], b = metres[y2][x2 + 1], c = metres[y2 + 1][x2 + 1], d = metres[y2 + 1][x2];
              var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
              var px = x2 * cw, py = y2 * ch;
              var seg = [
                [1, [[px + cw / 2, py], [px + cw, py + ch / 2]]],
                [2, [[px + cw, py + ch / 2], [px + cw / 2, py + ch]]],
                [4, [[px + cw / 2, py + ch], [px, py + ch / 2]]],
                [8, [[px, py + ch / 2], [px + cw / 2, py]]]
              ];
              seg.forEach(function(s) {
                if (idx & s[0]) { ctx.moveTo(s[1][0][0], s[1][0][1]); ctx.lineTo(s[1][1][0], s[1][1][1]); }
              });
            }
          }
          ctx.stroke();
        }
      }

      defineBlock('terrain', {
        label: 'Terrain map', icon: '🗺', category: 'Geography', graded: true, defaultPoints: 2,
        fields: [
          { key: 'seed', type: 'number', label: 'Seed', min: 1, max: 99999 },
          { key: 'size', type: 'select', label: 'Grid', options: [['24', '24 × 24'], ['32', '32 × 32'], ['40', '40 × 40']] },
          { key: 'contour', type: 'number', label: 'Contour level (m)', min: 0, max: 2400 },
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'answers', type: 'options', label: 'Accepted band names' }
        ],
        defaults: () => ({
          seed: 1234, size: 32, contour: 500,
          question: 'Study the map. Which band does the highest marked point sit in?',
          answers: ['Peak', 'Highland']
        }),
        render: (b) => {
          var n = parseInt(b.props.size, 10) || 32;
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<canvas class="tb-terrain" width="480" height="480" data-tb-terrain="' + b.id + '"></canvas>' +
            '<div class="tb-legend">' + TERRAIN_BANDS.map(function(band) {
              return '<span class="tb-legend-i"><i style="background:' + band.color + '"></i>' + esc(band.name) + '</span>';
            }).join('') + '</div>' +
            '<div class="tb-readout" data-tb-read="' + b.id + '">Click the map to sample a point.</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var n = parseInt(b.props.size, 10) || 32;
          var seed = parseInt(b.props.seed, 10) || 1;
          var metres = terrainMetres(seed, n, n);
          var canvas = el.querySelector('[data-tb-terrain]');
          drawTerrainCanvas(canvas, metres, n, n, b.props.contour);
          var read = el.querySelector('[data-tb-read]');
          var fb = el.querySelector('[data-tb-fb]');
          var picked = null;
          canvas.addEventListener('click', function(e) {
            var r = canvas.getBoundingClientRect();
            var gx = Math.floor((e.clientX - r.left) / r.width * n);
            var gy = Math.floor((e.clientY - r.top) / r.height * n);
            if (gx < 0 || gy < 0 || gx >= n || gy >= n) return;
            picked = { m: metres[gy][gx], band: terrainBandName(metres[gy][gx]) };
            read.textContent = 'Sampled point: ' + picked.m + ' m — ' + picked.band;
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            if (!picked) { fb.className = 'tb-feedback'; fb.textContent = 'Click the map to sample a point first.'; return; }
            var acc = (Array.isArray(b.props.answers) ? b.props.answers : []).map(function(s) {
              return String(s).trim().toLowerCase();
            }).filter(Boolean);
            var ok = acc.indexOf(String(picked.band).toLowerCase()) !== -1;
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ That point is in the ' + picked.band + ' band.';
          });
          el.__picked = function() { return picked; };
        },
        collect: (b, el) => el.__picked ? el.__picked() : null,
        grade: (b, resp) => {
          if (!resp) return { correct: false };
          var acc = (Array.isArray(b.props.answers) ? b.props.answers : []).map(function(s) {
            return String(s).trim().toLowerCase();
          }).filter(Boolean);
          return { correct: acc.indexOf(String(resp.band).toLowerCase()) !== -1 };
        }
      });

      // ---------- GPS / coordinates ----------
      function toLatLon(lat, lon, x, y) {
        return { lat: lat + (y / 100) * 0.1, lon: lon + (x / 100) * 0.1 };
      }

      defineBlock('gps', {
        label: 'GPS coordinates', icon: '📍', category: 'Geography', graded: true, defaultPoints: 1,
        fields: [
          { key: 'lat', type: 'text', label: 'Latitude of top-left (e.g. 51.50)' },
          { key: 'lon', type: 'text', label: 'Longitude of top-left (e.g. -0.12)' },
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'answer', type: 'text', label: 'Accepted coordinate' }
        ],
        defaults: () => ({
          lat: '51.50', lon: '-0.12',
          question: 'Click the map to read a coordinate, then confirm it.',
          answer: '51.53, -0.09'
        }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<div class="tb-gps" data-tb-gps="' + b.id + '">' +
          '<div class="tb-gps-grid"></div><div class="tb-gps-pin" data-tb-pin></div></div>' +
          '<div class="tb-readout" data-tb-read="' + b.id + '">Click the grid to drop a pin.</div>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check coordinate</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          var box = el.querySelector('[data-tb-gps]');
          var pin = el.querySelector('[data-tb-pin]');
          var read = el.querySelector('[data-tb-read]');
          var fb = el.querySelector('[data-tb-fb]');
          var picked = null;
          box.addEventListener('click', function(e) {
            var r = box.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width * 100;
            var y = (e.clientY - r.top) / r.height * 100;
            var base = toLatLon(parseFloat(b.props.lat) || 0, parseFloat(b.props.lon) || 0, x, y);
            picked = {
              x: x, y: y,
              lat: base.lat.toFixed(4), lon: base.lon.toFixed(4),
              text: base.lat.toFixed(2) + ', ' + base.lon.toFixed(2)
            };
            pin.style.left = x + '%';
            pin.style.top = y + '%';
            read.textContent = '📍 ' + picked.text;
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            if (!picked) { fb.className = 'tb-feedback'; fb.textContent = 'Drop a pin first.'; return; }
            var want = String(b.props.answer || '').trim().toLowerCase();
            var got = picked.text.toLowerCase();
            var ok = !!want && (got === want || got.replace(/\s/g, '') === want.replace(/\s/g, ''));
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct coordinate!' : '✕ You read ' + picked.text + '.';
          });
          el.__picked = function() { return picked; };
        },
        collect: (b, el) => el.__picked ? el.__picked() : null,
        grade: (b, resp) => {
          if (!resp) return { correct: false };
          var want = String(b.props.answer || '').trim().toLowerCase().replace(/\s/g, '');
          return { correct: want === resp.text.toLowerCase().replace(/\s/g, '') };
        }
      });

      // ---------- 3D terrain mesh ----------
      // Isometric projection with painter's algorithm. No WebGL, so it works
      // everywhere and stays editable.
      function drawMesh3D(canvas, metres, n, pitch, yaw, relief) {
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        var cell = Math.min(w, h) / (n * 1.5);
        var ry = yaw, rp = pitch;
        var cy = Math.cos(ry), sy = Math.sin(ry);
        var cp = Math.cos(rp), sp = Math.sin(rp);

        function project(x, y, m) {
          var z = (m / 2400) * relief * cell;
          var X = x * cy - y * sy;
          var Y = (x * sy + y * cy) * sp;
          return [w / 2 + (X - Y) * cell, h / 2 + ((X + Y) * cp - z * 0.9) * cell * 0.5 + cell];
        }

        var faces = [];
        for (var y = 0; y < n - 1; y++) {
          for (var x = 0; x < n - 1; x++) {
            var m = metres[y][x];
            var a = project(x, y, m), bb = project(x + 1, y, m), c = project(x + 1, y + 1, m), d = project(x, y + 1, m);
            faces.push({ pts: [a, bb, c, d], depth: (x + y), m: m });
          }
        }
        faces.sort(function(p, q) { return p.depth - q.depth; });

        faces.forEach(function(f) {
          var shade = 0.55 + (f.m / 2400) * 0.45;
          var r = Math.round(terrainColor(f.m).slice(1, 3) === '' ? 200 : parseInt(terrainColor(f.m).slice(1, 3), 16) * shade);
          var g = Math.round(parseInt(terrainColor(f.m).slice(3, 5), 16) * shade);
          var bl = Math.round(parseInt(terrainColor(f.m).slice(5, 7), 16) * shade);
          ctx.fillStyle = 'rgb(' + Math.min(255, r) + ',' + Math.min(255, g) + ',' + Math.min(255, bl) + ')';
          ctx.beginPath();
          f.pts.forEach(function(p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.18)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });
      }

      defineBlock('terrain3d', {
        label: '3D terrain', icon: '🧊', category: 'Geography', graded: true, defaultPoints: 2,
        fields: [
          { key: 'seed', type: 'number', label: 'Seed', min: 1, max: 99999 },
          { key: 'size', type: 'select', label: 'Grid', options: [['16', '16 × 16'], ['20', '20 × 20'], ['24', '24 × 24']] },
          { key: 'relief', type: 'number', label: 'Relief', min: 1, max: 12 },
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'answers', type: 'options', label: 'Accepted answers' }
        ],
        defaults: () => ({
          seed: 4242, size: 20, relief: 6,
          question: 'Rotate the model. Which landform dominates the view?',
          answers: ['Mountain', 'Mountain range', 'Highland']
        }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<canvas class="tb-mesh" width="520" height="360" data-tb-mesh="' + b.id + '"></canvas>' +
          '<div class="tb-mesh-ctrl">' +
          '<label>Yaw <input type="range" min="0" max="360" value="35" data-tb-yaw/></label>' +
          '<label>Pitch <input type="range" min="10" max="80" value="45" data-tb-pitch/></label></div>' +
          '<div class="tb-readout" data-tb-read="' + b.id + '">Drag to rotate.</div>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          var n = parseInt(b.props.size, 10) || 20;
          var metres = terrainMetres(parseInt(b.props.seed, 10) || 1, n, n);
          var canvas = el.querySelector('[data-tb-mesh]');
          var yaw = el.querySelector('[data-tb-yaw]');
          var pitch = el.querySelector('[data-tb-pitch]');
          var fb = el.querySelector('[data-tb-fb]');
          var pick = null;
          function paint() {
            drawMesh3D(canvas, metres, n,
              (parseInt(pitch.value, 10) || 45) * Math.PI / 180,
              (parseInt(yaw.value, 10) || 35) * Math.PI / 180,
              parseInt(b.props.relief, 10) || 6);
          }
          function redraw() { paint(); }
          paint();
          yaw.addEventListener('input', redraw);
          pitch.addEventListener('input', redraw);
          var drag = null;
          canvas.addEventListener('pointerdown', function(e) { drag = { x: e.clientX, y: e.clientY }; });
          canvas.addEventListener('pointermove', function(e) {
            if (!drag) return;
            yaw.value = (parseInt(yaw.value, 10) + (e.clientX - drag.x) * 0.8 + 360) % 360;
            pitch.value = Math.max(10, Math.min(80, parseInt(pitch.value, 10) - (e.clientY - drag.y) * 0.4));
            drag = { x: e.clientX, y: e.clientY };
            paint();
          });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev) {
            canvas.addEventListener(ev, function() { drag = null; });
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = window.prompt('Which landform dominates the view?');
            if (v === null) return;
            pick = String(v).trim();
            var acc = (Array.isArray(b.props.answers) ? b.props.answers : []).map(function(s) {
              return String(s).trim().toLowerCase();
            }).filter(Boolean);
            var ok = pick !== '' && acc.indexOf(pick.toLowerCase()) !== -1;
            fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
            fb.textContent = ok ? '✓ Correct!' : '✕ Expected one of: ' + acc.join(' / ');
          });
          el.__picked = function() { return pick; };
        },
        collect: (b, el) => el.__picked ? el.__picked() : null,
        grade: (b, resp) => {
          if (!resp) return { correct: false };
          var acc = (Array.isArray(b.props.answers) ? b.props.answers : []).map(function(s) {
            return String(s).trim().toLowerCase();
          }).filter(Boolean);
          return { correct: acc.indexOf(String(resp).trim().toLowerCase()) !== -1 };
        }
      });

      // ---------- mineral location ----------
      var MINERALS = [
        { name: 'Iron ore', where: 'Igneous & metamorphic', hint: 'Formed in magma, dense and metallic.' },
        { name: 'Coal', where: 'Sedimentary', hint: 'Forms from buried plant matter in swamps.' },
        { name: 'Oil', where: 'Sedimentary', hint: 'Trapped in porous rock beneath a cap rock.' },
        { name: 'Salt', where: 'Evaporite', hint: 'Left behind when seawater evaporates.' },
        { name: 'Diamond', where: 'Igneous', hint: 'Forms under extreme pressure deep in the crust.' },
        { name: 'Limestone', where: 'Sedimentary', hint: 'Builds up from marine shells.' }
      ];

      defineBlock('minerals', {
        label: 'Mineral locator', icon: '💎', category: 'Geography', graded: true, defaultPoints: 1,
        fields: [
          { key: 'seed', type: 'number', label: 'Seed', min: 1, max: 99999 },
          { key: 'count', type: 'number', label: 'Deposits', min: 1, max: 6 },
          { key: 'target', type: 'number', label: 'Target deposit (1-based)' },
          { key: 'question', type: 'textarea', label: 'Question' }
        ],
        defaults: () => ({
          seed: 777, count: 4, target: 1,
          question: 'A survey shows a deposit in sedimentary rock. Which mineral is it most likely to be?'
        }),
        render: (b) => {
          var count = Math.max(1, Math.min(6, parseInt(b.props.count, 10) || 4));
          var rnd = randSeed(parseInt(b.props.seed, 10) || 1);
          var chosen = [];
          for (var i = 0; i < count; i++) {
            var m = MINERALS[Math.floor(rnd() * MINERALS.length)];
            chosen.push({
              mineral: m.name, where: m.where, hint: m.hint,
              x: 8 + rnd() * 84, y: 8 + rnd() * 84
            });
          }
          return '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
            '<div class="tb-minerals" data-tb-min="' + b.id + '">' +
            chosen.map(function(d, i) {
              return '<button type="button" class="tb-ore" data-ore="' + i + '" style="left:' + d.x +
                '%;top:' + d.y + '%" title="deposit ' + (i + 1) + '">●</button>';
            }).join('') + '</div>' +
            '<div class="tb-ore-list">' + chosen.map(function(d, i) {
              return '<div class="tb-ore-row" data-ore-row="' + i + '"><strong>' + (i + 1) + '.</strong> ' +
                esc(d.where) + ' — ' + esc(d.hint) + '</div>';
            }).join('') + '</div>' +
            '<div class="tb-readout" data-tb-read="' + b.id + '">Pick a deposit to identify it.</div>' +
            '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
            '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>';
        },
        mount: (b, el) => {
          var fb = el.querySelector('[data-tb-fb]');
          var read = el.querySelector('[data-tb-read]');
          var picked = null;
          el.querySelector('.tb-minerals').addEventListener('click', function(e) {
            var btn = e.target.closest('.tb-ore');
            if (!btn) return;
            picked = parseInt(btn.getAttribute('data-ore'), 10);
            read.textContent = 'Deposit ' + (picked + 1) + ' selected. Which mineral?';
          });
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            if (picked === null) { fb.className = 'tb-feedback'; fb.textContent = 'Select a deposit first.'; return; }
            var rows = el.querySelectorAll('.tb-ore-row');
            var deposit = rows[picked];
            var want = deposit.textContent;
            var v = window.prompt('Which mineral is deposit ' + (picked + 1) + '? (' + want.trim() + ')');
            if (v === null) return;
            el.__last = { deposit: picked, guess: String(v).trim(), hint: want };
            fb.className = 'tb-feedback';
            fb.textContent = 'Recorded: ' + v;
          });
          el.__picked = function() { return el.__last || null; };
        },
        collect: (b, el) => el.__picked ? el.__picked() : null,
        grade: (b, resp) => {
          if (!resp) return { correct: false };
          var target = Math.max(1, parseInt(b.props.count, 10) || 4);
          var wantDeposit = Math.max(1, Math.min(target, parseInt(b.props.target, 10) || 1)) - 1;
          return { correct: resp.deposit === wantDeposit };
        }
      });

      // ---------- weather ----------
      defineBlock('weather', {
        label: 'Weather', icon: '⛅', category: 'Geography', graded: true, defaultPoints: 1,
        fields: [
          { key: 'condition', type: 'select', label: 'Condition', options: [['rain', 'Rain'], ['storm', 'Storm'], ['snow', 'Snow'], ['fog', 'Fog'], ['heat', 'Heatwave']] },
          { key: 'wind', type: 'number', label: 'Wind speed (km/h)', min: 0, max: 120 },
          { key: 'question', type: 'textarea', label: 'Question' },
          { key: 'answers', type: 'options', label: 'Accepted answers' }
        ],
        defaults: () => ({
          condition: 'rain', wind: 40,
          question: 'What weather system does this suggest?',
          answers: ['Low pressure', 'Depression', 'Front']
        }),
        render: (b) => '<div class="tb-q"><div class="tb-q-text">' + miniMd(b.props.question) + '</div>' +
          '<canvas class="tb-weather" width="520" height="240" data-tb-weather="' + b.id + '"></canvas>' +
          '<div class="tb-weather-meta">Wind <strong>' + esc(b.props.wind) + '</strong> km/h · ' +
          esc((b.props.condition || 'rain').toUpperCase()) + '</div>' +
          '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
          '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div></div>',
        mount: (b, el) => {
          var canvas = el.querySelector('[data-tb-weather]');
          var ctx = canvas.getContext('2d');
          var kind = b.props.condition || 'rain';
          var wind = parseInt(b.props.wind, 10) || 0;
          var drops = [];
          var rnd = randSeed(31);
          for (var i = 0; i < 140; i++) {
            drops.push({ x: rnd() * canvas.width, y: rnd() * canvas.height, l: 6 + rnd() * 12, s: 0.5 + rnd() });
          }
          var frame = 0;
          function sky() {
            var g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            if (kind === 'heat') { g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#fca5a5'); }
            else if (kind === 'snow') { g.addColorStop(0, '#c7d2fe'); g.addColorStop(1, '#f8fafc'); }
            else if (kind === 'fog') { g.addColorStop(0, '#cbd5e1'); g.addColorStop(1, '#e2e8f0'); }
            else if (kind === 'storm') { g.addColorStop(0, '#1e293b'); g.addColorStop(1, '#475569'); }
            else { g.addColorStop(0, '#64748b'); g.addColorStop(1, '#94a3b8'); }
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          function clouds() {
            ctx.fillStyle = kind === 'storm' ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.72)';
            for (var c = 0; c < 5; c++) {
              var cx = ((frame * (0.2 + c * 0.05) + c * 140) % (canvas.width + 220)) - 110;
              var cy = 26 + c * 13;
              ctx.beginPath();
              ctx.ellipse(cx, cy, 76 - c * 6, 26 - c * 3, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          function precip() {
            if (kind === 'rain' || kind === 'storm') {
              ctx.strokeStyle = kind === 'storm' ? 'rgba(191,219,254,0.85)' : 'rgba(226,232,240,0.8)';
              ctx.lineWidth = kind === 'storm' ? 2 : 1.2;
              ctx.beginPath();
              drops.forEach(function(d) {
                var x = (d.x + frame * (1 + wind / 40) * d.s) % canvas.width;
                var y = (d.y + frame * (4 + d.s * 4)) % canvas.height;
                ctx.moveTo(x, y);
                ctx.lineTo(x - wind * 0.12, y + d.l * (1 + wind / 60));
              });
              ctx.stroke();
            } else if (kind === 'snow') {
              ctx.fillStyle = 'rgba(255,255,255,0.92)';
              drops.forEach(function(d) {
                var x = (d.x + frame * (0.4 + wind / 90) * d.s) % canvas.width;
                var y = (d.y + frame * (0.8 + d.s)) % canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, 1.4 + d.s * 1.8, 0, Math.PI * 2);
                ctx.fill();
              });
            } else if (kind === 'fog') {
              ctx.fillStyle = 'rgba(248,250,252,0.5)';
              for (var f = 0; f < 6; f++) {
                var y2 = 40 + f * 32 + Math.sin((frame + f * 20) / 24) * 8;
                ctx.fillRect(0, y2, canvas.width, 18);
              }
            }
          }
          sky();
          var timer = setInterval(function() {
            frame = (frame + 1) % 100000;
            sky(); clouds(); precip();
          }, 60);
          var fb = el.querySelector('[data-tb-fb]');
          el.querySelector('[data-tb-check]').addEventListener('click', function() {
            var v = window.prompt('What weather system does this suggest?');
            if (v === null) return;
            el.__last = String(v).trim();
            fb.className = 'tb-feedback';
            fb.textContent = 'Recorded: ' + v;
          });
          // Stop the animation when the block leaves the page.
          if (el.__stop) el.__stop();
          el.__stop = function() { clearInterval(timer); };
        },
        collect: (b, el) => (el.__last !== undefined ? el.__last : null),
        grade: (b, resp) => {
          if (!resp) return { correct: false };
          var acc = (Array.isArray(b.props.answers) ? b.props.answers : []).map(function(s) {
            return String(s).trim().toLowerCase();
          }).filter(Boolean);
          return { correct: acc.indexOf(String(resp).trim().toLowerCase()) !== -1 };
        }
      });
