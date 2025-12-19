(function () {
  'use strict';

  window.STNAV_TARGETS = window.STNAV_TARGETS || {};

  window.STNAV_TARGETS.selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];

  if (!window.__STNAV_RIGHT_CTRL_BOUND__) {
    window.__STNAV_RIGHT_CTRL_BOUND__ = true;

    let controlPanelElement = null;
    let panelVisible = false;
    let previousActiveElement = null;

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

    const dispatchKey = function (keyValue, codeValue) {
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: keyValue,
        code: codeValue,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(keyboardEvent);
    };

    const createPanel = function () {
      ensureStylesheetLoaded();

      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';
      controlPanelElement.style.position = 'fixed';
      controlPanelElement.style.zIndex = '2147483639';

      const makeButton = function (labelText, iconName, clickHandler) {
        const buttonElement = document.createElement('button');
        buttonElement.className = 'stnav-control-button';

        const iconElement = document.createElement('img');
        iconElement.className = 'stnav-control-icon';
        iconElement.src = 'http://localhost:8080/static/assets/virtual_panel_icons/' + iconName;

        const labelElement = document.createElement('span');
        labelElement.textContent = labelText;

        buttonElement.appendChild(iconElement);
        buttonElement.appendChild(labelElement);
        buttonElement.onclick = clickHandler;

        return buttonElement;
      };

      controlPanelElement.appendChild(
        makeButton('Refresh Page', 'refresh-32x32.png', function () {
          dispatchKey('F5', 'F5');
          location.reload();
        })
      );

      controlPanelElement.appendChild(
        makeButton('Escape', 'escape-32x32.png', function () {
          dispatchKey('Escape', 'Escape');
        })
      );

      controlPanelElement.appendChild(
        makeButton('Close', 'close-32x32.png', function () {
          hidePanel();
        })
      );

      document.body.appendChild(controlPanelElement);
    };

    const focusFirstPanelButton = function () {
      if (!window.STNAV_CORE) return;
      forceHighlighterAbovePanel();
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
      setTimeout(focusFirstPanelButton, 0);
    };

    const hidePanel = function () {
      controlPanelElement.classList.remove('stnav-visible');
      panelVisible = false;
      if (window.STNAV_CORE && previousActiveElement) {
        window.STNAV_CORE.highlight(previousActiveElement);
        forceHighlighterAbovePanel();
      }
    };

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

    document.addEventListener(
      'keydown',
      function (keyboardEvent) {
        if (!window.STNAV_CORE || !window.STNAV_CORE.state) return;
        const stateObject = window.STNAV_CORE.state;
        if (!stateObject.keyboardEntryMode && !stateObject.typingMode) return;
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
  }
})();

