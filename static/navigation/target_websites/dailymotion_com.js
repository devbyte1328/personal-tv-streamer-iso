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

  window.addEventListener("keydown", function (event) {
    if (!fullscreenActive) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Enter") {
      if (window?.STNAV_CORE?.state?.websocketLink) {
        window.STNAV_CORE.state.websocketLink.send("VideoPlayPause");
      }
    }
  }, true);

  document.addEventListener("fullscreenchange", () => {
    fullscreenActive = !!document.fullscreenElement;
  });
})();

