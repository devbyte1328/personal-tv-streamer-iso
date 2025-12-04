(function () {
  'use strict';

  const {
    state,
    highlight,
    getFocusableList,
    findNextItem,
    updateOverlay
  } = window.STNAV_CORE;

  function highlightAgain(item) {
    highlight(item);
    requestAnimationFrame(() => updateOverlay(item));
  }

  function move(direction) {
    if (state.isScrolling) return;
    const list = getFocusableList();
    if (!list.length) return;
    const next = findNextItem(state.activeElement || list[0], list, direction);
    if (!next) {
      const factor = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
      if (factor !== 0) {
        window.scrollBy({ top: factor * state.scrollDistance, behavior: 'smooth' });
        return;
      }
    }
    highlightAgain(next);
  }

  window.STNAV_FOCUS = { move };
})();

