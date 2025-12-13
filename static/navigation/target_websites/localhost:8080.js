(function () {
  'use strict';

  window.STNAV_TARGETS = window.STNAV_TARGETS || {};

  window.STNAV_TARGETS.selectors = [
    '#sidebar ul li[data-url]',
    '.home-video-wrapper iframe#standalone-home-video-frame',
    '.home-video-wrapper #standalone-home-video-overlay',
    '#carousel-container iframe[data-position="center"]',
    '#carousel-container iframe[data-position="left"]',
    '#carousel-container iframe[data-position="right"]',
    '.carousel-overlay',
    '#standalone-trailer-frame',
    '#standalone-trailer-overlay',
    '.thumbnail-wrapper img',
    '.thumbnail-wrapper .thumbnail-overlay',
    '#left-carousel-btn',
    '#right-carousel-btn',
    '.application_buttons_container .app-btn',
    '.stnav-control-panel button'
  ];

  if (!window.__STNAV_RIGHT_CTRL_BOUND__) {
    window.__STNAV_RIGHT_CTRL_BOUND__ = true;

    let controlPanelElement = null;
    let panelVisible = false;
    let previousActiveElement = null;

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
      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';
      controlPanelElement.style.position = 'fixed';
      controlPanelElement.style.bottom = '20px';
      controlPanelElement.style.right = '20px';
      controlPanelElement.style.background = 'rgba(0,0,0,0.75)';
      controlPanelElement.style.color = 'white';
      controlPanelElement.style.padding = '16px';
      controlPanelElement.style.borderRadius = '12px';
      controlPanelElement.style.zIndex = '2147483647';
      controlPanelElement.style.display = 'flex';
      controlPanelElement.style.flexDirection = 'column';
      controlPanelElement.style.gap = '10px';
      controlPanelElement.style.fontSize = '16px';
      controlPanelElement.style.minWidth = '220px';

      const makeButton = function (labelText, clickHandler) {
        const buttonElement = document.createElement('button');
        buttonElement.textContent = labelText;
        buttonElement.style.background = 'rgba(255,255,255,0.1)';
        buttonElement.style.color = 'white';
        buttonElement.style.border = '1px solid rgba(255,255,255,0.4)';
        buttonElement.style.padding = '10px 14px';
        buttonElement.style.borderRadius = '8px';
        buttonElement.style.cursor = 'pointer';
        buttonElement.style.fontSize = '15px';
        buttonElement.onclick = clickHandler;
        return buttonElement;
      };

      const refreshButton = makeButton('Refresh Page', function () {
        dispatchKey('F5', 'F5');
        location.reload();
      });

      const escapeButton = makeButton('Escape', function () {
        dispatchKey('Escape', 'Escape');
      });

      const closeButton = makeButton('Close', function () {
        hidePanel();
      });

      controlPanelElement.appendChild(refreshButton);
      controlPanelElement.appendChild(escapeButton);
      controlPanelElement.appendChild(closeButton);

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
      controlPanelElement.style.display = 'flex';
      panelVisible = true;
      setTimeout(focusFirstPanelButton, 0);
    };

    const hidePanel = function () {
      controlPanelElement.style.display = 'none';
      panelVisible = false;
      if (window.STNAV_CORE && previousActiveElement) {
        window.STNAV_CORE.highlight(previousActiveElement);
      }
    };

    window.addEventListener('keydown', function (keyboardEvent) {
      if (keyboardEvent.code === 'ControlRight') {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        if (panelVisible) {
          hidePanel();
        } else {
          showPanel();
        }
      }
    }, true);
  }

})();

