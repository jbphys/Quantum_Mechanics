(() => {
  const canvas = document.getElementById('quantum-visual');
  const nextButton = document.getElementById('next-visual');
  if (!canvas || !nextButton) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const durations = [645, 120, 300, 180];
  let scene = 0;
  let sceneStart = performance.now();
  let lastImpact = 0;
  const impacts = [];

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.round(rect.width));
    const height = Math.max(200, Math.round(rect.height));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function clear(width, height, inner = '#07111d', outer = '#02060b') {
    const g = ctx.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, width * 0.7);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function gaussian() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function sampleImpact(width, height) {
    const left = width * 0.06;
    const right = width * 0.94;
    let x = width / 2;
    for (let i = 0; i < 240; i++) {
      const candidate = left + Math.random() * (right - left);
      const q = (candidate - width / 2) / width;
      const envelope = Math.exp(-13 * q * q);
      const fringes = 0.001 + 0.999 * Math.pow(Math.cos(12.6 * Math.PI * q), 10);
      if (Math.random() < envelope * fringes) { x = candidate; break; }
    }
    return { x, y: height * 0.08 + Math.random() * height * 0.84, r: 0.65 + Math.random() * 0.75, a: 0.68 + Math.random() * 0.32 };
  }

  function drawDiffraction(now, width, height, elapsed) {
    clear(width, height, '#102840', '#02060c');
    const buildTime = 600;
    const maxImpacts = 15000;
    if (reduceMotion && impacts.length < maxImpacts) {
      while (impacts.length < maxImpacts) impacts.push(sampleImpact(width, height));
    } else if (elapsed < buildTime && now - lastImpact > 40 && impacts.length < maxImpacts) {
      impacts.push(sampleImpact(width, height));
      lastImpact = now;
    }
    for (const p of impacts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(190,244,255,${p.a})`;
      ctx.shadowColor = 'rgba(130,230,255,.95)';
      ctx.shadowBlur = 3.5;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    const hold = Math.max(0, Math.min(1, (elapsed - buildTime) / 8));
    if (hold > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const bins = 160;
      const counts = new Array(bins).fill(0);
      for (const p of impacts) counts[Math.max(0, Math.min(bins - 1, Math.floor((p.x / width) * bins)))]++;
      const max = Math.max(1, ...counts);
      for (let i = 0; i < bins; i++) {
        const n = counts[i] / max;
        if (n < 0.22) continue;
        ctx.fillStyle = `rgba(180,242,255,${hold * .34 * Math.pow(n, 2)})`;
        ctx.fillRect((i / bins) * width, height * .05, width / bins + 1, height * .9);
      }
      ctx.restore();
    }
  }

  function drawSpreading(width, height, elapsed) {
    clear(width, height, '#10243d', '#07111d');
    const phase = reduceMotion ? .7 : (elapsed % 120) / 120;
    const smooth = phase * phase * (3 - 2 * phase);
    const sigma = 24 + 110 * smooth;
    const centre = width * (.3 + .35 * smooth);
    const baseY = height * .78;
    const amplitude = Math.min(155, height * .62) * Math.pow(24 / sigma, .55);
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, 'rgba(255,216,118,.96)');
    grad.addColorStop(1, 'rgba(112,194,255,.96)');
    ctx.strokeStyle = grad;
    ctx.fillStyle = 'rgba(83,155,234,.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, baseY);
    for (let x = 18; x <= width - 18; x += 2) {
      const density = Math.exp(-((x - centre) ** 2) / (2 * sigma ** 2));
      ctx.lineTo(x, baseY - amplitude * density);
    }
    ctx.lineTo(width - 18, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function packet(x, centre, sigma, k, direction = 1) {
    const env = Math.exp(-((x - centre) ** 2) / (2 * sigma ** 2));
    return env * Math.cos(direction * k * (x - centre));
  }

  function drawTunnelling(width, height, elapsed) {
    clear(width, height, '#0d2036', '#03080f');
    const barrierX = width * .49;
    const barrierW = Math.max(24, width * .065);
    ctx.fillStyle = 'rgba(224,179,76,.42)';
    ctx.fillRect(barrierX, height * .16, barrierW, height * .68);

    const cycle = reduceMotion ? .82 : (elapsed % 75) / 75;
    const y0 = height * .52;
    const incomingCentre = width * (.08 + .43 * Math.min(cycle / .45, 1));
    const post = Math.max(0, (cycle - .42) / .58);
    const reflectedCentre = barrierX - width * (.05 + .28 * post);
    const transmittedCentre = barrierX + barrierW + width * (.03 + .35 * post);
    const sigma = width * .07;
    const k = .22;

    ctx.lineWidth = 2.4;
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, 'rgba(255,214,112,.95)');
    grad.addColorStop(1, 'rgba(115,202,255,.95)');
    ctx.strokeStyle = grad;
    ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
      let a = 0;
      if (cycle < .5) a += packet(x, incomingCentre, sigma, k, 1);
      if (post > 0) {
        a += .58 * packet(x, reflectedCentre, sigma * 1.05, k, -1);
        a += .42 * packet(x, transmittedCentre, sigma * 1.2, k, 1);
        if (x > barrierX && x < barrierX + barrierW) a += .28 * Math.exp(-(x - barrierX) / (barrierW * .38)) * Math.cos(k * (x - barrierX));
      }
      const y = y0 - a * height * .18;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawEquation(width, height) {
    clear(width, height, '#10243d', '#07111d');
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(28, Math.min(52, width * .075))}px Georgia, serif`;
    ctx.fillText('iℏ ∂ψ/∂t = Ĥψ', width / 2, height / 2);
  }

  function resetScene(index) {
    scene = index;
    sceneStart = performance.now();
    if (scene === 0) { impacts.length = 0; lastImpact = 0; }
  }

  nextButton.addEventListener('click', () => resetScene((scene + 1) % 4));

  function draw(now) {
    const { width, height } = resize();
    const elapsed = (now - sceneStart) / 1000;
    if (!reduceMotion && elapsed >= durations[scene]) resetScene((scene + 1) % 4);
    const localElapsed = (now - sceneStart) / 1000;
    if (scene === 0) drawDiffraction(now, width, height, localElapsed);
    else if (scene === 1) drawSpreading(width, height, localElapsed);
    else if (scene === 2) drawTunnelling(width, height, localElapsed);
    else drawEquation(width, height);
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();