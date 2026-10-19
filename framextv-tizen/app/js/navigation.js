(function (root) {
  'use strict';
  var FX = root.FX = root.FX || {};
  function createNavigation(scope) {
    function candidates() { return Array.prototype.slice.call(scope().querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter(function (el) { return !el.closest('[hidden]') && el.getClientRects().length; }); }
    function focus(el) { if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }); } }
    function move(key) {
      var active = document.activeElement, rect = active.getBoundingClientRect();
      var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      var horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
      var sign = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
      var best = null, score = Infinity;
      candidates().forEach(function (el) {
        if (el === active) return;
        var r = el.getBoundingClientRect(), dx = r.left + r.width / 2 - x, dy = r.top + r.height / 2 - y;
        var primary = horizontal ? dx * sign : dy * sign, secondary = Math.abs(horizontal ? dy : dx);
        if (primary < 2) return;
        var overlap = horizontal ? r.top < rect.bottom && r.bottom > rect.top : r.left < rect.right && r.right > rect.left;
        var value = primary + secondary * 3 + (overlap ? 0 : 1800);
        if (value < score) { score = value; best = el; }
      });
      if (best) focus(best);
      return !!best;
    }
    return { move: move, focus: focus, first: function () { focus(candidates()[0]); }, candidates: candidates };
  }
  FX.createNavigation = createNavigation;
  FX.registerMediaKeys = function () {
    if (!root.tizen || !tizen.tvinputdevice) return [];
    var wanted = ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaFastForward', 'MediaRewind'];
    var registered = [];
    try { tizen.tvinputdevice.getSupportedKeys().forEach(function (key) { if (wanted.indexOf(key.name) >= 0) { try { tizen.tvinputdevice.registerKey(key.name); registered.push(key.name); } catch (e) { /* Optional key unavailable. */ } } }); } catch (e) { /* Mandatory keys still work. */ }
    return registered;
  };
}(typeof window === 'undefined' ? globalThis : window));
