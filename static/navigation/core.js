(function () {
  'use strict';

  const scrollDistance = window.innerHeight * 0.25;

  const engineState = {
    websocketLink: new WebSocket("ws://127.0.0.1:8765"),
    ws: null,
    navigationEnabled: true,
    navEnabled: true,
    keyboardEntryMode: false,
    typingMode: false,
    activeElement: null,
    scrollDistance,
    isScrolling: false
  };

  engineState.ws = engineState.websocketLink;

  const selectorList =
    (window.STNAV_TARGETS &&
     Array.isArray(window.STNAV_TARGETS.selectors) &&
     window.STNAV_TARGETS.selectors.length
       ? window.STNAV_TARGETS.selectors
       : []);

  function isAllowedElement(elementGiven) {
    if (!(elementGiven instanceof Element)) return false;
    if (elementGiven.closest('.html5-video-player')) return false;
    if (elementGiven.closest('.ytp-chrome-bottom')) return false;
    if (elementGiven.closest('.ytp-chrome-top')) return false;
    if (elementGiven.closest('.ytp-tooltip')) return false;
    if (elementGiven.closest('.ytp-player-content')) return false;

    const rectangle = elementGiven.getBoundingClientRect();
    const computedStyleObject = getComputedStyle(elementGiven);
    if (rectangle.width <= 0 || rectangle.height <= 0) return false;
    if (computedStyleObject.display === 'none' ||
        computedStyleObject.visibility === 'hidden' ||
        computedStyleObject.opacity === '0') return false;

    return rectangle.bottom > 0 &&
           rectangle.top < window.innerHeight &&
           rectangle.right > 0 &&
           rectangle.left < window.innerWidth;
  }

  function collectFocusableElements() {
    return Array.from(document.querySelectorAll(selectorList.join(','))).filter(isAllowedElement);
  }

  let overlayBox;
  let scrollDelay;

  function prepareOverlay() {
    overlayBox = document.createElement('div');
    overlayBox.style.position = 'fixed';
    overlayBox.style.zIndex = '2147483647';
    overlayBox.style.pointerEvents = 'none';
    overlayBox.style.boxSizing = 'border-box';
    overlayBox.style.border = '6px solid cyan';
    overlayBox.style.boxShadow = '0 0 20px 6px rgba(0,255,255,0.95)';
    overlayBox.style.backgroundColor = 'rgba(0,255,255,0.25)';
    overlayBox.style.display = 'none';
    document.body.appendChild(overlayBox);
  }

  function drawOverlay(elementGiven) {
    if (!overlayBox || !elementGiven) return;
    const rectangle = elementGiven.getBoundingClientRect();
    const borderSize = 6;
    const marginSize = 4;
    overlayBox.style.top = (rectangle.top - marginSize - borderSize) + "px";
    overlayBox.style.left = (rectangle.left - marginSize - borderSize) + "px";
    overlayBox.style.width = (rectangle.width + marginSize * 2 + borderSize * 2) + "px";
    overlayBox.style.height = (rectangle.height + marginSize * 2 + borderSize * 2) + "px";
    overlayBox.style.display = 'block';
  }

  function hideOverlay() {
    if (overlayBox) overlayBox.style.display = 'none';
  }

  function highlightItem(elementGiven) {
    hideOverlay();
    if (!elementGiven) return;
    engineState.activeElement = elementGiven;
    drawOverlay(elementGiven);
  }

  function searchDirectional(elementCurrent, elementList, directionName) {
    if (!elementCurrent) return elementList[0] || null;

    const setElements = new Set(elementList);
    const rectangle = elementCurrent.getBoundingClientRect();
    const centerX = rectangle.left + rectangle.width / 2;
    const centerY = rectangle.top + rectangle.height / 2;
    const distanceStep = 20;
    const searchLimit = Math.max(window.innerWidth, window.innerHeight) * 2;

    let directionX = 0;
    let directionY = 0;

    if (directionName === 'left') directionX = -distanceStep;
    if (directionName === 'right') directionX = distanceStep;
    if (directionName === 'up') directionY = -distanceStep;
    if (directionName === 'down') directionY = distanceStep;

    for (let distance = distanceStep; distance < searchLimit; distance += distanceStep) {
      const testX = centerX + directionX * (distance / distanceStep);
      const testY = centerY + directionY * (distance / distanceStep);

      if (testX < 0 || testY < 0 || testX > window.innerWidth || testY > window.innerHeight) break;

      let foundElement = document.elementFromPoint(testX, testY);
      if (!foundElement) continue;
      if (foundElement === elementCurrent || elementCurrent.contains(foundElement)) continue;

      let walkerElement = foundElement;
      while (walkerElement && walkerElement !== document.body) {
        if (setElements.has(walkerElement)) return walkerElement;
        walkerElement = walkerElement.parentElement;
      }
    }

    let bestElement = null;
    let bestScore = Infinity;

    for (const elementOption of elementList) {
      if (elementOption === elementCurrent) continue;

      const rectangleOption = elementOption.getBoundingClientRect();
      const optionX = rectangleOption.left + rectangleOption.width / 2;
      const optionY = rectangleOption.top + rectangleOption.height / 2;

      const deltaX = optionX - centerX;
      const deltaY = optionY - centerY;

      if (directionName === 'up' && deltaY >= -1) continue;
      if (directionName === 'down' && deltaY <= 1) continue;
      if (directionName === 'left' && deltaX >= -1) continue;
      if (directionName === 'right' && deltaX <= 1) continue;

      const primaryValue =
        (directionName === 'left' || directionName === 'right')
          ? Math.abs(deltaX)
          : Math.abs(deltaY);

      const secondaryValue =
        (directionName === 'left' || directionName === 'right')
          ? Math.abs(deltaY)
          : Math.abs(deltaX);

      const scoreValue = primaryValue * 100 + secondaryValue;
      if (scoreValue < bestScore) {
        bestScore = scoreValue;
        bestElement = elementOption;
      }
    }

    return bestElement;
  }

  window.addEventListener('scroll', () => {
    engineState.isScrolling = true;
    hideOverlay();
    clearTimeout(scrollDelay);
    scrollDelay = setTimeout(() => {
      engineState.isScrolling = false;
    }, 180);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!engineState.navigationEnabled) return;
    if (e.key !== 'Enter') return;
    if (!engineState.activeElement) return;

    const el = engineState.activeElement;
    const isText =
      el.isContentEditable ||
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA';

    if (!isText) return;

    e.preventDefault();
    e.stopPropagation();

    engineState.typingMode = true;
    engineState.keyboardEntryMode = true;
    engineState.navigationEnabled = false;
    engineState.navEnabled = false;
    hideOverlay();
    el.focus();
  }, true);

  window.STNAV_CORE = {
    state: engineState,
    highlight: highlightItem,
    clearHighlight: hideOverlay,
    getFocusableList: collectFocusableElements,
    findNextItem: searchDirectional,
    updateOverlay: drawOverlay
  };

  function begin() {
    prepareOverlay();
    const list = collectFocusableElements();
    if (list.length > 0) highlightItem(list[0]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin);
  } else begin();

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      engineState.navigationEnabled = false;
      engineState.navEnabled = false;
      hideOverlay();
    } else {
      engineState.navigationEnabled = true;
      engineState.navEnabled = true;
      const all = collectFocusableElements();
      if (all.length > 0) highlightItem(all[0]);
    }
  });

  const observerGiven = new MutationObserver(() => {
    if (!engineState.navigationEnabled ||
        engineState.keyboardEntryMode ||
        engineState.isScrolling) return;

    if (engineState.activeElement &&
        !document.contains(engineState.activeElement)) {
      const list = collectFocusableElements();
      highlightItem(list[0]);
    }
  });

  observerGiven.observe(document.body, { childList: true, subtree: true });
})();

