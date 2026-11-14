/* YooBird — физическое ядро (без DOM). Работает и в браузере, и в Node (для тестов). */
(function (root) {
  'use strict';
  const Matter = root.Matter || (typeof require !== 'undefined' ? require('./lib/matter.min.js') : null);
  const { Engine, Bodies, Body, Composite, Events, Sleeping, Vertices } = Matter;

  const C = {
    W: 1920, H: 1080,
    GROUND_Y: 960,
    SLING_X: 300, SLING_Y: 770,
    MAX_PULL: 150,
    MAX_SPEED: 24,           // px за шаг (1/60 c)
    STEP_MS: 1000 / 60,
    GRAVITY_STEP: 0.001 * (1000 / 60) * (1000 / 60), // ускорение за шаг, как в Matter
    DMG_K: 0.42,
    ENEMY_SCORE: 5000,
    BIRD_BONUS: 10000,
    SETTLE_STEPS: 90,
  };

  const MATERIALS = {
    // Трение в Matter «липкое»: при значениях выше ~0.2 блок не съезжает даже с крутого склона,
    // а медленно ползёт. Поэтому коэффициенты небольшие.
    wood:  { density: 0.0012, friction: 0.2,  fs: 0.5, restitution: 0.05, hp: 110, dmgMul: 1.0, score: 500 },
    glass: { density: 0.0010, friction: 0.14, fs: 0.5, restitution: 0.05, hp: 55,  dmgMul: 1.4, score: 300 },
    stone: { density: 0.0030, friction: 0.22, fs: 0.6, restitution: 0.02, hp: 280, dmgMul: 0.6, score: 800 },
    tnt:   { density: 0.0011, friction: 0.2,  fs: 0.5, restitution: 0.05, hp: 22,  dmgMul: 1.0, score: 1000 },
  };
  const TNT_BLAST = { R: 190, dmg: 230, push: 12 };

  const ENEMIES = {
    blue: { r: 30, hp: 45,  density: 0.0015, score: 5000 },
    red:  { r: 34, hp: 150, density: 0.0018, score: 5000 },
    boss: { r: 46, hp: 460, density: 0.0016, score: 15000 },
  };

  const ZERO = { x: 0, y: 0 };
  let ENEMY_FRICTION = 0.3;

  const BIRDS = {
    normal: { r: 26, density: 0.0045 },
    speed:  { r: 23, density: 0.0040 },
    bomb:   { r: 30, density: 0.0050 },
    split:  { r: 25, density: 0.0045 },   // Тройняшка: в полёте делится на троих
    heavy:  { r: 31, density: 0.0062 },   // Пузан: по тапу пикирует вниз и бьёт ударной волной
    boomer: { r: 24, density: 0.0042 },   // Бумеранг: по тапу разворачивается и летит назад
    puff:   { r: 27, density: 0.0040 },   // Пушок: по тапу (или сам после удара) надувается и расталкивает всё вокруг
  };
  const SLAM = { R: 150, dmg: 120, push: 10 };     // удар Пузана о поверхность
  const PUFF = { R: 240, dmg: 50, push: 17, k: 1.7 }; // Пушок: много толчка, мало урона

  class Sim {
    constructor(cb) { this.cb = cb || {}; }

    emit(type, data) { const f = this.cb[type]; if (f) f(data); }

    load(def) {
      this.def = def;
      this.engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
      this.world = this.engine.world;
      this.blocks = []; this.enemies = []; this.statics = [];
      this.bird = null; this.minis = []; this.trail = []; this.toRemove = []; this.pendingBlasts = []; this.pendingSlam = null;
      this.score = 0; this.steps = 0; this.damageOn = false; this.quietSteps = 0; this.asleep = false;
      this.seed = 0x9E3779B9 ^ (def.id || 1);

      const ground = Bodies.rectangle(C.W / 2, C.GROUND_Y + 250, C.W * 6, 500,
        { isStatic: true, friction: 1, label: 'ground' });
      Composite.add(this.world, ground);

      for (const s of def.statics || []) {
        let b;
        if (s.tri) {
          // Скат: треугольник по трём точкам мира
          const cx = (s.tri[0][0] + s.tri[1][0] + s.tri[2][0]) / 3, cy = (s.tri[0][1] + s.tri[1][1] + s.tri[2][1]) / 3;
          b = Body.create({ position: { x: cx, y: cy }, vertices: Vertices.clockwiseSort(s.tri.map(([x, y]) => ({ x, y }))), isStatic: true, friction: 1, label: 'static' });
          b.size = null; b.poly = true;
        } else {
          b = Bodies.rectangle(s.x, s.y, s.w, s.h, { isStatic: true, friction: 1, label: 'static' });
          b.size = { w: s.w, h: s.h };
        }
        b.game = null;
        this.statics.push(b);
        Composite.add(this.world, b);
      }

      let seed = 7;
      for (const it of def.items) {
        if (it.k === 'block') {
          const m = MATERIALS[it.m];
          const shape = it.shape || 'rect';
          const opts = { density: m.density, friction: m.friction, frictionStatic: m.fs == null ? 1 : m.fs, restitution: m.restitution, angle: it.a || 0, label: 'block' };
          let b, area;
          if (shape === 'tri') {
            // Равнобедренный треугольник: основание w внизу, вершина вверху (центр масс на h/6 ниже середины)
            b = Body.create(Object.assign({ position: { x: it.x, y: it.y + it.h / 6 },
              vertices: Vertices.clockwiseSort([{ x: -it.w / 2, y: it.h / 2 }, { x: it.w / 2, y: it.h / 2 }, { x: 0, y: -it.h / 2 }]) }, opts));
            area = (it.w * it.h) / 2;
          } else if (shape === 'circle') {
            b = Bodies.circle(it.x, it.y, it.w / 2, Object.assign(opts, { density: m.density * 1.2, friction: 0.5, frictionStatic: 0.5 }));
            area = Math.PI * (it.w / 2) * (it.w / 2);
          } else {
            b = Bodies.rectangle(it.x, it.y, it.w, it.h, opts);
            area = it.w * it.h;
          }
          const hp = m.hp * Math.max(0.5, Math.min(3, area / 3000));
          b.sleepThreshold = -1;   // тела не засыпают поодиночке: см. sleepAll()
          b.game = { kind: 'block', m: it.m, shape, w: it.w, h: it.h, hp, maxHp: hp, seed: seed++, dead: false };
          this.blocks.push(b);
          Composite.add(this.world, b);
        } else if (it.k === 'enemy') {
          const e = ENEMIES[it.t];
          const b = Bodies.circle(it.x, it.y, e.r, {
            density: e.density, friction: ENEMY_FRICTION, frictionStatic: 0.2, restitution: 0.15, label: 'enemy',
          });
          b.sleepThreshold = -1;
          b.game = { kind: 'enemy', t: it.t, r: e.r, hp: e.hp, maxHp: e.hp, seed: seed++, dead: false };
          this.enemies.push(b);
          Composite.add(this.world, b);
        }
      }

      Events.on(this.engine, 'collisionStart', (ev) => this.onCollide(ev));

      // Даём постройкам «осесть» до начала игры, без урона.
      for (let i = 0; i < C.SETTLE_STEPS; i++) Engine.update(this.engine, C.STEP_MS);
      // Если что-то ещё движется (например, съезжает со склона), даём доехать; затем мир засыпает до первого выстрела
      for (let i = 0; i < 240 && !this.isQuiet(); i++) Engine.update(this.engine, C.STEP_MS);
      if (this.isQuiet()) this.sleepAll();
      this.damageOn = true;
    }

    onCollide(ev) {
      if (!this.damageOn) return;
      for (const p of ev.pairs) {
        const a = p.bodyA.parent || p.bodyA, b = p.bodyB.parent || p.bodyB;
        if (!a.game && !b.game) continue;
        const n = p.collision.normal;
        // getVelocity — скорость, не зависящая от замедления времени (слоу-мо ядерки)
        const va = a.isStatic ? ZERO : Body.getVelocity(a), vb = b.isStatic ? ZERO : Body.getVelocity(b);
        const rvx = va.x - vb.x, rvy = va.y - vb.y;
        const imp = Math.abs(rvx * n.x + rvy * n.y);
        if (imp < 0.8) continue;
        const ma = a.isStatic ? Infinity : a.mass, mb = b.isStatic ? Infinity : b.mass;
        const mu = ma === Infinity ? mb : (mb === Infinity ? ma : (ma * mb) / (ma + mb));
        const E = 0.5 * mu * imp * imp;
        if (E < 4) continue;
        const dmg = E * C.DMG_K;
        const sp = p.collision.supports && p.collision.supports[0];
        const x = sp ? sp.x : (a.position.x + b.position.x) / 2;
        const y = sp ? sp.y : (a.position.y + b.position.y) / 2;
        this.applyImpact(a, dmg, imp, x, y, b);
        this.applyImpact(b, dmg, imp, x, y, a);
      }
    }

    applyImpact(body, dmg, imp, x, y, other) {
      const g = body.game;
      if (!g || g.dead) return;
      if (g.kind === 'bird') {
        if (!g.hit) { g.hit = true; g.hitT = g.t; }
        // Пузан в пике: первое касание — ударная волна
        if (g.dive && !g.slammed) { g.slammed = true; this.pendingSlam = { x: body.position.x, y: body.position.y + g.r * 0.6 }; }
        this.emit('birdHit', { x, y, v: Math.min(1, imp / 14), type: g.type });
        return;
      }
      if (g.kind === 'block') {
        const d = dmg * MATERIALS[g.m].dmgMul;
        g.hp -= d;
        if (g.hp <= 0) {
          this.destroyBlock(body);
          // Птенец пробивает сломанный блок и летит дальше, теряя часть скорости
          if (other && other.game && other.game.kind === 'bird' && !other.game.passV)
            { const ov = Body.getVelocity(other); other.game.passV = { x: ov.x * 0.7, y: ov.y * 0.7 }; }
        } else if (d > 3) this.emit('hit', { m: g.m, x, y, v: Math.min(1, imp / 12) });
      } else if (g.kind === 'enemy') {
        g.hp -= dmg;
        if (g.hp <= 0) this.killEnemy(body);
        else if (dmg > 3) { g.hurtT = 30; this.emit('enemyHurt', { t: g.t, x: body.position.x, y: body.position.y, v: Math.min(1, dmg / 60) }); }
      }
    }

    addScore(pts, x, y) {
      this.score += pts;
      this.emit('score', { pts, x, y, total: this.score });
    }

    destroyBlock(b, silent) {
      const g = b.game; if (g.dead) return;
      g.dead = true; this.toRemove.push(b);
      if (silent) return;
      this.addScore(MATERIALS[g.m].score, b.position.x, b.position.y);
      this.emit('break', { m: g.m, x: b.position.x, y: b.position.y, w: g.w, h: g.h, angle: b.angle, shape: g.shape });
      // Ящик TNT взрывается (после текущего шага физики — так работают и цепные реакции)
      if (g.m === 'tnt') this.pendingBlasts.push({ x: b.position.x, y: b.position.y });
    }

    killEnemy(b) {
      const g = b.game; if (g.dead) return;
      g.dead = true; this.toRemove.push(b);
      this.addScore(ENEMIES[g.t].score || C.ENEMY_SCORE, b.position.x, b.position.y - 40);
      this.emit('enemyDie', { t: g.t, x: b.position.x, y: b.position.y, r: g.r });
    }

    flushBlasts() {
      let guard = 0;
      while (this.pendingBlasts.length && guard++ < 20) {
        const { x, y } = this.pendingBlasts.shift();
        this.emit('explode', { x, y, R: TNT_BLAST.R, tnt: true });
        this.blast(x, y, TNT_BLAST.R, TNT_BLAST.dmg, TNT_BLAST.push, 1);
      }
    }

    flushRemovals() {
      if (!this.toRemove.length) return;
      for (const b of this.toRemove) Composite.remove(this.world, b);
      this.toRemove.length = 0;
      this.blocks = this.blocks.filter((b) => !b.game.dead);
      this.enemies = this.enemies.filter((b) => !b.game.dead);
      this.wakeAll();
    }

    // Сон — только для всего мира сразу. Пока хоть что-то движется, просчитываются все тела,
    // поэтому ни один блок не может «уснуть» в воздухе или на склоне, потеряв опору.
    wakeAll() {
      for (const b of Composite.allBodies(this.world)) if (!b.isStatic && b.isSleeping) Sleeping.set(b, false);
      this.asleep = false; this.quietSteps = 0;
    }
    sleepAll() {
      for (const b of Composite.allBodies(this.world)) if (!b.isStatic && !b.isSleeping) Sleeping.set(b, true);
      this.asleep = true;
    }

    // Детерминированный генератор (чтобы проверка уровней давала повторяемый результат)
    rnd() {
      let t = (this.seed = (this.seed + 0x6D2B79F5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // opts.power — бустер «Мощь»: птенец крупнее и намного тяжелее.
    launch(type, x, y, vx, vy, opts = {}) {
      const bd = BIRDS[type] || BIRDS.normal;
      const r = opts.power ? Math.round(bd.r * 1.35) : bd.r;
      const b = Bodies.circle(x, y, r, {
        density: bd.density * (opts.power ? 2.4 : 1), friction: 0.6, restitution: 0.35, frictionAir: 0.004, label: 'bird',
      });
      b.sleepThreshold = -1;
      b.collisionFilter.group = -1;   // птенцы не сталкиваются друг с другом (важно для Тройняшки)
      this.wakeAll();
      b.game = { kind: 'bird', type, r, t: 0, still: 0, hit: false, hitT: 0, used: false, fuse: 0,
        power: !!opts.power, launchAng: Math.atan2(vy, vx) };
      Composite.add(this.world, b);
      Body.setVelocity(b, { x: vx, y: vy });
      this.bird = b;
      this.trail = [];
      return b;
    }

    // Способность птенца по тапу в полёте.
    ability() {
      const b = this.bird;
      if (!b || b.game.used) return false;
      const g = b.game;
      if (g.type === 'speed') {
        if (g.hit) return false;
        g.used = true;
        const v = Body.getVelocity(b), sp = Math.hypot(v.x, v.y) || 1;
        const ns = Math.max(sp * 1.9, 30);
        Body.setVelocity(b, { x: (v.x / sp) * ns, y: (v.y / sp) * ns });
        this.emit('boost', { x: b.position.x, y: b.position.y, ang: Math.atan2(v.y, v.x) });
        return true;
      }
      if (g.type === 'bomb') { this.explode(b); return true; }
      if (g.type === 'split') {
        if (g.hit) return false;
        this.split(b); return true;
      }
      if (g.type === 'heavy') {
        if (g.hit) return false;
        g.used = true; g.dive = true;
        const v = Body.getVelocity(b);
        Body.setVelocity(b, { x: v.x * 0.18, y: Math.max(v.y, 0) + 26 });
        Body.setDensity(b, b.density * 2.6);
        this.emit('dive', { x: b.position.x, y: b.position.y });
        return true;
      }
      if (g.type === 'boomer') {
        if (g.hit) return false;
        g.used = true;
        const v = Body.getVelocity(b);
        // возвращается быстро и почти горизонтально, как настоящий бумеранг
        const sp = Math.max(Math.hypot(v.x, v.y) * 1.05, 17);
        Body.setVelocity(b, { x: (v.x > 0 ? -1 : 1) * sp, y: -2.5 });
        this.emit('boomerang', { x: b.position.x, y: b.position.y, dir: v.x > 0 ? -1 : 1 });
        return true;
      }
      if (g.type === 'puff') { this.inflate(b); return true; }
      return false;
    }

    // Пушок надувается: сильный толчок во все стороны почти без урона, сам становится большим мячом
    inflate(b) {
      const g = b.game; if (g.used) return; g.used = true; g.puffed = true; g.puffT = 0;
      const x = b.position.x, y = b.position.y;
      this.emit('inflate', { x, y, R: PUFF.R });
      this.blast(x, y, PUFF.R, PUFF.dmg, PUFF.push, 1);
      Body.scale(b, PUFF.k, PUFF.k); g.r = Math.round(g.r * PUFF.k);
      Body.setDensity(b, b.density * 0.35);
      b.frictionAir = 0.03; b.restitution = 0.6;
    }

    // Тройняшка: основной птенец уменьшается, рядом появляются ещё два, разлёт веером ±12°
    split(b) {
      const g = b.game; g.used = true;
      const v = Body.getVelocity(b), sp = Math.hypot(v.x, v.y) || 1, a0 = Math.atan2(v.y, v.x);
      const k = 0.72;
      Body.scale(b, k, k); g.r = Math.round(g.r * k);
      for (const da of [-0.21, 0.21]) {
        const m = Bodies.circle(b.position.x, b.position.y, g.r, { density: BIRDS.split.density, friction: 0.6, restitution: 0.35, frictionAir: 0.004, label: 'bird' });
        m.sleepThreshold = -1; m.collisionFilter.group = -1;
        m.game = { kind: 'bird', type: 'split', r: g.r, t: g.t, still: 0, hit: false, hitT: 0, used: true, fuse: 0, mini: true, launchAng: a0 + da };
        Composite.add(this.world, m);
        Body.setVelocity(m, { x: Math.cos(a0 + da) * sp, y: Math.sin(a0 + da) * sp });
        this.minis.push(m);
      }
      this.emit('split', { x: b.position.x, y: b.position.y, ang: a0 });
    }

    // Обновление одного летящего птенца; true — пора убрать
    tickBird(b) {
      const g = b.game; g.t++;
      if (g.passV) { Body.setVelocity(b, g.passV); g.passV = null; }
      g.still = Body.getSpeed(b) < 0.35 ? g.still + 1 : 0;
      const out = b.position.x > C.W + 250 || b.position.x < -250 || b.position.y > C.H + 150;
      g.out = out;
      return g.still > 50 || g.t > 720 || out || (g.hit && g.t - g.hitT > 240);
    }
    flying() { return !!this.bird || this.minis.length > 0; }

    explode(bird) {
      const g = bird.game; g.used = true;
      const x = bird.position.x, y = bird.position.y;
      this.emit('explode', { x, y, R: 230 });
      this.retireBird(true);
      this.blast(x, y, 230, 240, 14, 1);
    }

    // Ядерный удар (за рекламу): огромная ударная волна. Урон спадает квадратично,
    // так что гарантированно сносит только центр, а края — разбрасывает и калечит.
    nuke(x, y) {
      const R = 520;
      this.emit('nuke', { x, y, R });
      this.blast(x, y, R, 700, 16, 2.5);
    }

    // Бустер «Землетрясение»: трясёт все постройки, стекло трескается сильнее всего.
    quake() {
      const Q = { glass: 0.5, wood: 0.25, stone: 0.1, tnt: 0 };
      this.emit('quake', {});
      this.wakeAll();
      for (const b of this.blocks) {
        if (b.game.dead) continue;
        Sleeping.set(b, false);
        const bv = Body.getVelocity(b);
        Body.setVelocity(b, { x: bv.x + (this.rnd() - 0.5) * 4, y: bv.y - this.rnd() * 3 });
        Body.setAngularVelocity(b, Body.getAngularVelocity(b) + (this.rnd() - 0.5) * 0.06);
        b.game.hp -= b.game.maxHp * Q[b.game.m];
        if (b.game.hp <= 0) this.destroyBlock(b);
      }
      for (const e of this.enemies) {
        if (e.game.dead) continue;
        Sleeping.set(e, false);
        const ev = Body.getVelocity(e);
        Body.setVelocity(e, { x: ev.x + (this.rnd() - 0.5) * 3, y: ev.y - 2 - this.rnd() * 2 });
      }
    }

    blast(x, y, R, dmgMax, push, curve) {
      this.wakeAll();
      for (const b of [...this.blocks, ...this.enemies]) {
        if (b.game.dead) continue;
        const dx = b.position.x - x, dy = b.position.y - y;
        const d = Math.hypot(dx, dy) || 1;
        const size = b.game.kind === 'enemy' ? b.game.r : Math.min(b.game.w, b.game.h) / 2;
        const f = 1 - Math.max(0, d - size) / R;
        if (f <= 0) continue;
        const dv = push * f * Math.min(1.5, 2.5 / Math.sqrt(b.mass));
        Sleeping.set(b, false);
        const bv = Body.getVelocity(b);
        Body.setVelocity(b, { x: bv.x + (dx / d) * dv, y: bv.y + (dy / d) * dv - 2 * f });
        Body.setAngularVelocity(b, Body.getAngularVelocity(b) + (this.rnd() - 0.5) * 0.2 * f);
        const dmg = dmgMax * Math.pow(f, curve);
        if (b.game.kind === 'block') {
          b.game.hp -= dmg * MATERIALS[b.game.m].dmgMul;
          if (b.game.hp <= 0) this.destroyBlock(b);
        } else {
          b.game.hp -= dmg;
          if (b.game.hp <= 0) this.killEnemy(b);
          else { b.game.hurtT = 30; this.emit('enemyHurt', { t: b.game.t, x: b.position.x, y: b.position.y, v: 1 }); }
        }
      }
    }

    retireBird(silent) {
      const b = this.bird; if (!b) return;
      Composite.remove(this.world, b);
      this.bird = null;
      if (!silent) this.emit('birdDone', { x: b.position.x, y: b.position.y, type: b.game.type });
    }

    step() {
      this.steps++;
      Engine.update(this.engine, C.STEP_MS);
      this.flushRemovals();
      if (this.pendingBlasts.length) { this.flushBlasts(); this.flushRemovals(); }
      if (this.pendingSlam) {
        const s = this.pendingSlam; this.pendingSlam = null;
        this.emit('slam', { x: s.x, y: s.y, R: SLAM.R });
        this.blast(s.x, s.y, SLAM.R, SLAM.dmg, SLAM.push, 1.4);
        if (this.bird && this.bird.game.dive) { const v = Body.getVelocity(this.bird); Body.setVelocity(this.bird, { x: v.x * 0.5, y: Math.min(v.y, 0) * 0.3 }); }
        this.flushRemovals();
      }

      const b = this.bird;
      if (b) {
        const g = b.game; g.t++;
        if (g.passV) { Body.setVelocity(b, g.passV); g.passV = null; }
        if (!g.hit && g.t % 3 === 0) this.trail.push({ x: b.position.x, y: b.position.y });
        if (g.type === 'bomb' && !g.used && g.hit) {
          g.fuse++;
          if (g.fuse > 75) this.explode(b);
        }
        // Пушок без тапа надувается сам вскоре после удара; надутый — лопается через ~1.2 с
        if (g.type === 'puff') {
          if (!g.used && g.hit && ++g.fuse > 10) this.inflate(b);
          if (g.puffed && ++g.puffT > 72) { this.emit('pop', { x: b.position.x, y: b.position.y, r: g.r }); this.retireBird(true); }
        }
        if (this.bird) {
          g.still = Body.getSpeed(b) < 0.35 ? g.still + 1 : 0;
          const out = b.position.x > C.W + 250 || b.position.x < -250 || b.position.y > C.H + 150;
          if (g.still > 50 || g.t > 720 || out || (g.hit && g.t - g.hitT > 240)) this.retireBird(out);
        }
      }
      if (this.minis.length) {
        this.minis = this.minis.filter((m) => {
          if (!this.tickBird(m)) return true;
          Composite.remove(this.world, m);
          if (!m.game.out) this.emit('birdDone', { x: m.position.x, y: m.position.y, type: 'split' });
          return false;
        });
      }

      // Сопротивление качению: враги и валуны не катятся по ровной земле бесконечно
      if (!this.asleep) {
        for (const e of this.enemies) { const w = Body.getAngularVelocity(e); if (Math.abs(w) > 0.0005) Body.setAngularVelocity(e, w * 0.972); }
        for (const bl of this.blocks) if (bl.game.shape === 'circle') { const w = Body.getAngularVelocity(bl); if (Math.abs(w) > 0.0005) Body.setAngularVelocity(bl, w * 0.985); }
      }

      // Опрокинутый ящик TNT взрывается
      for (const bl of this.blocks) {
        if (bl.game.m === 'tnt' && !bl.game.dead && this.damageOn && Math.abs(bl.angle) > 0.85) this.destroyBlock(bl);
      }

      // Вылетевшие за пределы мира объекты
      for (const e of this.enemies) {
        const p = e.position;
        // вылетел за край арены (справа его уже не видно) — выбыл
        if (!e.game.dead && (p.x < -200 || p.x > C.W + 70 || p.y > C.H + 200)) this.killEnemy(e);
      }
      for (const bl of this.blocks) {
        const p = bl.position;
        if (!bl.game.dead && (p.x < -300 || p.x > C.W + 400 || p.y > C.H + 300)) this.destroyBlock(bl, true);
      }
      this.flushRemovals();
      if (this.pendingBlasts.length) { this.flushBlasts(); this.flushRemovals(); }
      this.updateSleep();
    }

    enemiesAlive() { return this.enemies.length; }

    // Вызывается в конце шага: мир засыпает целиком, когда всё улеглось
    updateSleep() {
      if (this.asleep) return;
      if (this.isQuiet()) { if (++this.quietSteps >= 50) this.sleepAll(); } else this.quietSteps = 0;
    }

    // Замедление времени (слоу-мо). Урон считается по нормированным скоростям, поэтому не меняется.
    setTimeScale(ts) { this.engine.timing.timeScale = ts; }

    isQuiet() {
      for (const b of Composite.allBodies(this.world)) {
        if (b.isStatic || b.isSleeping) continue;
        if (Body.getSpeed(b) > 0.2 || Math.abs(Body.getAngularVelocity(b)) > 0.01) return false;
      }
      return true;
    }

    // Предсказание траектории (та же интеграция, что и в Matter)
    static predict(x, y, vx, vy, steps, fa = 0.004) {
      const pts = [];
      for (let i = 0; i < steps; i++) {
        vx *= 1 - fa; vy = vy * (1 - fa) + C.GRAVITY_STEP;
        x += vx; y += vy;
        pts.push({ x, y });
        if (y > C.GROUND_Y) break;
      }
      return pts;
    }
  }

  const api = { Sim, C, MATERIALS, ENEMIES, BIRDS, SLAM, PUFF, _setEnemyFriction: (v) => { ENEMY_FRICTION = v; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.YB = Object.assign(root.YB || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
