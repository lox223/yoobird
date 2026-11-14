/* YooBird — процедурные звуки и фоновая музыка (WebAudio, без внешних файлов).
 * Реверберация, стереопанорама по положению на экране, музыка из двух частей с настроениями.
 */
(function (root) {
  'use strict';

  const NOTE = {};
  (function buildNotes() {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let o = 1; o <= 7; o++) names.forEach((n, i) => { NOTE[n + o] = 440 * Math.pow(2, ((o + 1) * 12 + i - 69) / 12); });
  })();
  const bars = (list) => list.join(' ').split(' ');

  // ---------- Мелодии: 16 тактов (часть A + часть B) по 16 шестнадцатых. «.» — пауза ----------
  const TUNES = {
    major: {
      melody: bars([
        'E5 . G5 . C6 . G5 . E5 . G5 . A5 G5 E5 .',
        'D5 . G5 . B5 . G5 . D5 . G5 . B5 A5 G5 .',
        'C5 . E5 . A5 . E5 . C6 . B5 . A5 . E5 .',
        'F5 . A5 . C6 . A5 . G5 . F5 . E5 . D5 .',
        'E5 . . G5 . . C6 . B5 . A5 . G5 . E5 .',
        'D5 . . G5 . . B5 . A5 . G5 . F5 . D5 .',
        'C5 . F5 . A5 . F5 . C6 . A5 . G5 . F5 .',
        'G5 . . . B5 . . . D6 . C6 . B5 . G5 .',
        // часть B
        'A5 . . C6 . . A5 . F5 . A5 . C6 . A5 .',
        'B5 . . D6 . . B5 . G5 . B5 . D6 . B5 .',
        'G5 . . B5 . . G5 . E5 . G5 . B5 . G5 .',
        'A5 . . C6 . . E6 . D6 . C6 . B5 . A5 .',
        'F5 . A5 . C6 . F6 . E6 . C6 . A5 . F5 .',
        'G5 . B5 . D6 . G6 . F6 . D6 . B5 . G5 .',
        'E6 . . D6 . . C6 . G5 . . E5 . . G5 .',
        'C6 . . . G5 . . . C5 . . . . . . .',
      ]),
      chords: [
        ['C3', 'C4', 'E4', 'G4'], ['G2', 'B3', 'D4', 'G4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'A3', 'C4', 'F4'],
        ['C3', 'C4', 'E4', 'G4'], ['G2', 'B3', 'D4', 'G4'], ['F2', 'A3', 'C4', 'F4'], ['G2', 'B3', 'D4', 'F4'],
        ['F2', 'A3', 'C4', 'F4'], ['G2', 'B3', 'D4', 'G4'], ['E2', 'G3', 'B3', 'E4'], ['A2', 'C4', 'E4', 'A4'],
        ['F2', 'A3', 'C4', 'F4'], ['G2', 'B3', 'D4', 'G4'], ['C3', 'C4', 'E4', 'G4'], ['C3', 'C4', 'E4', 'G4'],
      ],
    },
    minor: {
      melody: bars([
        'A4 . C5 . E5 . C5 . A4 . C5 . E5 . A5 .',
        'F4 . A4 . C5 . A4 . F5 . E5 . C5 . A4 .',
        'G4 . C5 . E5 . C5 . G5 . E5 . C5 . G4 .',
        'G4 . B4 . D5 . B4 . D5 . . B4 . . G4 .',
        'A4 . C5 . E5 . A5 . G5 . E5 . C5 . A4 .',
        'F4 . A4 . C5 . F5 . E5 . C5 . A4 . F4 .',
        'E4 . G#4 . B4 . E5 . D5 . B4 . G#4 . E4 .',
        'E5 . . . D5 . . . B4 . . . G#4 . . .',
        // часть B
        'D5 . F5 . A5 . F5 . D5 . F5 . A5 . D6 .',
        'C6 . A5 . E5 . A5 . C6 . . A5 . . E5 .',
        'B5 . G#5 . E5 . G#5 . B5 . . E6 . . B5 .',
        'A5 . . . E5 . . . C5 . E5 . A5 . . .',
        'D5 . F5 . A5 . D6 . C6 . A5 . F5 . D5 .',
        'E5 . A5 . C6 . E6 . D6 . C6 . A5 . E5 .',
        'F5 . A5 . C6 . A5 . F5 . . A5 . . C6 .',
        'B5 . . G#5 . . E5 . D5 . . B4 . . . .',
      ]),
      chords: [
        ['A2', 'C4', 'E4', 'A4'], ['F2', 'A3', 'C4', 'F4'], ['C3', 'C4', 'E4', 'G4'], ['G2', 'B3', 'D4', 'G4'],
        ['A2', 'C4', 'E4', 'A4'], ['F2', 'A3', 'C4', 'F4'], ['E2', 'G#3', 'B3', 'E4'], ['E2', 'G#3', 'B3', 'E4'],
        ['D3', 'A3', 'D4', 'F4'], ['A2', 'C4', 'E4', 'A4'], ['E2', 'G#3', 'B3', 'E4'], ['A2', 'C4', 'E4', 'A4'],
        ['D3', 'A3', 'D4', 'F4'], ['A2', 'C4', 'E4', 'A4'], ['F2', 'A3', 'C4', 'F4'], ['E2', 'G#3', 'B3', 'E4'],
      ],
    },
  };

  // Настроения: день (меню, полдень), закат, ночь (сумерки и ночь), босс
  const MOODS = {
    day:    { tune: 'major', bpm: 116, lead: 'square',   leadVol: 0.060, cutoff: 2600, drums: 1,    four: false, arp: true },
    sunset: { tune: 'major', bpm: 104, lead: 'triangle', leadVol: 0.085, cutoff: 2000, drums: 0.7,  four: false, arp: false },
    night:  { tune: 'minor', bpm: 100, lead: 'triangle', leadVol: 0.085, cutoff: 1800, drums: 0.55, four: false, arp: true },
    winter: { tune: 'major', bpm: 96,  lead: 'sine',     leadVol: 0.095, cutoff: 3200, drums: 0.45, four: false, arp: true },
    volcano:{ tune: 'minor', bpm: 122, lead: 'square',   leadVol: 0.050, cutoff: 1500, drums: 1.0,  four: true,  arp: false },
    boss:   { tune: 'minor', bpm: 134, lead: 'sawtooth', leadVol: 0.050, cutoff: 2400, drums: 1.15, four: true,  arp: true },
  };
  const MUSIC_VOL = 0.34;
  const NO_DETUNE = new Set(['click', 'score', 'bonus', 'star', 'win', 'lose', 'combo', 'sight', 'powerUp', 'nukeOffer', 'whoosh', 'ach', 'tick']);

  const A = {
    ctx: null, master: null, musicBus: null, sfxBus: null, noiseBuf: null, reverb: null, delay: null,
    musicOn: true, sfxOn: true,
    externalPause: 0,          // реклама / скрытая вкладка — счётчик причин паузы
    musicWanted: false, timer: null, step: 0, nextTime: 0,
    mood: 'day', nextMood: null,
    last: {}, _cur: null, _det: 1,

    init() {
      if (this.ctx) return true;
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC(); } catch (e) { return false; }
      const c = this.ctx;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
      comp.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(comp);
      this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicOn ? MUSIC_VOL : 0; this.musicBus.connect(this.master);
      this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.9 : 0; this.sfxBus.connect(this.master);

      // Шум для ударных и эффектов
      const len = c.sampleRate * 2;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      // Реверберация: синтезированный импульс «открытого поля»
      try {
        const rl = Math.floor(c.sampleRate * 1.7), ir = c.createBuffer(2, rl, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const x = ir.getChannelData(ch);
          for (let i = 0; i < rl; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6);
        }
        this.reverb = c.createConvolver(); this.reverb.buffer = ir;
        const out = c.createGain(); out.gain.value = 0.55; this.reverb.connect(out); out.connect(this.master);
        const sSend = c.createGain(); sSend.gain.value = 0.22; this.sfxBus.connect(sSend); sSend.connect(this.reverb);
        const mSend = c.createGain(); mSend.gain.value = 0.16; this.musicBus.connect(mSend); mSend.connect(this.reverb);
      } catch (e) { this.reverb = null; }

      // Эхо для мелодии
      this.delay = c.createDelay(1); this.delay.delayTime.value = 0.3;
      const fb = c.createGain(); fb.gain.value = 0.3;
      const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 1800;
      const dOut = c.createGain(); dOut.gain.value = 0.32;
      this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay); dl.connect(dOut); dOut.connect(this.musicBus);
      return true;
    },

    // Вызывается на первый жест пользователя (требование браузеров).
    unlock() {
      if (!this.init()) return;
      if (this.ctx.state === 'suspended' && this.externalPause === 0) this.ctx.resume();
      if (this.musicWanted && !this.timer) this._startScheduler();
    },

    pushPause() {
      this.externalPause++;
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
    },
    popPause() {
      this.externalPause = Math.max(0, this.externalPause - 1);
      if (this.externalPause === 0 && this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMusic(on) {
      this.musicOn = on;
      if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, this.ctx.currentTime, 0.05);
      if (on && this.musicWanted) this._startScheduler(); else if (!on) this._stopScheduler();
    },
    setSfx(on) {
      this.sfxOn = on;
      if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.02);
    },

    // Приглушить музыку на время (ядерный взрыв), затем плавно вернуть.
    duck(sec) {
      if (!this.ctx || !this.musicOn) return;
      const g = this.musicBus.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.03, t + 0.3);
      g.setValueAtTime(0.03, t + sec - 1.5);
      g.linearRampToValueAtTime(MUSIC_VOL, t + sec);
    },

    // ---------- Музыка ----------
    startMusic() { this.musicWanted = true; if (this.ctx && this.musicOn) this._startScheduler(); },
    stopMusic() { this.musicWanted = false; this._stopScheduler(); },
    // Смена настроения — с начала следующего такта, без обрыва
    setMood(m) { if (!MOODS[m]) m = 'day'; if (m !== this.mood) this.nextMood = m; else this.nextMood = null; },

    _startScheduler() {
      if (this.timer || !this.ctx || !this.musicOn) return;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this._schedule(), 50);
    },
    _stopScheduler() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },

    _schedule() {
      const c = this.ctx;
      if (!c || c.state !== 'running') return;
      if (this.nextTime < c.currentTime - 0.3) this.nextTime = c.currentTime + 0.05;
      while (this.nextTime < c.currentTime + 0.25) {
        if (this.nextMood && this.step % 4 === 0) {
          const from = MOODS[this.mood].tune, to = MOODS[this.nextMood].tune;
          this.mood = this.nextMood; this.nextMood = null;
          if (from !== to) this.step = 0; else this.step -= this.step % 16;
        }
        const M = MOODS[this.mood], sd = 60 / M.bpm / 4;
        this.delay.delayTime.setValueAtTime(sd * 3, this.nextTime);
        this._playStep(this.step, this.nextTime, sd, M);
        this.nextTime += sd;
        this.step = (this.step + 1) % 256;
      }
    },

    _playStep(s, t, sd, M) {
      const T = TUNES[M.tune], bar = Math.floor(s / 16), i = s % 16, ch = T.chords[bar], partB = bar >= 8;
      const bus = this.musicBus, dv = M.drums;

      // Мелодия: «щипок» из двух слегка расстроенных голосов + эхо
      const n = T.melody[s];
      if (n && n !== '.') {
        let len = 1; while (len < 4 && T.melody[(s + len) % 256] === '.') len++;
        const f = NOTE[n], d = sd * len * 0.92;
        this._pluck({ type: M.lead, f, t, d, vol: M.leadVol, cutoff: M.cutoff, dest: bus, send: true });
        this._pluck({ type: 'triangle', f: f * 1.006, t, d: d * 0.8, vol: M.leadVol * 0.55, cutoff: M.cutoff, dest: bus });
        this._tone({ type: 'sine', f: f * 2, t, a: 0.005, d: sd * 1.1, vol: 0.018, dest: bus });
      }

      // Пэд: мягкий аккорд на весь такт
      if (i === 0) for (let k = 1; k < 4; k++) {
        this._tone({ type: 'triangle', f: NOTE[ch[k]], t, a: sd * 3, d: sd * 12, vol: 0.022, dest: bus });
        this._tone({ type: 'sine', f: NOTE[ch[k]] * 1.004, t, a: sd * 3, d: sd * 12, vol: 0.02, dest: bus });
      }

      // Бас: треугольник + суб
      const bassOn = M.four ? (i % 2 === 0) : (i === 0 || i === 6 || i === 8 || i === 11 || i === 14);
      if (bassOn) {
        const up = M.four ? (i % 4 === 2) : (i === 6 || i === 14);
        const f = NOTE[ch[0]] * (up ? 2 : 1);
        this._tone({ type: 'triangle', f, t, a: 0.005, d: sd * (M.four ? 1.3 : 1.9), vol: 0.2, dest: bus });
        this._tone({ type: 'sine', f: f / (up ? 2 : 1), t, a: 0.005, d: sd * 1.6, vol: 0.12, dest: bus });
      }

      // Аккордовые «чики» на слабые доли; во второй части — арпеджио
      if (i % 4 === 2) for (let k = 1; k < 4; k++) this._tone({ type: 'triangle', f: NOTE[ch[k]], t, a: 0.004, d: sd * 0.85, vol: 0.032, dest: bus });
      if (partB && M.arp) this._tone({ type: 'triangle', f: NOTE[ch[1 + (i % 3)]] * 2, t, a: 0.003, d: sd * 0.7, vol: 0.022, dest: bus });

      // Ударные
      const kick = M.four ? (i % 4 === 0) : (i === 0 || i === 8 || (i === 10 && bar % 2 === 1) || (i === 7 && partB));
      if (kick) {
        this._tone({ type: 'sine', f: 150, f2: 40, t, a: 0.002, d: 0.17, vol: 0.42 * dv, dest: bus });
        this._noise({ t, d: 0.02, vol: 0.08 * dv, filter: 'lowpass', freq: 1200, dest: bus });
      }
      if (i === 4 || i === 12) {
        this._noise({ t, d: 0.13, vol: 0.13 * dv, filter: 'bandpass', freq: 1900, q: 0.8, dest: bus });
        this._tone({ type: 'triangle', f: 210, f2: 150, t, a: 0.002, d: 0.08, vol: 0.09 * dv, dest: bus });
        if (partB) this._noise({ t: t + 0.012, d: 0.09, vol: 0.07 * dv, filter: 'bandpass', freq: 1300, q: 1.4, dest: bus });
      }
      if (i % 2 === 0) this._noise({ t, d: i % 4 === 2 ? 0.07 : 0.028, vol: (i % 4 === 2 ? 0.055 : 0.032) * dv, filter: 'highpass', freq: 7500, dest: bus });
      else if (partB || M.four) this._noise({ t, d: 0.02, vol: 0.016 * dv, filter: 'highpass', freq: 9000, dest: bus });
      // Сбивка в конце каждой части
      if (bar % 8 === 7 && i >= 12) this._noise({ t, d: 0.07, vol: (0.06 + (i - 12) * 0.025) * dv, filter: 'bandpass', freq: 1700 + (i - 12) * 250, q: 1, dest: bus });
    },

    // ---------- Примитивы ----------
    _env(g, t, a, d, vol) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    },

    _tone({ type = 'sine', f = 440, f2 = null, t = 0, a = 0.005, d = 0.2, vol = 0.3, dest = null, lp = 0, vib = 0 }) {
      const c = this.ctx;
      const k = dest ? 1 : this._det;     // лёгкая случайная расстройка — только для эффектов
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f * k, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * k), t + a + d);
      let node = o;
      if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
      if (vib) {
        const l = c.createOscillator(), lg = c.createGain();
        l.frequency.value = vib; lg.gain.value = f * 0.03; l.connect(lg); lg.connect(o.frequency);
        l.start(t); l.stop(t + a + d + 0.05);
      }
      node.connect(g); g.connect(dest || this._cur || this.sfxBus);
      this._env(g, t, a, d, vol);
      o.start(t); o.stop(t + a + d + 0.05);
    },

    // «Щипок»: фильтр быстро закрывается, как у струны
    _pluck({ type, f, t, d, vol, cutoff, dest, send }) {
      const c = this.ctx;
      const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      fl.type = 'lowpass'; fl.Q.value = 2;
      fl.frequency.setValueAtTime(cutoff * 1.6, t);
      fl.frequency.exponentialRampToValueAtTime(Math.max(300, cutoff * 0.35), t + Math.max(0.08, d));
      o.connect(fl); fl.connect(g); g.connect(dest);
      if (send && this.delay) g.connect(this.delay);
      this._env(g, t, 0.006, d, vol);
      o.start(t); o.stop(t + d + 0.06);
    },

    _noise({ t = 0, a = 0.003, d = 0.2, vol = 0.3, filter = 'lowpass', freq = 1000, freq2 = null, q = 1, dest = null }) {
      const c = this.ctx;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const fl = c.createBiquadFilter(); fl.type = filter; fl.Q.value = q;
      fl.frequency.setValueAtTime(freq, t);
      if (freq2) fl.frequency.exponentialRampToValueAtTime(freq2, t + a + d);
      const g = c.createGain();
      s.connect(fl); fl.connect(g); g.connect(dest || this._cur || this.sfxBus);
      this._env(g, t, a, d, vol);
      s.start(t, Math.random() * 1.5); s.stop(t + a + d + 0.05);
    },

    // ---------- Звуковые эффекты ----------
    // o.x — положение в мире (0..1920): звук слышен слева или справа. o.v — сила 0..1.
    play(name, o = {}) {
      if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const gap = o.gap != null ? o.gap : 0.045;
      if (this.last[name] && now - this.last[name] < gap) return;
      this.last[name] = now;
      const fn = SFX[name];
      if (!fn) return;
      this._det = NO_DETUNE.has(name) ? 1 : 0.94 + Math.random() * 0.12;
      this._cur = null;
      if (o.x != null && this.ctx.createStereoPanner) {
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-0.8, Math.min(0.8, (o.x - 960) / 1100));
        p.connect(this.sfxBus); this._cur = p;
      }
      fn.call(this, now, o.v == null ? 1 : o.v, o);
      this._cur = null; this._det = 1;
    },
  };

  const rand = (a, b) => a + Math.random() * (b - a);

  const SFX = {
    click(t) {
      this._tone({ type: 'square', f: 660, f2: 990, t, d: 0.06, vol: 0.1, lp: 3000 });
      this._tone({ type: 'sine', f: 1320, t: t + 0.03, d: 0.05, vol: 0.05 });
    },
    whoosh(t) {
      this._noise({ t, a: 0.05, d: 0.28, vol: 0.14, filter: 'bandpass', freq: 500, freq2: 2400, q: 1.2 });
    },
    grab(t) {
      this._tone({ type: 'sawtooth', f: 180, f2: 320, t, d: 0.12, vol: 0.08, lp: 900 });
      this._tone({ type: 'sine', f: 1800, f2: 2300, t: t + 0.02, d: 0.05, vol: 0.08 });
    },
    // скрип натягиваемой резинки: чем сильнее натянута, тем выше
    stretch(t, v) {
      this._tone({ type: 'sawtooth', f: 110 + v * 240, f2: 130 + v * 260, t, a: 0.004, d: 0.045, vol: 0.05, lp: 700 + v * 900 });
      this._noise({ t, d: 0.02, vol: 0.02, filter: 'bandpass', freq: 900 + v * 1400, q: 4 });
    },
    hop(t) {
      this._tone({ type: 'sine', f: 520, f2: 980, t, d: 0.09, vol: 0.12 });
      this._tone({ type: 'sine', f: 1900, f2: 2500, t: t + 0.05, d: 0.05, vol: 0.07 });
    },
    // чириканье птенцов в очереди
    chirp(t) {
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) this._tone({ type: 'sine', f: rand(2300, 2800), f2: rand(3000, 3600), t: t + i * 0.09, a: 0.004, d: 0.05, vol: 0.05 });
    },
    launch(t) {
      // резинка: щелчок и вибрация
      this._tone({ type: 'triangle', f: 230, f2: 80, t, d: 0.28, vol: 0.34, vib: 38 });
      this._noise({ t, d: 0.03, vol: 0.2, filter: 'highpass', freq: 2500 });
      // свист воздуха
      this._noise({ t, a: 0.02, d: 0.45, vol: 0.22, filter: 'bandpass', freq: 600, freq2: 2800, q: 1.5 });
      // чирик птенца
      this._tone({ type: 'sine', f: 1500, f2: 2600, t: t + 0.03, d: 0.07, vol: 0.17 });
      this._tone({ type: 'sine', f: 1700, f2: 3000, t: t + 0.12, d: 0.08, vol: 0.15 });
      this._tone({ type: 'sine', f: 2000, f2: 3200, t: t + 0.22, d: 0.06, vol: 0.11 });
    },
    birdHit(t, v) {
      this._tone({ type: 'sine', f: 2400, f2: 1400, t, d: 0.09, vol: 0.12 * v + 0.04 });
      this._tone({ type: 'sine', f: 190, f2: 110, t, d: 0.08, vol: 0.2 * v });
      this._noise({ t, d: 0.06, vol: 0.12 * v, filter: 'lowpass', freq: 1200 });
    },
    boost(t) {
      this._noise({ t, a: 0.01, d: 0.35, vol: 0.3, filter: 'bandpass', freq: 700, freq2: 4500, q: 2 });
      this._tone({ type: 'sawtooth', f: 300, f2: 1400, t, d: 0.22, vol: 0.08, lp: 2500 });
      this._tone({ type: 'sine', f: 2200, f2: 3400, t: t + 0.02, d: 0.08, vol: 0.14 });
    },
    // Тройняшка разделяется: хлопок и три «чирика» разной высоты
    split(t) {
      this._noise({ t, a: 0.002, d: 0.08, vol: 0.22, filter: 'bandpass', freq: 1800, q: 1.5 });
      this._tone({ type: 'sine', f: 700, f2: 1400, t, d: 0.07, vol: 0.18 });
      [2100, 2600, 3100].forEach((f, i) => this._tone({ type: 'sine', f, f2: f * 1.25, t: t + 0.03 + i * 0.05, d: 0.06, vol: 0.12 }));
    },
    // Пузан пикирует: падающий свист
    dive(t) {
      this._tone({ type: 'sine', f: 1800, f2: 380, t, a: 0.01, d: 0.45, vol: 0.13 });
      this._noise({ t, a: 0.02, d: 0.35, vol: 0.18, filter: 'bandpass', freq: 2500, freq2: 600, q: 2 });
    },
    // удар Пузана о землю: тяжёлое «бух» и дребезг
    slam(t) {
      this._tone({ type: 'sine', f: 110, f2: 32, t, d: 0.55, vol: 0.7 });
      this._noise({ t, a: 0.002, d: 0.4, vol: 0.55, filter: 'lowpass', freq: 1400, freq2: 120, q: 0.8 });
      this._tone({ type: 'square', f: 70, f2: 45, t, d: 0.18, vol: 0.08, lp: 600 });
    },
    // Бумеранг разворачивается: «вжух» туда-обратно
    boomerang(t) {
      this._noise({ t, a: 0.01, d: 0.18, vol: 0.22, filter: 'bandpass', freq: 900, freq2: 3500, q: 3 });
      this._noise({ t: t + 0.16, a: 0.01, d: 0.2, vol: 0.2, filter: 'bandpass', freq: 3500, freq2: 900, q: 3 });
      this._tone({ type: 'triangle', f: 600, f2: 1300, t, d: 0.12, vol: 0.1 });
      this._tone({ type: 'triangle', f: 1300, f2: 700, t: t + 0.14, d: 0.14, vol: 0.09 });
    },
    // Пушок надувается: быстрое «ф-ф-фух» вверх
    inflate(t) {
      this._noise({ t, a: 0.03, d: 0.3, vol: 0.3, filter: 'lowpass', freq: 600, freq2: 3000, q: 1 });
      this._tone({ type: 'sine', f: 220, f2: 900, t, a: 0.02, d: 0.28, vol: 0.2 });
      this._tone({ type: 'sine', f: 120, f2: 60, t: t + 0.05, d: 0.3, vol: 0.35 });
    },
    // Пушок лопается
    pop(t) {
      this._noise({ t, a: 0.001, d: 0.06, vol: 0.45, filter: 'highpass', freq: 1200 });
      this._tone({ type: 'sine', f: 900, f2: 300, t, d: 0.08, vol: 0.18 });
      [1800, 2400].forEach((f, i) => this._tone({ type: 'sine', f, f2: f * 1.3, t: t + 0.04 + i * 0.05, d: 0.05, vol: 0.08 }));
    },
    explode(t) {
      this._noise({ t, a: 0.003, d: 0.12, vol: 0.7, filter: 'highpass', freq: 1500 });
      this._noise({ t, a: 0.005, d: 1.0, vol: 0.8, filter: 'lowpass', freq: 2400, freq2: 90, q: 0.7 });
      this._tone({ type: 'sine', f: 130, f2: 28, t, d: 0.75, vol: 0.75 });
      this._tone({ type: 'triangle', f: 65, f2: 24, t, d: 0.9, vol: 0.35 });
      for (let i = 0; i < 5; i++) this._noise({ t: t + 0.12 + Math.random() * 0.5, d: 0.07, vol: 0.12, filter: 'bandpass', freq: rand(300, 1500), q: 3 });
    },
    poof(t) {
      this._noise({ t, a: 0.02, d: 0.18, vol: 0.12, filter: 'bandpass', freq: 1300, q: 1.2 });
      this._tone({ type: 'sine', f: 900, f2: 1600, t, d: 0.08, vol: 0.05 });
    },
    enemyHurt(t, v, o) {
      const base = { red: 300, boss: 190 }[o.t] || 460;
      this._tone({ type: 'sawtooth', f: base * 1.35, f2: base * 0.8, t, a: 0.01, d: 0.2, vol: 0.14, lp: 1600, vib: 18 });
      this._tone({ type: 'square', f: base * 2.6, f2: base * 1.6, t: t + 0.02, d: 0.08, vol: 0.04, lp: 2500 });
    },
    enemyDie(t, v, o) {
      const base = { red: 260, boss: 150 }[o.t] || 400;
      if (o.t === 'boss') {
        this._tone({ type: 'sine', f: 90, f2: 30, t, d: 0.7, vol: 0.5 });
        this._tone({ type: 'sawtooth', f: 220, f2: 55, t: t + 0.1, a: 0.02, d: 1.0, vol: 0.12, lp: 900, vib: 5 });
      }
      this._noise({ t, a: 0.002, d: 0.22, vol: 0.4, filter: 'lowpass', freq: 3500, freq2: 300 });
      this._tone({ type: 'sine', f: 900, f2: 300, t, d: 0.06, vol: 0.25 });
      this._tone({ type: 'sawtooth', f: base * 1.5, f2: base * 0.35, t: t + 0.05, d: 0.55, vol: 0.14, lp: 1400, vib: 9 });
      this._tone({ type: 'triangle', f: 1300, f2: 2400, t: t + 0.12, d: 0.12, vol: 0.08 });
    },
    taunt(t, v, o) {
      const base = { red: 330, boss: 220 }[o.t] || 480;
      for (let i = 0; i < 3; i++) this._tone({ type: 'square', f: base * (1.25 - i * 0.08), f2: base * (1.05 - i * 0.08), t: t + i * 0.13, a: 0.01, d: 0.09, vol: 0.07, lp: 1800, vib: 12 });
    },
    woodHit(t, v) {
      this._noise({ t, d: 0.09, vol: 0.22 * v + 0.05, filter: 'bandpass', freq: rand(350, 520), q: 3 });
      this._tone({ type: 'sine', f: rand(150, 190), f2: 100, t, d: 0.1, vol: 0.18 * v + 0.04 });
      this._tone({ type: 'triangle', f: rand(420, 520), f2: 300, t, d: 0.05, vol: 0.06 * v });
    },
    woodBreak(t) {
      for (let i = 0; i < 5; i++) this._noise({ t: t + i * rand(0.02, 0.04), d: 0.08, vol: 0.25, filter: 'bandpass', freq: rand(300, 900), q: 2.5 });
      this._tone({ type: 'sine', f: 110, f2: 55, t, d: 0.22, vol: 0.3 });
      this._tone({ type: 'square', f: rand(200, 260), f2: 120, t: t + 0.03, d: 0.06, vol: 0.05, lp: 900 });
    },
    tntHit(t, v) { SFX.woodHit.call(this, t, v); },
    tntBreak(t) { this._tone({ type: 'sine', f: 1800, f2: 3200, t, d: 0.05, vol: 0.08 }); },
    glassHit(t, v) {
      this._tone({ type: 'sine', f: rand(2400, 3200), t, d: 0.18, vol: 0.1 * v + 0.03 });
      this._tone({ type: 'sine', f: rand(3600, 4400), t, d: 0.1, vol: 0.05 * v + 0.02 });
    },
    glassBreak(t) {
      this._noise({ t, a: 0.002, d: 0.35, vol: 0.3, filter: 'highpass', freq: 3000 });
      for (let i = 0; i < 9; i++) this._tone({ type: 'sine', f: rand(2000, 5600), t: t + rand(0, 0.25), d: rand(0.06, 0.18), vol: 0.055 });
    },
    stoneHit(t, v) {
      this._tone({ type: 'sine', f: 95, f2: 55, t, d: 0.16, vol: 0.3 * v + 0.08 });
      this._noise({ t, d: 0.12, vol: 0.2 * v + 0.05, filter: 'lowpass', freq: 600 });
      this._noise({ t, d: 0.03, vol: 0.1 * v, filter: 'bandpass', freq: 2200, q: 2 });
    },
    stoneBreak(t) {
      this._noise({ t, a: 0.005, d: 0.55, vol: 0.45, filter: 'lowpass', freq: 900, freq2: 180 });
      this._tone({ type: 'sine', f: 75, f2: 38, t, d: 0.35, vol: 0.4 });
      for (let i = 0; i < 4; i++) this._noise({ t: t + 0.1 + i * 0.07, d: 0.06, vol: 0.15, filter: 'bandpass', freq: rand(400, 800), q: 2 });
    },
    score(t) {
      this._tone({ type: 'square', f: 880, t, d: 0.07, vol: 0.06, lp: 3000 });
      this._tone({ type: 'square', f: 1320, t: t + 0.07, d: 0.1, vol: 0.06, lp: 3000 });
    },
    // комбо: каждая следующая жертва — на тон выше
    combo(t, v, o) {
      const f = 660 * Math.pow(2, (Math.min(6, o.i || 2) * 2) / 12);
      this._tone({ type: 'triangle', f, t, d: 0.12, vol: 0.2 });
      this._tone({ type: 'triangle', f: f * 1.5, t: t + 0.07, d: 0.2, vol: 0.18 });
      this._tone({ type: 'sine', f: f * 3, t: t + 0.07, d: 0.25, vol: 0.05 });
    },
    bonus(t) {
      this._tone({ type: 'triangle', f: 1046, t, d: 0.1, vol: 0.15 });
      this._tone({ type: 'triangle', f: 1568, t: t + 0.08, d: 0.18, vol: 0.15 });
      this._tone({ type: 'sine', f: 2093, t: t + 0.08, d: 0.2, vol: 0.06 });
    },
    star(t, v, o) {
      const f = [784, 988, 1175][o.i || 0];
      this._tone({ type: 'triangle', f, t, d: 0.4, vol: 0.22 });
      this._tone({ type: 'sine', f: f * 2, t: t + 0.03, d: 0.35, vol: 0.08 });
      this._tone({ type: 'sine', f: f * 3, t: t + 0.06, d: 0.25, vol: 0.04 });
      this._noise({ t, d: 0.25, vol: 0.04, filter: 'highpass', freq: 8000 });
    },
    sight(t) {
      this._tone({ type: 'sine', f: 1200, t, d: 0.07, vol: 0.12 });
      this._tone({ type: 'sine', f: 1800, t: t + 0.08, d: 0.12, vol: 0.12 });
      this._tone({ type: 'triangle', f: 2400, t: t + 0.16, d: 0.18, vol: 0.08 });
    },
    powerUp(t) {
      [392, 523, 659, 784, 1046].forEach((f, i) => this._tone({ type: 'square', f, t: t + i * 0.05, d: 0.1, vol: 0.07, lp: 2800 }));
      this._tone({ type: 'sawtooth', f: 110, f2: 220, t, d: 0.35, vol: 0.12, lp: 900 });
    },
    quake(t) {
      this._noise({ t, a: 0.05, d: 1.5, vol: 0.6, filter: 'lowpass', freq: 220, freq2: 90, q: 1 });
      this._tone({ type: 'sine', f: 48, f2: 34, t, a: 0.05, d: 1.4, vol: 0.55, vib: 7 });
      for (let i = 0; i < 6; i++) this._noise({ t: t + 0.1 + i * 0.2 + Math.random() * 0.1, d: 0.12, vol: 0.25, filter: 'bandpass', freq: 200 + Math.random() * 300, q: 2 });
    },
    nukeOffer(t) {
      this._tone({ type: 'sine', f: 660, t, d: 0.1, vol: 0.06 });
      this._tone({ type: 'sine', f: 990, t: t + 0.1, d: 0.14, vol: 0.05 });
    },
    nukeFall(t) {
      // время замедляется
      this._tone({ type: 'sawtooth', f: 520, f2: 70, t, a: 0.02, d: 1.0, vol: 0.12, lp: 1200 });
      this._noise({ t, a: 0.05, d: 0.9, vol: 0.18, filter: 'bandpass', freq: 3000, freq2: 300, q: 1.2 });
      // свист падающей бомбы
      this._tone({ type: 'sine', f: 2100, f2: 520, t: t + 0.1, a: 0.2, d: 1.25, vol: 0.16, vib: 5 });
      this._tone({ type: 'sine', f: 2140, f2: 530, t: t + 0.1, a: 0.2, d: 1.25, vol: 0.07 });
    },
    nukeBoom(t) {
      // удар
      this._noise({ t, a: 0.003, d: 0.25, vol: 1.0, filter: 'highpass', freq: 800 });
      this._tone({ type: 'sine', f: 140, f2: 26, t, a: 0.005, d: 2.6, vol: 1.0 });
      this._tone({ type: 'triangle', f: 70, f2: 22, t, a: 0.01, d: 3.2, vol: 0.6 });
      // раскатистый грохот
      this._noise({ t, a: 0.02, d: 4.2, vol: 0.95, filter: 'lowpass', freq: 2600, freq2: 70, q: 0.6 });
      this._noise({ t: t + 0.15, a: 0.3, d: 3.5, vol: 0.45, filter: 'bandpass', freq: 400, freq2: 90, q: 0.8 });
      // треск обломков
      for (let i = 0; i < 18; i++) this._noise({ t: t + 0.2 + Math.random() * 2.2, d: 0.06 + Math.random() * 0.1, vol: 0.12 + Math.random() * 0.12, filter: 'bandpass', freq: 300 + Math.random() * 1800, q: 3 });
      // эхо
      for (let k = 1; k <= 3; k++) this._noise({ t: t + k * 0.55, a: 0.02, d: 0.9, vol: 0.35 / k, filter: 'lowpass', freq: 900 / k, q: 0.7 });
      // «звон в ушах» после вспышки
      this._tone({ type: 'sine', f: 3800, t: t + 0.05, a: 0.1, d: 2.2, vol: 0.025 });
    },
    ach(t) {
      [784, 988, 1175, 1568].forEach((f, i) => {
        this._tone({ type: 'triangle', f, t: t + i * 0.07, d: 0.22, vol: 0.16 });
        this._tone({ type: 'sine', f: f * 2, t: t + i * 0.07, d: 0.18, vol: 0.05 });
      });
      this._noise({ t: t + 0.2, d: 0.4, vol: 0.05, filter: 'highpass', freq: 8000 });
    },
    tick(t, v) {
      this._tone({ type: 'square', f: 900 + v * 700, t, d: 0.03, vol: 0.04, lp: 3500 });
    },
    win(t) {
      const seq = [523, 659, 784, 1046, 1319];
      seq.forEach((f, i) => {
        this._tone({ type: 'square', f, t: t + i * 0.1, d: 0.14, vol: 0.07, lp: 3200 });
        this._tone({ type: 'triangle', f, t: t + i * 0.1, d: 0.16, vol: 0.14 });
      });
      [523, 659, 784, 1046].forEach((f) => this._tone({ type: 'triangle', f, t: t + 0.55, a: 0.02, d: 0.9, vol: 0.09 }));
      this._tone({ type: 'sine', f: 131, t: t + 0.55, a: 0.02, d: 0.9, vol: 0.2 });
      this._noise({ t: t + 0.55, d: 0.5, vol: 0.06, filter: 'highpass', freq: 7000 });
    },
    lose(t) {
      const seq = [[392, 370], [349, 330], [311, 294], [294, 262]];
      seq.forEach(([a, b], i) => this._tone({
        type: 'sawtooth', f: a, f2: b, t: t + i * 0.32, a: 0.02, d: i === 3 ? 0.8 : 0.28,
        vol: 0.12, lp: 1300, vib: i === 3 ? 6 : 0,
      }));
    },
  };

  root.YB = Object.assign(root.YB || {}, { Audio: A, AudioData: { TUNES, MOODS } });
})(typeof window !== 'undefined' ? window : globalThis);
