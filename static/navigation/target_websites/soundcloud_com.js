(function () {
  'use strict';

  window.STNAV_TARGETS = window.STNAV_TARGETS || {};

  window.STNAV_TARGETS.selectors = [
    '.stnav-control-panel button',
    'a[href]',
    'button:not([disabled]):not(.PlayerControls_coverButton__3vhI4)',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'ytd-thumbnail',
    'ytd-playlist-panel-video-renderer',
    '.yt-lockup-view-model',
    'ytmusic-responsive-list-item-renderer .title',
    'a.videostream__link.link',
    'li',
    '[role="button"]',
    '[role="link"]',
    'div.rgpl-btn-play'
  ];

  window.addEventListener(
    'keydown',
    function handleKeydownToDisableSoundCloudDefaults(event) {
      const pressedKey = event.key;
      const isEnterPressed = pressedKey === 'Enter';
      const isLeftArrowPressed = pressedKey === 'ArrowLeft';
      const isRightArrowPressed = pressedKey === 'ArrowRight';

      if (isEnterPressed || isLeftArrowPressed || isRightArrowPressed) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );

  let lastObservedUrl = location.href;

  const refreshOnAnyUrlChange = function () {
    if (location.href === lastObservedUrl) return;
    lastObservedUrl = location.href;
    location.reload();
  };

  setInterval(refreshOnAnyUrlChange, 200);

  const isWatchPage = function () {
    return location.pathname.startsWith('/watch/');
  };

  let remapActive = false;

  function remap(event) {
    if (!document.fullscreenElement) return;
    if (!remapActive) return;

    let keyToSend = null;

    if (event.key === 'Enter') keyToSend = ' ';

    if (keyToSend !== null) {
      event.preventDefault();
      event.stopPropagation();
      fake(keyToSend);
    }
  }

  function fake(letter) {
    const upper = letter.toUpperCase();
    const code = upper === ' ' ? 'Space' : upper;
    const keyCode = upper.charCodeAt(0);

    const options = {
      key: letter,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true
    };

    const down = new KeyboardEvent('keydown', options);
    const up = new KeyboardEvent('keyup', options);

    let target = document.activeElement || document.body;
    if (target === document.body) target = document;

    target.dispatchEvent(down);
    target.dispatchEvent(up);
  }

  document.addEventListener('fullscreenchange', function () {
    remapActive = !!document.fullscreenElement;
  });

  window.addEventListener('keydown', remap, true);

  if (!window.__STNAV_RIGHT_CTRL_BOUND__) {
    window.__STNAV_RIGHT_CTRL_BOUND__ = true;

    let controlPanelElement = null;
    let panelVisible = false;
    let previousActiveElement = null;
    let panelPageIdentifier = 'main';

    const ensureStylesheetLoaded = function () {
      if (document.getElementById('stnav-virtual-panel-css')) return;

      const linkElement = document.createElement('link');
      linkElement.id = 'stnav-virtual-panel-css';
      linkElement.rel = 'stylesheet';
      linkElement.href = 'http://localhost:8080/static/navigation/virtual_panel.css';
      document.head.appendChild(linkElement);
    };

    const forceHighlighterAbovePanel = function () {
      if (!window.STNAV_CORE) return;
      const overlayElement = window.STNAV_CORE.overlay || window.STNAV_CORE.highlightOverlay;
      if (!overlayElement || !overlayElement.style) return;
      overlayElement.style.position = 'fixed';
      overlayElement.style.zIndex = '2147483640';
      overlayElement.style.pointerEvents = 'none';
    };

    const rebuildPanelContents = function () {
      controlPanelElement.innerHTML = '';

      const createPanelButtonElement = function (buttonLabelText, iconFileName, clickHandlerFunction) {
        const buttonElement = document.createElement('button');
        buttonElement.className = 'stnav-control-button';
        buttonElement.tabIndex = 0;

        if (iconFileName) {
          const iconElement = document.createElement('img');
          iconElement.className = 'stnav-control-icon';
          iconElement.src = 'http://localhost:8080/static/assets/virtual_panel_icons/' + iconFileName;
          buttonElement.appendChild(iconElement);
        }

        const labelElement = document.createElement('span');
        labelElement.textContent = buttonLabelText;

        buttonElement.appendChild(labelElement);
        buttonElement.onclick = clickHandlerFunction;

        return buttonElement;
      };

      if (panelPageIdentifier === 'main') {
        controlPanelElement.appendChild(
          createPanelButtonElement('Refresh Page', 'refresh-32x32.png', function () {
            location.reload();
          })
        );

        controlPanelElement.appendChild(
          createPanelButtonElement('Escape', 'escape-32x32.png', function () {
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true });
            document.dispatchEvent(escapeEvent);
          })
        );

        controlPanelElement.appendChild(
          createPanelButtonElement('Close', 'close-32x32.png', function () {
            hidePanel();
          })
        );
      }
    };

    const createPanel = function () {
      ensureStylesheetLoaded();

      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';
      controlPanelElement.style.position = 'fixed';
      controlPanelElement.style.zIndex = '2147483639';

      rebuildPanelContents();
      document.body.appendChild(controlPanelElement);
    };

    const focusFirstPanelButton = function () {
      if (!window.STNAV_CORE) return;
      const buttons = controlPanelElement.querySelectorAll('button');
      if (buttons.length > 0) {
        window.STNAV_CORE.highlight(buttons[0]);
      }
    };

    const showPanel = function () {
      if (!controlPanelElement) createPanel();
      previousActiveElement = window.STNAV_CORE && window.STNAV_CORE.state.activeElement;
      controlPanelElement.classList.add('stnav-visible');
      panelVisible = true;
      forceHighlighterAbovePanel();
      setTimeout(focusFirstPanelButton, 0);
    };

    const hidePanel = function () {
      if (!controlPanelElement) return;
      controlPanelElement.classList.remove('stnav-visible');
      panelVisible = false;
      panelPageIdentifier = 'main';
      if (window.STNAV_CORE && previousActiveElement) {
        window.STNAV_CORE.highlight(previousActiveElement);
        forceHighlighterAbovePanel();
      }
    };

    window.addEventListener(
      'keydown',
      function (keyboardEvent) {
        if (!panelVisible) return;

        if (
          keyboardEvent.key === 'ArrowUp' ||
          keyboardEvent.key === 'ArrowDown' ||
          keyboardEvent.key === 'ArrowLeft' ||
          keyboardEvent.key === 'ArrowRight'
        ) {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
        }
      },
      true
    );

    window.addEventListener(
      'keydown',
      function (keyboardEvent) {
        if (keyboardEvent.code === 'ControlRight') {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          panelVisible ? hidePanel() : showPanel();
        }
      },
      true
    );
  }
})();

