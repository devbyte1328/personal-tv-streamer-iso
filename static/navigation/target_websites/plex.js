(function () {
  'use strict';

  window.STNAV_TARGETS = window.STNAV_TARGETS || {};

  window.STNAV_TARGETS.selectors = [
    'a[href]',
    'button:not([disabled]):not(.PlayerControls_coverButton__3vhI4)',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'ytd-thumbnail',
    'ytd-playlist-panel-video-renderer',
    '.yt-lockup-view-model',
    'ytmusic-responsive-list-item-renderer .title',
    'a.videostream__link.link',
    'li',
    '[role="button"]',
    '[role="link"]',
    'div.rgpl-btn-play'
  ];

  let remapActive = false;

  function remap(event) {
    if (!document.fullscreenElement) return;
    if (!remapActive) return;

    let keyToSend = null;

    if (event.key === 'Enter') keyToSend = ' ';

    if (keyToSend !== null) {
      event.preventDefault();
      event.stopPropagation();
      fake(keyToSend);
    }
  }

  function fake(letter) {
    const upper = letter.toUpperCase();
    const code = upper === ' ' ? 'Space' : upper;
    const keyCode = upper.charCodeAt(0);

    const options = {
      key: letter,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true
    };

    const down = new KeyboardEvent('keydown', options);
    const up = new KeyboardEvent('keyup', options);

    let target = document.activeElement || document.body;
    if (target === document.body) target = document;

    target.dispatchEvent(down);
    target.dispatchEvent(up);
  }

  document.addEventListener('fullscreenchange', () => {
    remapActive = !!document.fullscreenElement;
  });

  window.addEventListener('keydown', remap, true);

  window.addEventListener('keydown', function (eventObject) {
    if (!document.fullscreenElement) return;
    if (eventObject.altKey || eventObject.ctrlKey || eventObject.metaKey) return;

    const video = document.querySelector('video');
    if (!video) return;

    if (eventObject.key === 'ArrowLeft') {
      eventObject.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 600);
    }

    if (eventObject.key === 'ArrowRight') {
      eventObject.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 600);
    }
  }, true);
})();

