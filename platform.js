/* YooBird — слой платформы: Игры ВКонтакте (VK Bridge) + локальная заглушка.
 * Вся работа с рекламой, сохранениями и языком собрана здесь, остальная игра о платформе не знает.
 * Чтобы выпустить игру на другой площадке, достаточно написать ещё один адаптер с теми же методами.
 */
(function (root) {
  'use strict';
  const SAVE_KEY = 'yoobird_save_v1';
  const LAUNCH = new URLSearchParams(root.location.search);

  // Обёртка над bridge.send с таймаутом: промис никогда не «зависнет».
  function send(method, params, timeout = 8000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; reject(new Error(method + ' timeout')); } }, timeout);
      root.vkBridge.send(method, params || {}).then(
        (r) => { if (!done) { done = true; clearTimeout(t); resolve(r); } },
        (e) => { if (!done) { done = true; clearTimeout(t); reject(e); } },
      );
    });
  }

  const P = {
    name: 'local',
    isVK: false,
    adOpen: false,
    onPause: null, onResume: null,    // назначает игра
    _rewardReady: false,

    async init() {
      const b = root.vkBridge;
      // Запуск внутри ВК: есть bridge, мы во фрейме/вебвью и в URL есть параметры запуска.
      this.isVK = !!(b && LAUNCH.has('vk_app_id') && (b.isEmbedded ? b.isEmbedded() : true));
      if (!this.isVK) return;
      this.name = 'vk';
      // Ждём ответа ВК не дольше 1,5 с: если клиент молчит, игра всё равно запускается
      try { await send('VKWebAppInit', {}, 1500); } catch (e) { /* без ответа ВК игра работает дальше */ }
      b.subscribe((e) => {
        const type = e && e.detail && e.detail.type;
        if (type === 'VKWebAppViewHide') this._pause('view');
        else if (type === 'VKWebAppViewRestore') this._resume('view');
      });
      this.preloadRewarded();
    },

    lang() {
      const l = LAUNCH.get('vk_language') || (navigator.language || 'ru').slice(0, 2);
      return String(l).toLowerCase();
    },

    // У ВК нет LoadingAPI / GameplayAPI — методы оставлены, чтобы игра не зависела от площадки.
    loadingReady() {},
    gameplayStart() {},
    gameplayStop() {},

    _pause(reason = 'ad') { if (this.onPause) this.onPause(reason); },
    _resume(reason = 'ad') { if (this.onResume) this.onResume(reason); },

    // Подготовить рекламу за вознаграждение заранее (ВК подгружает ролик по CheckNativeAds).
    async preloadRewarded() {
      if (!this.isVK) { this._rewardReady = true; return true; }
      try {
        const r = await send('VKWebAppCheckNativeAds', { ad_format: 'reward' }, 10000);
        this._rewardReady = !!(r && r.result);
      } catch (e) { this._rewardReady = false; }
      return this._rewardReady;
    },

    // Межстраничная реклама. Показывать только в паузах: между уровнями, при выходе в меню.
    async showInterstitial() {
      if (!this.isVK) return false;
      this.adOpen = true; this._pause();
      let shown = false;
      try { const r = await send('VKWebAppShowNativeAds', { ad_format: 'interstitial' }, 60000); shown = !!(r && r.result); }
      catch (e) { shown = false; }
      this.adOpen = false; this._resume();
      return shown;
    },

    // Реклама за вознаграждение. true — награду выдаём.
    async showRewarded() {
      if (!this.isVK) return this._fakeRewarded();
      this.adOpen = true; this._pause();
      let ok = false;
      try { const r = await send('VKWebAppShowNativeAds', { ad_format: 'reward' }, 90000); ok = !!(r && r.result); }
      catch (e) { ok = false; }
      this.adOpen = false; this._resume();
      this.preloadRewarded();
      return ok;
    },

    // Имитация рекламы вне ВК (только для проверки логики при разработке).
    _fakeRewarded() {
      return new Promise((resolve) => {
        const el = document.getElementById('dev-ad');
        if (!el) { resolve(true); return; }
        this.adOpen = true; this._pause();
        el.classList.remove('hidden');
        const bar = el.querySelector('.dev-ad-bar span');
        let p = 0;
        const iv = setInterval(() => {
          p += 4; if (bar) bar.style.width = p + '%';
          if (p >= 100) {
            clearInterval(iv); el.classList.add('hidden'); if (bar) bar.style.width = '0%';
            this.adOpen = false; this._resume(); resolve(true);
          }
        }, 60);
      });
    },

    // ---------- Сохранения: VK Storage + localStorage как резерв ----------
    async load() {
      let local = null, cloud = null;
      try { local = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}
      if (this.isVK) {
        try {
          const r = await send('VKWebAppStorageGet', { keys: ['save'] }, 3000);
          const v = r && r.keys && r.keys[0] && r.keys[0].value;
          if (v) cloud = JSON.parse(v);
        } catch (e) {}
      }
      return mergeSaves(local, cloud);
    },

    save(data) {
      const s = JSON.stringify(data);
      try { localStorage.setItem(SAVE_KEY, s); } catch (e) {}
      if (this.isVK) send('VKWebAppStorageSet', { key: 'save', value: s }).catch(() => {});
    },

    // Тактильный отклик: в ВК — Taptic Engine, в браузере на телефоне — вибрация
    haptic(style) {
      try {
        if (this.isVK) { root.vkBridge.send('VKWebAppTapticImpactOccurred', { style }).catch(() => {}); return; }
        const ua = navigator.userActivation;
        if (!navigator.vibrate || (ua && !ua.hasBeenActive) || !root.matchMedia('(pointer: coarse)').matches) return;
        navigator.vibrate(style === 'heavy' ? 40 : style === 'medium' ? 22 : 10);
      } catch (e) {}
    },

    // Социальные функции ВК (кнопки показываются только внутри ВК)
    share() {
      if (!this.isVK) return Promise.resolve(false);
      return send('VKWebAppShare', { link: 'https://vk.com/app' + LAUNCH.get('vk_app_id') }, 60000).then(() => true, () => false);
    },
    favorite() {
      if (!this.isVK) return Promise.resolve(false);
      return send('VKWebAppAddToFavorites', {}, 60000).then(() => true, () => false);
    },
  };

  function mergeSaves(a, b) {
    if (!a) return b; if (!b) return a;
    const out = Object.assign({}, a, b);
    out.unlocked = Math.max(a.unlocked || 1, b.unlocked || 1);
    out.stars = []; out.best = [];
    const n = Math.max((a.stars || []).length, (b.stars || []).length);
    for (let i = 0; i < n; i++) {
      out.stars[i] = Math.max((a.stars || [])[i] || 0, (b.stars || [])[i] || 0);
      out.best[i] = Math.max((a.best || [])[i] || 0, (b.best || [])[i] || 0);
    }
    out.settings = Object.assign({}, a.settings, b.settings);
    out.ach = Object.assign({}, a.ach, b.ach);
    out.seen = Object.assign({}, a.seen, b.seen);
    out.stats = {};
    for (const k of new Set([...Object.keys(a.stats || {}), ...Object.keys(b.stats || {})])) out.stats[k] = Math.max((a.stats || {})[k] || 0, (b.stats || {})[k] || 0);
    out.skin = b.skin || a.skin || 'none';
    out.nukes = Math.min(a.nukes || 0, b.nukes || 0);
    return out;
  }

  root.YB = Object.assign(root.YB || {}, { Platform: P });
})(window);
