/* =====================================================================
   LEVELING — Chart.js wrappers (radar / line / pie)
   Degrades gracefully when Chart.js is unavailable (offline / blocked CDN).
   ===================================================================== */
(function (LV) {
  'use strict';

  const registry = new WeakMap();

  function has() { return typeof window.Chart !== 'undefined'; }
  function cssVar(name, fallback) {
    try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; }
    catch (e) { return fallback; }
  }
  function gridColor() { return cssVar('--border-strong', 'rgba(255,255,255,.14)'); }
  function textColor() { return cssVar('--text-dim', '#9aa0b8'); }
  function withAlpha(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    const h = hex.length === 4 ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function destroy(canvas) { const c = registry.get(canvas); if (c) { try { c.destroy(); } catch (e) {} registry.delete(canvas); } }

  function fallback(canvas, msg) {
    const parent = canvas.parentElement;
    if (parent && !parent.querySelector('.chart-fallback')) {
      const d = document.createElement('div');
      d.className = 'chart-fallback empty';
      d.style.padding = '24px';
      d.innerHTML = '<div class="e-ico">📊</div><p class="muted">' + (msg || 'Chart unavailable offline') + '</p>';
      parent.appendChild(d);
    }
  }

  function baseFont() { return "'Inter', system-ui, sans-serif"; }

  function radar(canvas, labels, data, accent) {
    if (!canvas) return;
    destroy(canvas);
    if (!has()) return fallback(canvas);
    const color = accent || cssVar('--accent', '#8b5cf6');
    const ch = new window.Chart(canvas, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          data, fill: true,
          backgroundColor: withAlpha(color, 0.22),
          borderColor: color, borderWidth: 2,
          pointBackgroundColor: color, pointBorderColor: '#fff', pointRadius: 3, pointHoverRadius: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          r: {
            angleLines: { color: gridColor() }, grid: { color: gridColor() },
            pointLabels: { color: textColor(), font: { size: 12, family: baseFont() } },
            ticks: { display: false, stepSize: 1 }, beginAtZero: true,
          },
        },
        animation: { duration: 700 },
      },
    });
    registry.set(canvas, ch);
    return ch;
  }

  function line(canvas, labels, data, accent) {
    if (!canvas) return;
    destroy(canvas);
    if (!has()) return fallback(canvas);
    const color = accent || cssVar('--accent', '#8b5cf6');
    const ctx2 = canvas.getContext('2d');
    let grad = color;
    try {
      grad = ctx2.createLinearGradient(0, 0, 0, canvas.height || 200);
      grad.addColorStop(0, withAlpha(color, 0.35));
      grad.addColorStop(1, withAlpha(color, 0.02));
    } catch (e) {}
    const ch = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data, fill: true, backgroundColor: grad, borderColor: color, borderWidth: 2.5,
          tension: 0.38, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: color,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor(), font: { size: 10, family: baseFont() }, maxRotation: 0, autoSkipPadding: 16 } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10, family: baseFont() } }, beginAtZero: true },
        },
        animation: { duration: 700 },
      },
    });
    registry.set(canvas, ch);
    return ch;
  }

  function pie(canvas, labels, data, colors) {
    if (!canvas) return;
    destroy(canvas);
    if (!has()) return fallback(canvas);
    const ch = new window.Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: cssVar('--bg-1', '#0d0f1a'), borderWidth: 2, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { color: textColor(), font: { size: 11, family: baseFont() }, padding: 12, usePointStyle: true, pointStyle: 'circle' } } },
        animation: { duration: 700 },
      },
    });
    registry.set(canvas, ch);
    return ch;
  }

  function destroyAll(root) {
    (root || document).querySelectorAll('canvas').forEach((c) => destroy(c));
  }

  LV.Charts = { has, radar, line, pie, destroy, destroyAll };
})(window.LV = window.LV || {});
