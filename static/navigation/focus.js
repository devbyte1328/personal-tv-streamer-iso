(function () {
  'use strict';

  const {
    state,
    highlight: origHighlight,
    getFocusableList,
    findNextItem,
    updateOverlay
  } = window.STNAV_CORE;

  function highlight(item) {
    origHighlight(item);
    requestAnimationFrame(() => updateOverlay(item));
  }

  function move(dir) {
    if (state.scrolling) return;
    const list = getFocusableList();
    if (!list.length) return;
    let next = findNextItem(state.currentItem || list[0], list, dir);
    if (!next) {
      const sd = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
      if (sd !== 0) {
        window.scrollBy({ top: sd * state.scrollStep, behavior: 'smooth' });
        return;
      }
    }
    highlight(next);
  }

  window.STNAV_FOCUS = { move };
})();

