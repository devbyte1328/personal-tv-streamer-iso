(function () {
  'use strict';

  const {
    state,
    highlight,
    clearHighlight,
    getFocusableList
  } = window.STNAV_CORE;

  const { move } = window.STNAV_FOCUS;

  function activate(item) {
    if (!item) return;
    const tag = item.tagName.toLowerCase();
    if (item.matches('ytd-playlist-panel-video-renderer, .yt-lockup-view-model')) {
      const link = item.querySelector('a[href]');
      if (link) return link.click();
    }
    if (['input', 'textarea', 'select'].includes(tag) || item.isContentEditable) {
      state.keyboardEntryMode = true;
      item.focus();
      return;
    }
    try {
      item.click();
    } catch {
      item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  }

  function leaveTyping() {
    state.keyboardEntryMode = false;
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    if (!state.isScrolling && state.activeElement) {
      highlight(state.activeElement);
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      state.navigationEnabled = false;
      clearHighlight();
    } else {
      state.navigationEnabled = true;
      const list = getFocusableList();
      if (list.length > 0) highlight(list[0]);
    }
  });

  const fullscreenSites = [
    {
      domain: "https://ondisneyplus.disney.com/",
      selector: 'button.vjs-fullscreen-control.vjs-control.vjs-button[title="Full Screen"]'
    },
    {
      domain: "https://watch.plex.tv",
      selector: 'button[title="Enter Fullscreen"]'
    }
  ];

  function autoFullscreen() {
    const here = location.href;
    for (const s of fullscreenSites) {
      if (here.startsWith(s.domain)) {
        const btn = document.querySelector(s.selector);
        if (btn) btn.click();
        return true;
      }
    }
    return false;
  }

  function keyHandler(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    if (!state.keyboardEntryMode && e.key.toLowerCase() === 'f') {
      if (autoFullscreen()) return;
    }

    if (state.keyboardEntryMode) {
      if (e.key === 'Escape') {
        e.preventDefault();
        leaveTyping();
      }
      return;
    }

    if (state.isScrolling) return;

    if (e.key.toLowerCase() === 'p') {
      if (!state.navigationEnabled) {
        e.preventDefault();
        state.websocketLink.send("VideoPlayPause");
      }
      return;
    }

    if (!state.navigationEnabled) {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
      return;
    }

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
      move({
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right'
      }[e.key]);
      return;
    }

    if (['Enter',' '].includes(e.key)) {
      e.preventDefault();
      activate(state.activeElement);
      return;
    }

    const list = getFocusableList();
    if (!list.length) return;

    if (e.key === 'Home') {
      e.preventDefault();
      highlight(list[0]);
    }

    if (e.key === 'End') {
      e.preventDefault();
      highlight(list[list.length - 1]);
    }
  }

  window.addEventListener('keydown', keyHandler, true);
})();

