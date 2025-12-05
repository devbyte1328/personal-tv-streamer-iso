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

    const nextElement = findNextItem(state.activeElement || elementList[0], elementList, directionName);

    if (!nextElement) {
      const scrollFactor =
        directionName === 'down' ? 1 :
        directionName === 'up' ? -1 : 0;

      if (scrollFactor !== 0) {
        window.scrollBy({
          top: scrollFactor * state.scrollDistance,
          behavior: 'smooth'
        });

        setTimeout(() => {
          const updatedList = getFocusableList();
          const updatedNext = findNextItem(state.activeElement, updatedList, directionName);
          if (updatedNext) highlightAgain(updatedNext);
        }, 260);

        return;
      }
    }

    highlightAgain(nextElement);
  }

  window.STNAV_FOCUS = { move };
})();

