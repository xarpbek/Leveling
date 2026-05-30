/* =====================================================================
   LEVELING — Audio (Web Audio API synth, no external files)
   SFX: xp, levelup, achievement, boss, quest, click
   Ambient: rain, forest, ocean, cafe, white, pink
   ===================================================================== */
(function (LV) {
  'use strict';

  let ctx = null;
  let master = null;
  let enabled = true;
  let ambient = null;       // { type, nodes:[], stop() }
  let ambientGain = null;

  function isOn() { return enabled; }
  function setEnabled(v) { enabled = !!v; if (!enabled) stopAmbient(); }

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, when, dur, type, peak) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak || 0.25, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  const SFX = {
    click() { tone(420, 0, 0.06, 'triangle', 0.12); },
    xp() { tone(880, 0, 0.12, 'sine', 0.2); tone(1320, 0.05, 0.14, 'sine', 0.14); },
    quest() { tone(660, 0, 0.1, 'triangle', 0.2); tone(990, 0.09, 0.16, 'triangle', 0.18); },
    levelup() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => tone(f, i * 0.09, 0.4, 'sawtooth', 0.16));
      tone(1567.98, notes.length * 0.09, 0.6, 'sine', 0.18);
    },
    achievement() {
      const notes = [659.25, 783.99, 1046.5];
      notes.forEach((f, i) => { tone(f, i * 0.12, 0.5, 'triangle', 0.18); tone(f * 1.5, i * 0.12, 0.5, 'sine', 0.08); });
    },
    boss() {
      // dramatic hit then victory rise
      tone(70, 0, 0.5, 'sawtooth', 0.3);
      tone(110, 0.02, 0.5, 'square', 0.12);
      [392, 523.25, 659.25, 880].forEach((f, i) => tone(f, 0.35 + i * 0.1, 0.45, 'sawtooth', 0.16));
    },
    perfect() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, i * 0.07, 0.5, 'triangle', 0.16));
    },
    error() { tone(180, 0, 0.18, 'sawtooth', 0.16); },
  };

  function play(name) {
    if (!enabled) return;
    if (!ensure()) return;
    resume();
    const fn = SFX[name];
    if (fn) try { fn(); } catch (e) {}
  }

  /* ----------------------------- Ambient ----------------------------- */
  function noiseBuffer(seconds) {
    const len = ctx.sampleRate * (seconds || 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function pinkBuffer(seconds) {
    const len = ctx.sampleRate * (seconds || 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
    return buf;
  }

  function stopAmbient() {
    if (ambient) {
      try { ambient.nodes.forEach((n) => { if (n.stop) try { n.stop(); } catch (e) {} if (n.disconnect) n.disconnect(); }); } catch (e) {}
      ambient = null;
    }
  }

  function startAmbient(type) {
    if (!ensure()) return;
    resume();
    stopAmbient();
    if (!enabled || !type || type === 'none') return;
    const nodes = [];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.2);
    out.connect(master);
    ambientGain = out;

    const src = ctx.createBufferSource();
    src.buffer = (type === 'pink' || type === 'cafe' || type === 'ocean') ? pinkBuffer(3) : noiseBuffer(3);
    src.loop = true;
    const filter = ctx.createBiquadFilter();

    if (type === 'white') { filter.type = 'highpass'; filter.frequency.value = 200; }
    else if (type === 'pink') { filter.type = 'lowpass'; filter.frequency.value = 8000; }
    else if (type === 'rain') { filter.type = 'bandpass'; filter.frequency.value = 1400; filter.Q.value = 0.6; }
    else if (type === 'ocean') {
      filter.type = 'lowpass'; filter.frequency.value = 600;
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      lfo.frequency.value = 0.12; lfoG.gain.value = 0.32;
      const base = ctx.createGain(); base.gain.value = 0.5;
      lfo.connect(lfoG); lfoG.connect(base.gain); lfo.start();
      src.connect(filter); filter.connect(base); base.connect(out);
      nodes.push(src, filter, lfo, lfoG, base, out);
      ambient = { type, nodes }; src.start();
      return;
    }
    else if (type === 'forest') {
      filter.type = 'lowpass'; filter.frequency.value = 3500;
      // occasional bird chirps
      const chirp = setInterval(() => {
        if (!ambient || ambient.type !== 'forest') { clearInterval(chirp); return; }
        if (Math.random() < 0.5) { const f = 1800 + Math.random() * 1600; tone(f, 0, 0.12, 'sine', 0.05); tone(f * 1.2, 0.08, 0.1, 'sine', 0.04); }
      }, 1800);
      nodes.push({ stop() { clearInterval(chirp); } });
    }
    else if (type === 'cafe') { filter.type = 'lowpass'; filter.frequency.value = 900; }
    else { filter.type = 'lowpass'; filter.frequency.value = 5000; }

    src.connect(filter); filter.connect(out);
    nodes.push(src, filter, out);
    ambient = { type, nodes };
    src.start();
  }

  function currentAmbient() { return ambient ? ambient.type : null; }

  LV.Audio = { ensure, resume, play, setEnabled, isOn, startAmbient, stopAmbient, currentAmbient, SFX_NAMES: Object.keys(SFX) };
})(window.LV = window.LV || {});
