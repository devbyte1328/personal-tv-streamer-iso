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

  if (!window.__STNAV_RIGHT_CTRL_BOUND__) {
    window.__STNAV_RIGHT_CTRL_BOUND__ = true;

    let controlPanelElement = null;
    let panelVisible = false;
    let previousActiveElement = null;
    let lastKnownPathname = location.pathname + location.search;

    const isWatchPage = function () {
      return location.pathname === '/watch' && location.search.includes('v=');
    };

    const isFullscreenActive = function () {
      return !!document.fullscreenElement || document.body.classList.contains('ytp-fullscreen');
    };

    const exitFullscreenIfActive = function () {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    };

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

    const invokeYouTubeFullscreenButton = function () {
      const fullscreenButtonElement = document.querySelector('button.ytp-fullscreen-button');
      if (fullscreenButtonElement) {
        fullscreenButtonElement.click();
      }
    };

    const rebuildPanelContents = function () {
      if (!controlPanelElement) return;

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

      if (isWatchPage()) {
        controlPanelElement.appendChild(
          makeButton('Fullscreen', 'fullscreen-32x32.png', function () {
            invokeYouTubeFullscreenButton();
            hidePanel();
          })
        );

        controlPanelElement.appendChild(
          makeButton('Subtitles', 'subtitles-32x32.png', function () {
            const subtitlesButtonElement = document.querySelector('button.ytp-subtitles-button');
            if (subtitlesButtonElement) {
              subtitlesButtonElement.click();
            }
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
    };

    const createPanel = function () {
      ensureStylesheetLoaded();

      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';

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
      exitFullscreenIfActive();
      if (!controlPanelElement) createPanel();
      previousActiveElement = window.STNAV_CORE && window.STNAV_CORE.state.activeElement;
      controlPanelElement.classList.add('stnav-visible');
      panelVisible = true;
      setTimeout(focusFirstPanelButton, 0);
    };

    const hidePanel = function () {
      if (!controlPanelElement) return;
      controlPanelElement.classList.remove('stnav-visible');
      panelVisible = false;
      if (window.STNAV_CORE && previousActiveElement) {
        window.STNAV_CORE.highlight(previousActiveElement);
      }
    };

    const detectSpaNavigation = function () {
      const currentLocation = location.pathname + location.search;
      if (currentLocation !== lastKnownPathname) {
        lastKnownPathname = currentLocation;
        if (controlPanelElement) {
          rebuildPanelContents();
        }
      }
    };

    setInterval(detectSpaNavigation, 300);

    window.addEventListener(
      'keydown',
      function (keyboardEvent) {
        if (keyboardEvent.code === 'ControlRight') {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          panelVisible ? hidePanel() : showPanel();
        }

        if (isFullscreenActive() && keyboardEvent.key === 'Enter') {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          if (window?.STNAV_CORE?.state?.websocketLink) {
            window.STNAV_CORE.state.websocketLink.send('VideoPlayPause');
          }
        }
      },
      true
    );
  }
})();

