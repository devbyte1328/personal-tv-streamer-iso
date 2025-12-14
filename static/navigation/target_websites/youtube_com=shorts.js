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

  function cancelYouTubeShortsHandler(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.stopPropagation();
    }
  }

  if (location.pathname.startsWith('/shorts')) {
    window.addEventListener('keydown', cancelYouTubeShortsHandler, true);
    document.addEventListener('keydown', cancelYouTubeShortsHandler, true);
  }

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

    const toggleFullscreen = function () {
      const fullscreenButton = document.querySelector('#fullscreen-button-shape button');
      if (fullscreenButton) fullscreenButton.click();
    };

    const exitFullscreenIfActive = function () {
      if (document.fullscreenElement) {
        toggleFullscreen();
      }
    };

    const toggleMute = function () {
      const muteButton = document.querySelector('button.ytdVolumeControlsMuteIconButton');
      if (muteButton) muteButton.click();
    };

    const createPanel = function () {
      ensureStylesheetLoaded();

      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';

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
        makeButton('Fullscreen', 'fullscreen-32x32.png', function () {
          toggleFullscreen();
          hidePanel();
        })
      );

      controlPanelElement.appendChild(
        makeButton('Mute / Unmute', 'audio-32x32.png', function () {
          toggleMute();
        })
      );

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
      const buttons = controlPanelElement.querySelectorAll('button');
      if (buttons.length > 0) {
        window.STNAV_CORE.highlight(buttons[0]);
      }
    };

    const showPanel = function () {
      exitFullscreenIfActive();
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

