/* Cross-origin content owns its internal navigation and HTML5 playback. */
(function () {
  'use strict';
  var frame = document.getElementById('website');
  var panel = document.getElementById('panel');
  var actions = document.getElementById('actions');
  var spinner = document.getElementById('spinner');
  var timer;
  var buttons = ['retry', 'continue', 'exit'].map(function (id) { return document.getElementById(id); });
  function exit() {
    try { tizen.application.getCurrentApplication().exit(); }
    catch (e) { show('Exit unavailable', 'Use the TV Home button to leave the app.'); }
  }
  function show(title, message) {
    clearTimeout(timer);
    panel.hidden = false;
    spinner.hidden = true;
    actions.hidden = false;
    document.getElementById('heading').textContent = title;
    document.getElementById('message').textContent = message;
    buttons[0].focus();
  }
  function reveal() {
    clearTimeout(timer);
    panel.hidden = true;
    frame.focus();
    try { frame.contentWindow.focus(); } catch (e) { /* Browser retains cross-origin isolation. */ }
  }
  function load() {
    clearTimeout(timer);
    panel.hidden = false;
    spinner.hidden = false;
    actions.hidden = true;
    document.getElementById('heading').textContent = 'Connecting…';
    document.getElementById('message').textContent = 'Loading framextv.xyz';
    // Set before navigation: cached documents can finish loading immediately.
    timer = setTimeout(function () {
      show('The website is taking too long', 'Check the TV connection, then retry. The site may also block embedding. Show website can reveal a partially loaded page.');
    }, 25000);
    frame.src = 'https://framextv.xyz/';
  }
  frame.addEventListener('load', function () {
    if (!frame.getAttribute('src')) return;
    // A load event also occurs for some blocked/error documents: it is not proof of success.
    reveal();
  });
  frame.addEventListener('error', function () {
    show('Unable to load website', 'Check the TV network connection and retry. Site embedding restrictions may require a change by the website owner.');
  });
  window.addEventListener('offline', function () { show('No network connection', 'Reconnect the TV, then select Retry.'); });
  window.addEventListener('online', function () { if (!panel.hidden) show('Connection restored', 'Select Retry to reload the website.'); });
  buttons[0].onclick = load;
  buttons[1].onclick = reveal;
  buttons[2].onclick = exit;
  document.addEventListener('keydown', function (event) {
    var key = event.keyCode;
    if (key === 10009 || key === 27) {
      event.preventDefault();
      if (panel.hidden) show('Connection controls', 'Retry if the page is blank or playback has stopped. Show website returns to the current page.');
      else reveal();
    } else if (!panel.hidden && !actions.hidden && [37, 38, 39, 40].indexOf(key) !== -1) {
      event.preventDefault();
      var index = buttons.indexOf(document.activeElement);
      var delta = key === 37 || key === 38 ? -1 : 1;
      buttons[(index + delta + buttons.length) % buttons.length].focus();
    } else if (!panel.hidden && key === 13 && buttons.indexOf(document.activeElement) !== -1) {
      event.preventDefault();
      document.activeElement.click();
    }
  });
  // Arrow/Enter/Back are mandatory Samsung keys and need no registration.
  // Events consumed by a cross-origin child cannot be intercepted here.
  load();
}());
