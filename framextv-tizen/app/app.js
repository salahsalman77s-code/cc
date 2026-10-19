/* Independent, locally bundled TV application. No embedded website or remote UI. */
(function () {
  'use strict';
  var FX = window.FX, store;
  try { store = FX.createStore(window.localStorage); } catch (e) { store = FX.createStore({ getItem: function () { return null; }, setItem: function () { throw new Error('Storage disabled'); } }); }
  var provider = FX.providers.mock, catalog = [], route = { page: 'home' }, stack = [], season = 0;
  var renderToken = 0, query = '', limit = 12, modalRestore = '', toastTimer, subtitleTimer;
  var playing = null, player = null, lastSaved = -1, lastTime = { position: 0, duration: 0 }, pendingPlay = 0;
  var content = document.getElementById('content'), sidebar = document.getElementById('sidebar');
  var dialog = document.getElementById('dialog'), playerScreen = document.getElementById('player-screen');
  var nav = FX.createNavigation(function () { return !dialog.hidden ? dialog : playing ? playerScreen : document.getElementById('app-shell'); });
  function lang() { return store.settings().language; }
  function t(key) { return FX.words[lang()][key] || key; }
  function local(value) { return value[lang()] || value.en; }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function btn(label, action, key, classes, extra) { return '<button class="' + (classes || '') + '" data-action="' + esc(action) + '" data-focus="' + esc(key || action) + '" ' + (extra || '') + '>' + esc(label) + '</button>'; }
  function focused() { return document.activeElement.getAttribute('data-focus') || ''; }
  function restore(key) {
    var found = nav.candidates().find(function (el) { return el.getAttribute('data-focus') === key; });
    if (found) nav.focus(found); else if (playing) nav.focus(document.querySelector('[data-focus="player-toggle"]')); else nav.focus(content.querySelector('button,input') || sidebar.querySelector('button'));
  }
  function toast(message) { var el = document.getElementById('toast'); clearTimeout(toastTimer); el.textContent = message; el.hidden = false; toastTimer = setTimeout(function () { el.hidden = true; }, 3500); }
  function titleById(id) { return catalog.find(function (item) { return item.id === id; }); }
  function recentProgress(id) { return store.allProgress().find(function (p) { return p.titleId === id; }); }
  function allEpisodes(item) { return item.seasons ? [].concat.apply([], item.seasons.map(function (s) { return s.episodes; })) : []; }
  function nextEpisode() { if (!playing) return null; var eps = allEpisodes(playing.item), i = eps.findIndex(function (ep) { return ep.id === playing.episode; }); return i >= 0 ? eps[i + 1] || null : null; }
  function format(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function card(item, prefix) {
    var progress = recentProgress(item.id), percent = progress && progress.duration > 0 ? Math.min(100, progress.position / progress.duration * 100) : 0;
    return '<button class="card" data-action="details" data-id="' + esc(item.id) + '" data-focus="' + esc(prefix + '-' + item.id) + '"><div class="cover"><img loading="lazy" decoding="async" src="' + esc(item.artwork.url) + '" alt="' + esc(local(item.artwork.alt)) + '"><div class="mini-progress" data-progress="' + percent + '"></div></div><span class="card-name">' + esc(local(item.title)) + '</span><span class="card-meta">' + esc(t(item.kind === 'movie' ? 'movies' : item.kind)) + ' · ' + item.year + ' · DEMO</span></button>';
  }
  function row(label, items, prefix) { return !items.length ? '' : '<section class="row-section"><h2>' + esc(label) + '</h2><div class="card-row">' + items.slice(0, 16).map(function (item) { return card(item, prefix); }).join('') + '</div></section>'; }
  function grid(items, prefix) { return '<div class="grid">' + items.slice(0, limit).map(function (item) { return card(item, prefix); }).join('') + '</div>' + (items.length > limit ? btn(t('more'), 'more', 'more') : ''); }
  function empty(message) { return '<section class="empty"><h2>' + esc(t('empty')) + '</h2><p>' + esc(message) + '</p></section>'; }
  function pageTitle(label, note) { return '<header class="page-title"><span class="eyebrow">FRAMEXTV / ' + esc(t('demo')) + '</span><h1>' + esc(label) + '</h1>' + (note ? '<p class="note">' + esc(note) + '</p>' : '') + '</header>'; }
  function drawSidebar() {
    var pages = [['home','◈'],['movies','▣'],['series','▤'],['anime','✧'],['search','⌕'],['list','＋'],['history','◷'],['settings','⚙']];
    sidebar.innerHTML = '<div class="brand">FRAME<span>X</span><em>TV</em><small>INDEPENDENT TV APP</small></div>' + pages.map(function (p) { return '<button class="nav-button ' + (route.page === p[0] ? 'active' : '') + '" data-action="nav" data-page="' + p[0] + '" data-focus="nav-' + p[0] + '" ' + (route.page === p[0] ? 'aria-current="page"' : '') + '><span class="nav-icon" aria-hidden="true">' + p[1] + '</span>' + esc(t(p[0])) + '</button>'; }).join('') + '<p class="sidebar-foot">' + esc(t('rights')) + '<br>v2.0 · Local demo</p>';
  }
  function drawHome() {
    var item = catalog[0]; if (!item) return empty(t('catalogError'));
    var seen = {};
    var continuing = store.allProgress().filter(function (p) { if (p.completed || p.position < 500 || seen[p.titleId]) return false; seen[p.titleId] = true; return true; }).map(function (p) { return titleById(p.titleId); }).filter(Boolean);
    return '<section class="hero"><img src="' + item.artwork.url + '" alt="' + esc(local(item.artwork.alt)) + '"><div class="hero-copy"><span class="eyebrow">' + esc(t('demo')) + ' / 2026</span><h1>' + esc(local(item.title)) + '</h1><p>' + esc(local(item.description)) + '</p><div class="actions">' + btn('▶ ' + t('play'), 'play', 'hero-play', 'primary', 'data-id="' + item.id + '"') + btn(t('details'), 'details', 'hero-details', 'secondary', 'data-id="' + item.id + '"') + '</div></div></section><p class="note">' + esc(t('demoNote')) + '</p>' + row(t('continue'), continuing, 'continue') + row(t('trending'), catalog.filter(function (i) { return i.tags.indexOf('trending') >= 0; }), 'trending') + row(t('popular'), catalog.filter(function (i) { return i.tags.indexOf('popular') >= 0; }), 'popular') + row(t('recent'), catalog.slice().reverse(), 'recent');
  }
  async function drawDetails() {
    var item = await provider.details(route.id), saved = recentProgress(item.id), inList = store.watchlist().indexOf(item.id) >= 0;
    var html = btn('‹ ' + t('back'), 'back', 'details-back') + '<section class="detail-top"><img class="detail-art" src="' + item.artwork.url + '" alt="' + esc(local(item.artwork.alt)) + '"><div><span class="pill">' + esc(t('demo')) + '</span><h1>' + esc(local(item.title)) + '</h1><div class="meta">2026 · ' + esc(local(item.genres)) + '</div><p>' + esc(local(item.description)) + '</p><p class="note">' + esc(t('sample')) + '</p><div class="actions">' + btn('▶ ' + t(saved && !saved.completed ? 'resume' : 'play'), 'play', 'details-play', 'primary', 'data-id="' + item.id + '"') + btn(t(inList ? 'remove' : 'add'), 'toggle-list', 'details-list', '', 'data-id="' + item.id + '"') + '</div></div></section>';
    if (item.seasons) {
      season = Math.min(season, item.seasons.length - 1);
      html += '<h2>' + esc(t('episodes')) + '</h2><div class="season-tabs">' + item.seasons.map(function (s, i) { return btn(t('season') + ' ' + s.number, 'season', 'season-' + i, season === i ? 'selected' : '', 'data-index="' + i + '" aria-pressed="' + (season === i) + '"'); }).join('') + '</div><div class="episode-row">' + item.seasons[season].episodes.map(function (ep) { var p = store.progress(item.id, ep.id); return '<button class="episode" data-action="play" data-id="' + item.id + '" data-episode="' + ep.id + '" data-focus="ep-' + ep.id + '"><span class="eyebrow">' + esc(t('episode')) + ' ' + ep.number + '</span><strong>' + esc(local(ep.title)) + '</strong><small>' + esc(t('sample')) + (p ? ' · ' + format(p.position) : '') + '</small></button>'; }).join('') + '</div>';
    }
    return html + row(t('recommended'), await provider.recommendations(item.id), 'recommended');
  }
  // Search rendering is separate to preserve focus and text while the keyboard is used.
  async function searchHtml() {
    var letters = lang() === 'ar' ? 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآةىؤئ0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var results = await provider.search(query, lang());
    return pageTitle(t('search')) + '<div class="search-layout"><div><input id="search-input" class="search-box" aria-label="' + esc(t('searchHint')) + '" placeholder="' + esc(t('searchHint')) + '" value="' + esc(query) + '" data-focus="search-input" maxlength="80"><p class="note">' + esc(t('searchHint')) + '</p></div><div><div class="keyboard" aria-label="' + esc(t('keyboard')) + '">' + Array.from(letters).map(function (c) { return btn(c, 'letter', 'key-' + c, '', 'data-char="' + c + '"'); }).join('') + '</div><div class="keyboard-tools">' + btn(t('space'), 'space', 'key-space') + btn(t('delete'), 'delete', 'key-delete') + btn(t('clear'), 'clear', 'key-clear') + btn(lang() === 'en' ? 'العربية' : 'English', 'keyboard-language', 'key-lang') + '</div></div></div><h2>' + esc(t('search')) + ' <span class="muted">/ ' + esc(query || '…') + '</span></h2>' + (results.length ? grid(results, 'search') : empty(t('noResults')));
  }
  function drawSettings() { var s = store.settings(); return pageTitle(t('settings')) + '<div class="settings-list">' + btn(t('language') + '   /   ' + (s.language === 'en' ? 'English' : 'العربية'), 'language', 'setting-language', 'setting') + btn(t('autoplay') + '   /   ' + t(s.autoplay ? 'on' : 'off'), 'autoplay', 'setting-autoplay', 'setting') + btn(t('aspect') + '   /   ' + t(s.aspect), 'aspect-setting', 'setting-aspect', 'setting') + btn(t('clearHistory'), 'clear-history', 'setting-clear', 'setting') + '</div><section class="about"><h2>' + esc(t('about')) + '</h2><p>' + esc(t('aboutText')) + '</p><p>' + esc(t('health')) + ': ' + esc(t(player.native ? 'native' : 'browser')) + '</p><p>' + esc(t('rights')) + '</p></section>'; }
  async function render(key) {
    var version = ++renderToken;
    document.documentElement.lang = lang(); document.documentElement.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    drawSidebar();
    try {
      var html;
      if (route.page === 'home') html = drawHome();
      else if (route.page === 'details') html = await drawDetails();
      else if (route.page === 'search') html = await searchHtml();
      else if (route.page === 'settings') html = drawSettings();
      else {
        var items = route.page === 'list' ? store.watchlist().map(titleById).filter(Boolean) : route.page === 'history' ? store.history().map(titleById).filter(Boolean) : catalog.filter(function (item) { return item.kind === (route.page === 'movies' ? 'movie' : route.page); });
        html = pageTitle(t(route.page), t('demoNote')) + (items.length ? grid(items, route.page) : empty(t(route.page === 'list' ? 'emptyList' : 'emptyHistory')));
      }
      if (version !== renderToken) return;
      content.innerHTML = html;
      content.querySelectorAll('[data-progress]').forEach(function (el) { el.style.width = el.dataset.progress + '%'; });
      content.querySelectorAll('img').forEach(function (img) { img.addEventListener('error', function () { img.hidden = true; }); });
      restore(key);
      if (route.page === 'search' && key === 'search-input') { var input = document.getElementById('search-input'); input.setSelectionRange(input.value.length, input.value.length); }
      networkStatus();
    } catch (e) {
      if (version !== renderToken) return;
      content.innerHTML = pageTitle(t('error')) + empty(t('catalogError')) + btn(t('retry'), 'reload', 'reload');
      restore('reload');
    }
  }
  function go(next, replace) { ++pendingPlay; if (!replace) stack.push({ route: Object.assign({}, route), focus: focused(), scroll: content.scrollTop, season: season, limit: limit }); route = next; limit = 12; season = 0; content.scrollTop = 0; render(); }
  function back() {
    if (!dialog.hidden) { closeDialog(); return; }
    if (playing) { stopPlayback(); return; }
    ++pendingPlay;
    if (stack.length) { var previous = stack.pop(); route = previous.route; season = previous.season; limit = previous.limit; render(previous.focus).then(function () { content.scrollTop = previous.scroll; }); }
    else if (route.page !== 'home') { route = { page: 'home' }; render('nav-home'); }
    else confirmExit();
  }
  function openDialog(title, body) { modalRestore = focused(); dialog.innerHTML = '<section class="dialog-card"><h2 id="dialog-title">' + esc(title) + '</h2>' + body + '</section>'; dialog.hidden = false; nav.first(); }
  function closeDialog() { dialog.hidden = true; dialog.innerHTML = ''; restore(modalRestore); }
  function confirmExit() { openDialog(t('exitTitle'), '<p>' + esc(t('exitBody')) + '</p><div class="actions">' + btn(t('cancel'), 'dialog-close', 'exit-cancel', 'primary') + btn(t('exit'), 'exit', 'exit-confirm') + '</div>'); }
  function networkStatus() { var el = document.getElementById('network'); el.hidden = navigator.onLine; el.textContent = t('offline'); }
  function saveProgress(complete) { if (playing && lastTime.duration > 0) { store.record(playing.item.id, playing.episode, lastTime.position, lastTime.duration, complete); lastSaved = lastTime.position; } }
  function playerControls() {
    var state = player.state();
    var buttons = btn('‹ ' + t('stop'), 'stop', 'player-stop') + btn(t('rewind'), 'rewind', 'player-rewind') + btn(t(state === 'PLAYING' ? 'pause' : 'playControl'), 'pause', 'player-toggle', 'primary') + btn(t('forward'), 'forward', 'player-forward') + btn(t('audio'), 'audio', 'player-audio') + btn(t('subtitles'), 'subtitles', 'player-subtitles') + btn(t(store.settings().aspect), 'player-aspect', 'player-aspect');
    if (nextEpisode()) buttons += btn(t('next'), 'next', 'player-next');
    if (state === 'ERROR') buttons += btn(t('retry'), 'player-retry', 'player-retry');
    if (state === 'ENDED') buttons += btn(t('replay'), 'replay', 'player-replay');
    var key = focused(); document.getElementById('player-controls').innerHTML = buttons;
    document.getElementById('control-hint').textContent = t('controls');
    if (playing && dialog.hidden) restore(key.indexOf('player-') === 0 ? key : 'player-toggle');
  }
  async function startPlayback(itemId, episodeId) {
    var request = ++pendingPlay;
    try {
      var item = await provider.details(itemId), recent = recentProgress(itemId);
      var ep = episodeId || (recent && !recent.completed && recent.episodeId) || (allEpisodes(item)[0] || {}).id || null;
      var source = await provider.resolve(itemId, ep);
      if (request !== pendingPlay) return;
      var oldFocus = playing ? playing.focus : focused();
      if (playing) { saveProgress(false); player.stop(); }
      playing = { item: item, episode: ep, source: source, focus: oldFocus };
      lastSaved = -1; lastTime = { position: 0, duration: 0 };
      var progress = store.progress(itemId, ep), resume = progress && !progress.completed ? progress.position : 0;
      document.getElementById('app-shell').hidden = true;
      playerScreen.hidden = false; document.body.classList.add('playing'); document.documentElement.classList.add('playing');
      document.getElementById('video').hidden = player.native;
      document.getElementById('av-player').hidden = !player.native;
      document.getElementById('engine-label').textContent = t(player.native ? 'native' : 'browser');
      var episode = allEpisodes(item).find(function (e) { return e.id === ep; });
      document.getElementById('player-title').textContent = local(item.title) + (episode ? ' · ' + local(episode.title) : '');
      document.getElementById('sample-label').textContent = t('sample');
      document.getElementById('playback-message').hidden = true;
      document.getElementById('subtitle').textContent = '';
      player.open(source, resume, store.settings().aspect);
      playerControls();
    } catch (e) { if (request === pendingPlay) toast(t('playbackError') + ': ' + e.message); }
  }
  function stopPlayback() {
    ++pendingPlay; if (!playing) return;
    var key = playing.focus; saveProgress(false); player.stop(); playing = null;
    clearTimeout(subtitleTimer); dialog.hidden = true;
    playerScreen.hidden = true; document.getElementById('app-shell').hidden = false; document.body.classList.remove('playing'); document.documentElement.classList.remove('playing');
    render(key);
  }
  function playerEvent(name, detail) {
    if (name === 'time') {
      lastTime = detail;
      document.getElementById('time-current').textContent = format(detail.position);
      document.getElementById('time-total').textContent = format(detail.duration);
      var percent = detail.duration > 0 ? Math.min(100, detail.position / detail.duration * 100) : 0;
      document.getElementById('time-fill').style.width = percent + '%';
      document.getElementById('timeline').setAttribute('aria-valuenow', String(Math.round(percent)));
      if (Math.abs(detail.position - lastSaved) >= 3000) saveProgress(false);
    } else if (name === 'state') { if (playing) { playerControls(); if (detail === 'PLAYING' && document.hidden) player.pause(); } }
    else if (name === 'buffering') { document.getElementById('buffering').hidden = !detail; document.getElementById('buffering').textContent = t('buffering'); }
    else if (name === 'error') { var msg = document.getElementById('playback-message'); msg.hidden = false; msg.textContent = t('playbackError') + ': ' + detail; playerControls(); if (playing) restore('player-retry'); saveProgress(false); }
    else if (name === 'notice') toast(detail);
    else if (name === 'subtitle') { clearTimeout(subtitleTimer); document.getElementById('subtitle').textContent = detail && detail.text || ''; subtitleTimer = setTimeout(function () { document.getElementById('subtitle').textContent = ''; }, detail && detail.duration > 0 ? detail.duration : 5000); }
    else if (name === 'ended') {
      saveProgress(true);
      var next = nextEpisode();
      if (next && store.settings().autoplay) startPlayback(playing.item.id, next.id);
      else { document.getElementById('playback-message').hidden = false; document.getElementById('playback-message').textContent = t('ended'); playerControls(); restore(next ? 'player-next' : 'player-replay'); }
    }
  }
  function trackDialog(type) {
    var tracks = player.tracks().filter(function (track) { return track.type === type; });
    var body = '<p>' + esc(tracks.length ? t('selected') : t('unavailable')) + '</p><div class="track-list">';
    if (type === 'TEXT' && player.native) body += btn(t('subtitleOff'), 'track', 'track-off', '', 'data-type="TEXT" data-index="-1"');
    tracks.forEach(function (track, i) { var label = type + ' ' + (i + 1); try { var extra = JSON.parse(track.extra_info || '{}'); label += ' · ' + (extra.language || extra.track_lang || ''); } catch (e) { /* Metadata is optional. */ } body += btn(label, 'track', 'track-' + i, '', 'data-type="' + type + '" data-index="' + Number(track.index) + '"'); });
    openDialog(t(type === 'AUDIO' ? 'audio' : 'subtitles'), body + btn(t('back'), 'dialog-close', 'track-back') + '</div>');
  }
  async function action(button) {
    var name = button.dataset.action, key = button.dataset.focus;
    if (name === 'nav') { stack = []; go({ page: button.dataset.page }, true); return; }
    if (name === 'details') { go({ page: 'details', id: button.dataset.id }); return; }
    if (name === 'play') { await startPlayback(button.dataset.id, button.dataset.episode); return; }
    if (name === 'back') { back(); return; }
    if (name === 'toggle-list') { store.toggle(button.dataset.id); render(key); return; }
    if (name === 'season') { season = Number(button.dataset.index); render(key); return; }
    if (name === 'more') { limit += 12; render(key); return; }
    if (name === 'letter' || name === 'space' || name === 'delete' || name === 'clear') {
      if (name === 'letter') query = (query + button.dataset.char).slice(0, 80);
      else if (name === 'space') query = (query + ' ').slice(0, 80);
      else if (name === 'delete') query = query.slice(0, -1); else query = '';
      limit = 12; render(key); return;
    }
    if (name === 'language' || name === 'keyboard-language') { store.setting('language', lang() === 'en' ? 'ar' : 'en'); render(key); return; }
    if (name === 'autoplay') { store.setting('autoplay', !store.settings().autoplay); render(key); return; }
    if (name === 'aspect-setting' || name === 'player-aspect') { var aspect = store.settings().aspect === 'fit' ? 'fill' : 'fit'; store.setting('aspect', aspect); if (playing) { player.aspect(aspect); playerControls(); } else render(key); return; }
    if (name === 'clear-history') { openDialog(t('clearHistory') + '?', '<div class="actions">' + btn(t('cancel'), 'dialog-close', 'clear-cancel', 'primary') + btn(t('clear'), 'confirm-clear', 'clear-confirm') + '</div>'); return; }
    if (name === 'confirm-clear') { store.clearHistory(); closeDialog(); toast(t('cleared')); return; }
    if (name === 'reload') { await loadCatalog(); return; }
    if (name === 'dialog-close') { closeDialog(); return; }
    if (name === 'exit') { try { tizen.application.getCurrentApplication().exit(); } catch (e) { closeDialog(); toast(t('exitUnavailable')); } return; }
    if (name === 'stop') { stopPlayback(); return; }
    if (name === 'pause') { if (player.state() === 'ENDED') action({ dataset: { action: 'replay' } }); else player.toggle(); return; }
    if (name === 'rewind') { player.skip(-10000); return; }
    if (name === 'forward') { player.skip(10000); return; }
    if (name === 'next') { var next = nextEpisode(); if (next) startPlayback(playing.item.id, next.id); else toast(t('noNext')); return; }
    if (name === 'player-retry' || name === 'replay') { document.getElementById('playback-message').hidden = true; player.open(playing.source, name === 'replay' ? 0 : lastTime.position, store.settings().aspect); return; }
    if (name === 'audio' || name === 'subtitles') { trackDialog(name === 'audio' ? 'AUDIO' : 'TEXT'); return; }
    if (name === 'track') { if (player.selectTrack(button.dataset.type, Number(button.dataset.index))) toast(t('selected')); closeDialog(); }
  }
  document.addEventListener('click', function (event) { var button = event.target.closest('button[data-action]'); if (button && !button.disabled) action(button).catch(function (e) { toast(t('error') + ': ' + e.message); }); });
  document.addEventListener('input', function (event) { if (event.target.id === 'search-input') { query = event.target.value.slice(0, 80); limit = 12; render('search-input'); } });
  document.addEventListener('keydown', function (event) {
    var code = event.keyCode, key = { 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown' }[code] || event.key;
    if (code === 10009 || key === 'Escape' || key === 'BrowserBack') { event.preventDefault(); if (!event.repeat) back(); return; }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(key) >= 0) { event.preventDefault(); nav.move(key); return; }
    if ((key === 'Enter' || code === 13) && !event.repeat) { event.preventDefault(); if (document.activeElement.tagName === 'BUTTON') document.activeElement.click(); return; }
    if (!playing || !dialog.hidden) return;
    if (code === 415 || key === 'MediaPlay') { event.preventDefault(); player.play(); }
    else if (code === 19 || key === 'MediaPause') { event.preventDefault(); player.pause(); }
    else if (code === 10252 || key === 'MediaPlayPause' || key === ' ') { event.preventDefault(); player.toggle(); }
    else if (code === 417 || key === 'MediaFastForward') { event.preventDefault(); player.skip(10000); }
    else if (code === 412 || key === 'MediaRewind') { event.preventDefault(); player.skip(-10000); }
    else if (code === 413 || key === 'MediaStop') { event.preventDefault(); stopPlayback(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) { player.pause(); saveProgress(false); } });
  window.addEventListener('pagehide', function () { if (player) { saveProgress(false); player.stop(); } });
  window.addEventListener('offline', function () { networkStatus(); if (playing && playing.source.url.indexOf('https://') === 0) { player.pause(); saveProgress(false); toast(t('offline')); } });
  window.addEventListener('online', function () { networkStatus(); toast(t('online')); });
  async function loadCatalog() {
    content.innerHTML = pageTitle(t('loading')) + '<div class="grid">' + '<div class="skeleton"></div>'.repeat(8) + '</div>';
    try { catalog = await provider.list(); await render(); }
    catch (e) { content.innerHTML = pageTitle(t('error')) + empty(t('catalogError')) + btn(t('retry'), 'reload', 'reload'); drawSidebar(); restore('reload'); }
  }
  function boot() {
    player = FX.createPlayer({ video: document.getElementById('video'), avplay: window.webapis && window.webapis.avplay, event: playerEvent });
    FX.registerMediaKeys();
    loadCatalog().then(function () { if (store.warning()) toast(t('storage')); });
  }
  if (window.tizen) {
    var script = document.createElement('script'); script.src = '$WEBAPIS/webapis/webapis.js';
    script.onload = boot; script.onerror = function () { boot(); toast('Samsung API unavailable. Browser player selected; inspect the TV API installation.'); };
    document.head.appendChild(script);
  } else boot();
}());
