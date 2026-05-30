/* =====================================================================
   LEVELING — Confetti particle system (canvas)
   ===================================================================== */
(function (LV) {
  'use strict';

  let canvas = null, ctx = null, dpr = 1;
  let particles = [];
  let running = false;

  const PALETTE = ['#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#eab308', '#ef4444', '#ffffff'];

  function init() {
    canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }
  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(x, y, opts) {
    opts = opts || {};
    const count = opts.count || 80;
    const colors = opts.colors || PALETTE;
    const power = opts.power || 11;
    const spread = opts.spread != null ? opts.spread : Math.PI * 2;
    const dir = opts.dir != null ? opts.dir : -Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const angle = dir + rand(-spread / 2, spread / 2);
      const speed = rand(power * 0.4, power) * (opts.power ? 1 : 1);
      particles.push({
        x: x * dpr, y: y * dpr,
        vx: Math.cos(angle) * speed * dpr,
        vy: Math.sin(angle) * speed * dpr - rand(0, 3) * dpr,
        g: rand(0.18, 0.32) * dpr,
        size: rand(5, 11) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.3, 0.3),
        life: 0, ttl: rand(70, 130),
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
        drag: rand(0.985, 0.995),
      });
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  function burst(opts) {
    opts = opts || {};
    const x = opts.x != null ? opts.x : window.innerWidth / 2;
    const y = opts.y != null ? opts.y : window.innerHeight / 2;
    spawn(x, y, opts);
  }

  // Celebration: confetti from both bottom corners + center pop
  function celebrate(colors) {
    const c = colors || PALETTE;
    burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.42, count: 120, colors: c, power: 14 });
    spawn(8, window.innerHeight, { count: 60, colors: c, power: 17, dir: -Math.PI / 3, spread: Math.PI / 3 });
    spawn(window.innerWidth - 8, window.innerHeight, { count: 60, colors: c, power: 17, dir: -Math.PI * 2 / 3, spread: Math.PI / 3 });
  }

  function loop() {
    if (!ctx) { running = false; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
      const alpha = Math.max(0, 1 - p.life / p.ttl);
      if (alpha <= 0 || p.y > canvas.height + 40) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (particles.length > 0) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  LV.Confetti = { init, burst, celebrate, PALETTE };
})(window.LV = window.LV || {});
