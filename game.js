/* YooBird — игровой цикл, управление, логика уровня. */
(function (root) {
  'use strict';
  const { Sim, C, BIRDS, LEVELS, Render: R, Audio: A } = root.YB;
  const DT = 1 / 60;
  const SX = C.SLING_X, SY = C.SLING_Y;
  const rand = (a, b) => a + Math.random() * (b - a);
  const MOOD_BY_THEME = { noon: 'day', sunset: 'sunset', dusk: 'night', night: 'night', winter: 'winter', volcano: 'volcano' };

  const Game = {
    canvas: null, ctx: null, dpr: 1, view: null,
    state: 'menu',            // menu | play | win | lose
    paused: false,            // пауза игрока
    extPause: new Set(),      // внешние причины: реклама, скрытая вкладка, портрет
    time: 0, acc: 0, last: 0,
    sim: null, levelIdx: 0, def: null,
    queue: [], ready: null, phase: 'idle', hopT: 0, nextT: 0,
    drag: null, shots: 0, bonus: 0, ending: false, endT: 0, bonusList: [], waitT: 0,
    adBirds: 0, hintsShown: new Set(),
    boosters: { sight: 1, power: 1, quake: 1 }, active: { sight: false, power: false },
    nuke: { used: false, mode: null, t: 0, x: 0, y: 0 }, timeScale: 1, flash: 0, pointer: { x: 960, y: 600 },
    parts: [], shake: 0, flyTrail: [], birdSquash: 0, kills: 0, taunt: null,
    decals: [], wob: 0, finale: 0, zoom: { k: 0, x: 960, y: 700 }, chirpT: 5,
    hitStop: 0, introT: 0, lowFx: false, slowT: 0, used: {}, bestCombo: 0, comicT: 0, leftCount: 0,
    ui: null, save: null,

    init(canvas, ui) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.ui = ui;
      this.resize();
      root.addEventListener('resize', () => this.resize());
      root.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
      canvas.addEventListener('pointerdown', (e) => this.onDown(e));
      root.addEventListener('pointermove', (e) => { if (this.view) this.pointer = this.toWorld(e); this.onMove(e); });
      root.addEventListener('pointerup', (e) => this.onUp(e));
      root.addEventListener('pointercancel', (e) => this.onUp(e, true));
      root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.state === 'play') this.ui.togglePause(); });
      requestAnimationFrame((t) => this.frame(t));
    },

    // Игра всегда горизонтальная. Если телефон держат вертикально (в приложении ВКонтакте
    // или в браузере, в том числе с выключенным автоповоротом), вся игра поворачивается на 90°
    // по часовой стрелке: игрок просто поворачивает телефон, и картинка встаёт правильно.
    // Вырез экрана и полоска «домой» в вертикальном положении сверху и снизу — их обходим.
    layout() {
      const W = root.innerWidth, H = root.innerHeight, app = document.getElementById('app');
      const coarse = root.matchMedia && root.matchMedia('(pointer: coarse)').matches;
      const rot = coarse && H > W * 1.05;
      const de = document.documentElement.style;
      if (rot) {
        const ins = this.safeInsets();
        const w = H - ins.top - ins.bottom, h = W;
        app.classList.add('rotated');
        app.style.width = w + 'px'; app.style.height = h + 'px';
        app.style.transform = `translate(${W}px, ${ins.top}px) rotate(90deg)`;
        this.rot = { W, top: ins.top };
        de.setProperty('--vw', w / 100 + 'px'); de.setProperty('--vh', h / 100 + 'px');
        return { w, h };
      }
      app.classList.remove('rotated'); app.style.width = ''; app.style.height = ''; app.style.transform = '';
      this.rot = null;
      de.removeProperty('--vw'); de.removeProperty('--vh');
      return { w: W, h: H };
    },
    safeInsets() {
      if (!this._probe) {
        const d = this._probe = document.createElement('div');
        d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
        document.body.appendChild(d);
      }
      const cs = getComputedStyle(this._probe);
      return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
    },

    resize() {
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const { w, h } = this.layout();
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      const cw = this.canvas.width, ch = this.canvas.height;
      // Камера кадрирует игровую зону (y 240..1040), лишнее небо и земля обрезаются на широких экранах.
      const FY0 = 240, FH = 800;
      const s = Math.min(cw / C.W, ch / FH);
      const ox = (cw - C.W * s) / 2, oy = (ch - FH * s) * 0.85 - FY0 * s; // лишнее место по высоте — в основном небу
      this.view = { s, ox, oy, x0: -ox / s, x1: (cw - ox) / s, y0: -oy / s, y1: (ch - oy) / s };
      R.setBgScale(s);
    },

    toWorld(e) {
      const v = this.view;
      // при повёрнутой игре экранные координаты переводим в координаты игры
      const cx = this.rot ? e.clientY - this.rot.top : e.clientX, cy = this.rot ? this.rot.W - e.clientX : e.clientY;
      return { x: (cx * this.dpr - v.ox) / v.s, y: (cy * this.dpr - v.oy) / v.s };
    },

    running() { return this.state === 'play' && !this.paused && this.extPause.size === 0; },

    // ---------- Уровень ----------
    startLevel(i) {
      this.levelIdx = i; this.def = LEVELS[i];
      R.setTheme(this.def.theme || 'noon');
      this.flyTrail = []; this.birdSquash = 0; this.kills = 0; this.taunt = null;
      this.decals = []; this.wob = 0; this.finale = 0; this.chirpT = 4;
      A.setMood(this.def.mood || MOOD_BY_THEME[this.def.theme] || 'day');
      A.play('whoosh');
      this.sim = new Sim(this.handlers());
      this.sim.load(this.def);
      this.queue = this.def.birds.slice();
      this.ready = null; this.phase = 'idle'; this.nextT = 1.35;
      this.hitStop = 0; this.used = { booster: false, nuke: false, ad: false }; this.bestCombo = 0; this.comicT = 0; this.leftCount = 0;
      // Заставка: камера показывает крепость чувачков и отъезжает к рогатке
      { const es = this.sim.enemies; let ex = 0, ey = 0; es.forEach((e) => { ex += e.position.x; ey += e.position.y; });
        this.zoom = { k: 1, x: ex / es.length, y: ey / es.length - 30, amt: 0.5 }; this.introT = 1.5; }
      this.ui.setEnemies(this.sim.enemies.length);
      this.drag = null; this.shots = 0; this.bonus = 0;
      this.ending = false; this.endT = 0; this.bonusList = []; this.waitT = 0;
      this.adBirds = 0; this.hintsShown = new Set();
      this.boosters = { sight: 1, power: 1, quake: 1 }; this.active = { sight: false, power: false };
      this.nuke = { used: false, mode: null, t: 0, x: 0, y: 0 }; this.setTimeScale(1); this.flash = 0;
      this.parts = []; this.shake = 0; this.acc = 0;
      this.ui.refreshBoosters();
      this.state = 'play'; this.paused = false;
      this.ui.setScore(0);
      root.YB.Platform.gameplayStart();
      this.hintT = this.def.startHint ? 2.7 : 0;   // подсказка появляется после заставки
    },

    showHint(key) {
      if (this.hintsShown.has(key)) return;
      this.hintsShown.add(key); this.ui.toast(key);
    },

    totalScore() { return (this.sim ? this.sim.score : 0) + this.bonus; },

    loadNext() {
      if (!this.queue.length) return;
      this.ready = this.queue.shift();
      this.phase = 'hop'; this.hopT = 0;
      this.ui.refreshBoosters();
      A.play('hop', { x: SX });
      if (this.ready === 'speed') this.showHint('hintSpeed');
      if (this.ready === 'bomb') this.showHint('hintBomb');
      if (this.ready === 'split') this.showHint('hintSplit');
      if (this.ready === 'heavy') this.showHint('hintHeavy');
      if (this.ready === 'boomer') this.showHint('hintBoomer');
      if (this.ready === 'puff') this.showHint('hintPuff');
    },

    addExtraBird() {
      this.queue.push('normal');
      this.adBirds++; this.used.ad = true;
      this.state = 'play'; this.waitT = 0; this.phase = 'idle'; this.nextT = 0.3;
      root.YB.Platform.gameplayStart();
      this.ui.toast('extraBird');
    },

    // ---------- Бустеры (по одному бесплатному на попытку) ----------
    canUseBooster(b) {
      if (!this.running() || this.ending || this.nuke.mode || !this.boosters[b]) return false;
      if (b === 'sight' || b === 'power') return !!this.ready && !this.active[b];
      return true;
    },
    useBooster(b) {
      if (!this.canUseBooster(b)) return false;
      this.boosters[b]--; this.used.booster = true;
      if (b === 'quake') { this.sim.quake(); this.shake = 22; }
      else { this.active[b] = true; A.play(b === 'sight' ? 'sight' : 'powerUp'); }
      this.ui.refreshBoosters();
      return true;
    },

    // ---------- Ядерка (за рекламу, одна на попытку) ----------
    canNuke() { return this.running() && !this.ending && !this.nuke.used && !this.nuke.mode && this.sim.enemiesAlive() > 0; },
    // Награда за рекламу: Царь-Бомба выдаётся в любом случае и ждёт, пока игра снова пойдёт.
    grantNuke() {
      this.nuke.used = true; this.nuke.pending = true;
      this.ui.refreshBoosters();
      this.tryPendingNuke();
    },
    tryPendingNuke() {
      const n = this.nuke;
      if (!n.pending || !this.running() || n.mode) return;
      n.pending = false;
      if (this.ending || this.sim.enemiesAlive() === 0) return;
      this.startNukeAim();
    },
    startNukeAim() {
      this.nuke.used = true; this.nuke.mode = 'aim'; this.drag = null; this.used.nuke = true;
      this.save.stats.nukes = (this.save.stats.nukes || 0) + 1; this.ui.unlock('nuke');
      this.ui.toast('nukeAim');
      this.ui.refreshBoosters();
    },
    dropNuke(x, y) {
      const n = this.nuke;
      n.mode = 'fall'; n.t = 0;
      this.ui.hideToast();
      n.x = Math.max(700, Math.min(1880, x));
      n.y = Math.max(380, Math.min(C.GROUND_Y - 30, y));
      this.setTimeScale(0.35);
      A.play('nukeFall', { gap: 0 });
      A.duck(5);
    },
    setTimeScale(ts) { this.timeScale = ts; if (this.sim) this.sim.setTimeScale(ts); },
    updateNuke(dt) {
      const n = this.nuke;
      if (n.mode === 'fall') {
        n.t += dt;
        if (n.t >= 1.5) {
          n.mode = 'boom'; n.t = 0;
          this.sim.nuke(n.x, n.y);
          this.setTimeScale(0.15);
        }
      } else if (n.mode === 'boom') {
        n.t += dt;
        // через 0.7 с время плавно возвращается к норме
        const k = Math.max(0, Math.min(1, (n.t - 0.7) / 1.6));
        this.setTimeScale(0.15 + 0.85 * k * k);
        if (k >= 1) { n.mode = null; this.setTimeScale(1); this.ui.refreshBoosters(); }
      }
      this.flash = Math.max(0, this.flash - dt * 0.9);
    },

    // ---------- Ввод ----------
    // Браузер на Android (вне ВКонтакте): по первому касанию разворачиваем игру на весь экран
    // и закрепляем горизонтальную ориентацию системно. Где так нельзя (iPhone, приложение ВК),
    // работает поворот из layout().
    lockLandscape() {
      if (this._lockTried) return; this._lockTried = true;
      try {
        const P = root.YB.Platform, el = document.documentElement, so = root.screen && root.screen.orientation;
        if (P.isVK || !this.rot || !so || !so.lock || !el.requestFullscreen || !document.fullscreenEnabled) return;
        el.requestFullscreen({ navigationUI: 'hide' }).then(() => so.lock('landscape')).catch(() => {});
      } catch (er) {}
    },

    onDown(e) {
      A.unlock();
      if (!this.running()) return;
      const p = this.toWorld(e);
      this.pointer = p;
      if (this.nuke.mode === 'aim') { this.dropNuke(p.x, p.y); return; }
      if (this.nuke.mode) return;
      if (this.phase === 'ready' && Math.hypot(p.x - SX, p.y - SY) < 130) {
        this.drag = { id: e.pointerId, dx: 0, dy: 0, lastL: 0 };
        A.play('grab', { x: SX });
        try { this.canvas.setPointerCapture(e.pointerId); } catch (er) {}
        this.onMove(e);
      } else if (this.phase === 'flying' && this.sim.bird && !this.sim.bird.game.used) {
        this.sim.ability();
      }
    },
    onMove(e) {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const p = this.toWorld(e);
      let dx = p.x - SX, dy = p.y - SY;
      const len = Math.hypot(dx, dy);
      if (len > C.MAX_PULL) { dx *= C.MAX_PULL / len; dy *= C.MAX_PULL / len; }
      this.drag.dx = dx; this.drag.dy = dy;
      const L = Math.min(len, C.MAX_PULL);
      if (Math.abs(L - this.drag.lastL) > 9) { this.drag.lastL = L; A.play('stretch', { v: L / C.MAX_PULL, gap: 0.035, x: SX }); }
    },
    onUp(e, cancel) {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const { dx, dy } = this.drag; this.drag = null;
      if (cancel || !this.running() || Math.hypot(dx, dy) < 25) return;
      this.launch(dx, dy);
    },

    launchVel(dx, dy) { return { x: (-dx / C.MAX_PULL) * C.MAX_SPEED, y: (-dy / C.MAX_PULL) * C.MAX_SPEED }; },

    launch(dx, dy) {
      const v = this.launchVel(dx, dy);
      this.sim.launch(this.ready, SX + dx, SY + dy, v.x, v.y, { power: this.active.power });
      this.ready = null; this.phase = 'flying'; this.shots++; this.shotAbility = null;
      this.active = { sight: false, power: false };
      this.kills = 0; this.flyTrail = []; this.taunt = null; this.wob = 1;
      this.haptic('light');
      A.play('launch', { x: SX });
      this.ui.refreshBoosters();
    },

    // ---------- Логика ----------
    flow(dt) {
      const sim = this.sim;
      if (this.phase === 'hop') { this.hopT += dt / 0.45; if (this.hopT >= 1) { this.hopT = 1; this.phase = 'ready'; this.ui.refreshBoosters(); } }
      if (this.phase === 'flying' && !sim.flying()) { this.phase = 'idle'; this.nextT = 0.35; this.maybeTaunt(); }

      if (!this.ending && sim.enemiesAlive() === 0) {
        this.ending = true; this.endT = 0;
        this.drag = null;
        this.bonusList = [];
        if (this.ready) this.bonusList.push({ type: this.ready, x: SX, y: SY });
        this.queue.forEach((t, i) => this.bonusList.push({ type: t, ...this.queuePos(i) }));
        this.ready = null; this.queue = [];
        this.leftCount = this.bonusList.length;
        if (this.phase !== 'flying') this.phase = 'idle';
      }

      if (this.ending) {
        this.endT += dt;
        if (this.nuke.mode) return;
        if (this.endT > 1.3 && this.bonusList.length) {
          if (!this.bonusTick || this.endT - this.bonusTick > 0.4) {
            this.bonusTick = this.endT;
            const b = this.bonusList.shift();
            this.bonus += C.BIRD_BONUS;
            this.ui.setScore(this.totalScore());
            A.play('bonus');
            this.popup('+' + C.BIRD_BONUS, b.x, b.y - 50, '#FFE14D', 46);
            for (let i = 0; i < 8; i++) this.part({ kind: 'spark', x: b.x, y: b.y, vx: rand(-200, 200), vy: rand(-400, -100), g: 600, s: rand(8, 14), color: '#FFE14D', life: 0.8 });
          }
        } else if (this.endT > 1.3 && !this.bonusList.length && this.endT - (this.bonusTick || 0) > 0.9) {
          this.bonusTick = 0;
          this.finishWin();
        }
        return;
      }

      if (this.nuke.mode) return;
      if (this.phase === 'idle') {
        if (this.queue.length) {
          this.nextT -= dt;
          if (this.nextT <= 0) this.loadNext();
        } else {
          this.waitT += dt;
          if ((sim.isQuiet() && this.waitT > 1.2) || this.waitT > 5) this.finishLose();
        }
      }
    },

    // Промах (птенец никого не убил): кто-то из чувачков дразнится
    maybeTaunt() {
      const sim = this.sim;
      if (this.kills > 0 || !sim.enemies.length || this.ending || this.nuke.mode) return;
      const e = sim.enemies[(this.shots * 7) % sim.enemies.length];
      this.taunt = { body: e, t: 1.7, text: root.YB.I18n.t('taunt' + (1 + (this.shots % 4))) };
      setTimeout(() => A.play('taunt', { t: e.game.t }), 200);
    },

    finishWin() {
      this.state = 'win';
      root.YB.Platform.gameplayStop();
      const score = this.totalScore(), st = this.def.stars;
      const stars = score >= st[2] ? 3 : score >= st[1] ? 2 : 1;
      const s = this.save, i = this.levelIdx;
      const newRecord = score > (s.best[i] || 0);
      s.best[i] = Math.max(s.best[i] || 0, score);
      // Первые три звезды на уровне — Царь-Бомба в запас (до 3 штук). Получить её можно и без рекламы.
      const nukeEarned = stars === 3 && (s.stars[i] || 0) < 3 && (s.nukes || 0) < 3;
      if (nukeEarned) s.nukes = (s.nukes || 0) + 1;
      s.stars[i] = Math.max(s.stars[i] || 0, stars);
      s.unlocked = Math.max(s.unlocked, Math.min(LEVELS.length, i + 2));
      this.ui.persist();
      A.play('win');
      this.confetti();
      this.ui.showWin({ score, stars, best: s.best[i], newRecord, hasNext: i + 1 < LEVELS.length, level: i,
        shots: this.shots, combo: this.bestCombo, left: this.leftCount, used: this.used, nukeEarned, need: stars < 3 ? st[stars] - score : 0 });
    },

    finishLose() {
      this.state = 'lose';
      root.YB.Platform.gameplayStop();
      A.play('lose');
      this.ui.persist();
      this.ui.showLose({ adLeft: 2 - this.adBirds, score: this.totalScore(), left: this.sim.enemiesAlive() });
    },

    queuePos(i) {
      const r = BIRDS[this.queue[i] || 'normal'].r;
      return { x: SX - 78 - i * 47, y: C.GROUND_Y - r };
    },

    // ---------- Эффекты ----------
    part(p) { p.max = p.life; p.rot = p.rot || rand(0, 6.28); p.vr = p.vr == null ? rand(-8, 8) : p.vr; this.parts.push(p); if (this.parts.length > (this.lowFx ? 160 : 400)) this.parts.shift(); },
    popup(text, x, y, color, size) { this.part({ kind: 'text', text, x, y, vx: 0, vy: -70, g: 0, s: size || 34, color: color || '#fff', life: 1.1, vr: 0 }); },

    handlers() {
      const G = this;
      return {
        hit(d) {
          A.play(d.m + 'Hit', { v: d.v, gap: 0.06, x: d.x });
          if (d.v > 0.4) for (let i = 0; i < 2; i++) G.chunk(d.m, d.x, d.y, 0.6);
          if (d.y > C.GROUND_Y - 25 && d.v > 0.25) G.dust(d.x, C.GROUND_Y - 4, 4);
        },
        break(d) {
          A.play(d.m + 'Break', { gap: 0.03, x: d.x });
          const n = Math.max(6, Math.min(18, Math.round((d.w * d.h) / 250)));
          for (let i = 0; i < n; i++) {
            const t = rand(-0.5, 0.5), along = Math.max(d.w, d.h) * t;
            const horiz = d.w >= d.h;
            const lx = horiz ? along : 0, ly = horiz ? 0 : along;
            const x = d.x + lx * Math.cos(d.angle) - ly * Math.sin(d.angle), y = d.y + lx * Math.sin(d.angle) + ly * Math.cos(d.angle);
            G.chunk(d.m, x, y, 1);
          }
          G.part({ kind: 'puff', x: d.x, y: d.y, vx: 0, vy: -20, g: 0, s: 22, color: 'rgba(255,255,255,0.55)', life: 0.5 });
          G.shake = Math.max(G.shake, d.m === 'stone' ? 6 : 3);
        },
        enemyHurt(d) { A.play('enemyHurt', { t: d.t, gap: 0.15, x: d.x }); },
        enemyDie(d) {
          G.kills++; G.bestCombo = Math.max(G.bestCombo, G.kills);
          G.save.stats.kills = (G.save.stats.kills || 0) + 1;
          G.ui.setEnemies(G.sim.enemies.filter((e) => !e.game.dead).length);
          if (G.kills >= 3) G.ui.unlock('combo3');
          if (G.kills >= 5) G.ui.unlock('combo5');
          if (d.t === 'boss') G.ui.unlock('king');
          // достижения новых птенцов: считаем выбывших за выстрел после способности
          if (G.shotAbility === 'heavy' && G.kills >= 2) G.ui.unlock('slam2');
          if (G.shotAbility === 'boomer') G.ui.unlock('boomer');
          if (G.shotAbility === 'puff' && G.kills >= 3) G.ui.unlock('puff3');
          if (!G.nuke.mode) G.hitStop = Math.max(G.hitStop, 0.06);
          G.haptic('medium');
          if (G.taunt) G.taunt = null;
          A.play('enemyDie', { t: d.t, gap: 0.05, x: d.x });
          // Комбо: несколько чувачков одним птенцом
          if (G.kills >= 2) {
            const pts = 1000 * (G.kills - 1);
            G.bonus += pts; G.ui.setScore(G.totalScore());
            G.popup('x' + G.kills + '!  +' + pts, d.x, d.y - 95, '#FF8A00', 44);
            setTimeout(() => A.play('combo', { i: G.kills, gap: 0 }), 120);
          }
          // Каска или корона слетает
          if (d.t !== 'blue') G.part({ kind: 'hat', t: d.t, x: d.x, y: d.y - d.r * 0.7, vx: rand(-160, 160), vy: rand(-620, -460), g: 1100, s: d.r * (d.t === 'boss' ? 0.9 : 0.75), life: 1.8, vr: rand(-9, 9) });
          G.part({ kind: 'glow', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.r * 3.2, color: 'rgba(255,255,220,0.8)', life: 0.3, vr: 0 });
          // «Пуф!» — чувачок исчезает в облачке со звёздочками (мультяшно, без натурализма)
          for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; G.part({ kind: 'puff', x: d.x + Math.cos(a) * d.r * 0.6, y: d.y + Math.sin(a) * d.r * 0.5, vx: Math.cos(a) * 70, vy: Math.sin(a) * 50 - 30, g: 0, s: d.r * 0.55, color: 'rgba(255,255,255,0.85)', life: 0.55 }); }
          for (let i = 0; i < 4; i++) G.part({ kind: 'spark', x: d.x, y: d.y - d.r * 0.4, vx: rand(-220, 220), vy: rand(-420, -220), g: 900, s: rand(9, 14), color: '#FFE14D', life: 0.8 });
          // Последний враг: замедление и приближение
          if (!G.sim.enemies.some((e) => !e.game.dead) && !G.nuke.mode) { G.finale = 1.0; G.zoom.x = d.x; G.zoom.y = d.y; G.zoom.amt = 0.22; }
          const col = d.t === 'blue' ? 'rgba(70,150,250,0.75)' : 'rgba(240,80,60,0.75)';
          for (let i = 0; i < 10; i++) G.part({ kind: 'puff', x: d.x + rand(-15, 15), y: d.y + rand(-15, 15), vx: rand(-160, 160), vy: rand(-200, 40), g: -40, s: rand(12, 22), color: i % 2 ? col : 'rgba(255,255,255,0.85)', life: rand(0.4, 0.8) });
          for (let i = 0; i < 6; i++) G.part({ kind: 'spark', x: d.x, y: d.y, vx: rand(-300, 300), vy: rand(-380, -60), g: 700, s: rand(7, 12), color: '#FFE14D', life: 0.8 });
          G.shake = Math.max(G.shake, d.t === 'boss' ? 16 : 5);
        },
        birdHit(d) {
          A.play('birdHit', { v: d.v, gap: 0.12, x: d.x });
          G.birdSquash = Math.max(G.birdSquash, 0.25 * d.v + 0.05);
          if (d.v > 0.7 && G.comicT <= 0) { G.comicT = 1.2; G.comic(d.x, d.y - 50, 'comicHit'); }
          if (d.v > 0.3) for (let i = 0; i < 3; i++) G.part({ kind: 'feather', x: d.x, y: d.y, vx: rand(-120, 120), vy: rand(-200, -40), g: 120, s: rand(6, 10), color: R.CHICK[d.type].b, life: 1.2, vr: rand(-4, 4) });
        },
        split(d) {
          A.play('split', { x: d.x });
          G.part({ kind: 'glow', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: 70, color: 'rgba(255,200,230,0.9)', life: 0.25, vr: 0 });
          for (let i = 0; i < 10; i++) G.part({ kind: 'feather', x: d.x, y: d.y, vx: rand(-140, 140), vy: rand(-140, 60), g: 120, s: rand(6, 10), color: R.CHICK.split.b, life: 1.1, vr: rand(-4, 4) });
          for (let i = 0; i < 6; i++) G.part({ kind: 'spark', x: d.x, y: d.y, vx: rand(-200, 200), vy: rand(-200, 200), g: 300, s: rand(6, 10), color: '#FFE14D', life: 0.5 });
        },
        dive(d) {
          G.shotAbility = 'heavy';
          A.play('dive', { x: d.x });
          G.part({ kind: 'glow', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: 60, color: 'rgba(200,180,255,0.8)', life: 0.25, vr: 0 });
          for (let i = 0; i < 8; i++) G.part({ kind: 'puff', x: d.x + rand(-20, 20), y: d.y - rand(0, 30), vx: rand(-30, 30), vy: rand(-90, -30), g: 0, s: rand(8, 14), color: 'rgba(220,210,255,0.7)', life: 0.5 });
        },
        slam(d) {
          A.play('slam', { x: d.x });
          G.shake = Math.max(G.shake, 14); G.haptic('heavy');
          if (!G.nuke.mode) G.hitStop = Math.max(G.hitStop, 0.06);
          G.comic(d.x, d.y - 80, 'comicSlam');
          G.part({ kind: 'ring', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R, color: 'rgba(200,180,255,0.9)', life: 0.45, vr: 0 });
          G.dust(d.x, d.y, 14);
          for (let i = 0; i < 6; i++) G.part({ kind: 'spark', x: d.x, y: d.y, vx: rand(-320, 320), vy: rand(-420, -120), g: 800, s: rand(8, 12), color: '#FFE14D', life: 0.7 });
        },
        boomerang(d) {
          G.shotAbility = 'boomer';
          A.play('boomerang', { x: d.x });
          G.part({ kind: 'ring', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: 70, color: 'rgba(160,240,110,0.9)', life: 0.3, vr: 0 });
          for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; G.part({ kind: 'feather', x: d.x, y: d.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, g: 100, s: rand(6, 9), color: R.CHICK.boomer.b, life: 0.9, vr: rand(-4, 4) }); }
        },
        inflate(d) {
          G.shotAbility = 'puff';
          A.play('inflate', { x: d.x });
          G.shake = Math.max(G.shake, 8); G.haptic('medium');
          G.comic(d.x, d.y - 90, 'comicPuff');
          G.part({ kind: 'ring', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R, color: 'rgba(190,230,255,0.95)', life: 0.5, vr: 0 });
          G.part({ kind: 'ring', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R * 0.6, color: 'rgba(255,255,255,0.9)', life: 0.35, vr: 0 });
          for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; G.part({ kind: 'puff', x: d.x + Math.cos(a) * 30, y: d.y + Math.sin(a) * 30, vx: Math.cos(a) * 420, vy: Math.sin(a) * 300, g: 0, s: rand(14, 22), color: 'rgba(235,248,255,0.8)', life: 0.45 }); }
        },
        pop(d) {
          A.play('pop', { x: d.x });
          for (let i = 0; i < 16; i++) G.part({ kind: 'feather', x: d.x + rand(-d.r, d.r) * 0.6, y: d.y + rand(-d.r, d.r) * 0.6, vx: rand(-220, 220), vy: rand(-260, 60), g: 90, s: rand(7, 11), color: i % 2 ? R.CHICK.puff.b : '#FFFFFF', life: 1.4, vr: rand(-5, 5) });
          G.part({ kind: 'glow', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.r * 2, color: 'rgba(230,245,255,0.8)', life: 0.25, vr: 0 });
        },
        boost(d) {
          A.play('boost', { x: d.x });
          for (let i = 0; i < 10; i++) G.part({ kind: 'puff', x: d.x - Math.cos(d.ang) * i * 8, y: d.y - Math.sin(d.ang) * i * 8, vx: rand(-30, 30), vy: rand(-30, 30), g: 0, s: rand(8, 14), color: 'rgba(255,200,90,0.7)', life: 0.5 });
        },
        explode(d) {
          A.play('explode', { gap: 0.04, x: d.x });
          if (d.tnt) { G.dust(d.x, d.y, 10); G.save.stats.tnt = (G.save.stats.tnt || 0) + 1; }
          G.comic(d.x, d.y - 70, 'comicBoom');
          if (!G.nuke.mode) G.hitStop = Math.max(G.hitStop, 0.07);
          G.haptic('heavy');
          G.part({ kind: 'glow', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R * 1.5, color: 'rgba(255,225,150,0.95)', life: 0.4, vr: 0 });
          G.scorch(d.x, d.y, d.R * 0.75);
          G.part({ kind: 'ring', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R, color: 'rgba(255,230,120,0.9)', life: 0.45, vr: 0 });
          for (let i = 0; i < 26; i++) {
            const a = rand(0, 6.28), sp = rand(100, 520);
            G.part({ kind: 'puff', x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -60, s: rand(14, 30), color: ['rgba(255,190,40,0.85)', 'rgba(255,120,20,0.8)', 'rgba(90,70,50,0.7)'][i % 3], life: rand(0.4, 0.9) });
          }
          G.shake = 18;
        },
        nuke(d) {
          A.play('nukeBoom', { gap: 0 });
          G.flash = 1; G.shake = 34; G.haptic('heavy');
          G.part({ kind: 'glow', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R * 1.6, color: 'rgba(255,240,200,1)', life: 1.6, vr: 0 });
          G.scorch(d.x, d.y, d.R * 0.8, true);
          G.part({ kind: 'ring', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R * 1.25, color: 'rgba(255,250,210,0.95)', life: 1.1, vr: 0 });
          G.part({ kind: 'ring', x: d.x, y: d.y, vx: 0, vy: 0, g: 0, s: d.R * 0.8, color: 'rgba(255,170,40,0.9)', life: 0.8, vr: 0 });
          // огненный шар
          for (let i = 0; i < 40; i++) {
            const a = rand(0, 6.28), sp = rand(60, 700);
            G.part({ kind: 'puff', x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, g: -80, s: rand(24, 50), color: ['rgba(255,240,170,0.95)', 'rgba(255,170,40,0.9)', 'rgba(240,90,20,0.85)'][i % 3], life: rand(0.6, 1.4) });
          }
          // большое мультяшное облако (кольцо пушистых клубов) и россыпь звёзд с конфетти
          for (let i = 0; i < 30; i++) {
            const a = rand(0, 6.28), r = rand(60, 200);
            G.part({ kind: 'puff', x: d.x + Math.cos(a) * r, y: d.y - 40 + Math.sin(a) * r * 0.6, vx: Math.cos(a) * rand(30, 90), vy: rand(-90, -30), g: 15, s: rand(40, 70), color: ['rgba(255,252,235,0.9)', 'rgba(255,230,160,0.85)', 'rgba(255,210,120,0.8)'][i % 3], life: rand(1.8, 2.6) });
          }
          for (let i = 0; i < 26; i++) {
            const a = rand(0, 6.28), sp = rand(250, 750);
            G.part({ kind: 'spark', x: d.x, y: d.y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 250, g: 700, s: rand(12, 22), color: ['#FFE14D', '#FFFFFF', '#FFB13B'][i % 3], life: rand(1, 1.6) });
          }
          const cc = ['#FFC72C', '#FF6B6B', '#4DC3FF', '#7BC043', '#FFFFFF'];
          for (let i = 0; i < 50; i++) G.part({ kind: 'confetti', x: d.x + rand(-80, 80), y: d.y - 60, vx: rand(-500, 500), vy: rand(-900, -400), g: 600, s: rand(10, 16), color: cc[i % cc.length], life: rand(2, 3), vr: rand(-8, 8) });
          for (let i = 0; i < 30; i++) G.chunk(['wood', 'stone', 'glass'][i % 3], d.x + rand(-60, 60), d.y + rand(-30, 30), 2.2);
        },
        quake() {
          A.play('quake', { gap: 0 });
          for (let i = 0; i < 40; i++) G.part({ kind: 'puff', x: rand(700, 1900), y: C.GROUND_Y - 4, vx: rand(-40, 40), vy: rand(-90, -20), g: 0, s: rand(12, 24), color: 'rgba(160,110,60,0.55)', life: rand(0.6, 1.2) });
        },
        score(d) {
          const big = d.pts >= C.ENEMY_SCORE;
          G.popup('+' + d.pts, d.x, d.y, big ? '#FFE14D' : '#FFFFFF', big ? 48 : 30);
          G.ui.setScore(G.totalScore());
        },
        birdDone(d) {
          A.play('poof', { x: d.x });
          for (let i = 0; i < 8; i++) G.part({ kind: 'puff', x: d.x + rand(-12, 12), y: d.y + rand(-12, 12), vx: rand(-60, 60), vy: rand(-80, 0), g: 0, s: rand(10, 18), color: 'rgba(255,255,255,0.85)', life: 0.5 });
          for (let i = 0; i < 4; i++) G.part({ kind: 'feather', x: d.x, y: d.y, vx: rand(-90, 90), vy: rand(-160, -40), g: 100, s: rand(6, 9), color: R.CHICK[d.type].b, life: 1.2, vr: rand(-4, 4) });
        },
      };
    },

    dust(x, y, n) {
      for (let i = 0; i < n; i++) this.part({ kind: 'puff', x: x + rand(-20, 20), y, vx: rand(-90, 90), vy: rand(-60, -10), g: -10, s: rand(8, 16), color: 'rgba(225,190,140,0.55)', life: rand(0.4, 0.8) });
    },

    confetti() {
      const v = this.view, cols = ['#FFE14D', '#FF8A00', '#3D8BFD', '#E8343A', '#7BC043', '#FFFFFF'];
      for (let i = 0; i < 120; i++) this.part({ kind: 'confetti', x: rand(v.x0, v.x1), y: rand(v.y0 - 300, v.y0), vx: rand(-40, 40), vy: rand(80, 200), g: 40, s: rand(10, 18), color: cols[i % cols.length], life: rand(2.5, 4), vr: rand(-6, 6) });
    },

    chunk(m, x, y, k) {
      const cols = R.MAT_COLORS[m];
      this.part({ kind: 'chunk', m, x, y, vx: rand(-260, 260) * k, vy: rand(-380, -40) * k, g: 1100, s: rand(7, 15), color: cols[(Math.random() * cols.length) | 0], life: rand(0.7, 1.3) });
    },

    // Комикс-надпись в «звёздочке»: БАХ!, БУМ!
    comic(x, y, key) {
      const words = root.YB.I18n.t(key).split('|');
      this.part({ kind: 'comic', text: words[(Math.random() * words.length) | 0], x, y, vx: 0, vy: -30, g: 0, s: 64, color: key === 'comicBoom' ? '#FF9A1F' : '#FFE14D', life: 0.75, rot: rand(-0.25, 0.25) || 0.1, vr: 0 });
    },
    haptic(style) { if (this.save.settings.vib !== false) root.YB.Platform.haptic(style); },

    // След взрыва на поверхности под ним
    scorch(x, y, r, always) {
      const sy = R.surfaceY(x, this.sim.statics);
      if (!always && sy - y > 170) return;
      this.decals.push({ x, y: sy, r });
      if (this.decals.length > 14) this.decals.shift();
    },

    updateParts(dt) {
      for (const p of this.parts) {
        p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.kind === 'feather') { p.vx *= 0.97; p.vy = Math.min(p.vy, 80); }
        if (p.kind === 'confetti') p.vy = Math.min(p.vy, 170);
        if (p.kind === 'chunk' && p.y > C.GROUND_Y - 3) { p.y = C.GROUND_Y - 3; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
      }
      this.parts = this.parts.filter((p) => p.life > 0);
      this.shake = Math.max(0, this.shake - dt * 40);
      this.birdSquash = Math.max(0, this.birdSquash - dt * 2.5);
      if (this.taunt && (this.taunt.t -= dt) <= 0) this.taunt = null;
      this.wob = Math.max(0, this.wob - dt * 2.2);
      this.comicT = Math.max(0, this.comicT - dt);
    },

    // ---------- Кадр ----------
    frame(now) {
      const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0);
      this.last = now;
      if (this.running()) {
        if (this.nuke.pending) this.tryPendingNuke();
        this.updateNuke(dt);
        if (this.introT > 0) this.introT -= dt;
        if (this.hintT > 0 && (this.hintT -= dt) <= 0) this.showHint(this.def.startHint);
        if (this.finale > 0 && !this.nuke.mode) {
          this.finale -= dt;
          this.setTimeScale(this.finale > 0 ? 0.28 : 1);
        }
        // птенцы в очереди иногда чирикают
        if (this.queue.length && !this.ending && (this.chirpT -= dt) <= 0) { this.chirpT = rand(4, 9); A.play('chirp', { x: 200 }); }
        // В слоу-мо физика шагает с тем же темпом, но движок сам замедляет время (timeScale),
        // а логика уровня (таймеры) идёт медленнее вместе с ним.
        // «Стоп-кадр» на доли секунды в момент сильного удара
        if (this.hitStop > 0) this.hitStop -= dt; else this.acc += dt;
        let n = 0;
        while (this.acc >= DT && n < 4) { this.sim.step(); this.flow(DT * this.timeScale); this.acc -= DT; n++; }
        if (n === 4) this.acc = 0;
        this.time += dt;
        this.updateParts(dt * (this.timeScale < 1 ? Math.max(0.3, this.timeScale) : 1));
      } else if (this.state === 'menu' || this.state === 'win' || this.state === 'lose') {
        this.time += dt;
        this.updateParts(dt);
      }
      // приближение камеры к последнему сбитому врагу (в реальном времени, не в замедленном)
      const zt = (this.finale > 0 || this.introT > 0.6) && this.state === 'play' ? 1 : 0;
      // На слабых устройствах отключаем украшения, чтобы игра шла плавно
      this.slowT = dt > 0.034 ? this.slowT + dt : Math.max(0, this.slowT - dt * 0.5);
      if (this.slowT > 2.5 && !this.lowFx) { this.lowFx = true; R.setDetail(true); }
      this.zoom.k += (zt - this.zoom.k) * Math.min(1, dt * (zt ? 9 : 3.5));
      if (this.zoom.k < 0.002) this.zoom.k = 0;
      this.draw();
      requestAnimationFrame((t) => this.frame(t));
    },

    draw() {
      const ctx = this.ctx, v = this.view, t = this.time;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const sh = this.shake;
      const shx = sh ? rand(-sh, sh) * v.s : 0, shy = sh ? rand(-sh, sh) * v.s : 0;
      const zk = this.state === 'menu' ? 0 : this.zoom.k, zs = v.s * (1 + (this.zoom.amt || 0.22) * zk);
      // точка приближения остаётся на месте, а после — мягко смещается к центру экрана
      const zx = v.ox + this.zoom.x * (v.s - zs) + (this.canvas.width / 2 - (this.zoom.x * v.s + v.ox)) * 0.35 * zk;
      const zy = v.oy + this.zoom.y * (v.s - zs) + (this.canvas.height / 2 - (this.zoom.y * v.s + v.oy)) * 0.35 * zk;
      ctx.setTransform(zs, 0, 0, zs, zx + shx, zy + shy);
      // запас по краям — чтобы при тряске и приближении камеры не было пустых полос
      R.background(ctx, { x0: v.x0 - 420, x1: v.x1 + 420, y0: v.y0 - 260, y1: v.y1 + 260 }, t);

      if (this.state === 'menu' || !this.sim) { this.drawMenuScene(ctx, t); this.vignette(); return; }
      const sim = this.sim;
      // тени и подпалины: на земле — до холмов (холмы их перекрывают), на холмах — после
      const casters = [...sim.blocks, ...sim.enemies, ...sim.minis]; if (sim.bird) casters.push(sim.bird);
      R.groundFx(ctx, casters, this.decals, sim.statics, true);
      R.statics(ctx, sim.statics);
      R.groundFx(ctx, casters, this.decals, sim.statics, false);
      if (sim.trail.length) R.dots(ctx, sim.trail, 'rgba(255,255,255,0.85)');

      // Птенец на рогатке
      let pouch = null, readyPos = null;
      if (this.ready && (this.phase === 'ready' || this.phase === 'hop')) {
        if (this.phase === 'hop') {
          const from = { x: SX - 78, y: C.GROUND_Y - BIRDS[this.ready].r }, k = this.hopT;
          readyPos = { x: from.x + (SX - from.x) * k, y: from.y + (SY - from.y) * k - Math.sin(k * Math.PI) * 120 };
          if (k > 0.85) pouch = { x: SX, y: SY };
        } else {
          readyPos = this.drag ? { x: SX + this.drag.dx, y: SY + this.drag.dy } : { x: SX, y: SY };
          pouch = readyPos;
        }
      }
      R.slingBack(ctx, pouch, this.wob, t);

      // 2.5D: сначала боковые грани всех блоков, потом лицевые — так соседние блоки не перекрываются криво
      for (const b of sim.blocks) R.blockSides(ctx, b);
      for (const b of sim.blocks) R.block(ctx, b);

      const fb = sim.bird;
      for (const e of sim.enemies) {
        const g = e.game;
        let look = Math.PI, scared = false;
        if (fb) { look = Math.atan2(fb.position.y - e.position.y, fb.position.x - e.position.x); scared = Math.hypot(fb.position.x - e.position.x, fb.position.y - e.position.y) < 420; }
        const blink = ((t * 1000 + g.seed * 977) % 3600) < 130;
        if (g.hurtT) g.hurtT--;
        const breathe = Math.sin(t * 2.6 + g.seed) * 0.035;
        const jump = this.taunt && this.taunt.body === e ? Math.abs(Math.sin(this.taunt.t * 9)) * 18 : 0;   // дразнится и подпрыгивает
        R.dude(ctx, e.position.x, e.position.y - jump, g.r, e.angle, g.t, { hp: g.hp / g.maxHp, look, blink, scared, time: t, squash: g.hurtT ? Math.sin(g.hurtT) * 0.08 : breathe });
      }

      // Очередь птенцов
      this.queue.forEach((type, i) => {
        const p = this.queuePos(i);
        const hop = Math.max(0, Math.sin(t * 2.2 + i * 1.7)) ** 8 * 18;
        R.chick(ctx, p.x, p.y - hop, BIRDS[type].r, 0, type, { blink: ((t * 1000 + i * 1300) % 3000) < 120, time: t });
      });
      for (const b of this.bonusList) R.chick(ctx, b.x, b.y, BIRDS[b.type].r, 0, b.type, { time: t });

      if (readyPos) {
        let ang = 0;
        if (this.drag && Math.hypot(this.drag.dx, this.drag.dy) > 5) ang = Math.atan2(-this.drag.dy, -this.drag.dx);
        const br = BIRDS[this.ready].r * (this.active.power ? 1.35 : 1);
        if (this.active.power) R.aura(ctx, readyPos.x, readyPos.y, br, t);
        R.chick(ctx, readyPos.x, readyPos.y, br, ang, this.ready, { time: t, squash: this.phase === 'hop' ? -Math.sin(this.hopT * Math.PI) * 0.12 : 0 });
      }
      R.slingFront(ctx, pouch, this.ready ? BIRDS[this.ready].r : 26);

      if (fb) {
        const g = fb.game;
        // шлейф за летящим птенцом
        this.flyTrail.push({ x: fb.position.x, y: fb.position.y });
        if (this.flyTrail.length > 9) this.flyTrail.shift();
        if (!g.hit) {
          ctx.fillStyle = g.power ? 'rgba(255,120,40,1)' : 'rgba(255,255,255,1)';
          this.flyTrail.forEach((p, i) => { ctx.globalAlpha = (i / this.flyTrail.length) * 0.45; ctx.beginPath(); ctx.arc(p.x, p.y, g.r * (0.35 + 0.6 * i / this.flyTrail.length), 0, 6.283); ctx.fill(); });
          ctx.globalAlpha = 1;
        }
        const ang = g.hit ? fb.angle + g.launchAng : Math.atan2(fb.velocity.y, fb.velocity.x);
        if (g.power) R.aura(ctx, fb.position.x, fb.position.y, g.r, t);
        R.chick(ctx, fb.position.x, fb.position.y, g.r, ang, g.type, { time: t, squash: this.birdSquash, flap: !g.hit && !g.dive, puffed: g.puffed, mirror: !g.hit && Math.cos(ang) < 0 });
      }
      for (const m of sim.minis) {
        const g = m.game, ang = g.hit ? m.angle + g.launchAng : Math.atan2(m.velocity.y, m.velocity.x);
        R.chick(ctx, m.position.x, m.position.y, g.r, ang, 'split', { time: t + g.launchAng, flap: !g.hit });
      }

      // Прицел
      if (this.drag && Math.hypot(this.drag.dx, this.drag.dy) >= 25) {
        const v2 = this.launchVel(this.drag.dx, this.drag.dy);
        if (this.active.sight) {
          // Бустер «Прицел»: полная траектория до земли
          const pts = Sim.predict(SX + this.drag.dx, SY + this.drag.dy, v2.x, v2.y, 400).filter((_, i) => i % 4 === 3);
          R.dots(ctx, pts, '#FF7A00');
        } else {
          const pts = Sim.predict(SX + this.drag.dx, SY + this.drag.dy, v2.x, v2.y, 75).filter((_, i) => i % 3 === 2);
          R.dots(ctx, pts, '#FFFFFF', 22);
        }
      }

      if (this.taunt && sim.enemies.includes(this.taunt.body)) {
        const b = this.taunt.body;
        R.bubble(ctx, b.position.x, b.position.y - b.game.r - 12, this.taunt.text, 1.7 - this.taunt.t);
      }
      if (!this.lowFx) R.ambient(ctx, v, t);
      if (!this.lowFx) R.lighting(ctx, v, t);
      R.particles(ctx, this.parts);
      R.foreground(ctx, v, t);
      this.drawNuke(ctx, t);

      // Подсказка-рука на первом уровне
      if (this.levelIdx === 0 && this.shots === 0 && this.phase === 'ready' && !this.drag) this.drawHand(ctx, t);
      this.vignette();
    },

    // Мягкое затемнение по краям экрана
    vignette() {
      if (this.lowFx) return;
      { const S = R.sunPos(), v = this.view; R.grade(this.ctx, this.canvas.width, this.canvas.height, S.x * v.s + v.ox, S.y * v.s + v.oy); }
      const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
      if (!this._vig || this._vig.w !== w || this._vig.h !== h) {
        const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.45, w / 2, h * 0.45, Math.max(w, h) * 0.75);
        g.addColorStop(0, 'rgba(60,25,0,0)'); g.addColorStop(1, 'rgba(60,25,0,0.28)');
        this._vig = { w, h, g };
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this._vig.g; ctx.fillRect(0, 0, w, h);
    },

    drawNuke(ctx, t) {
      const n = this.nuke, v = this.view;
      if (n.mode === 'aim') {
        // затемнение и прицел с зоной поражения
        ctx.fillStyle = 'rgba(40,10,0,0.25)'; ctx.fillRect(v.x0 - 50, v.y0 - 50, v.x1 - v.x0 + 100, v.y1 - v.y0 + 100);
        const p = this.pointer;
        R.nukeTarget(ctx, p.x, p.y, 520, t);
      } else if (n.mode === 'fall') {
        const k = Math.min(1, n.t / 1.5);
        R.nukeTarget(ctx, n.x, n.y, 520, t, 0.6);
        const y = -300 + (n.y + 300) * k * k;
        R.nukeBomb(ctx, n.x, y, t);
      }
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(255,252,235,${Math.min(1, this.flash * 1.3)})`;
        ctx.fillRect(v.x0 - 50, v.y0 - 50, v.x1 - v.x0 + 100, v.y1 - v.y0 + 100);
      }
    },

    drawHand(ctx, t) {
      const k = (t % 1.8) / 1.8, e = k < 0.7 ? k / 0.7 : 1;
      const x = SX - 110 * e, y = SY + 45 * e;
      ctx.save(); ctx.globalAlpha = k < 0.85 ? 0.9 : (1 - k) / 0.15 * 0.9;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5; ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.moveTo(SX, SY); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = R.OUT; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y + 6, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      R.rr(ctx, x - 7, y - 40, 14, 40, 7); ctx.fill(); ctx.stroke();
      ctx.restore();
    },

    drawMenuScene(ctx, t) {
      R.slingBack(ctx, { x: SX, y: SY });
      const bob = (ph) => Math.max(0, Math.sin(t * 2.4 + ph)) ** 6 * 26;
      R.chick(ctx, SX, SY, 26, -0.25, 'normal', { time: t });
      R.slingFront(ctx, { x: SX, y: SY }, 26);
      R.chick(ctx, 200, C.GROUND_Y - 23 - bob(1), 23, 0, 'speed', { time: t });
      R.chick(ctx, 130, C.GROUND_Y - 30 - bob(2.2), 30, 0, 'bomb', { time: t });
      R.dude(ctx, 1560, C.GROUND_Y - 30 - bob(0.5), 30, 0, 'blue', { look: Math.PI, time: t, blink: (t % 3.2) < 0.12 });
      R.dude(ctx, 1660, C.GROUND_Y - 34 - bob(1.6), 34, 0, 'red', { look: Math.PI, time: t, blink: ((t + 1.3) % 3.7) < 0.12 });
      R.dude(ctx, 1760, C.GROUND_Y - 30 - bob(2.7), 30, 0, 'blue', { look: Math.PI, time: t });
      R.ambient(ctx, this.view, t);
      if (!this.lowFx) R.lighting(ctx, this.view, t);
      R.particles(ctx, this.parts);
      R.foreground(ctx, this.view, t);
    },
  };

  root.YB = Object.assign(root.YB || {}, { Game });
})(window);
