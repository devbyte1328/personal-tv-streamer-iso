(function () {
  'use strict';

  window.STNAV_TARGETS = window.STNAV_TARGETS || {};

  window.STNAV_TARGETS.selectors = [
    '#sidebar ul li[data-url]',
    '.home-video-wrapper iframe#standalone-home-video-frame',
    '.home-video-wrapper #standalone-home-video-overlay',
    '#carousel-container iframe[data-position="center"]',
    '#carousel-container iframe[data-position="left"]',
    '#carousel-container iframe[data-position="right"]',
    '.carousel-overlay',
    '#standalone-trailer-frame',
    '#standalone-trailer-overlay',
    '.thumbnail-wrapper img',
    '.thumbnail-wrapper .thumbnail-overlay',
    '#left-carousel-btn',
    '#right-carousel-btn'
  ];
})();

