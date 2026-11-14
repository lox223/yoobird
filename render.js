/* YooBird — отрисовка (Canvas 2D, всё рисуется кодом, без картинок). */
(function (root) {
  'use strict';
  const { C } = root.YB;
  const OUT = '#2B1D0E';                 // фирменная тёмная обводка
  const TAU = Math.PI * 2;

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

  // ---------- Темы: время суток (полдень, закат, сумерки) ----------
  const THEMES = {
    noon: {
      sky: ['#FFC93C', '#FFE27A', '#FFF4C7'], sun: { x: 1560, y: 170, r: 62, core: '#FFFBE3', glow: '#FFF3B0', rays: 'rgba(255,255,255,0.28)' },
      cloud: 'rgba(255,255,255,0.94)', cloudShade: 'rgba(255,200,90,0.30)',
      hills: ['#FFD45C', '#F7B733', '#E99A1C'], trees: '#D98A14', ground: ['#8A5524', '#5E3812'], pebble: 'rgba(60,30,8,0.45)',
      grass: ['#C2D234', '#93A81E', '#D8E64E'], haze: 'rgba(255,250,225,0.35)', stars: false,
      light: [0.42, -0.91], ambient: 'pollen', flock: true,
    },
    sunset: {
      sky: ['#FF8A3D', '#FFB45A', '#FFE3A0'], sun: { x: 1440, y: 600, r: 115, core: '#FFF1C4', glow: '#FFC46B', rays: 'rgba(255,240,200,0.20)' },
      cloud: 'rgba(255,228,208,0.94)', cloudShade: 'rgba(255,120,80,0.35)',
      hills: ['#F7A452', '#E07B35', '#BF5A24'], trees: '#A94B1C', ground: ['#7A4219', '#4F270C'], pebble: 'rgba(40,18,4,0.45)',
      grass: ['#CDB833', '#A08A1E', '#E6D04A'], haze: 'rgba(255,205,150,0.30)', stars: false,
      light: [0.78, -0.62], ambient: 'leaves', flock: true,
    },
    dusk: {
      sky: ['#47388A', '#B45C8E', '#FFB45C'], sun: { x: 1400, y: 720, r: 125, core: '#FFE6A8', glow: '#FF9A5C', rays: null },
      cloud: 'rgba(252,205,225,0.78)', cloudShade: 'rgba(80,55,140,0.40)',
      hills: ['#A15E8C', '#77436F', '#543152'], trees: '#3F2440', ground: ['#5A3418', '#33190A'], pebble: 'rgba(20,8,2,0.5)',
      grass: ['#B9AB3C', '#877C22', '#D2C452'], haze: 'rgba(255,170,140,0.22)', stars: true,
      light: [0.86, -0.5], ambient: 'fireflies',
    },
    night: {
      sky: ['#10173A', '#27306E', '#5B5A9C'], sun: { x: 1500, y: 215, r: 72, core: '#FFF3BE', glow: 'rgba(255,232,140,0.5)', rays: null, moon: true },
      cloud: 'rgba(150,165,225,0.45)', cloudShade: 'rgba(20,25,70,0.45)',
      hills: ['#3A4283', '#2B3168', '#1D214C'], trees: '#12153A', ground: ['#3F2D1E', '#1D120A'], pebble: 'rgba(10,5,0,0.5)',
      grass: ['#7C9C3C', '#566F24', '#9CBB50'], haze: 'rgba(120,135,230,0.16)', stars: true,
      light: [0.4, -0.92], ambient: 'fireflies',
    },
    // Снежные горы: холодный ясный день, сугробы вместо цветов, снегопад
    winter: {
      sky: ['#9CC8F0', '#CFE6FA', '#F2F8FF'], sun: { x: 1520, y: 190, r: 64, core: '#FFFFFF', glow: '#EAF6FF', rays: 'rgba(255,255,255,0.22)' },
      cloud: 'rgba(255,255,255,0.95)', cloudShade: 'rgba(140,180,230,0.30)',
      hills: ['#E6F1FC', '#C9DDF2', '#A9C3E3'], trees: '#2F5E5A', ground: ['#6A5A50', '#3E322C'], pebble: 'rgba(30,26,40,0.45)',
      grass: ['#8E9A6A', '#5E6A44', '#A8B07C'], haze: 'rgba(235,245,255,0.40)', stars: false,
      light: [0.5, -0.87], ambient: 'snow', flock: false, snow: true, noFlowers: true,
    },
    // Вулкан: тёмный базальт, лава в трещинах, искры в воздухе
    volcano: {
      sky: ['#2A1424', '#7A2A2A', '#E0662E'], sun: { x: 430, y: 240, r: 70, core: '#FFD9A8', glow: 'rgba(255,120,60,0.7)', rays: null },
      cloud: 'rgba(120,80,80,0.75)', cloudShade: 'rgba(40,10,20,0.45)',
      hills: ['#5A2E2A', '#3E1F1E', '#2A1414'], trees: '#1E1010', ground: ['#3E2E2C', '#1A1212'], pebble: 'rgba(255,110,30,0.45)',
      grass: ['#6E5A3A', '#46381F', '#8A7246'], haze: 'rgba(255,110,60,0.18)', stars: true,
      light: [-0.55, -0.83], ambient: 'embers', flock: false, noFlowers: true, lava: true,
    },
  };
  let theme = THEMES.noon;
  function setTheme(name) { theme = THEMES[name] || THEMES.noon; themeName = THEMES[name] ? name : 'noon'; }

  // ---------- Фон ----------
  const clouds = [];
  { const r = rng(42); for (let i = 0; i < 7; i++) clouds.push({ x: i * 560 + r() * 200 - 300, y: 70 + r() * 260, s: 1.7 + r() * 1.2, v: 4 + r() * 7 }); }
  const starsPos = [];
  { const r = rng(5); for (let i = 0; i < 70; i++) starsPos.push({ x: r() * 2600 - 340, y: r() * 420 - 150, s: 1 + r() * 2.2, p: r() * 6 }); }

  function hillY(x, base, amp, f, ph, amp2, f2) { return base - Math.sin(x * f + ph) * amp - Math.sin(x * f2 + ph * 2) * amp2; }
  function hillPath(ctx, x0, x1, base, amp, f, ph, amp2, f2) {
    ctx.beginPath(); ctx.moveTo(x0, C.GROUND_Y + 5);
    for (let x = x0; x <= x1 + 40; x += 40) ctx.lineTo(x, hillY(x, base, amp, f, ph, amp2, f2));
    ctx.lineTo(x1 + 40, C.GROUND_Y + 5); ctx.closePath();
  }

  // ================= Живописный фон =================
  // Палитры «картинного» фона для каждого времени суток
  const PAINT = {
    noon: {
      sky: ['#FFC24A', '#FFD978', '#FFEBB0', '#FFF6DA'],
      hills: [['#F7D58A', '#EFC56E'], ['#E8B958', '#D29E3E'], ['#C99838', '#A87A26']],
      tree: ['#8E8A2E', '#C9C252', '#6E6A22'], trunk: '#6B4A1E',
      cloud: ['#FFFFFF', '#FFE9B8', '#F2C987'], haze: 'rgba(255,244,214,0.42)', rays: 'rgba(255,255,235,0.10)',
    },
    sunset: {
      sky: ['#5B4A8E', '#B55C8C', '#F0844E', '#FFC066'],
      hills: [['#C7768A', '#B0647C'], ['#94566A', '#7A4658'], ['#5E5A3A', '#46452A']],
      tree: ['#3F4A2A', '#C9853E', '#2C3420'], trunk: '#3A2414',
      cloud: ['#FFD3A0', '#F59A7A', '#B0628E'], haze: 'rgba(255,170,130,0.30)', rays: 'rgba(255,220,160,0.13)',
    },
    dusk: {
      sky: ['#2C2A68', '#6E4A8E', '#D0708A', '#FFB060'],
      hills: [['#8E5E8E', '#7A4E7C'], ['#634A78', '#533E66'], ['#3E3A55', '#2E2C44']],
      tree: ['#2E2C46', '#A86E86', '#1E1E32'], trunk: '#241A26',
      cloud: ['#FFC2B0', '#C77A9E', '#6E4E8E'], haze: 'rgba(240,150,170,0.22)', rays: null,
    },
    night: {
      sky: ['#0A0F2C', '#18214F', '#2E377A', '#4A4E92'],
      hills: [['#33407E', '#2A346C'], ['#242C62', '#1C2352'], ['#171C46', '#10143A']],
      tree: ['#10163A', '#4E62A8', '#0A0E2A'], trunk: '#0E1230',
      cloud: ['#AAB4E6', '#6E78B8', '#3A4382'], haze: 'rgba(110,130,220,0.16)', rays: null,
    },
    winter: {
      sky: ['#7FB2E6', '#A9D0F2', '#D6EAFB', '#F4F9FF'],
      hills: [['#EEF5FD', '#D8E6F6'], ['#DCE9F7', '#BFD3EC'], ['#C6D9EF', '#A2BCDD']],
      tree: ['#2E5E58', '#4E8A7E', '#1C3E3C'], trunk: '#4A3426', pines: true,
      cloud: ['#FFFFFF', '#E6F0FB', '#B9CDE6'], haze: 'rgba(240,247,255,0.45)', rays: 'rgba(255,255,255,0.08)',
    },
    volcano: {
      sky: ['#1C0E1A', '#4E1E2A', '#A8382A', '#F07A36'],
      hills: [['#6A2E2C', '#521F20'], ['#46201F', '#341616'], ['#2A1414', '#1C0C0C']],
      tree: ['#2A1A16', '#7A3A22', '#140A08'], trunk: '#1A0E0A', dead: true,
      cloud: ['#8A6260', '#5A3A3E', '#2E1A22'], haze: 'rgba(255,100,50,0.20)', rays: null, volcano: true,
    },
  };
  let themeName = 'noon';
  // Свет сцены: цвет контрового света, цвет «воздуха» у солнца и цветокоррекция (soft-light)
  const LIGHT = {
    noon:   { rim: 'rgba(255,246,200,0.9)', air: 'rgba(255,236,170,0.10)', grade: 'rgba(255,200,90,0.16)',  beams: 'rgba(255,250,220,0.07)' },
    sunset: { rim: 'rgba(255,190,110,0.95)', air: 'rgba(255,150,80,0.11)', grade: 'rgba(255,120,60,0.26)', beams: 'rgba(255,200,140,0.08)' },
    dusk:   { rim: 'rgba(255,170,170,0.85)', air: 'rgba(255,140,120,0.09)', grade: 'rgba(190,90,160,0.24)', beams: null },
    night:  { rim: 'rgba(190,210,255,0.8)', air: 'rgba(150,170,255,0.07)', grade: 'rgba(60,80,180,0.28)', beams: null },
    winter: { rim: 'rgba(235,246,255,0.9)', air: 'rgba(225,240,255,0.08)', grade: 'rgba(140,180,240,0.16)', beams: 'rgba(245,250,255,0.06)' },
    volcano:{ rim: 'rgba(255,140,60,0.95)', air: 'rgba(255,90,30,0.12)', grade: 'rgba(210,60,30,0.26)', beams: null },
  };
  const lightCfg = () => LIGHT[themeName] || LIGHT.noon;

  // Задник рисуется один раз на время суток: мир от x −700 до 2620, от y −320 до 990
  const BG = { X0: -700, Y0: -320, W: 3320, H: 1310 };
  const bgCache = new Map();

  function paintTree(c, x, y, s, P, sunX, r) {
    const dir = sunX > x ? 1 : -1, H = s * (1.05 + r() * 0.35);
    // ствол с лёгким изгибом
    c.strokeStyle = P.trunk; c.lineCap = 'round'; c.lineWidth = s * 0.17;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - 0.5) * s * 0.3, y - H * 0.4, x + (r() - 0.5) * s * 0.2, y - H * 0.62); c.stroke();
    // крона: случайные «облачка» листвы
    const cx = x, cy = y - H * 0.95, n = 9 + Math.floor(r() * 4), blobs = [];
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = s * (0.2 + r() * 0.42);
      blobs.push([cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.75, s * (0.34 + r() * 0.22)]);
    }
    blobs.push([cx, cy, s * 0.55]);
    c.fillStyle = P.tree[0];
    for (const [bx, by, br] of blobs) { c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill(); }
    // тень на нижней и дальней от солнца стороне
    c.fillStyle = P.tree[2]; c.globalAlpha = 0.85;
    for (const [bx, by, br] of blobs) if (by > cy - s * 0.05 || (bx - cx) * dir < -s * 0.15) { c.beginPath(); c.arc(bx - dir * br * 0.2, by + br * 0.3, br * 0.75, 0, TAU); c.fill(); }
    // освещённая сторона и блики
    c.fillStyle = P.tree[1]; c.globalAlpha = 0.8;
    for (const [bx, by, br] of blobs) if ((bx - cx) * dir > -s * 0.1 && by < cy + s * 0.15) { c.beginPath(); c.arc(bx + dir * br * 0.3, by - br * 0.3, br * 0.55, 0, TAU); c.fill(); }
    c.globalAlpha = 0.35; c.fillStyle = '#FFF4C8';
    for (const [bx, by, br] of blobs) if ((bx - cx) * dir > s * 0.05 && by < cy) { c.beginPath(); c.arc(bx + dir * br * 0.45, by - br * 0.45, br * 0.22, 0, TAU); c.fill(); }
    c.globalAlpha = 1; c.lineCap = 'butt';
  }

  // Ель в снегу: ярусы-треугольники, снежные шапки с солнечной стороны
  function paintPine(c, x, y, s, P, sunX, r) {
    const H = s * (1.5 + r() * 0.5), W = s * 0.62, dir = sunX > x ? 1 : -1;
    c.fillStyle = P.trunk; c.fillRect(x - s * 0.06, y - s * 0.25, s * 0.12, s * 0.3);
    for (let k = 0; k < 4; k++) {
      const top = y - H + k * H * 0.2, bot = y - H * 0.08 - (3 - k) * H * 0.12, w = W * (0.45 + k * 0.2);
      c.fillStyle = P.tree[0]; c.beginPath(); c.moveTo(x, top); c.lineTo(x + w, bot); c.lineTo(x - w, bot); c.closePath(); c.fill();
      c.fillStyle = P.tree[2]; c.globalAlpha = 0.55; c.beginPath(); c.moveTo(x, top); c.lineTo(x - dir * w, bot); c.lineTo(x - dir * w * 0.2, bot); c.closePath(); c.fill(); c.globalAlpha = 1;
      // снег на лапах
      c.fillStyle = '#F6FBFF'; c.beginPath(); c.moveTo(x, top + 1); c.lineTo(x + w * 0.55, top + (bot - top) * 0.55); c.quadraticCurveTo(x, top + (bot - top) * 0.42, x - w * 0.55, top + (bot - top) * 0.55); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(x + dir * w * 0.35, bot - 2, w * 0.45, 3 + s * 0.04, 0, 0, TAU); c.fill();
    }
  }
  // Обгоревшее дерево: голый ствол с ветками
  function paintDead(c, x, y, s, P, sunX, r) {
    c.strokeStyle = P.tree[0]; c.lineCap = 'round';
    const H = s * (1.1 + r() * 0.5);
    c.lineWidth = s * 0.13; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - 0.5) * s * 0.3, y - H * 0.5, x + (r() - 0.5) * s * 0.25, y - H); c.stroke();
    c.lineWidth = s * 0.06;
    for (let i = 0; i < 4; i++) {
      const hy = y - H * (0.4 + i * 0.15), d = i % 2 ? 1 : -1, L = s * (0.35 - i * 0.05);
      c.beginPath(); c.moveTo(x, hy); c.quadraticCurveTo(x + d * L * 0.5, hy - L * 0.2, x + d * L, hy - L * 0.6); c.stroke();
    }
    c.lineCap = 'butt';
  }
  // Вулкан на дальнем плане: конус, светящийся кратер и потёки лавы
  function paintVolcano(c, P) {
    const cx = 1180, base = 760, top = 300, bw = 760, tw = 120;
    const g = c.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, '#4A2422'); g.addColorStop(1, '#2A1416');
    c.fillStyle = g; c.beginPath();
    c.moveTo(cx - bw, base); c.quadraticCurveTo(cx - bw * 0.35, base - 120, cx - tw, top); c.lineTo(cx + tw, top); c.quadraticCurveTo(cx + bw * 0.35, base - 120, cx + bw, base); c.closePath(); c.fill();
    // освещённый склон
    c.fillStyle = 'rgba(255,120,70,0.10)'; c.beginPath(); c.moveTo(cx - tw, top); c.quadraticCurveTo(cx - bw * 0.35, base - 120, cx - bw, base); c.lineTo(cx - bw * 0.4, base); c.quadraticCurveTo(cx - tw * 0.9, base - 200, cx - tw * 0.4, top); c.closePath(); c.fill();
    // потёки лавы
    c.lineCap = 'round';
    for (const [dx, len, w] of [[-60, 260, 10], [30, 340, 13], [85, 200, 8]]) {
      c.strokeStyle = 'rgba(255,90,20,0.85)'; c.lineWidth = w;
      c.beginPath(); c.moveTo(cx + dx * 0.6, top + 4); c.quadraticCurveTo(cx + dx * 1.4, top + len * 0.5, cx + dx * 2.2, top + len); c.stroke();
      c.strokeStyle = 'rgba(255,220,120,0.8)'; c.lineWidth = w * 0.35; c.stroke();
    }
    c.lineCap = 'butt';
    // свечение кратера
    const cg = c.createRadialGradient(cx, top, 10, cx, top, 260);
    cg.addColorStop(0, 'rgba(255,200,100,0.9)'); cg.addColorStop(0.25, 'rgba(255,110,40,0.45)'); cg.addColorStop(1, 'rgba(255,80,30,0)');
    c.fillStyle = cg; c.beginPath(); c.arc(cx, top, 260, 0, TAU); c.fill();
    c.fillStyle = '#FFB347'; c.beginPath(); c.ellipse(cx, top + 2, tw * 0.95, 12, 0, 0, TAU); c.fill();
  }

  function buildBackdrop(name, sc) {
    const key = name + '|' + sc;
    if (bgCache.has(key)) return bgCache.get(key);
    if (typeof document === 'undefined') return null;
    for (const k of bgCache.keys()) if (k.split('|')[1] !== String(sc)) bgCache.delete(k);
    const T = THEMES[name] || THEMES.noon, P = PAINT[name] || PAINT.noon, S = T.sun;
    const cv = document.createElement('canvas'); cv.width = Math.round(BG.W * sc); cv.height = Math.round(BG.H * sc);
    const c = cv.getContext('2d');
    c.scale(sc, sc); c.translate(-BG.X0, -BG.Y0);
    const x0 = BG.X0, x1 = BG.X0 + BG.W, r = rng(77 + name.length);

    // небо
    const g = c.createLinearGradient(0, BG.Y0, 0, 900);
    g.addColorStop(0, P.sky[0]); g.addColorStop(0.42, P.sky[1]); g.addColorStop(0.75, P.sky[2]); g.addColorStop(1, P.sky[3]);
    c.fillStyle = g; c.fillRect(x0, BG.Y0, BG.W, BG.H);

    // огромное мягкое свечение вокруг солнца/луны
    const glow = c.createRadialGradient(S.x, S.y, S.r * 0.5, S.x, S.y, S.r * 7);
    glow.addColorStop(0, S.moon ? 'rgba(255,240,190,0.35)' : 'rgba(255,240,190,0.7)'); glow.addColorStop(0.35, S.moon ? 'rgba(160,170,255,0.12)' : 'rgba(255,190,110,0.25)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = glow; c.fillRect(x0, BG.Y0, BG.W, BG.H);
    const sg = c.createRadialGradient(S.x, S.y, S.r * 0.2, S.x, S.y, S.r * 1.9);
    sg.addColorStop(0, S.core); sg.addColorStop(0.5, S.glow); sg.addColorStop(1, 'rgba(255,240,180,0)');
    c.fillStyle = sg; c.beginPath(); c.arc(S.x, S.y, S.r * 1.9, 0, TAU); c.fill();
    c.fillStyle = S.core; c.beginPath(); c.arc(S.x, S.y, S.r, 0, TAU); c.fill();
    if (S.moon) {
      c.fillStyle = 'rgba(214,180,96,0.38)';
      [[-22, -16, 15], [24, 8, 11], [-6, 30, 8], [14, -34, 6]].forEach(([dx, dy, rr2]) => { c.beginPath(); c.arc(S.x + dx, S.y + dy, rr2, 0, TAU); c.fill(); });
    }

    if (P.volcano) paintVolcano(c, P);

    // холмы: три слоя с дымкой между ними, на каждом — деревья
    const layers = [
      { base: 640, amp: 46, f: 0.0032, ph: 0.6, a2: 22, f2: 0.009, trees: 20, ts: [20, 30], group: 3 },
      { base: 735, amp: 44, f: 0.0045, ph: 2.0, a2: 18, f2: 0.012, trees: 13, ts: [34, 50], group: 3 },
      { base: 830, amp: 34, f: 0.0062, ph: 3.9, a2: 12, f2: 0.018, trees: 8, ts: [58, 84], group: 2 },
    ];
    layers.forEach((L, li) => {
      const hc = P.hills[li];
      const hg = c.createLinearGradient(0, L.base - L.amp - L.a2, 0, 980);
      hg.addColorStop(0, hc[0]); hg.addColorStop(1, hc[1]);
      c.fillStyle = hg; c.beginPath(); c.moveTo(x0, 990);
      for (let x = x0; x <= x1 + 30; x += 30) c.lineTo(x, hillY(x, L.base, L.amp, L.f, L.ph, L.a2, L.f2));
      c.lineTo(x1 + 30, 990); c.closePath(); c.fill();
      // светлая кромка гребня со стороны солнца
      c.strokeStyle = 'rgba(255,235,190,' + (0.18 - li * 0.04) + ')'; c.lineWidth = 3; c.beginPath();
      for (let x = x0; x <= x1 + 30; x += 30) { const y = hillY(x, L.base, L.amp, L.f, L.ph, L.a2, L.f2); x === x0 ? c.moveTo(x, y + 2) : c.lineTo(x, y + 2); }
      c.stroke();
      // деревья группами (рощицы)
      // рощицы: деревья разного размера, задние ниже передних
      for (let i = 0; i < L.trees; i++) {
        const cx = x0 + ((i + r() * 0.8) / L.trees) * BG.W, n = 1 + Math.floor(r() * L.group);
        const grove = [];
        for (let k = 0; k < n; k++) grove.push({ x: cx + (k - (n - 1) / 2) * L.ts[0] * (0.9 + r() * 0.5), s: L.ts[0] + r() * (L.ts[1] - L.ts[0]) });
        grove.sort((a, b) => a.s - b.s);
        const painter = P.pines ? paintPine : P.dead ? paintDead : paintTree;
        for (const tr of grove) painter(c, tr.x, hillY(tr.x, L.base, L.amp, L.f, L.ph, L.a2, L.f2) + 8, tr.s, P, S.x, r);
      }
      // дымка: чем дальше слой, тем больше он «тонет» в воздухе
      if (li < 2) {
        const hz = c.createLinearGradient(0, L.base - 120, 0, 990);
        hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(0.35, P.haze); hz.addColorStop(1, P.haze);
        c.fillStyle = hz; c.fillRect(x0, L.base - 120, BG.W, 990 - L.base + 120);
      }
    });
    bgCache.set(key, cv);
    return cv;
  }

  // Облака: заранее нарисованные объёмные спрайты
  const cloudSprites = new Map();
  function cloudSet(name) {
    if (cloudSprites.has(name)) return cloudSprites.get(name);
    if (typeof document === 'undefined') return null;
    const P = PAINT[name] || PAINT.noon, set = [], r = rng(500 + name.length);
    for (let n = 0; n < 6; n++) {
      const W = 300 + r() * 220, H = 150 + r() * 50, cv = document.createElement('canvas');
      const puffs = [];
      const cnt = 9 + Math.floor(r() * 6);
      for (let i = 0; i < cnt; i++) {
        const t = i / (cnt - 1), px = W * (0.12 + 0.76 * t) + (r() - 0.5) * 20;
        const rad = (H * 0.3 + r() * H * 0.18) * (1 - Math.abs(t - 0.5) * 0.85);
        puffs.push([px, H * 0.72 - rad * (0.55 + r() * 0.5), rad]);
      }
      // холст подгоняем под фактический размер облака (+ запас), чтобы края не срезались
      let bx0 = W * 0.08, bx1 = W * 0.92, by0 = H * 0.6, by1 = H * 0.86;
      for (const [x, y, rad] of puffs) { bx0 = Math.min(bx0, x - rad - 4); bx1 = Math.max(bx1, x + rad + 4); by0 = Math.min(by0, y - rad - 4); by1 = Math.max(by1, y + rad * 1.12 + 4); }
      const pad = 6, ox = Math.floor(bx0) - pad, oy = Math.floor(by0) - pad;
      cv.width = Math.ceil(bx1 - ox + pad); cv.height = Math.ceil(by1 - oy + pad);
      const c = cv.getContext('2d'); c.translate(-ox, -oy);
      // плоское тёмное «дно»
      c.fillStyle = P.cloud[2]; c.beginPath(); c.ellipse(W / 2, H * 0.74, W * 0.42, H * 0.12, 0, 0, TAU); c.fill();
      for (const [x, y, rad] of puffs) { c.fillStyle = P.cloud[2]; c.beginPath(); c.arc(x, y + rad * 0.12, rad, 0, TAU); c.fill(); }
      for (const [x, y, rad] of puffs) { c.fillStyle = P.cloud[1]; c.beginPath(); c.arc(x - rad * 0.05, y - rad * 0.06, rad * 0.9, 0, TAU); c.fill(); }
      for (const [x, y, rad] of puffs) { c.fillStyle = P.cloud[0]; c.beginPath(); c.arc(x - rad * 0.12, y - rad * 0.2, rad * 0.62, 0, TAU); c.fill(); }
      // точка привязки (середина облака на 60% высоты) — в координатах нового холста
      set.push({ cv, W: cv.width, H: cv.height, ax: W / 2 - ox, ay: H * 0.6 - oy });
    }
    cloudSprites.set(name, set);
    return set;
  }

  let bgScale = 0.7;
  function setBgScale(px) { bgScale = Math.max(0.45, Math.min(0.9, Math.round(px * 4) / 4)); }

  function background(ctx, v, t) {
    const { x0, x1, y0, y1 } = v, T = theme, P = PAINT[themeName] || PAINT.noon, S = T.sun;
    const bd = buildBackdrop(themeName, bgScale);
    if (bd) ctx.drawImage(bd, BG.X0, BG.Y0, BG.W, BG.H);
    if (y0 < BG.Y0) { ctx.fillStyle = P.sky[0]; ctx.fillRect(x0, y0, x1 - x0, BG.Y0 - y0 + 1); }

    // звёзды мерцают (только в небе, выше холмов)
    if (T.stars) {
      for (const s of starsPos) {
        if (s.x < x0 || s.x > x1 || s.y > 420) continue;
        ctx.globalAlpha = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + s.p));
        ctx.fillStyle = '#FFF6D8'; star(ctx, s.x, s.y, s.s * 2.2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // лучи солнца: медленно поворачиваются и «дышат»
    if (P.rays) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, 700 - y0); ctx.clip();
      ctx.translate(S.x, S.y); ctx.rotate(t * 0.035);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        ctx.rotate(TAU / 14);
        const a = 0.55 + 0.45 * Math.sin(t * 0.9 + i * 1.7);
        ctx.globalAlpha = a; ctx.fillStyle = P.rays;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-34 - (i % 3) * 14, -900); ctx.lineTo(34 + (i % 3) * 14, -900); ctx.closePath(); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // дым над кратером вулкана
    if (P.volcano) {
      for (let i = 0; i < 9; i++) {
        const k = ((t * 0.06 + i / 9) % 1), x = 1180 + Math.sin(k * 5 + i) * 30 + k * 260, y = 290 - k * 520, rad = 40 + k * 120;
        ctx.globalAlpha = (1 - k) * 0.45 * Math.min(1, k * 6);
        ctx.fillStyle = i % 2 ? '#4A3036' : '#5E3E40'; circle(ctx, x, y, rad); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // облака плывут
    const set = cloudSet(themeName);
    if (set) {
      const span = (x1 - x0) + 900;
      clouds.forEach((cl, i) => {
        const sp = set[i % set.length], w = sp.W * cl.s, h = sp.H * cl.s;
        const cx = x0 - 450 + ((((cl.x + t * cl.v) - (x0 - 450)) % span) + span) % span;
        ctx.drawImage(sp.cv, cx - sp.ax * cl.s, cl.y - sp.ay * cl.s, w, h);
      });
    }
    // стая птиц
    if (T.flock) {
      const fw = (x1 - x0) + 500, fx = x0 - 250 + ((t * 38) % fw), fy = 250 + Math.sin(t * 0.4) * 24;
      ctx.strokeStyle = 'rgba(70,35,10,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const bx = fx - Math.abs(i - 2) * 34 - (i % 2) * 6, by = fy + (i - 2) * 20, w = Math.sin(t * 7 + i) * 7;
        ctx.beginPath(); ctx.moveTo(bx - 11, by - 4 + w); ctx.quadraticCurveTo(bx - 4, by - 7, bx, by); ctx.quadraticCurveTo(bx + 4, by - 7, bx + 11, by - 4 + w); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }

    // Земля
    now = t;
    fillSoil(ctx, x0, C.GROUND_Y, x1 - x0, y1 - C.GROUND_Y + 2, C.GROUND_Y);
    grassStrip(ctx, x0, x1, C.GROUND_Y, true);
  }

  // ---------- Текстура земли: плитка 512×320, рисуется один раз на каждое время суток ----------
  const TILE_W = 512, TILE_H = 320;
  const soilCache = new Map();
  function soilPattern(ctx) {
    const T = theme, key = T.ground.join() + T.pebble + (T.lava ? '|lava' : '');
    if (soilCache.has(key)) return soilCache.get(key);
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas'); cv.width = TILE_W; cv.height = TILE_H;
    const c = cv.getContext('2d'), r = rng(2024);
    // повторяем каждый элемент со сдвигом на ширину плитки, чтобы стык был незаметен
    const wrap = (fn) => { for (const dx of [-TILE_W, 0, TILE_W]) { c.save(); c.translate(dx, 0); fn(); c.restore(); } };
    const g = c.createLinearGradient(0, 0, 0, TILE_H);
    g.addColorStop(0, T.ground[0]); g.addColorStop(0.55, mix(T.ground[0], T.ground[1], 0.6)); g.addColorStop(1, T.ground[1]);
    c.fillStyle = g; c.fillRect(0, 0, TILE_W, TILE_H);
    // пласты почвы: волнистые полосы чуть темнее и светлее
    for (let k = 0; k < 5; k++) {
      const y = 40 + k * 58 + r() * 14, amp = 4 + r() * 6, ph = r() * 6.28, dark = k % 2 === 0;
      c.fillStyle = dark ? 'rgba(0,0,0,0.10)' : 'rgba(255,230,190,0.05)';
      c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= TILE_W; x += 16) c.lineTo(x, y + Math.sin((x / TILE_W) * TAU * 2 + ph) * amp);
      for (let x = TILE_W; x >= 0; x -= 16) c.lineTo(x, y + 10 + r() * 6 + Math.sin((x / TILE_W) * TAU * 2 + ph) * amp);
      c.closePath(); c.fill();
    }
    // мелкая крошка
    for (let i = 0; i < 700; i++) {
      const x = r() * TILE_W, y = r() * TILE_H, z = 0.8 + r() * 1.8;
      c.fillStyle = r() < 0.55 ? 'rgba(0,0,0,0.18)' : 'rgba(255,225,170,0.10)';
      c.fillRect(x, y, z, z);
    }
    // корешки у самого верха
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = r() * TILE_W, len = 14 + r() * 30;
      wrap(() => {
        c.strokeStyle = 'rgba(40,20,5,0.45)'; c.lineWidth = 1.2 + r() * 1.2;
        c.beginPath(); c.moveTo(x, 14); c.quadraticCurveTo(x + (r() - 0.5) * 20, 14 + len * 0.6, x + (r() - 0.5) * 18, 14 + len);
        if (r() < 0.6) { c.moveTo(x + 1, 18 + len * 0.3); c.lineTo(x + (r() < 0.5 ? -8 : 8), 22 + len * 0.55); }
        c.stroke();
      });
    }
    // вулкан: раскалённые трещины в базальте
    if (T.lava) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 0; i < 9; i++) {
        const x = r() * TILE_W, y = 30 + r() * (TILE_H - 60), pts = [[x, y]];
        for (let k = 0; k < 5; k++) { const [px, py] = pts[pts.length - 1]; pts.push([px + 10 + r() * 22, py + (r() - 0.5) * 26]); }
        wrap(() => {
          for (const [col, lw] of [['rgba(255,80,20,0.25)', 9], ['rgba(255,110,30,0.85)', 3.2], ['rgba(255,220,120,0.9)', 1.2]]) {
            c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach(([px, py], k) => (k ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
          }
        });
      }
    }
    // камешки: тёмные с бликом, разного размера и формы
    for (let i = 0; i < 46; i++) {
      const x = r() * TILE_W, y = 26 + r() * (TILE_H - 40), rx = 3 + r() * (r() < 0.15 ? 15 : 7), ry = rx * (0.55 + r() * 0.3), a = (r() - 0.5) * 0.8;
      const stone = r() < 0.35;
      wrap(() => {
        c.save(); c.translate(x, y); c.rotate(a);
        c.fillStyle = stone ? mix(T.ground[0], 'rgb(160,150,135)', 0.55) : T.pebble;
        c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(rx * 0.15, ry * 0.35, rx * 0.85, ry * 0.55, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,240,210,' + (stone ? 0.35 : 0.14) + ')'; c.beginPath(); c.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.4, ry * 0.25, -0.3, 0, TAU); c.fill();
        c.restore();
      });
    }
    // крупные камни, наполовину ушедшие в землю
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 128 + r() * 60, y = 34 + r() * 26, rx = 16 + r() * 12, ry = rx * (0.55 + r() * 0.15);
      wrap(() => {
        c.save(); c.translate(x, y);
        const sg = c.createLinearGradient(0, -ry, 0, ry);
        sg.addColorStop(0, mix('#A39A8C', T.ground[0], 0.25)); sg.addColorStop(1, mix('#5E554A', T.ground[1], 0.3));
        c.fillStyle = sg; c.beginPath(); c.ellipse(0, 0, rx, ry, (r() - 0.5) * 0.3, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(30,15,0,0.45)'; c.lineWidth = 2; c.stroke();
        c.fillStyle = 'rgba(255,245,220,0.35)'; c.beginPath(); c.ellipse(-rx * 0.3, -ry * 0.45, rx * 0.45, ry * 0.22, -0.2, 0, TAU); c.fill();
        c.restore();
      });
    }
    // редкие ракушки-завитки и косточки — детали, которые замечаешь не сразу
    for (let i = 0; i < 3; i++) {
      const x = 60 + r() * (TILE_W - 120), y = 120 + r() * 170;
      c.strokeStyle = 'rgba(255,235,200,0.22)'; c.lineWidth = 2;
      c.beginPath(); for (let k = 0; k < 26; k++) { const a = k * 0.45, rad = 1 + k * 0.32; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.stroke();
    }
    const pat = ctx.createPattern(cv, 'repeat');
    soilCache.set(key, pat);
    return pat;
  }
  // Залить прямоугольник почвой; top — откуда начинается текстура (верх земли или холма)
  function fillSoil(ctx, x, y, w, h, top) {
    const pat = soilPattern(ctx), T = theme;
    if (!pat) { ctx.fillStyle = T.ground[0]; ctx.fillRect(x, y, w, h); return; }
    ctx.save(); ctx.translate(0, top); ctx.fillStyle = pat; ctx.fillRect(x, y - top, w, h); ctx.restore();
    // ниже одной плитки (высокие экраны) — просто тёмная почва без повтора узора
    if (y + h > top + TILE_H) { ctx.fillStyle = T.ground[1]; ctx.fillRect(x, top + TILE_H, w, y + h - top - TILE_H); }
  }

  // ---------- Ветер ----------
  let now = 0, detail = 1;
  function setDetail(low) { detail = low ? 2 : 1; }
  // наклон травы в точке x: ровный ветер + волна + порывы, которые пробегают слева направо
  function wind(x, t) {
    const gust = Math.pow(Math.max(0, Math.sin(t * 0.42 - x * 0.0016)), 6);
    return 0.10 + Math.sin(t * 1.35 + x * 0.0065) * 0.11 + Math.sin(t * 3.1 + x * 0.021) * 0.04 + gust * 0.32;
  }

  // Хеш для травинок: одна и та же x всегда даёт одну и ту же травинку
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---------- Трава ----------
  // Травинки рисуются заранее: 12 кадров плитки шириной 480 с разным наклоном от ветра.
  // В каждом кадре полоса травы собирается из узких кусков нужного наклона — это в разы дешевле,
  // чем рисовать сотни травинок заново, а ветер по-прежнему бежит волной вдоль земли.
  const GT = 480, GUP = 50, GDN = 28, GH = GUP + GDN, GSC = 1.5, GN = 12, WMIN = -0.06, WMAX = 0.58, CHUNK = 16;
  const grassCache = new Map();
  function drawBlades(c, y, lean0, x0, x1, wrapW) {
    const G = theme.grass, hx = (x) => (wrapW ? ((x % wrapW) + wrapW) % wrapW : x);
    // дёрн
    c.fillStyle = G[0]; c.fillRect(x0, y - 2, x1 - x0, 15);
    c.fillStyle = G[1]; c.beginPath(); c.moveTo(x0, y + 11);
    for (let x = Math.floor(x0 / 14) * 14; x <= x1 + 14; x += 14) {
      const h = hash(hx(x) * 0.37);
      c.lineTo(x, y + 11); c.quadraticCurveTo(x + 7, y + 16 + h * 9, x + 14, y + 11);
    }
    c.lineTo(x1 + 14, y + 8); c.lineTo(x0, y + 8); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,200,0.16)'; c.fillRect(x0, y - 2, x1 - x0, 3);
    // травинки: дальний тёмный слой и ближний светлый
    const step = 5;
    for (let layer = 0; layer < 2; layer++) {
      c.fillStyle = layer === 0 ? mix(G[1], G[0], 0.35) : G[2]; c.beginPath();
      for (let x = Math.floor(x0 / step) * step - (layer ? 2 : 0); x < x1 + step; x += step) {
        const k = hx(x), h1 = hash(k + layer * 7.7), h2 = hash(k * 1.9 + 3.3 + layer);
        if (layer === 1 && h1 < 0.25) continue;
        const bx = x + (h2 - 0.5) * 4;
        const H = (layer === 0 ? 15 : 11) + h1 * 13 + (h2 > 0.9 ? 11 : 0);
        const w = 2.2 + h2 * 2.2;
        const lean = (h1 - 0.5) * 0.5 + lean0 * (0.7 + h1 * 0.6) * (layer ? 1 : 0.85);
        const tx = bx + Math.sin(lean) * H, ty = y + 1 - Math.cos(lean) * H;
        c.moveTo(bx - w, y + 2);
        c.quadraticCurveTo(bx - w * 0.3 + (tx - bx) * 0.35, y - H * 0.5, tx, ty);
        c.quadraticCurveTo(bx + w * 0.4 + (tx - bx) * 0.4, y - H * 0.45, bx + w, y + 2);
      }
      c.fill();
    }
    // зима: сугроб поверх сухой травы — торчат только кончики
    if (theme.snow) {
      c.fillStyle = '#EEF5FD'; c.beginPath(); c.moveTo(x0, y + 13);
      for (let x = Math.floor(x0 / 22) * 22; x <= x1 + 22; x += 22) { const h = hash(hx(x) * 0.53); c.quadraticCurveTo(x + 11, y - 9 - h * 10, x + 22, y - 3 - hash(hx(x + 22) * 0.53) * 4); }
      c.lineTo(x1 + 22, y + 13); c.closePath(); c.fill();
      c.fillStyle = 'rgba(160,190,230,0.45)'; c.fillRect(x0, y + 7, x1 - x0, 6);
      c.fillStyle = '#FFFFFF'; c.beginPath();
      for (let x = Math.floor(x0 / 22) * 22; x <= x1 + 22; x += 22) { const h = hash(hx(x) * 0.53); c.moveTo(x + 4, y - 2 - h * 5); c.quadraticCurveTo(x + 11, y - 9 - h * 10, x + 18, y - 3 - h * 5); }
      c.lineWidth = 3; c.strokeStyle = '#FFFFFF'; c.stroke();
      // искорки инея
      c.fillStyle = 'rgba(255,255,255,0.95)';
      for (let x = Math.floor(x0 / 31) * 31; x < x1; x += 31) { const h = hash(hx(x) * 2.7); if (h > 0.55) c.fillRect(x + h * 10, y - 1 + h * 8, 2, 2); }
      return;
    }
    // светлые кончики
    c.strokeStyle = 'rgba(255,255,210,0.35)'; c.lineWidth = 1.2; c.beginPath();
    for (let x = Math.floor(x0 / 37) * 37; x < x1; x += 37) {
      const h = hash(hx(x) * 3.1); if (h < 0.5) continue;
      const H = 12 + h * 8, lean = lean0 * 1.1, tx = x + Math.sin(lean) * H, ty = y - Math.cos(lean) * H;
      c.moveTo(x + (tx - x) * 0.55, y - H * 0.5); c.lineTo(tx, ty);
    }
    c.stroke();
  }
  function grassFrames() {
    const key = theme.grass.join() + (theme.snow ? '|snow' : '');
    if (grassCache.has(key)) return grassCache.get(key);
    if (typeof document === 'undefined') return null;
    const frames = [];
    for (let f = 0; f < GN; f++) {
      const cv = document.createElement('canvas'); cv.width = GT * GSC; cv.height = GH * GSC;
      const c = cv.getContext('2d'); c.scale(GSC, GSC);
      // рисуем с запасом по краям: травинки, наклонённые через край плитки, приходят от соседней плитки
      drawBlades(c, GUP, WMIN + (f * (WMAX - WMIN)) / (GN - 1), -40, GT + 40, GT);
      frames.push(cv);
    }
    grassCache.set(key, frames);
    return frames;
  }

  function grassStrip(ctx, x0, x1, y, flowers) {
    const G = theme.grass, t = now, frames = grassFrames();
    if (!frames) { drawBlades(ctx, y, wind(0, t), x0, x1, 0); return; }
    const step = CHUNK * detail;
    for (let cx = Math.floor(x0 / step) * step; cx < x1; cx += step) {
      const k = (wind(cx + step / 2, t) - WMIN) / (WMAX - WMIN);
      const fr = frames[Math.max(0, Math.min(GN - 1, Math.round(k * (GN - 1))))];
      const sx = ((cx % GT) + GT) % GT;
      const w = Math.min(step, GT - sx);
      ctx.drawImage(fr, sx * GSC, 0, w * GSC, GH * GSC, cx, y - GUP, w, GH);
      if (w < step) ctx.drawImage(frames[0] === fr ? fr : fr, 0, 0, (step - w) * GSC, GH * GSC, cx + w, y - GUP, step - w, GH);
    }
    if (!flowers || theme.noFlowers) return;
    // цветы рисуются вживую — их мало, и они качаются вместе с травой
    const cols = ['#FFFFFF', '#FFFFFF', '#FFE14D', '#FF8FB1', '#FF9A3C', '#B9A6FF'];
    ctx.lineCap = 'round';
    for (let x = Math.floor(x0 / 55) * 55; x < x1; x += 55) {
      const h = hash(x * 0.71);
      if (h < 0.3) continue;
      const fx0 = x + h * 40, stem = 14 + h * 14, lean = wind(fx0, t) * 0.9;
      const fx = fx0 + Math.sin(lean) * stem, fy = y - Math.cos(lean) * stem;
      ctx.strokeStyle = G[1]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx0, y + 2); ctx.quadraticCurveTo(fx0, y - stem * 0.5, fx, fy); ctx.stroke();
      ctx.fillStyle = cols[Math.floor(h * 97) % cols.length];
      for (let q = 0; q < 5; q++) { circle(ctx, fx + Math.cos(q * 1.256 + lean) * 4, fy + Math.sin(q * 1.256 + lean) * 4, 3); ctx.fill(); }
      ctx.fillStyle = '#E8A300'; circle(ctx, fx, fy, 2.4); ctx.fill();
    }
    ctx.lineCap = 'butt';
  }

  // ---------- Передний план: крупные листья по нижним углам, слегка размытые и качающиеся ----------
  const leafSprites = new Map();
  function leafSprite(name) {
    if (leafSprites.has(name)) return leafSprites.get(name);
    if (typeof document === 'undefined') return null;
    const P = PAINT[name] || PAINT.noon, cv = document.createElement('canvas'), W = 340, H = 240;
    cv.width = W; cv.height = H; const c = cv.getContext('2d'), r = rng(9 + name.length);
    try { c.filter = 'blur(2.5px)'; } catch (e) {}
    const leaf = (x, y, len, w, a, dark) => {
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = dark ? P.tree[2] : P.tree[0];
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(w, -len * 0.45, 0, -len); c.quadraticCurveTo(-w, -len * 0.45, 0, 0); c.fill();
      c.strokeStyle = 'rgba(255,255,220,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -len * 0.9); c.stroke();
      c.fillStyle = P.tree[1]; c.globalAlpha = 0.25; c.beginPath(); c.moveTo(0, -len * 0.1); c.quadraticCurveTo(w * 0.8, -len * 0.45, 0, -len * 0.95); c.fill(); c.globalAlpha = 1;
      c.restore();
    };
    for (let i = 0; i < 9; i++) leaf(W * 0.5 + (r() - 0.5) * 70, H + 10, 130 + r() * 90, 26 + r() * 18, (r() - 0.5) * 1.9, i % 3 === 0);
    for (let i = 0; i < 5; i++) leaf(W * 0.5 + (r() - 0.5) * 90, H + 10, 80 + r() * 50, 20 + r() * 10, (r() - 0.5) * 2.3, false);
    leafSprites.set(name, cv);
    return cv;
  }
  function foreground(ctx, v, t) {
    const sp = leafSprite(themeName);
    if (!sp) return;
    const bottom = v.y1, h = Math.min(210, bottom - C.GROUND_Y + 70);
    if (h < 70) return;
    const w = h * (340 / 240);
    for (const [x, flip, ph] of [[v.x0 + w * 0.32, -1, 0], [v.x1 - w * 0.3, 1, 1.7]]) {
      ctx.save(); ctx.translate(x, bottom + 6);
      ctx.rotate((Math.sin(t * 1.1 + ph) * 0.035 + wind(x, t) * 0.06) * flip);
      ctx.scale(flip, 1);
      ctx.drawImage(sp, -w / 2, -h, w, h);
      ctx.restore();
    }
  }

  // «Живой воздух»: пыльца днём, листья на закате, светлячки в сумерках и ночью
  function ambient(ctx, v, t) {
    const kind = theme.ambient, r = rng(31), W = v.x1 - v.x0;
    if (kind === 'fireflies') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i++) {
        const bx = v.x0 + r() * W, by = 500 + r() * 430, ph = r() * 6.28, f = 0.3 + r() * 0.5;
        const x = bx + Math.sin(t * f + ph) * 60 + Math.sin(t * f * 2.3 + ph) * 20, y = by + Math.cos(t * f * 1.3 + ph) * 40;
        const a = 0.2 + 0.8 * Math.max(0, Math.sin(t * (1 + f * 2) + ph * 3));
        const g = ctx.createRadialGradient(x, y, 0, x, y, 15);
        g.addColorStop(0, `rgba(255,244,150,${a.toFixed(2)})`); g.addColorStop(0.3, `rgba(255,220,80,${(a * 0.5).toFixed(2)})`); g.addColorStop(1, 'rgba(255,220,80,0)');
        ctx.fillStyle = g; circle(ctx, x, y, 15); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'leaves') {
      const cols = ['#E8641A', '#F29C2A', '#C9471A'];
      for (let i = 0; i < 14; i++) {
        const sp = 26 + r() * 30, ph = r() * 6.28;
        const y = 160 + ((r() * 820 + t * sp) % 820), x = v.x0 + ((r() * W + t * 14 + Math.sin(t * 1.2 + ph) * 50) % W + W) % W;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.5 + ph); ctx.globalAlpha = 0.85;
        ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(90,30,0,0.5)'; ctx.lineWidth = 1; line(ctx, -9, 0, 9, 0);
        ctx.restore();
      }
    } else if (kind === 'snow') {
      // снегопад: два слоя хлопьев, дальние мельче и медленнее
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 46; i++) {
        const near = i % 3 === 0, sp = near ? 60 + r() * 30 : 28 + r() * 20, ph = r() * 6.28, sz = near ? 3 + r() * 2.5 : 1.4 + r() * 1.6;
        const y = v.y0 - 20 + ((r() * 1100 + t * sp) % 1100), x = v.x0 + ((r() * W + Math.sin(t * 0.8 + ph) * 40 - t * 10) % W + W) % W;
        ctx.globalAlpha = near ? 0.9 : 0.55; circle(ctx, x, y, sz); ctx.fill();
      }
    } else if (kind === 'embers') {
      // искры от лавы поднимаются вверх и мерцают
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 30; i++) {
        const sp = 30 + r() * 50, ph = r() * 6.28, life = 900;
        const y = C.GROUND_Y + 20 - ((r() * life + t * sp) % life), x = v.x0 + ((r() * W + Math.sin(t * 1.3 + ph) * 30) % W + W) % W;
        const a = (0.4 + 0.6 * Math.max(0, Math.sin(t * 4 + ph * 5))) * Math.min(1, (y - 100) / 300);
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(255,${150 + Math.floor(r() * 80)},60,${a.toFixed(2)})`;
        circle(ctx, x, y, 1.5 + r() * 2.2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'pollen') {
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 20; i++) {
        const ph = r() * 6.28, sp = 8 + r() * 14;
        const x = v.x0 + ((r() * W + t * sp) % W), y = 300 + r() * 620 + Math.sin(t * 0.7 + ph) * 26;
        ctx.globalAlpha = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph));
        circle(ctx, x, y, 2 + r() * 2.5); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Следы взрывов на земле
  function decals(ctx, list) {
    for (const d of list) {
      ctx.save(); ctx.translate(d.x, d.y + 3); ctx.scale(1, 0.2);
      const g = ctx.createRadialGradient(0, 0, d.r * 0.1, 0, 0, d.r);
      g.addColorStop(0, 'rgba(25,12,4,0.7)'); g.addColorStop(0.6, 'rgba(25,12,4,0.35)'); g.addColorStop(1, 'rgba(25,12,4,0)');
      ctx.fillStyle = g; circle(ctx, 0, 0, d.r); ctx.fill();
      ctx.restore();
    }
  }

  // Холмы и скаты. Порядок: скаты (под холмами) → холмы от низких к высоким → трава у подножия поверх всего.
  // Контур у стенки холма рисуется только там, где стенка открыта (не примыкает к соседнему холму или скату).
  function statics(ctx, list) {
    const T = theme, G = C.GROUND_Y;
    const rects = list.filter((s) => !s.poly && s.size).map((s) => ({ x0: s.position.x - s.size.w / 2, x1: s.position.x + s.size.w / 2, y: s.position.y - s.size.h / 2 }));
    const polys = list.filter((s) => s.poly);
    rects.sort((a, b) => b.y - a.y);   // низкие — раньше, высокие перекрывают их

    // 1) скаты
    for (const s of polys) {
      const vs = s.vertices, top = Math.min(...vs.map((p) => p.y)), xs = vs.map((p) => p.x);
      ctx.save(); ctx.beginPath(); vs.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip();
      fillSoil(ctx, Math.min(...xs), top, Math.max(...xs) - Math.min(...xs), G - top + 4, top);
      ctx.restore();
      // трава по наклонной стороне
      let best = null;
      for (let i = 0; i < vs.length; i++) {
        const a = vs[i], b = vs[(i + 1) % vs.length];
        if (Math.abs(a.y - b.y) < 1 || Math.abs(a.x - b.x) < 1) continue;
        const len = Math.hypot(a.x - b.x, a.y - b.y);
        if (!best || len > best.len) best = { a, b, len };
      }
      if (best) {
        // тёмная подложка — с плоскими концами, чтобы не торчала у вершины и у земли
        ctx.lineCap = 'butt';
        ctx.strokeStyle = OUT; ctx.lineWidth = 19; line(ctx, best.a.x, best.a.y + 3, best.b.x, best.b.y + 3);
        ctx.lineCap = 'round';
        ctx.strokeStyle = T.grass[1]; ctx.lineWidth = 14; line(ctx, best.a.x, best.a.y + 3, best.b.x, best.b.y + 3);
        ctx.strokeStyle = T.grass[0]; ctx.lineWidth = 9; line(ctx, best.a.x, best.a.y, best.b.x, best.b.y);
        ctx.lineCap = 'butt';
      }
    }

    // открытая часть стенки: от верха холма до верха соседа (если сосед ниже) или до земли
    const exposed = (R, side) => {
      const ex = side < 0 ? R.x0 : R.x1;
      let bottom = G;
      for (const o of rects) if (o !== R && Math.abs((side < 0 ? o.x1 : o.x0) - ex) < 6) bottom = Math.min(bottom, Math.max(R.y, o.y));
      for (const s of polys) for (const p of s.vertices) if (Math.abs(p.x - ex) < 6 && p.y < G - 5) bottom = Math.min(bottom, Math.max(R.y, p.y));
      return bottom;
    };

    // 2) холмы
    for (const R of rects) {
      const x = R.x0, y = R.y, w = R.x1 - R.x0;
      fillSoil(ctx, x, y, w, G - y + 2, y);
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const lb = exposed(R, -1), rb = exposed(R, 1);
      ctx.beginPath();
      const rampAtTop = polys.some((s) => s.vertices.some((p) => Math.abs(p.x - x) < 6 && Math.abs(p.y - y) < 6));
      if (lb > y + 1) { ctx.moveTo(x, lb); ctx.lineTo(x, y); } else ctx.moveTo(x + (rampAtTop ? 8 : 0), y);
      ctx.lineTo(x + w, y);
      if (rb > y + 1) ctx.lineTo(x + w, rb);
      ctx.stroke(); ctx.lineCap = 'butt';
      ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, w - 4, G - y); ctx.clip(); grassStrip(ctx, x, x + w, y + 2, true); ctx.restore();
    }

    // 3) трава у подножия — поверх основания холмов и скатов, чтобы они «стояли» на земле
    const spans = rects.map((R) => [R.x0 - 4, R.x1 + 4]);
    for (const s of polys) { const xs = s.vertices.map((p) => p.x); spans.push([Math.min(...xs) - 16, Math.max(...xs) + 4]); }
    for (const [a, b] of spans) {
      ctx.save(); ctx.beginPath(); ctx.rect(a, G - 70, b - a, 100); ctx.clip();
      grassStrip(ctx, a, b, G, true);
      ctx.restore();
    }
  }

  // Высота поверхности под точкой x (земля или верх холма) — для теней
  function surfaceY(x, list) {
    let y = C.GROUND_Y;
    for (const s of list) {
      if (s.poly || !s.size) continue;
      if (x > s.position.x - s.size.w / 2 && x < s.position.x + s.size.w / 2) y = Math.min(y, s.position.y - s.size.h / 2);
    }
    return y;
  }

  // Поверхности, на которые ложатся тени и подпалины: земля и верх каждого холма
  function surfaceList(list, ground) {
    if (ground) return [{ x0: -1e5, x1: 1e5, y: C.GROUND_Y, ground: true }];
    return list.filter((s) => !s.poly && s.size).map((s) => ({ x0: s.position.x - s.size.w / 2, x1: s.position.x + s.size.w / 2, y: s.position.y - s.size.h / 2 }));
  }
  const shadeCache = new WeakMap();
  function unitShade(ctx) {
    if (!shadeCache.has(ctx)) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(30,14,0,1)'); g.addColorStop(0.55, 'rgba(30,14,0,0.7)'); g.addColorStop(1, 'rgba(30,14,0,0)');
      shadeCache.set(ctx, g);
    }
    return shadeCache.get(ctx);
  }
  function softEllipse(ctx, x, y, rx, ry, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry); ctx.globalAlpha = alpha;
    ctx.fillStyle = unitShade(ctx); ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Тени и следы взрывов на поверхностях. ground=true — на земле (рисуется до холмов, они её перекрывают),
  // ground=false — на верхушках холмов. Всё обрезается по краю поверхности, поэтому ничего не висит в воздухе.
  // Тень есть только у того, что стоит на поверхности или низко над ней.
  function groundFx(ctx, bodies, decalList, list, ground) {
    for (const S of surfaceList(list, ground)) {
      ctx.save();
      ctx.beginPath();
      // только ниже линии поверхности и только в пределах холма — ничего не «висит» в воздухе
      if (S.ground) ctx.rect(-1e5, S.y + 1, 2e5, 18); else ctx.rect(S.x0 + 3, S.y + 1, S.x1 - S.x0 - 6, 16);
      ctx.clip();
      for (const d of decalList) {
        if (Math.abs(d.y - S.y) > 1) continue;
        softEllipse(ctx, d.x, d.y + 3, d.r * 0.85, Math.min(10, d.r * 0.06), 0.55);
      }
      for (const b of bodies) {
        const bb = b.bounds, cx = (bb.min.x + bb.max.x) / 2, w = bb.max.x - bb.min.x;
        if (cx < S.x0 - w / 2 || cx > S.x1 + w / 2) continue;
        if (!S.ground && (cx < S.x0 || cx > S.x1)) continue;
        if (S.ground && surfaceY(cx, list) !== S.y) continue;
        const gap = S.y - bb.max.y;
        if (gap < -8 || gap > 60) continue;
        const k = 1 - Math.max(0, gap) / 60;
        // тень прижата к поверхности: тёмная полоска прямо под предметом, тает с высотой
        softEllipse(ctx, cx + 2, S.y + 2, w * (0.48 + 0.1 * k), 3 + 4 * k, 0.55 * k);
      }
      ctx.restore();
    }
  }

  // ---------- Объём (2.5D) ----------
  // Глубина: задняя грань смещена вправо-вверх, будто камера смотрит чуть сверху и сбоку.
  const DEPTH = { x: 12, y: -9 };
  const SIDE = {
    wood:  ['rgb(222,160,84)', 'rgb(122,72,26)'],
    glass: ['rgba(205,240,255,0.80)', 'rgba(80,150,190,0.75)'],
    stone: ['rgb(190,185,175)', 'rgb(98,94,86)'],
    tnt:   ['rgb(230,90,60)', 'rgb(110,26,14)'],
  };
  const colorCache = new Map();
  function parseCol(c) {
    if (colorCache.has(c)) return colorCache.get(c);
    let m;
    if (c[0] === '#') { const n = parseInt(c.slice(1), 16); m = [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
    else { m = c.match(/[\d.]+/g).map(Number); if (m.length === 3) m.push(1); }
    colorCache.set(c, m); return m;
  }
  function mix(c1, c2, k) {
    const a = parseCol(c1), b = parseCol(c2), q = Math.round(k * 8) / 8;
    return `rgba(${Math.round(a[0] + (b[0] - a[0]) * q)},${Math.round(a[1] + (b[1] - a[1]) * q)},${Math.round(a[2] + (b[2] - a[2]) * q)},${(a[3] + (b[3] - a[3]) * q).toFixed(2)})`;
  }

  // Боковые грани выпуклого многоугольника (вершины в мировых координатах)
  function extrude(ctx, vs, lightCol, darkCol, depth, faceCol) {
    const D = depth || DEPTH, L = theme.light;
    let cx = 0, cy = 0; for (const v of vs) { cx += v.x; cy += v.y; } cx /= vs.length; cy /= vs.length;
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(43,29,14,0.55)';
    for (let i = 0; i < vs.length; i++) {
      const a = vs[i], b = vs[(i + 1) % vs.length];
      let nx = b.y - a.y, ny = a.x - b.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if (((a.x + b.x) / 2 - cx) * nx + ((a.y + b.y) / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
      if (nx * D.x + ny * D.y <= 0.5) continue;
      const lit = Math.max(0, Math.min(1, 0.5 + 0.6 * (nx * L[0] + ny * L[1])));
      ctx.fillStyle = faceCol ? faceCol(nx, ny, lit) : mix(darkCol, lightCol, lit);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + D.x, b.y + D.y); ctx.lineTo(a.x + D.x, a.y + D.y); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  // Объём круглого тела (валун): «цилиндр» в сторону глубины
  function extrudeCircle(ctx, x, y, r, col) {
    const D = DEPTH, dl = Math.hypot(D.x, D.y), px = -D.y / dl * r, py = D.x / dl * r;
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(43,29,14,0.55)'; ctx.lineWidth = 2;
    circle(ctx, x + D.x, y + D.y, r); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + px, y + py); ctx.lineTo(x - px, y - py); ctx.lineTo(x - px + D.x, y - py + D.y); ctx.lineTo(x + px + D.x, y + py + D.y); ctx.closePath(); ctx.fill();
  }

  function blockSides(ctx, b) {
    const g = b.game, c = SIDE[g.m];
    if (g.shape === 'circle') extrudeCircle(ctx, b.position.x, b.position.y, g.w / 2, mix(c[1], c[0], 0.35));
    else extrude(ctx, b.vertices, c[0], c[1]);
  }

  // Шаровая светотень персонажа (в его локальных координатах, la — угол на свет)
  function sphereShade(ctx, r, la) {
    const lx = Math.cos(la), ly = Math.sin(la);
    ctx.save(); circle(ctx, 0, 0, r * 0.96); ctx.clip();
    const g = ctx.createRadialGradient(lx * r * 0.45, ly * r * 0.45, r * 0.1, lx * r * 0.15, ly * r * 0.15, r * 1.15);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(0.8, 'rgba(40,12,0,0.12)'); g.addColorStop(1, 'rgba(40,12,0,0.42)');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    // отражённый свет с теневой стороны
    ctx.strokeStyle = 'rgba(255,236,190,0.5)'; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.8, la + Math.PI - 0.6, la + Math.PI + 0.6); ctx.stroke();
    // контровой свет по краю со стороны солнца
    ctx.strokeStyle = lightCfg().rim; ctx.lineWidth = r * 0.13;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, la - 0.85, la + 0.85); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.restore();
    // блик
    ctx.save(); ctx.translate(lx * r * 0.52, ly * r * 0.52); ctx.rotate(la + Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.1, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function lightAngle() { return Math.atan2(theme.light[1], theme.light[0]); }

  // ---------- Блоки ----------
  const crackCache = new Map();
  function cracks(g) {
    if (crackCache.has(g.seed)) return crackCache.get(g.seed);
    const r = rng(g.seed * 131), out = [];
    for (let k = 0; k < 3; k++) {
      const pts = []; let x = (r() - 0.5) * g.w * 0.8, y = (r() < 0.5 ? -1 : 1) * g.h / 2;
      pts.push([x, y]);
      for (let i = 0; i < 4; i++) { x += (r() - 0.5) * g.w * 0.35; y = (r() - 0.5) * g.h * 0.9; pts.push([x, y]); }
      out.push(pts);
    }
    crackCache.set(g.seed, out); return out;
  }

  // Контур блока в локальных координатах (центр тела — начало координат)
  function shapePath(ctx, g) {
    const w = g.w, h = g.h;
    if (g.shape === 'tri') { ctx.beginPath(); ctx.moveTo(-w / 2, h / 3); ctx.lineTo(w / 2, h / 3); ctx.lineTo(0, -2 * h / 3); ctx.closePath(); }
    else if (g.shape === 'circle') circle(ctx, 0, 0, w / 2);
    else rr(ctx, -w / 2, -h / 2, w, h, g.m === 'stone' ? 6 : g.m === 'glass' ? 3 : 4);
  }

  // Контровой свет: светлая кромка на гранях, повёрнутых к солнцу
  function rimLight(ctx, g, ang) {
    const L = theme.light, ca = Math.cos(ang), sa = Math.sin(ang);
    const lx = L[0] * ca + L[1] * sa, ly = -L[0] * sa + L[1] * ca;   // направление на свет в координатах блока
    const w = g.w, h = g.h, col = lightCfg().rim, inset = 2.5;
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = g.m === 'glass' ? 3.5 : 3;
    if (g.shape === 'circle') {
      const a = Math.atan2(ly, lx);
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, w / 2 - inset, a - 1.0, a + 1.0); ctx.stroke();
    } else {
      const vs = g.shape === 'tri' ? [[-w / 2, h / 3], [w / 2, h / 3], [0, -2 * h / 3]] : [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
      let cx = 0, cy = 0; vs.forEach(([x, y]) => { cx += x; cy += y; }); cx /= vs.length; cy /= vs.length;
      for (let i = 0; i < vs.length; i++) {
        const [ax, ay] = vs[i], [bx, by] = vs[(i + 1) % vs.length];
        let nx = by - ay, ny = ax - bx; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        if (((ax + bx) / 2 - cx) * nx + ((ay + by) / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
        const k = nx * lx + ny * ly;
        if (k < 0.2) continue;
        ctx.globalAlpha = Math.min(1, (k - 0.1) * 1.1);
        // кромка чуть внутри контура, концы не доходят до углов
        const ix = -nx * inset, iy = -ny * inset, tx = (bx - ax) * 0.06, ty = (by - ay) * 0.06;
        ctx.beginPath(); ctx.moveTo(ax + ix + tx, ay + iy + ty); ctx.lineTo(bx + ix - tx, by + iy - ty); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Свет поверх сцены (в координатах мира): широкие солнечные лучи и тёплый «воздух» со стороны солнца
  function lighting(ctx, v, t) {
    const S = theme.sun, Lc = lightCfg();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (Lc.beams) {
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * 0.64 + i * 0.17 + Math.sin(t * 0.25 + i * 1.9) * 0.025;   // лучи падают от солнца вниз-влево
        const len = 2600, wd = 80 + (i % 2) * 55;
        const ex = S.x + Math.cos(a) * len, ey = S.y + Math.sin(a) * len;
        const px = -Math.sin(a) * wd, py = Math.cos(a) * wd;
        const g = ctx.createLinearGradient(S.x, S.y, ex, ey);
        g.addColorStop(0, Lc.beams); g.addColorStop(0.55, Lc.beams.replace(/[\d.]+\)$/, '0.035)')); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.6 + i * 2.3);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(ex + px, ey + py); ctx.lineTo(ex - px, ey - py); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // Цветокоррекция всего кадра одним проходом: у солнца — тёплый свет «в воздухе», дальше — общий тон времени суток.
  // sx, sy — положение солнца на экране в пикселях.
  const gradeCache = { key: '', g: null };
  function grade(ctx, w, h, sx, sy) {
    const Lc = lightCfg(), key = [themeName, w, h, Math.round(sx), Math.round(sy)].join();
    if (gradeCache.key !== key) {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 1.1);
      g.addColorStop(0, mix(Lc.air, Lc.grade, 0.15).replace(/[\d.]+\)$/, '0.55)'));
      g.addColorStop(0.4, Lc.grade); g.addColorStop(1, Lc.grade);
      gradeCache.key = key; gradeCache.g = g;
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = gradeCache.g; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function sunPos() { return theme.sun; }

  const MAT_STYLE = {
    wood:  { a: '#EDBB6C', b: '#C7883A', line: '#6E4216', grain: 'rgba(140,82,30,0.55)' },
    glass: { a: 'rgba(232,250,255,0.85)', b: 'rgba(140,210,240,0.55)', line: '#4E9DC4' },
    stone: { a: '#C4BFB5', b: '#8E897F', line: '#4A463F' },
    tnt:   { a: '#F05A3A', b: '#B8261A', line: '#5A1A0C' },
  };

  function block(ctx, b) {
    const g = b.game, w = g.w, h = g.h, st = MAT_STYLE[g.m];
    ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
    const horiz = w >= h;
    const gr = g.shape === 'circle'
      ? ctx.createRadialGradient(-w * 0.18, -w * 0.2, w * 0.05, 0, 0, w * 0.55)
      : (horiz || g.shape === 'tri' ? ctx.createLinearGradient(0, -h / 2, 0, h / 2) : ctx.createLinearGradient(-w / 2, 0, w / 2, 0));
    gr.addColorStop(0, st.a); gr.addColorStop(1, st.b);
    shapePath(ctx, g); ctx.fillStyle = gr; ctx.fill();

    ctx.save(); shapePath(ctx, g); ctx.clip();
    if (g.m === 'wood') {
      ctx.strokeStyle = st.grain; ctx.lineWidth = 2; ctx.beginPath();
      if (g.shape === 'tri') { for (let k = 1; k <= 3; k++) { const yy = h / 3 - k * h * 0.22, ww = w * (1 - k * 0.22) / 2; ctx.moveTo(-ww + 4, yy); ctx.lineTo(ww - 4, yy); } }
      else if (horiz) { ctx.moveTo(-w / 2 + 6, -h * 0.15); ctx.lineTo(w / 2 - 10, -h * 0.15); ctx.moveTo(-w / 2 + 14, h * 0.2); ctx.lineTo(w / 2 - 6, h * 0.2); }
      else { ctx.moveTo(-w * 0.15, -h / 2 + 6); ctx.lineTo(-w * 0.15, h / 2 - 10); ctx.moveTo(w * 0.2, -h / 2 + 14); ctx.lineTo(w * 0.2, h / 2 - 6); }
      ctx.stroke();
      if (g.shape === 'rect' && Math.max(w, h) > 70) {
        // сучок и гвозди
        const r = rng(g.seed); const kx = horiz ? (r() - 0.5) * w * 0.5 : 0, ky = horiz ? 0 : (r() - 0.5) * h * 0.5;
        ctx.fillStyle = 'rgba(120,70,25,0.6)'; ctx.beginPath(); ctx.ellipse(kx, ky, horiz ? 6 : 3, horiz ? 3 : 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5A3A1A';
        const nx = horiz ? w / 2 - 7 : 0, ny = horiz ? 0 : h / 2 - 7;
        circle(ctx, nx, ny, 2.2); ctx.fill(); circle(ctx, -nx, -ny, 2.2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      if (g.shape === 'rect') { if (horiz) ctx.fillRect(-w / 2, -h / 2, w, 3); else ctx.fillRect(-w / 2, -h / 2, 3, h); }
    } else if (g.m === 'glass') {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const L = Math.max(w, h);
      ctx.beginPath(); ctx.moveTo(-L * 0.3, -L); ctx.lineTo(-L * 0.18, -L); ctx.lineTo(-L * 0.38 + L * 0.2, L); ctx.lineTo(-L * 0.5 + L * 0.2, L); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.moveTo(L * 0.05, -L); ctx.lineTo(L * 0.1, -L); ctx.lineTo(L * 0.0, L); ctx.lineTo(-L * 0.05, L); ctx.closePath(); ctx.fill();
    } else if (g.m === 'stone') {
      const r = rng(g.seed);
      if (g.shape === 'rect' && w >= 40 && h >= 40) {
        // кладка
        ctx.strokeStyle = 'rgba(60,55,48,0.45)'; ctx.lineWidth = 2; ctx.beginPath();
        const rowH = 24;
        for (let y = -h / 2 + rowH, row = 0; y < h / 2; y += rowH, row++) { ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); }
        for (let y = -h / 2, row = 0; y < h / 2; y += rowH, row++) for (let x = -w / 2 + (row % 2 ? 20 : 40); x < w / 2; x += 40) { ctx.moveTo(x, y); ctx.lineTo(x, Math.min(h / 2, y + rowH)); }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(80,75,68,0.5)';
      for (let i = 0; i < Math.max(3, (w * h) / 700); i++) { circle(ctx, (r() - 0.5) * (w - 10), (r() - 0.5) * (h - 8), 1.5 + r() * 3); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      if (g.shape === 'circle') { ctx.beginPath(); ctx.ellipse(-w * 0.15, -w * 0.2, w * 0.18, w * 0.09, -0.6, 0, TAU); ctx.fill(); }
      else ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 3);
    } else if (g.m === 'tnt') {
      // ящик со взрывчаткой
      ctx.strokeStyle = '#7A4A1C'; ctx.lineWidth = 6; ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      ctx.strokeStyle = 'rgba(122,74,28,0.8)'; ctx.lineWidth = 4; line(ctx, -w / 2 + 4, -h / 2 + 4, w / 2 - 4, h / 2 - 4);
      ctx.fillStyle = '#FFE14D'; ctx.fillRect(-w / 2 + 6, -h * 0.17, w - 12, h * 0.34);
      ctx.font = `900 ${Math.round(h * 0.3)}px "Trebuchet MS", system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#B8261A'; ctx.fillText('TNT', 0, 1);
    }
    ctx.restore();

    shapePath(ctx, g); ctx.strokeStyle = st.line; ctx.lineWidth = 3; ctx.stroke();
    rimLight(ctx, g, b.angle);

    const dmg = 1 - g.hp / g.maxHp;
    if (dmg > 0.2) {
      const cs = cracks(g), n = dmg > 0.7 ? 3 : dmg > 0.45 ? 2 : 1;
      ctx.save(); shapePath(ctx, g); ctx.clip();
      ctx.strokeStyle = g.m === 'glass' ? 'rgba(255,255,255,0.95)' : 'rgba(40,25,10,0.65)'; ctx.lineWidth = 2;
      for (let k = 0; k < n; k++) { ctx.beginPath(); cs[k].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- Птенцы ----------
  const CHICK = {
    normal: { a: '#FFE95C', b: '#FFC21A', belly: '#FFF6C2', wing: '#F2AE00' },
    speed:  { a: '#FFC067', b: '#FF8A00', belly: '#FFE3B8', wing: '#E06F00' },
    bomb:   { a: '#7A6650', b: '#46372A', belly: '#9C8A73', wing: '#33271D' },
    split:  { a: '#FFC4DC', b: '#FF6FA8', belly: '#FFE6F0', wing: '#E85590' },
    heavy:  { a: '#C2B2FF', b: '#7454D8', belly: '#E4DCFF', wing: '#563AB0' },
    boomer: { a: '#C8F58A', b: '#58B52A', belly: '#ECFFD6', wing: '#3E8F18' },
    puff:   { a: '#FFFFFF', b: '#9ED8FF', belly: '#FFFFFF', wing: '#74C0F2' },
  };

  function chick(ctx, x, y, r, ang, type, o = {}) {
    const c = CHICK[type] || CHICK.normal;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (o.mirror) ctx.scale(1, -1);   // летит влево — не переворачиваем вверх ногами
    if (o.squash) ctx.scale(1 + o.squash, 1 - o.squash);
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2.5, r * 0.12); ctx.strokeStyle = OUT;

    // хвостик
    ctx.fillStyle = c.wing;
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.1); ctx.lineTo(-r * 1.35, -r * 0.45); ctx.lineTo(-r * 1.2, r * 0.05); ctx.lineTo(-r * 1.4, r * 0.3); ctx.lineTo(-r * 0.8, r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();

    // хохолок
    if (type === 'normal' || type === 'split') {
      ctx.fillStyle = type === 'split' ? '#FFD21F' : c.b;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-r * 0.15 + i * r * 0.22, -r * 1.02, r * 0.12, r * 0.28, -0.4 + i * 0.4, 0, TAU); ctx.fill(); ctx.stroke(); }
    } else if (type === 'speed') {
      ctx.fillStyle = c.b;
      ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.85); ctx.lineTo(-r * 0.9, -r * 1.25); ctx.lineTo(-r * 0.35, -r * 0.8); ctx.lineTo(-r * 1.0, -r * 0.95); ctx.lineTo(-r * 0.3, -r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (type === 'heavy') {
      // шип на каске
      ctx.fillStyle = '#C9CED8';
      ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.9); ctx.lineTo(0, -r * 1.32); ctx.lineTo(r * 0.12, -r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (type === 'boomer') {
      // деревянный бумеранг на макушке
      ctx.save(); ctx.translate(-r * 0.15, -r * 1.02); ctx.rotate(-0.3); ctx.scale(1.3, 1.3);
      ctx.fillStyle = '#C98A3E'; ctx.beginPath();
      ctx.moveTo(-r * 0.62, r * 0.05); ctx.quadraticCurveTo(-r * 0.2, -r * 0.08, 0, -r * 0.42); ctx.quadraticCurveTo(r * 0.2, -r * 0.08, r * 0.62, r * 0.05);
      ctx.lineTo(r * 0.56, r * 0.22); ctx.quadraticCurveTo(r * 0.1, r * 0.1, 0, -r * 0.14); ctx.quadraticCurveTo(-r * 0.1, r * 0.1, -r * 0.56, r * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E8343A'; ctx.fillRect(-r * 0.46, r * 0.06, r * 0.1, r * 0.1); ctx.fillRect(r * 0.36, r * 0.06, r * 0.1, r * 0.1);
      ctx.restore();
    } else if (type === 'puff') {
      // три кудряшки
      ctx.fillStyle = c.b;
      for (let i = 0; i < 3; i++) { circle(ctx, -r * 0.24 + i * r * 0.24, -r * 1.02 - (i === 1 ? r * 0.08 : 0), r * 0.17); ctx.fill(); ctx.stroke(); }
    } else if (type === 'bomb') {
      ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.14;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.quadraticCurveTo(r * 0.2, -r * 1.35, r * 0.45, -r * 1.3); ctx.stroke();
      const fl = 0.7 + Math.sin((o.time || 0) * 30) * 0.3;
      ctx.fillStyle = '#FFE14D'; circle(ctx, r * 0.5, -r * 1.32, r * 0.18 * fl + r * 0.08); ctx.fill();
      ctx.fillStyle = '#FF7A00'; circle(ctx, r * 0.5, -r * 1.32, r * 0.1 * fl); ctx.fill();
      ctx.lineWidth = Math.max(2.5, r * 0.12);
    }

    // тело
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, c.a); g.addColorStop(1, c.b);
    if (type === 'puff') {
      // пушистый край: кольцо пёрышек, внутренний контур закрывается телом
      const n = 14, fr = r * (o.puffed ? 0.2 : 0.24);
      ctx.fillStyle = c.b;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (o.time || 0) * (o.puffed ? 1.5 : 0); circle(ctx, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, fr); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = g; circle(ctx, 0, 0, r * 0.92); ctx.fill();
    } else { ctx.fillStyle = g; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke(); }
    // брюшко
    ctx.save(); circle(ctx, 0, 0, r - ctx.lineWidth / 2); ctx.clip();
    ctx.fillStyle = c.belly; ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.55, r * 0.7, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
    sphereShade(ctx, r, o.mirror ? ang - lightAngle() : lightAngle() - ang);
    if (type === 'heavy') {
      // железная каска с заклёпками
      ctx.save(); circle(ctx, 0, 0, r + ctx.lineWidth); ctx.clip();
      const hg = ctx.createLinearGradient(0, -r, 0, -r * 0.3);
      hg.addColorStop(0, '#E6EAF0'); hg.addColorStop(1, '#8D95A5');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, -r * 0.42, r * 1.08, r * 0.72, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A8292'; rr(ctx, -r * 1.05, -r * 0.5, r * 2.1, r * 0.17, r * 0.06); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E6EAF0'; for (const rx of [-0.7, -0.25, 0.25, 0.7]) { circle(ctx, rx * r, -r * 0.415, r * 0.045); ctx.fill(); }
      ctx.restore();
    }
    // крыло
    const flap = o.flap ? Math.sin((o.time || 0) * 34) : 0;
    ctx.fillStyle = c.wing; ctx.beginPath();
    ctx.ellipse(-r * 0.25, r * 0.15 - (o.flap ? r * 0.12 * (flap + 1) : 0), r * (o.flap ? 0.46 : 0.38), r * 0.24, 0.5 - flap * 0.9, 0, TAU); ctx.fill(); ctx.stroke();

    // глаза
    const ex1 = r * 0.12, ex2 = r * 0.52, ey = -r * 0.22, er = r * 0.25;
    if (o.blink) {
      ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.moveTo(ex1 - er, ey); ctx.lineTo(ex1 + er, ey); ctx.moveTo(ex2 - er * 0.9, ey); ctx.lineTo(ex2 + er * 0.9, ey); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff'; ctx.lineWidth = r * 0.08;
      circle(ctx, ex1, ey, er); ctx.fill(); ctx.stroke(); circle(ctx, ex2, ey, er * 0.9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = OUT; circle(ctx, ex1 + er * 0.35, ey + er * 0.05, er * 0.5); ctx.fill(); circle(ctx, ex2 + er * 0.3, ey + er * 0.05, er * 0.45); ctx.fill();
      ctx.fillStyle = '#fff'; circle(ctx, ex1 + er * 0.5, ey - er * 0.2, er * 0.16); ctx.fill();
    }
    // брови у особых птенцов
    if (type === 'speed' || type === 'bomb') {
      ctx.lineWidth = r * 0.12; ctx.beginPath();
      ctx.moveTo(ex1 - er, ey - er * 1.3); ctx.lineTo(ex1 + er, ey - er * 0.9);
      ctx.moveTo(ex2 - er * 0.8, ey - er * 0.9); ctx.lineTo(ex2 + er, ey - er * 1.3); ctx.stroke();
    } else if (type === 'heavy') {
      // тяжёлые сдвинутые брови
      ctx.fillStyle = OUT; ctx.beginPath();
      ctx.moveTo(ex1 - er * 1.1, ey - er * 1.5); ctx.lineTo(ex1 + er * 1.05, ey - er * 0.85); ctx.lineTo(ex1 + er * 0.9, ey - er * 0.55); ctx.lineTo(ex1 - er * 1.1, ey - er * 1.05); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ex2 - er * 0.9, ey - er * 0.85); ctx.lineTo(ex2 + er * 1.1, ey - er * 1.5); ctx.lineTo(ex2 + er * 1.1, ey - er * 1.05); ctx.lineTo(ex2 - er * 0.75, ey - er * 0.55); ctx.closePath(); ctx.fill();
    } else if (type === 'boomer') {
      // хитрый прищур: одна бровь поднята
      ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(ex1 - er, ey - er * 1.55); ctx.quadraticCurveTo(ex1, ey - er * 2.0, ex1 + er, ey - er * 1.6);
      ctx.moveTo(ex2 - er * 0.8, ey - er * 1.1); ctx.lineTo(ex2 + er, ey - er * 1.2); ctx.stroke(); ctx.lineCap = 'butt';
    }
    // клюв
    ctx.lineWidth = Math.max(2, r * 0.09); ctx.fillStyle = '#FF8A1F';
    ctx.beginPath(); ctx.moveTo(r * 0.72, -r * 0.05); ctx.lineTo(r * 1.22, r * 0.1); ctx.lineTo(r * 0.72, r * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E8650A';
    ctx.beginPath(); ctx.moveTo(r * 0.72, r * 0.12); ctx.lineTo(r * 1.08, r * 0.14); ctx.lineTo(r * 0.72, r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    // румянец
    ctx.fillStyle = 'rgba(255,110,90,0.45)'; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.18, r * 0.14, r * 0.08, 0, 0, TAU); ctx.fill();
    const sk = o.skin !== undefined ? o.skin : skin;
    if (sk && sk !== 'none') drawSkin(ctx, r, sk);
    ctx.restore();
  }

  // ---------- Наряды птенцов (открываются за звёзды) ----------
  let skin = 'none';
  function setSkin(s) { skin = s || 'none'; }
  function drawSkin(ctx, r, sk) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(2, r * 0.09);
    if (sk === 'cap') {
      ctx.fillStyle = '#3D8BFD';
      ctx.beginPath(); ctx.arc(-r * 0.05, -r * 0.5, r * 0.68, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2A62C4'; ctx.beginPath(); ctx.ellipse(r * 0.78, -r * 0.52, r * 0.42, r * 0.1, 0.12, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; circle(ctx, -r * 0.05, -r * 1.16, r * 0.08); ctx.fill(); ctx.stroke();
    } else if (sk === 'glasses') {
      const ey = -r * 0.22;
      line(ctx, -r * 0.2, ey - r * 0.05, -r * 0.9, ey - r * 0.22);
      ctx.fillStyle = '#1B1B1B';
      rr(ctx, -r * 0.2, ey - r * 0.2, r * 0.5, r * 0.4, r * 0.1); ctx.fill(); ctx.stroke();
      rr(ctx, r * 0.36, ey - r * 0.2, r * 0.46, r * 0.4, r * 0.1); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
      line(ctx, -r * 0.1, ey - r * 0.09, r * 0.04, ey - r * 0.09); line(ctx, r * 0.46, ey - r * 0.09, r * 0.58, ey - r * 0.09);
      ctx.lineCap = 'butt';
    } else if (sk === 'bandana') {
      ctx.fillStyle = '#E8343A';
      ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.62); ctx.lineTo(-r * 1.32, -r * 0.88); ctx.lineTo(-r * 1.15, -r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.78, -r * 0.52); ctx.lineTo(-r * 1.36, -r * 0.4); ctx.lineTo(-r * 1.1, -r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); circle(ctx, 0, 0, r); ctx.clip();
      ctx.fillRect(-r, -r * 0.8, r * 2, r * 0.32);
      ctx.lineWidth = Math.max(1.5, r * 0.06); line(ctx, -r, -r * 0.48, r, -r * 0.48);
      ctx.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) { circle(ctx, i * r * 0.26, -r * 0.64, r * 0.05); ctx.fill(); }
      ctx.restore();
    } else if (sk === 'tophat') {
      ctx.fillStyle = '#2B2B33';
      rr(ctx, -r * 0.42, -r * 1.78, r * 0.84, r * 0.98, r * 0.06); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFC72C'; ctx.fillRect(-r * 0.4, -r * 1.14, r * 0.8, r * 0.17);
      ctx.fillStyle = '#2B2B33'; ctx.beginPath(); ctx.ellipse(0, -r * 0.84, r * 0.74, r * 0.14, 0, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (sk === 'scarf') {
      // вязаный полосатый шарф: петля вокруг шеи и развевающийся конец
      ctx.save(); circle(ctx, 0, 0, r + 2); ctx.clip();
      ctx.fillStyle = '#E8343A'; ctx.beginPath(); ctx.ellipse(-r * 0.05, r * 0.62, r * 1.05, r * 0.24, 0.08, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; for (let i = -3; i <= 3; i++) { ctx.fillRect(i * r * 0.3 - r * 0.06, r * 0.45, r * 0.12, r * 0.34); }
      ctx.restore();
      ctx.fillStyle = '#E8343A'; ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.6); ctx.quadraticCurveTo(-r * 1.1, r * 0.75, -r * 1.45, r * 0.5); ctx.lineTo(-r * 1.38, r * 0.85); ctx.quadraticCurveTo(-r * 1.0, r * 1.0, -r * 0.5, r * 0.82); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-r * 1.1, r * 0.66, r * 0.1, r * 0.24);
    } else if (sk === 'pilot') {
      // кожаный шлем лётчика и очки на лбу
      ctx.fillStyle = '#8A5A2B';
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.98, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-r * 0.62, r * 0.05, r * 0.2, r * 0.34, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,180,0.5)'; ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.75, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.fillStyle = '#5A3A1A'; rr(ctx, -r * 0.55, -r * 0.82, r * 1.2, r * 0.16, r * 0.06); ctx.fill(); ctx.stroke();
      for (const gx of [-r * 0.12, r * 0.42]) { ctx.fillStyle = '#BFE6FF'; circle(ctx, gx, -r * 0.74, r * 0.2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, gx - r * 0.06, -r * 0.8, r * 0.06); ctx.fill(); }
    } else if (sk === 'crown') {
      ctx.save(); ctx.translate(0, -r * 0.95);
      ctx.fillStyle = '#FFD21F'; ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.12); ctx.lineTo(-r * 0.58, -r * 0.4); ctx.lineTo(-r * 0.28, -r * 0.12); ctx.lineTo(0, -r * 0.52);
      ctx.lineTo(r * 0.28, -r * 0.12); ctx.lineTo(r * 0.58, -r * 0.4); ctx.lineTo(r * 0.5, r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E8343A'; circle(ctx, 0, -r * 0.05, r * 0.08); ctx.fill();
      ctx.fillStyle = '#3D8BFD'; circle(ctx, -r * 0.3, 0, r * 0.06); ctx.fill(); circle(ctx, r * 0.3, 0, r * 0.06); ctx.fill();
      ctx.restore();
    }
  }

  // ---------- Чувачки ----------
  const DUDE = {
    blue: { a: '#7CC0FF', b: '#2E78E0', belly: '#B8DDFF', dark: '#1D4F9C' },
    red:  { a: '#FF8C7A', b: '#DE3427', belly: '#FFC2B8', dark: '#8E1C14' },
    boss: { a: '#FF7A8A', b: '#B8203A', belly: '#FFC7CF', dark: '#6E1020' },
  };

  function dude(ctx, x, y, r, ang, type, o = {}) {
    const c = DUDE[type] || DUDE.blue, hp = o.hp == null ? 1 : o.hp;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (o.squash) ctx.scale(1 + o.squash, 1 - o.squash);
    ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(2.5, r * 0.11);

    // ножки
    ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.ellipse(-r * 0.4, r * 0.92, r * 0.28, r * 0.16, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(r * 0.4, r * 0.92, r * 0.28, r * 0.16, 0, 0, TAU); ctx.fill(); ctx.stroke();

    // причёска у синих
    if (type === 'blue') {
      ctx.fillStyle = c.dark; ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.85); ctx.lineTo(-r * 0.2, -r * 1.3); ctx.lineTo(0, -r * 0.92); ctx.lineTo(r * 0.15, -r * 1.38); ctx.lineTo(r * 0.3, -r * 0.88);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, c.a); g.addColorStop(1, c.b);
    ctx.fillStyle = g; circle(ctx, 0, 0, r); ctx.fill(); ctx.stroke();
    ctx.save(); circle(ctx, 0, 0, r - ctx.lineWidth / 2); ctx.clip();
    ctx.fillStyle = c.belly; ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.62, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.restore();
    sphereShade(ctx, r, lightAngle() - ang);

    // каска у красных
    if (type === 'red') {
      ctx.fillStyle = '#B9BEC7';
      ctx.beginPath(); ctx.arc(0, -r * 0.18, r * 0.98, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8B919B'; rr(ctx, -r * 1.02, -r * 0.42, r * 2.04, r * 0.2, r * 0.08); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E6E9EE'; circle(ctx, -r * 0.35, -r * 0.78, r * 0.08); ctx.fill(); circle(ctx, r * 0.35, -r * 0.78, r * 0.08); ctx.fill();
      if (hp < 0.55) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 1.12); ctx.lineTo(r * 0.25, -r * 0.85); ctx.lineTo(r * 0.12, -r * 0.65); ctx.stroke(); ctx.lineWidth = Math.max(2.5, r * 0.11); }
    }
    // корона у Короля (съезжает набок, когда ему плохо)
    if (type === 'boss') {
      ctx.save(); ctx.translate(0, -r * 0.92); if (hp < 0.5) ctx.rotate(-0.35);
      ctx.fillStyle = '#FFD21F'; ctx.lineWidth = Math.max(2.5, r * 0.08);
      ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.12); ctx.lineTo(-r * 0.62, -r * 0.42); ctx.lineTo(-r * 0.3, -r * 0.14);
      ctx.lineTo(0, -r * 0.55); ctx.lineTo(r * 0.3, -r * 0.14); ctx.lineTo(r * 0.62, -r * 0.42); ctx.lineTo(r * 0.55, r * 0.12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3D8BFD'; circle(ctx, 0, -r * 0.05, r * 0.09); ctx.fill();
      ctx.fillStyle = '#E8343A'; circle(ctx, -r * 0.32, 0, r * 0.07); ctx.fill(); circle(ctx, r * 0.32, 0, r * 0.07); ctx.fill();
      ctx.restore();
      ctx.lineWidth = Math.max(2.5, r * 0.11);
    }

    // глаза
    const ey = -r * 0.1, er = r * 0.27, la = (o.look || 0) - ang;
    const lx = Math.cos(la) * er * 0.38, ly = Math.sin(la) * er * 0.38;
    for (const s of [-1, 1]) {
      const ex = s * r * 0.34;
      const swollen = hp < 0.6 && s === -1;
      if (o.blink || (hp < 0.3 && s === 1)) {
        ctx.lineWidth = r * 0.09; ctx.beginPath(); ctx.moveTo(ex - er * 0.8, ey); ctx.lineTo(ex + er * 0.8, ey); ctx.stroke();
      } else {
        if (swollen) { ctx.fillStyle = 'rgba(110,40,150,0.55)'; circle(ctx, ex, ey, er * 1.3); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.lineWidth = r * 0.07; circle(ctx, ex, ey, er); ctx.fill(); ctx.stroke();
        ctx.fillStyle = OUT; circle(ctx, ex + lx, ey + ly, er * (swollen ? 0.3 : 0.45)); ctx.fill();
      }
    }
    // брови
    ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
    const scared = o.scared;
    ctx.beginPath();
    if (scared || hp < 0.6) { ctx.moveTo(-r * 0.6, -r * 0.42); ctx.lineTo(-r * 0.16, -r * 0.52); ctx.moveTo(r * 0.16, -r * 0.52); ctx.lineTo(r * 0.6, -r * 0.42); }
    else { ctx.moveTo(-r * 0.6, -r * 0.55); ctx.lineTo(-r * 0.14, -r * 0.38); ctx.moveTo(r * 0.14, -r * 0.38); ctx.lineTo(r * 0.6, -r * 0.55); }
    ctx.stroke(); ctx.lineCap = 'butt';
    // рот
    ctx.lineWidth = r * 0.08;
    if (scared || hp < 0.6) {
      ctx.fillStyle = '#5A1410'; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.17, r * 0.13, 0, 0, TAU); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-r * 0.38, r * 0.22); ctx.quadraticCurveTo(0, r * 0.62, r * 0.38, r * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, r * 0.25); ctx.lineTo(0, r * 0.4); ctx.stroke();
    }
    // усы у Короля
    if (type === 'boss') {
      ctx.fillStyle = c.dark; ctx.lineWidth = r * 0.05;
      for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, r * 0.18);
        ctx.quadraticCurveTo(sd * r * 0.3, r * 0.05, sd * r * 0.55, r * 0.25);
        ctx.quadraticCurveTo(sd * r * 0.3, r * 0.3, 0, r * 0.24); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // пластырь
    if (hp < 0.6) {
      ctx.save(); ctx.translate(r * 0.5, r * 0.28); ctx.rotate(0.6);
      ctx.fillStyle = '#F5D9A8'; ctx.lineWidth = 1.5;
      rr(ctx, -r * 0.28, -r * 0.08, r * 0.56, r * 0.16, 3); ctx.fill(); ctx.stroke();
      ctx.rotate(Math.PI / 2); rr(ctx, -r * 0.28, -r * 0.08, r * 0.56, r * 0.16, 3); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // звёздочки над головой (оглушён)
    if (hp < 0.35) {
      const t = o.time || 0;
      ctx.fillStyle = '#FFE14D'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i * TAU) / 3;
        star(ctx, x + Math.cos(a) * r * 0.9, y - r * 1.35 + Math.sin(a) * r * 0.25, r * 0.18);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  // ---------- Рогатка ----------
  const SX = C.SLING_X, SY = C.SLING_Y;
  const BACK_TIP = { x: SX + 27, y: SY - 16 }, FRONT_TIP = { x: SX - 26, y: SY - 12 };

  function slingBack(ctx, pouch, wob, t) {
    ctx.lineCap = 'round';
    // ствол
    ctx.strokeStyle = OUT; ctx.lineWidth = 26; line(ctx, SX, C.GROUND_Y + 5, SX, SY + 60);
    ctx.strokeStyle = '#9B6230'; ctx.lineWidth = 18; line(ctx, SX, C.GROUND_Y + 5, SX, SY + 60);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 4; line(ctx, SX - 4, C.GROUND_Y - 6, SX - 4, SY + 74);
    ctx.strokeStyle = 'rgba(60,30,5,0.25)'; ctx.lineWidth = 5; line(ctx, SX + 5, C.GROUND_Y - 6, SX + 5, SY + 74);
    // задний рог
    ctx.strokeStyle = OUT; ctx.lineWidth = 22; line(ctx, SX, SY + 62, BACK_TIP.x, BACK_TIP.y);
    ctx.strokeStyle = '#8F5A2A'; ctx.lineWidth = 14; line(ctx, SX, SY + 62, BACK_TIP.x, BACK_TIP.y);
    // задняя резинка
    ctx.strokeStyle = '#4A220A'; ctx.lineWidth = 9;
    if (!pouch && wob > 0.02) {
      // резинка дрожит после выстрела
      const mx = (BACK_TIP.x + FRONT_TIP.x) / 2 + Math.sin(t * 70) * 26 * wob, my = (BACK_TIP.y + FRONT_TIP.y) / 2 + Math.cos(t * 70) * 8 * wob;
      ctx.beginPath(); ctx.moveTo(BACK_TIP.x, BACK_TIP.y); ctx.quadraticCurveTo(mx, my, FRONT_TIP.x, FRONT_TIP.y); ctx.stroke();
    } else line(ctx, BACK_TIP.x, BACK_TIP.y, pouch ? pouch.x : FRONT_TIP.x, pouch ? pouch.y : FRONT_TIP.y);
    ctx.lineCap = 'butt';
  }
  function slingFront(ctx, pouch, r) {
    ctx.lineCap = 'round';
    if (pouch) {
      ctx.strokeStyle = '#4A220A'; ctx.lineWidth = 9; line(ctx, FRONT_TIP.x, FRONT_TIP.y, pouch.x, pouch.y);
      // кожаная «люлька»
      // в покое накладка — позади птенца (слева), при натяжении — с дальней от рогатки стороны
      const a = Math.hypot(pouch.x - SX, pouch.y - SY) < 6 ? Math.PI : Math.atan2(pouch.y - SY, pouch.x - SX);
      ctx.save(); ctx.translate(pouch.x, pouch.y); ctx.rotate(a);
      ctx.fillStyle = '#5A2D0C'; rr(ctx, (r || 26) * 0.3, -(r || 26) * 0.75, 14, (r || 26) * 1.5, 6); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = OUT; ctx.lineWidth = 24; line(ctx, SX, SY + 62, FRONT_TIP.x, FRONT_TIP.y);
    ctx.strokeStyle = '#C98A48'; ctx.lineWidth = 16; line(ctx, SX, SY + 62, FRONT_TIP.x, FRONT_TIP.y);
    ctx.strokeStyle = '#E0A86A'; ctx.lineWidth = 5; line(ctx, SX - 3, SY + 50, FRONT_TIP.x + 3, FRONT_TIP.y + 10);
    ctx.lineCap = 'butt';
  }
  function line(ctx, a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }

  // ---------- Траектория ----------
  function dots(ctx, pts, color, max) {
    ctx.fillStyle = color;
    const n = Math.min(pts.length, max || pts.length);
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = max ? 1 - i / n : 0.8;
      circle(ctx, pts[i].x, pts[i].y, max ? 7 - (i / n) * 4 : 4); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Частицы ----------
  const MAT_COLORS = {
    wood: ['#D9A04E', '#B07432', '#8A5524'], glass: ['#CFF0FF', '#9FD6F0', '#FFFFFF'], stone: ['#A9A49B', '#7F7A72', '#C4C0B8'],
    tnt: ['#E2402B', '#7A4A1C', '#FFE14D'],
  };

  function particles(ctx, list) {
    // два прохода: надписи и комикс-«звёздочки» рисуются поверх дыма и обломков
    for (let pass = 0; pass < 2; pass++) for (const p of list) {
      if ((p.kind === 'text' || p.kind === 'comic') !== (pass === 1)) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 2);
      if (p.kind === 'chunk') {
        const z = p.s;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.strokeStyle = 'rgba(43,29,14,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (p.m === 'glass') {            // осколок
          ctx.moveTo(-z * 0.7, z * 0.45); ctx.lineTo(z * 0.8, z * 0.2); ctx.lineTo(-z * 0.1, -z * 0.8);
          ctx.globalAlpha *= 0.85; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        } else if (p.m === 'wood') {      // щепка
          ctx.moveTo(-z, -z * 0.16); ctx.lineTo(z * 0.7, -z * 0.2); ctx.lineTo(z, z * 0.05); ctx.lineTo(z * 0.6, z * 0.2); ctx.lineTo(-z * 0.8, z * 0.18);
        } else if (p.m === 'stone') {     // обломок
          ctx.moveTo(-z * 0.55, -z * 0.2); ctx.lineTo(-z * 0.1, -z * 0.55); ctx.lineTo(z * 0.5, -z * 0.3); ctx.lineTo(z * 0.55, z * 0.3); ctx.lineTo(-z * 0.2, z * 0.5);
        } else ctx.rect(-z / 2, -z / 3, z, z * 0.66);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      } else if (p.kind === 'hat') {
        // слетевшая каска или корона
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        const z = p.s;
        if (p.t === 'boss') {
          ctx.fillStyle = '#FFD21F'; ctx.beginPath();
          ctx.moveTo(-z * 0.55, z * 0.3); ctx.lineTo(-z * 0.62, -z * 0.3); ctx.lineTo(-z * 0.3, 0); ctx.lineTo(0, -z * 0.45); ctx.lineTo(z * 0.3, 0); ctx.lineTo(z * 0.62, -z * 0.3); ctx.lineTo(z * 0.55, z * 0.3);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
          ctx.fillStyle = '#B9BEC7'; ctx.beginPath(); ctx.arc(0, 0, z, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#8B919B'; rr(ctx, -z * 1.05, -z * 0.1, z * 2.1, z * 0.22, 3); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      } else if (p.kind === 'glow') {
        // вспышка света (сложение цветов)
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
        g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,160,40,0)');
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.fillStyle = g; circle(ctx, p.x, p.y, p.s); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.kind === 'feather') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.35, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (p.kind === 'puff') {
        ctx.fillStyle = p.color; circle(ctx, p.x, p.y, p.s * (1.6 - k * 0.6)); ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.fillStyle = p.color; star(ctx, p.x, p.y, p.s); ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 14 * k; circle(ctx, p.x, p.y, p.s * (1 - k) + 20); ctx.stroke();
      } else if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x + Math.sin(p.rot * 0.7) * 6, p.y); ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.3)); ctx.fillStyle = p.color; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      } else if (p.kind === 'comic') {
        // комикс-надпись в колючей «звёздочке»
        const pop = Math.min(1, (1 - k) * 7);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(pop, pop);
        ctx.fillStyle = p.color; ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < 22; i++) { const a = (i * TAU) / 22, rad = i % 2 ? p.s * 0.66 : p.s; ctx.lineTo(Math.cos(a) * rad * 1.3, Math.sin(a) * rad * 0.82); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.font = `900 ${Math.round(p.s * 0.5)}px "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 7; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(p.text, 0, 2);
        ctx.fillStyle = OUT; ctx.fillText(p.text, 0, 2);
        ctx.restore();
      } else if (p.kind === 'text') {
        // цифры очков «выпрыгивают» и оседают
        const pop = 1 + 0.45 * Math.max(0, (k - 0.78) / 0.22);
        ctx.font = `900 ${Math.round(p.s * pop)}px "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Облачко с репликой над врагом
  function bubble(ctx, x, y, text, k) {
    const s = 0.6 + 0.4 * Math.min(1, k * 4);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.font = '900 26px "Trebuchet MS", system-ui, sans-serif';
    const w = ctx.measureText(text).width + 30, h = 42;
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    rr(ctx, -w / 2, -h - 14, w, h, 16); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(0, 0); ctx.lineTo(10, -16); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(0, 0); ctx.lineTo(10, -14); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-12, -20, 24, 8);
    ctx.fillStyle = OUT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, -h / 2 - 14);
    ctx.restore();
  }

  // ---------- Бустеры и Царь-Бомба ----------
  function aura(ctx, x, y, r, t) {
    const k = 1 + Math.sin(t * 8) * 0.08;
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.7 * k);
    g.addColorStop(0, 'rgba(255,90,30,0.55)'); g.addColorStop(1, 'rgba(255,200,40,0)');
    ctx.fillStyle = g; circle(ctx, x, y, r * 1.7 * k); ctx.fill();
  }



  function nukeTarget(ctx, x, y, R, t, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    const pulse = 0.5 + Math.sin(t * 6) * 0.5;
    ctx.strokeStyle = `rgba(255,60,30,${0.35 + pulse * 0.3})`; ctx.lineWidth = 6; ctx.setLineDash([22, 16]);
    circle(ctx, x, y, R); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,80,30,0.10)'; circle(ctx, x, y, R); ctx.fill();
    ctx.strokeStyle = 'rgba(255,40,20,0.9)'; ctx.lineWidth = 5;
    circle(ctx, x, y, 34 + pulse * 6); ctx.stroke();
    line(ctx, x - 60, y, x - 18, y); line(ctx, x + 18, y, x + 60, y); line(ctx, x, y - 60, x, y - 18); line(ctx, x, y + 18, x, y + 60);
    ctx.restore();
  }

  // Царь-Бомба: круглая мультяшная бомба с короной и искрящим фитилём
  function nukeBomb(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 9) * 0.06);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // полосы скорости
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
    for (const dx of [-30, 0, 30]) line(ctx, dx, -120, dx, -210 - Math.abs(dx) * 2);
    // фитиль
    ctx.strokeStyle = '#8A5A2B'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(30, -48); ctx.quadraticCurveTo(52, -78, 44, -96); ctx.stroke();
    const fl = 1 + Math.sin(t * 40) * 0.25;
    ctx.fillStyle = '#FFF3A0'; circle(ctx, 44, -98, 9 * fl); ctx.fill();
    ctx.fillStyle = '#FF9A1F'; circle(ctx, 44, -98, 5 * fl); ctx.fill();
    // корпус
    const g = ctx.createRadialGradient(-20, -22, 6, 0, 0, 70);
    g.addColorStop(0, '#6B5BA8'); g.addColorStop(0.5, '#3A2F66'); g.addColorStop(1, '#1E1838');
    ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 5;
    circle(ctx, 0, 0, 60); ctx.fill(); ctx.stroke();
    // горловина под фитиль
    ctx.fillStyle = '#C9A13A'; ctx.save(); ctx.translate(26, -48); ctx.rotate(0.5);
    ctx.fillRect(-12, -9, 24, 16); ctx.strokeRect(-12, -9, 24, 16); ctx.restore();
    // блик
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-24, -26, 16, 9, -0.6, 0, TAU); ctx.fill();
    // золотой пояс со звездой
    ctx.save(); circle(ctx, 0, 0, 58); ctx.clip();
    ctx.fillStyle = '#FFC72C'; ctx.fillRect(-62, 8, 124, 16); ctx.restore();
    ctx.fillStyle = '#FFF1A8'; star(ctx, 0, 16, 12); ctx.fill(); ctx.stroke();
    // корона
    ctx.fillStyle = '#FFD21F'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-30, -50); ctx.lineTo(-34, -84); ctx.lineTo(-16, -66); ctx.lineTo(0, -92); ctx.lineTo(16, -66); ctx.lineTo(30, -84); ctx.lineTo(26, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF4D6D'; circle(ctx, 0, -62, 5); ctx.fill();
    ctx.fillStyle = '#4DC3FF'; circle(ctx, -18, -58, 4); ctx.fill(); circle(ctx, 16, -58, 4); ctx.fill();
    ctx.restore();
  }




  root.YB = Object.assign(root.YB || {}, {
    Render: { sunPos, lighting, grade, foreground, setBgScale, setDetail, groundFx, setSkin, ambient, decals, bubble, blockSides, background, statics, block, setTheme, surfaceY, chick, dude, slingBack, slingFront, dots, particles, star, rr, aura, nukeTarget, nukeBomb, MAT_COLORS, CHICK, OUT },
  });
})(window);
