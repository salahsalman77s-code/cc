(function (root) {
  'use strict';
  var FX = root.FX = root.FX || {};
  function createPlayer(options) {
    var video = options.video, api = options.avplay || null, emit = options.event || function () {};
    var state = 'IDLE', token = 0, poll = null, watchdog = null, unbind = [], ready = false, seekBusy = false;
    var position = 0, duration = 0, aspect = 'fit', lastSource = null;
    function event(name, detail) { emit(name, detail); }
    function setState(next) { state = next; event('state', next); }
    function clearTimers() { clearInterval(poll); clearTimeout(watchdog); poll = watchdog = null; }
    function buffering(on) {
      clearTimeout(watchdog); event('buffering', on);
      if (on) watchdog = setTimeout(function () { fail('Playback stalled. Check the source or connection, then retry.'); }, 30000);
    }
    function fail(message) {
      clearTimers(); setState('ERROR'); event('buffering', false); event('error', String(message));
      if (api) { try { api.stop(); } catch (e) { /* May be preparing. */ } try { api.close(); } catch (e) { /* Already closed. */ } }
      else { video.pause(); }
      ready = false;
    }
    function progress() {
      try {
        position = api ? api.getCurrentTime() : video.currentTime * 1000;
        duration = api ? api.getDuration() : video.duration * 1000;
        if (Number.isFinite(position) && Number.isFinite(duration)) event('time', { position: position, duration: duration });
      } catch (e) { /* State can change during a native callback. */ }
    }
    function tracks() {
      if (!api || !ready) return [];
      try { return api.getTotalTrackInfo().filter(function (t) { return t.type === 'AUDIO' || t.type === 'TEXT'; }); }
      catch (e) { return []; }
    }
    function stop() {
      token += 1; clearTimers();
      if (ready) progress();
      ready = false; seekBusy = false;
      unbind.forEach(function (off) { off(); }); unbind = [];
      if (api) { try { api.stop(); } catch (e) { /* Valid only in some states. */ } try { api.close(); } catch (e) { /* Idempotent cleanup. */ } }
      else { video.pause(); video.removeAttribute('src'); video.load(); }
      event('buffering', false); event('subtitle', ''); setState('IDLE');
    }
    function play() {
      if (!ready || (state !== 'READY' && state !== 'PAUSED')) return;
      try {
        if (api) { api.play(); setState('PLAYING'); }
        else { var active = token; var result = video.play(); if (result && result.catch) result.catch(function (e) { if (active === token && state !== 'IDLE' && !(state === 'PAUSED' && e.name === 'AbortError')) fail(e.message); }); setState('PLAYING'); }
      } catch (e) { fail(e.message); }
    }
    function pause() {
      if (!ready || state !== 'PLAYING') return;
      try { if (api) api.pause(); else video.pause(); progress(); setState('PAUSED'); } catch (e) { fail(e.message); }
    }
    function seek(ms, done) {
      if (!ready || seekBusy || ['READY', 'PLAYING', 'PAUSED'].indexOf(state) < 0) { if (done) done(); return; }
      var target = Math.max(0, Math.min(ms, Math.max(0, duration - 500)));
      if (!Number.isFinite(target) || duration <= 0) { if (done) done(); return; }
      seekBusy = true; var active = token;
      function finished(error) {
        if (active !== token) return;
        seekBusy = false; progress();
        if (error) event('notice', 'Seek is unavailable for this source.');
        if (done) done();
      }
      try {
        if (api) api.seekTo(target, function () { finished(); }, function () { finished(true); });
        else { video.currentTime = target / 1000; finished(); }
      } catch (e) { finished(true); }
    }
    function display() {
      if (!api || !ready) return;
      try {
        // Samsung AVPlay display coordinates use the 1920x1080 reference space.
        api.setDisplayRect(0, 0, 1920, 1080);
        api.setDisplayMethod(aspect === 'fill' ? 'PLAYER_DISPLAY_MODE_FULL_SCREEN' : 'PLAYER_DISPLAY_MODE_LETTER_BOX');
      } catch (e) { event('notice', 'Display mode is unavailable on this firmware.'); }
    }
    function open(source, resume, mode) {
      stop(); var active = token; lastSource = source; position = 0; duration = 0; aspect = mode || 'fit';
      setState('PREPARING'); buffering(true);
      function valid() { return active === token && state !== 'IDLE' && state !== 'ERROR'; }
      function prepared() {
        if (!valid()) return;
        ready = true; setState('READY'); display(); progress(); buffering(false); event('tracks', tracks());
        function start() { if (valid()) play(); }
        if (resume > 0) seek(resume, start); else start();
      }
      function ended() { if (!valid()) return; progress(); clearTimers(); setState('ENDED'); event('ended'); }
      try {
        var url = new URL(source.url, root.location ? root.location.href : 'http://localhost/').href;
        if (source.format !== 'mp4' && !api) { fail('Adaptive playback requires Samsung AVPlay in this build.'); return; }
        if (api) {
          api.open(url);
          api.setListener({
            onbufferingstart: function () { if (valid()) buffering(true); },
            onbufferingprogress: function (percent) { if (valid()) event('bufferPercent', percent); },
            onbufferingcomplete: function () { if (valid()) buffering(false); },
            oncurrentplaytime: function () { if (valid()) progress(); },
            onstreamcompleted: ended,
            onerror: function (error) { if (valid()) fail('AVPlay: ' + error); },
            onerrormsg: function (error, message) { if (valid()) fail('AVPlay: ' + error + ' ' + message); },
            onsubtitlechange: function (ms, text) { if (valid()) event('subtitle', { text: text || '', duration: ms }); }
          });
          api.setDisplayRect(0, 0, 1920, 1080);
          api.prepareAsync(prepared, function (error) { if (valid()) fail('Unable to prepare media: ' + error); });
        } else {
          function bind(name, fn) { video.addEventListener(name, fn); unbind.push(function () { video.removeEventListener(name, fn); }); }
          bind('loadedmetadata', prepared); bind('ended', ended);
          bind('waiting', function () { if (valid()) buffering(true); });
          bind('playing', function () { if (valid()) buffering(false); });
          bind('error', function () { if (valid()) fail('Media unavailable or unsupported (browser code ' + (video.error ? video.error.code : '?') + ').'); });
          video.style.objectFit = aspect === 'fill' ? 'cover' : 'contain';
          video.src = url; video.load();
        }
        poll = setInterval(function () { if (valid() && ready) progress(); }, 1000);
      } catch (e) { if (valid()) fail(e.message); }
    }
    return { open: open, stop: stop, pause: pause, play: play,
      toggle: function () { if (state === 'PLAYING') pause(); else play(); },
      seek: seek, skip: function (ms) { seek(position + ms); },
      state: function () { return state; }, position: function () { return position; }, duration: function () { return duration; },
      native: !!api, tracks: tracks,
      selectTrack: function (type, index) {
        if (!api || !ready || ['PLAYING', 'PAUSED'].indexOf(state) < 0) { event('notice', 'Track selection is unavailable.'); return false; }
        try {
          if (type === 'TEXT' && index === -1) api.setSilentSubtitle(true);
          else { api.setSelectTrack(type, index); if (type === 'TEXT') api.setSilentSubtitle(false); }
          return true;
        } catch (e) { event('notice', 'This track cannot be selected in the current state.'); return false; }
      },
      aspect: function (value) { aspect = value; if (api) display(); else video.style.objectFit = value === 'fill' ? 'cover' : 'contain'; },
      retry: function (resume) { if (lastSource) open(lastSource, resume, aspect); }
    };
  }
  FX.createPlayer = createPlayer;
  if (typeof module !== 'undefined') module.exports = createPlayer;
}(typeof window === 'undefined' ? globalThis : window));
