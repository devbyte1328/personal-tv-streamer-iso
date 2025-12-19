(function () {
  'use strict';

  const { state: navigationBrain } = window.STNAV_CORE;

  const numberSymbolPairs = {
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

  const punctuationSymbolPairs = {
    '[': ['[', '{'],
    ']': [']', '}'],
    '\\': ['\\', '|'],
    ';': [';', ':'],
    "'": ["'", '"'],
    ',': [',', '<'],
    '.': ['.', '>'],
    '/': ['/', '?'],
  };

  const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
    ['🌐', 'SPACE', '⬅', '➡'],
  ];

  const wideKeySizes = { SPACE: 8, BACKSPACE: 2, CAPS: 2, SHIFT: 2.5, ENTER: 2.5, '🌐': 2 };

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = 'http://localhost:8080/static/navigation/virtual_keyboard.css';
  document.head.appendChild(styleLink);

  const virtualKeyboardRoot = document.createElement('div');
  virtualKeyboardRoot.id = 'stnav_virtual_keyboard';

  const virtualKeyboardDisplay = document.createElement('div');
  virtualKeyboardDisplay.id = 'stnav_vk_display';
  virtualKeyboardRoot.appendChild(virtualKeyboardDisplay);

  const keyboardRows = [];
  const allKeyElements = [];

  keyboardLayout.forEach((rowLabels, rowIndex) => {
    const rowContainer = document.createElement('div');
    rowContainer.className = 'stnav_vk_row';
    const rowKeys = [];
    rowLabels.forEach((keyLabel, columnIndex) => {
      const keyElement = document.createElement('div');
      keyElement.className = 'stnav_vk_key';
      keyElement.textContent = keyLabel;
      keyElement.dataset.key = keyLabel;
      keyElement.dataset.row = rowIndex;
      keyElement.dataset.col = columnIndex;
      keyElement.style.flex = wideKeySizes[keyLabel] ? String(wideKeySizes[keyLabel]) : '1';
      rowContainer.appendChild(keyElement);
      rowKeys.push(keyElement);
      allKeyElements.push(keyElement);
    });
    keyboardRows.push(rowKeys);
    virtualKeyboardRoot.appendChild(rowContainer);
  });

  document.body.appendChild(virtualKeyboardRoot);

  let currentlySelectedKey = null;
  let activeTextTarget = null;
  let capsLockEnabled = false;
  let shiftEnabled = false;
  let autoCapitalizeFirstLetter = true;

  let textInputBridge = null;
  if (window.TextInputProcessor) {
    try {
      textInputBridge = new TextInputProcessor();
      textInputBridge.beginInputTransaction(document);
    } catch {
      textInputBridge = null;
    }
  }

  const isTextTarget = (possibleTarget) =>
    possibleTarget &&
    (possibleTarget.isContentEditable ||
      possibleTarget.tagName === 'INPUT' ||
      possibleTarget.tagName === 'TEXTAREA');

  const locateBestInputTarget = () =>
    document.activeElement && isTextTarget(document.activeElement)
      ? document.activeElement
      : document.querySelector('input[type="search"],input[role="searchbox"],input[type="text"],textarea');

  const isFirstCharacterMode = () =>
    activeTextTarget && autoCapitalizeFirstLetter && (activeTextTarget.value || '').length === 0;

  const refreshDisplayText = () => {
    if (!activeTextTarget) return (virtualKeyboardDisplay.textContent = '');
    const fullText = activeTextTarget.value || '';
    const cursorPosition = activeTextTarget.selectionStart || 0;
    virtualKeyboardDisplay.innerHTML = '';
    virtualKeyboardDisplay.append(
      document.createTextNode(fullText.slice(0, cursorPosition)),
      Object.assign(document.createElement('span'), { className: 'stnav_vk_caret' }),
      document.createTextNode(fullText.slice(cursorPosition)),
    );
  };

  const refreshKeyLabels = () => {
    const firstCharacter = isFirstCharacterMode();
    allKeyElements.forEach((keyElement) => {
      const baseCharacter = keyElement.dataset.key;
      if (baseCharacter.length !== 1) return;
      if (/^[A-Za-z]$/.test(baseCharacter)) {
        keyElement.textContent = firstCharacter
          ? baseCharacter.toUpperCase()
          : capsLockEnabled ^ shiftEnabled
          ? baseCharacter.toUpperCase()
          : baseCharacter.toLowerCase();
      } else if (numberSymbolPairs[baseCharacter]) {
        const symbolPair = numberSymbolPairs[baseCharacter];
        keyElement.textContent = capsLockEnabled || shiftEnabled ? symbolPair[1] : symbolPair[0];
      } else if (punctuationSymbolPairs[baseCharacter]) {
        const symbolPair = punctuationSymbolPairs[baseCharacter];
        keyElement.textContent = shiftEnabled ? symbolPair[1] : symbolPair[0];
      }
    });
    refreshDisplayText();
  };

  const visuallySelectKey = (keyElement) => {
    if (currentlySelectedKey) currentlySelectedKey.classList.remove('stnav_vk_selected');
    currentlySelectedKey = keyElement;
    keyElement.classList.add('stnav_vk_selected');
    const boundingBox = keyElement.getBoundingClientRect();
    if (boundingBox.top < 20 || boundingBox.bottom > innerHeight - 20)
      keyElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const calculateKeyboardHeight = () =>
    Math.max(350, Math.min(400, window.innerHeight * 0.55));

  const repositionKeyboard = () => {
    const chromeOffset = Math.max(0, Math.round((window.outerHeight - window.innerHeight) / 2));
    virtualKeyboardRoot.style.bottom = '0px';
    virtualKeyboardRoot.style.height = `${calculateKeyboardHeight() + chromeOffset}px`;
  };

  window.addEventListener('resize', repositionKeyboard);
  window.addEventListener('fullscreenchange', repositionKeyboard);
  repositionKeyboard();

  const showKeyboard = () => {
    activeTextTarget = locateBestInputTarget();
    autoCapitalizeFirstLetter = true;
    refreshKeyLabels();
    repositionKeyboard();
    virtualKeyboardRoot.style.display = 'flex';
    visuallySelectKey(keyboardRows[0][0]);
  };

  const hideKeyboard = () => {
    virtualKeyboardRoot.style.display = 'none';
    if (currentlySelectedKey) currentlySelectedKey.classList.remove('stnav_vk_selected');
    currentlySelectedKey = null;
  };

  const clearInputCompletely = () => {
    if (!activeTextTarget) return;
    activeTextTarget.value = '';
    activeTextTarget.dispatchEvent(new Event('input', { bubbles: true }));
    autoCapitalizeFirstLetter = true;
    refreshDisplayText();
  };

  const insertCharacter = (characterToInsert) => {
    if (!activeTextTarget) return;
    activeTextTarget.focus();
    if (textInputBridge) {
      textInputBridge.flushPendingComposition();
      textInputBridge.commitComposition(characterToInsert);
      return refreshDisplayText();
    }
    const existingValue = activeTextTarget.value;
    const selectionStart = activeTextTarget.selectionStart;
    const selectionEnd = activeTextTarget.selectionEnd;
    activeTextTarget.value =
      existingValue.slice(0, selectionStart) +
      characterToInsert +
      existingValue.slice(selectionEnd);
    activeTextTarget.setSelectionRange(
      selectionStart + characterToInsert.length,
      selectionStart + characterToInsert.length,
    );
    activeTextTarget.dispatchEvent(new Event('input', { bubbles: true }));
    autoCapitalizeFirstLetter = false;
    refreshDisplayText();
  };

  const deleteCharacter = () => {
    if (!activeTextTarget) return;
    activeTextTarget.focus();
    if (textInputBridge) {
      textInputBridge.flushPendingComposition();
      textInputBridge.commitComposition('\b');
      return refreshDisplayText();
    }
    const existingValue = activeTextTarget.value;
    const selectionStart = activeTextTarget.selectionStart;
    const selectionEnd = activeTextTarget.selectionEnd;
    if (selectionStart === 0 && selectionEnd === 0) return;
    const deleteFrom = selectionStart === selectionEnd ? selectionStart - 1 : selectionStart;
    activeTextTarget.value =
      existingValue.slice(0, deleteFrom) + existingValue.slice(selectionEnd);
    activeTextTarget.setSelectionRange(deleteFrom, deleteFrom);
    activeTextTarget.dispatchEvent(new Event('input', { bubbles: true }));
    if (!activeTextTarget.value.length) autoCapitalizeFirstLetter = true;
    refreshDisplayText();
  };

  const getKeyCenter = (keyElement) => {
    const bounds = keyElement.getBoundingClientRect();
    return [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2];
  };

  const navigateBetweenKeys = (direction) => {
    if (!currentlySelectedKey) return;
    const currentKeyName = currentlySelectedKey.dataset.key;
    if (
      (direction === 'down' && ['[', ']', '\\'].includes(currentKeyName)) ||
      (direction === 'up' && ['.', '/'].includes(currentKeyName))
    ) {
      const enterKey = allKeyElements.find((k) => k.dataset.key === 'ENTER');
      if (enterKey) return visuallySelectKey(enterKey);
    }
    if (direction === 'up' && currentKeyName === 'ENTER') {
      const bracketKey = allKeyElements.find((k) => k.dataset.key === ']');
      if (bracketKey) return visuallySelectKey(bracketKey);
    }

    const [currentX, currentY] = getKeyCenter(currentlySelectedKey);
    let closestKey = null;
    let lowestScore = Infinity;
    let closestPrimaryDistance = Infinity;

    allKeyElements.forEach((candidateKey) => {
      if (candidateKey === currentlySelectedKey) return;
      const [candidateX, candidateY] = getKeyCenter(candidateKey);
      let primaryDistance, secondaryDistance;
      if (direction === 'up') {
        primaryDistance = currentY - candidateY;
        secondaryDistance = Math.abs(candidateX - currentX);
      } else if (direction === 'down') {
        primaryDistance = candidateY - currentY;
        secondaryDistance = Math.abs(candidateX - currentX);
      } else if (direction === 'left') {
        primaryDistance = currentX - candidateX;
        secondaryDistance = Math.abs(candidateY - currentY);
      } else if (direction === 'right') {
        primaryDistance = candidateX - currentX;
        secondaryDistance = Math.abs(candidateY - currentY);
      } else return;
      if (primaryDistance <= 1) return;
      const weight = direction === 'left' || direction === 'right' ? 30 : 2;
      const score = primaryDistance + secondaryDistance * weight;
      if (score < lowestScore || (score === lowestScore && primaryDistance < closestPrimaryDistance)) {
        closestKey = candidateKey;
        lowestScore = score;
        closestPrimaryDistance = primaryDistance;
      }
    });
    if (closestKey) visuallySelectKey(closestKey);
  };

  const resolveOutputCharacter = (keyName) => {
    if (/^[a-z]$/i.test(keyName))
      return isFirstCharacterMode()
        ? keyName.toUpperCase()
        : capsLockEnabled ^ shiftEnabled
        ? keyName.toUpperCase()
        : keyName.toLowerCase();
    if (numberSymbolPairs[keyName])
      return (capsLockEnabled || shiftEnabled
        ? numberSymbolPairs[keyName][1]
        : numberSymbolPairs[keyName][0]);
    if (punctuationSymbolPairs[keyName])
      return shiftEnabled
        ? punctuationSymbolPairs[keyName][1]
        : punctuationSymbolPairs[keyName][0];
    return keyName;
  };

  const moveTextCursor = (direction) => {
    if (!activeTextTarget) return;
    activeTextTarget.focus();
    const textValue = activeTextTarget.value || '';
    const selectionStart = activeTextTarget.selectionStart;
    const selectionEnd = activeTextTarget.selectionEnd;
    const newPosition =
      direction === 'left'
        ? Math.max(0, selectionStart - 1)
        : Math.min(textValue.length, selectionEnd + 1);
    activeTextTarget.setSelectionRange(newPosition, newPosition);
    if (!textValue.length) autoCapitalizeFirstLetter = true;
    refreshKeyLabels();
  };

  const activateKey = (keyElement) => {
    const keyName = keyElement.dataset.key;
    if (keyName === 'SHIFT') {
      if (isFirstCharacterMode()) autoCapitalizeFirstLetter = false;
      else shiftEnabled = !shiftEnabled;
      virtualKeyboardRoot.classList.toggle('stnav_vk_shift_on', shiftEnabled);
      return refreshKeyLabels();
    }
    if (keyName === 'CAPS') {
      capsLockEnabled = !capsLockEnabled;
      virtualKeyboardRoot.classList.toggle('stnav_vk_caps_on', capsLockEnabled);
      return refreshKeyLabels();
    }
    if (keyName === 'BACKSPACE') {
      deleteCharacter();
      shiftEnabled = false;
      virtualKeyboardRoot.classList.remove('stnav_vk_shift_on');
      return refreshKeyLabels();
    }
    if (keyName === 'ENTER') {
      hideKeyboard();
      navigationBrain.typingMode = false;
      navigationBrain.navEnabled = false;
      Promise.resolve().then(() => {
        if (activeTextTarget) {
          activeTextTarget.focus();
          const finalLength = (activeTextTarget.value || '').length;
          activeTextTarget.setSelectionRange(finalLength, finalLength);
        }
        navigationBrain.ws.send('SearchEnter');
      });
      return;
    }
    if (keyName === 'SPACE') {
      insertCharacter(' ');
      shiftEnabled = false;
      virtualKeyboardRoot.classList.remove('stnav_vk_shift_on');
      return refreshKeyLabels();
    }
    if (keyName === '🌐') {
      shiftEnabled = false;
      virtualKeyboardRoot.classList.remove('stnav_vk_shift_on');
      return refreshKeyLabels();
    }
    if (keyName === '⬅') return moveTextCursor('left');
    if (keyName === '➡') return moveTextCursor('right');
    const outputCharacter = resolveOutputCharacter(keyName);
    if (outputCharacter) insertCharacter(outputCharacter);
    shiftEnabled = false;
    virtualKeyboardRoot.classList.remove('stnav_vk_shift_on');
    refreshKeyLabels();
  };

  document.addEventListener(
    'keydown',
    (keyboardEvent) => {
      if (!navigationBrain.typingMode) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      if (keyboardEvent.key === 'Escape') {
        clearInputCompletely();
        navigationBrain.typingMode = false;
        hideKeyboard();
      }
      if (keyboardEvent.key === 'ArrowLeft') navigateBetweenKeys('left');
      if (keyboardEvent.key === 'ArrowRight') navigateBetweenKeys('right');
      if (keyboardEvent.key === 'ArrowUp') navigateBetweenKeys('up');
      if (keyboardEvent.key === 'ArrowDown') navigateBetweenKeys('down');
      if (keyboardEvent.key === 'Enter') activateKey(currentlySelectedKey);
    },
    true,
  );

  virtualKeyboardRoot.addEventListener('click', (mouseEvent) => {
    if (!navigationBrain.typingMode) return;
    const clickedKey = mouseEvent.target.closest('.stnav_vk_key');
    if (!clickedKey) return;
    visuallySelectKey(clickedKey);
    activateKey(clickedKey);
  });

  setInterval(() => {
    if (navigationBrain.typingMode && virtualKeyboardRoot.style.display === 'none') showKeyboard();
    if (!navigationBrain.typingMode && virtualKeyboardRoot.style.display !== 'none') hideKeyboard();
    refreshDisplayText();
    repositionKeyboard();
  }, 120);

  let lastKnownURL = location.href;
  const restoreNavigationState = () => {
    if (location.href !== lastKnownURL) {
      lastKnownURL = location.href;
      navigationBrain.navEnabled = true;
    }
  };

  window.addEventListener('popstate', restoreNavigationState);
  window.addEventListener('hashchange', restoreNavigationState);
  new MutationObserver(restoreNavigationState).observe(document, {
    subtree: true,
    childList: true,
  });
})();

