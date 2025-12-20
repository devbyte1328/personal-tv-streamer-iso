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

  let fullscreenActive = false;

  function elementRequiresNativeArrowNavigation(element) {
    if (!element) return false;
    const tagName = element.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
    if (element.isContentEditable) return true;
    return false;
  }

  function forceReleaseFocusedInput() {
    const activeElement = document.activeElement;
    if (!activeElement) return;
    if (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.isContentEditable
    ) {
      activeElement.blur();
      document.body.focus();
    }
  }

  window.addEventListener("keydown", function (event) {
    if (elementRequiresNativeArrowNavigation(event.target)) {
      return;
    }

    if (!fullscreenActive) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Enter") {
      if (window?.STNAV_CORE?.state?.websocketLink) {
        window.STNAV_CORE.state.websocketLink.send("VideoPlayPause");
      }
    }
  }, true);

  document.addEventListener("fullscreenchange", () => {
    fullscreenActive = !!document.fullscreenElement;
  });

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
      controlPanelElement.style.zIndex = '2147483646';

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
          forceReleaseFocusedInput();
          dispatchKey('F5', 'F5');
          location.reload();
        })
      );

      controlPanelElement.appendChild(
        makeButton('Escape', 'escape-32x32.png', function () {
          forceReleaseFocusedInput();
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
      const buttons = controlPanelElement.querySelectorAll('button');
      if (buttons.length > 0) {
        window.STNAV_CORE.highlight(buttons[0]);
      }
    };

    const showPanel = function () {
      forceReleaseFocusedInput();
      if (!controlPanelElement) createPanel();
      previousActiveElement = window.STNAV_CORE && window.STNAV_CORE.state.activeElement;
      controlPanelElement.classList.add('stnav-visible');
      panelVisible = true;
      setTimeout(focusFirstPanelButton, 0);
    };

    const hidePanel = function () {
      controlPanelElement.classList.remove('stnav-visible');
      panelVisible = false;
      forceReleaseFocusedInput();
      if (window.STNAV_CORE && previousActiveElement) {
        window.STNAV_CORE.highlight(previousActiveElement);
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
  }
})();

