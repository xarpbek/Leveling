/* =====================================================================
   LEVELING - App Bootstrap
   Init sequence, event wiring, service worker registration
   ===================================================================== */
(function (LV) {
  'use strict';

  function boot() {
    /* 1. Load state */
    LV.Data.load();
    var s = LV.Data.get();

    /* 2. Language */
    LV.i18n.setLang(s.settings.lang || 'uz');

    /* 3. Theme */
    LV.Core.applyTheme();

    /* 4. Confetti */
    if (LV.Confetti && LV.Confetti.init) LV.Confetti.init();

    /* 5. Audio */
    LV.Audio.setEnabled(s.settings.sound);

    /* 6. Onboarding or App */
    if (!s.onboarded) {
      showOnboarding();
    } else {
      showApp();
    }
  }

  function showOnboarding() {
    var onbEl = document.getElementById('onboarding');
    var appEl = document.getElementById('app');
    if (onbEl) { onbEl.classList.remove('hidden'); onbEl.setAttribute('aria-hidden', 'false'); }
    if (appEl) { appEl.classList.add('hidden'); }

    LV.UI.showOnboarding(function() {
      /* After onboarding completes */
      LV.Data.seedDemo();
      LV.Data.save();
      showApp();
    });
  }

  function showApp() {
    var onbEl = document.getElementById('onboarding');
    var appEl = document.getElementById('app');
    if (onbEl) { onbEl.classList.add('hidden'); onbEl.setAttribute('aria-hidden', 'true'); }
    if (appEl) { appEl.classList.remove('hidden'); }

    /* Daily rollover */
    LV.Game.ensureDaily();

    /* Wire game events */
    wireEvents();

    /* Start router */
    LV.Core.initRouter();

    /* Wire quick log button */
    var qlBtn = document.getElementById('quicklog-btn');
    if (qlBtn) {
      qlBtn.addEventListener('click', function() {
        LV.UI.showQuickLog();
      });
    }

    /* Wire menu btn for mobile sidebar toggle */
    var menuBtn = document.getElementById('menu-btn');
    var sidebar = document.getElementById('sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
      });
    }
  }

  function wireEvents() {
    LV.Game.on('xp', function(data) {
      var ai = LV.Data.area(data.area);
      var color = ai ? ai.color : '';
      var x = data.x || (window.innerWidth / 2);
      var y = data.y || 80;
      LV.Core.showXPFloat(data.amount, x, y, color);
      LV.Core.showToast({ icon: ai ? ai.icon : '&#9889;', text: '+' + data.amount + ' XP', xp: data.amount, type: 'xp' });
      LV.Core.haptic('light');
      LV.Core.updateTopbar();
    });

    LV.Game.on('levelup', function(data) {
      LV.UI.showLevelUp(data.area, data.level);
    });

    LV.Game.on('achievement', function(data) {
      var lang = LV.i18n.getLang();
      var name = data.ach && data.ach.name ? (data.ach.name[lang] || data.ach.name.en) : '';
      LV.Core.showToast({ icon: data.ach.icon, text: LV.t('achievement_unlocked') + ' ' + name });
      if (LV.Audio && LV.Audio.play) LV.Audio.play('achievement');
      if (LV.Confetti && LV.Confetti.burst) LV.Confetti.burst({ x: window.innerWidth / 2, y: window.innerHeight / 2, count: 40 });
    });

    LV.Game.on('boss', function(data) {
      LV.Core.showToast({ icon: '&#9876;', text: LV.t('boss_defeated') });
      if (LV.Audio && LV.Audio.play) LV.Audio.play('boss');
      if (LV.Confetti && LV.Confetti.celebrate) LV.Confetti.celebrate(['#f59e0b', '#ef4444']);
    });

    LV.Game.on('quest', function(data) {
      LV.Core.showToast({ icon: '&#128220;', text: LV.t('quest_complete') });
      if (LV.Audio && LV.Audio.play) LV.Audio.play('quest');
    });

    LV.Game.on('title', function(data) {
      var name = data.title ? LV.Game.titleName(data.title.id) : '';
      LV.Core.showToast({ icon: '&#127941;', text: LV.t('title_earned', { t: name }) });
    });

    LV.Game.on('combo', function(data) {
      LV.Core.showToast({ icon: '&#128279;', text: LV.t('combo_bonus', { n: '20' }) });
    });

    LV.Game.on('perfectday', function() {
      LV.Core.showToast({ icon: '&#127752;', text: LV.t('perfect_day') });
      if (LV.Audio && LV.Audio.play) LV.Audio.play('perfect');
      if (LV.Confetti && LV.Confetti.celebrate) LV.Confetti.celebrate(['#10b981', '#3b82f6', '#f59e0b']);
    });
  }

  /* Service worker registration */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function(err) {
        console.warn('SW registration failed:', err);
      });
    }
  }

  /* Hide loading screen */
  function hideLoading() {
    setTimeout(function() {
      var ls = document.getElementById('loading-screen');
      if (ls) ls.classList.add('done');
    }, 800);
  }

  /* DOMContentLoaded */
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
      boot();
      registerSW();
      hideLoading();
    });
  }

})(window.LV = window.LV || {});
