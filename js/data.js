/* =====================================================================
   LEVELING — Data layer
   Constants, state model, localStorage persistence, demo seed, import/export
   ===================================================================== */
(function (LV) {
  'use strict';

  const STORAGE_KEY = 'leveling.state.v1';
  const STATE_VERSION = 1;

  /* ----------------------------- Constants ----------------------------- */
  const AREAS = [
    { key: 'body',   icon: '💪', color: '#ef4444' },
    { key: 'mind',   icon: '🧠', color: '#3b82f6' },
    { key: 'heart',  icon: '❤️', color: '#ec4899' },
    { key: 'wealth', icon: '💰', color: '#10b981' },
    { key: 'social', icon: '🤝', color: '#f59e0b' },
    { key: 'craft',  icon: '🎨', color: '#8b5cf6' },
    { key: 'spirit', icon: '🎯', color: '#eab308' },
  ];
  const AREA_KEYS = AREAS.map((a) => a.key);

  const SUBSKILLS = {
    body:   ['strength', 'cardio', 'flexibility', 'nutrition'],
    mind:   ['focus', 'learning', 'reading', 'problem'],
    heart:  ['gratitude', 'relationships', 'selfcare', 'mindful'],
    wealth: ['saving', 'earning', 'investing', 'budgeting'],
    social: ['networking', 'communication', 'helping', 'family'],
    craft:  ['art', 'music', 'writing', 'building'],
    spirit: ['meditation', 'purpose', 'reflection', 'nature'],
  };
  const SUBSKILL_LABELS = {
    strength: '🏋️ Strength', cardio: '🏃 Cardio', flexibility: '🤸 Flexibility', nutrition: '🥗 Nutrition',
    focus: '🎯 Focus', learning: '📚 Learning', reading: '📖 Reading', problem: '🧩 Problem solving',
    gratitude: '🙏 Gratitude', relationships: '💞 Relationships', selfcare: '🛁 Self-care', mindful: '🌬️ Mindfulness',
    saving: '🏦 Saving', earning: '💵 Earning', investing: '📈 Investing', budgeting: '🧾 Budgeting',
    networking: '🌐 Networking', communication: '🗣️ Communication', helping: '🫶 Helping', family: '👨‍👩‍👧 Family',
    art: '🖼️ Art', music: '🎵 Music', writing: '✍️ Writing', building: '🛠️ Building',
    meditation: '🧘 Meditation', purpose: '🧭 Purpose', reflection: '📔 Reflection', nature: '🌲 Nature',
  };

  // Ranks by Total Power (sum of all area levels)
  const RANKS = [
    { key: 'rank_beginner',   min: 0,   emoji: '🌑' },
    { key: 'rank_apprentice', min: 21,  emoji: '🌒' },
    { key: 'rank_adept',      min: 51,  emoji: '🌓' },
    { key: 'rank_expert',     min: 101, emoji: '🌔' },
    { key: 'rank_master',     min: 201, emoji: '🌕' },
    { key: 'rank_legend',     min: 351, emoji: '✦' },
    { key: 'rank_mythic',     min: 600, emoji: '💫' },
  ];

  // Productivity pet — 12 evolution stages by total level threshold
  const PET_STAGES = [
    { emoji: '🌱', min: 0 },   { emoji: '🌿', min: 8 },   { emoji: '🦋', min: 18 },
    { emoji: '🦄', min: 32 },  { emoji: '🧚', min: 50 },  { emoji: '🐲', min: 72 },
    { emoji: '🦅', min: 100 }, { emoji: '🐉', min: 140 }, { emoji: '🦉', min: 190 },
    { emoji: '🌟', min: 250 }, { emoji: '⚡', min: 330 }, { emoji: '🔮', min: 430 },
  ];

  // Avatar evolves with total level
  const AVATARS = ['🧑', '🧑‍🎓', '🧑‍🚀', '🦸', '🧙', '👑'];

  const HABIT_TEMPLATES = [
    { name: '💧 Drink 2L water', area: 'body', difficulty: 'easy', sub: 'nutrition' },
    { name: '🏋️ Workout 30 min', area: 'body', difficulty: 'hard', sub: 'strength' },
    { name: '🏃 10k steps', area: 'body', difficulty: 'medium', sub: 'cardio' },
    { name: '📖 Read 20 pages', area: 'mind', difficulty: 'medium', sub: 'reading' },
    { name: '🧠 Learn something new', area: 'mind', difficulty: 'medium', sub: 'learning' },
    { name: '🙏 Write 3 gratitudes', area: 'heart', difficulty: 'easy', sub: 'gratitude' },
    { name: '🧘 Meditate 10 min', area: 'spirit', difficulty: 'easy', sub: 'meditation' },
    { name: '💰 Track expenses', area: 'wealth', difficulty: 'easy', sub: 'budgeting' },
    { name: '📞 Connect with someone', area: 'social', difficulty: 'medium', sub: 'communication' },
    { name: '🎨 Create for 30 min', area: 'craft', difficulty: 'medium', sub: 'art' },
    { name: '🌬️ No phone first hour', area: 'mind', difficulty: 'hard', sub: 'focus' },
    { name: '🛁 Self-care ritual', area: 'heart', difficulty: 'easy', sub: 'selfcare' },
  ];

  // Real-world quests (LEVELING Pro)
  const PRO_QUESTS = [
    { id: 'pro_stranger', text: { uz: "Notanishga yordam bering", en: 'Help a stranger', ru: 'Помогите незнакомцу' }, area: 'heart', xp: 50, icon: '🫶' },
    { id: 'pro_meet', text: { uz: "Yangi odam bilan tanishing", en: 'Meet someone new', ru: 'Познакомьтесь с кем-то' }, area: 'social', xp: 30, icon: '👋' },
    { id: 'pro_nophone', text: { uz: '1 soat telefonsiz', en: '1 hour no phone', ru: '1 час без телефона' }, area: 'mind', xp: 40, icon: '📵' },
    { id: 'pro_cold', text: { uz: 'Sovuq dush', en: 'Cold shower', ru: 'Холодный душ' }, area: 'body', xp: 30, icon: '🚿' },
    { id: 'pro_sunrise', text: { uz: 'Quyosh chiqishini kuzating', en: 'Watch the sunrise', ru: 'Встретьте рассвет' }, area: 'spirit', xp: 35, icon: '🌅' },
    { id: 'pro_declutter', text: { uz: 'Bir joyni tartibga keltiring', en: 'Declutter one space', ru: 'Разберите одно место' }, area: 'craft', xp: 25, icon: '🧹' },
    { id: 'pro_save', text: { uz: 'Bugun pul tejang', en: 'Save money today', ru: 'Сэкономьте деньги сегодня' }, area: 'wealth', xp: 30, icon: '🪙' },
    { id: 'pro_call_family', text: { uz: 'Oilangizga qo\'ng\'iroq qiling', en: 'Call your family', ru: 'Позвоните семье' }, area: 'social', xp: 30, icon: '📱' },
  ];

  // Quest pools (auto-generated daily/weekly/monthly)
  const QUEST_POOL = [
    { text: { uz: 'Tana sohasiga 30 XP', en: 'Earn 30 Body XP', ru: '30 XP Тела' }, area: 'body', xp: 30, target: 30, type: 'xp' },
    { text: { uz: 'Aql sohasiga 30 XP', en: 'Earn 30 Mind XP', ru: '30 XP Разума' }, area: 'mind', xp: 30, target: 30, type: 'xp' },
    { text: { uz: 'Qalb sohasiga 25 XP', en: 'Earn 25 Heart XP', ru: '25 XP Сердца' }, area: 'heart', xp: 25, target: 25, type: 'xp' },
    { text: { uz: 'Boylik sohasiga 25 XP', en: 'Earn 25 Wealth XP', ru: '25 XP Богатства' }, area: 'wealth', xp: 25, target: 25, type: 'xp' },
    { text: { uz: 'Aloqa sohasiga 25 XP', en: 'Earn 25 Social XP', ru: '25 XP Общения' }, area: 'social', xp: 25, target: 25, type: 'xp' },
    { text: { uz: 'Ijod sohasiga 25 XP', en: 'Earn 25 Craft XP', ru: '25 XP Творчества' }, area: 'craft', xp: 25, target: 25, type: 'xp' },
    { text: { uz: 'Ruh sohasiga 20 XP', en: 'Earn 20 Spirit XP', ru: '20 XP Духа' }, area: 'spirit', xp: 20, target: 20, type: 'xp' },
    { text: { uz: '1 ta odatni bajaring', en: 'Complete 1 habit', ru: 'Выполните 1 привычку' }, area: 'mind', xp: 20, target: 1, type: 'habit' },
    { text: { uz: '1 ta vazifani yakunlang', en: 'Finish 1 task', ru: 'Завершите 1 задачу' }, area: 'craft', xp: 20, target: 1, type: 'task' },
    { text: { uz: 'Fokus sessiyasi o\'tkazing', en: 'Do a focus session', ru: 'Проведите сессию фокуса' }, area: 'mind', xp: 25, target: 1, type: 'focus' },
    { text: { uz: '3 sohada faol bo\'ling', en: 'Be active in 3 areas', ru: 'Будьте активны в 3 сферах' }, area: 'spirit', xp: 35, target: 3, type: 'areas' },
  ];

  /* ----------------------------- Utilities ----------------------------- */
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dateAdd(str, days) {
    const d = new Date(str + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return todayStr(d);
  }
  function weekKey(d) {
    d = d || new Date();
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (dt.getUTCDay() + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((dt - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return dt.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
  }
  function monthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function uid(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  LV.util = { todayStr, dateAdd, weekKey, monthKey, uid, clamp };

  /* ----------------------------- Default state ----------------------------- */
  function defaultState() {
    const areas = {};
    AREA_KEYS.forEach((k) => { areas[k] = { xp: 0 }; });
    const subskills = {};
    AREA_KEYS.forEach((a) => SUBSKILLS[a].forEach((s) => { subskills[a + '.' + s] = { xp: 0 }; }));
    return {
      version: STATE_VERSION,
      onboarded: false,
      createdAt: new Date().toISOString(),
      profile: { name: 'Hunter', avatar: '🧑', focusAreas: [], titleEquipped: null },
      settings: { theme: 'system', accent: 'auto', lang: 'uz', sound: true, haptics: true, notifications: false, plusMode: true },
      areas,
      subskills,
      habits: [],
      tasks: [],
      bosses: [],
      quests: { dailyDate: null, daily: [], weekKey: null, weekly: [], monthKey: null, monthly: [], epic: [], hidden: [] },
      achievements: {},
      titles: [],
      pet: { stage: 0, happiness: 80, energy: 80, lastUpdate: todayStr() },
      coins: 0,
      shop: { owned: [] },
      streak: { current: 0, longest: 0, lastDate: null, shields: 1 },
      log: [],
      focus: { sessions: [], totalMinutes: 0 },
      daysActive: {},
      combo: { date: null, areas: [] },
      dailyBoss: { date: null, defeated: false, dealt: 0 },
      proDone: {},
      quotesSeen: [],
      stats: { totalXP: 0 },
      tourDone: false,
    };
  }

  /* ----------------------------- Persistence ----------------------------- */
  let state = null;

  function deepMerge(base, over) {
    if (Array.isArray(base)) return over != null ? over : base;
    if (typeof base === 'object' && base !== null) {
      const out = Array.isArray(over) ? {} : Object.assign({}, base);
      if (over && typeof over === 'object') {
        for (const k in over) {
          out[k] = (k in base) ? deepMerge(base[k], over[k]) : over[k];
        }
      }
      return out;
    }
    return over != null ? over : base;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = deepMerge(defaultState(), parsed);
      } else {
        state = defaultState();
      }
    } catch (e) {
      console.warn('LEVELING: failed to load state, resetting', e);
      state = defaultState();
    }
    return state;
  }

  let saveTimer = null;
  function save() {
    if (!state) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch (e) { console.warn('LEVELING: save failed', e); }
    }, 120);
  }
  function saveNow() {
    if (!state) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('LEVELING: save failed', e); }
  }

  function get() { return state || load(); }
  function reset() { state = defaultState(); saveNow(); return state; }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }
  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid file');
    state = deepMerge(defaultState(), parsed);
    saveNow();
    return state;
  }

  /* ----------------------------- Demo seed ----------------------------- */
  function seedDemo() {
    const s = get();
    // A few starter habits across areas (so pages aren't empty)
    const picks = [HABIT_TEMPLATES[0], HABIT_TEMPLATES[3], HABIT_TEMPLATES[6]];
    picks.forEach((tpl) => {
      s.habits.push({
        id: uid('habit'), name: tpl.name, area: tpl.area, sub: tpl.sub,
        difficulty: tpl.difficulty, frequency: 'daily', streak: 0,
        history: {}, createdAt: new Date().toISOString(),
      });
    });
    // A sample task
    s.tasks.push({
      id: uid('task'), title: '🚀 Explore LEVELING', area: 'mind', priority: 'medium',
      deadline: null, status: 'todo', done: false, createdAt: new Date().toISOString(),
    });
    // A sample mini boss
    s.bosses.push({
      id: uid('boss'), name: '🔥 7-day momentum', area: 'spirit', tier: 'mini',
      hpMax: 700, hp: 700, createdAt: new Date().toISOString(), defeatedAt: null, log: [],
    });
    saveNow();
  }

  LV.Data = {
    STORAGE_KEY, STATE_VERSION,
    AREAS, AREA_KEYS, SUBSKILLS, SUBSKILL_LABELS, RANKS, PET_STAGES, AVATARS,
    HABIT_TEMPLATES, PRO_QUESTS, QUEST_POOL, QUOTES: [],
    defaultState, load, save, saveNow, get, reset, exportJSON, importJSON, seedDemo,
    area: (k) => AREAS.find((a) => a.key === k),
  };
})(window.LV = window.LV || {});


/* ----------------------------- Quotes (50+) ----------------------------- */
(function (LV) {
  LV.Data.QUOTES = [
    { by: 'Lao Tzu', uz: "Ming chaqirimlik yo'l bir qadamdan boshlanadi.", en: 'A journey of a thousand miles begins with a single step.', ru: 'Путь в тысячу миль начинается с одного шага.' },
    { by: 'Aristotle', uz: 'Biz takror qiladigan narsamiz. Mukammallik — odat.', en: 'We are what we repeatedly do. Excellence is a habit.', ru: 'Мы есть то, что постоянно делаем. Совершенство — это привычка.' },
    { by: 'Confucius', uz: 'Sekin yursang ham, to\'xtama.', en: "It does not matter how slowly you go as long as you do not stop.", ru: 'Неважно, как медленно ты идёшь, пока ты не останавливаешься.' },
    { by: 'James Clear', uz: 'Har bir harakat — bo\'lmoqchi bo\'lgan insoning uchun ovoz.', en: 'Every action is a vote for the person you wish to become.', ru: 'Каждое действие — это голос за того, кем ты хочешь стать.' },
    { by: 'Seneca', uz: 'Imkoniyat tayyorgarlik bilan uchrashganda omad tug\'iladi.', en: 'Luck is what happens when preparation meets opportunity.', ru: 'Удача — это когда подготовка встречает возможность.' },
    { by: 'Theodore Roosevelt', uz: 'Bor narsangiz bilan, hozir, qaerda bo\'lsangiz qiling.', en: 'Do what you can, with what you have, where you are.', ru: 'Делай что можешь, с тем что есть, там где ты есть.' },
    { by: 'Bruce Lee', uz: 'Maqsadlar har doim ham erishish uchun emas — yo\'nalish uchun.', en: 'A goal is not always meant to be reached, it serves as something to aim at.', ru: 'Цель не всегда должна быть достигнута — она служит ориентиром.' },
    { by: 'Mark Twain', uz: 'Oldinga chiqishning siri — boshlashdir.', en: 'The secret of getting ahead is getting started.', ru: 'Секрет успеха — это начать.' },
    { by: 'Nelson Mandela', uz: 'Yiqilmaslikda emas, har safar turishda ulug\'lik.', en: 'The greatest glory is in rising every time we fall.', ru: 'Величайшая слава — подниматься каждый раз, когда падаешь.' },
    { by: 'Walt Disney', uz: 'Boshlashning yo\'li — gapni to\'xtatib, ish qilishdir.', en: 'The way to get started is to quit talking and begin doing.', ru: 'Чтобы начать, перестаньте говорить и начните делать.' },
    { by: 'Sun Tzu', uz: 'O\'zingni bil — yuz jangda ham xavfsiz bo\'lasan.', en: 'Know yourself and you need not fear a hundred battles.', ru: 'Познай себя — и не будешь бояться сотни сражений.' },
    { by: 'Marcus Aurelius', uz: 'Hayot sifati fikrlaring sifatiga bog\'liq.', en: 'The quality of your life depends on the quality of your thoughts.', ru: 'Качество жизни зависит от качества мыслей.' },
    { by: 'Naval Ravikant', uz: 'Tinch ong — eng kuchli supergap.', en: 'A calm mind is a superpower.', ru: 'Спокойный ум — это суперсила.' },
    { by: 'Peter Drucker', uz: 'Kelajakni bashorat qilishning eng yaxshi yo\'li — uni yaratish.', en: 'The best way to predict the future is to create it.', ru: 'Лучший способ предсказать будущее — создать его.' },
    { by: 'Will Durant', uz: 'Biz qilgan ishimizmiz, demak mukammallik — odat.', en: 'Excellence is not an act but a habit.', ru: 'Совершенство — это не действие, а привычка.' },
    { by: 'Zig Ziglar', uz: 'Boshlash uchun ulug\' bo\'lish shart emas, lekin ulug\' bo\'lish uchun boshlash kerak.', en: "You don't have to be great to start, but you have to start to be great.", ru: 'Не нужно быть великим, чтобы начать, но нужно начать, чтобы стать великим.' },
    { by: 'Robin Sharma', uz: 'Yulduzlar atrofingni o\'rab olishidan oldin tunni o\'tasan.', en: 'All change is hard at first, messy in the middle and gorgeous at the end.', ru: 'Любые перемены трудны вначале, хаотичны в середине и прекрасны в конце.' },
    { by: 'Tony Robbins', uz: 'Bugun qilgan ishing kelajagingni belgilaydi.', en: "It is in your moments of decision that your destiny is shaped.", ru: 'Именно в моменты решений формируется твоя судьба.' },
    { by: 'Epictetus', uz: 'Sodir bo\'lgan emas, unga munosabating muhim.', en: "It's not what happens to you, but how you react that matters.", ru: 'Важно не то, что с тобой происходит, а как ты реагируешь.' },
    { by: 'Vince Lombardi', uz: 'Ish g\'alabadan oldin keladi — faqat lug\'atda emas.', en: 'The only place success comes before work is in the dictionary.', ru: 'Успех приходит раньше труда только в словаре.' },
    { by: 'Henry Ford', uz: 'Qila olaman desang ham, qila olmayman desang ham — haqsan.', en: 'Whether you think you can, or you think you cannot — you are right.', ru: 'Веришь ты, что можешь, или нет — ты прав в обоих случаях.' },
    { by: 'Steve Jobs', uz: 'Yagona yo\'l — ishingni sevish.', en: 'The only way to do great work is to love what you do.', ru: 'Единственный способ делать великие дела — любить своё дело.' },
    { by: 'Albert Einstein', uz: 'Hayotda muvozanat saqlash uchun harakatda bo\'l, velosipedchidek.', en: 'Life is like riding a bicycle. To keep your balance you must keep moving.', ru: 'Жизнь как езда на велосипеде: чтобы держать равновесие, надо двигаться.' },
    { by: 'Maya Angelou', uz: 'Hammasini o\'zgartira olmaysan, lekin o\'zgarmaguncha hech narsa o\'zgarmaydi.', en: "Nothing will work unless you do.", ru: 'Ничего не сработает, пока ты сам не начнёшь.' },
    { by: 'Jim Rohn', uz: 'Intizob — istak va yutuq orasidagi ko\'prik.', en: 'Discipline is the bridge between goals and accomplishment.', ru: 'Дисциплина — мост между целями и достижениями.' },
    { by: 'Rumi', uz: 'Kechagi aqlli edim, dunyoni o\'zgartirmoqchi edim. Bugun donoman — o\'zimni.', en: 'Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.', ru: 'Вчера я был умён и хотел изменить мир. Сегодня я мудр и меняю себя.' },
    { by: 'Benjamin Franklin', uz: 'Tayyorgarlik ko\'rmaslik — muvaffaqiyatsizlikka tayyorlanish.', en: 'By failing to prepare, you are preparing to fail.', ru: 'Не готовясь, ты готовишься проиграть.' },
    { by: 'Pelé', uz: 'Muvaffaqiyat — mehnat, mashq va sabrning natijasi.', en: 'Success is hard work, perseverance, learning and sacrifice.', ru: 'Успех — это труд, упорство, обучение и жертвы.' },
    { by: 'Helen Keller', uz: 'Yolg\'iz oz, birga ko\'p qilamiz.', en: 'Alone we can do so little; together we can do so much.', ru: 'В одиночку мы можем мало; вместе — очень много.' },
    { by: 'Wayne Gretzky', uz: 'Urilmagan zarbaning 100% xato ketadi.', en: 'You miss 100% of the shots you do not take.', ru: 'Ты промахиваешься в 100% бросков, которые не делаешь.' },
    { by: 'Socrates', uz: 'Eski bilan kurashmang — yangini qurishga kuch sarflang.', en: 'The secret of change is to focus all energy not on fighting the old, but on building the new.', ru: 'Секрет перемен — направить энергию не на борьбу со старым, а на создание нового.' },
    { by: 'Dalai Lama', uz: 'Baxt tayyor narsa emas — sening harakatlaringdan tug\'iladi.', en: 'Happiness is not something ready made. It comes from your own actions.', ru: 'Счастье не приходит готовым — оно рождается из твоих действий.' },
    { by: 'Thomas Edison', uz: 'Men kashf qilmadim — ishlamaydigan 10 000 usulni topdim.', en: "I have not failed. I've just found 10,000 ways that won't work.", ru: 'Я не потерпел неудачу. Я нашёл 10 000 способов, которые не работают.' },
    { by: 'Mahatma Gandhi', uz: 'Ko\'rmoqchi bo\'lgan o\'zgarishning o\'zi bo\'l.', en: 'Be the change you wish to see in the world.', ru: 'Будь тем изменением, которое хочешь видеть в мире.' },
    { by: 'Eleanor Roosevelt', uz: 'Kelajak — orzularining go\'zalligiga ishonganlarniki.', en: 'The future belongs to those who believe in the beauty of their dreams.', ru: 'Будущее принадлежит тем, кто верит в красоту своей мечты.' },
    { by: 'Colin Powell', uz: 'Muvaffaqiyatning siri yo\'q. U tayyorgarlik va mehnat natijasi.', en: 'There are no secrets to success. It is preparation and hard work.', ru: 'Секретов успеха нет. Это подготовка и упорный труд.' },
    { by: 'Picasso', uz: 'Harakat — barcha muvaffaqiyatning kalitidir.', en: 'Action is the foundational key to all success.', ru: 'Действие — основа всякого успеха.' },
    { by: 'Buddha', uz: 'Yo\'lda yurganlardan boshqa hech kim yo\'lni bosib o\'tmaydi.', en: 'No one saves us but ourselves. We must walk the path.', ru: 'Никто не спасёт нас, кроме нас самих. Мы должны пройти путь.' },
    { by: 'Tim Ferriss', uz: 'Eng muhim ishni eng oson paytda emas, hozir qil.', en: 'Focus on being productive instead of busy.', ru: 'Будь продуктивным, а не занятым.' },
    { by: 'Roy T. Bennett', uz: 'O\'tmishingda yashama — bugunga kuch ber.', en: 'Do not stop until you are proud.', ru: 'Не останавливайся, пока не начнёшь гордиться собой.' },
    { by: 'Arnold Schwarzenegger', uz: 'Og\'riq — kuchsizlikning tanani tark etishi.', en: 'Strength does not come from winning. Struggles develop your strengths.', ru: 'Сила приходит не из побед. Трудности развивают твою силу.' },
    { by: 'Leonardo da Vinci', uz: 'Soddalik — yuksak murakkablik.', en: 'Simplicity is the ultimate sophistication.', ru: 'Простота — высшая степень утончённости.' },
    { by: 'Oprah Winfrey', uz: 'Yashagan har bir kun — o\'sish imkoni.', en: 'The biggest adventure is to live the life of your dreams.', ru: 'Самое большое приключение — жить жизнью своей мечты.' },
    { by: 'Kobe Bryant', uz: 'Sayohatdan zavqlan — manzil emas, yo\'l muhim.', en: 'The most important thing is to try and inspire people to be great.', ru: 'Самое важное — вдохновлять людей быть великими.' },
    { by: 'C.S. Lewis', uz: 'Yangi maqsad qo\'yish uchun yosh hech qachon kech emas.', en: 'You are never too old to set another goal or to dream a new dream.', ru: 'Никогда не поздно поставить новую цель или мечтать о новом.' },
    { by: 'Antoine de Saint-Exupéry', uz: 'Kelajakni rejalashtirma — uni mumkin qil.', en: 'A goal without a plan is just a wish.', ru: 'Цель без плана — это просто мечта.' },
    { by: 'Norman Vincent Peale', uz: 'Oyga uloqtir — yetolmasang ham yulduzlar orasida bo\'lasan.', en: 'Shoot for the moon. Even if you miss, you will land among the stars.', ru: 'Целься в Луну. Даже промахнувшись, окажешься среди звёзд.' },
    { by: 'Aristotle', uz: 'Bilim ildizi achchiq, mevasi shirin.', en: 'The roots of education are bitter, but the fruit is sweet.', ru: 'Корни знания горьки, но плоды сладки.' },
    { by: 'Japanese proverb', uz: 'Yetti marta yiqil, sakkiz marta tur.', en: 'Fall seven times, stand up eight.', ru: 'Упади семь раз — поднимись восемь.' },
    { by: 'Winston Churchill', uz: 'Muvaffaqiyat — ishtiyoqni yo\'qotmay xatodan xatoga o\'tish.', en: 'Success is going from failure to failure without losing enthusiasm.', ru: 'Успех — это идти от неудачи к неудаче, не теряя энтузиазма.' },
    { by: 'LEVELING', uz: 'Bugun 1% yaxshilan. Daraja kutmoqda. ⚡', en: 'Get 1% better today. A new level awaits. ⚡', ru: 'Стань на 1% лучше сегодня. Новый уровень ждёт. ⚡' },
    { by: 'LEVELING', uz: 'Kichik harakatlar — katta darajalar.', en: 'Small actions, big levels.', ru: 'Маленькие действия — большие уровни.' },
  ];
})(window.LV = window.LV || {});
