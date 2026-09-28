// ============================================================
//  WORLD MAP BLOCK
//
//  A real map, not a picture of one. MapLibre GL JS (BSD-3) renders
//  raster tiles, tilts them into 3D, shades real terrain from a
//  terrain-RGB source, and gives full control over markers and
//  selection state.
//
//  Four modes, as the school needs them:
//    2d    a flat map
//    3d    the same map tilted, with terrain and buildings in relief
//    topo  hillshade over topographic tiles, with a height legend
//    quiz  teacher-placed points the student selects on, in full or in
//          part, and the block grades it
//
//  Everything is keyless: OpenStreetMap raster for the base, OpenTopoMap
//  for the topographic tiles, and the AWS terrain-RGB tiles for real
//  elevation. A teacher can point all three elsewhere if they prefer.
// ============================================================

  var MAPLIBRE_SRC = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
  var MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';

  // Keyless, open-data sources. Usage policies vary, so all three are
  // replaceable from the inspector.
  var MAP_TILES = {
    base: {
      label: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19
    },
    topo: {
      label: 'OpenTopoMap',
      url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors',
      maxzoom: 17
    },
    terrain: {
      label: 'AWS terrain (terrain-RGB)',
      url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
      maxzoom: 15
    }
  };

  // One shared script tag, loaded on first use.
  var MAP_LIB_PROMISE = null;
  function ensureMapLibre() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    if (MAP_LIB_PROMISE) return MAP_LIB_PROMISE;
    MAP_LIB_PROMISE = new Promise(function(resolve, reject) {
      if (document.querySelector('link[data-maplibre-css]')) { /* already */ }
      else {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = MAPLIBRE_CSS;
        link.setAttribute('data-maplibre-css', '1');
        document.head.appendChild(link);
      }
      var s = document.createElement('script');
      s.src = MAPLIBRE_SRC;
      s.async = true;
      s.onload = function() { window.maplibregl ? resolve(window.maplibregl) : reject(new Error('maplibre did not initialise')); };
      s.onerror = function() { reject(new Error('Could not load the map library. Check the network.')); };
      document.head.appendChild(s);
    });
    return MAP_LIB_PROMISE;
  }

  function escMap(v) {
    return String(v === undefined || v === null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function mapDefaults() {
    return {
      question: 'Mark the places on the map.',
      mode: '2d',
      centerLat: 20, centerLon: 0, zoom: 1.4,
      pitch: 45, bearing: 0,
      points: [],          // [{ id, lat, lon, label, correct, partial }]
      answerMode: 'full',  // full | partial
      reveal: true,        // show the answer key after checking
      baseTiles: MAP_TILES.base.url,
      topoTiles: MAP_TILES.topo.url,
      terrainTiles: MAP_TILES.terrain.url
    };
  }

  function mapFields() {
    return [
      { key: 'question', type: 'textarea', label: 'Question' },
      {
        key: 'mode', type: 'select', label: 'Map mode',
        options: [['2d', 'Flat 2D'], ['3d', '3D relief'], ['topo', 'Topographic']]
      },
      { key: 'answerMode', type: 'select', label: 'Marking', options: [['full', 'All points must be correct'], ['partial', 'Partial credit']] },
      { key: 'reveal', type: 'bool', label: 'Reveal the key after checking' },
      { key: 'centerLat', type: 'number', label: 'Centre latitude', min: -85, max: 85 },
      { key: 'centerLon', type: 'number', label: 'Centre longitude', min: -180, max: 180 },
      { key: 'zoom', type: 'number', label: 'Zoom', min: 0, max: 18 },
      { key: 'pitch', type: 'number', label: 'Tilt (3D only)', min: 0, max: 85 },
      { key: 'baseTiles', type: 'textarea', label: 'Base tile URL template' },
      { key: 'topoTiles', type: 'textarea', label: 'Topographic tile URL template' },
      { key: 'terrainTiles', type: 'textarea', label: 'Terrain (terrain-RGB) tile URL template' }
    ];
  }

  // ---------- GeoJSON helpers ----------
  function pointsToGeoJSON(points) {
    return {
      type: 'FeatureCollection',
      features: (points || []).map(function(p, i) {
        return {
          type: 'Feature',
          id: i,
          properties: { idx: i, label: p.label || '', partial: !!p.partial },
          geometry: { type: 'Point', coordinates: [Number(p.lon) || 0, Number(p.lat) || 0] }
        };
      })
    };
  }

  // ---------- render ----------
  function renderMapBlock(b) {
    var p = b.props;
    var mode = p.mode === '3d' ? '3d' : (p.mode === 'topo' ? 'topo' : '2d');
    return '<div class="tb-map" data-tb-map-mode="' + mode + '">' +
      '<div class="tb-q"><div class="tb-q-text">' + escMap(p.question || '') + '</div></div>' +
      '<div class="tb-map-frame">' +
      '<div class="tb-map-canvas" data-tb-map="' + b.id + '"></div>' +
      '<div class="tb-map-loading" data-tb-map-loading="' + b.id + '">Loading the map…</div>' +
      '<div class="tb-map-tools">' +
      '<button type="button" class="tb-map-btn" data-tb-map-zoom-in="' + b.id + '" title="Zoom in">＋</button>' +
      '<button type="button" class="tb-map-btn" data-tb-map-zoom-out="' + b.id + '" title="Zoom out">－</button>' +
      '<button type="button" class="tb-map-btn" data-tb-map-reset="' + b.id + '" title="Reset the view">⌂</button>' +
      '<button type="button" class="tb-map-btn" data-tb-map-3d="' + b.id + '" title="Toggle 3D">3D</button>' +
      '</div>' +
      (mode === 'topo' ? '<div class="tb-map-legend"><span>0 m</span><div class="tb-map-ramp"></div><span>3000 m+</span></div>' : '') +
      '</div>' +
      '<div class="tb-map-status" data-tb-map-status="' + b.id + '"></div>' +
      '<button type="button" class="tb-check" data-tb-check="' + b.id + '">Check answer</button>' +
      '<div class="tb-feedback" data-tb-fb="' + b.id + '"></div>' +
      '</div>';
  }

  // ---------- mount ----------
  function mountMapBlock(b, el) {
    var p = b.props;
    var holder = el.querySelector('[data-tb-map="' + b.id + '"]');
    var loading = el.querySelector('[data-tb-map-loading="' + b.id + '"]');
    var statusEl = el.querySelector('[data-tb-map-status="' + b.id + '"]');
    var mode = p.mode === '3d' ? '3d' : (p.mode === 'topo' ? 'topo' : '2d');
    var state = {
      picks: [],           // indices the student has marked
      map: null,
      loaded: false,
      failed: false
    };
    el.__mapState = state;

    function pointList() {
      return Array.isArray(p.points) ? p.points : [];
    }

    function updateStatus() {
      var total = pointList().length;
      if (!total) {
        statusEl.textContent = 'This map has no marked points yet.';
        return;
      }
      statusEl.textContent = state.picks.length + ' of ' + total + ' marked.';
    }

    function refreshMarkers() {
      if (!state.map || !state.loaded) return;
      var src = state.map.getSource('points');
      if (src) src.setData(pointsToGeoJSON(pointList()));
      paintSelection();
    }

    // Selected points are filled, unselected ones hollow.
    function paintSelection() {
      if (!state.map || !state.loaded) return;
      state.picks.forEach(function(idx) {
        try { state.map.setFeatureState({ source: 'points', id: idx }, { picked: true }); } catch (e) { /* not loaded yet */ }
      });
      pointList().forEach(function(pt, i) {
        if (state.picks.indexOf(i) === -1) {
          try { state.map.setFeatureState({ source: 'points', id: i }, { picked: false }); } catch (e) { /* noop */ }
        }
      });
    }

    function togglePick(idx) {
      var at = state.picks.indexOf(idx);
      if (at === -1) state.picks.push(idx);
      else state.picks.splice(at, 1);
      paintSelection();
      updateStatus();
    }

    function buildStyle() {
      var terrain = p.terrainTiles || MAP_TILES.terrain.url;
      var base = {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: [p.baseTiles || MAP_TILES.base.url], tileSize: 256, attribution: MAP_TILES.base.attribution },
          points: { type: 'geojson', data: pointsToGeoJSON(pointList()) }
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#dfe7ef' } },
          { id: 'base', type: 'raster', source: 'base' }
        ]
      };

      if (mode === 'topo') {
        // Topographic tiles instead of the standard base, plus a hillshade so
        // real terrain characteristics are visible.
        base.sources.topo = {
          type: 'raster', tiles: [p.topoTiles || MAP_TILES.topo.url], tileSize: 256,
          attribution: MAP_TILES.topo.attribution
        };
        base.sources.hill = { type: 'raster-dem', tiles: [terrain], tileSize: 256, encoding: 'terrarium', maxzoom: 15 };
        base.layers = [
          { id: 'bg', type: 'background', paint: { 'background-color': '#e8eef4' } },
          { id: 'hillshade', type: 'hillshade', source: 'hill', paint: { 'hillshade-exaggeration': 0.4 } },
          { id: 'topo', type: 'raster', source: 'topo', paint: { 'raster-opacity': 0.82 } }
        ];
      }

      if (mode === '3d') {
        // Real elevation drives the pitch, so mountains actually stand up.
        base.sources.terrain = {
          type: 'raster-dem', tiles: [terrain], tileSize: 256, encoding: 'terrarium', maxzoom: 15
        };
        base.terrain = { source: 'terrain', exaggeration: 1.4 };
        base.sky = {
          attribution: 'Elevation: AWS terrain-RGB',
          'sky-color': '#88b6e8',
          'horizon-color': '#e8eef4',
          'fog-color': '#ffffff',
          'fog-ground-blend': 0.6,
          'horizon-fog-blend': 0.6,
          'sky-horizon-blend': 0.6
        };
        base.layers.push({ id: 'sky', type: 'sky', paint: base.sky });
        base.pitch = Number(p.pitch) || 45;
        base.bearing = Number(p.bearing) || 0;
      }

      // The points layer sits above whatever base is in use.
      base.layers.push({
        id: 'points-hit',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 14,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 0
        }
      });
      base.layers.push({
        id: 'points-ring',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 9,
          'circle-color': 'rgba(255,255,255,0.001)',
          'circle-stroke-color': '#1d4ed8',
          'circle-stroke-width': 2
        }
      });
      base.layers.push({
        id: 'points-dot',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 6,
          'circle-color': ['case', ['boolean', ['feature-state', 'picked'], false], '#1d4ed8', 'rgba(0,0,0,0)']
        }
      });
      base.layers.push({
        id: 'points-label',
        type: 'symbol',
        source: 'points',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
      });
      return base;
    }

    function buildMap() {
      if (state.map || state.failed) return;
      ensureMapLibre().then(function(ml) {
        if (!holder || !holder.isConnected) return;
        try {
          state.map = new ml.Map({
            container: holder,
            style: buildStyle(),
            center: [Number(p.centerLon) || 0, Number(p.centerLat) || 0],
            zoom: Number(p.zoom) || 1.4,
            pitch: mode === '3d' ? (Number(p.pitch) || 45) : 0,
            attributionControl: true
          });
        } catch (e) {
          state.failed = true;
          showFailure(e.message);
          return;
        }
        state.map.addControl(new ml.NavigationControl({ showCompass: mode === '3d' }), 'top-right');
        state.map.on('load', function() {
          state.loaded = true;
          if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
          // Clicking a point toggles it.
          state.map.on('click', 'points-hit', function(e) {
            var f = e.features && e.features[0];
            if (f) togglePick(f.properties.idx);
          });
          state.map.on('mouseenter', 'points-hit', function() { state.map.getCanvas().style.cursor = 'pointer'; });
          state.map.on('mouseleave', 'points-hit', function() { state.map.getCanvas().style.cursor = ''; });
          updateStatus();
        });
        state.map.on('error', function(e) {
          // A tile that will not load should say so rather than fail silently.
          if (e && e.error && /style|json|source/i.test(String(e.error.message || ''))) showFailure('The map tiles could not be loaded.');
        });
      }).catch(function(err) {
        state.failed = true;
        showFailure(err.message);
      });
    }

    function showFailure(msg) {
      if (loading) {
        loading.className = 'tb-map-loading tb-map-failed';
        loading.textContent = msg;
      }
    }

    // ---------- tools ----------
    function each(sel, fn) {
      var nodes = el.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) fn(nodes[i]);
    }
    each('[data-tb-map-zoom-in="' + b.id + '"]', function(btn) {
      btn.addEventListener('click', function() { if (state.map) state.map.zoomIn(); });
    });
    each('[data-tb-map-zoom-out="' + b.id + '"]', function(btn) {
      btn.addEventListener('click', function() { if (state.map) state.map.zoomOut(); });
    });
    each('[data-tb-map-reset="' + b.id + '"]', function(btn) {
      btn.addEventListener('click', function() {
        if (!state.map) return;
        state.map.jumpTo({
          center: [Number(p.centerLon) || 0, Number(p.centerLat) || 0],
          zoom: Number(p.zoom) || 1.4
        });
      });
    });
    each('[data-tb-map-3d="' + b.id + '"]', function(btn) {
      btn.addEventListener('click', function() {
        if (!state.map) return;
        state.map.easeTo({ pitch: state.map.getPitch() > 5 ? 0 : (Number(p.pitch) || 45) });
        btn.classList.toggle('on', state.map.getPitch() > 5);
      });
    });

    // ---------- checking ----------
    function gradePicks() {
      var pts = pointList();
      if (!pts.length) return { score: 0, max: 0, correct: 0, total: 0, fraction: 0 };
      var correct = pts.filter(function(pt, i) { return !!pt.correct && state.picks.indexOf(i) !== -1; });
      var total = pts.filter(function(pt) { return !!pt.correct; });
      var full = p.answerMode !== 'partial';
      var fraction = total.length ? correct.length / total.length : 0;
      return {
        correct: correct.length,
        total: total.length,
        max: total.length,
        fraction: fraction,
        score: full ? (fraction === 1 ? total.length : 0) : correct.length
      };
    }

    el.querySelector('[data-tb-check]').addEventListener('click', function() {
      var fb = el.querySelector('[data-tb-fb]');
      var res = gradePicks();
      if (!res.max) {
        fb.className = 'tb-feedback';
        fb.textContent = 'This map has no answer key yet.';
        return;
      }
      var ok = res.score === res.max;
      fb.className = 'tb-feedback ' + (ok ? 'ok' : 'bad');
      fb.textContent = (ok ? '✓ Correct! ' : '✕ You marked ' + res.correct + ' of ' + res.total + ' correctly. ') +
        (p.reveal ? 'The key is now shown on the map.' : '');
      if (p.reveal && state.map && state.loaded) revealKey();
    });

    function revealKey() {
      var src = state.map.getSource('points');
      if (!src) return;
      var data = pointsToGeoJSON(pointList());
      data.features.forEach(function(f) {
        f.properties.key = !!pointList()[f.properties.idx].correct;
      });
      src.setData(data);
      if (!state.map.getLayer('points-key')) {
        state.map.addLayer({
          id: 'points-key',
          type: 'circle',
          source: 'points',
          filter: ['==', ['get', 'key'], true],
          paint: { 'circle-radius': 7, 'circle-color': '#16a34a', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }
        });
      }
    }

    el.__guess = function() { return state.picks.slice(); };
    updateStatus();
    buildMap();

    el.__stop = function() {
      if (state.map) { try { state.map.remove(); } catch (e) { /* noop */ } state.map = null; }
    };
  }

  function collectMap(b, el) {
    return el.__guess ? el.__guess() : [];
  }

  function gradeMap(b, resp) {
    var picks = Array.isArray(resp) ? resp : [];
    var pts = Array.isArray(b.props.points) ? b.props.points : [];
    var total = 0;
    var correct = 0;
    for (var i = 0; i < pts.length; i++) {
      if (!pts[i].correct) continue;
      total++;
      if (picks.indexOf(i) !== -1) correct++;
    }
    if (!total) return { correct: false, score: 0 };
    var full = b.props.answerMode !== 'partial';
    return {
      // Part credit needs the fraction, which gradeTaskAnswers honours.
      correct: full ? (correct === total) : (correct > 0),
      score: full ? (correct === total ? 1 : 0) : (correct / total)
    };
  }

  // Public registration surface for the shared registry.
  function registerMapBlock(defineBlock) {
    defineBlock('worldmap', {
      label: 'World map', icon: '🗺️', category: 'Geography',
      graded: true, defaultPoints: 2,
      fields: mapFields(),
      defaults: mapDefaults,
      render: renderMapBlock,
      mount: mountMapBlock,
      collect: collectMap,
      grade: gradeMap
    });
  }

  if (typeof defineBlock === 'function' && typeof getBlockDef === 'function' && !getBlockDef('worldmap')) {
    registerMapBlock(defineBlock);
  }
