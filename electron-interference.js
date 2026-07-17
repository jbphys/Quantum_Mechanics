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

  const caption = figure.querySelector('figcaption');
  const waveCaption = 'Free-particle wavepacket: |ψ(x,t)|² spreads as time evolves';
  const electronCaption = 'Single-electron impacts build up a double-slit interference pattern';

  const ctx = electronCanvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const impacts = [];
  let lastImpact = 0;
  let cycleStart = performance.now();
  let showingElectrons = false;

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
    const screenLeft = width * 0.08;
    const screenRight = width * 0.92;
    let x;
    for (let tries = 0; tries < 100; tries++) {
      const candidate = screenLeft + Math.random() * (screenRight - screenLeft);
      const q = (candidate - width / 2) / width;
      const envelope = Math.exp(-24 * q * q);
      const fringes = 0.18 + 0.82 * Math.pow(Math.cos(13.5 * Math.PI * q), 2);
      if (Math.random() < envelope * fringes) {
        x = candidate;
        break;
      }
    }
    if (x === undefined) x = width / 2 + randomGaussian() * width * 0.16;
    const y = height * 0.12 + Math.random() * height * 0.76;
    return { x, y, a: 0.55 + Math.random() * 0.45, r: 0.9 + Math.random() * 1.2 };
  }

  function drawScreen(now) {
    const { width, height } = resize(electronCanvas, ctx);
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width * 0.65);
    gradient.addColorStop(0, '#152d48');
    gradient.addColorStop(1, '#07111d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(150,205,255,.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(width * 0.055, height * 0.065, width * 0.89, height * 0.87);

    const interval = reduceMotion ? 0 : 34;
    if (reduceMotion && impacts.length < 650) {
      while (impacts.length < 650) impacts.push(sampleImpact(width, height));
    } else if (now - lastImpact > interval && impacts.length < 900) {
      impacts.push(sampleImpact(width, height));
      impacts.push(sampleImpact(width, height));
      lastImpact = now;
    }

    for (const p of impacts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(142,220,255,${p.a})`;
      ctx.shadowColor = 'rgba(120,210,255,.75)';
      ctx.shadowBlur = 4;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (!reduceMotion && showingElectrons) requestAnimationFrame(drawScreen);
  }

  function switchView(now) {
    if (reduceMotion) {
      waveCanvas.style.display = 'none';
      electronCanvas.style.display = 'block';
      showingElectrons = true;
      if (caption) caption.textContent = electronCaption;
      drawScreen(now);
      return;
    }

    const elapsed = (now - cycleStart) / 1000;
    const electronPhase = elapsed >= 7;
    if (electronPhase !== showingElectrons) {
      showingElectrons = electronPhase;
      waveCanvas.style.display = electronPhase ? 'none' : 'block';
      electronCanvas.style.display = electronPhase ? 'block' : 'none';
      if (caption) caption.textContent = electronPhase ? electronCaption : waveCaption;
      if (electronPhase) {
        impacts.length = 0;
        lastImpact = 0;
        requestAnimationFrame(drawScreen);
      }
    }
    if (elapsed >= 14) cycleStart = now;
    requestAnimationFrame(switchView);
  }

  requestAnimationFrame(switchView);
})();
