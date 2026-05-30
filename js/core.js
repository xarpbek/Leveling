/* =====================================================================
   LEVELING — Core infrastructure
   Hash router, navigation, theme, modals, sheets, topbar, toasts, haptics
   ===================================================================== */
(function (LV) {
  'use strict';

  /* ----------------------------- Routes ----------------------------- */
  var ROUTES = [
    'dashboard', 'skills', 'bosses', 'quests', 'character',
    'habits', 'tasks', 'focus', 'analytics', 'achievements', 'shop', 'settings'
  ];

  var NAV_ICONS = {
    dashboard: '\uD83D\uDCCA', skills: '\uD83C\uDF33', bosses: '\u2694\uFE0F',
    quests: '\uD83D\uDCDC', character: '\uD83E\uDDD1', habits: '\u2705',
    tasks: '\uD83D\uDCCB', focus: '\uD83C\uDFAF', analytics: '\uD83D\uDCC8',
    achievements: '\uD83C\uDFC6', shop: '\uD83D\uDED2', settings: '\u2699\uFE0F'
  };

  var BOTTOM_NAV_ITEMS = [
    { route: 'dashboard', icon: '\uD83D\uDCCA', key: 'nav_dashboard' },
    { route: 'habits', icon: '\u2705', key: 'nav_habits' },
    { route: 'focus', icon: '\uD83C\uDFAF', key: 'nav_focus' },
    { route: 'quests', icon: '\uD83D\uDCDC', key: 'nav_quests' },
    { route: 'more', icon: '\u2630', key: 'nav_more' }
  ];

  var currentRoute = 'dashboard';

  /* ----------------------------- Hash Router ----------------------------- */
  function parseHash() {
    var hash = location.hash.replace(/^#\/?/, '');
    if (ROUTES.indexOf(hash) >= 0) return hash;
    return 'dashboard';
  }

  function navigate(route) {
    if (ROUTES.indexOf(route) < 0) route = 'dashboard';
    currentRoute = route;
    location.hash = '#/' + route;
    renderView(route);
    markActiveNav();
    updateTopbar(LV.t('nav_' + route));
  }

  function renderView(route) {
    var view = document.getElementById('view');
    if (!view) return;
    view.innerHTML = '';
    view.className = 'view viewIn';
    var fnName = 'render' + route.charAt(0).toUpperCase() + route.slice(1);
    if (LV.UI && typeof LV.UI[fnName] === 'function') {
      LV.UI[fnName](view);
    }
  }

  function onHashChange() {
    var route = parseHash();
    if (route !== currentRoute) {
      currentRoute = route;
      renderView(route);
      markActiveNav();
      updateTopbar(LV.t('nav_' + route));
    }
  }

  /* ----------------------------- Sidebar Nav (Desktop) ----------------------------- */
  function renderSidebarNav() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var html = '';
    for (var i = 0; i < ROUTES.length; i++) {
      var r = ROUTES[i];
      var active = r === currentRoute ? ' active' : '';
      html += '<a class="side-link' + active + '" data-route="' + r + '">' +
        '<span class="sl-ico">' + NAV_ICONS[r] + '</span> ' + LV.t('nav_' + r) + '</a>';
    }
    nav.innerHTML = html;
    nav.addEventListener('click', function (e) {
      var link = e.target.closest('.side-link');
      if (link && link.dataset.route) {
        navigate(link.dataset.route);
      }
    });

    renderSidebarFoot();
  }

  function renderSidebarFoot() {
    var foot = document.getElementById('sidebar-foot');
    if (!foot) return;
    var power = LV.Game ? LV.Game.totalPower() : 0;
    var rankInfo = LV.Game ? LV.Game.nextRankInfo() : null;
    var rankEmoji = rankInfo ? rankInfo.current.emoji : '';
    var rankName = rankInfo ? LV.t(rankInfo.current.key) : '';
    foot.innerHTML = '<div class="sidebar-rank">' + rankEmoji + ' ' + rankName +
      ' <span class="sidebar-power">\u26A1 ' + power + '</span></div>';
  }

  /* ----------------------------- Bottom Nav (Mobile) ----------------------------- */
  function renderBottomNav() {
    var nav = document.getElementById('bottom-nav');
    if (!nav) return;
    var html = '';
    for (var i = 0; i < BOTTOM_NAV_ITEMS.length; i++) {
      var item = BOTTOM_NAV_ITEMS[i];
      var active = item.route === currentRoute ? ' active' : '';
      html += '<div class="nav-item' + active + '" data-route="' + item.route + '">' +
        '<span class="nav-ico">' + item.icon + '</span>' +
        '<span>' + LV.t(item.key) + '</span></div>';
    }
    nav.innerHTML = html;
    nav.addEventListener('click', function (e) {
      var el = e.target.closest('.nav-item');
      if (!el) return;
      var route = el.dataset.route;
      if (route === 'more') {
        showMoreSheet();
      } else {
        navigate(route);
      }
    });
  }

  function showMoreSheet() {
    var mainRoutes = ['dashboard', 'habits', 'focus', 'quests'];
    var moreRoutes = ROUTES.filter(function (r) { return mainRoutes.indexOf(r) < 0; });
    var html = '<div class="sheet-list">';
    for (var i = 0; i < moreRoutes.length; i++) {
      var r = moreRoutes[i];
      html += '<a class="sheet-link" data-route="' + r + '">' +
        '<span class="sl-ico">' + NAV_ICONS[r] + '</span> ' + LV.t('nav_' + r) + '</a>';
    }
    html += '</div>';
    showSheet(html);
    var layer = document.getElementById('sheet-layer');
    if (layer) {
      layer.addEventListener('click', function handler(e) {
        var link = e.target.closest('.sheet-link');
        if (link && link.dataset.route) {
          hideSheet();
          navigate(link.dataset.route);
          layer.removeEventListener('click', handler);
        }
      });
    }
  }

  /* ----------------------------- Mark Active Nav ----------------------------- */
  function markActiveNav() {
    var sideLinks = document.querySelectorAll('#sidebar-nav .side-link');
    for (var i = 0; i < sideLinks.length; i++) {
      if (sideLinks[i].dataset.route === currentRoute) {
        sideLinks[i].classList.add('active');
      } else {
        sideLinks[i].classList.remove('active');
      }
    }
    var bottomItems = document.querySelectorAll('#bottom-nav .nav-item');
    for (var j = 0; j < bottomItems.length; j++) {
      var r = bottomItems[j].dataset.route;
      if (r === currentRoute || (r === 'more' && ['dashboard', 'habits', 'focus', 'quests'].indexOf(currentRoute) < 0)) {
        bottomItems[j].classList.add('active');
      } else {
        bottomItems[j].classList.remove('active');
      }
    }
  }

  /* ----------------------------- Theme Manager ----------------------------- */
  var mediaQuery = null;

  function applyTheme() {
    var s = LV.Data.get().settings;
    var theme = s.theme || 'system';
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.dataset.theme = theme;
    } else {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      document.documentElement.dataset.theme = mediaQuery.matches ? 'dark' : 'light';
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', onSystemThemeChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(onSystemThemeChange);
      }
    }
    applyAccent(s.accent);
  }

  function onSystemThemeChange(e) {
    var s = LV.Data.get().settings;
    if (s.theme === 'system') {
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    }
  }

  function applyAccent(color) {
    var doc = document.documentElement;
    if (color && color !== 'auto') {
      doc.style.setProperty('--accent', color);
      // Compute readable on-accent color (black for light bgs, white for dark)
      try {
        var hex = color.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        var r = parseInt(hex.substr(0,2),16);
        var g = parseInt(hex.substr(2,2),16);
        var b = parseInt(hex.substr(4,2),16);
        var lum = (0.299*r + 0.587*g + 0.114*b) / 255;
        doc.style.setProperty('--on-accent', lum > 0.6 ? '#0f1322' : '#ffffff');
        doc.style.setProperty('--accent-soft', 'color-mix(in srgb, ' + color + ' 16%, transparent)');
      } catch (e) {}
    } else {
      doc.style.removeProperty('--accent');
      doc.style.removeProperty('--on-accent');
      doc.style.removeProperty('--accent-soft');
    }
  }

  /* ----------------------------- Modal ----------------------------- */
  function showModal(html) {
    var layer = document.getElementById('modal-layer');
    if (!layer) return;
    layer.innerHTML = '<div class="modal">' + html + '</div>';
    layer.classList.remove('hidden');
    layer.addEventListener('click', onModalLayerClick);
  }

  function hideModal() {
    var layer = document.getElementById('modal-layer');
    if (!layer) return;
    layer.classList.add('hidden');
    layer.innerHTML = '';
    layer.removeEventListener('click', onModalLayerClick);
  }

  function onModalLayerClick(e) {
    if (e.target === document.getElementById('modal-layer')) {
      hideModal();
    }
  }

  /* ----------------------------- Sheet ----------------------------- */
  function showSheet(html) {
    var layer = document.getElementById('sheet-layer');
    if (!layer) return;
    layer.innerHTML = '<div class="sheet"><div class="sheet-grip"></div>' + html + '</div>';
    layer.classList.remove('hidden');
    layer.addEventListener('click', onSheetLayerClick);
  }

  function hideSheet() {
    var layer = document.getElementById('sheet-layer');
    if (!layer) return;
    layer.classList.add('hidden');
    layer.innerHTML = '';
    layer.removeEventListener('click', onSheetLayerClick);
  }

  function onSheetLayerClick(e) {
    if (e.target === document.getElementById('sheet-layer')) {
      hideSheet();
    }
  }

  /* ----------------------------- Topbar ----------------------------- */
  function updateTopbar(title) {
    var titleEl = document.getElementById('topbar-title');
    if (titleEl && title) titleEl.textContent = title;
    var powerEl = document.getElementById('topbar-power-val');
    if (powerEl && LV.Game) powerEl.textContent = LV.Game.totalPower();
    var coinsEl = document.getElementById('topbar-coins-val');
    if (coinsEl) coinsEl.textContent = LV.Data.get().coins;
  }

  /* ----------------------------- Toast System ----------------------------- */
  function showToast(opts) {
    opts = opts || {};
    var layer = document.getElementById('toast-layer');
    if (!layer) return;

    var toasts = layer.querySelectorAll('.toast');
    while (toasts.length >= 4) {
      layer.removeChild(toasts[0]);
      toasts = layer.querySelectorAll('.toast');
    }

    var el = document.createElement('div');
    el.className = 'toast' + (opts.type ? ' ' + opts.type : '') + (opts.xp ? ' xp' : '');
    var inner = '<span class="t-ico">' + (opts.icon || '') + '</span><span>' + (opts.text || '') + '</span>';
    if (opts.xp) {
      inner += '<span class="t-xp">+' + opts.xp + ' XP</span>';
    }
    el.innerHTML = inner;
    layer.appendChild(el);

    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }, 3000);
  }

  /* ----------------------------- Floating XP ----------------------------- */
  function showXPFloat(amount, x, y, color) {
    var el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = '+' + amount;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (color) el.style.setProperty('--accent', color);
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1100);
  }

  /* ----------------------------- Haptics ----------------------------- */
  function haptic(type) {
    var s = LV.Data.get().settings;
    if (!s.haptics) return;
    if (!navigator.vibrate) return;
    if (type === 'medium') {
      navigator.vibrate([20, 10, 20]);
    } else {
      navigator.vibrate([10]);
    }
  }

  /* ----------------------------- Keyboard Shortcuts ----------------------------- */
  function onKeyDown(e) {
    var tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    var key = e.key;
    /* Escape: close any open overlay */
    if (key === 'Escape') {
      var ml = document.getElementById('modal-layer');
      var sl = document.getElementById('sheet-layer');
      var fo = document.getElementById('focus-overlay');
      if (ml && !ml.classList.contains('hidden')) { hideModal(); return; }
      if (sl && !sl.classList.contains('hidden')) { hideSheet(); return; }
      if (fo && !fo.classList.contains('hidden')) {
        fo.classList.add('hidden'); fo.innerHTML = '';
        if (LV.Audio && LV.Audio.stopAmbient) LV.Audio.stopAmbient();
        return;
      }
    }
    /* Number 1-9: jump to nth route */
    if (key >= '1' && key <= '9') {
      var idx = parseInt(key, 10) - 1;
      if (idx < ROUTES.length) {
        e.preventDefault();
        navigate(ROUTES[idx]);
      }
      return;
    }
    /* L: open quick log */
    if (key === 'l' || key === 'L') {
      if (LV.UI && typeof LV.UI.showQuickLog === 'function') {
        e.preventDefault();
        LV.UI.showQuickLog();
      }
    }
  }

  /* ----------------------------- Render Nav (both) ----------------------------- */
  function renderNav() {
    renderSidebarNav();
    renderBottomNav();
  }

  /* ----------------------------- Init Router ----------------------------- */
  function initRouter() {
    renderNav();
    currentRoute = parseHash();
    navigate(currentRoute);
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('keydown', onKeyDown);
  }

  /* ----------------------------- Export ----------------------------- */
  LV.Core = {
    navigate: navigate,
    showModal: showModal,
    hideModal: hideModal,
    showSheet: showSheet,
    hideSheet: hideSheet,
    updateTopbar: updateTopbar,
    showToast: showToast,
    showXPFloat: showXPFloat,
    haptic: haptic,
    applyTheme: applyTheme,
    applyAccent: applyAccent,
    initRouter: initRouter,
    renderNav: renderNav
  };

})(window.LV = window.LV || {});
