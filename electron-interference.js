(() => {
  const waveCanvas = document.getElementById('wavepacket');
  if (!waveCanvas) return;

  const figure = waveCanvas.closest('figure');
  if (!figure) return;

  figure.style.position = 'relative';
  figure.style.overflow = 'hidden';

  const electronCanvas = document.createElement('canvas');
  electronCanvas.id = 'electron-screen';
  electronCanvas.width = 520;
  electronCanvas.height = 280;
  electronCanvas.setAttribute('aria-label', 'Electron impacts accumulating into a double-slit interference pattern');
  electronCanvas.style.width = '100%';
  electronCanvas.style.height = '250px';
  electronCanvas.style.display = 'none';
  electronCanvas.style.borderRadius = '10px';
  waveCanvas.insertAdjacentElement('afterend', electronCanvas);

  const ctx = electronCanvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const impacts = [];
  let lastImpact = 0;
  let cycleStart = performance.now();
  let showingElectrons = false;

  const waveDuration = 120;
  const buildDuration = 600;
  const holdDuration = 45;
  const cycleDuration = waveDuration + buildDuration + holdDuration;
  const maxImpacts = 15000;

  function resize(canvas, context) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(190, Math.round(rect.height));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function randomGaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function sampleImpact(width, height) {
    const screenLeft = width * 0.07;
    const screenRight = width * 0.93;
    let x;
    for (let tries = 0; tries < 220; tries++) {
      const candidate = screenLeft + Math.random() * (screenRight - screenLeft);
      const q = (candidate - width / 2) / width;
      const envelope = Math.exp(-14 * q * q);
      const fringes = 0.001 + 0.999 * Math.pow(Math.cos(12.8 * Math.PI * q), 10);
      if (Math.random() < envelope * fringes) {
        x = candidate;
        break;
      }
    }
    if (x === undefined) x = width / 2 + randomGaussian() * width * 0.14;
    const y = height * 0.10 + Math.random() * height * 0.80;
    return { x, y, a: 0.72 + Math.random() * 0.28, r: 0.72 + Math.random() * 0.65 };
  }

  function drawAccumulatedGlow(width, height, holdProgress) {
    if (holdProgress <= 0) return;
    const bins = 150;
    const counts = new Array(bins).fill(0);
    for (const p of impacts) {
      const index = Math.max(0, Math.min(bins - 1, Math.floor((p.x / width) * bins)));
      counts[index]++;
    }
    const maxCount = Math.max(1, ...counts);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < bins; i++) {
      const normalized = counts[i] / maxCount;
      if (normalized < 0.20) continue;
      const x = (i / bins) * width;
      const stripeWidth = width / bins + 1;
      const alpha = holdProgress * 0.34 * Math.pow(normalized, 2.0);
      const glow = ctx.createLinearGradient(0, height * 0.08, 0, height * 0.92);
      glow.addColorStop(0, 'rgba(135,230,255,0)');
      glow.addColorStop(0.18, `rgba(175,240,255,${alpha})`);
      glow.addColorStop(0.82, `rgba(175,240,255,${alpha})`);
      glow.addColorStop(1, 'rgba(135,230,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x, height * 0.06, stripeWidth, height * 0.88);
    }
    ctx.restore();
  }

  function drawScreen(now) {
    const { width, height } = resize(electronCanvas, ctx);
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, width * 0.68);
    gradient.addColorStop(0, '#102841');
    gradient.addColorStop(1, '#02060c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(150,205,255,.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(width * 0.05, height * 0.055, width * 0.90, height * 0.89);

    const elapsed = (now - cycleStart) / 1000;
    const buildEnd = waveDuration + buildDuration;
    const building = reduceMotion || elapsed < buildEnd;
    const interval = reduceMotion ? 0 : 40;

    if (reduceMotion && impacts.length < maxImpacts) {
      while (impacts.length < maxImpacts) impacts.push(sampleImpact(width, height));
    } else if (building && now - lastImpact > interval && impacts.length < maxImpacts) {
      impacts.push(sampleImpact(width, height));
      lastImpact = now;
    }

    for (const p of impacts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(185,242,255,${p.a})`;
      ctx.shadowColor = 'rgba(125,230,255,.96)';
      ctx.shadowBlur = 3.8;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    const holdProgress = reduceMotion
      ? 1
      : Math.max(0, Math.min(1, (elapsed - buildEnd) / 7));
    drawAccumulatedGlow(width, height, holdProgress);

    if (!reduceMotion && showingElectrons) requestAnimationFrame(drawScreen);
  }

  function switchView(now) {
    if (reduceMotion) {
      waveCanvas.style.display = 'none';
      electronCanvas.style.display = 'block';
      showingElectrons = true;
      drawScreen(now);
      return;
    }

    const elapsed = (now - cycleStart) / 1000;
    const electronPhase = elapsed >= waveDuration;
    if (electronPhase !== showingElectrons) {
      showingElectrons = electronPhase;
      waveCanvas.style.display = electronPhase ? 'none' : 'block';
      electronCanvas.style.display = electronPhase ? 'block' : 'none';
      if (electronPhase) {
        impacts.length = 0;
        lastImpact = 0;
        requestAnimationFrame(drawScreen);
      }
    }
    if (elapsed >= cycleDuration) cycleStart = now;
    requestAnimationFrame(switchView);
  }

  requestAnimationFrame(switchView);
})();