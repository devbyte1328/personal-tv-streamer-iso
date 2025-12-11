(function () {
  'use strict';

  window.STNAV_TARGETS = window.STNAV_TARGETS || {};

  window.STNAV_TARGETS.selectors = [
    'a[href]',
    'button:not([disabled])',
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

  function cancelYouTubeShortsHandler(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.stopPropagation();
    }
  }

  if (location.pathname.startsWith('/shorts')) {
    window.addEventListener('keydown', cancelYouTubeShortsHandler, true);
    document.addEventListener('keydown', cancelYouTubeShortsHandler, true);
  }
})();
