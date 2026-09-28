// ============================================================
//  TASK BLOCKS — shared registry
//
//  Single source of truth for every block type. Loaded by both the
//  Task Designer Suite (editing) and the student app (viewing +
//  grading) so a block can never render differently in the two.
//
//  A block is:
//    { id, type, props: {...}, points, graded }
//
//  Each type registers:
//    label, icon, category  - palette grouping
//    fields[]               - inspector controls
//    defaults()             - fresh props
//    render(block, ctx)     - HTML
//    mount(block, el, ctx)  - optional interactivity
//    grade(block, resp)     - optional, returns { correct, score }
// ============================================================
      var NOKJ_BLOCKS = {};
      var NOKJ_BLOCK_ORDER = [];

      function defineBlock(type, def) {
        NOKJ_BLOCKS[type] = def;
        NOKJ_BLOCK_ORDER.push(type);
      }

      function getBlockDef(type) {
        return NOKJ_BLOCKS[type] || null;
      }

      function blockCategories() {
        var order = ['Layout', 'Media', 'Question', 'Geography', 'Maths', 'English', 'Game'];
        var seen = {};
        NOKJ_BLOCK_ORDER.forEach(function(t) {
          var c = NOKJ_BLOCKS[t].category;
          if (!seen[c]) { seen[c] = true; order.push(c); }
        });
        return order.filter(function(c) { return seen[c]; });
      }

      function blocksInCategory(cat) {
        return NOKJ_BLOCK_ORDER.filter(function(t) { return NOKJ_BLOCKS[t].category === cat; });
      }

      var BLOCK_ID_SEQ = 0;
      function newBlockId() {
        BLOCK_ID_SEQ += 1;
        return 'b' + Date.now().toString(36) + BLOCK_ID_SEQ.toString(36);
      }

      function makeBlock(type) {
        var def = getBlockDef(type);
        if (!def) return null;
        return {
          id: newBlockId(),
          type: type,
          props: def.defaults ? def.defaults() : {},
          points: def.graded ? (def.defaultPoints || 1) : 0,
          graded: !!def.graded
        };
      }

      // ---------- editing context helpers ----------
      function esc(s) {
        return String(s === undefined || s === null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }

      // Very small subset: **bold**, *italic*, `code`, and line breaks.
      // Deliberately not a full HTML parser.
      function miniMd(s) {
        return esc(s)
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\n/g, '<br/>');
      }

      function randSeed(seed) {
        var s = Math.abs(seed | 0) || 1;
        return function() {
          s = (s * 1664525 + 1013904223) % 4294967296;
          return s / 4294967296;
        };
      }

      // ---------- render a whole document ----------
      // ctx: { editing, selectedId, onSelect, studentAnswer }
      function renderTaskBlocks(blocks, ctx) {
        ctx = ctx || {};
        if (!blocks || !blocks.length) {
          return '<p class="tb-empty">No blocks yet. Add one from the panel.</p>';
        }
        return blocks.map(function(b) {
          var def = getBlockDef(b.type);
          if (!def) {
            return '<div class="tb-unknown">Unknown block: ' + esc(b.type) + '</div>';
          }
          var wrapCls = 'tb-block' + (ctx.editing ? ' tb-editable' : '') +
            (ctx.selectedId === b.id ? ' tb-selected' : '');
          var isCollapsed = !!(ctx.collapsed && ctx.collapsed[b.id]);
          var label = ctx.editing
            ? '<div class="tb-block-bar"><span class="tb-block-name">' +
              '<button type="button" class="tb-collapse" data-tb-collapse="' + b.id + '" title="Fold this block">' +
              (isCollapsed ? '▸' : '▾') + '</button>' +
              def.icon + ' ' + esc(def.label) + '</span>' +
              '<span class="tb-block-tools">' +
              '<button type="button" data-tb-move="up" data-tb-id="' + b.id + '" title="Move up">↑</button>' +
              '<button type="button" data-tb-move="down" data-tb-id="' + b.id + '" title="Move down">↓</button>' +
              '<button type="button" data-tb-dup="' + b.id + '" title="Duplicate">⧉</button>' +
              '<button type="button" data-tb-del="' + b.id + '" title="Delete">✕</button>' +
              '</span></div>'
            : '';
          var bodyHtml = (ctx.editing && isCollapsed) ? '' : def.render(b, ctx);
          return '<div class="' + wrapCls + (isCollapsed ? ' tb-collapsed' : '') + '" data-tb-id="' + b.id +
            '" data-tb-type="' + b.type + '">' +
            label + '<div class="tb-block-body">' + bodyHtml + '</div></div>';
        }).join('');
      }

      // Mount every block that needs behaviour.
      function mountTaskBlocks(root, blocks, ctx) {
        ctx = ctx || {};
        if (!root || !blocks) return;
        blocks.forEach(function(b) {
          var def = getBlockDef(b.type);
          if (!def || !def.mount) return;
          var el = root.querySelector('[data-tb-id="' + b.id + '"] .tb-block-body');
          if (!el) return;
          try { def.mount(b, el, ctx); } catch (e) { /* one bad block must not break the rest */ }
        });
      }

      // Tear down anything a mounted block started (timers, listeners on
      // window). Call this before replacing a rendered document so an
      // animated block cannot keep ticking on a detached node.
      function stopTaskBlocks(root) {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        Array.prototype.forEach.call(root.querySelectorAll('.tb-block-body'), function(el) {
          if (typeof el.__stop === 'function') {
            try { el.__stop(); } catch (e) { /* noop */ }
          }
        });
      }

      // Collect a student's answers from a mounted document.
      function collectTaskAnswers(root, blocks) {
        var out = {};
        (blocks || []).forEach(function(b) {
          var def = getBlockDef(b.type);
          if (!def || !def.collect) return;
          var el = root.querySelector('[data-tb-id="' + b.id + '"] .tb-block-body');
          if (!el) return;
          try { out[b.id] = def.collect(b, el); } catch (e) { out[b.id] = null; }
        });
        return out;
      }

      // Score a document from an already-collected answers map. Kept
      // separate from the DOM so a teacher can re-grade a stored submission
      // later without the student's page being open.
      function gradeTaskAnswers(blocks, answers) {
        var got = 0, max = 0, detail = {};
        (blocks || []).forEach(function(b) {
          var def = getBlockDef(b.type);
          if (!def || !def.grade) return;
          max += (b.points || def.defaultPoints || 1);
          var res = null;
          try { res = def.grade(b, answers ? answers[b.id] : null); } catch (e) { res = { correct: false }; }
          var full = !!(res && res.correct);
          if (full) got += (b.points || def.defaultPoints || 1);
          detail[b.id] = { correct: full, response: answers ? answers[b.id] : null };
        });
        return { score: got, max: max, detail: detail, answers: answers || {} };
      }

      // Score a mounted document. Returns { score, max, detail }.
      function gradeTaskBlocks(root, blocks) {
        return gradeTaskAnswers(blocks, collectTaskAnswers(root, blocks));
      }

      function blockTotalPoints(blocks) {
        return (blocks || []).reduce(function(sum, b) {
          return sum + (b.points || 0);
        }, 0);
      }
