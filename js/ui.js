/* =====================================================================
   LEVELING - UI Renderers
   All 12 page renderers + overlays, quick log, onboarding, level-up
   ===================================================================== */
(function (LV) {
  'use strict';

  var D = LV.Data;
  var G = LV.Game;
  var t = LV.t;
  var AREAS = D.AREAS;
  var AREA_KEYS = D.AREA_KEYS;

  /* helpers */
  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function pct(v, max) { return max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0; }
  function questText(q) {
    var lang = LV.i18n.getLang();
    if (typeof q.text === 'object') return q.text[lang] || q.text.en || '';
    return q.text || '';
  }
  function areaInfo(key) { return D.area(key) || { icon: '', color: '#888' }; }

  /* ======================== DASHBOARD ======================== */
  function renderDashboard(view) {
    var s = D.get();
    var power = G.totalPower();
    var ri = G.nextRankInfo();
    var pet = G.petInfo();
    var q = G.quote();
    var streak = s.streak.current || 0;
    var quests = (s.quests.daily || []).slice(0, 3);

    var html = '<div class="hero"><div class="hero-bg"></div><div class="hero-row">';
    html += '<div class="power-num">' + power + '</div>';
    html += '<div class="power-label">' + t('total_power') + '</div>';
    html += '</div><div class="tag-rank">' + ri.current.emoji + ' ' + t(ri.current.key) + '</div></div>';

    /* area tiles */
    html += '<div class="area-tiles">';
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      var p = G.areaProgress(a.key);
      html += '<div class="area-tile area-' + a.key + '" data-area="' + a.key + '">';
      html += '<span class="at-ico">' + a.icon + '</span>';
      html += '<span class="at-lvl">' + p.level + '</span>';
      html += '<span class="at-name">' + t('area_' + a.key) + '</span>';
      html += '<div class="bar"><div class="bar-fill" style="width:' + Math.round(p.pct) + '%"></div></div>';
      html += '</div>';
    }
    html += '</div>';

    /* radar chart */
    html += '<div class="card"><h3>' + t('life_balance') + '</h3><canvas id="dash-radar" width="280" height="280"></canvas></div>';

    /* quests */
    html += '<div class="card"><h3>' + t('todays_quests') + '</h3>';
    for (var j = 0; j < quests.length; j++) {
      var qst = quests[j];
      html += '<div class="quest-mini' + (qst.done ? ' done' : '') + '" data-qid="' + qst.id + '">';
      html += '<span class="q-check">' + (qst.done ? '&#10003;' : '&#9675;') + '</span>';
      html += '<span class="q-text">' + esc(questText(qst)) + '</span>';
      html += '<span class="q-xp">+' + qst.xp + '</span>';
      html += '</div>';
    }
    html += '</div>';

    /* streak */
    html += '<div class="card"><div class="streak-flame">' + (streak >= 3 ? '&#128293;' : '&#9723;') + '</div>';
    html += '<div class="streak-num">' + streak + ' ' + t('days') + '</div></div>';

    /* pet */
    html += '<div class="card pet-card"><h3>' + t('your_pet') + '</h3>';
    html += '<div class="pet-avatar">' + pet.emoji + '</div>';
    html += '<div class="pet-bars">';
    html += '<div class="pet-stat"><span>' + t('happiness') + '</span><div class="bar"><div class="bar-fill" style="width:' + pet.happiness + '%"></div></div></div>';
    html += '<div class="pet-stat"><span>' + t('energy') + '</span><div class="bar"><div class="bar-fill" style="width:' + pet.energy + '%"></div></div></div>';
    html += '</div></div>';

    /* daily boss */
    if (s.settings.plusMode && s.dailyBoss && s.dailyBoss.date) {
      var db = s.dailyBoss;
      var dbPct = db.hpMax > 0 ? pct(db.hp, db.hpMax) : 0;
      html += '<div class="card"><h3>' + t('daily_boss') + '</h3>';
      html += '<div class="boss-card mini">';
      html += '<span>' + esc(db.name) + '</span>';
      html += '<div class="boss-hp"><div class="bar-fill" style="width:' + dbPct + '%"></div></div>';
      html += '<span>' + db.hp + '/' + db.hpMax + ' HP</span>';
      if (db.defeated) html += '<span class="tag-rank">' + t('defeated') + '</span>';
      html += '</div></div>';
    }

    /* quote */
    html += '<div class="card quote-card"><p>"' + esc(q.text) + '"</p><cite>- ' + esc(q.by) + '</cite></div>';

    /* wins feed */
    html += '<div class="card"><h3>' + t('todays_wins') + '</h3>';
    var today = LV.util.todayStr();
    var wins = s.log.filter(function(e) { return e.xp > 0 && LV.util.todayStr(new Date(e.ts)) === today; }).slice(-5).reverse();
    if (wins.length === 0) { html += '<p class="muted">' + t('no_wins') + '</p>'; }
    else { for (var w = 0; w < wins.length; w++) { var wi = wins[w]; var ai = areaInfo(wi.area); html += '<div class="win-feed-item"><span>' + ai.icon + '</span><span>+' + wi.xp + ' XP</span></div>'; } }
    html += '</div>';

    view.innerHTML = html;

    /* draw radar */
    setTimeout(function() {
      var c = document.getElementById('dash-radar');
      if (c && LV.Charts && LV.Charts.radar) {
        var labels = AREA_KEYS.map(function(k) { return t('area_' + k); });
        var data = AREA_KEYS.map(function(k) { return G.areaLevel(k); });
        LV.Charts.radar(c, labels, data);
      }
    }, 50);
  }

  /* ======================== SKILL TREE ======================== */
  function renderSkills(view) {
    var html = '<div class="page-head"><h2>' + t('nav_skills') + '</h2><p class="muted">' + t('skill_tree_intro') + '</p></div>';
    html += '<div class="branches">';
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      var p = G.areaProgress(a.key);
      var subs = D.SUBSKILLS[a.key] || [];
      var dimClass = p.level < 2 ? ' dim' : '';
      var glowClass = p.level >= 10 ? ' glow' : '';
      html += '<div class="branch area-' + a.key + dimClass + glowClass + '" data-area="' + a.key + '">';
      html += '<div class="branch-head"><span class="branch-ico">' + a.icon + '</span>';
      html += '<div class="branch-main"><span class="branch-name">' + t('area_' + a.key) + '</span>';
      html += '<span class="branch-lvl">' + t('lvl') + ' ' + p.level + '</span></div>';
      html += '<div class="bar"><div class="bar-fill" style="width:' + Math.round(p.pct) + '%"></div></div></div>';
      html += '<div class="branch-body">';
      for (var j = 0; j < subs.length; j++) {
        var sk = subs[j];
        var sl = G.subLevel(a.key, sk);
        html += '<div class="subskill"><span class="ss-name">' + (D.SUBSKILL_LABELS[sk] || sk) + '</span>';
        html += '<span class="ss-lvl">' + sl.level + '</span>';
        html += '<div class="bar"><div class="bar-fill" style="width:' + Math.round(sl.pct) + '%"></div></div></div>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    view.innerHTML = html;

    view.addEventListener('click', function(e) {
      var head = e.target.closest('.branch-head');
      if (head) { var branch = head.closest('.branch'); if (branch) branch.classList.toggle('open'); }
    });
  }

  /* ======================== BOSSES ======================== */
  function renderBosses(view) {
    var s = D.get();
    var bosses = s.bosses || [];
    var html = '<div class="page-head"><h2>' + t('nav_bosses') + '</h2>';
    html += '<button class="btn btn-primary" id="new-boss-btn">' + t('new_boss') + '</button></div>';

    /* daily boss */
    if (s.settings.plusMode && s.dailyBoss && s.dailyBoss.date === LV.util.todayStr()) {
      var db = s.dailyBoss;
      var dbPct = pct(db.hp, db.hpMax);
      html += '<div class="card"><h3>' + t('daily_boss') + '</h3>';
      html += '<div class="boss-card' + (db.defeated ? ' boss-defeated' : '') + '">';
      html += '<span class="boss-name">' + esc(db.name) + '</span>';
      html += '<div class="boss-hp"><div class="bar-fill" style="width:' + dbPct + '%"></div></div>';
      html += '<span class="boss-hp-text">' + db.hp + ' / ' + db.hpMax + '</span>';
      if (db.defeated) html += '<span class="tag-rank">' + t('defeated') + '</span>';
      else html += '<button class="btn btn-sm" data-daily-strike="20">' + t('deal_damage') + ' (20)</button>';
      html += '</div></div>';
    }

    /* user bosses */
    if (bosses.length === 0) {
      html += '<p class="muted">' + t('no_bosses') + '</p>';
    } else {
      for (var i = 0; i < bosses.length; i++) {
        var b = bosses[i];
        var bPct = pct(b.hp, b.hpMax);
        var ai = areaInfo(b.area);
        html += '<div class="boss-card card area-' + b.area + (b.defeatedAt ? ' boss-defeated' : '') + '" data-bid="' + b.id + '">';
        html += '<div class="boss-top"><span>' + ai.icon + ' ' + esc(b.name) + '</span>';
        html += '<span class="tier-pill tier-' + b.tier + '">' + t('tier_' + b.tier) + '</span></div>';
        html += '<div class="boss-hp"><div class="bar-fill" style="width:' + bPct + '%"></div></div>';
        html += '<span class="boss-hp-text">' + b.hp + ' / ' + b.hpMax + ' HP</span>';
        if (b.defeatedAt) html += '<span class="tag-rank">' + t('defeated') + '</span>';
        else html += '<button class="btn btn-sm" data-boss-hit="' + b.id + '">' + t('deal_damage') + '</button>';
        html += '</div>';
      }
    }
    view.innerHTML = html;

    view.addEventListener('click', function(e) {
      if (e.target.id === 'new-boss-btn') { showNewBossModal(); return; }
      var hitBtn = e.target.closest('[data-boss-hit]');
      if (hitBtn) { G.dealBossDamage(hitBtn.dataset.bossHit, 25); renderBosses(view); return; }
      var dailyBtn = e.target.closest('[data-daily-strike]');
      if (dailyBtn) { G.strikeDailyBoss(parseInt(dailyBtn.dataset.dailyStrike, 10)); renderBosses(view); return; }
    });
  }

  function showNewBossModal() {
    var html = '<h3>' + t('new_boss') + '</h3>';
    html += '<input id="boss-name" class="input" placeholder="Boss name" />';
    html += '<div class="field"><label>' + t('area_body') + '</label><select id="boss-area" class="input">';
    for (var i = 0; i < AREAS.length; i++) { html += '<option value="' + AREAS[i].key + '">' + AREAS[i].icon + ' ' + t('area_' + AREAS[i].key) + '</option>'; }
    html += '</select></div>';
    html += '<div class="field"><label>Tier</label><select id="boss-tier" class="input"><option value="mini">' + t('tier_mini') + '</option><option value="elite">' + t('tier_elite') + '</option><option value="epic">' + t('tier_epic') + '</option><option value="legendary">' + t('tier_legendary') + '</option></select></div>';
    html += '<button class="btn btn-primary" id="boss-create-btn">' + t('create') + '</button>';
    LV.Core.showModal(html);
    setTimeout(function() {
      var btn = document.getElementById('boss-create-btn');
      if (btn) btn.addEventListener('click', function() {
        var name = (document.getElementById('boss-name') || {}).value || 'New Boss';
        var area = (document.getElementById('boss-area') || {}).value || 'body';
        var tier = (document.getElementById('boss-tier') || {}).value || 'mini';
        G.createBoss({ name: name, area: area, tier: tier });
        LV.Core.hideModal();
        LV.Core.navigate('bosses');
      });
    }, 50);
  }

  /* ======================== QUESTS ======================== */
  function renderQuests(view) {
    var s = D.get();
    var tabs = ['daily', 'weekly', 'monthly', 'epic', 'hidden'];
    var activeTab = view.dataset.questTab || 'daily';

    var html = '<div class="page-head"><h2>' + t('nav_quests') + '</h2></div>';
    html += '<div class="segment" id="quest-tabs">';
    for (var i = 0; i < tabs.length; i++) {
      html += '<button class="seg-btn' + (tabs[i] === activeTab ? ' active' : '') + '" data-tab="' + tabs[i] + '">' + t(tabs[i]) + '</button>';
    }
    html += '</div>';

    var list = [];
    if (activeTab === 'epic') list = s.quests.epic || [];
    else if (activeTab === 'hidden') list = s.quests.hidden || [];
    else list = s.quests[activeTab] || [];

    html += '<div class="quest-list">';
    if (activeTab === 'hidden') {
      for (var h = 0; h < G.HIDDEN.length; h++) {
        var hd = G.HIDDEN[h];
        var unlocked = list.some(function(x) { return x.id === hd.id; });
        var lang = LV.i18n.getLang();
        html += '<div class="quest-card' + (unlocked ? ' done' : ' locked') + '">';
        html += '<span class="quest-type-dot qt-hidden"></span>';
        html += '<span>' + hd.icon + ' ' + (unlocked ? (hd.name[lang] || hd.name.en) : '???') + '</span>';
        html += '<span class="q-xp">+' + hd.xp + '</span></div>';
      }
    } else if (activeTab === 'epic') {
      for (var e = 0; e < list.length; e++) {
        var ep = list[e];
        var epProg = G.epicProgress(ep);
        html += '<div class="quest-card' + (ep.done ? ' done' : '') + '">';
        html += '<span class="quest-type-dot qt-epic"></span>';
        html += '<span>' + esc(questText(ep)) + '</span>';
        html += '<div class="quest-progress-row"><div class="bar"><div class="bar-fill" style="width:' + Math.round(epProg.pct) + '%"></div></div>';
        html += '<span>' + epProg.value + '/' + ep.target + '</span></div>';
        html += '<span class="q-xp">+' + ep.xp + '</span></div>';
      }
    } else {
      for (var k = 0; k < list.length; k++) {
        var qst = list[k];
        var qPct = pct(qst.progress, qst.target);
        html += '<div class="quest-card' + (qst.done ? ' done' : '') + '">';
        html += '<span class="quest-type-dot qt-' + activeTab + '"></span>';
        html += '<span>' + esc(questText(qst)) + '</span>';
        html += '<div class="quest-progress-row"><div class="bar"><div class="bar-fill" style="width:' + qPct + '%"></div></div>';
        html += '<span>' + qst.progress + '/' + qst.target + '</span></div>';
        html += '<span class="q-xp">+' + qst.xp + ' XP</span></div>';
      }
    }
    html += '</div>';
    view.innerHTML = html;

    document.getElementById('quest-tabs').addEventListener('click', function(e) {
      var btn = e.target.closest('.seg-btn');
      if (btn) { view.dataset.questTab = btn.dataset.tab; renderQuests(view); }
    });
  }

  /* ======================== CHARACTER ======================== */
  function renderCharacter(view) {
    var s = D.get();
    var m = G.metrics();
    var ri = G.nextRankInfo();
    var avatar = G.avatarFor();

    var html = '<div class="char-hero">';
    html += '<div class="char-avatar">' + avatar + '</div>';
    html += '<div class="char-name">' + esc(s.profile.name) + '</div>';
    html += '<div class="tag-rank">' + ri.current.emoji + ' ' + t(ri.current.key) + '</div>';
    if (s.profile.titleEquipped) html += '<div class="char-title">' + G.titleName(s.profile.titleEquipped) + '</div>';
    html += '</div>';

    /* stat lines */
    html += '<div class="stat-lines">';
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i]; var p = G.areaProgress(a.key);
      html += '<div class="stat-line area-' + a.key + '">';
      html += '<span class="stat-ico">' + a.icon + '</span>';
      html += '<span class="stat-name">' + t('area_' + a.key) + '</span>';
      html += '<div class="bar"><div class="bar-fill" style="width:' + Math.round(p.pct) + '%"></div></div>';
      html += '<span class="stat-lvl">' + p.level + '</span></div>';
    }
    html += '</div>';

    /* lifetime stats */
    html += '<div class="card"><h3>' + t('lifetime_stats') + '</h3><div class="stats-grid">';
    html += '<div><strong>' + m.totalXP + '</strong><span>' + t('total_xp') + '</span></div>';
    html += '<div><strong>' + m.daysActive + '</strong><span>' + t('days_active') + '</span></div>';
    html += '<div><strong>' + m.longest + '</strong><span>' + t('longest_streak') + '</span></div>';
    html += '<div><strong>' + m.bossesDefeated + '</strong><span>' + t('boss_defeated') + '</span></div>';
    html += '<div><strong>' + m.tasksCompleted + '</strong><span>' + t('nav_tasks') + '</span></div>';
    html += '<div><strong>' + m.focusMinutes + '</strong><span>' + t('minutes') + '</span></div>';
    html += '</div></div>';

    /* titles */
    html += '<div class="card"><h3>' + t('titles') + '</h3><div class="titles-list">';
    for (var j = 0; j < G.TITLES.length; j++) {
      var td = G.TITLES[j];
      var owned = s.titles.indexOf(td.id) >= 0;
      var equipped = s.profile.titleEquipped === td.id;
      html += '<span class="title-chip' + (equipped ? ' equipped' : '') + (!owned ? ' locked' : '') + '" data-tid="' + td.id + '">';
      html += G.titleName(td.id);
      if (equipped) html += ' (' + t('equipped') + ')';
      html += '</span>';
    }
    html += '</div></div>';

    view.innerHTML = html;

    view.addEventListener('click', function(e) {
      var chip = e.target.closest('.title-chip');
      if (chip && !chip.classList.contains('locked')) {
        s.profile.titleEquipped = chip.dataset.tid;
        D.save();
        renderCharacter(view);
      }
    });
  }

  /* ======================== HABITS ======================== */
  function renderHabits(view) {
    var s = D.get();
    var habits = s.habits || [];
    var html = '<div class="page-head"><h2>' + t('nav_habits') + '</h2>';
    html += '<button class="btn btn-primary" id="new-habit-btn">' + t('new_habit') + '</button></div>';

    if (habits.length === 0) {
      html += '<p class="muted">' + t('no_habits') + '</p>';
    } else {
      html += '<div class="habit-list">';
      for (var i = 0; i < habits.length; i++) {
        var h = habits[i];
        var done = G.isHabitDoneToday(h);
        var ai = areaInfo(h.area);
        html += '<div class="habit-row area-' + h.area + '">';
        html += '<button class="habit-check' + (done ? ' done' : '') + '" data-hid="' + h.id + '">' + (done ? '&#10003;' : '') + '</button>';
        html += '<span class="habit-name">' + ai.icon + ' ' + esc(h.name) + '</span>';
        if (h.streak > 0) html += '<span class="streak-badge">' + h.streak + '&#128293;</span>';
        html += '<button class="btn-icon habit-del" data-hdel="' + h.id + '">&#128465;</button>';
        html += '</div>';
      }
      html += '</div>';
    }

    /* heatmap */
    html += '<div class="card"><h3>Heatmap</h3><div class="heatmap">';
    var today = LV.util.todayStr();
    for (var d = 89; d >= 0; d--) {
      var ds = LV.util.dateAdd(today, -d);
      var count = 0;
      for (var hi = 0; hi < habits.length; hi++) { if (habits[hi].history && habits[hi].history[ds]) count++; }
      var lvl = count === 0 ? 0 : count <= 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 3 : 4;
      html += '<div class="heat-cell heat-' + lvl + '" title="' + ds + ': ' + count + '"></div>';
    }
    html += '</div></div>';

    view.innerHTML = html;

    view.addEventListener('click', function(e) {
      if (e.target.id === 'new-habit-btn') { showNewHabitModal(); return; }
      var chk = e.target.closest('.habit-check');
      if (chk) { G.toggleHabit(chk.dataset.hid); renderHabits(view); return; }
      var del = e.target.closest('[data-hdel]');
      if (del) { G.removeHabit(del.dataset.hdel); renderHabits(view); return; }
    });
  }

  function showNewHabitModal() {
    var html = '<h3>' + t('new_habit') + '</h3>';
    html += '<input id="habit-name" class="input" placeholder="' + t('new_habit') + '" />';
    html += '<div class="field"><select id="habit-area" class="input">';
    for (var i = 0; i < AREAS.length; i++) { html += '<option value="' + AREAS[i].key + '">' + AREAS[i].icon + ' ' + t('area_' + AREAS[i].key) + '</option>'; }
    html += '</select></div>';
    html += '<div class="field"><select id="habit-diff" class="input"><option value="easy">' + t('easy') + '</option><option value="medium" selected>' + t('medium') + '</option><option value="hard">' + t('hard') + '</option></select></div>';
    html += '<button class="btn btn-sm" id="habit-tpl-btn">' + t('habit_templates') + '</button>';
    html += '<div id="habit-tpl-list" class="hidden"></div>';
    html += '<button class="btn btn-primary" id="habit-save-btn">' + t('create') + '</button>';
    LV.Core.showModal(html);
    setTimeout(function() {
      var saveBtn = document.getElementById('habit-save-btn');
      if (saveBtn) saveBtn.addEventListener('click', function() {
        var name = (document.getElementById('habit-name') || {}).value;
        var area = (document.getElementById('habit-area') || {}).value || 'body';
        var diff = (document.getElementById('habit-diff') || {}).value || 'medium';
        if (name) { G.addHabit({ name: name, area: area, difficulty: diff }); LV.Core.hideModal(); LV.Core.navigate('habits'); }
      });
      var tplBtn = document.getElementById('habit-tpl-btn');
      if (tplBtn) tplBtn.addEventListener('click', function() {
        var listEl = document.getElementById('habit-tpl-list');
        if (!listEl) return;
        listEl.classList.toggle('hidden');
        if (listEl.innerHTML) return;
        var tplHtml = '';
        var tpls = D.HABIT_TEMPLATES;
        for (var j = 0; j < tpls.length; j++) {
          tplHtml += '<div class="tpl-item" data-idx="' + j + '">' + esc(tpls[j].name) + '</div>';
        }
        listEl.innerHTML = tplHtml;
        listEl.addEventListener('click', function(e2) {
          var item = e2.target.closest('.tpl-item');
          if (item) {
            var tpl = tpls[parseInt(item.dataset.idx, 10)];
            var nameEl = document.getElementById('habit-name');
            var areaEl = document.getElementById('habit-area');
            var diffEl = document.getElementById('habit-diff');
            if (nameEl) nameEl.value = tpl.name;
            if (areaEl) areaEl.value = tpl.area;
            if (diffEl) diffEl.value = tpl.difficulty;
          }
        });
      });
    }, 50);
  }

  /* ======================== TASKS ======================== */
  function renderTasks(view) {
    var s = D.get();
    var tasks = s.tasks || [];
    var mode = view.dataset.taskView || 'list_view';

    var html = '<div class="page-head"><h2>' + t('nav_tasks') + '</h2>';
    html += '<button class="btn btn-primary" id="new-task-btn">' + t('new_task') + '</button></div>';
    html += '<div class="segment" id="task-view-toggle">';
    html += '<button class="seg-btn' + (mode === 'list_view' ? ' active' : '') + '" data-mode="list_view">' + t('list_view') + '</button>';
    html += '<button class="seg-btn' + (mode === 'board_view' ? ' active' : '') + '" data-mode="board_view">' + t('board_view') + '</button>';
    html += '</div>';

    if (tasks.length === 0) {
      html += '<p class="muted">' + t('no_tasks') + '</p>';
    } else if (mode === 'list_view') {
      html += '<div class="task-list">';
      for (var i = 0; i < tasks.length; i++) {
        var tk = tasks[i];
        var ai = areaInfo(tk.area);
        html += '<div class="task-row' + (tk.done ? ' done' : '') + '">';
        html += '<span class="prio-dot prio-' + tk.priority + '"></span>';
        html += '<button class="habit-check' + (tk.done ? ' done' : '') + '" data-tid="' + tk.id + '">' + (tk.done ? '&#10003;' : '') + '</button>';
        html += '<span>' + ai.icon + ' ' + esc(tk.title) + '</span>';
        html += '<button class="btn-icon" data-tdel="' + tk.id + '">&#128465;</button>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      var cols = { todo: [], in_progress: [], done: [] };
      for (var j = 0; j < tasks.length; j++) { var st = tasks[j].status || 'todo'; if (!cols[st]) cols[st] = []; cols[st].push(tasks[j]); }
      html += '<div class="kanban">';
      var colNames = ['todo', 'in_progress', 'done'];
      for (var c = 0; c < colNames.length; c++) {
        var cn = colNames[c];
        html += '<div class="kanban-col"><h4>' + t(cn) + '</h4>';
        var items = cols[cn] || [];
        for (var k = 0; k < items.length; k++) {
          var it = items[k];
          html += '<div class="task-card card" data-tid="' + it.id + '"><span class="prio-dot prio-' + it.priority + '"></span> ' + esc(it.title) + '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    view.innerHTML = html;

    view.addEventListener('click', function(e) {
      if (e.target.id === 'new-task-btn') { showNewTaskModal(); return; }
      var toggle = e.target.closest('#task-view-toggle .seg-btn');
      if (toggle) { view.dataset.taskView = toggle.dataset.mode; renderTasks(view); return; }
      var chk = e.target.closest('[data-tid]');
      if (chk && chk.classList.contains('habit-check')) { G.toggleTask(chk.dataset.tid); renderTasks(view); return; }
      var del = e.target.closest('[data-tdel]');
      if (del) { G.removeTask(del.dataset.tdel); renderTasks(view); return; }
      var card = e.target.closest('.task-card[data-tid]');
      if (card) { G.toggleTask(card.dataset.tid); renderTasks(view); return; }
    });
  }

  function showNewTaskModal() {
    var html = '<h3>' + t('new_task') + '</h3>';
    html += '<input id="task-title" class="input" placeholder="' + t('new_task') + '" />';
    html += '<div class="field"><select id="task-area" class="input">';
    for (var i = 0; i < AREAS.length; i++) { html += '<option value="' + AREAS[i].key + '">' + AREAS[i].icon + ' ' + t('area_' + AREAS[i].key) + '</option>'; }
    html += '</select></div>';
    html += '<div class="field"><select id="task-prio" class="input"><option value="low">' + t('low') + '</option><option value="medium" selected>' + t('medium') + '</option><option value="high">' + t('high') + '</option></select></div>';
    html += '<button class="btn btn-primary" id="task-save-btn">' + t('create') + '</button>';
    LV.Core.showModal(html);
    setTimeout(function() {
      var btn = document.getElementById('task-save-btn');
      if (btn) btn.addEventListener('click', function() {
        var title = (document.getElementById('task-title') || {}).value;
        var area = (document.getElementById('task-area') || {}).value || 'mind';
        var prio = (document.getElementById('task-prio') || {}).value || 'medium';
        if (title) { G.addTask({ title: title, area: area, priority: prio }); LV.Core.hideModal(); LV.Core.navigate('tasks'); }
      });
    }, 50);
  }

  /* ======================== FOCUS ======================== */
  var focusTimer = null;
  var focusSeconds = 0;
  var focusDuration = 25 * 60;
  var focusRunning = false;

  function renderFocus(view) {
    var html = '<div class="page-head"><h2>' + t('nav_focus') + '</h2></div>';
    html += '<div class="card"><p>' + t('focus_intro') + '</p>';
    html += '<button class="btn btn-primary" id="open-focus-btn">' + t('start') + ' ' + t('focus_session') + '</button></div>';
    view.innerHTML = html;
    document.getElementById('open-focus-btn').addEventListener('click', function() { openFocusOverlay(); });
  }

  function openFocusOverlay() {
    var overlay = document.getElementById('focus-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    focusSeconds = focusDuration;
    focusRunning = false;
    var html = '<button class="focus-close" id="focus-close-btn">&times;</button>';
    html += '<div class="focus-ring" id="focus-ring" style="--p:100"><div class="focus-timer" id="focus-timer">' + fmtTime(focusSeconds) + '</div></div>';
    html += '<div class="focus-controls">';
    html += '<button class="btn" id="focus-start-btn">' + t('start') + '</button>';
    html += '<button class="btn" id="focus-pause-btn">' + t('pause') + '</button>';
    html += '<button class="btn" id="focus-reset-btn">' + t('reset') + '</button>';
    html += '</div>';
    html += '<div class="sound-grid">';
    var sounds = ['rain', 'forest', 'ocean', 'cafe', 'white', 'pink'];
    for (var i = 0; i < sounds.length; i++) {
      var sn = sounds[i];
      var active = LV.Audio.currentAmbient && LV.Audio.currentAmbient() === sn;
      html += '<button class="sound-btn' + (active ? ' active' : '') + '" data-snd="' + sn + '">' + sn + '</button>';
    }
    html += '</div>';
    overlay.innerHTML = html;
    document.getElementById('focus-close-btn').addEventListener('click', closeFocusOverlay);
    document.getElementById('focus-start-btn').addEventListener('click', startFocus);
    document.getElementById('focus-pause-btn').addEventListener('click', pauseFocus);
    document.getElementById('focus-reset-btn').addEventListener('click', resetFocus);
    overlay.querySelector('.sound-grid').addEventListener('click', function(e) {
      var btn = e.target.closest('.sound-btn');
      if (!btn) return;
      var snd = btn.dataset.snd;
      if (btn.classList.contains('active')) { LV.Audio.stopAmbient(); btn.classList.remove('active'); }
      else {
        var allBtns = overlay.querySelectorAll('.sound-btn');
        for (var j = 0; j < allBtns.length; j++) allBtns[j].classList.remove('active');
        LV.Audio.startAmbient(snd); btn.classList.add('active');
      }
    });
  }

  function fmtTime(sec) { var m = Math.floor(sec / 60); var s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  function startFocus() {
    if (focusRunning) return;
    focusRunning = true;
    focusTimer = setInterval(function() {
      focusSeconds--;
      updateFocusDisplay();
      if (focusSeconds <= 0) {
        clearInterval(focusTimer); focusTimer = null; focusRunning = false;
        G.recordFocus(Math.round(focusDuration / 60));
        LV.Audio.play('levelup');
        LV.Core.showToast({ icon: '&#127919;', text: t('done') + '! +' + Math.round(focusDuration / 60 * 1.2) + ' XP' });
        closeFocusOverlay();
      }
    }, 1000);
  }
  function pauseFocus() { if (focusTimer) { clearInterval(focusTimer); focusTimer = null; focusRunning = false; } }
  function resetFocus() { pauseFocus(); focusSeconds = focusDuration; updateFocusDisplay(); }
  function updateFocusDisplay() {
    var el = document.getElementById('focus-timer');
    if (el) el.textContent = fmtTime(focusSeconds);
    var ring = document.getElementById('focus-ring');
    if (ring) ring.style.setProperty('--p', Math.round((focusSeconds / focusDuration) * 100));
  }
  function closeFocusOverlay() {
    pauseFocus(); LV.Audio.stopAmbient();
    var overlay = document.getElementById('focus-overlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.innerHTML = ''; }
  }

  /* ======================== ANALYTICS ======================== */
  function renderAnalytics(view) {
    var m = G.metrics();
    var html = '<div class="page-head"><h2>' + t('nav_analytics') + '</h2></div>';
    html += '<div class="card"><h3>' + t('area_balance') + '</h3><canvas id="analytics-radar" width="280" height="280"></canvas></div>';
    html += '<div class="card"><h3>' + t('xp_over_time') + '</h3><canvas id="analytics-line" width="400" height="200"></canvas></div>';
    html += '<div class="card"><h3>' + t('total_power') + '</h3><canvas id="analytics-pie" width="280" height="280"></canvas></div>';
    html += '<div class="card"><h3>' + t('insights') + '</h3>';
    html += '<p>' + t('best_area') + ': ' + areaInfo(m.best).icon + ' ' + t('area_' + m.best) + ' (' + t('lvl') + ' ' + m.areaLevels[m.best] + ')</p>';
    html += '<p>' + t('weakest_area') + ': ' + areaInfo(m.worst).icon + ' ' + t('area_' + m.worst) + ' (' + t('lvl') + ' ' + m.areaLevels[m.worst] + ')</p>';
    html += '<p>' + t('life_balance') + ': ' + m.balance + '%</p></div>';
    view.innerHTML = html;
    setTimeout(function() {
      var rc = document.getElementById('analytics-radar');
      if (rc && LV.Charts.radar) {
        var labels = AREA_KEYS.map(function(k) { return t('area_' + k); });
        var data = AREA_KEYS.map(function(k) { return G.areaLevel(k); });
        LV.Charts.radar(rc, labels, data);
      }
      var lc = document.getElementById('analytics-line');
      if (lc && LV.Charts.line) {
        var xpData = G.xpByDay(14);
        var lLabels = xpData.map(function(d) { return d.date.slice(5); });
        var lData = xpData.map(function(d) { return d.xp; });
        LV.Charts.line(lc, lLabels, lData);
      }
      var pc = document.getElementById('analytics-pie');
      if (pc && LV.Charts.pie) {
        var pLabels = AREA_KEYS.map(function(k) { return t('area_' + k); });
        var pData = AREA_KEYS.map(function(k) { return G.areaXP(k); });
        var pColors = AREAS.map(function(ar) { return ar.color; });
        LV.Charts.pie(pc, pLabels, pData, pColors);
      }
    }, 50);
  }

  /* ======================== ACHIEVEMENTS ======================== */
  function renderAchievements(view) {
    var s = D.get();
    var lang = LV.i18n.getLang();
    var html = '<div class="page-head"><h2>' + t('nav_achievements') + '</h2></div><div class="grid-auto">';
    for (var i = 0; i < G.ACH.length; i++) {
      var ac = G.ACH[i];
      var unlocked = !!s.achievements[ac.id];
      var name = (ac.name && (ac.name[lang] || ac.name.en)) || ac.id;
      var desc = (ac.desc && (ac.desc[lang] || ac.desc.en)) || '';
      html += '<div class="ach-card rarity-' + ac.rarity + (unlocked ? '' : ' locked') + '">';
      html += '<span class="a-ico">' + ac.icon + '</span>';
      html += '<span class="a-name">' + esc(name) + '</span>';
      html += '<span class="a-desc">' + esc(desc) + '</span></div>';
    }
    html += '</div>';
    view.innerHTML = html;
  }

  /* ======================== SHOP ======================== */
  function renderShop(view) {
    var s = D.get();
    var shopItems = [
      { id: 'theme_neon', name: 'Neon Theme', icon: '&#127752;', price: 100, cat: 'themes' },
      { id: 'theme_ocean', name: 'Ocean Theme', icon: '&#127754;', price: 100, cat: 'themes' },
      { id: 'theme_sunset', name: 'Sunset Theme', icon: '&#127749;', price: 100, cat: 'themes' },
      { id: 'pet_dragon', name: 'Dragon Skin', icon: '&#128009;', price: 200, cat: 'pet_skins' },
      { id: 'pet_phoenix', name: 'Phoenix Skin', icon: '&#128038;', price: 200, cat: 'pet_skins' },
      { id: 'frame_gold', name: 'Gold Frame', icon: '&#128293;', price: 150, cat: 'avatar_frames' },
      { id: 'frame_diamond', name: 'Diamond Frame', icon: '&#128142;', price: 250, cat: 'avatar_frames' },
      { id: 'sound_lo', name: 'Lo-Fi Pack', icon: '&#127925;', price: 80, cat: 'sound_packs' },
      { id: 'sound_nature', name: 'Nature Pack', icon: '&#127795;', price: 80, cat: 'sound_packs' }
    ];
    var html = '<div class="page-head"><h2>' + t('nav_shop') + '</h2>';
    html += '<div class="coin-pill"><span class="pill-ico">&#129689;</span><span>' + s.coins + '</span></div></div>';
    html += '<div class="grid-auto">';
    for (var i = 0; i < shopItems.length; i++) {
      var item = shopItems[i];
      var owned = (s.shop.owned || []).indexOf(item.id) >= 0;
      html += '<div class="shop-item' + (owned ? ' owned' : '') + '" data-sid="' + item.id + '" data-price="' + item.price + '">';
      html += '<span class="si-ico">' + item.icon + '</span>';
      html += '<span class="si-name">' + item.name + '</span>';
      html += '<span class="si-price">' + (owned ? t('owned') : '&#129689; ' + item.price) + '</span>';
      if (!owned) html += '<button class="btn btn-sm">' + t('buy') + '</button>';
      html += '</div>';
    }
    html += '</div>';
    view.innerHTML = html;
    view.addEventListener('click', function(e) {
      var shopEl = e.target.closest('.shop-item');
      if (!shopEl || shopEl.classList.contains('owned')) return;
      var price = parseInt(shopEl.dataset.price, 10);
      var sid = shopEl.dataset.sid;
      if (s.coins < price) { LV.Core.showToast({ icon: '&#129689;', text: t('not_enough_coins') }); return; }
      s.coins -= price;
      if (!s.shop.owned) s.shop.owned = [];
      s.shop.owned.push(sid);
      D.save(); LV.Core.updateTopbar(); renderShop(view);
    });
  }

  /* ======================== SETTINGS ======================== */
  function renderSettings(view) {
    var s = D.get();
    var settings = s.settings;
    var html = '<div class="page-head"><h2>' + t('nav_settings') + '</h2></div>';
    html += '<div class="settings-group"><h3>' + t('appearance') + '</h3>';
    html += '<div class="set-row"><span>' + t('theme') + '</span><div class="segment" id="theme-seg">';
    html += '<button class="seg-btn' + (settings.theme === 'light' ? ' active' : '') + '" data-th="light">' + t('theme_light') + '</button>';
    html += '<button class="seg-btn' + (settings.theme === 'dark' ? ' active' : '') + '" data-th="dark">' + t('theme_dark') + '</button>';
    html += '<button class="seg-btn' + (settings.theme === 'system' ? ' active' : '') + '" data-th="system">' + t('theme_system') + '</button>';
    html += '</div></div>';
    html += '<div class="set-row"><span>' + t('accent') + '</span><div class="swatch-row" id="accent-row">';
    var accents = ['auto', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
    for (var ai = 0; ai < accents.length; ai++) {
      var ac = accents[ai];
      var isActive = (settings.accent || 'auto') === ac;
      html += '<span class="swatch' + (isActive ? ' active' : '') + '" data-accent="' + ac + '" style="background:' + (ac === 'auto' ? 'var(--accent)' : ac) + '"></span>';
    }
    html += '</div></div>';
    html += '<div class="set-row"><span>' + t('language') + '</span><select id="lang-select" class="input">';
    html += '<option value="uz"' + (settings.lang === 'uz' ? ' selected' : '') + '>O\'zbek</option>';
    html += '<option value="en"' + (settings.lang === 'en' ? ' selected' : '') + '>English</option>';
    html += '<option value="ru"' + (settings.lang === 'ru' ? ' selected' : '') + '>Русский</option>';
    html += '</select></div></div>';
    html += '<div class="settings-group">';
    html += '<div class="set-row"><span>' + t('sound') + '</span><label class="switch"><input type="checkbox" id="snd-toggle"' + (settings.sound ? ' checked' : '') + ' /><span class="slider"></span></label></div>';
    html += '<div class="set-row"><span>' + t('haptics') + '</span><label class="switch"><input type="checkbox" id="hap-toggle"' + (settings.haptics ? ' checked' : '') + ' /><span class="slider"></span></label></div>';
    html += '<div class="set-row"><span>' + t('plus_mode') + '</span><label class="switch"><input type="checkbox" id="plus-toggle"' + (settings.plusMode ? ' checked' : '') + ' /><span class="slider"></span></label></div>';
    html += '</div>';
    html += '<div class="settings-group"><h3>' + t('data') + '</h3>';
    html += '<button class="btn" id="export-btn">' + t('export_data') + '</button> ';
    html += '<button class="btn" id="import-btn">' + t('import_data') + '</button> ';
    html += '<button class="btn btn-danger" id="reset-btn">' + t('reset_data') + '</button></div>';
    html += '<div class="settings-group"><h3>' + t('about') + '</h3><p>LEVELING v1.0</p></div>';
    view.innerHTML = html;

    document.getElementById('theme-seg').addEventListener('click', function(e) {
      var btn = e.target.closest('.seg-btn');
      if (!btn) return;
      settings.theme = btn.dataset.th; D.save(); LV.Core.applyTheme(); renderSettings(view);
    });
    document.getElementById('accent-row').addEventListener('click', function(e) {
      var sw = e.target.closest('.swatch');
      if (!sw) return;
      settings.accent = sw.dataset.accent; D.save(); LV.Core.applyAccent(settings.accent); renderSettings(view);
    });
    document.getElementById('lang-select').addEventListener('change', function(e) {
      settings.lang = e.target.value; D.save(); LV.i18n.setLang(settings.lang); LV.Core.navigate('settings');
    });
    document.getElementById('snd-toggle').addEventListener('change', function(e) { settings.sound = e.target.checked; D.save(); LV.Audio.setEnabled(settings.sound); });
    document.getElementById('hap-toggle').addEventListener('change', function(e) { settings.haptics = e.target.checked; D.save(); });
    document.getElementById('plus-toggle').addEventListener('change', function(e) { settings.plusMode = e.target.checked; D.save(); });
    document.getElementById('export-btn').addEventListener('click', function() {
      var blob = new Blob([D.exportJSON()], { type: 'application/json' });
      var url = URL.createObjectURL(blob); var a2 = document.createElement('a');
      a2.href = url; a2.download = 'leveling-backup.json'; a2.click(); URL.revokeObjectURL(url);
    });
    document.getElementById('import-btn').addEventListener('click', function() {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
      inp.addEventListener('change', function() {
        var file = inp.files && inp.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function() { try { D.importJSON(reader.result); location.reload(); } catch(err) { LV.Core.showToast({ text: 'Import failed' }); } };
        reader.readAsText(file);
      }); inp.click();
    });
    document.getElementById('reset-btn').addEventListener('click', function() {
      if (confirm(t('reset_confirm'))) { D.reset(); location.reload(); }
    });
  }

  /* ======================== QUICK LOG MODAL ======================== */
  function showQuickLog() {
    var html = '<h3>' + t('quick_log') + '</h3>';
    html += '<p class="muted">' + t('quick_log_hint') + '</p>';
    html += '<div class="onb-area-grid" id="ql-areas">';
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      html += '<button class="onb-area area-' + a.key + '" data-area="' + a.key + '">' + a.icon + '<br>' + t('area_' + a.key) + '</button>';
    }
    html += '</div>';
    html += '<div id="ql-amounts" class="hidden"><div class="segment">';
    html += '<button class="seg-btn" data-xp="10">+10 XP</button>';
    html += '<button class="seg-btn" data-xp="20">+20 XP</button>';
    html += '<button class="seg-btn" data-xp="35">+35 XP</button>';
    html += '</div></div>';
    LV.Core.showModal(html);

    var selectedArea = null;
    setTimeout(function() {
      var areasEl = document.getElementById('ql-areas');
      var amountsEl = document.getElementById('ql-amounts');
      if (areasEl) areasEl.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-area]');
        if (!btn) return;
        selectedArea = btn.dataset.area;
        var all = areasEl.querySelectorAll('.onb-area');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
        btn.classList.add('active');
        if (amountsEl) amountsEl.classList.remove('hidden');
      });
      if (amountsEl) amountsEl.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-xp]');
        if (!btn || !selectedArea) return;
        var amount = parseInt(btn.dataset.xp, 10);
        G.quickLog(selectedArea, amount);
        LV.Core.hideModal();
        LV.Core.haptic('medium');
      });
    }, 50);
  }

  /* ======================== ONBOARDING ======================== */
  function showOnboarding(onDone) {
    var step = 0;
    var el = document.getElementById('onboarding');
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    var selected = { name: '', areas: [], theme: 'dark' };

    function render() {
      var html = '<div class="onb-card">';
      html += '<div class="onb-steps">';
      for (var i = 0; i < 5; i++) html += '<span class="onb-dot' + (i === step ? ' active' : '') + '"></span>';
      html += '</div>';

      if (step === 0) {
        html += '<div class="onb-ico">&#9889;</div>';
        html += '<h2 class="onb-title">' + t('onb_welcome_title') + '</h2>';
        html += '<p class="onb-sub">' + t('onb_welcome_sub') + '</p>';
        html += '<div class="onb-actions"><button class="btn btn-primary" id="onb-next">' + t('next') + '</button></div>';
      } else if (step === 1) {
        html += '<h2 class="onb-title">' + t('onb_name_title') + '</h2>';
        html += '<p class="onb-sub">' + t('onb_name_sub') + '</p>';
        html += '<input class="input" id="onb-name" placeholder="' + t('your_name') + '" value="' + esc(selected.name) + '" />';
        html += '<div class="onb-actions"><button class="btn" id="onb-back">' + t('back') + '</button><button class="btn btn-primary" id="onb-next">' + t('next') + '</button></div>';
      } else if (step === 2) {
        html += '<h2 class="onb-title">' + t('onb_areas_title') + '</h2>';
        html += '<p class="onb-sub">' + t('onb_areas_sub') + '</p>';
        html += '<div class="onb-area-grid" id="onb-areas">';
        for (var a = 0; a < AREAS.length; a++) {
          var ar = AREAS[a];
          var sel = selected.areas.indexOf(ar.key) >= 0 ? ' active' : '';
          html += '<button class="onb-area area-' + ar.key + sel + '" data-area="' + ar.key + '">' + ar.icon + '<br>' + t('area_' + ar.key) + '</button>';
        }
        html += '</div>';
        html += '<div class="onb-actions"><button class="btn" id="onb-back">' + t('back') + '</button><button class="btn btn-primary" id="onb-next">' + t('next') + '</button></div>';
      } else if (step === 3) {
        html += '<h2 class="onb-title">' + t('onb_theme_title') + '</h2>';
        html += '<p class="onb-sub">' + t('onb_theme_sub') + '</p>';
        html += '<div class="segment" id="onb-theme">';
        html += '<button class="seg-btn' + (selected.theme === 'dark' ? ' active' : '') + '" data-th="dark">' + t('theme_dark') + '</button>';
        html += '<button class="seg-btn' + (selected.theme === 'light' ? ' active' : '') + '" data-th="light">' + t('theme_light') + '</button>';
        html += '</div>';
        html += '<div class="onb-actions"><button class="btn" id="onb-back">' + t('back') + '</button><button class="btn btn-primary" id="onb-next">' + t('next') + '</button></div>';
      } else {
        html += '<div class="onb-ico">&#127881;</div>';
        html += '<h2 class="onb-title">' + t('onb_ready_title') + '</h2>';
        html += '<p class="onb-sub">' + t('onb_ready_sub') + '</p>';
        html += '<div class="onb-actions"><button class="btn btn-primary" id="onb-go">' + t('lets_go') + '</button></div>';
      }
      html += '</div>';
      el.innerHTML = html;
      wireStep();
    }

    function wireStep() {
      var nextBtn = document.getElementById('onb-next');
      var backBtn = document.getElementById('onb-back');
      var goBtn = document.getElementById('onb-go');
      if (nextBtn) nextBtn.addEventListener('click', function() {
        if (step === 1) { selected.name = (document.getElementById('onb-name') || {}).value || 'Hunter'; }
        if (step === 2 && selected.areas.length < 2) return;
        step++; render();
      });
      if (backBtn) backBtn.addEventListener('click', function() { step--; render(); });
      if (goBtn) goBtn.addEventListener('click', function() { finishOnboarding(); });

      var areasGrid = document.getElementById('onb-areas');
      if (areasGrid) areasGrid.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-area]');
        if (!btn) return;
        var key = btn.dataset.area;
        var idx = selected.areas.indexOf(key);
        if (idx >= 0) { selected.areas.splice(idx, 1); btn.classList.remove('active'); }
        else { selected.areas.push(key); btn.classList.add('active'); }
      });

      var themeSeg = document.getElementById('onb-theme');
      if (themeSeg) themeSeg.addEventListener('click', function(e) {
        var btn = e.target.closest('.seg-btn');
        if (!btn) return;
        selected.theme = btn.dataset.th;
        var allBtns = themeSeg.querySelectorAll('.seg-btn');
        for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('active');
        btn.classList.add('active');
      });
    }

    function finishOnboarding() {
      var s = D.get();
      s.onboarded = true;
      s.profile.name = selected.name || 'Hunter';
      s.profile.focusAreas = selected.areas;
      s.settings.theme = selected.theme;
      D.save();
      LV.Core.applyTheme();
      el.classList.add('hidden');
      el.setAttribute('aria-hidden', 'true');
      if (typeof onDone === 'function') onDone();
    }

    render();
  }

  /* ======================== LEVEL-UP OVERLAY ======================== */
  function showLevelUp(area, level) {
    var overlay = document.getElementById('levelup-overlay');
    if (!overlay) return;
    var ai = areaInfo(area);
    overlay.classList.remove('hidden');
    var html = '<div class="levelup-card area-' + area + '">';
    html += '<div class="levelup-burst"></div>';
    html += '<div class="levelup-ico">' + ai.icon + '</div>';
    html += '<div class="levelup-word">' + t('level_up') + '</div>';
    html += '<div class="levelup-lvl">' + t('lvl') + ' ' + level + '</div>';
    html += '<div class="levelup-detail">' + t('level_up_to', { area: t('area_' + area), lvl: level }) + '</div>';
    html += '</div>';
    overlay.innerHTML = html;

    if (LV.Confetti && LV.Confetti.celebrate) LV.Confetti.celebrate([ai.color, '#fff']);
    if (LV.Audio && LV.Audio.play) LV.Audio.play('levelup');

    setTimeout(function() {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    }, 3500);
  }

  /* ======================== EXPORT ======================== */
  LV.UI = {
    renderDashboard: renderDashboard,
    renderSkills: renderSkills,
    renderBosses: renderBosses,
    renderQuests: renderQuests,
    renderCharacter: renderCharacter,
    renderHabits: renderHabits,
    renderTasks: renderTasks,
    renderFocus: renderFocus,
    renderAnalytics: renderAnalytics,
    renderAchievements: renderAchievements,
    renderShop: renderShop,
    renderSettings: renderSettings,
    showQuickLog: showQuickLog,
    showOnboarding: showOnboarding,
    showLevelUp: showLevelUp
  };

})(window.LV = window.LV || {});

