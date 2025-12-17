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

  const resolveBestFullscreenElement = function () {
    const candidates = [
      document.querySelector('video'),
      document.querySelector('[role="video"]'),
      document.querySelector('.video-player'),
      document.querySelector('#player'),
      document.documentElement
    ];
    for (const element of candidates) {
      if (element && element.requestFullscreen) return element;
    }
    return document.documentElement;
  };

  const enterFullscreenReliably = function () {
    const targetElement = resolveBestFullscreenElement();
    if (!document.fullscreenElement && targetElement?.requestFullscreen) {
      targetElement.requestFullscreen().catch(function () {});
    }
  };

  const exitFullscreenReliably = function () {
    if (window?.STNAV_CORE?.state?.websocketLink) {
      window.STNAV_CORE.state.websocketLink.send('ExitFullscreen');
    }
  };

  document.addEventListener('fullscreenchange', function () {
    fullscreenActive = !!document.fullscreenElement;
  });

  window.addEventListener(
    'keydown',
    function (eventObject) {
      if (!fullscreenActive) {
        if (
          eventObject.key === 'ArrowLeft' ||
          eventObject.key === 'ArrowRight' ||
          eventObject.key === 'ArrowUp' ||
          eventObject.key === 'ArrowDown'
        ) {
          eventObject.preventDefault();
          eventObject.stopPropagation();
        }
        return;
      }

      if (
        eventObject.key === 'ArrowLeft' ||
        eventObject.key === 'ArrowRight' ||
        eventObject.key === 'ArrowUp' ||
        eventObject.key === 'ArrowDown'
      ) {
        return;
      }

      if (eventObject.key === 'Enter') {
        eventObject.preventDefault();
        eventObject.stopPropagation();
        const videoElement = document.querySelector('video');
        if (videoElement) {
          videoElement.paused ? videoElement.play() : videoElement.pause();
        }
        return;
      }

      eventObject.preventDefault();
      eventObject.stopPropagation();
    },
    true
  );

  if (!window.__STNAV_RIGHT_CTRL_BOUND__) {
    window.__STNAV_RIGHT_CTRL_BOUND__ = true;

    let controlPanelElement = null;
    let panelVisible = false;
    let previousActiveElement = null;
    let currentPage = 'main';

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

    const toggleMuteState = function () {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.muted = !videoElement.muted;
      }
    };

    const setVolumeLevel = function (volumeValue) {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.volume = volumeValue;
        videoElement.muted = volumeValue === 0;
      }
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
      iconElement.src = 'http://localhost:8080/static/assets/virtual_panel_icons/' + iconName;

      const labelElement = document.createElement('span');
      labelElement.textContent = labelText;

      buttonElement.appendChild(iconElement);
      buttonElement.appendChild(labelElement);
      buttonElement.onclick = clickHandler;

      return buttonElement;
    };

    const renderMainPage = function () {
      clearPanel();
      currentPage = 'main';

      controlPanelElement.appendChild(
        makeButton('Fullscreen', 'fullscreen-32x32.png', function () {
          fullscreenActive ? exitFullscreenReliably() : enterFullscreenReliably();
        })
      );

      controlPanelElement.appendChild(
        makeButton('Mute / Unmute', 'audio-32x32.png', function () {
          toggleMuteState();
        })
      );

      controlPanelElement.appendChild(
        makeButton('Volume', 'audio-32x32.png', function () {
          renderVolumePage();
          focusFirstPanelButton();
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
    };

    const renderVolumePage = function () {
      clearPanel();
      currentPage = 'volume';

      controlPanelElement.appendChild(
        makeButton('100%', 'audio-32x32.png', function () {
          setVolumeLevel(1.0);
        })
      );

      controlPanelElement.appendChild(
        makeButton('75%', 'audio-32x32.png', function () {
          setVolumeLevel(0.75);
        })
      );

      controlPanelElement.appendChild(
        makeButton('50%', 'audio-32x32.png', function () {
          setVolumeLevel(0.5);
        })
      );

      controlPanelElement.appendChild(
        makeButton('25%', 'audio-32x32.png', function () {
          setVolumeLevel(0.25);
        })
      );

      controlPanelElement.appendChild(
        makeButton('0%', 'audio-32x32.png', function () {
          setVolumeLevel(0.0);
        })
      );

      controlPanelElement.appendChild(
        makeButton('Back', 'escape-32x32.png', function () {
          renderMainPage();
          focusFirstPanelButton();
        })
      );
    };

    const createPanel = function () {
      ensureStylesheetLoaded();

      controlPanelElement = document.createElement('div');
      controlPanelElement.className = 'stnav-control-panel';
      controlPanelElement.style.position = 'fixed';
      controlPanelElement.style.zIndex = '2147483639';

      renderMainPage();

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
      currentPage = 'main';
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
          if (fullscreenActive) exitFullscreenReliably();
          panelVisible ? hidePanel() : showPanel();
        }
      },
      true
    );
  }
})();

