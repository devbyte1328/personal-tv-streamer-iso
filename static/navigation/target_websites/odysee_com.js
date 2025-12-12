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

  function setNavigationSystemState(disabledState) {
    if (window?.STNAV_CORE?.state) {
      window.STNAV_CORE.state.navigationDisabled = disabledState;
    }
  }

  window.addEventListener('keydown', function (eventObject) {
    const isArrowKey =
      eventObject.key === 'ArrowLeft' ||
      eventObject.key === 'ArrowRight' ||
      eventObject.key === 'ArrowUp' ||
      eventObject.key === 'ArrowDown';

    if (!fullscreenActive) {
      if (isArrowKey) {
        eventObject.preventDefault();
        eventObject.stopPropagation();
      }
      return;
    }

    if (isArrowKey) {
      return;
    }

    if (eventObject.key === 'Enter') {
      eventObject.preventDefault();
      eventObject.stopPropagation();
      if (window?.STNAV_CORE?.state?.websocketLink) {
        window.STNAV_CORE.state.websocketLink.send('VideoPlayPause');
      }
    }
  }, true);

  document.addEventListener('fullscreenchange', function () {
    fullscreenActive = !!document.fullscreenElement;
    setNavigationSystemState(fullscreenActive);
  });
})();

