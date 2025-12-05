(function () {
  'use strict';

  const {
    state,
    highlight,
    clearHighlight,
    getFocusableList
  } = window.STNAV_CORE;

  const { move } = window.STNAV_FOCUS;

  function activate(elementGiven) {
    if (!elementGiven) return;

    const tagNameLower = elementGiven.tagName.toLowerCase();

    if (elementGiven.matches('ytd-playlist-panel-video-renderer, .yt-lockup-view-model')) {
      const linkElement = elementGiven.querySelector('a[href]');
      if (linkElement) return linkElement.click();
    }

    if (['input', 'textarea', 'select'].includes(tagNameLower) || elementGiven.isContentEditable) {
      state.keyboardEntryMode = true;
      elementGiven.focus();
      return;
    }

    try {
      elementGiven.click();
    } catch {
      elementGiven.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
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
      const elementList = getFocusableList();
      if (elementList.length > 0) highlight(elementList[0]);
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
    const addressHere = location.href;

    for (const entry of fullscreenSites) {
      if (addressHere.startsWith(entry.domain)) {
        const buttonFound = document.querySelector(entry.selector);
        if (buttonFound) buttonFound.click();
        return true;
      }
    }

    return false;
  }

  function keyHandler(eventObject) {
    if (eventObject.altKey || eventObject.ctrlKey || eventObject.metaKey) return;

    if (!state.keyboardEntryMode && eventObject.key.toLowerCase() === 'f') {
      if (autoFullscreen()) return;
    }

    if (state.keyboardEntryMode) {
      if (eventObject.key === 'Escape') {
        eventObject.preventDefault();
        leaveTyping();
      }
      return;
    }

    if (state.isScrolling) return;

    if (eventObject.key.toLowerCase() === 'p') {
      if (!state.navigationEnabled) {
        eventObject.preventDefault();
        state.websocketLink.send("VideoPlayPause");
      }
      return;
    }

    if (!state.navigationEnabled) {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(eventObject.key)) return;
      return;
    }

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(eventObject.key)) {
      eventObject.preventDefault();
      move({
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right'
      }[eventObject.key]);
      return;
    }

    if (['Enter',' '].includes(eventObject.key)) {
      eventObject.preventDefault();
      activate(state.activeElement);
      return;
    }

    const elementList = getFocusableList();
    if (!elementList.length) return;

    if (eventObject.key === 'Home') {
      eventObject.preventDefault();
      highlight(elementList[0]);
    }

    if (eventObject.key === 'End') {
      eventObject.preventDefault();
      highlight(elementList[elementList.length - 1]);
    }
  }

  window.addEventListener('keydown', keyHandler, true);
})();

