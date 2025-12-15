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

  let remapActive = false;

  function remap(event) {
    if (!document.fullscreenElement) return;
    if (!remapActive) return;

    let keyToSend = null;

    if (event.key === 'ArrowLeft') keyToSend = 'h';
    if (event.key === 'ArrowDown') keyToSend = 'j';
    if (event.key === 'ArrowUp') keyToSend = 'k';
    if (event.key === 'ArrowRight') keyToSend = 'l';
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

  document.addEventListener('fullscreenchange', () => {
    remapActive = !!document.fullscreenElement;
  });

  window.addEventListener('keydown', remap, true);

  if (!window.__STNAV_RIGHT_CTRL_BOUND__) {
    window.__STNAV_RIGHT_CTRL_BOUND__ = true;

    let controlPanelElement = null;
    let panelVisible = false;
    let previousActiveElement = null;
    let panelMode = 'main';

    const ensureStylesheetLoaded = function () {
      if (document.getElementById('stnav-virtual-panel-css')) return;

      const linkElement = document.createElement('link');
      linkElement.id = 'stnav-virtual-panel-css';
      linkElement.rel = 'stylesheet';
      linkElement.href = 'http://localhost:8080/static/navigation/virtual_panel.css';
      document.head.appendChild(linkElement);
    };

    const forceHighlighterOnTop = function () {
      if (!window.STNAV_CORE) return;
      const overlay = window.STNAV_CORE.overlay || window.STNAV_CORE.highlightOverlay;
      if (overlay && overlay.style) {
        overlay.style.position = 'fixed';
        overlay.style.zIndex = '2147483647';
        overlay.style.pointerEvents = 'none';
      }
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

    const isWatchUrl = function () {
      return location.href.indexOf('music.youtube.com/watch') !== -1;
    };

    const pressFullscreenButton = function () {
      const fullscreenButton = document.querySelector('button[aria-label="Enter full screen"]');
      if (fullscreenButton) fullscreenButton.click();
    };

    const toggleMute = function () {
      const muteButton = document.querySelector('button[aria-label="Mute"], button[aria-label="Unmute"]');
      if (muteButton) muteButton.click();
    };

    const setVolumeLevel = function (percentage) {
      const mediaElement = document.querySelector('video, audio');
      if (!mediaElement) return;
      mediaElement.volume = Math.max(0, Math.min(1, percentage / 100));
      if (percentage === 0) mediaElement.muted = true;
      if (percentage > 0) mediaElement.muted = false;
    };

    const rebuildPanelButtons = function () {
      controlPanelElement.innerHTML = '';

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

      if (panelMode === 'main') {
        if (isWatchUrl()) {
          controlPanelElement.appendChild(
            makeButton('Fullscreen', 'fullscreen-32x32.png', function () {
              pressFullscreenButton();
              hidePanel();
            })
          );

          controlPanelElement.appendChild(
            makeButton('Mute / Unmute', 'audio-32x32.png', function () {
              toggleMute();
            })
          );

          controlPanelElement.appendChild(
            makeButton('Volume', 'audio-32x32.png', function () {
              panelMode = 'volume';
              rebuildPanelButtons();
              setTimeout(focusFirstPanelButton, 0);
            })
          );
        }

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
      }

      if (panelMode === 'volume') {
        [100, 75, 50, 25, 0].forEach(function (value) {
          controlPanelElement.appendChild(
            makeButton(value + '%', 'audio-32x32.png', function () {
              setVolumeLevel(value);
            })
          );
        });

        controlPanelElement.appendChild(
          makeButton('Back', 'escape-32x32.png', function () {
            panelMode = 'main';
            rebuildPanelButtons();
            setTimeout(focusFirstPanelButton, 0);
          })
        );
      }
    };

    const createPanel = function () {
      ensureStylesheetLoaded();

      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';
      controlPanelElement.style.position = 'fixed';
      controlPanelElement.style.zIndex = '2147483645';
      controlPanelElement.style.pointerEvents = 'auto';

      rebuildPanelButtons();

      document.body.appendChild(controlPanelElement);
    };

    const focusFirstPanelButton = function () {
      if (!window.STNAV_CORE) return;
      forceHighlighterOnTop();
      const buttons = controlPanelElement.querySelectorAll('button');
      if (buttons.length > 0) {
        window.STNAV_CORE.highlight(buttons[0]);
      }
    };

    const showPanel = function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      if (!controlPanelElement) createPanel();
      panelMode = 'main';
      rebuildPanelButtons();
      previousActiveElement = window.STNAV_CORE && window.STNAV_CORE.state.activeElement;
      controlPanelElement.classList.add('stnav-visible');
      panelVisible = true;
      setTimeout(focusFirstPanelButton, 0);
    };

    const hidePanel = function () {
      if (!controlPanelElement) return;
      controlPanelElement.classList.remove('stnav-visible');
      panelVisible = false;
      panelMode = 'main';
      if (window.STNAV_CORE && previousActiveElement) {
        window.STNAV_CORE.highlight(previousActiveElement);
        forceHighlighterOnTop();
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

    window.addEventListener('popstate', function () {
      if (panelVisible && controlPanelElement) rebuildPanelButtons();
    });

    window.addEventListener('yt-navigate-finish', function () {
      if (panelVisible && controlPanelElement) rebuildPanelButtons();
    });
  }
})();

