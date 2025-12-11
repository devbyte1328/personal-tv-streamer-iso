(function () {
  "use strict";

  var navigationTargets = window.STNAV_TARGETS || {};
  window.STNAV_TARGETS = navigationTargets;

  var targetSelectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
    "[contenteditable='true']",
    "ytd-thumbnail",
    "ytd-playlist-panel-video-renderer",
    ".yt-lockup-view-model",
    "ytmusic-responsive-list-item-renderer .title",
    "a.videostream__link.link",
    "li",
    "[role='button']",
    "[role='link']",
    "div.rgpl-btn-play",
    "button.TUXButton[aria-label='Volume']"
  ];

  navigationTargets.selectors = targetSelectors;

  function handleBlockedArrowKeys(event) {
    var key = event.key;
    var isUpDown = key === "ArrowUp" || key === "ArrowDown";
    if (isUpDown) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  var isYouTubeShorts = location.pathname.startsWith("/shorts");
  var isTikTok = location.hostname.indexOf("tiktok.com") !== -1;

  if (isYouTubeShorts || isTikTok) {
    window.addEventListener("keydown", handleBlockedArrowKeys, true);
    document.addEventListener("keydown", handleBlockedArrowKeys, true);
  }
})();

