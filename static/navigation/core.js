(function () {
  'use strict';

  const scrollStep = window.innerHeight * 0.25;

  const state = {
    ws: new WebSocket("ws://127.0.0.1:8765"),
    navEnabled: true,
    typingMode: false,
    currentItem: null,
    scrollStep,
    scrolling: false
  };

  const selectors = [
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
    'a.videostream__link.link',
    'li',
    '[role="button"]',
    '[role="link"]',
    'ytmusic-responsive-list-item-renderer .title',
    'div.rgpl-btn-play'
  ];

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width <= 0 || r.height <= 0) return false;
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  }

  function getFocusableList() {
    return Array.from(document.querySelectorAll(selectors.join(','))).filter(isVisible);
  }

  let overlayEl;
  let scrollTimer;

  function createOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.style.position = 'fixed';
    overlayEl.style.zIndex = '2147483647';
    overlayEl.style.pointerEvents = 'none';
    overlayEl.style.boxSizing = 'border-box';
    overlayEl.style.border = '6px solid cyan';
    overlayEl.style.boxShadow = '0 0 20px 6px rgba(0, 255, 255, 0.95)';
    overlayEl.style.backgroundColor = 'rgba(0, 255, 255, 0.25)';
    overlayEl.style.display = 'none';
    document.body.appendChild(overlayEl);
  }

  function updateOverlay(el) {
    if (!overlayEl || !el) return;
    const rect = el.getBoundingClientRect();
    const border = 6;
    const offset = 4;
    const top = rect.top - offset - border;
    const left = rect.left - offset - border;
    const width = rect.width + offset * 2 + border * 2;
    const height = rect.height + offset * 2 + border * 2;
    overlayEl.style.top = `${top}px`;
    overlayEl.style.left = `${left}px`;
    overlayEl.style.width = `${width}px`;
    overlayEl.style.height = `${height}px`;
    overlayEl.style.display = 'block';
  }

  function clearHighlight() {
    if (overlayEl) overlayEl.style.display = 'none';
  }

  function highlight(el) {
    clearHighlight();
    if (!el) return;
    const r = el.getBoundingClientRect();
    const m = 40;
    if (r.top < m || r.bottom > window.innerHeight - m) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    state.currentItem = el;
    updateOverlay(el);
  }

  function findNextItem(current, list, dir) {
    if (!current) return list[0] || null;
    const focusSet = new Set(list);
    const cr = current.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    const step = 20;
    const maxDist = Math.max(window.innerWidth, window.innerHeight) * 2;
    let dx = 0, dy = 0;
    switch (dir) {
      case 'left': dx = -step; break;
      case 'right': dx = step; break;
      case 'up': dy = -step; break;
      case 'down': dy = step; break;
    }
    for (let dist = step; dist < maxDist; dist += step) {
      const x = cx + dx * (dist / step);
      const y = cy + dy * (dist / step);
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) break;
      let el = document.elementFromPoint(x, y);
      if (!el) continue;
      if (el === current || current.contains(el)) continue;
      let candidate = el;
      while (candidate && candidate !== document.body) {
        if (focusSet.has(candidate)) return candidate;
        candidate = candidate.parentElement;
      }
    }
    let best = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === current) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const dx2 = x - cx;
      const dy2 = y - cy;
      switch (dir) {
        case 'up': if (dy2 >= -1) continue; break;
        case 'down': if (dy2 <= 1) continue; break;
        case 'left': if (dx2 >= -1) continue; break;
        case 'right': if (dx2 <= 1) continue; break;
      }
      const primary = (dir === 'left' || dir === 'right') ? Math.abs(dx2) : Math.abs(dy2);
      const secondary = (dir === 'left' || dir === 'right') ? Math.abs(dy2) : Math.abs(dx2);
      const score = primary * 100 + secondary;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  window.addEventListener('scroll', () => {
    state.scrolling = true;
    clearHighlight();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      state.scrolling = false;
    }, 180);
  }, { passive: true });

  window.STNAV_CORE = {
    state,
    highlight,
    clearHighlight,
    getFocusableList,
    findNextItem,
    updateOverlay
  };

  function init() {
    createOverlay();
    const list = getFocusableList();
    if (list.length > 0) highlight(list[0]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      state.navEnabled = false;
      clearHighlight();
    } else {
      state.navEnabled = true;
      const all = getFocusableList();
      if (all.length > 0) highlight(all[0]);
    }
  });

  const obs = new MutationObserver(() => {
    if (!state.navEnabled || state.typingMode || state.scrolling) return;
    if (state.currentItem && !document.contains(state.currentItem)) {
      const all = getFocusableList();
      highlight(all[0]);
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
})();

