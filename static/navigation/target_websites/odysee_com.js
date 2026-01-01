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

  const isTextEntryElement = function () {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    return (
      activeElement.isContentEditable ||
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA'
    );
  };

  const isVideoPage = function () {
    const pathnameValue = window.location.pathname || '';
    return pathnameValue.split('/').filter(Boolean).length >= 2;
  };

  const findFullscreenButton = function () {
    return document.querySelector('button.vjs-fullscreen-control');
  };

  const findMuteButton = function () {
    return document.querySelector('button.vjs-mute-control');
  };

  const findVideoElement = function () {
    return document.querySelector('video');
  };

  const findQualityMenuItems = function () {
    return Array.from(
      document.querySelectorAll(
        '.vjs-menu-content .vjs-menu-item[role="menuitemradio"]'
      )
    );
  };

  const findVideoSettingsButton = function () {
    return document.querySelector('button.vjs-setting-button');
  };

  const findVideoSettingsMenuItems = function () {
    return Array.from(
      document.querySelectorAll(
        '.vjs-menu-content .vjs-menu-item'
      )
    );
  };

  const findSpeedRootMenuItem = function () {
    return Array.from(
      document.querySelectorAll('.vjs-menu-content .vjs-menu-item')
    ).find(function (menuItemElement) {
      const labelElement = menuItemElement.querySelector('.vjs-setting-menu-label');
      return labelElement && labelElement.textContent.trim().toLowerCase() === 'speed';
    });
  };

  const findSpeedSubMenuItems = function () {
    return Array.from(
      document.querySelectorAll(
        '.vjs-menu-content .vjs-settings-sub-menu-option'
      )
    );
  };

  const enterFullscreenReliably = function () {
    const fullscreenButtonElement = findFullscreenButton();
    if (fullscreenButtonElement) {
      fullscreenButtonElement.click();
    }
  };

  const toggleMuteReliably = function () {
    const muteButtonElement = findMuteButton();
    if (muteButtonElement) {
      muteButtonElement.click();
    }
  };

  const setVolumeReliably = function (volumeValue) {
    const videoElement = findVideoElement();
    if (videoElement) {
      videoElement.volume = volumeValue;
      videoElement.muted = volumeValue === 0;
    }
  };

  const selectQualityReliably = function (menuItemElement) {
    if (menuItemElement) {
      menuItemElement.click();
    }
  };

  const openVideoSettingsReliably = function () {
    const settingsButtonElement = findVideoSettingsButton();
    if (settingsButtonElement) {
      settingsButtonElement.click();
    }
  };

  const activateMenuItemReliably = function (menuItemElement) {
    if (menuItemElement) {
      menuItemElement.click();
    }
  };

  const exitFullscreenReliably = function () {
    if (window?.STNAV_CORE?.state?.websocketLink) {
      window.STNAV_CORE.state.websocketLink.send('ExitFullscreen');
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  function setNavigationSystemState(disabledState) {
    if (window?.STNAV_CORE?.state) {
      window.STNAV_CORE.state.navigationDisabled = disabledState;
    }
  }

  let lastKnownUrl = window.location.href;

  const forceRefreshOnUrlChange = function () {
    const currentUrl = window.location.href;
    if (currentUrl !== lastKnownUrl) {
      lastKnownUrl = currentUrl;
      location.reload();
    }
  };

  const wrapHistoryMethod = function (methodName) {
    const originalMethod = history[methodName];
    history[methodName] = function () {
      const returnValue = originalMethod.apply(this, arguments);
      forceRefreshOnUrlChange();
      return returnValue;
    };
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');

  window.addEventListener('popstate', forceRefreshOnUrlChange);
  window.addEventListener('hashchange', forceRefreshOnUrlChange);

  window.addEventListener(
    'keydown',
    function (eventObject) {
      if (isTextEntryElement()) {
        return;
      }

      const isArrowKey =
        eventObject.key === 'ArrowLeft' ||
        eventObject.key === 'ArrowRight' ||
        eventObject.key === 'ArrowUp' ||
        eventObject.key === 'ArrowDown';

      if (!fullscreenActive) {
        if (isArrowKey) {
          eventObject.preventDefault();
          eventObject.stopPropagation();
        }
        return;
      }

      if (isArrowKey) {
        return;
      }

      if (eventObject.key === 'Enter') {
        eventObject.preventDefault();
        eventObject.stopPropagation();
        if (window?.STNAV_CORE?.state?.websocketLink) {
          window.STNAV_CORE.state.websocketLink.send('VideoPlayPause');
        }
      }
    },
    true
  );

  document.addEventListener('fullscreenchange', function () {
    fullscreenActive = !!document.fullscreenElement;
    setNavigationSystemState(fullscreenActive);
  });

  if (!window.__STNAV_RIGHT_CTRL_BOUND__) {
    window.__STNAV_RIGHT_CTRL_BOUND__ = true;

    let controlPanelElement = null;
    let panelVisible = false;
    let previousActiveElement = null;
    let currentPanelPage = 'main';

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

    const clearPanel = function () {
      while (controlPanelElement.firstChild) {
        controlPanelElement.removeChild(controlPanelElement.firstChild);
      }
    };

    const makeButton = function (labelText, iconName, clickHandler) {
      const buttonElement = document.createElement('button');
      buttonElement.className = 'stnav-control-button';

      const iconElement = document.createElement('img');
      iconElement.className = 'stnav-control-icon';
      iconElement.src =
        'http://localhost:8080/static/assets/virtual_panel_icons/' + iconName;

      const labelElement = document.createElement('span');
      labelElement.textContent = labelText;

      buttonElement.appendChild(iconElement);
      buttonElement.appendChild(labelElement);
      buttonElement.onclick = clickHandler;

      return buttonElement;
    };

    const renderMainPage = function () {
      clearPanel();
      currentPanelPage = 'main';

      if (isVideoPage()) {
        controlPanelElement.appendChild(
          makeButton('Fullscreen', 'fullscreen-32x32.png', function () {
            fullscreenActive
              ? exitFullscreenReliably()
              : enterFullscreenReliably();
          })
        );

        controlPanelElement.appendChild(
          makeButton('Mute / Unmute', 'audio-32x32.png', function () {
            toggleMuteReliably();
          })
        );

        controlPanelElement.appendChild(
          makeButton('Volume', 'audio-32x32.png', function () {
            renderVolumePage();
            focusFirstPanelButton();
          })
        );

        controlPanelElement.appendChild(
          makeButton('Quality', 'video_settings-32x32.png', function () {
            renderQualityPage();
            focusFirstPanelButton();
          })
        );

        controlPanelElement.appendChild(
          makeButton('Video Settings', 'video_settings-32x32.png', function () {
            renderVideoSettingsPage();
            focusFirstPanelButton();
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

    const renderVolumePage = function () {
      clearPanel();
      currentPanelPage = 'volume';

      [1.0, 0.75, 0.5, 0.25, 0.0].forEach(function (volumeValue) {
        controlPanelElement.appendChild(
          makeButton(
            Math.round(volumeValue * 100) + '%',
            'audio-32x32.png',
            function () {
              setVolumeReliably(volumeValue);
            }
          )
        );
      });

      controlPanelElement.appendChild(
        makeButton('Back', 'escape-32x32.png', function () {
          renderMainPage();
          focusFirstPanelButton();
        })
      );
    };

    const renderQualityPage = function () {
      clearPanel();
      currentPanelPage = 'quality';

      const forbiddenLabels = [
        'descriptions off',
        'captions off',
        'default'
      ];

      const qualityMenuItems = findQualityMenuItems();

      qualityMenuItems.forEach(function (menuItemElement) {
        const menuRoot = menuItemElement.closest('.vjs-menu-content');
        const menuTitleElement = menuRoot
          ? menuRoot.querySelector('.vjs-menu-title')
          : null;

        if (
          menuTitleElement &&
          menuTitleElement.textContent.trim().toLowerCase() === 'chapters'
        ) {
          return;
        }

        const labelElement = menuItemElement.querySelector(
          '.vjs-menu-item-text'
        );
        if (!labelElement) return;

        const labelText = labelElement.textContent.trim();
        const normalizedLabel = labelText.toLowerCase();

        if (forbiddenLabels.includes(normalizedLabel)) return;

        controlPanelElement.appendChild(
          makeButton(labelText, 'video_settings-32x32.png', function () {
            selectQualityReliably(menuItemElement);
          })
        );
      });

      controlPanelElement.appendChild(
        makeButton('Back', 'escape-32x32.png', function () {
          renderMainPage();
          focusFirstPanelButton();
        })
      );
    };

    const renderVideoSettingsPage = function () {
      clearPanel();
      currentPanelPage = 'video_settings';

      openVideoSettingsReliably();

      controlPanelElement.appendChild(
        makeButton('Speed', 'video_settings-32x32.png', function () {
          renderSpeedPage();
          focusFirstPanelButton();
        })
      );

      const settingsMenuItems = findVideoSettingsMenuItems();

      settingsMenuItems.forEach(function (menuItemElement) {
        const labelText = menuItemElement.textContent.trim().toLowerCase();

        if (labelText.includes('autoplay next')) {
          controlPanelElement.appendChild(
            makeButton('Autoplay next', 'video_settings-32x32.png', function () {
              activateMenuItemReliably(menuItemElement);
            })
          );
        }

        if (labelText === 'loop') {
          controlPanelElement.appendChild(
            makeButton('Loop', 'video_settings-32x32.png', function () {
              activateMenuItemReliably(menuItemElement);
            })
          );
        }
      });

      controlPanelElement.appendChild(
        makeButton('Back', 'escape-32x32.png', function () {
          renderMainPage();
          focusFirstPanelButton();
        })
      );
    };

    const renderSpeedPage = function () {
      clearPanel();
      currentPanelPage = 'speed';

      openVideoSettingsReliably();

      const speedRootItem = findSpeedRootMenuItem();
      if (speedRootItem) {
        speedRootItem.click();
      }

      const speedMenuItems = findSpeedSubMenuItems();

      speedMenuItems.forEach(function (menuItemElement) {
        const labelElement = menuItemElement.querySelector('.vjs-menu-item-text');
        if (!labelElement) return;

        const labelText = labelElement.textContent.trim();

        controlPanelElement.appendChild(
          makeButton(labelText, 'video_settings-32x32.png', function () {
            activateMenuItemReliably(menuItemElement);
          })
        );
      });

      controlPanelElement.appendChild(
        makeButton('Back', 'escape-32x32.png', function () {
          renderVideoSettingsPage();
          focusFirstPanelButton();
        })
      );
    };

    const createPanel = function () {
      ensureStylesheetLoaded();
      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';
      renderMainPage();
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
      previousActiveElement =
        window.STNAV_CORE && window.STNAV_CORE.state.activeElement;
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
        if (isTextEntryElement()) {
          return;
        }

        if (keyboardEvent.code === 'F8') {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();

          if (fullscreenActive) {
            exitFullscreenReliably();
            return;
          }

          if (
            panelVisible &&
            (currentPanelPage === 'volume' ||
              currentPanelPage === 'quality' ||
              currentPanelPage === 'video_settings' ||
              currentPanelPage === 'speed')
          ) {
            renderMainPage();
            focusFirstPanelButton();
            return;
          }

          panelVisible ? hidePanel() : showPanel();
        }
      },
      true
    );
  }
})();

