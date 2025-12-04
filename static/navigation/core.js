(function () {
  'use strict';

  const scrollDistance = window.innerHeight * 0.25;

  const engineState = {
    websocketLink: new WebSocket("ws://127.0.0.1:8765"),
    navigationEnabled: true,
    keyboardEntryMode: false,
    activeElement: null,
    scrollDistance,
    isScrolling: false
  };

  const selectorList =
    (window.STNAV_TARGETS &&
     Array.isArray(window.STNAV_TARGETS.selectors) &&
     window.STNAV_TARGETS.selectors.length
       ? window.STNAV_TARGETS.selectors
       : []);

  function isAllowedElement(el) {
    if (!(el instanceof Element)) return false;
    if (el.closest('.html5-video-player')) return false;
    if (el.closest('.ytp-chrome-bottom')) return false;
    if (el.closest('.ytp-chrome-top')) return false;
    if (el.closest('.ytp-tooltip')) return false;
    if (el.closest('.ytp-player-content')) return false;

    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width <= 0 || r.height <= 0) return false;
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    return r.bottom > 0 &&
           r.top < window.innerHeight &&
           r.right > 0 &&
           r.left < window.innerWidth;
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

  function drawOverlay(el) {
    if (!overlayBox || !el) return;
    const r = el.getBoundingClientRect();
    const b = 6, m = 4;
    overlayBox.style.top = (r.top - m - b) + "px";
    overlayBox.style.left = (r.left - m - b) + "px";
    overlayBox.style.width = (r.width + m * 2 + b * 2) + "px";
    overlayBox.style.height = (r.height + m * 2 + b * 2) + "px";
    overlayBox.style.display = 'block';
  }

  function hideOverlay() {
    if (overlayBox) overlayBox.style.display = 'none';
  }

  function highlightItem(el) {
    hideOverlay();
    if (!el) return;
    const r = el.getBoundingClientRect();
    const m = 40;
    if (r.top < m || r.bottom > window.innerHeight - m) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    engineState.activeElement = el;
    drawOverlay(el);
  }

  function searchDirectional(current, list, direction) {
    if (!current) return list[0] || null;
    const set = new Set(list);
    const r = current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const distStep = 20;
    const limit = Math.max(window.innerWidth, window.innerHeight) * 2;
    let dx = 0, dy = 0;
    if (direction === 'left') dx = -distStep;
    if (direction === 'right') dx = distStep;
    if (direction === 'up') dy = -distStep;
    if (direction === 'down') dy = distStep;

    for (let d = distStep; d < limit; d += distStep) {
      const x = cx + dx * (d / distStep);
      const y = cy + dy * (d / distStep);
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) break;
      let found = document.elementFromPoint(x, y);
      if (!found) continue;
      if (found === current || current.contains(found)) continue;
      let walker = found;
      while (walker && walker !== document.body) {
        if (set.has(walker)) return walker;
        walker = walker.parentElement;
      }
    }

    let best = null;
    let bestScore = Infinity;

    for (const el of list) {
      if (el === current) continue;
      const b = el.getBoundingClientRect();
      const ix = b.left + b.width / 2;
      const iy = b.top + b.height / 2;
      const dx2 = ix - cx;
      const dy2 = iy - cy;

      if (direction === 'up' && dy2 >= -1) continue;
      if (direction === 'down' && dy2 <= 1) continue;
      if (direction === 'left' && dx2 >= -1) continue;
      if (direction === 'right' && dx2 <= 1) continue;

      const primary = (direction === 'left' || direction === 'right')
                      ? Math.abs(dx2)
                      : Math.abs(dy2);
      const secondary = (direction === 'left' || direction === 'right')
                        ? Math.abs(dy2)
                        : Math.abs(dx2);

      const score = primary * 100 + secondary;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  window.addEventListener('scroll', () => {
    engineState.isScrolling = true;
    hideOverlay();
    clearTimeout(scrollDelay);
    scrollDelay = setTimeout(() => {
      engineState.isScrolling = false;
    }, 180);
  }, { passive: true });

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
      hideOverlay();
    } else {
      engineState.navigationEnabled = true;
      const all = collectFocusableElements();
      if (all.length > 0) highlightItem(all[0]);
    }
  });

  const mut = new MutationObserver(() => {
    if (!engineState.navigationEnabled ||
        engineState.keyboardEntryMode ||
        engineState.isScrolling) return;

    if (engineState.activeElement &&
        !document.contains(engineState.activeElement)) {
      const list = collectFocusableElements();
      highlightItem(list[0]);
    }
  });

  mut.observe(document.body, { childList: true, subtree: true });
})();

