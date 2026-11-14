/* YooBird — уровни. Координаты в мире 1920x1080, земля на y = 960. */
(function (root) {
  'use strict';
  const G = 960;

  // Хелперы: base — y поверхности, на которой стоит объект.
  const post = (x, base, h, m = 'wood', w = 22) => ({ k: 'block', m, x, y: base - h / 2, w, h });
  const beam = (x, base, w, m = 'wood', h = 22) => ({ k: 'block', m, x, y: base - h / 2, w, h });
  const tri = (x, base, w, h, m = 'wood') => ({ k: 'block', m, shape: 'tri', x, y: base - h / 2, w, h });   // треугольная крыша
  const tnt = (x, base, s = 44) => ({ k: 'block', m: 'tnt', x, y: base - s / 2, w: s, h: s });              // ящик TNT
  const boulder = (x, base, r = 30) => ({ k: 'block', m: 'stone', shape: 'circle', x, y: base - r, w: r * 2, h: r * 2 }); // валун
  const R = { blue: 30, red: 34, boss: 46 };
  const enemy = (x, base, t = 'blue') => ({ k: 'enemy', t, x, y: base - R[t] - 1 });

  const LEVELS = [
    // ---------- 1. Лёгкий ----------
    {
      id: 1, nameKey: 'lvl1',
      birds: ['normal', 'normal', 'normal'],
      stars: [0, 18000, 28000],
      startHint: 'hintDrag', theme: 'noon',
      statics: [],
      items: [
        tnt(1300, G),
        // Башенка
        post(1100, G, 110), post(1200, G, 110), beam(1150, G - 110, 150),
        enemy(1150, G - 132, 'blue'),
        // Домик со стеклянными стенами
        post(1420, G, 130, 'glass'), post(1540, G, 130, 'glass'), beam(1480, G - 130, 170),
        enemy(1480, G, 'blue'),
        post(1440, G - 152, 60), post(1520, G - 152, 60), beam(1480, G - 212, 120),
        tri(1480, G - 234, 140, 46),
      ],
    },

    // ---------- 2. Сложнее ----------
    {
      id: 2, nameKey: 'lvl2',
      birds: ['normal', 'speed', 'normal', 'speed', 'normal'],
      stars: [0, 34000, 45000],
      startHint: 'hintTnt', theme: 'noon',
      statics: [],
      items: [
        tnt(1185, G),
        // Этаж 1
        post(1240, G, 120), post(1350, G, 120, 'glass'), post(1460, G, 120),
        beam(1350, G - 120, 262),
        enemy(1295, G, 'blue'), enemy(1405, G, 'blue'),
        // Этаж 2
        post(1270, G - 142, 100, 'glass'), post(1430, G - 142, 100, 'glass'),
        beam(1350, G - 242, 200),
        enemy(1350, G - 142, 'red'),
        post(1350, G - 264, 50, 'stone', 50),
        tri(1350, G - 314, 80, 36),
        // Бункер: каменные стены, деревянная крыша
        post(1620, G, 80, 'stone', 30), post(1740, G, 80, 'stone', 30),
        beam(1680, G - 80, 180, 'wood', 24),
        enemy(1680, G, 'blue'),
        tnt(1680, G - 104, 40),
      ],
    },

    // ---------- 3. Ещё сложнее ----------
    {
      id: 3, nameKey: 'lvl3',
      birds: ['normal', 'speed', 'bomb', 'speed', 'bomb'],
      stars: [0, 40000, 52000],
      theme: 'noon',
      statics: [{ x: 1560, y: 880, w: 560, h: 160 }], // холм: верх на y = 800
      items: [
        tnt(1200, G),
        // Дозорная вышка на земле
        post(1000, G, 160), post(1100, G, 160), beam(1050, G - 160, 150),
        enemy(1050, G, 'blue'),
        post(1015, G - 182, 70, 'glass'), post(1085, G - 182, 70, 'glass'),
        beam(1050, G - 252, 110, 'glass'),
        tri(1050, G - 274, 120, 40, 'glass'),
        // Крепость на холме (верх холма y = 800)
        post(1320, 800, 130, 'stone', 28), post(1440, 800, 130, 'stone', 28),
        beam(1380, 670, 160, 'stone'),
        enemy(1380, 800, 'red'),
        post(1500, 800, 130), post(1620, 800, 130),
        beam(1560, 670, 160),
        enemy(1560, 800, 'blue'),
        post(1680, 800, 130, 'glass'), post(1800, 800, 130, 'glass'),
        beam(1740, 670, 160),
        enemy(1740, 800, 'red'),
        // Второй ярус
        post(1410, 648, 90), post(1710, 648, 90),
        beam(1560, 558, 340),
        enemy(1560, 536, 'blue'),
        boulder(1690, 536, 26),
      ],
    },

    // ---------- 4. Очень сложно: две башни ----------
    {
      id: 4, nameKey: 'lvl4',
      birds: ['normal', 'split', 'bomb', 'normal', 'speed'],
      stars: [0, 46000, 58000],
      theme: 'noon',
      statics: [],
      items: [
        // Башня A: камень, дерево, стекло
        post(1090, G, 120, 'stone', 26), post(1210, G, 120, 'stone', 26), beam(1150, G - 120, 170),
        enemy(1150, G, 'blue'),
        post(1100, G - 142, 100), post(1200, G - 142, 100), beam(1150, G - 242, 150),
        enemy(1150, G - 142, 'red'),
        post(1115, G - 264, 70, 'glass'), post(1185, G - 264, 70, 'glass'), beam(1150, G - 334, 110, 'glass'),
        enemy(1150, G - 356, 'blue'),
        // Бункер между башнями
        post(1300, G, 70), post(1400, G, 70), beam(1350, G - 70, 130, 'stone'),
        enemy(1350, G, 'blue'),
        tnt(1350, G - 92, 40),
        // Башня B: стеклянное основание под каменной плитой
        post(1480, G, 130, 'glass'), post(1620, G, 130, 'glass'), beam(1550, G - 130, 180, 'stone', 24),
        enemy(1550, G, 'red'),
        post(1490, G - 154, 110), post(1610, G - 154, 110), beam(1550, G - 264, 160),
        enemy(1550, G - 154, 'blue'),
        tri(1550, G - 286, 170, 56, 'glass'),
      ],
    },

    // ---------- 5. Хардкор: крепость на скале ----------
    {
      id: 5, nameKey: 'lvl5',
      birds: ['speed', 'normal', 'bomb', 'speed', 'normal'],
      stars: [0, 42000, 54000],
      theme: 'sunset',
      statics: [{ x: 1500, y: 830, w: 500, h: 260 }], // скала: верх на y = 700
      items: [
        // Стеклянный пост на земле
        post(1000, G, 90, 'glass'), post(1100, G, 90, 'glass'), beam(1050, G - 90, 150, 'glass'),
        enemy(1050, G, 'blue'),
        enemy(1050, G - 112, 'blue'),
        // Крепость (верх скалы y = 700)
        post(1290, 700, 150, 'stone', 30),
        tnt(1336, 700, 40),
        post(1380, 700, 120, 'stone', 26), post(1500, 700, 120, 'stone', 26), beam(1440, 580, 160, 'stone', 24),
        enemy(1440, 700, 'red'),
        post(1580, 700, 120), post(1700, 700, 120), beam(1640, 580, 160),
        enemy(1640, 700, 'blue'),
        enemy(1440, 556, 'red'),
        enemy(1640, 558, 'blue'),
      ],
    },

    // ---------- 6. Король чувачков ----------
    {
      id: 6, nameKey: 'lvl6',
      birds: ['normal', 'speed', 'bomb', 'speed', 'bomb'],
      stars: [0, 52000, 64000],
      startHint: 'hintBoss', theme: 'sunset', mood: 'boss',
      statics: [],
      items: [
        // Сторожевая будка
        post(1100, G, 100), post(1200, G, 100), beam(1150, G - 100, 140),
        enemy(1150, G, 'red'),
        enemy(1150, G - 122, 'blue'),
        // Замок: нижний ярус
        post(1330, G, 140, 'stone', 28), post(1500, G, 140, 'stone', 28), post(1670, G, 140, 'stone', 28),
        beam(1500, G - 140, 380, 'stone', 24),
        enemy(1415, G, 'blue'), enemy(1585, G, 'blue'),
        tnt(1364, G, 38), tnt(1636, G, 38),
        // Тронный зал
        post(1390, G - 164, 120, 'stone', 26), post(1610, G - 164, 120, 'stone', 26), beam(1500, G - 284, 260),
        enemy(1500, G - 164, 'boss'),
        // Башенка на крыше
        post(1440, G - 306, 60, 'glass'), post(1560, G - 306, 60, 'glass'), beam(1500, G - 366, 160, 'glass'),
        enemy(1500, G - 388, 'red'),
      ],
    },

    // ===== Уровни 7–12 рассчитаны с учётом бустеров и ядерки: враги разнесены по всей карте =====

    // ---------- 7. Два лагеря ----------
    {
      id: 7, nameKey: 'lvl7',
      birds: ['normal', 'speed', 'bomb', 'normal'],
      stars: [0, 36000, 46000],
      startHint: 'hintBoosters', theme: 'sunset',
      statics: [{ x: 1700, y: 870, w: 360, h: 180 }], // холм справа: верх на y = 780
      items: [
        // Левый лагерь
        post(900, G, 110), post(1000, G, 110), beam(950, G - 110, 140),
        enemy(950, G, 'blue'), enemy(950, G - 132, 'blue'),
        tnt(1250, G),
        // Стеклянная вышка в центре
        post(1310, G, 180, 'glass'), post(1390, G, 180, 'glass'), beam(1350, G - 180, 120),
        enemy(1350, G - 202, 'red'),
        // Каменная хижина на холме
        post(1620, 780, 110, 'stone', 28), post(1760, 780, 110, 'stone', 28), beam(1690, 670, 190),
        enemy(1690, 780, 'red'), enemy(1690, 648, 'blue'),
        boulder(1562, 780, 28),
      ],
    },

    // ---------- 8. Стеклянный дворец ----------
    {
      id: 8, nameKey: 'lvl8',
      birds: ['speed', 'split', 'bomb'],
      stars: [0, 42000, 54000],
      theme: 'sunset',
      statics: [{ x: 1880, y: 890, w: 70, h: 140 }],
      items: [
        // Сторожевая вышка слева
        post(920, G, 200, 'glass'), post(980, G, 200, 'glass'), beam(950, G - 200, 110),
        enemy(950, G - 222, 'blue'),
        tnt(1150, G),
        // Дворец
        post(1330, G, 130, 'glass'), post(1450, G, 130, 'glass'), post(1570, G, 130, 'glass'),
        beam(1450, G - 130, 270, 'stone', 24),
        enemy(1390, G, 'blue'), enemy(1510, G, 'blue'),
        post(1360, G - 154, 110, 'glass'), post(1540, G - 154, 110, 'glass'), beam(1450, G - 264, 210),
        enemy(1450, G - 154, 'red'),
        post(1395, G - 286, 80, 'glass'), post(1505, G - 286, 80, 'glass'), beam(1450, G - 366, 140, 'glass'),
        enemy(1450, G - 388, 'blue'),
        // Красный за деревянной стенкой справа (скала не даёт ему укатиться)
        post(1690, G, 80, 'wood', 26),
        enemy(1750, G, 'red'),
        tnt(1640, G, 40),
      ],
    },

    // ---------- 9. Мост ----------
    {
      id: 9, nameKey: 'lvl9',
      birds: ['normal', 'bomb', 'speed', 'normal', 'bomb'],
      stars: [0, 42000, 54000],
      startHint: 'hintBoulder', theme: 'dusk',
      statics: [{ x: 1120, y: 870, w: 260, h: 180 }, { x: 1720, y: 870, w: 300, h: 180 }], // верх обоих холмов y = 780
      items: [
        // Мост над пропастью
        beam(1410, 780, 380),
        enemy(1350, 758, 'blue'), enemy(1470, 758, 'blue'),
        enemy(1410, G, 'blue'),
        boulder(1262, 758, 26),
        tnt(1330, G, 40),
        // Левый форт
        post(1040, 780, 100), post(1140, 780, 100), beam(1090, 680, 130, 'stone'),
        enemy(1090, 780, 'red'),
        // Правый форт
        post(1660, 780, 120, 'stone', 28), post(1800, 780, 120, 'stone', 28), beam(1730, 660, 180, 'stone', 24),
        enemy(1730, 780, 'red'), enemy(1730, 636, 'blue'),
      ],
    },

    // ---------- 10. Бункеры ----------
    {
      id: 10, nameKey: 'lvl10',
      birds: ['bomb', 'normal', 'bomb'],
      stars: [0, 35000, 46000],
      theme: 'dusk',
      statics: [],
      items: [
        // Бункер A
        post(940, G, 90, 'stone', 30), post(1060, G, 90, 'stone', 30), beam(1000, G - 90, 160, 'stone', 26),
        enemy(1000, G, 'red'),
        tnt(1175, G),
        // Бункер B со стеклянной будкой сверху
        post(1290, G, 90, 'stone', 30), post(1410, G, 90, 'stone', 30), beam(1350, G - 90, 160, 'stone', 26),
        enemy(1350, G, 'red'),
        post(1300, G - 116, 70, 'glass'), post(1400, G - 116, 70, 'glass'), beam(1350, G - 186, 130, 'glass'),
        enemy(1350, G - 116, 'blue'),
        tnt(1540, G),
        // Бункер C
        post(1660, G, 90, 'stone', 30), post(1780, G, 90, 'stone', 30), beam(1720, G - 90, 160, 'wood', 24),
        enemy(1720, G, 'blue'), enemy(1720, G - 114, 'blue'),
      ],
    },

    // ---------- 11. Небоскрёб ----------
    {
      id: 11, nameKey: 'lvl11',
      birds: ['normal', 'split', 'bomb', 'speed'],
      stars: [0, 48000, 60000],
      theme: 'dusk',
      statics: [],
      items: [
        // Прячется за камнем слева
        post(950, G, 70, 'stone', 40),
        enemy(1010, G, 'blue'),
        // Небоскрёб: 4 этажа
        post(1370, G, 110, 'stone', 26), post(1530, G, 110, 'stone', 26), beam(1450, G - 110, 200),
        enemy(1450, G, 'red'),
        post(1380, G - 132, 110), post(1520, G - 132, 110), beam(1450, G - 242, 180),
        enemy(1450, G - 132, 'blue'),
        post(1390, G - 264, 110, 'glass'), post(1510, G - 264, 110, 'glass'), beam(1450, G - 374, 160, 'stone'),
        enemy(1450, G - 264, 'blue'),
        post(1400, G - 396, 100), post(1500, G - 396, 100), beam(1450, G - 496, 140),
        enemy(1450, G - 396, 'red'),
        enemy(1450, G - 518, 'blue'),
        tnt(1600, G, 40),
        // Сарайчик справа
        post(1750, G, 80, 'glass'), post(1850, G, 80, 'glass'), beam(1800, G - 80, 130),
        enemy(1800, G, 'blue'),
        tri(1800, G - 102, 150, 50),
      ],
    },

    // ---------- 12. Возвращение Короля ----------
    {
      id: 12, nameKey: 'lvl12',
      birds: ['normal', 'speed', 'bomb', 'speed', 'bomb'],
      stars: [0, 50000, 62000],
      startHint: 'hintBoss2', theme: 'dusk', mood: 'boss',
      statics: [{ x: 1600, y: 860, w: 480, h: 200 }, { tri: [[1250, 960], [1360, 960], [1360, 760]] }], // холм (верх y = 760) и скат слева
      items: [
        // Аванпост на земле
        post(1000, G, 110), post(1100, G, 110), beam(1050, G - 110, 140, 'stone'),
        enemy(1050, G, 'blue'), enemy(1050, G - 132, 'blue'),
        // Замок на холме
        post(1420, 760, 130, 'stone', 28), post(1600, 760, 130, 'stone', 28), post(1780, 760, 130, 'stone', 28),
        beam(1600, 630, 400, 'stone', 26),
        enemy(1510, 760, 'blue'), enemy(1690, 760, 'red'),
        tnt(1455, 760, 38), tnt(1745, 760, 38),
        boulder(1384, 760, 20),
        // Тронный зал
        post(1490, 604, 130, 'stone', 26), post(1710, 604, 130, 'stone', 26), beam(1600, 474, 260),
        enemy(1600, 604, 'boss'),
        enemy(1600, 452, 'red'),
      ],
    },

    // ===== Уровни 13–15: ночь =====

    // ---------- 13. Домино ----------
    {
      id: 13, nameKey: 'lvl13',
      birds: ['normal', 'speed', 'bomb'],
      stars: [0, 36000, 46000],
      startHint: 'hintDomino', theme: 'night',
      statics: [{ x: 1790, y: 880, w: 200, h: 160 }], // холм справа: верх на y = 800
      items: [
        // Ряд «доминошек»: толкни первую — последняя сбросит ящик TNT со стеклянной стойки
        post(960, G, 150), post(1045, G, 150), post(1130, G, 150), post(1215, G, 150), post(1300, G, 150),
        post(1400, G, 100, 'glass'), tnt(1400, G - 100, 36),
        // Стеклянный домик
        post(1500, G, 110, 'glass'), post(1620, G, 110, 'glass'), beam(1560, G - 110, 170),
        enemy(1560, G, 'blue'), enemy(1560, G - 132, 'red'),
        // Бункер на холме
        post(1730, 800, 90, 'stone', 26), post(1850, 800, 90, 'stone', 26), beam(1790, 710, 170, 'wood', 24),
        enemy(1790, 800, 'red'), enemy(1790, 686, 'blue'),
        // Караульный у первой доминошки
        enemy(880, G, 'blue'),
      ],
    },

    // ---------- 14. Пороховой склад ----------
    {
      id: 14, nameKey: 'lvl14',
      birds: ['split', 'speed', 'bomb'],
      stars: [0, 44000, 56000],
      theme: 'night',
      statics: [],
      items: [
        // Каменная стена прикрывает склад спереди
        post(1150, G, 190, 'stone', 34),
        // Первый этаж
        post(1240, G, 110), post(1410, G, 110), post(1580, G, 110), beam(1410, G - 110, 380),
        enemy(1325, G, 'red'), enemy(1495, G, 'blue'),
        // Второй этаж: ящики TNT и охрана под каменной крышей на стеклянных опорах
        tnt(1290, G - 132, 40), enemy(1350, G - 132, 'blue'), tnt(1410, G - 132, 40), enemy(1470, G - 132, 'blue'), tnt(1530, G - 132, 40),
        post(1240, G - 132, 80, 'glass'), post(1580, G - 132, 80, 'glass'), beam(1410, G - 212, 380, 'stone', 22),
        enemy(1410, G - 234, 'red'),
        // Дальний бункер
        post(1730, G, 90, 'stone', 28), post(1850, G, 90, 'stone', 28), beam(1790, G - 90, 170, 'wood', 24),
        enemy(1790, G, 'red'),
      ],
    },

    // ---------- 15. Цитадель ----------
    {
      id: 15, nameKey: 'lvl15',
      birds: ['normal', 'speed', 'bomb', 'speed', 'bomb', 'normal'],
      stars: [0, 54000, 66000],
      startHint: 'hintBoss3', theme: 'night', mood: 'boss',
      // нижний уступ (верх y = 820), верхний уступ (верх y = 700) и скат с земли
      statics: [{ x: 1375, y: 890, w: 250, h: 140 }, { x: 1690, y: 830, w: 380, h: 260 }, { tri: [[1140, 960], [1250, 960], [1250, 820]] }],
      items: [
        // Аванпост на земле
        post(950, G, 100), post(1050, G, 100), beam(1000, G - 100, 140),
        enemy(1000, G, 'blue'),
        boulder(1000, G - 122, 26),
        // Каменный бункер на нижнем уступе
        post(1300, 820, 90, 'stone', 28), post(1420, 820, 90, 'stone', 28), beam(1360, 730, 170, 'stone', 24),
        enemy(1360, 820, 'red'), enemy(1360, 706, 'blue'),
        tnt(1463, 820, 38),
        // Тронный зал на верхнем уступе
        enemy(1548, 700, 'blue'),
        post(1610, 700, 130, 'stone', 28), post(1790, 700, 130, 'stone', 28), beam(1700, 570, 240, 'wood', 24),
        enemy(1700, 700, 'boss'),
        post(1650, 546, 80, 'glass'), post(1750, 546, 80, 'glass'), beam(1700, 466, 150, 'glass'),
        enemy(1700, 546, 'red'),
        tri(1700, 444, 140, 44),
        tnt(1840, 700, 36),
      ],
    },

    // ===== Уровни 16–20: снежные горы. Новые птенцы: Пузан и Бумеранг =====

    // ---------- 16. Каменные крыши (знакомство с Пузаном) ----------
    {
      id: 16, nameKey: 'lvl16',
      birds: ['heavy', 'normal', 'heavy', 'normal'],
      stars: [0, 34000, 46000],
      theme: 'winter',
      statics: [],
      items: [
        // Землянка: толстая каменная плита сверху — сбоку не пробить, а Пузан проломит сверху
        post(1000, G, 80, 'stone', 30), post(1120, G, 80, 'stone', 30), beam(1060, G - 80, 190, 'stone', 30),
        enemy(1060, G, 'blue'),
        // Две избушки с каменными крышами
        post(1310, G, 110, 'wood', 26), post(1450, G, 110, 'wood', 26), beam(1380, G - 110, 200, 'stone', 28),
        enemy(1380, G, 'red'),
        post(1330, G - 138, 70, 'glass'), post(1430, G - 138, 70, 'glass'), beam(1380, G - 208, 140, 'stone', 24),
        enemy(1380, G - 138, 'blue'),
        post(1620, G, 110, 'wood', 26), post(1760, G, 110, 'wood', 26), beam(1690, G - 110, 200, 'stone', 28),
        enemy(1690, G, 'blue'),
        tri(1690, G - 138, 180, 50, 'wood'),
        tnt(1535, G, 40),
      ],
    },

    // ---------- 17. Колодец ----------
    {
      id: 17, nameKey: 'lvl17',
      birds: ['heavy', 'speed', 'heavy', 'bomb', 'normal'],
      stars: [0, 40000, 52000],
      startHint: 'hintWell', theme: 'winter',
      statics: [{ x: 1500, y: 860, w: 420, h: 200 }], // плато: верх на y = 760
      items: [
        // Пост у подножия
        post(980, G, 120, 'glass'), post(1080, G, 120, 'glass'), beam(1030, G - 120, 150),
        enemy(1030, G, 'blue'), enemy(1030, G - 142, 'blue'),
        // Колодец на плато: высокие каменные стенки, сверху — деревянный настил
        post(1360, 760, 200, 'stone', 34), post(1640, 760, 200, 'stone', 34),
        enemy(1440, 760, 'red'), enemy(1560, 760, 'red'),
        boulder(1500, 760, 24),
        beam(1500, 560, 316, 'wood', 22),
        enemy(1500, 538, 'blue'),
        // Сторожка справа
        post(1760, G, 90, 'stone', 26), post(1860, G, 90, 'stone', 26), beam(1810, G - 90, 140, 'wood', 24),
        enemy(1810, G, 'blue'),
      ],
    },

    // ---------- 18. За стеной (знакомство с Бумерангом) ----------
    {
      id: 18, nameKey: 'lvl18',
      birds: ['boomer', 'normal', 'boomer', 'speed', 'normal'],
      stars: [0, 36000, 48000],
      startHint: 'hintWall', theme: 'winter',
      statics: [],
      items: [
        // Высокая каменная стена: спереди не пробить
        post(1250, G, 270, 'stone', 46),
        enemy(1250, G - 270, 'blue'),
        // Укрытия сразу за стеной: сверху толстые каменные плиты, справа открыты — только тонкие стеклянные стойки
        post(1300, G, 120, 'stone', 24), post(1530, G, 120, 'glass', 18), beam(1415, G - 120, 260, 'stone', 30),
        enemy(1370, G, 'blue'), enemy(1455, G, 'blue'),
        enemy(1415, G - 150, 'red'),
        // Сторожка справа
        post(1780, G, 90, 'wood', 24), post(1880, G, 90, 'wood', 24), beam(1830, G - 90, 140, 'wood', 24),
        enemy(1830, G, 'blue'),
      ],
    },

    // ---------- 19. Снежная крепость ----------
    {
      id: 19, nameKey: 'lvl19',
      birds: ['heavy', 'boomer', 'split', 'bomb', 'normal'],
      stars: [0, 38000, 50000],
      theme: 'winter',
      statics: [{ x: 1600, y: 870, w: 520, h: 180 }, { tri: [[1240, 960], [1340, 960], [1340, 780]] }], // холм (верх y = 780) и скат
      items: [
        // Ледяная вышка у подножия
        post(980, G, 160, 'glass'), post(1060, G, 160, 'glass'), beam(1020, G - 160, 120, 'glass'),
        enemy(1020, G - 182, 'blue'),
        enemy(1020, G, 'blue'),
        // Крепость на холме: передняя каменная стена
        post(1390, 780, 150, 'stone', 36),
        post(1460, 780, 110), post(1600, 780, 110), beam(1530, 670, 200, 'stone', 26),
        enemy(1530, 780, 'red'),
        post(1480, 644, 80, 'glass'), post(1580, 644, 80, 'glass'), beam(1530, 564, 140, 'wood'),
        enemy(1530, 644, 'blue'),
        // Задний двор: открыт справа
        post(1680, 780, 110, 'stone', 26), post(1840, 780, 110, 'glass', 20), beam(1760, 670, 190, 'stone', 26),
        tnt(1720, 780, 38), enemy(1785, 780, 'red'),
      ],
    },

    // ---------- 20. Ледяной Король ----------
    {
      id: 20, nameKey: 'lvl20',
      birds: ['heavy', 'speed', 'boomer', 'bomb', 'heavy'],
      stars: [0, 46000, 58000],
      startHint: 'hintBoss4', theme: 'winter', mood: 'boss',
      statics: [{ x: 1640, y: 850, w: 440, h: 220 }], // холм: верх y = 740
      items: [
        // Застава
        post(980, G, 100, 'stone', 28), post(1100, G, 100, 'stone', 28), beam(1040, G - 100, 180, 'stone', 26),
        enemy(1040, G, 'red'), enemy(1040, G - 126, 'blue'),
        tnt(1230, G, 40),
        // Ледяной дворец на холме
        post(1450, 740, 140, 'glass'), post(1830, 740, 140, 'glass'),
        post(1520, 740, 140, 'stone', 28), post(1760, 740, 140, 'stone', 28), beam(1640, 600, 360, 'stone', 28),
        enemy(1640, 740, 'boss'),
        enemy(1485, 740, 'blue'),
        post(1560, 572, 100), post(1720, 572, 100), beam(1640, 472, 220, 'wood'),
        enemy(1640, 572, 'red'),
        tri(1640, 450, 200, 56, 'glass'),
      ],
    },

    // ===== Уровни 21–25: вулкан. Новый птенец: Пушок =====

    // ---------- 21. Уступы (знакомство с Пушком) ----------
    {
      id: 21, nameKey: 'lvl21',
      birds: ['puff', 'normal', 'puff', 'speed', 'normal'],
      stars: [0, 36000, 48000],
      startHint: 'hintLedges', theme: 'volcano',
      // три базальтовых столба: верх y = 700, 620, 700
      statics: [{ x: 1200, y: 830, w: 110, h: 260 }, { x: 1480, y: 790, w: 150, h: 340 }, { x: 1760, y: 830, w: 110, h: 260 }],
      items: [
        enemy(1200, 700, 'blue'),
        enemy(1445, 620, 'red'), enemy(1518, 620, 'blue'),
        enemy(1760, 700, 'red'),
        // Между столбами — лачуги
        post(1300, G, 80, 'glass'), post(1380, G, 80, 'glass'), beam(1340, G - 80, 120),
        enemy(1340, G, 'blue'),
        tnt(1620, G, 40),
      ],
    },

    // ---------- 22. Лавовый мост ----------
    {
      id: 22, nameKey: 'lvl22',
      birds: ['puff', 'heavy', 'boomer', 'normal', 'speed', 'normal'],
      stars: [0, 37000, 49000],
      theme: 'volcano',
      statics: [{ x: 1110, y: 850, w: 220, h: 220 }, { x: 1750, y: 850, w: 260, h: 220 }], // два утёса, верх y = 740
      items: [
        // Мост между утёсами
        beam(1420, 740, 470, 'wood', 24),
        enemy(1330, 718, 'blue'), enemy(1430, 718, 'red'), enemy(1530, 718, 'blue'),
        // Под мостом
        post(1380, G, 90, 'wood', 24), post(1480, G, 90, 'wood', 24), beam(1430, G - 90, 150, 'wood', 24),
        enemy(1430, G, 'red'),
        // Будка на правом утёсе
        post(1680, 740, 100, 'glass', 24), post(1800, 740, 100, 'wood', 24), beam(1740, 640, 180, 'wood', 24),
        enemy(1740, 740, 'blue'),
        tnt(1080, 740, 38),
      ],
    },

    // ---------- 23. Обсерватория ----------
    {
      id: 23, nameKey: 'lvl23',
      birds: ['split', 'puff', 'boomer', 'heavy', 'normal'],
      stars: [0, 42000, 54000],
      theme: 'volcano',
      statics: [],
      items: [
        // Тонкие стеклянные башни с дозорными наверху
        post(1000, G, 240, 'glass', 24), post(1080, G, 240, 'glass', 24), beam(1040, G - 240, 130, 'wood'),
        enemy(1040, G - 262, 'blue'),
        post(1240, G, 320, 'glass', 24), post(1320, G, 320, 'glass', 24), beam(1280, G - 320, 130, 'wood'),
        enemy(1280, G - 342, 'red'),
        // Купол обсерватории
        post(1500, G, 130, 'stone', 30), post(1700, G, 130, 'stone', 30), beam(1600, G - 130, 260, 'stone', 26),
        enemy(1560, G, 'blue'), enemy(1640, G, 'red'),
        post(1530, G - 156, 90, 'wood'), post(1670, G - 156, 90, 'wood'), beam(1600, G - 246, 180, 'wood'),
        enemy(1600, G - 156, 'blue'),
        tri(1600, G - 268, 200, 70, 'glass'),
        // Задний пост: стена спереди
        post(1800, G, 140, 'stone', 34), enemy(1860, G, 'blue'),
      ],
    },

    // ---------- 24. Пороховая шахта ----------
    {
      id: 24, nameKey: 'lvl24',
      birds: ['boomer', 'heavy', 'puff', 'bomb', 'normal'],
      stars: [0, 44000, 56000],
      theme: 'volcano',
      statics: [{ x: 1500, y: 860, w: 360, h: 200 }, { x: 1880, y: 840, w: 120, h: 240 }], // плато (верх y = 760) и скала справа
      items: [
        // Каменная стена у подножия
        post(1080, G, 230, 'stone', 42),
        // За стеной склад: TNT и охрана, сверху каменная плита
        post(1120, G, 120, 'wood', 24), post(1280, G, 120, 'wood', 24), beam(1200, G - 120, 190, 'stone', 26),
        tnt(1160, G, 36), enemy(1225, G, 'red'),
        // Шахта на плато
        post(1360, 760, 170, 'stone', 32), post(1640, 760, 170, 'stone', 32),
        enemy(1440, 760, 'blue'), tnt(1500, 760, 40), enemy(1560, 760, 'red'),
        beam(1500, 590, 316, 'wood', 22),
        enemy(1450, 568, 'blue'), enemy(1550, 568, 'blue'),
        // У скалы
        enemy(1770, G, 'red'), tnt(1712, G, 40),
      ],
    },

    // ---------- 25. Сердце вулкана ----------
    {
      id: 25, nameKey: 'lvl25',
      birds: ['heavy', 'puff', 'boomer', 'bomb', 'split'],
      stars: [0, 52000, 66000],
      startHint: 'hintBoss5', theme: 'volcano', mood: 'boss',
      // нижний уступ (верх y = 840), верхний (верх y = 700), скат с земли
      statics: [{ x: 1330, y: 900, w: 240, h: 120 }, { x: 1680, y: 830, w: 460, h: 260 }, { tri: [[1110, 960], [1210, 960], [1210, 840]] }],
      items: [
        // Передовой пост
        post(940, G, 110, 'glass'), post(1040, G, 110, 'glass'), beam(990, G - 110, 150, 'stone', 24),
        enemy(990, G, 'blue'), enemy(990, G - 134, 'red'),
        // Бункер на нижнем уступе
        post(1270, 840, 90, 'stone', 28), post(1390, 840, 90, 'stone', 28), beam(1330, 750, 170, 'stone', 26),
        enemy(1330, 840, 'red'),
        tnt(1330, 724, 36),
        // Тронный зал: каменная стена спереди, открыт справа
        post(1500, 700, 180, 'stone', 40),
        post(1580, 700, 140, 'wood', 26), post(1800, 700, 140, 'wood', 26), beam(1690, 560, 300, 'stone', 28),
        enemy(1690, 700, 'boss'),
        enemy(1860, 700, 'blue'),
        post(1610, 532, 90, 'glass'), post(1770, 532, 90, 'glass'), beam(1690, 442, 220, 'wood'),
        enemy(1690, 532, 'red'),
        tri(1690, 420, 200, 56, 'stone'),
      ],
    },
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  root.YB = Object.assign(root.YB || {}, { LEVELS });
})(typeof window !== 'undefined' ? window : globalThis);
