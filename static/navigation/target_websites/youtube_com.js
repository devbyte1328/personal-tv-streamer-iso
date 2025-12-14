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
    let settingsNavigationStack = [];
    let settingsPageIndex = 0;

    const SETTINGS_PAGE_SIZE = 7;

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
      if (fullscreenButtonElement) fullscreenButtonElement.click();
    };

    const invokeYouTubeMuteButton = function () {
      const muteButtonElement = document.querySelector('button.ytp-volume-icon');
      if (muteButtonElement) muteButtonElement.click();
    };

    const invokeYouTubeSubtitlesButton = function () {
      const subtitlesIconContainer = document.querySelector('.ytp-subtitles-button-icon');
      if (subtitlesIconContainer) {
        const clickableButton = subtitlesIconContainer.closest('button');
        if (clickableButton) clickableButton.click();
      }
    };

    const invokeYouTubeSettingsButton = function () {
      const settingsButtonElement = document.querySelector('button.ytp-settings-button');
      if (settingsButtonElement) settingsButtonElement.click();
    };

    const readCurrentSettingsMenuItems = function () {
      const menuContainer = document.querySelector('.ytp-panel-menu');
      if (!menuContainer) return [];
      return Array.from(menuContainer.querySelectorAll('.ytp-menuitem')).map(function (menuItemElement) {
        const labelElement = menuItemElement.querySelector('.ytp-menuitem-label');
        return {
          label: labelElement ? labelElement.textContent.trim() : 'Unknown',
          element: menuItemElement
        };
      });
    };

    const rebuildPanelContents = function () {
      if (!controlPanelElement) return;

      controlPanelElement.innerHTML = '';

      const makeButton = function (labelText, iconName, clickHandler) {
        const buttonElement = document.createElement('button');
        buttonElement.className = 'stnav-control-button';

        if (iconName) {
          const iconElement = document.createElement('img');
          iconElement.className = 'stnav-control-icon';
          iconElement.src = 'http://localhost:8080/static/assets/virtual_panel_icons/' + iconName;
          buttonElement.appendChild(iconElement);
        }

        const labelElement = document.createElement('span');
        labelElement.textContent = labelText;

        buttonElement.appendChild(labelElement);
        buttonElement.onclick = clickHandler;

        return buttonElement;
      };

      if (isWatchPage() && settingsNavigationStack.length === 0) {
        settingsPageIndex = 0;

        controlPanelElement.appendChild(
          makeButton('Fullscreen', 'fullscreen-32x32.png', function () {
            invokeYouTubeFullscreenButton();
            hidePanel();
          })
        );

        controlPanelElement.appendChild(
          makeButton('Subtitles', 'subtitles-32x32.png', function () {
            invokeYouTubeSubtitlesButton();
          })
        );

        controlPanelElement.appendChild(
          makeButton('Video Settings', 'video_settings-32x32.png', function () {
            invokeYouTubeSettingsButton();
            setTimeout(function () {
              settingsNavigationStack.push('root');
              settingsPageIndex = 0;
              rebuildPanelContents();
            }, 50);
          })
        );

        controlPanelElement.appendChild(
          makeButton('Mute / Unmute', 'audio-32x32.png', function () {
            invokeYouTubeMuteButton();
          })
        );
      }

      if (settingsNavigationStack.length > 0) {
        const menuItems = readCurrentSettingsMenuItems();
        const pageCount = Math.ceil(menuItems.length / SETTINGS_PAGE_SIZE);
        const pageStart = settingsPageIndex * SETTINGS_PAGE_SIZE;
        const pageEnd = pageStart + SETTINGS_PAGE_SIZE;

        menuItems.slice(pageStart, pageEnd).forEach(function (menuItem) {
          controlPanelElement.appendChild(
            makeButton(menuItem.label, null, function () {
              menuItem.element.click();
              setTimeout(function () {
                settingsNavigationStack.push(menuItem.label);
                settingsPageIndex = 0;
                rebuildPanelContents();
              }, 50);
            })
          );
        });

        if (pageCount > 1) {
          if (settingsPageIndex > 0) {
            controlPanelElement.appendChild(
              makeButton('Previous Page', 'escape-32x32.png', function () {
                settingsPageIndex -= 1;
                rebuildPanelContents();
              })
            );
          }

          if (settingsPageIndex < pageCount - 1) {
            controlPanelElement.appendChild(
              makeButton('Next Page', 'escape-32x32.png', function () {
                settingsPageIndex += 1;
                rebuildPanelContents();
              })
            );
          }
        }

        controlPanelElement.appendChild(
          makeButton('Back', 'escape-32x32.png', function () {
            settingsNavigationStack.pop();
            settingsPageIndex = 0;
            dispatchKey('Escape', 'Escape');
            setTimeout(rebuildPanelContents, 50);
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
          settingsNavigationStack = [];
          settingsPageIndex = 0;
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
      settingsNavigationStack = [];
      settingsPageIndex = 0;
      if (window.STNAV_CORE && previousActiveElement) {
        window.STNAV_CORE.highlight(previousActiveElement);
      }
    };

    const detectSpaNavigation = function () {
      const currentLocation = location.pathname + location.search;
      if (currentLocation !== lastKnownPathname) {
        lastKnownPathname = currentLocation;
        if (controlPanelElement) rebuildPanelContents();
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

