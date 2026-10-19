(function (root) {
  'use strict';
  var FX = root.FX = root.FX || {};
  function text(en, ar) { return { en: en, ar: ar }; }
  function source(i) { return { id: 'original-' + i, url: 'assets/media/scene-' + i + '.mp4', format: 'mp4', mime: 'video/mp4', license: 'CC0-1.0 original generated preview', demo: true, width: 1280, height: 720 }; }
  var seeds = [
    ['aurora', 'Aurora Beyond', 'ما وراء الشفق', 'movie', 0, 'A quiet expedition into an imagined polar world.', 'رحلة هادئة إلى عالم قطبي من الخيال.'],
    ['ember', 'Ember Coast', 'ساحل الجمر', 'movie', 1, 'Follow the last light across a coast of copper and gold.', 'اتبع آخر ضوء على ساحل من النحاس والذهب.'],
    ['orbit', 'The Quiet Orbit', 'المدار الهادئ', 'series', 2, 'Dispatches from a small observatory at the edge of space.', 'يوميات مرصد صغير عند حافة الفضاء.'],
    ['moss', 'Moss & Moon', 'الطحلب والقمر', 'anime', 3, 'Two unlikely travelers trace a path through a luminous forest.', 'مسافران يرسمان طريقاً عبر غابة مضيئة.'],
    ['tide', 'Blue Meridian', 'خط الزوال الأزرق', 'movie', 0, 'An abstract journey through the colors of open water.', 'رحلة تجريدية عبر ألوان المياه المفتوحة.'],
    ['solstice', 'Solstice Letters', 'رسائل الانقلاب', 'series', 1, 'Stories of changing seasons in a fictional mountain town.', 'حكايات الفصول المتغيرة في بلدة جبلية خيالية.'],
    ['violet', 'Violet Atlas', 'أطلس البنفسج', 'anime', 2, 'A young mapmaker discovers a sky with no boundaries.', 'رسام خرائط يكتشف سماء بلا حدود.'],
    ['garden', 'After the Rain', 'بعد المطر', 'movie', 3, 'Small discoveries in an imaginary garden.', 'اكتشافات صغيرة في حديقة خيالية.'],
    ['north', 'Northern Signal', 'إشارة الشمال', 'series', 0, 'An observatory listens for the return of a forgotten signal.', 'مرصد ينتظر عودة إشارة منسية.'],
    ['saffron', 'Saffron Sky', 'سماء الزعفران', 'anime', 1, 'A playful adventure across floating islands.', 'مغامرة مرحة عبر جزر عائمة.'],
    ['echo', 'Echo Valley', 'وادي الصدى', 'movie', 2, 'A study of light, distance, and the shape of silence.', 'تأمل في الضوء والمسافة وشكل الصمت.'],
    ['fern', 'The Green Hour', 'الساعة الخضراء', 'series', 3, 'A fictional field journal of a world waking up.', 'يوميات خيالية لعالم يستيقظ.'],
    ['glacier', 'Glacier Notes', 'مذكرات الجليد', 'movie', 0, 'An imagined portrait of a changing landscape.', 'صورة متخيلة لمنظر طبيعي متغير.'],
    ['cinder', 'Cinder Trails', 'دروب الرماد', 'movie', 1, 'Trace luminous lines through a world of warm colors.', 'تتبع خطوط الضوء في عالم من الألوان الدافئة.'],
    ['lunar', 'Lunar Postcards', 'بطاقات قمرية', 'anime', 2, 'Messages between friends on distant fictional moons.', 'رسائل أصدقاء على أقمار خيالية بعيدة.'],
    ['delta', 'Emerald Delta', 'دلتا الزمرد', 'movie', 3, 'A slow voyage across an imaginary river delta.', 'رحلة بطيئة عبر دلتا نهر خيالية.']
  ];
  var catalog = seeds.map(function (s, i) {
    var item = { id: s[0], title: text(s[1], s[2]), kind: s[3], year: 2026, rating: 'DEMO', genres: text(s[3] === 'anime' ? 'Animation · Adventure' : 'Atmosphere · Discovery', s[3] === 'anime' ? 'رسوم · مغامرة' : 'أجواء · اكتشاف'), description: text(s[5], s[6]), artwork: { url: 'assets/art/scene-' + s[4] + '.svg', alt: text('Original abstract landscape', 'منظر تجريدي أصلي'), width: 1280, height: 720 }, tags: [i % 2 ? 'popular' : 'trending', 'recent'], demo: true };
    if (item.kind === 'movie') item.source = source(s[4]);
    else item.seasons = [1, 2].map(function (season) { return { id: item.id + '-s' + season, number: season, episodes: [1, 2, 3].map(function (n) { return { id: item.id + '-s' + season + '-e' + n, number: n, title: text('Chapter ' + n, 'الفصل ' + n), duration: 18, source: source((s[4] + n - 1) % 4) }; }) }; });
    return item;
  });
  function find(id) { var item = catalog.find(function (t) { return t.id === id; }); if (!item) throw new Error('Title not found'); return item; }
  function normalize(q) { return q.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي'); }
  var mock = {
    id: 'local-demo', enabled: true,
    list: function () { return Promise.resolve(catalog); },
    details: function (id) { return Promise.resolve().then(function () { return find(id); }); },
    search: function (q) { var needle = normalize(q); return Promise.resolve(catalog.filter(function (t) { return normalize(t.title.en + ' ' + t.title.ar).indexOf(needle) >= 0; })); },
    recommendations: function (id) { var item = find(id); return Promise.resolve(catalog.filter(function (t) { return t.id !== id && t.kind === item.kind; })); },
    resolve: function (id, episodeId) { return Promise.resolve().then(function () { var item = find(id); if (item.source) return item.source; var episodes = [].concat.apply([], item.seasons.map(function (s) { return s.episodes; })); var episode = episodeId ? episodes.find(function (e) { return e.id === episodeId; }) : episodes[0]; if (!episode) throw new Error('Episode not found'); return episode.source; }); }
  };
  var disabled = function () { return Promise.reject(new Error('FrameXTV integration disabled: no authorized API or content permissions verified. See INTEGRATION_REPORT.md.')); };
  FX.providers = { mock: mock, framextv: { id: 'framextv-unconfigured', enabled: false, list: disabled, details: disabled, search: disabled, recommendations: disabled, resolve: disabled } };
  if (typeof module !== 'undefined') module.exports = FX.providers;
}(typeof window === 'undefined' ? globalThis : window));
