(() => {
  'use strict';
  const canvas = document.getElementById('voice-background-canvas');
  const section = document.getElementById('rest');
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const waves = [];
  const mobile = matchMedia('(max-width: 760px)').matches || navigator.connection?.saveData;
  const layers = mobile ? 18 : 28;
  for (let i = 0; i < layers; i++) {
    const f = i / (layers - 1);
    waves.push({
      f,
      phase: i * .15,
      color: f < .52 ? '25,223,231' : '164,105,255',
      alpha: .12 + .15 * Math.sin(Math.PI * f)
    });
  }
  let width = 0;
  let height = 0;
  let analyser = null;
  let frequencyData = null;
  let energy = 0;
  let lastPaint = 0;
  let lastTime = 0;
  let raf = 0;
  let visible = false;
  let phaseTime = 0;

  const avatarElement = section.querySelector('.avatar-pair');
  if (window.ResizeObserver && avatarElement) {
    const avatarObserver = new ResizeObserver(() => paint());
    avatarObserver.observe(avatarElement);
  }
  window.addEventListener('load', () => paint(), {once:true});

  window.penguVoiceVisual = source => {
    analyser = source;
    frequencyData = source ? new Uint8Array(source.frequencyBinCount) : null;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  };

  function resize() {
    const rect = section.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    // Resolution capped at 1x: the ambient glow doesn't need retina rendering.
    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paint();
  }

  function paint() {
    ctx.clearRect(0, 0, width, height);
    // Anchor the aurora to the section itself, independent of player controls.
    // Selecting a sample must not move the background wave axis.
    const mid = height * .5;
    const amplitude = (width < 760 ? 82 : Math.min(148, height * .165)) * (1 + energy * .75);
    const step = Math.max(9, Math.round(width / 130));
    // Only two broad soft glows; no per-line shadowBlur or expensive compositing.
    const glow = ctx.createLinearGradient(0, mid - 125, 0, mid + 125);
    glow.addColorStop(0, 'rgba(40,205,224,0)');
    glow.addColorStop(.5, `rgba(83,89,220,${.05 + energy * .055})`);
    glow.addColorStop(1, 'rgba(150,80,220,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, mid - 125, width, 250);
    for (const wave of waves) {
      ctx.beginPath();
      const spread = (wave.f - .5) * (width < 760 ? 70 : 88 + energy * 30);
      for (let x = 0; x <= width + step; x += step) {
        const u = x / width;
        const envelope = .45 + .55 * Math.sin(Math.PI * u) ** 2;
        const a = Math.sin(u * 15.8 + phaseTime * 2.1 + wave.phase) * .48;
        const b = Math.sin(u * 27.5 - phaseTime * 1.35 + wave.phase * .75) * .23;
        const c = Math.sin(u * 8.5 + phaseTime * .9 - wave.phase * 1.3) * .30;
        const y = mid + spread + (a + b + c) * amplitude * envelope;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${wave.color},${Math.min(.55, wave.alpha * (1 + energy))})`;
      ctx.lineWidth = wave.f > .45 && wave.f < .55 ? 1.55 : .85;
      ctx.stroke();
    }
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    // 24 fps is sufficient for slow ambient waves, and frees the main thread.
    if (now - lastPaint < 1000 / (mobile ? 20 : 24)) return;
    const dt = Math.min((now - (lastTime || now)) / 1000, .12);
    lastTime = now;
    lastPaint = now;
    if (!reducedMotion) phaseTime += dt * .26;
    let target = 0;
    if (analyser && frequencyData) {
      analyser.getByteFrequencyData(frequencyData);
      const count = Math.floor(frequencyData.length * .55);
      for (let i = 2; i < count; i++) target += frequencyData[i];
      target = Math.min(1, target / (Math.max(1, count - 2) * 110));
    }
    energy += (target - energy) * Math.min(1, dt * (target > energy ? 12 : 4));
    paint();
  }

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) {
      lastTime = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }, { threshold: 0 }).observe(section);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (visible && !raf) {
      lastTime = 0;
      raf = requestAnimationFrame(frame);
    }
  });
  let resizePending = false;
  addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => { resizePending = false; resize(); });
  }, {passive:true});
  resize();
})();
