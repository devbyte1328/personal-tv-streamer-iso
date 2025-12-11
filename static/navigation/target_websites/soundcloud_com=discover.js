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

  window.addEventListener('keydown', function handleKeydownToDisableSoundCloudDefaults(event) {
    const pressedKey = event.key;
    const isEnterPressed = pressedKey === 'Enter';
    const isLeftArrowPressed = pressedKey === 'ArrowLeft';
    const isRightArrowPressed = pressedKey === 'ArrowRight';
    if (isEnterPressed || isLeftArrowPressed || isRightArrowPressed) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();

