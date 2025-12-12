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
    '[contenteditable="true"]'
  ];

  let fullscreenActive = false;

  document.addEventListener('fullscreenchange', function () {
    fullscreenActive = !!document.fullscreenElement;
  });

  window.addEventListener('keydown', function (eventObject) {
    if (!fullscreenActive) {
      if (
        eventObject.key === 'ArrowLeft' ||
        eventObject.key === 'ArrowRight' ||
        eventObject.key === 'ArrowUp' ||
        eventObject.key === 'ArrowDown'
      ) {
        eventObject.preventDefault();
        eventObject.stopPropagation();
      }
      return;
    }

    if (
      eventObject.key === 'ArrowLeft' ||
      eventObject.key === 'ArrowRight' ||
      eventObject.key === 'ArrowUp' ||
      eventObject.key === 'ArrowDown'
    ) {
      return;
    }

    if (eventObject.key === 'Enter') {
      eventObject.preventDefault();
      eventObject.stopPropagation();
      if (window?.STNAV_CORE?.state?.websocketLink) {
        window.STNAV_CORE.state.websocketLink.send('VideoPlayPause');
      }
      return;
    }

    eventObject.preventDefault();
    eventObject.stopPropagation();
  }, true);
})();

