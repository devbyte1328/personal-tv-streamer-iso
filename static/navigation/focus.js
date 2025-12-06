(function () {
  'use strict';

  const {
    state,
    highlight,
    getFocusableList,
    findNextItem,
    updateOverlay
  } = window.STNAV_CORE;

  function highlightAgain(elementGiven) {
    highlight(elementGiven);
    requestAnimationFrame(() => updateOverlay(elementGiven));
  }

  function move(directionName) {
    if (state.isScrolling) return;

    const elementList = getFocusableList();
    if (!elementList.length) return;

    const nextElement =
      findNextItem(state.activeElement || elementList[0], elementList, directionName);

    if (!nextElement) {
      return;
    }

    highlightAgain(nextElement);
  }

  window.STNAV_FOCUS = { move };

  window.addEventListener('keydown', event => {
    if (event.code === 'PageUp' || event.code === 'PageDown') {
      state.isScrolling = true;
      window.STNAV_CORE.clearHighlight();
      clearTimeout(state._pageScrollDelay);
      state._pageScrollDelay = setTimeout(() => {
        state.isScrolling = false;
        if (state.activeElement) updateOverlay(state.activeElement);
      }, 180);
    }
  });
})();

