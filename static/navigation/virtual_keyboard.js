(function () {
  'use strict';

  const { state: navigationGlobalState } = window.STNAV_CORE;

  const numberCharacterToSymbolMapping = {
    '`': ['`', '~'],
    '1': ['1', '!'],
    '2': ['2', '@'],
    '3': ['3', '#'],
    '4': ['4', '$'],
    '5': ['5', '%'],
    '6': ['6', '^'],
    '7': ['7', '&'],
    '8': ['8', '*'],
    '9': ['9', '('],
    '0': ['0', ')'],
    '-': ['-', '_'],
    '=': ['=', '+'],
  };

  const punctuationCharacterToSymbolMapping = {
    '[': ['[', '{'],
    ']': [']', '}'],
    '\\': ['\\', '|'],
    ';': [';', ':'],
    "'": ["'", '"'],
    ',': [',', '<'],
    '.': ['.', '>'],
    '/': ['/', '?'],
  };

  const keyboardPhysicalLayoutDefinition = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
    ['🌐', 'SPACE', '⬅', '➡'],
  ];

  const keysThatOccupyMultipleHorizontalSlots = {
    SPACE: 8,
    BACKSPACE: 2,
    CAPS: 2,
    SHIFT: 2.5,
    ENTER: 2.5,
    '🌐': 2,
  };

  const keyboardStylesheetLinkElement = document.createElement('link');
  keyboardStylesheetLinkElement.rel = 'stylesheet';
  keyboardStylesheetLinkElement.href = 'http://localhost:8080/static/navigation/virtual_keyboard.css';
  document.head.appendChild(keyboardStylesheetLinkElement);

  const virtualKeyboardContainerElement = document.createElement('div');
  virtualKeyboardContainerElement.id = 'stnav_virtual_keyboard';

  const virtualKeyboardDisplayElement = document.createElement('div');
  virtualKeyboardDisplayElement.id = 'stnav_vk_display';
  virtualKeyboardContainerElement.appendChild(virtualKeyboardDisplayElement);

  const allKeyboardRowsAsElementGroups = [];
  const allKeyboardKeyElements = [];

  keyboardPhysicalLayoutDefinition.forEach((rowDefinition, rowIndex) => {
    const rowContainerElement = document.createElement('div');
    rowContainerElement.className = 'stnav_vk_row';

    const rowKeyElements = [];

    rowDefinition.forEach((keyLabelText, columnIndex) => {
      const keyElement = document.createElement('div');
      keyElement.className = 'stnav_vk_key';
      keyElement.textContent = keyLabelText;
      keyElement.dataset.key = keyLabelText;
      keyElement.dataset.row = rowIndex;
      keyElement.dataset.col = columnIndex;
      keyElement.style.flex = keysThatOccupyMultipleHorizontalSlots[keyLabelText]
        ? String(keysThatOccupyMultipleHorizontalSlots[keyLabelText])
        : '1';

      rowContainerElement.appendChild(keyElement);
      rowKeyElements.push(keyElement);
      allKeyboardKeyElements.push(keyElement);
    });

    allKeyboardRowsAsElementGroups.push(rowKeyElements);
    virtualKeyboardContainerElement.appendChild(rowContainerElement);
  });

  document.body.appendChild(virtualKeyboardContainerElement);

  let currentlySelectedKeyElement = null;
  let activeTextInputTargetElement = null;
  let capsLockIsEnabled = false;
  let shiftModifierIsEnabled = false;
  let automaticFirstCharacterCapitalizationIsEnabled = true;

  let textInputProcessorInstance = null;

  if (window.TextInputProcessor) {
    try {
      textInputProcessorInstance = new TextInputProcessor();
      textInputProcessorInstance.beginInputTransaction(document);
    } catch (error) {
      textInputProcessorInstance = null;
    }
  }

  const elementIsTextInputCapable = (element) =>
    element &&
    (element.isContentEditable ||
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA');

  const findBestAvailableTextInputTarget = () =>
    document.activeElement && elementIsTextInputCapable(document.activeElement)
      ? document.activeElement
      : document.querySelector(
          'input[type="search"],input[role="searchbox"],input[type="text"],textarea',
        );

  const shouldAutomaticallyCapitalizeFirstCharacter = () => {
    if (!activeTextInputTargetElement) return false;
    if (!automaticFirstCharacterCapitalizationIsEnabled) return false;
    return (activeTextInputTargetElement.value || '').length === 0;
  };

  const updateVirtualKeyboardDisplayText = () => {
    if (!activeTextInputTargetElement) {
      virtualKeyboardDisplayElement.textContent = '';
      return;
    }

    const fullTextValue = activeTextInputTargetElement.value || '';
    const caretPosition = activeTextInputTargetElement.selectionStart || 0;

    virtualKeyboardDisplayElement.innerHTML = '';

    const textBeforeCaretNode = document.createTextNode(
      fullTextValue.slice(0, caretPosition),
    );

    const caretVisualElement = document.createElement('span');
    caretVisualElement.className = 'stnav_vk_caret';

    const textAfterCaretNode = document.createTextNode(
      fullTextValue.slice(caretPosition),
    );

    virtualKeyboardDisplayElement.appendChild(textBeforeCaretNode);
    virtualKeyboardDisplayElement.appendChild(caretVisualElement);
    virtualKeyboardDisplayElement.appendChild(textAfterCaretNode);
  };

  const updateAllKeyLabelsBasedOnCurrentModifiers = () => {
    const isFirstCharacterScenario = shouldAutomaticallyCapitalizeFirstCharacter();

    allKeyboardKeyElements.forEach((keyElement) => {
      const baseKeyIdentifier = keyElement.dataset.key;

      if (baseKeyIdentifier.length !== 1) return;

      if (/^[A-Za-z]$/.test(baseKeyIdentifier)) {
        if (isFirstCharacterScenario) {
          keyElement.textContent = baseKeyIdentifier.toUpperCase();
        } else {
          keyElement.textContent =
            capsLockIsEnabled ^ shiftModifierIsEnabled
              ? baseKeyIdentifier.toUpperCase()
              : baseKeyIdentifier.toLowerCase();
        }
        return;
      }

      if (numberCharacterToSymbolMapping[baseKeyIdentifier]) {
        const symbolPair = numberCharacterToSymbolMapping[baseKeyIdentifier];
        keyElement.textContent =
          capsLockIsEnabled || shiftModifierIsEnabled
            ? symbolPair[1]
            : symbolPair[0];
        return;
      }

      if (punctuationCharacterToSymbolMapping[baseKeyIdentifier]) {
        const symbolPair = punctuationCharacterToSymbolMapping[baseKeyIdentifier];
        keyElement.textContent = shiftModifierIsEnabled
          ? symbolPair[1]
          : symbolPair[0];
        return;
      }

      keyElement.textContent = baseKeyIdentifier;
    });

    updateVirtualKeyboardDisplayText();
  };

  const visuallySelectKeyElement = (keyElement) => {
    if (currentlySelectedKeyElement) {
      currentlySelectedKeyElement.classList.remove('stnav_vk_selected');
    }

    currentlySelectedKeyElement = keyElement;
    keyElement.classList.add('stnav_vk_selected');

    const keyBoundingRectangle = keyElement.getBoundingClientRect();
    const viewportMarginThreshold = 20;

    if (
      keyBoundingRectangle.top < viewportMarginThreshold ||
      keyBoundingRectangle.bottom > innerHeight - viewportMarginThreshold
    ) {
      keyElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  };

  const calculateVirtualKeyboardBaseHeight = () => {
    const preferredHeight = Math.min(400, window.innerHeight * 0.55);
    return Math.max(350, preferredHeight);
  };

  const adjustVirtualKeyboardVerticalPosition = () => {
    const browserChromeHeightDifference =
      window.outerHeight - window.innerHeight;

    const verticalOffset =
      browserChromeHeightDifference > 0
        ? Math.round(browserChromeHeightDifference / 2)
        : 0;

    const finalHeight =
      calculateVirtualKeyboardBaseHeight() + verticalOffset;

    virtualKeyboardContainerElement.style.bottom = '0px';
    virtualKeyboardContainerElement.style.height = `${finalHeight}px`;
  };

  window.addEventListener('resize', adjustVirtualKeyboardVerticalPosition);
  window.addEventListener(
    'fullscreenchange',
    adjustVirtualKeyboardVerticalPosition,
  );

  adjustVirtualKeyboardVerticalPosition();

  const showVirtualKeyboard = () => {
    activeTextInputTargetElement = findBestAvailableTextInputTarget();
    automaticFirstCharacterCapitalizationIsEnabled = true;
    updateAllKeyLabelsBasedOnCurrentModifiers();
    updateVirtualKeyboardDisplayText();
    adjustVirtualKeyboardVerticalPosition();
    virtualKeyboardContainerElement.style.display = 'flex';
    visuallySelectKeyElement(allKeyboardRowsAsElementGroups[0][0]);
  };

  const hideVirtualKeyboard = () => {
    virtualKeyboardContainerElement.style.display = 'none';
    if (currentlySelectedKeyElement) {
      currentlySelectedKeyElement.classList.remove('stnav_vk_selected');
    }
    currentlySelectedKeyElement = null;
  };

  const clearEntireInputValue = () => {
    if (!activeTextInputTargetElement) return;
    activeTextInputTargetElement.value = '';
    activeTextInputTargetElement.dispatchEvent(
      new Event('input', { bubbles: true }),
    );
    automaticFirstCharacterCapitalizationIsEnabled = true;
    updateVirtualKeyboardDisplayText();
  };

  const insertCharacterIntoInput = (character) => {
    if (!activeTextInputTargetElement) return;
    activeTextInputTargetElement.focus();

    if (textInputProcessorInstance) {
      textInputProcessorInstance.flushPendingComposition();
      textInputProcessorInstance.commitComposition(character);
      updateVirtualKeyboardDisplayText();
      return;
    }

    const currentValue = activeTextInputTargetElement.value;
    const selectionStartIndex =
      activeTextInputTargetElement.selectionStart;
    const selectionEndIndex =
      activeTextInputTargetElement.selectionEnd;

    const newValue =
      currentValue.slice(0, selectionStartIndex) +
      character +
      currentValue.slice(selectionEndIndex);

    activeTextInputTargetElement.value = newValue;
    activeTextInputTargetElement.setSelectionRange(
      selectionStartIndex + character.length,
      selectionStartIndex + character.length,
    );

    activeTextInputTargetElement.dispatchEvent(
      new Event('input', { bubbles: true }),
    );

    automaticFirstCharacterCapitalizationIsEnabled = false;
    updateVirtualKeyboardDisplayText();
  };

  const deleteCharacterBeforeCaret = () => {
    if (!activeTextInputTargetElement) return;
    activeTextInputTargetElement.focus();

    if (textInputProcessorInstance) {
      textInputProcessorInstance.flushPendingComposition();
      textInputProcessorInstance.commitComposition('\b');
      updateVirtualKeyboardDisplayText();
      return;
    }

    const currentValue = activeTextInputTargetElement.value;
    const selectionStartIndex =
      activeTextInputTargetElement.selectionStart;
    const selectionEndIndex =
      activeTextInputTargetElement.selectionEnd;

    if (selectionStartIndex === 0 && selectionEndIndex === 0) return;

    const deletionStartIndex =
      selectionStartIndex === selectionEndIndex
        ? selectionStartIndex - 1
        : selectionStartIndex;

    const newValue =
      currentValue.slice(0, deletionStartIndex) +
      currentValue.slice(selectionEndIndex);

    activeTextInputTargetElement.value = newValue;
    activeTextInputTargetElement.setSelectionRange(
      deletionStartIndex,
      deletionStartIndex,
    );

    activeTextInputTargetElement.dispatchEvent(
      new Event('input', { bubbles: true }),
    );

    if (activeTextInputTargetElement.value.length === 0) {
      automaticFirstCharacterCapitalizationIsEnabled = true;
    }

    updateVirtualKeyboardDisplayText();
  };

  const getVisualCenterPointOfElement = (element) => {
    const rectangle = element.getBoundingClientRect();
    return [
      rectangle.left + rectangle.width / 2,
      rectangle.top + rectangle.height / 2,
    ];
  };

  const moveKeyboardSelectionInDirection = (direction) => {
    if (!currentlySelectedKeyElement) return;

    const currentKeyIdentifier = currentlySelectedKeyElement.dataset.key;

    if (
      direction === 'down' &&
      (currentKeyIdentifier === '[' ||
        currentKeyIdentifier === ']' ||
        currentKeyIdentifier === '\\')
    ) {
      const enterKeyElement = allKeyboardKeyElements.find(
        (key) => key.dataset.key === 'ENTER',
      );
      if (enterKeyElement) {
        visuallySelectKeyElement(enterKeyElement);
        return;
      }
    }

    if (
      direction === 'up' &&
      (currentKeyIdentifier === '.' ||
        currentKeyIdentifier === '/')
    ) {
      const enterKeyElement = allKeyboardKeyElements.find(
        (key) => key.dataset.key === 'ENTER',
      );
      if (enterKeyElement) {
        visuallySelectKeyElement(enterKeyElement);
        return;
      }
    }

    if (direction === 'up' && currentKeyIdentifier === 'ENTER') {
      const closingBracketKeyElement = allKeyboardKeyElements.find(
        (key) => key.dataset.key === ']',
      );
      if (closingBracketKeyElement) {
        visuallySelectKeyElement(closingBracketKeyElement);
        return;
      }
    }

    const [currentCenterX, currentCenterY] =
      getVisualCenterPointOfElement(currentlySelectedKeyElement);

    let bestCandidateElement = null;
    let bestScore = Infinity;
    let bestPrimaryDistance = Infinity;

    allKeyboardKeyElements.forEach((candidateElement) => {
      if (candidateElement === currentlySelectedKeyElement) return;

      const [candidateCenterX, candidateCenterY] =
        getVisualCenterPointOfElement(candidateElement);

      const deltaX = candidateCenterX - currentCenterX;
      const deltaY = candidateCenterY - currentCenterY;

      let primaryDistance;
      let secondaryDistance;

      if (direction === 'up') {
        primaryDistance = currentCenterY - candidateCenterY;
        if (primaryDistance <= 1) return;
        secondaryDistance = Math.abs(deltaX);
      } else if (direction === 'down') {
        primaryDistance = candidateCenterY - currentCenterY;
        if (primaryDistance <= 1) return;
        secondaryDistance = Math.abs(deltaX);
      } else if (direction === 'left') {
        primaryDistance = currentCenterX - candidateCenterX;
        if (primaryDistance <= 1) return;
        secondaryDistance = Math.abs(deltaY);
      } else if (direction === 'right') {
        primaryDistance = candidateCenterX - currentCenterX;
        if (primaryDistance <= 1) return;
        secondaryDistance = Math.abs(deltaY);
      } else {
        return;
      }

      const directionalWeight =
        direction === 'left' || direction === 'right' ? 30 : 2;

      const candidateScore =
        primaryDistance + secondaryDistance * directionalWeight;

      if (
        candidateScore < bestScore ||
        (candidateScore === bestScore &&
          primaryDistance < bestPrimaryDistance)
      ) {
        bestCandidateElement = candidateElement;
        bestScore = candidateScore;
        bestPrimaryDistance = primaryDistance;
      }
    });

    if (bestCandidateElement) {
      visuallySelectKeyElement(bestCandidateElement);
    }
  };

  const resolveOutputCharacterForKey = (keyIdentifier) => {
    if (/^[a-z]$/i.test(keyIdentifier)) {
      if (shouldAutomaticallyCapitalizeFirstCharacter()) {
        return keyIdentifier.toUpperCase();
      }
      return capsLockIsEnabled ^ shiftModifierIsEnabled
        ? keyIdentifier.toUpperCase()
        : keyIdentifier.toLowerCase();
    }

    if (numberCharacterToSymbolMapping[keyIdentifier]) {
      const symbolPair = numberCharacterToSymbolMapping[keyIdentifier];
      return capsLockIsEnabled || shiftModifierIsEnabled
        ? symbolPair[1]
        : symbolPair[0];
    }

    if (punctuationCharacterToSymbolMapping[keyIdentifier]) {
      const symbolPair =
        punctuationCharacterToSymbolMapping[keyIdentifier];
      return shiftModifierIsEnabled
        ? symbolPair[1]
        : symbolPair[0];
    }

    return keyIdentifier;
  };

  const moveTextCursorHorizontally = (direction) => {
    if (!activeTextInputTargetElement) return;
    activeTextInputTargetElement.focus();

    const fullValue = activeTextInputTargetElement.value || '';
    const selectionStartIndex =
      activeTextInputTargetElement.selectionStart;
    const selectionEndIndex =
      activeTextInputTargetElement.selectionEnd;

    const newCaretPosition =
      direction === 'left'
        ? Math.max(0, selectionStartIndex - 1)
        : Math.min(fullValue.length, selectionEndIndex + 1);

    activeTextInputTargetElement.setSelectionRange(
      newCaretPosition,
      newCaretPosition,
    );

    if (activeTextInputTargetElement.value.length === 0) {
      automaticFirstCharacterCapitalizationIsEnabled = true;
    }

    updateAllKeyLabelsBasedOnCurrentModifiers();
  };

  const handleVirtualKeyPress = (keyElement) => {
    const keyIdentifier = keyElement.dataset.key;

    if (keyIdentifier === 'SHIFT') {
      if (shouldAutomaticallyCapitalizeFirstCharacter()) {
        automaticFirstCharacterCapitalizationIsEnabled = false;
      } else {
        shiftModifierIsEnabled = !shiftModifierIsEnabled;
        virtualKeyboardContainerElement.classList.toggle(
          'stnav_vk_shift_on',
          shiftModifierIsEnabled,
        );
      }
      updateAllKeyLabelsBasedOnCurrentModifiers();
      return;
    }

    if (keyIdentifier === 'CAPS') {
      capsLockIsEnabled = !capsLockIsEnabled;
      virtualKeyboardContainerElement.classList.toggle(
        'stnav_vk_caps_on',
        capsLockIsEnabled,
      );
      updateAllKeyLabelsBasedOnCurrentModifiers();
      return;
    }

    if (keyIdentifier === 'BACKSPACE') {
      deleteCharacterBeforeCaret();
      shiftModifierIsEnabled = false;
      virtualKeyboardContainerElement.classList.remove(
        'stnav_vk_shift_on',
      );
      updateAllKeyLabelsBasedOnCurrentModifiers();
      return;
    }

    if (keyIdentifier === 'ENTER') {
      hideVirtualKeyboard();
      navigationGlobalState.typingMode = false;
      navigationGlobalState.navEnabled = false;

      Promise.resolve().then(() => {
        if (activeTextInputTargetElement) {
          activeTextInputTargetElement.focus();
          const valueLength =
            activeTextInputTargetElement.value.length;
          activeTextInputTargetElement.setSelectionRange(
            valueLength,
            valueLength,
          );
        }
        navigationGlobalState.ws.send('SearchEnter');
      });
      return;
    }

    if (keyIdentifier === 'SPACE') {
      insertCharacterIntoInput(' ');
      shiftModifierIsEnabled = false;
      virtualKeyboardContainerElement.classList.remove(
        'stnav_vk_shift_on',
      );
      updateAllKeyLabelsBasedOnCurrentModifiers();
      return;
    }

    if (keyIdentifier === '🌐') {
      shiftModifierIsEnabled = false;
      virtualKeyboardContainerElement.classList.remove(
        'stnav_vk_shift_on',
      );
      updateAllKeyLabelsBasedOnCurrentModifiers();
      return;
    }

    if (keyIdentifier === '⬅') {
      moveTextCursorHorizontally('left');
      shiftModifierIsEnabled = false;
      virtualKeyboardContainerElement.classList.remove(
        'stnav_vk_shift_on',
      );
      updateAllKeyLabelsBasedOnCurrentModifiers();
      return;
    }

    if (keyIdentifier === '➡') {
      moveTextCursorHorizontally('right');
      shiftModifierIsEnabled = false;
      virtualKeyboardContainerElement.classList.remove(
        'stnav_vk_shift_on',
      );
      updateAllKeyLabelsBasedOnCurrentModifiers();
      return;
    }

    const resolvedCharacter =
      resolveOutputCharacterForKey(keyIdentifier);

    if (resolvedCharacter) {
      insertCharacterIntoInput(resolvedCharacter);
      shiftModifierIsEnabled = false;
      virtualKeyboardContainerElement.classList.remove(
        'stnav_vk_shift_on',
      );
      updateAllKeyLabelsBasedOnCurrentModifiers();
    }
  };

  document.addEventListener(
    'keydown',
    (keyboardEvent) => {
      if (!navigationGlobalState.typingMode) return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();

      const pressedKey = keyboardEvent.key;

      if (pressedKey === 'Escape') {
        clearEntireInputValue();
        navigationGlobalState.typingMode = false;
        hideVirtualKeyboard();
        return;
      }

      if (pressedKey === 'ArrowLeft')
        return moveKeyboardSelectionInDirection('left');
      if (pressedKey === 'ArrowRight')
        return moveKeyboardSelectionInDirection('right');
      if (pressedKey === 'ArrowUp')
        return moveKeyboardSelectionInDirection('up');
      if (pressedKey === 'ArrowDown')
        return moveKeyboardSelectionInDirection('down');
      if (pressedKey === 'Enter')
        return handleVirtualKeyPress(currentlySelectedKeyElement);
    },
    true,
  );

  virtualKeyboardContainerElement.addEventListener('click', (mouseEvent) => {
    if (!navigationGlobalState.typingMode) return;

    const clickedKeyElement =
      mouseEvent.target.closest('.stnav_vk_key');

    if (!clickedKeyElement) return;

    visuallySelectKeyElement(clickedKeyElement);
    handleVirtualKeyPress(clickedKeyElement);
  });

  setInterval(() => {
    if (
      navigationGlobalState.typingMode &&
      virtualKeyboardContainerElement.style.display === 'none'
    ) {
      showVirtualKeyboard();
    }

    if (
      !navigationGlobalState.typingMode &&
      virtualKeyboardContainerElement.style.display !== 'none'
    ) {
      hideVirtualKeyboard();
    }

    updateVirtualKeyboardDisplayText();
    adjustVirtualKeyboardVerticalPosition();
  }, 120);

  let lastKnownPageLocation = location.href;

  const restoreNavigationStateOnPageChange = () => {
    if (location.href !== lastKnownPageLocation) {
      lastKnownPageLocation = location.href;
      navigationGlobalState.navEnabled = true;
    }
  };

  window.addEventListener(
    'popstate',
    restoreNavigationStateOnPageChange,
  );
  window.addEventListener(
    'hashchange',
    restoreNavigationStateOnPageChange,
  );

  const pageMutationObserver = new MutationObserver(
    restoreNavigationStateOnPageChange,
  );

  pageMutationObserver.observe(document, {
    subtree: true,
    childList: true,
  });
})();

