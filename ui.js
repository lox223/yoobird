/* YooBird — интерфейс, экраны, достижения, наряды и запуск игры. */
(function (root) {
  'use strict';
  const { Game, LEVELS, I18n, Audio: A, Platform: P, Render: R } = root.YB;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const MAIN = ['loading', 'menu', 'levels'];
  const MODALS = ['pause', 'win', 'lose', 'settings', 'ach', 'wardrobe', 'intro', 'nuke'];
  const LOCK_SVG = '<svg class="lock" viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 1 1 12 0v2h1v12H5V10zm2 0h8V8a4 4 0 1 0-8 0z"/></svg>';
  const fmt = (v) => v.toLocaleString('ru-RU');

  // ---------- Правила межстраничной рекламы ----------
  // Реклама не должна отпугивать: новичок сначала втягивается, а дальше реклама — только в естественных паузах и не часто.
  const AD_RULES = {
    freeLevels: 2,        // уровни 1–2 проходятся совсем без межстраничной рекламы
    everyBreaks: 2,       // дальше — примерно на каждой 2-й паузе (переход на следующий уровень или в меню)
    minGapSec: 75,        // и не чаще раза в 75 секунд
    sessionGraceSec: 60,  // первая минута после запуска игры — без рекламы
    afterRewardSec: 60,   // после добровольной рекламы — ещё минута без межстраничной
  };
  const AdPace = {
    start: Date.now(), last: 0, breaks: 0, shown: 0,
    // levelIdx — уровень, с которого уходит игрок (0 — первый)
    shouldShow(levelIdx) {
      const now = Date.now();
      if (levelIdx < AD_RULES.freeLevels) return false;
      this.breaks++;
      if (now - this.start < AD_RULES.sessionGraceSec * 1000) return false;
      if (this.last && now - this.last < AD_RULES.minGapSec * 1000) return false;
      if (this.breaks < AD_RULES.everyBreaks) return false;
      return true;
    },
    shownInterstitial() { this.last = Date.now(); this.breaks = 0; this.shown++; },
    shownRewarded() { this.last = Math.max(this.last, Date.now() - (AD_RULES.minGapSec - AD_RULES.afterRewardSec) * 1000); },
  };

  // Достижения: названия и описания — в i18n (ach_<id>, ach_<id>_d)
  const ACH = ['first', 'oneshot', 'combo3', 'combo5', 'clean', 'king', 'citadel', 'iceking', 'final', 'nuke', 'slam2', 'boomer', 'puff3', 'tnt10', 'kills100', 'stars15', 'stars30', 'stars60', 'stars45'];
  // Наряды птенцов: сколько звёзд нужно, чтобы открыть
  const SKINS = [{ id: 'none', need: 0 }, { id: 'cap', need: 5 }, { id: 'glasses', need: 10 }, { id: 'bandana', need: 18 }, { id: 'tophat', need: 28 }, { id: 'crown', need: 40 }, { id: 'scarf', need: 52 }, { id: 'pilot', need: 66 }];
  // Карточки знакомства: показываются один раз, когда элемент впервые встречается на уровне
  const fakeBlock = (m, shape, w) => ({ position: { x: 0, y: 0 }, angle: 0, game: { m, shape, w, h: w, seed: 3, hp: 1, maxHp: 1 } });
  const INTROS = [
    { key: 'speed', has: (d) => d.birds.includes('speed'), draw: (c) => R.chick(c, 0, 4, 52, -0.2, 'speed', { time: 0 }) },
    { key: 'bomb', has: (d) => d.birds.includes('bomb'), draw: (c) => R.chick(c, 0, 10, 56, 0, 'bomb', { time: 0.02 }) },
    { key: 'split', has: (d) => d.birds.includes('split'), draw: (c) => { R.chick(c, -46, 18, 32, -0.25, 'split', { time: 0 }); R.chick(c, 46, 18, 32, 0.25, 'split', { time: 0.4 }); R.chick(c, 0, -8, 36, 0, 'split', { time: 0.8 }); } },
    { key: 'heavy', has: (d) => d.birds.includes('heavy'), draw: (c) => R.chick(c, 0, 8, 56, 0, 'heavy', { time: 0 }) },
    { key: 'boomer', has: (d) => d.birds.includes('boomer'), draw: (c) => R.chick(c, 0, 10, 50, -0.15, 'boomer', { time: 0 }) },
    { key: 'puff', has: (d) => d.birds.includes('puff'), draw: (c) => R.chick(c, 0, 10, 50, 0, 'puff', { time: 0 }) },
    { key: 'tnt', has: (d) => d.items.some((i) => i.m === 'tnt'), draw: (c) => R.block(c, fakeBlock('tnt', 'rect', 96)) },
    { key: 'boulder', has: (d) => d.items.some((i) => i.shape === 'circle'), draw: (c) => R.block(c, fakeBlock('stone', 'circle', 104)) },
    { key: 'boss', has: (d) => d.items.some((i) => i.t === 'boss'), draw: (c) => R.dude(c, 0, 12, 60, 0, 'boss', { look: Math.PI * 0.9, time: 0 }) },
  ];
  const THEME_CLASS = { noon: 'w-noon', sunset: 'w-sunset', dusk: 'w-dusk', night: 'w-night', winter: 'w-winter', volcano: 'w-volcano' };

  const UI = {
    save: null, busy: false, noIntro: root.location.hash === '#test',
    introQueue: [], achQueue: [], achBusy: false,

    show(name) {
      MAIN.forEach((n) => $('#screen-' + n).classList.toggle('hidden', n !== name));
      ['#hud', '#boosters', '#nuke-btn'].forEach((sel) => $(sel).classList.toggle('hidden', name !== 'game'));
      if (name !== 'game') $('#level-banner').classList.add('hidden');
      if (name === 'menu' || name === 'levels') this.refreshStars();
    },
    modal(name, on) { $('#screen-' + name).classList.toggle('hidden', !on); },
    closeModals() { MODALS.forEach((m) => this.modal(m, false)); },

    totalStars() { return this.save.stars.reduce((a, b) => a + (b || 0), 0); },
    refreshStars() { const t = `${this.totalStars()} / ${LEVELS.length * 3}`; $$('.ts-val').forEach((e) => { e.textContent = t; }); },
    tip() { const tips = I18n.t('tips').split('|'); return tips[(Math.random() * tips.length) | 0]; },

    // ---------- Вызовы из игры ----------
    setScore(v) {
      $('#hud-score').textContent = fmt(v);
      const st = Game.def && Game.def.stars;
      if (!st) return;
      $('#star-fill').style.width = Math.min(100, (v / st[2]) * 100) + '%';
      $('#star-t1').style.left = (st[1] / st[2]) * 100 + '%';
      $('#star-t1').classList.toggle('on', v >= st[1]);
      $('#star-t2').classList.toggle('on', v >= st[2]);
    },
    setEnemies(n) {
      const el = $('#hud-enemies');
      if (el.textContent !== String(n)) { el.textContent = n; el.parentNode.classList.remove('bump'); void el.offsetWidth; el.parentNode.classList.add('bump'); }
    },
    hideToast() { clearTimeout(this._toastT); $('#toast').classList.add('hidden'); },
    toast(key) {
      const el = $('#toast');
      el.textContent = I18n.t(key);
      el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => el.classList.add('hidden'), 3200);
    },
    togglePause() { if ($('#screen-pause').classList.contains('hidden')) this.act('pause'); else this.act('resume'); },
    persist() { P.save(this.save); },

    // Заставка уровня: номер и название
    banner(i) {
      const el = $('#level-banner');
      el.querySelector('b').textContent = `${I18n.t('level')} ${i + 1}`;
      el.querySelector('span').textContent = I18n.t(LEVELS[i].nameKey);
      el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      clearTimeout(this._bannerT);
      this._bannerT = setTimeout(() => el.classList.add('hidden'), 2300);
    },

    // ---------- Достижения ----------
    unlock(id) {
      if (!this.save || this.save.ach[id]) return;
      this.save.ach[id] = 1; this.persist();
      this.achQueue.push(id);
      if (!this.achBusy) this.nextAch();
    },
    nextAch() {
      const id = this.achQueue.shift();
      if (!id) { this.achBusy = false; return; }
      this.achBusy = true;
      const el = $('#ach-toast');
      el.querySelector('b').textContent = I18n.t('ach_' + id);
      el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      A.play('ach', { gap: 0 });
      setTimeout(() => { el.classList.add('hidden'); setTimeout(() => this.nextAch(), 250); }, 2600);
    },
    checkProgressAch() {
      const t = this.totalStars(), st = this.save.stats;
      if (t >= 15) this.unlock('stars15');
      if (t >= 30) this.unlock('stars30');
      if (t >= 60) this.unlock('stars60');
      if (t >= LEVELS.length * 3) this.unlock('stars45');
      if ((st.kills || 0) >= 100) this.unlock('kills100');
      if ((st.tnt || 0) >= 10) this.unlock('tnt10');
    },
    buildAch() {
      const list = $('#ach-list'); list.innerHTML = '';
      const got = ACH.filter((id) => this.save.ach[id]).length;
      ACH.forEach((id) => {
        const on = !!this.save.ach[id];
        const d = document.createElement('div');
        d.className = 'ach' + (on ? ' on' : '');
        d.innerHTML = `<i></i><div><b>${I18n.t('ach_' + id)}</b><small>${I18n.t('ach_' + id + '_d')}</small></div>`;
        list.appendChild(d);
      });
      $('#screen-ach .title').textContent = `${I18n.t('achTitle')} ${got}/${ACH.length}`;
    },

    // ---------- Наряды ----------
    buildSkins() {
      const list = $('#skin-list'); list.innerHTML = '';
      const total = this.totalStars();
      SKINS.forEach((sk) => {
        const open = total >= sk.need, cur = (this.save.skin || 'none') === sk.id;
        const b = document.createElement('button');
        b.className = 'skin' + (open ? '' : ' locked') + (cur ? ' current' : '');
        b.dataset.action = 'skin'; b.dataset.skin = sk.id;
        const cv = document.createElement('canvas'); cv.width = 192; cv.height = 208;
        const c = cv.getContext('2d'); c.scale(2, 2); c.translate(46, 66);
        if (!open) c.globalAlpha = 0.45;
        R.chick(c, 0, 0, 28, 0, 'normal', { skin: sk.id, time: 0 });
        b.appendChild(cv);
        const lab = document.createElement('span');
        lab.innerHTML = open ? (cur ? I18n.t('skinOn') : I18n.t('skin_' + sk.id)) : `<i></i>${sk.need}`;
        b.appendChild(lab);
        list.appendChild(b);
      });
    },

    // ---------- Карточки знакомства ----------
    checkIntro(i) {
      const def = LEVELS[i];
      this.introQueue = this.noIntro ? [] : INTROS.filter((it) => !this.save.seen[it.key] && it.has(def));
      if (this.introQueue.length) { Game.extPause.add('intro'); this.nextIntro(i); } else this.banner(i);
    },
    nextIntro(i) {
      const it = this.introQueue.shift();
      if (!it) { this.modal('intro', false); Game.extPause.delete('intro'); this.persist(); this.banner(i); return; }
      this.save.seen[it.key] = 1;
      $('#intro-title').textContent = I18n.t('intro_' + it.key);
      $('#intro-text').textContent = I18n.t('intro_' + it.key + '_d');
      const cv = $('#intro-canvas'), c = cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(2, 0, 0, 2, cv.width / 2, cv.height / 2);
      const g = c.createRadialGradient(0, 0, 10, 0, 0, 95);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, 'rgba(255,224,102,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 95, 0, 6.3); c.fill();
      it.draw(c);
      this._introLevel = i;
      this.modal('intro', true); A.play('whoosh');
    },

    showWin(r) {
      // добровольная реклама на экране победы: бустеры ×2 на следующем уровне
      $('#btn-boost-ad').classList.toggle('hidden', !r.hasNext || this.boostNext);
      // достижения за победу
      this.unlock('first');
      if (r.shots === 1 && r.level >= 1) this.unlock('oneshot');
      if (r.level >= 6 && !r.used.booster && !r.used.nuke && !r.used.ad) this.unlock('clean');
      if (r.level === 14) this.unlock('citadel');
      if (r.level === 19) this.unlock('iceking');
      if (r.level === LEVELS.length - 1) this.unlock('final');
      this.checkProgressAch();

      $('#win-score').textContent = '0';
      $('#win-best').textContent = fmt(r.best);
      $('#win-record').classList.toggle('hidden', !r.newRecord);
      $('#btn-next').classList.toggle('hidden', !r.hasNext);
      $('#win-alldone').classList.toggle('hidden', r.hasNext);
      $('#win-stats').innerHTML = `<span>${I18n.t('statShots')}: <b>${r.shots}</b></span><span>${I18n.t('statLeft')}: <b>${r.left}</b></span>`
        + (r.combo >= 2 ? `<span>${I18n.t('statCombo')}: <b>x${r.combo}</b></span>` : '');
      $('#win-next').textContent = r.need > 0 ? `${I18n.t('needMore')}: ${fmt(r.need)}` : '';
      $('#win-nuke').classList.toggle('hidden', !r.nukeEarned);
      const stars = $$('#screen-win .stars i');
      stars.forEach((s) => s.classList.remove('on'));
      setTimeout(() => {
        this.modal('win', true);
        // счётчик очков «набегает»
        const t0 = performance.now(), el = $('#win-score'); let lastTick = 0;
        const step = (now) => {
          const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
          el.textContent = fmt(Math.round(r.score * e));
          if (now - lastTick > 70 && k < 1) { lastTick = now; A.play('tick', { v: e, gap: 0 }); }
          if (k < 1 && !$('#screen-win').classList.contains('hidden')) requestAnimationFrame(step); else el.textContent = fmt(r.score);
        };
        requestAnimationFrame(step);
      }, 500);
      for (let i = 0; i < r.stars; i++) setTimeout(() => { stars[i].classList.add('on'); A.play('star', { i, gap: 0 }); }, 1500 + i * 380);
    },
    showLose(r) {
      this.checkProgressAch();
      $('#btn-ad').classList.toggle('hidden', r.adLeft <= 0);
      $('#ad-left').textContent = `(${r.adLeft})`;
      $('#lose-left').textContent = `${I18n.t('enemiesLeft')}: ${r.left}`;
      $('#lose-tip').textContent = this.tip();
      setTimeout(() => this.modal('lose', true), 600);
    },

    // Состояние кнопок бустеров и Царь-Бомбы
    refreshBoosters() {
      const G = Game;
      ['sight', 'power', 'quake'].forEach((b) => {
        const el = $('#b-' + b), n = G.boosters[b];
        el.querySelector('i').textContent = n;
        el.classList.toggle('used', n <= 0 && !G.active[b]);
        el.classList.toggle('active', !!G.active[b]);
        el.classList.toggle('na', n > 0 && !G.active[b] && (b === 'sight' || b === 'power') && !G.ready);
      });
      const nb = $('#nuke-btn');
      nb.classList.toggle('used', G.nuke.used);
      this.refreshNukeBtn();
      // Мягко «подмигнуть» один раз за попытку, когда остался последний птенец, а врагов ещё много
      if (!G.nuke.used && !this._tempted && G.sim && G.queue.length === 0 && G.sim.enemiesAlive() >= 2 && G.shots > 0) {
        this._tempted = true; nb.classList.add('tempt'); A.play('nukeOffer');
      }
    },

    // Значок на кнопке Царь-Бомбы: число в запасе или пометка «реклама»
    refreshNukeBtn() {
      const n = this.save.nukes || 0, nb = $('#nuke-btn');
      if (nb._n === n) return; nb._n = n;
      nb.classList.toggle('stock', n > 0);
      $('#nuke-stock').textContent = n > 0 ? String(n) : '';
    },

    // ---------- Экран уровней ----------
    // Миры: страницы на экране уровней
    WORLDS: [{ key: 'world1', from: 0, to: 15, cols: 8 }, { key: 'world2', from: 15, to: 25, cols: 5 }],
    buildLevels(page) {
      const W = this.WORLDS;
      if (page == null) {   // открываем мир, где сейчас продолжается игра
        const cur = Math.min(LEVELS.length, this.save.unlocked) - 1;
        page = Math.max(0, W.findIndex((w) => cur >= w.from && cur < w.to));
      }
      page = Math.max(0, Math.min(W.length - 1, page)); this.levelPage = page;
      const w = W[page];
      $('#world-name').textContent = I18n.t(w.key);
      $('#world-prev').classList.toggle('hidden', page === 0);
      $('#world-next').classList.toggle('hidden', page === W.length - 1);
      $$('.world-dots i').forEach((d, k) => d.classList.toggle('on', k === page));
      const grid = $('#level-grid'); grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${w.cols}, auto)`;
      LEVELS.forEach((lv, i) => {
        if (i < w.from || i >= w.to) return;
        const locked = i + 1 > this.save.unlocked;
        const st = this.save.stars[i] || 0;
        const b = document.createElement('button');
        b.className = `level-card ${THEME_CLASS[lv.theme] || 'w-noon'}` + (locked ? ' locked' : '') + (!locked && !st ? ' current' : '') + (st === 3 ? ' gold' : '');
        b.dataset.action = 'level'; b.dataset.level = i;
        b.innerHTML = `<span class="num">${i + 1}</span>${locked ? LOCK_SVG : ''}<span class="name">${I18n.t(lv.nameKey)}</span>`
          + `<span class="mini-stars">${[0, 1, 2].map((k) => `<i class="${k < st ? 'on' : ''}"></i>`).join('')}</span>`;
        grid.appendChild(b);
      });
    },

    refreshSettings() {
      const s = this.save.settings;
      $('#tg-music').classList.toggle('on', s.music);
      $('#tg-sfx').classList.toggle('on', s.sfx);
      $('#tg-vib').classList.toggle('on', s.vib !== false);
      $('#pz-music').classList.toggle('off', !s.music);
      $('#pz-sfx').classList.toggle('off', !s.sfx);
      $$('[data-action="lang"]').forEach((b) => b.classList.toggle('active', b.dataset.lang === I18n.lang));
      this._resetArmed = false; $('#btn-reset span').textContent = I18n.t('reset');
    },

    hudTitle() { if (Game.def) $('#hud-level').textContent = `${I18n.t('level')} ${Game.levelIdx + 1} · ${I18n.t(Game.def.nameKey)}`; },

    startLevel(i) {
      this.closeModals();
      this.introQueue = []; Game.extPause.delete('intro'); Game.extPause.delete('nuke');
      this.hideToast();
      this.show('game');
      this._tempted = false; $('#nuke-btn').classList.remove('tempt');
      Game.startLevel(i);
      if (this.boostNext) {   // награда за рекламу с экрана победы
        this.boostNext = false;
        Game.boosters = { sight: 2, power: 2, quake: 2 }; Game.ui.refreshBoosters();
        setTimeout(() => this.toast('boostersX2'), 2800);
      }
      if (this.noIntro) { Game.nextT = 0.35; Game.introT = 0; Game.zoom.k = 0; Game.hintT = Game.hintT ? 0.05 : 0; }   // режим автотестов: без заставки
      this.hudTitle();
      if (this._inTransit) this._afterTransit = () => this.checkIntro(i); else this.checkIntro(i);
    },

    toMenu() {
      this.closeModals();
      Game.extPause.delete('intro'); Game.extPause.delete('nuke'); this._afterTransit = null;
      Game.state = 'menu'; Game.sim = null; Game.parts = []; R.setTheme('noon'); A.setMood('day');
      P.gameplayStop();
      this.show('menu');
    },

    // Межстраничная реклама — только во время настоящей загрузки (п. 5.1.5.1 «а» правил VK).
    // Экран «Загружаем уровень…» не бутафорский: под ним собирается следующий уровень
    // (физика, постройки, отрисовка фона для новой темы), игра стоит на паузе,
    // а реклама показывается поверх этой загрузки. Заставку уровня запускаем после.
    async withInterstitial(fn, label = 'loadingLevel') {
      if (this.busy) return;
      if (!AdPace.shouldShow(Game.levelIdx)) { fn(); return; }
      this.busy = true;
      const tr = $('#screen-transit'); tr.querySelector('p').textContent = I18n.t(label); tr.classList.remove('hidden');
      Game.extPause.add('transit'); this._inTransit = true; $('#level-banner').classList.add('hidden');
      try {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));   // экран загрузки успел появиться
        fn();                                                                              // настоящая загрузка следующего экрана
        if (await P.showInterstitial()) AdPace.shownInterstitial(); else AdPace.breaks = AD_RULES.everyBreaks;
      } finally {
        this.busy = false; this._inTransit = false; Game.extPause.delete('transit');
        tr.classList.add('hidden');
        const after = this._afterTransit; this._afterTransit = null; if (after) after();
      }
    },


    // ---------- Обработка кнопок ----------
    async act(a, el) {
      const s = this.save;
      switch (a) {
        case 'play': this.startLevel(Math.min(LEVELS.length, s.unlocked) - 1); break;
        case 'levels': this.buildLevels(); this.show('levels'); break;
        case 'world-prev': this.buildLevels(this.levelPage - 1); A.play('click'); break;
        case 'world-next': this.buildLevels(this.levelPage + 1); A.play('click'); break;
        case 'settings': this.refreshSettings(); this.modal('settings', true); break;
        case 'ach': this.buildAch(); this.modal('ach', true); break;
        case 'close-ach': this.modal('ach', false); break;
        case 'wardrobe': this.buildSkins(); this.modal('wardrobe', true); break;
        case 'close-wardrobe': this.modal('wardrobe', false); break;
        case 'skin': {
          const sk = SKINS.find((x) => x.id === el.dataset.skin);
          if (this.totalStars() < sk.need) { this.toast('skinLocked'); return; }
          s.skin = sk.id; R.setSkin(sk.id); this.persist(); this.buildSkins(); break;
        }
        case 'intro-ok': this.nextIntro(this._introLevel); break;
        case 'share': P.share(); break;
        case 'favorite': P.favorite(); break;
        case 'back':
          if (!$('#screen-settings').classList.contains('hidden')) this.modal('settings', false);
          else this.show('menu');
          break;
        case 'level': {
          const i = +el.dataset.level;
          if (i + 1 > s.unlocked) { this.toast('locked'); return; }
          this.startLevel(i); break;
        }
        case 'toggle-music': s.settings.music = !s.settings.music; A.setMusic(s.settings.music); this.refreshSettings(); this.persist(); break;
        case 'toggle-sfx': s.settings.sfx = !s.settings.sfx; A.setSfx(s.settings.sfx); this.refreshSettings(); this.persist(); break;
        case 'toggle-vib': s.settings.vib = s.settings.vib === false; this.refreshSettings(); this.persist(); if (s.settings.vib) P.haptic('medium'); break;
        case 'reset':
          // сброс в два нажатия: сначала спрашиваем, потом сбрасываем
          if (!this._resetArmed) { this._resetArmed = true; $('#btn-reset span').textContent = I18n.t('resetSure'); return; }
          s.unlocked = 1; s.stars = []; s.best = []; s.ach = {}; s.seen = {}; s.stats = {}; s.skin = 'none'; s.nukes = 0;
          R.setSkin('none'); this.persist(); this.refreshSettings(); this.refreshStars(); this.toast('resetDone');
          break;
        case 'lang':
          s.settings.lang = el.dataset.lang; I18n.set(s.settings.lang); this.refreshSettings(); this.persist(); this.hudTitle();
          break;
        case 'pause':
          if (Game.state !== 'play') return;
          Game.paused = true; Game.drag = null; P.gameplayStop(); this.refreshSettings();
          $('#pause-tip').textContent = this.tip();
          this.modal('pause', true); break;
        case 'resume': this.modal('pause', false); Game.paused = false; P.gameplayStart(); Game.tryPendingNuke(); break;
        case 'restart': this.startLevel(Game.levelIdx); break;
        case 'retry': this.startLevel(Game.levelIdx); break;
        case 'menu': this.withInterstitial(() => this.toMenu(), 'loading'); break;
        case 'next': this.withInterstitial(() => this.startLevel(Math.min(LEVELS.length - 1, Game.levelIdx + 1))); break;
        case 'booster':
          if (!Game.useBooster(el.dataset.b)) this.toast('boosterNA');
          break;
        case 'nuke': {
          if (this.busy || !Game.canNuke()) return;
          // Есть заработанная Царь-Бомба — тратим её без рекламы
          if ((s.nukes || 0) > 0) { s.nukes--; this.persist(); Game.grantNuke(); this.refreshNukeBtn(); break; }
          // Иначе честно объясняем, что даёт реклама, и ждём согласия
          $('#nuke-offer-how').textContent = I18n.t('nukeHow');
          this.modal('nuke', true); Game.extPause.add('nuke');
          break;
        }
        case 'nuke-cancel': this.modal('nuke', false); Game.extPause.delete('nuke'); break;
        case 'nuke-ad': {
          if (this.busy) return;
          this.modal('nuke', false); Game.extPause.delete('nuke');
          if (!Game.canNuke()) return;
          this.busy = true;
          const ok = await P.showRewarded();
          this.busy = false;
          if (ok) AdPace.shownRewarded();
          // Награду выдаём всегда. Если игра на паузе — Царь-Бомба включится сразу после «Продолжить».
          if (ok) { Game.used.ad = true; Game.grantNuke(); }
          else this.toast('adFail');
          break;
        }
        case 'ad-boost': {
          if (this.busy) return;
          this.busy = true;
          const ok = await P.showRewarded();
          this.busy = false;
          if (ok) { AdPace.shownRewarded(); this.boostNext = true; $('#btn-boost-ad').classList.add('hidden'); this.toast('boostersReady'); }
          else this.toast('adFail');
          break;
        }
        case 'watch-ad': {
          if (this.busy) return;
          this.busy = true;
          const ok = await P.showRewarded();
          this.busy = false;
          if (ok) { AdPace.shownRewarded(); this.modal('lose', false); Game.addExtraBird(); }
          else this.toast('adFail');
          break;
        }
      }
    },

    // Пауза по внешним причинам (реклама, свёрнутое окно): стоп игры и звука.
    extPause(reason, on) {
      const has = Game.extPause.has(reason);
      if (on && !has) {
        Game.extPause.add(reason); Game.drag = null; A.pushPause();
        // Во время рекламы ВК может скрыть окно игры — это не повод открывать меню паузы
        if (reason !== 'ad' && !P.adOpen && Game.state === 'play' && !Game.paused) this.act('pause');
      } else if (!on && has) {
        Game.extPause.delete(reason); A.popPause();
      }
    },

    async boot() {
      const bar = $('.loader span');
      bar.style.width = '30%';
      await P.init();
      bar.style.width = '65%';
      const loaded = await P.load();   // запуск ждёт ВК не дольше 1,5 с, сохранение — 3 с
      this.save = Object.assign({ unlocked: 1, stars: [], best: [], settings: {}, ach: {}, seen: {}, stats: {}, skin: 'none' }, loaded || {});
      this.save.settings = Object.assign({ music: true, sfx: true, vib: true, lang: null }, this.save.settings);
      ['ach', 'seen', 'stats'].forEach((k) => { if (!this.save[k] || typeof this.save[k] !== 'object') this.save[k] = {}; });
      Game.save = this.save;
      R.setSkin(this.save.skin);

      I18n.set(this.save.settings.lang || P.lang());
      $('#load-tip').textContent = this.tip();
      A.musicOn = this.save.settings.music; A.sfxOn = this.save.settings.sfx;
      if (P.isVK) $$('.vk-only').forEach((e) => e.classList.remove('hidden'));

      P.onPause = (r) => this.extPause(r || 'ad', true);
      P.onResume = (r) => this.extPause(r || 'ad', false);
      document.addEventListener('visibilitychange', () => this.extPause('hidden', document.hidden));
      root.addEventListener('blur', () => { if (!P.adOpen && !this.busy && Game.state === 'play' && !Game.paused) this.act('pause'); });

      document.addEventListener('click', (e) => {
        const b = e.target.closest('[data-action]');
        if (!b) return;
        A.unlock(); A.play('click');
        this.act(b.dataset.action, b);
      });
      // Первый жест пользователя разблокирует звук и запускает музыку
      const unlock = () => { A.unlock(); A.startMusic(); Game.lockLandscape(); };
      root.addEventListener('pointerdown', unlock, { once: false, passive: true });
      root.addEventListener('keydown', unlock, { once: false });

      document.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('selectstart', (e) => e.preventDefault());
      document.addEventListener('dblclick', (e) => e.preventDefault());
      document.addEventListener('touchmove', (e) => { if (!e.target.closest('.panel')) e.preventDefault(); }, { passive: false });
      document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

      Game.init($('#game'), this);
      bar.style.width = '100%';
      setTimeout(() => { this.show('menu'); P.loadingReady(); }, 450);
    },
  };

  UI.AdPace = AdPace; UI.AD_RULES = AD_RULES;
  root.YB.UI = UI;
  root.addEventListener('load', () => UI.boot());
})(window);
