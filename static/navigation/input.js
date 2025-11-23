(function () {
  'use strict';

  const {
    state,
    highlight,
    clearHighlight,
    getFocusableList
  } = window.STNAV_CORE;

  const { move } = window.STNAV_FOCUS;

  function activate(el) {
    if (!el) return;
    const t = el.tagName.toLowerCase();
    if (el.matches('ytd-playlist-panel-video-renderer, .yt-lockup-view-model')) {
      const link = el.querySelector('a[href]');
      if (link) return link.click();
    }
    if (['input', 'textarea', 'select'].includes(t) || el.isContentEditable) {
      state.typingMode = true;
      el.focus();
      return;
    }
    try { el.click(); }
    catch { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
  }

  function exitTyping() {
    state.typingMode = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!state.scrolling && state.currentItem) highlight(state.currentItem);
  }

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      state.navEnabled = false;
      clearHighlight();
    } else {
      state.navEnabled = true;
      const all = getFocusableList();
      if (all.length > 0) highlight(all[0]);
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

  function tryFullscreen() {
    const url = location.href;
    for (const site of fullscreenSites) {
      if (url.startsWith(site.domain)) {
        const btn = document.querySelector(site.selector);
        if (btn) btn.click();
        return true;
      }
    }
    return false;
  }

  function handle(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    if (!state.typingMode && e.key.toLowerCase() === 'f') {
      if (tryFullscreen()) return;
    }

    if (state.typingMode) {
      if (e.key === 'Escape') {
        e.preventDefault();
        exitTyping();
      }
      return;
    }

    if (state.scrolling) return;

    if (e.key.toLowerCase() === 'p') {
      if (!state.navEnabled) {
        e.preventDefault();
        state.ws.send("VideoPlayPause");
      }
      return;
    }

    if (!state.navEnabled) {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
      return;
    }

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dir = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right'
      }[e.key];
      move(dir);
      return;
    }

    if (['Enter',' '].includes(e.key)) {
      e.preventDefault();
      activate(state.currentItem);
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

  window.addEventListener('keydown', handle, true);
})();

