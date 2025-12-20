(function () {
  'use strict';

  const { state: navigationBrain } = window.STNAV_CORE;

  const availableLanguages = window.VKAVAILABLELANGUAGES;
  let activeLanguageIndex = 0;

  const resolveLanguageSuffix = (fileName) =>
    fileName.replace('.js', '').toUpperCase();

  let keyboardLayout;
  let numberSymbolPairs;
  let punctuationSymbolPairs;
  let wideKeySizes;

  const bindActiveLanguage = () => {
    const languageSuffix = resolveLanguageSuffix(
      availableLanguages[activeLanguageIndex],
    );

    const languageObject =
      window[`STNAV_VIRTUAL_KEYBOARD_LANGUAGE_${languageSuffix}`];

    const layoutKey = Object.keys(languageObject).find((key) =>
      key.startsWith('keyboardLayout'),
    );
    const numberKey = Object.keys(languageObject).find((key) =>
      key.startsWith('numberSymbolPairs'),
    );
    const punctuationKey = Object.keys(languageObject).find((key) =>
      key.startsWith('punctuationSymbolPairs'),
    );
    const wideKey = Object.keys(languageObject).find((key) =>
      key.startsWith('wideKeySizes'),
    );

    keyboardLayout = languageObject[layoutKey];
    numberSymbolPairs = languageObject[numberKey];
    punctuationSymbolPairs = languageObject[punctuationKey];
    wideKeySizes = languageObject[wideKey];
  };

  bindActiveLanguage();

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = 'http://localhost:8080/static/navigation/virtual_keyboard.css';
  document.head.appendChild(styleLink);

  const virtualKeyboardRoot = document.createElement('div');
  virtualKeyboardRoot.id = 'stnav_virtual_keyboard';

  const virtualKeyboardDisplay = document.createElement('div');
  virtualKeyboardDisplay.id = 'stnav_vk_display';
  virtualKeyboardRoot.appendChild(virtualKeyboardDisplay);

  let keyboardRows = [];
  let allKeyElements = [];

  const rebuildKeyboard = () => {
    virtualKeyboardRoot
      .querySelectorAll('.stnav_vk_row')
      .forEach((row) => row.remove());

    keyboardRows = [];
    allKeyElements = [];

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
        keyElement.style.flex = wideKeySizes[keyLabel]
          ? String(wideKeySizes[keyLabel])
          : '1';

        rowContainer.appendChild(keyElement);
        rowKeys.push(keyElement);
        allKeyElements.push(keyElement);
      });

      keyboardRows.push(rowKeys);
      virtualKeyboardRoot.appendChild(rowContainer);
    });
  };

  rebuildKeyboard();
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
      : document.querySelector(
          'input[type="search"],input[role="searchbox"],input[type="text"],textarea',
        );

  const isFirstCharacterMode = () =>
    activeTextTarget &&
    autoCapitalizeFirstLetter &&
    (activeTextTarget.value || '').length === 0;

  const refreshDisplayText = () => {
    if (!activeTextTarget) return (virtualKeyboardDisplay.textContent = '');
    const fullText = activeTextTarget.value || '';
    const cursorPosition = activeTextTarget.selectionStart || 0;
    virtualKeyboardDisplay.innerHTML = '';
    virtualKeyboardDisplay.append(
      document.createTextNode(fullText.slice(0, cursorPosition)),
      Object.assign(document.createElement('span'), {
        className: 'stnav_vk_caret',
      }),
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
        const pair = numberSymbolPairs[baseCharacter];
        keyElement.textContent =
          capsLockEnabled || shiftEnabled ? pair[1] : pair[0];
      } else if (punctuationSymbolPairs[baseCharacter]) {
        const pair = punctuationSymbolPairs[baseCharacter];
        keyElement.textContent = shiftEnabled ? pair[1] : pair[0];
      }
    });

    refreshDisplayText();
  };

  const visuallySelectKey = (keyElement) => {
    if (currentlySelectedKey)
      currentlySelectedKey.classList.remove('stnav_vk_selected');
    currentlySelectedKey = keyElement;
    keyElement.classList.add('stnav_vk_selected');
  };

  const switchLanguage = () => {
    activeLanguageIndex =
      (activeLanguageIndex + 1) % availableLanguages.length;

    bindActiveLanguage();
    rebuildKeyboard();
    refreshKeyLabels();
    visuallySelectKey(keyboardRows[0][0]);
  };

  const activateKey = (keyElement) => {
    const keyName = keyElement.dataset.key;

    if (keyName === '🌐') return switchLanguage();

    if (keyName === 'SHIFT') {
      shiftEnabled = !shiftEnabled;
      virtualKeyboardRoot.classList.toggle(
        'stnav_vk_shift_on',
        shiftEnabled,
      );
      return refreshKeyLabels();
    }

    if (keyName === 'CAPS') {
      capsLockEnabled = !capsLockEnabled;
      virtualKeyboardRoot.classList.toggle(
        'stnav_vk_caps_on',
        capsLockEnabled,
      );
      return refreshKeyLabels();
    }

    if (keyName === 'BACKSPACE') return deleteCharacter();
    if (keyName === 'ENTER') return hideKeyboard();
    if (keyName === 'SPACE') return insertCharacter(' ');
    if (keyName === '⬅') return moveTextCursor('left');
    if (keyName === '➡') return moveTextCursor('right');

    insertCharacter(resolveOutputCharacter(keyName));
    shiftEnabled = false;
    virtualKeyboardRoot.classList.remove('stnav_vk_shift_on');
    refreshKeyLabels();
  };

  const calculateKeyboardHeight = () =>
    Math.max(350, Math.min(400, window.innerHeight * 0.55));

  const repositionKeyboard = () => {
    const chromeOffset = Math.max(
      0,
      Math.round((window.outerHeight - window.innerHeight) / 2),
    );
    virtualKeyboardRoot.style.bottom = '0px';
    virtualKeyboardRoot.style.height = `${
      calculateKeyboardHeight() + chromeOffset
    }px`;
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
    if (currentlySelectedKey)
      currentlySelectedKey.classList.remove('stnav_vk_selected');
    currentlySelectedKey = null;
  };

  const insertCharacter = (characterToInsert) => {
    if (!activeTextTarget) return;
    activeTextTarget.focus();

    if (textInputBridge) {
      textInputBridge.flushPendingComposition();
      textInputBridge.commitComposition(characterToInsert);
      return refreshDisplayText();
    }

    const value = activeTextTarget.value;
    const start = activeTextTarget.selectionStart;
    const end = activeTextTarget.selectionEnd;

    activeTextTarget.value =
      value.slice(0, start) + characterToInsert + value.slice(end);

    activeTextTarget.setSelectionRange(
      start + characterToInsert.length,
      start + characterToInsert.length,
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

    const value = activeTextTarget.value;
    const start = activeTextTarget.selectionStart;
    const end = activeTextTarget.selectionEnd;

    if (start === 0 && end === 0) return;

    const deleteFrom = start === end ? start - 1 : start;

    activeTextTarget.value =
      value.slice(0, deleteFrom) + value.slice(end);

    activeTextTarget.setSelectionRange(deleteFrom, deleteFrom);
    activeTextTarget.dispatchEvent(new Event('input', { bubbles: true }));

    if (!activeTextTarget.value.length) autoCapitalizeFirstLetter = true;
    refreshDisplayText();
  };

  const resolveOutputCharacter = (keyName) => {
    if (/^[a-z]$/i.test(keyName))
      return isFirstCharacterMode()
        ? keyName.toUpperCase()
        : capsLockEnabled ^ shiftEnabled
        ? keyName.toUpperCase()
        : keyName.toLowerCase();

    if (numberSymbolPairs[keyName])
      return capsLockEnabled || shiftEnabled
        ? numberSymbolPairs[keyName][1]
        : numberSymbolPairs[keyName][0];

    if (punctuationSymbolPairs[keyName])
      return shiftEnabled
        ? punctuationSymbolPairs[keyName][1]
        : punctuationSymbolPairs[keyName][0];

    return keyName;
  };

  const moveTextCursor = (direction) => {
    if (!activeTextTarget) return;
    activeTextTarget.focus();

    const value = activeTextTarget.value || '';
    const start = activeTextTarget.selectionStart;
    const end = activeTextTarget.selectionEnd;

    const newPosition =
      direction === 'left'
        ? Math.max(0, start - 1)
        : Math.min(value.length, end + 1);

    activeTextTarget.setSelectionRange(newPosition, newPosition);

    if (!value.length) autoCapitalizeFirstLetter = true;
    refreshKeyLabels();
  };

  document.addEventListener(
    'keydown',
    (keyboardEvent) => {
      if (!navigationBrain.typingMode) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();

      if (keyboardEvent.key === 'Escape') hideKeyboard();
      if (keyboardEvent.key === 'ArrowLeft')
        navigateBetweenKeys('left');
      if (keyboardEvent.key === 'ArrowRight')
        navigateBetweenKeys('right');
      if (keyboardEvent.key === 'ArrowUp')
        navigateBetweenKeys('up');
      if (keyboardEvent.key === 'ArrowDown')
        navigateBetweenKeys('down');
      if (keyboardEvent.key === 'Enter')
        activateKey(currentlySelectedKey);
    },
    true,
  );

  const getKeyCenter = (keyElement) => {
    const bounds = keyElement.getBoundingClientRect();
    return [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2];
  };

  const navigateBetweenKeys = (direction) => {
    if (!currentlySelectedKey) return;

    const [currentX, currentY] = getKeyCenter(currentlySelectedKey);
    let closestKey = null;
    let lowestScore = Infinity;

    allKeyElements.forEach((candidateKey) => {
      if (candidateKey === currentlySelectedKey) return;

      const [x, y] = getKeyCenter(candidateKey);
      let primaryDistance;
      let secondaryDistance;

      if (direction === 'up') {
        primaryDistance = currentY - y;
        secondaryDistance = Math.abs(x - currentX);
      } else if (direction === 'down') {
        primaryDistance = y - currentY;
        secondaryDistance = Math.abs(x - currentX);
      } else if (direction === 'left') {
        primaryDistance = currentX - x;
        secondaryDistance = Math.abs(y - currentY);
      } else if (direction === 'right') {
        primaryDistance = x - currentX;
        secondaryDistance = Math.abs(y - currentY);
      } else return;

      if (primaryDistance <= 1) return;

      const weight =
        direction === 'left' || direction === 'right' ? 30 : 2;

      const score = primaryDistance + secondaryDistance * weight;

      if (score < lowestScore) {
        lowestScore = score;
        closestKey = candidateKey;
      }
    });

    if (closestKey) visuallySelectKey(closestKey);
  };

  virtualKeyboardRoot.addEventListener('click', (mouseEvent) => {
    if (!navigationBrain.typingMode) return;
    const clickedKey = mouseEvent.target.closest('.stnav_vk_key');
    if (!clickedKey) return;
    visuallySelectKey(clickedKey);
    activateKey(clickedKey);
  });

  setInterval(() => {
    if (
      navigationBrain.typingMode &&
      virtualKeyboardRoot.style.display === 'none'
    )
      showKeyboard();

    if (
      !navigationBrain.typingMode &&
      virtualKeyboardRoot.style.display !== 'none'
    )
      hideKeyboard();

    refreshDisplayText();
    repositionKeyboard();
  }, 120);
})();

