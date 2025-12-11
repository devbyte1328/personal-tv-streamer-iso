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

  function locateScrollableRegion() {
    const elements = document.querySelectorAll('*');
    for (const element of elements) {
      const style = getComputedStyle(element);
      const scrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
      const overflowing = element.scrollHeight > element.clientHeight;
      if (scrollable && overflowing) return element;
    }
    return document.scrollingElement || document.documentElement;
  }

  function performSmoothScroll(region, distance) {
    const initialPosition = region.scrollTop;
    const targetPosition = initialPosition + distance;
    const durationInMilliseconds = 150;
    const startTime = performance.now();

    function update(time) {
      const progress = Math.min((time - startTime) / durationInMilliseconds, 1);
      const nextPosition = initialPosition + (targetPosition - initialPosition) * progress;
      region.scrollTop = nextPosition;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  document.addEventListener('keydown', function (event) {
    if (event.code !== 'PageUp' && event.code !== 'PageDown') return;

    const region = locateScrollableRegion();
    const distance = region.clientHeight;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.code === 'PageUp') performSmoothScroll(region, -distance);
    if (event.code === 'PageDown') performSmoothScroll(region, distance);
  }, true);
})();

