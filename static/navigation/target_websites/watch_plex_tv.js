(function () {
  'use strict';

  window.STNAV_TARGETS = window.STNAV_TARGETS || {};

  window.STNAV_TARGETS.selectors = [
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

  document.addEventListener('fullscreenchange', () => {
    remapActive = !!document.fullscreenElement;
  });

  window.addEventListener('keydown', remap, true);

  window.addEventListener(
    'keydown',
    function (eventObject) {
      if (!document.fullscreenElement) return;
      if (eventObject.altKey || eventObject.ctrlKey || eventObject.metaKey) return;

      const video = document.querySelector('video');
      if (!video) return;

      if (eventObject.key === 'ArrowLeft') {
        eventObject.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 600);
      }

      if (eventObject.key === 'ArrowRight') {
        eventObject.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 600);
      }
    },
    true
  );

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

    const dispatchKey = function (keyValue, codeValue) {
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: keyValue,
        code: codeValue,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(keyboardEvent);
    };

    const pressSubtitlesButtonWithPointerSimulation = function () {
      const subtitlesButtonElement = document.querySelector('button[aria-label="Subtitles"]');
      if (!subtitlesButtonElement) return;

      const boundingRectangle = subtitlesButtonElement.getBoundingClientRect();
      const pointerClientX = boundingRectangle.left + boundingRectangle.width / 2;
      const pointerClientY = boundingRectangle.top + boundingRectangle.height / 2;

      const firePointerEvent = function (eventType) {
        subtitlesButtonElement.dispatchEvent(
          new PointerEvent(eventType, {
            bubbles: true,
            cancelable: true,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX: pointerClientX,
            clientY: pointerClientY
          })
        );
      };

      firePointerEvent('pointerover');
      firePointerEvent('pointerenter');
      firePointerEvent('pointerdown');
      firePointerEvent('pointerup');
      firePointerEvent('click');
    };

    const collectSubtitleMenuItemElements = function () {
      const menuRootElement = document.querySelector('[role="menu"][data-radix-menu-content]');
      if (!menuRootElement) return [];
      return Array.from(menuRootElement.querySelectorAll('[role="menuitemcheckbox"]'));
    };

    const rebuildPanelContents = function () {
      controlPanelElement.innerHTML = '';

      const createPanelButtonElement = function (buttonLabelText, iconFileName, clickHandlerFunction) {
        const buttonElement = document.createElement('button');
        buttonElement.className = 'stnav-control-button';

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
        if (isWatchPage()) {
          controlPanelElement.appendChild(
            createPanelButtonElement('Fullscreen', 'fullscreen-32x32.png', function () {
              const fullscreenButton = document.querySelector('button[aria-label="Enter Fullscreen"]');
              if (fullscreenButton) fullscreenButton.click();
              hidePanel();
            })
          );

          controlPanelElement.appendChild(
            createPanelButtonElement('Mute / Unmute', 'audio-32x32.png', function () {
              const muteToggleButton = document.querySelector('button[aria-label="Mute"], button[aria-label="Unmute"]');
              if (muteToggleButton) muteToggleButton.click();
            })
          );

          controlPanelElement.appendChild(
            createPanelButtonElement('Subtitles', 'subtitles-32x32.png', function () {
              panelPageIdentifier = 'subtitles';
              rebuildPanelContents();
              forceHighlighterAbovePanel();
              setTimeout(focusFirstPanelButton, 0);
            })
          );
        }

        controlPanelElement.appendChild(
          createPanelButtonElement('Refresh Page', 'refresh-32x32.png', function () {
            dispatchKey('F5', 'F5');
            location.reload();
          })
        );

        controlPanelElement.appendChild(
          createPanelButtonElement('Escape', 'escape-32x32.png', function () {
            dispatchKey('Escape', 'Escape');
          })
        );

        controlPanelElement.appendChild(
          createPanelButtonElement('Close', 'close-32x32.png', function () {
            hidePanel();
          })
        );
      }

      if (panelPageIdentifier === 'subtitles') {
        pressSubtitlesButtonWithPointerSimulation();

        setTimeout(function () {
          const subtitleMenuItemElements = collectSubtitleMenuItemElements();

          if (subtitleMenuItemElements.length === 0) {
            controlPanelElement.appendChild(
              createPanelButtonElement('No Subtitles', null, function () {})
            );
          } else {
            subtitleMenuItemElements.forEach(function (menuItemElement) {
              const subtitleLabelText = menuItemElement.innerText.trim();
              controlPanelElement.appendChild(
                createPanelButtonElement(subtitleLabelText, null, function () {
                  menuItemElement.click();
                  panelPageIdentifier = 'main';
                  rebuildPanelContents();
                  forceHighlighterAbovePanel();
                  setTimeout(focusFirstPanelButton, 0);
                })
              );
            });
          }

          controlPanelElement.appendChild(
            createPanelButtonElement('Back', null, function () {
              panelPageIdentifier = 'main';
              rebuildPanelContents();
              forceHighlighterAbovePanel();
              setTimeout(focusFirstPanelButton, 0);
            })
          );

          forceHighlighterAbovePanel();
          setTimeout(focusFirstPanelButton, 0);
        }, 80);
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
      if (document.fullscreenElement) document.exitFullscreen();
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
        if (keyboardEvent.code === 'F8') {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          panelVisible ? hidePanel() : showPanel();
        }
      },
      true
    );
  }
})();

