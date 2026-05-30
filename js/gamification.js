/* =====================================================================
   LEVELING — Gamification engine
   XP/levels, ranks, pet, combos, streaks, quests, bosses, achievements, titles
   ===================================================================== */
(function (LV) {
  'use strict';

  const D = LV.Data;
  const U = LV.util;
  const AREA_KEYS = D.AREA_KEYS;

  /* ----------------------------- Event bus ----------------------------- */
  const listeners = {};
  function on(ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return () => off(ev, cb); }
  function off(ev, cb) { if (listeners[ev]) listeners[ev] = listeners[ev].filter((f) => f !== cb); }
  function emit(ev, payload) {
    (listeners[ev] || []).forEach((cb) => { try { cb(payload); } catch (e) { console.error(e); } });
    (listeners['*'] || []).forEach((cb) => { try { cb(ev, payload); } catch (e) { console.error(e); } });
  }

  /* ----------------------------- XP / Level math ----------------------------- */
  // Exponential growth: XP needed to advance from `level` to `level+1`.
  function xpForLevelUp(level) { return Math.round(80 * Math.pow(1.16, level - 1)) + 20; }
  function levelFromXP(xp) {
    let level = 1, need = xpForLevelUp(1), into = xp;
    while (into >= need && level < 999) { into -= need; level++; need = xpForLevelUp(level); }
    return { level, into: Math.floor(into), need, pct: U.clamp((into / need) * 100, 0, 100) };
  }

  const DIFFICULTY_XP = { easy: 10, medium: 20, hard: 35 };
  const BOSS_HP = { mini: 700, elite: 3000, epic: 10000, legendary: 36500 };
  const BOSS_REWARD = {
    mini: { xp: 90, coins: 30 }, elite: { xp: 260, coins: 110 },
    epic: { xp: 720, coins: 320 }, legendary: { xp: 2100, coins: 950 },
  };
  const BOSS_DAYS = { mini: 7, elite: 30, epic: 100, legendary: 365 };

  /* ----------------------------- Getters ----------------------------- */
  function areaXP(area) { const s = D.get(); return (s.areas[area] && s.areas[area].xp) || 0; }
  function areaLevel(area) { return levelFromXP(areaXP(area)).level; }
  function areaProgress(area) { return levelFromXP(areaXP(area)); }
  function subLevel(area, sub) { const s = D.get(); const k = area + '.' + sub; const xp = (s.subskills[k] && s.subskills[k].xp) || 0; return levelFromXP(xp); }
  function totalPower() { return AREA_KEYS.reduce((sum, k) => sum + areaLevel(k), 0); }
  function totalLevel() { return totalPower(); }

  function rankFor(power) {
    const R = D.RANKS; let r = R[0], idx = 0;
    for (let i = 0; i < R.length; i++) { if (power >= R[i].min) { r = R[i]; idx = i; } }
    return { rank: r, index: idx };
  }
  function nextRankInfo() {
    const power = totalPower();
    const { index } = rankFor(power);
    const R = D.RANKS;
    const next = R[index + 1] || null;
    return { power, current: R[index], next, toNext: next ? next.min - power : 0 };
  }

  function petStage() {
    const lvl = totalLevel();
    const ST = D.PET_STAGES; let stage = 0;
    for (let i = 0; i < ST.length; i++) { if (lvl >= ST[i].min) stage = i; }
    return stage;
  }
  function petInfo() {
    const s = D.get();
    const stage = petStage();
    const ST = D.PET_STAGES;
    const next = ST[stage + 1] || null;
    return {
      stage, emoji: ST[stage].emoji, nextEmoji: next ? next.emoji : null,
      toNext: next ? next.min - totalLevel() : 0,
      happiness: U.clamp(Math.round(s.pet.happiness), 0, 100),
      energy: U.clamp(Math.round(s.pet.energy), 0, 100),
    };
  }
  function avatarFor() {
    const s = D.get();
    if (s.profile.avatar && s.profile.avatar.length) {
      // evolve default avatar by total level
    }
    const lvl = totalLevel();
    const idx = U.clamp(Math.floor(lvl / 60), 0, D.AVATARS.length - 1);
    return s.profile.avatarLocked ? s.profile.avatar : (s.profile.avatar || D.AVATARS[idx]);
  }

  /* ----------------------------- Date helpers ----------------------------- */
  function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }

  /* ----------------------------- Pet ----------------------------- */
  function boostPet(s, amount) {
    s.pet.happiness = U.clamp((s.pet.happiness || 70) + 3, 0, 100);
    s.pet.energy = U.clamp((s.pet.energy || 70) + 2.5, 0, 100);
    s.pet.lastUpdate = U.todayStr();
  }
  function petDecay(s, today) {
    const last = s.pet.lastUpdate || today;
    const gap = daysBetween(last, today);
    if (gap > 0) {
      for (let i = 0; i < gap; i++) {
        const dStr = U.dateAdd(last, i);
        if (!s.daysActive[dStr]) { s.pet.happiness = U.clamp((s.pet.happiness || 70) - 14, 0, 100); s.pet.energy = U.clamp((s.pet.energy || 70) - 11, 0, 100); }
      }
      s.pet.lastUpdate = today;
    }
  }

  /* ----------------------------- Streak / combo / active day ----------------------------- */
  function markActiveDay(s) {
    const today = U.todayStr();
    if (!s.daysActive[today]) { s.daysActive[today] = true; touchStreak(s, today); }
  }
  function touchStreak(s, today) {
    const last = s.streak.lastDate;
    if (last === today) return;
    if (!last) { s.streak.current = 1; }
    else {
      const gap = daysBetween(last, today);
      if (gap <= 1) s.streak.current += 1;
      else if (gap === 2 && s.streak.shields > 0) { s.streak.shields -= 1; s.streak.current += 1; }
      else s.streak.current = 1;
    }
    s.streak.lastDate = today;
    if (s.streak.current > s.streak.longest) s.streak.longest = s.streak.current;
    if (s.streak.current % 7 === 0) s.streak.shields = Math.min(2, (s.streak.shields || 0) + 1);
  }
  function touchCombo(s, area) {
    const today = U.todayStr();
    if (s.combo.date !== today) s.combo = { date: today, areas: [], perfectFired: false, b3: false };
    if (!s.combo.areas.includes(area)) s.combo.areas.push(area);
    const count = s.combo.areas.length;
    let justReached3 = false, perfect = false;
    if (count >= 3 && !s.combo.b3) { s.combo.b3 = true; justReached3 = true; }
    if (count >= 7 && !s.combo.perfectFired) { s.combo.perfectFired = true; perfect = true; }
    return { count, justReached3, perfect };
  }

  /* ----------------------------- Core: addXP ----------------------------- */
  function addXP(area, amount, opts) {
    opts = opts || {};
    amount = Math.round(amount);
    if (AREA_KEYS.indexOf(area) < 0 || amount === 0) return null;
    const s = D.get();
    if (!s.stats) s.stats = { totalXP: 0 };

    const beforeLevel = levelFromXP(areaXP(area)).level;
    const beforePower = totalPower();
    s.areas[area].xp = Math.max(0, (s.areas[area].xp || 0) + amount);
    if (opts.sub) { const k = area + '.' + opts.sub; if (s.subskills[k]) s.subskills[k].xp = Math.max(0, (s.subskills[k].xp || 0) + amount); }
    if (amount > 0) s.stats.totalXP = (s.stats.totalXP || 0) + amount;

    s.log.push({ ts: Date.now(), area, xp: amount, src: opts.src || 'action' });
    if (s.log.length > 2500) s.log = s.log.slice(-2500);

    let perfectDay = false, comboCount = 0, justReached3 = false;
    if (amount > 0 && !opts.fromAward) {
      markActiveDay(s);
      boostPet(s, amount);
      const c = touchCombo(s, area);
      comboCount = c.count; perfectDay = c.perfect; justReached3 = c.justReached3;
    }

    const afterLevel = levelFromXP(areaXP(area)).level;
    let leveledUp = false;
    if (afterLevel > beforeLevel) {
      leveledUp = true;
      const gained = afterLevel - beforeLevel;
      s.coins += afterLevel * 2 * gained;
      emit('levelup', { area, level: afterLevel, gained });
      const beforeRank = rankFor(beforePower).index;
      const afterRank = rankFor(totalPower()).index;
      if (afterRank > beforeRank) emit('rankup', { rank: D.RANKS[afterRank], index: afterRank });
    }

    if (amount > 0 && !opts.fromAward) bumpQuests(s, 'xp', area, amount);

    if (!opts.silent && amount > 0) emit('xp', { area, amount, x: opts.x, y: opts.y, src: opts.src });

    if (justReached3) { s.coins += 10; emit('combo', { count: 3 }); addXP(area, 20, { fromAward: true, src: 'combo' }); }
    if (perfectDay) { s.stats.perfectDays = (s.stats.perfectDays || 0) + 1; s.coins += 50; emit('perfectday', {}); addXP('spirit', 60, { fromAward: true, src: 'perfect' }); }

    if (!opts.fromAward) { checkAll(s); }
    D.save();
    return { leveledUp, newLevel: afterLevel, area, amount, comboCount, perfectDay };
  }
  function quickLog(area, amount, sub) { return addXP(area, amount, { sub: sub, src: 'quicklog' }); }

  /* ----------------------------- Habits ----------------------------- */
  function habitXP(h) { return DIFFICULTY_XP[h.difficulty] || 15; }
  function isHabitDoneToday(h) { return !!h.history[U.todayStr()]; }
  function toggleHabit(habitId) {
    const s = D.get();
    const h = s.habits.find((x) => x.id === habitId);
    if (!h) return null;
    const today = U.todayStr();
    if (h.history[today]) {
      delete h.history[today];
      addXP(h.area, -habitXP(h), { sub: h.sub, src: 'habit-undo', silent: true });
      h.streak = computeHabitStreak(h);
      D.save();
      return { done: false };
    }
    h.history[today] = true;
    h.streak = computeHabitStreak(h);
    const s2 = D.get(); s2.stats = s2.stats || {}; s2.stats.habitChecks = (s2.stats.habitChecks || 0) + 1;
    const r = addXP(h.area, habitXP(h), { sub: h.sub, src: 'habit' });
    bumpQuests(s, 'habit', h.area, 1);
    checkAll(s); D.save();
    return Object.assign({ done: true, habit: h }, r);
  }
  function computeHabitStreak(h) {
    let streak = 0; let d = U.todayStr();
    if (!h.history[d]) d = U.dateAdd(d, -1);
    while (h.history[d]) { streak++; d = U.dateAdd(d, -1); }
    return streak;
  }
  function addHabit(data) {
    const s = D.get();
    const h = { id: U.uid('habit'), name: data.name, area: data.area, sub: data.sub || null, difficulty: data.difficulty || 'medium', frequency: data.frequency || 'daily', streak: 0, history: {}, createdAt: new Date().toISOString() };
    s.habits.unshift(h); D.save(); return h;
  }
  function removeHabit(id) { const s = D.get(); s.habits = s.habits.filter((h) => h.id !== id); D.save(); }

  /* ----------------------------- Tasks ----------------------------- */
  function addTask(data) {
    const s = D.get();
    const t = { id: U.uid('task'), title: data.title, area: data.area, priority: data.priority || 'medium', deadline: data.deadline || null, status: 'todo', done: false, createdAt: new Date().toISOString() };
    s.tasks.unshift(t); D.save(); return t;
  }
  function setTaskStatus(id, status) {
    const s = D.get(); const t = s.tasks.find((x) => x.id === id); if (!t) return;
    const wasDone = t.done;
    t.status = status; t.done = status === 'done';
    if (t.done && !wasDone) {
      s.stats = s.stats || {}; s.stats.tasksCompleted = (s.stats.tasksCompleted || 0) + 1;
      const xp = t.priority === 'high' ? 30 : t.priority === 'low' ? 12 : 20;
      addXP(t.area, xp, { src: 'task' });
      bumpQuests(s, 'task', t.area, 1);
      emit('task', { task: t });
      checkAll(s);
    }
    D.save();
  }
  function toggleTask(id) { const s = D.get(); const t = s.tasks.find((x) => x.id === id); if (!t) return; setTaskStatus(id, t.done ? 'todo' : 'done'); }
  function removeTask(id) { const s = D.get(); s.tasks = s.tasks.filter((t) => t.id !== id); D.save(); }

  /* ----------------------------- Focus ----------------------------- */
  function recordFocus(minutes) {
    const s = D.get();
    minutes = Math.max(1, Math.round(minutes));
    s.focus.sessions.push({ ts: Date.now(), minutes });
    s.focus.totalMinutes = (s.focus.totalMinutes || 0) + minutes;
    s.stats = s.stats || {}; s.stats.focusSessions = (s.stats.focusSessions || 0) + 1;
    const xp = Math.round(minutes * 1.2);
    const r = addXP('mind', xp, { sub: 'focus', src: 'focus' });
    bumpQuests(s, 'focus', 'mind', 1);
    checkAll(s); D.save();
    return r;
  }

  /* ----------------------------- Bosses ----------------------------- */
  function createBoss(data) {
    const s = D.get();
    const hp = BOSS_HP[data.tier] || 700;
    const b = { id: U.uid('boss'), name: data.name, area: data.area, tier: data.tier || 'mini', hpMax: hp, hp: hp, createdAt: new Date().toISOString(), defeatedAt: null, log: [] };
    s.bosses.unshift(b); D.save(); return b;
  }
  function dealBossDamage(bossId, amount) {
    const s = D.get();
    const b = s.bosses.find((x) => x.id === bossId);
    if (!b || b.defeatedAt) return null;
    amount = Math.max(1, Math.round(amount));
    // damage this boss + grant area XP (skip auto so we only hit the targeted boss)
    addXP(b.area, amount, { src: 'boss-attack' });
    b.hp = Math.max(0, b.hp - amount);
    b.log.push({ ts: Date.now(), dmg: amount });
    let defeated = false;
    if (b.hp <= 0) { defeatBoss(s, b); defeated = true; }
    D.save();
    return { boss: b, defeated };
  }
  function defeatBoss(s, b) {
    if (b.defeatedAt) return;
    b.defeatedAt = new Date().toISOString();
    s.stats = s.stats || {}; s.stats.bossesDefeated = (s.stats.bossesDefeated || 0) + 1;
    const reward = BOSS_REWARD[b.tier] || BOSS_REWARD.mini;
    s.coins += reward.coins;
    addXP(b.area, reward.xp, { fromAward: true, src: 'boss' });
    emit('boss', { boss: b, reward });
    checkAll(s);
  }
  function removeBoss(id) { const s = D.get(); s.bosses = s.bosses.filter((b) => b.id !== id); D.save(); }

  /* ----------------------------- Daily boss (LEVELING+) ----------------------------- */
  function ensureDailyBoss(s) {
    if (!s.settings.plusMode) return;
    const today = U.todayStr();
    if (s.dailyBoss.date === today) return;
    const prevMissed = s.dailyBoss.date && !s.dailyBoss.defeated;
    const strength = (s.dailyBoss.missStreak || 0);
    const missStreak = prevMissed ? strength + 1 : 0;
    const base = 120 + totalPower() * 4;
    const hp = Math.round(base * (1 + missStreak * 0.25));
    const area = AREA_KEYS[Math.floor(Math.random() * AREA_KEYS.length)];
    s.dailyBoss = { date: today, area, name: bossName(area), hpMax: hp, hp, defeated: false, dealt: 0, missStreak };
  }
  function bossName(area) {
    const names = { body: '👹 Sloth Demon', mind: '🌀 Fog of Doubt', heart: '🥀 Cold Heart', wealth: '🐗 Scarcity Beast', social: '🦂 Isolation', craft: '🗿 Creative Block', spirit: '👁️ Restless Mind' };
    return names[area] || '👾 Daily Boss';
  }
  function strikeDailyBoss(amount) {
    const s = D.get();
    if (!s.dailyBoss || s.dailyBoss.defeated) return null;
    amount = Math.max(1, Math.round(amount));
    addXP(s.dailyBoss.area, amount, { src: 'daily-boss' });
    s.dailyBoss.hp = Math.max(0, s.dailyBoss.hp - amount);
    s.dailyBoss.dealt += amount;
    let defeated = false;
    if (s.dailyBoss.hp <= 0) {
      s.dailyBoss.defeated = true; defeated = true;
      s.coins += 40;
      addXP(s.dailyBoss.area, 80, { fromAward: true, src: 'daily-boss' });
      s.stats = s.stats || {}; s.stats.dailyBossWins = (s.stats.dailyBossWins || 0) + 1;
      emit('boss', { daily: true, boss: s.dailyBoss });
    }
    checkAll(s); D.save();
    return { defeated, boss: s.dailyBoss };
  }

  /* ----------------------------- Real-world quests (Pro) ----------------------------- */
  function doProQuest(id) {
    const s = D.get();
    const q = D.PRO_QUESTS.find((p) => p.id === id);
    if (!q) return null;
    const today = U.todayStr();
    s.proDone[today] = s.proDone[today] || [];
    if (s.proDone[today].includes(id)) return { already: true };
    s.proDone[today].push(id);
    s.stats = s.stats || {}; s.stats.proDone = (s.stats.proDone || 0) + 1;
    const r = addXP(q.area, q.xp, { src: 'pro' });
    emit('quest', { pro: true, quest: q });
    checkAll(s); D.save();
    return Object.assign({ quest: q }, r);
  }
  function proDoneToday(id) { const s = D.get(); const today = U.todayStr(); return (s.proDone[today] || []).includes(id); }

  /* ----------------------------- Quests generation ----------------------------- */
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pickQuests(n, mult, scope) {
    const pool = shuffle(D.QUEST_POOL);
    const chosen = []; const usedAreas = {};
    for (const tpl of pool) {
      if (chosen.length >= n) break;
      if (tpl.area && usedAreas[tpl.area] && chosen.length < D.QUEST_POOL.length) continue;
      usedAreas[tpl.area] = true;
      chosen.push(makeQuest(tpl, mult, scope));
    }
    let i = 0;
    while (chosen.length < n && i < pool.length) { chosen.push(makeQuest(pool[i], mult, scope)); i++; }
    return chosen;
  }
  function makeQuest(tpl, mult, scope) {
    return {
      id: U.uid('q'), text: tpl.text, area: tpl.area, type: tpl.type,
      target: Math.max(1, Math.round(tpl.target * mult)),
      xp: Math.round(tpl.xp * Math.max(1, mult * 0.8)),
      progress: 0, done: false, scope: scope || 'daily',
    };
  }
  function defaultEpics() {
    return [
      { id: 'epic_power', text: { uz: 'Umumiy quvvat 60 ga yeting', en: 'Reach 60 Total Power', ru: 'Достигните 60 общей силы' }, metric: 'power', target: 60, xp: 200, done: false },
      { id: 'epic_streak', text: { uz: '30 kunlik streak', en: 'Hit a 30-day streak', ru: '30-дневная серия' }, metric: 'streak', target: 30, xp: 200, done: false },
      { id: 'epic_focus', text: { uz: '600 daqiqa fokus', en: 'Focus for 600 minutes', ru: '600 минут фокуса' }, metric: 'focusMin', target: 600, xp: 250, done: false },
      { id: 'epic_balance', text: { uz: 'Barcha sohalar 8-daraja', en: 'All areas to level 8', ru: 'Все сферы до 8 уровня' }, metric: 'minArea', target: 8, xp: 320, done: false },
    ];
  }
  function ensureQuests(s) {
    const today = U.todayStr();
    if (s.quests.dailyDate !== today) { s.quests.dailyDate = today; s.quests.daily = pickQuests(3, 1, 'daily'); }
    const wk = U.weekKey();
    if (s.quests.weekKey !== wk) { s.quests.weekKey = wk; s.quests.weekly = pickQuests(3, 5, 'weekly'); }
    const mk = U.monthKey();
    if (s.quests.monthKey !== mk) { s.quests.monthKey = mk; s.quests.monthly = pickQuests(2, 18, 'monthly'); }
    if (!s.quests.epic || !s.quests.epic.length) s.quests.epic = defaultEpics();
  }
  function bumpQuests(s, type, area, amount) {
    const lists = [s.quests.daily, s.quests.weekly, s.quests.monthly];
    lists.forEach((list) => { if (!list) return; list.forEach((q) => {
      if (q.done) return;
      if (q.type === 'areas') { q.progress = Math.max(q.progress, (s.combo.areas || []).length); }
      else if (q.type === type) {
        if (type === 'xp') { if (!q.area || q.area === area) q.progress += amount; }
        else q.progress += (amount || 1);
      }
      if (!q.done && q.progress >= q.target) completeQuest(s, q);
    }); });
  }
  function completeQuest(s, q) {
    q.done = true; q.progress = q.target;
    s.coins += 8;
    s.stats = s.stats || {}; s.stats.questsCompleted = (s.stats.questsCompleted || 0) + 1;
    addXP(q.area || 'spirit', q.xp, { fromAward: true, src: 'quest' });
    emit('quest', { quest: q });
  }
  function metricValue(s, key) {
    switch (key) {
      case 'power': return totalPower();
      case 'streak': return s.streak.longest;
      case 'focusMin': return s.focus.totalMinutes || 0;
      case 'minArea': return Math.min.apply(null, AREA_KEYS.map((k) => areaLevel(k)));
      default: return 0;
    }
  }
  function epicProgress(epic) { const s = D.get(); const v = metricValue(s, epic.metric); return { value: v, target: epic.target, pct: U.clamp((v / epic.target) * 100, 0, 100) }; }
  function checkEpics(s) {
    (s.quests.epic || []).forEach((e) => {
      if (e.done) return;
      if (metricValue(s, e.metric) >= e.target) { e.done = true; s.coins += 30; addXP('spirit', e.xp, { fromAward: true, src: 'epic' }); emit('quest', { quest: e, epic: true }); }
    });
  }

  /* ----------------------------- Metrics ----------------------------- */
  function metrics() {
    const s = D.get();
    const lvls = {}; AREA_KEYS.forEach((k) => lvls[k] = areaLevel(k));
    const levelVals = AREA_KEYS.map((k) => lvls[k]);
    const power = levelVals.reduce((a, b) => a + b, 0);
    let best = AREA_KEYS[0], worst = AREA_KEYS[0];
    AREA_KEYS.forEach((k) => { if (lvls[k] > lvls[best]) best = k; if (lvls[k] < lvls[worst]) worst = k; });
    const max = Math.max.apply(null, levelVals), min = Math.min.apply(null, levelVals);
    const balance = max === 0 ? 0 : Math.round((min / max) * 100);
    return {
      areaLevels: lvls, power, best, worst, balance,
      totalXP: (s.stats && s.stats.totalXP) || 0,
      daysActive: Object.keys(s.daysActive).length,
      streak: s.streak.current, longest: s.streak.longest,
      bossesDefeated: (s.stats && s.stats.bossesDefeated) || 0,
      tasksCompleted: (s.stats && s.stats.tasksCompleted) || 0,
      focusSessions: (s.stats && s.stats.focusSessions) || 0,
      focusMinutes: s.focus.totalMinutes || 0,
      perfectDays: (s.stats && s.stats.perfectDays) || 0,
      questsCompleted: (s.stats && s.stats.questsCompleted) || 0,
      titlesCount: s.titles.length,
      proDone: (s.stats && s.stats.proDone) || 0,
    };
  }
  // XP gained per day for the last `n` days, total across areas.
  function xpByDay(n) {
    const s = D.get(); const out = [];
    const map = {};
    s.log.forEach((e) => { if (e.xp > 0) { const d = U.todayStr(new Date(e.ts)); map[d] = (map[d] || 0) + e.xp; } });
    for (let i = n - 1; i >= 0; i--) { const d = U.dateAdd(U.todayStr(), -i); out.push({ date: d, xp: map[d] || 0 }); }
    return out;
  }

  /* ----------------------------- Achievements ----------------------------- */
  const ACH = [
    // common
    a('first_step', '⚡', 'common', 20, { uz: 'Birinchi qadam', en: 'First Step', ru: 'Первый шаг' }, { uz: 'Birinchi XP', en: 'Earn your first XP', ru: 'Получите первый XP' }, (m) => m.totalXP > 0),
    a('habit_starter', '✅', 'common', 20, { uz: 'Odat boshlandi', en: 'Habit Starter', ru: 'Начало привычки' }, { uz: '1 ta odat bajaring', en: 'Complete a habit', ru: 'Выполните привычку' }, (m, s) => (s.stats && s.stats.habitChecks) >= 1),
    a('task_done', '📌', 'common', 20, { uz: 'Bajarildi', en: 'Done & Dusted', ru: 'Сделано' }, { uz: '1 ta vazifa yakunlang', en: 'Finish a task', ru: 'Завершите задачу' }, (m) => m.tasksCompleted >= 1),
    a('focus_first', '🎯', 'common', 20, { uz: 'Diqqat', en: 'In the Zone', ru: 'В потоке' }, { uz: 'Birinchi fokus sessiyasi', en: 'First focus session', ru: 'Первая сессия фокуса' }, (m) => m.focusSessions >= 1),
    a('boss_hit', '⚔️', 'common', 20, { uz: 'Birinchi zarba', en: 'First Blood', ru: 'Первый удар' }, { uz: 'Bossga zarba bering', en: 'Damage a boss', ru: 'Нанесите урон боссу' }, (m, s) => s.bosses.some((b) => b.log.length > 0)),
    a('combo_3', '🔗', 'common', 25, { uz: 'Combo!', en: 'Combo!', ru: 'Комбо!' }, { uz: '1 kunda 3 soha', en: '3 areas in a day', ru: '3 сферы за день' }, (m, s) => (s.combo.areas || []).length >= 3),
    a('streak_3', '🔥', 'common', 25, { uz: 'Qizib boshladi', en: 'Warming Up', ru: 'Разогрев' }, { uz: '3 kunlik streak', en: '3-day streak', ru: 'Серия 3 дня' }, (m) => m.longest >= 3),
    a('coins_50', '🪙', 'common', 20, { uz: 'Tanga yig\'uvchi', en: 'Coin Collector', ru: 'Сборщик монет' }, { uz: '50 tanga', en: 'Hold 50 coins', ru: '50 монет' }, (m, s) => s.coins >= 50),
    a('lvl5', '🌟', 'common', 25, { uz: 'Yuksalish', en: 'Rising', ru: 'Восхождение' }, { uz: 'Bironta soha 5-daraja', en: 'Any area to level 5', ru: 'Любая сфера до 5' }, (m) => Math.max.apply(null, Object.values(m.areaLevels)) >= 5),
    a('quote_seeker', '💬', 'common', 15, { uz: 'Ilhomchi', en: 'Inspired', ru: 'Вдохновлён' }, { uz: 'Dasturni oching', en: 'Open the app', ru: 'Откройте приложение' }, () => true),

    // rare
    a('streak_7', '🔥', 'rare', 50, { uz: 'Bir hafta', en: 'Seven Days', ru: 'Семь дней' }, { uz: '7 kunlik streak', en: '7-day streak', ru: 'Серия 7 дней' }, (m) => m.longest >= 7),
    a('boss_mini', '🗡️', 'rare', 50, { uz: 'Mini g\'olib', en: 'Mini Slayer', ru: 'Победитель мини' }, { uz: 'Mini bossni yenging', en: 'Defeat a Mini boss', ru: 'Победите мини-босса' }, (m, s) => s.bosses.some((b) => b.defeatedAt && b.tier === 'mini')),
    a('lvl10', '✨', 'rare', 60, { uz: 'O\'n daraja', en: 'Double Digits', ru: 'Десятка' }, { uz: 'Bironta soha 10-daraja', en: 'Any area to level 10', ru: 'Любая сфера до 10' }, (m) => Math.max.apply(null, Object.values(m.areaLevels)) >= 10),
    a('focus_5', '🧘', 'rare', 50, { uz: 'Fokus ustasi', en: 'Focused', ru: 'Сфокусирован' }, { uz: '5 fokus sessiya', en: '5 focus sessions', ru: '5 сессий фокуса' }, (m) => m.focusSessions >= 5),
    a('tasks_10', '🗂️', 'rare', 50, { uz: 'Bajaruvchi', en: 'Executor', ru: 'Исполнитель' }, { uz: '10 vazifa', en: '10 tasks done', ru: '10 задач' }, (m) => m.tasksCompleted >= 10),
    a('perfect_day', '🌈', 'rare', 70, { uz: 'Mukammal kun', en: 'Perfect Day', ru: 'Идеальный день' }, { uz: '1 kunda 7 soha', en: 'All 7 areas in a day', ru: 'Все 7 сфер за день' }, (m) => m.perfectDays >= 1),
    a('power_50', '⚡', 'rare', 60, { uz: 'Quvvat 50', en: 'Power 50', ru: 'Сила 50' }, { uz: 'Umumiy quvvat 50', en: 'Total Power 50', ru: 'Общая сила 50' }, (m) => m.power >= 50),
    a('habits_5', '📋', 'rare', 50, { uz: 'Tizimli', en: 'Systematic', ru: 'Системно' }, { uz: '5 ta odat yarating', en: 'Create 5 habits', ru: 'Создайте 5 привычек' }, (m, s) => s.habits.length >= 5),
    a('pro_first', '🌍', 'rare', 50, { uz: 'Comfort zonadan', en: 'Out of Comfort', ru: 'Вне зоны' }, { uz: 'Real-world quest', en: 'Do a real-world quest', ru: 'Реальный квест' }, (m) => m.proDone >= 1),
    a('quests_10', '📜', 'rare', 55, { uz: 'Quest hunter', en: 'Quest Hunter', ru: 'Охотник за квестами' }, { uz: '10 vazifa bajaring', en: 'Complete 10 quests', ru: 'Выполните 10 квестов' }, (m) => m.questsCompleted >= 10),

    // epic
    a('streak_30', '🔥', 'epic', 120, { uz: 'Bir oy!', en: 'One Month!', ru: 'Месяц!' }, { uz: '30 kunlik streak', en: '30-day streak', ru: 'Серия 30 дней' }, (m) => m.longest >= 30),
    a('lvl20', '💎', 'epic', 130, { uz: 'Yigirma', en: 'Twenty', ru: 'Двадцать' }, { uz: 'Bironta soha 20-daraja', en: 'Any area to level 20', ru: 'Любая сфера до 20' }, (m) => Math.max.apply(null, Object.values(m.areaLevels)) >= 20),
    a('boss_elite', '🛡️', 'epic', 130, { uz: 'Elite g\'olib', en: 'Elite Slayer', ru: 'Элитный убийца' }, { uz: 'Elite bossni yenging', en: 'Defeat an Elite boss', ru: 'Победите элитного босса' }, (m, s) => s.bosses.some((b) => b.defeatedAt && b.tier === 'elite')),
    a('power_100', '🌕', 'epic', 140, { uz: 'Quvvat 100', en: 'Power 100', ru: 'Сила 100' }, { uz: 'Umumiy quvvat 100', en: 'Total Power 100', ru: 'Общая сила 100' }, (m) => m.power >= 100),
    a('focus_25', '🧠', 'epic', 120, { uz: 'Chuqur fokus', en: 'Deep Work', ru: 'Глубокая работа' }, { uz: '25 fokus sessiya', en: '25 focus sessions', ru: '25 сессий' }, (m) => m.focusSessions >= 25),
    a('balanced_10', '⚖️', 'epic', 150, { uz: 'Muvozanat ustasi', en: 'Balanced Master', ru: 'Мастер баланса' }, { uz: 'Barcha sohalar 10-daraja', en: 'All areas to level 10', ru: 'Все сферы до 10' }, (m) => Math.min.apply(null, Object.values(m.areaLevels)) >= 10),
    a('tasks_50', '🏗️', 'epic', 120, { uz: 'Mashina', en: 'Machine', ru: 'Машина' }, { uz: '50 vazifa', en: '50 tasks done', ru: '50 задач' }, (m) => m.tasksCompleted >= 50),
    a('perfect_5', '🌠', 'epic', 140, { uz: 'Mukammallik', en: 'Perfectionist', ru: 'Перфекционист' }, { uz: '5 mukammal kun', en: '5 perfect days', ru: '5 идеальных дней' }, (m) => m.perfectDays >= 5),

    // legendary
    a('streak_100', '🏆', 'legendary', 300, { uz: 'Yuz kun', en: 'Centurion', ru: 'Центурион' }, { uz: '100 kunlik streak', en: '100-day streak', ru: 'Серия 100 дней' }, (m) => m.longest >= 100),
    a('power_200', '👑', 'legendary', 300, { uz: 'Usta', en: 'Master', ru: 'Мастер' }, { uz: 'Umumiy quvvat 200', en: 'Total Power 200', ru: 'Общая сила 200' }, (m) => m.power >= 200),
    a('boss_epic', '🐉', 'legendary', 350, { uz: 'Epic g\'olib', en: 'Epic Slayer', ru: 'Эпический убийца' }, { uz: 'Epic bossni yenging', en: 'Defeat an Epic boss', ru: 'Победите эпического босса' }, (m, s) => s.bosses.some((b) => b.defeatedAt && b.tier === 'epic')),
    a('boss_legendary', '☄️', 'legendary', 400, { uz: 'Afsonaviy', en: 'Legend Killer', ru: 'Убийца легенд' }, { uz: 'Legendary bossni yenging', en: 'Defeat a Legendary boss', ru: 'Победите легендарного босса' }, (m, s) => s.bosses.some((b) => b.defeatedAt && b.tier === 'legendary')),
    a('lvl30', '💫', 'legendary', 320, { uz: 'O\'ttiz', en: 'Thirty', ru: 'Тридцать' }, { uz: 'Bironta soha 30-daraja', en: 'Any area to level 30', ru: 'Любая сфера до 30' }, (m) => Math.max.apply(null, Object.values(m.areaLevels)) >= 30),
    a('mythic', '🌌', 'legendary', 500, { uz: 'Mifik', en: 'Mythic', ru: 'Мифик' }, { uz: 'Mythic rankka yeting', en: 'Reach Mythic rank', ru: 'Достигните ранга Мифик' }, (m) => m.power >= 600),
    a('balanced_20', '🕊️', 'legendary', 400, { uz: 'Garmoniya', en: 'Harmony', ru: 'Гармония' }, { uz: 'Barcha sohalar 20-daraja', en: 'All areas to level 20', ru: 'Все сферы до 20' }, (m) => Math.min.apply(null, Object.values(m.areaLevels)) >= 20),
    a('collector', '🎖️', 'legendary', 300, { uz: 'Kollektsioner', en: 'Collector', ru: 'Коллекционер' }, { uz: '10 unvon to\'plang', en: 'Earn 10 titles', ru: 'Получите 10 титулов' }, (m) => m.titlesCount >= 10),
  ];
  function a(id, icon, rarity, xp, name, desc, check) { return { id, icon, rarity, xp, name, desc, check }; }
  const ACH_COINS = { common: 10, rare: 25, epic: 60, legendary: 150 };

  function checkAchievements(s) {
    const m = metrics();
    ACH.forEach((def) => {
      if (s.achievements[def.id]) return;
      let ok = false; try { ok = def.check(m, s); } catch (e) { ok = false; }
      if (ok) {
        s.achievements[def.id] = new Date().toISOString();
        s.coins += ACH_COINS[def.rarity] || 10;
        addXP('spirit', def.xp, { fromAward: true, src: 'achievement' });
        emit('achievement', { ach: def });
      }
    });
  }

  /* ----------------------------- Titles ----------------------------- */
  const TITLES = [
    { id: 'iron_will', name: { uz: 'Temir iroda', en: 'Iron Will', ru: 'Железная воля' }, cond: (m) => m.areaLevels.body >= 10 },
    { id: 'bookworm', name: { uz: 'Kitobxon', en: 'Bookworm', ru: 'Книжный червь' }, cond: (m) => m.areaLevels.mind >= 10 },
    { id: 'big_heart', name: { uz: 'Katta yurak', en: 'Big Heart', ru: 'Большое сердце' }, cond: (m) => m.areaLevels.heart >= 10 },
    { id: 'tycoon', name: { uz: 'Magnat', en: 'Tycoon', ru: 'Магнат' }, cond: (m) => m.areaLevels.wealth >= 10 },
    { id: 'connector', name: { uz: 'Bog\'lovchi', en: 'Connector', ru: 'Связующий' }, cond: (m) => m.areaLevels.social >= 10 },
    { id: 'artisan', name: { uz: 'Hunarmand', en: 'Artisan', ru: 'Мастер' }, cond: (m) => m.areaLevels.craft >= 10 },
    { id: 'zen_master', name: { uz: 'Zen ustasi', en: 'Zen Master', ru: 'Дзен-мастер' }, cond: (m) => m.areaLevels.spirit >= 10 },
    { id: 'unstoppable', name: { uz: 'To\'xtatib bo\'lmas', en: 'Unstoppable', ru: 'Неудержимый' }, cond: (m) => m.longest >= 30 },
    { id: 'polymath', name: { uz: 'Polimat', en: 'Polymath', ru: 'Полимат' }, cond: (m) => Math.min.apply(null, Object.values(m.areaLevels)) >= 5 },
    { id: 'the_legend', name: { uz: 'Afsona', en: 'The Legend', ru: 'Легенда' }, cond: (m) => m.power >= 351 },
    { id: 'centurion_t', name: { uz: 'Senturion', en: 'Centurion', ru: 'Центурион' }, cond: (m) => m.power >= 100 },
    { id: 'perfectionist_t', name: { uz: 'Perfeksionist', en: 'Perfectionist', ru: 'Перфекционист' }, cond: (m) => m.perfectDays >= 3 },
  ];
  function checkTitles(s) {
    const m = metrics();
    TITLES.forEach((def) => {
      if (s.titles.indexOf(def.id) >= 0) return;
      let ok = false; try { ok = def.cond(m); } catch (e) { ok = false; }
      if (ok) { s.titles.push(def.id); s.coins += 20; emit('title', { title: def }); }
    });
  }
  function titleName(id) { const t = TITLES.find((x) => x.id === id); return t ? t.name[LV.i18n.getLang()] || t.name.en : id; }

  /* ----------------------------- Hidden quests ----------------------------- */
  const HIDDEN = [
    { id: 'night_owl', icon: '🦉', name: { uz: 'Tungi boyqush', en: 'Night Owl', ru: 'Ночная сова' }, xp: 30, area: 'spirit', cond: () => new Date().getHours() >= 23 },
    { id: 'early_bird', icon: '🐦', name: { uz: 'Erta qush', en: 'Early Bird', ru: 'Ранняя пташка' }, xp: 30, area: 'body', cond: () => new Date().getHours() < 6 },
    { id: 'polymath_h', icon: '🧬', name: { uz: 'Hammasi birga', en: 'Renaissance', ru: 'Возрождение' }, xp: 60, area: 'craft', cond: (m, s) => (s.combo.areas || []).length >= 7 },
    { id: 'rich_h', icon: '💎', name: { uz: 'Xazinabon', en: 'Treasure Hoard', ru: 'Сокровищница' }, xp: 40, area: 'wealth', cond: (m, s) => s.coins >= 500 },
    { id: 'marathon_h', icon: '🏅', name: { uz: 'Marafonchi', en: 'Marathoner', ru: 'Марафонец' }, xp: 80, area: 'body', cond: (m) => m.longest >= 50 },
    { id: 'power_h', icon: '🔱', name: { uz: 'Yuksak quvvat', en: 'Ascended', ru: 'Вознесённый' }, xp: 100, area: 'spirit', cond: (m) => m.power >= 150 },
  ];
  function checkHidden(s) {
    const m = metrics();
    HIDDEN.forEach((def) => {
      if (s.quests.hidden.some((h) => h.id === def.id)) return;
      let ok = false; try { ok = def.cond(m, s); } catch (e) { ok = false; }
      if (ok) {
        s.quests.hidden.push({ id: def.id, unlockedAt: new Date().toISOString() });
        s.coins += 15;
        addXP(def.area, def.xp, { fromAward: true, src: 'hidden' });
        emit('quest', { hidden: true, def });
      }
    });
  }

  /* ----------------------------- Aggregate checks ----------------------------- */
  let inCheck = false;
  function checkAll(s) {
    if (inCheck) return; inCheck = true;
    try { checkAchievements(s); checkTitles(s); checkHidden(s); checkEpics(s); }
    finally { inCheck = false; }
  }

  /* ----------------------------- Daily rollover ----------------------------- */
  function ensureDaily() {
    const s = D.get();
    ensureQuests(s);
    ensureDailyBoss(s);
    petDecay(s, U.todayStr());
    // streak break: if last active was >2 days ago, reset current (longest preserved)
    if (s.streak.lastDate) { const gap = daysBetween(s.streak.lastDate, U.todayStr()); if (gap > 2) s.streak.current = 0; }
    checkAll(s);
    D.saveNow();
  }

  /* ----------------------------- Quotes ----------------------------- */
  let sessionSeen = [];
  function quote() {
    const Q = D.QUOTES; if (!Q.length) return { text: '', by: '' };
    if (sessionSeen.length >= Q.length) sessionSeen = [];
    let idx;
    do { idx = Math.floor(Math.random() * Q.length); } while (sessionSeen.includes(idx) && sessionSeen.length < Q.length);
    sessionSeen.push(idx);
    const q = Q[idx]; const lang = LV.i18n.getLang();
    return { text: q[lang] || q.en, by: q.by };
  }

  /* ----------------------------- Public API ----------------------------- */
  LV.Game = {
    on, off, emit,
    xpForLevelUp, levelFromXP, DIFFICULTY_XP, BOSS_HP, BOSS_REWARD, BOSS_DAYS,
    areaXP, areaLevel, areaProgress, subLevel, totalPower, totalLevel,
    rankFor, nextRankInfo, petStage, petInfo, avatarFor,
    addXP, quickLog,
    habitXP, isHabitDoneToday, toggleHabit, addHabit, removeHabit, computeHabitStreak,
    addTask, setTaskStatus, toggleTask, removeTask,
    recordFocus,
    createBoss, dealBossDamage, removeBoss,
    strikeDailyBoss, ensureDailyBoss,
    doProQuest, proDoneToday,
    ensureQuests, ensureDaily, epicProgress, completeQuest,
    metrics, xpByDay,
    ACH, ACH_COINS, TITLES, HIDDEN, titleName,
    quote,
  };
})(window.LV = window.LV || {});
