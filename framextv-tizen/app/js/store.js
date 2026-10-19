(function (root) {
  'use strict';
  var FX = root.FX = root.FX || {};
  function createStore(storage) {
    var key = 'framextv.standalone.v1', data, warning = '';
    function fresh() { return { version: 1, settings: { language: 'en', autoplay: true, aspect: 'fit' }, list: [], progress: {}, history: [] }; }
    try {
      var raw = storage.getItem(key);
      data = raw ? JSON.parse(raw) : fresh();
      if (!data || data.version !== 1 || !Array.isArray(data.list) || !Array.isArray(data.history) || !data.progress || typeof data.progress !== 'object' || !data.settings) throw new Error('Invalid saved data');
      data.list = data.list.filter(function (id) { return typeof id === 'string'; });
      Object.keys(data.progress).forEach(function (key) { var p = data.progress[key]; if (!p || typeof p.titleId !== 'string' || !Number.isFinite(p.position) || !Number.isFinite(p.duration) || p.duration <= 0 || !Number.isFinite(p.updated)) delete data.progress[key]; });
      data.history = data.history.filter(function (id) { return typeof id === 'string'; }).slice(0, 100);
      if (['en', 'ar'].indexOf(data.settings.language) < 0) data.settings.language = 'en';
      if (['fit', 'fill'].indexOf(data.settings.aspect) < 0) data.settings.aspect = 'fit';
      data.settings.autoplay = data.settings.autoplay !== false;
    } catch (e) { data = fresh(); warning = 'Saved data could not be read. Using session storage.'; }
    function save() { try { storage.setItem(key, JSON.stringify(data)); } catch (e) { warning = 'Storage unavailable or full. Changes apply to this session only.'; } }
    return {
      settings: function () { return Object.assign({}, data.settings); },
      setting: function (name, value) { if (Object.prototype.hasOwnProperty.call(data.settings, name)) { data.settings[name] = value; save(); } },
      watchlist: function () { return data.list.slice(); },
      toggle: function (id) { var i = data.list.indexOf(id); if (i < 0) data.list.push(id); else data.list.splice(i, 1); save(); return i < 0; },
      progress: function (title, episode) { return data.progress[title + ':' + (episode || '')] || null; },
      allProgress: function () { return Object.keys(data.progress).map(function (k) { return data.progress[k]; }).filter(function (p) { return p && typeof p.titleId === 'string' && Number.isFinite(p.position) && Number.isFinite(p.duration); }).sort(function (a, b) { return b.updated - a.updated; }); },
      record: function (title, episode, position, duration, ended) {
        if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
        position = Math.max(0, Math.min(position, duration));
        data.progress[title + ':' + (episode || '')] = { titleId: title, episodeId: episode || null, position: position, duration: duration, updated: Date.now(), completed: !!ended || position >= duration * 0.95 };
        data.history = [title].concat(data.history.filter(function (id) { return id !== title; })).slice(0, 100);
        var keys = Object.keys(data.progress).sort(function (a, b) { return data.progress[b].updated - data.progress[a].updated; });
        keys.slice(200).forEach(function (k) { delete data.progress[k]; });
        save();
      },
      history: function () { return data.history.slice(); },
      clearHistory: function () { data.progress = {}; data.history = []; save(); },
      warning: function () { return warning; }
    };
  }
  FX.createStore = createStore;
  if (typeof module !== 'undefined') module.exports = createStore;
}(typeof window === 'undefined' ? globalThis : window));
