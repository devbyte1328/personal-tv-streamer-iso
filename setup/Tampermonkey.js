// ==UserScript==
// @name         Streamer TV Airmouse Navigation
// @match        *://*/*
// @match        file://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @connect      localhost
// ==/UserScript==

(function () {
  "use strict";

  let injectedTargetScriptElement = null;
  let lastAppliedFilename = null;
  let lastObservedLocationSignature = "";

  const fetchJsonFromUrl = function (requestedUrl) {
    return new Promise(function (resolveJson) {
      GM_xmlhttpRequest({
        method: "GET",
        url: requestedUrl,
        onload: function (responseObject) {
          resolveJson(JSON.parse(responseObject.responseText));
        }
      });
    });
  };

  const injectScriptFromText = function (scriptText) {
    const scriptElement = document.createElement("script");
    scriptElement.textContent = scriptText;
    document.head.appendChild(scriptElement);
    return scriptElement;
  };

  const injectScriptFromUrl = function (requestedUrl) {
    return new Promise(function (resolveElement) {
      GM_xmlhttpRequest({
        method: "GET",
        url: requestedUrl,
        onload: function (responseObject) {
          resolveElement(injectScriptFromText(responseObject.responseText));
        }
      });
    });
  };

  const normalizeFilenamePattern = function (filename) {
    return filename
      .replace(/_/g, ".")
      .replace(/=/g, "/")
      .replace(".js", "")
      .toLowerCase();
  };

  const resolveBestMatchingFilename = function (filenameList) {
    const comparisonString =
      (location.host + location.pathname + location.search).toLowerCase();

    let bestMatch = null;
    let bestMatchLength = -1;

    for (const filename of filenameList) {
      const pattern = normalizeFilenamePattern(filename);
      if (comparisonString.includes(pattern) && pattern.length > bestMatchLength) {
        bestMatch = filename;
        bestMatchLength = pattern.length;
      }
    }

    return bestMatch || "default.js";
  };

  const loadCoreScriptsOnce = (function () {
    let alreadyLoaded = false;
    return function () {
      if (alreadyLoaded) return;
      alreadyLoaded = true;

      const scriptQueue = [
        "http://localhost:8080/static/navigation/core.js",
        "http://localhost:8080/static/navigation/focus.js",
        "http://localhost:8080/static/navigation/input.js",
        "http://localhost:8080/static/navigation/virtual_keyboard.js"
      ];

      const loadNextScript = function (index) {
        if (index >= scriptQueue.length) return;
        injectScriptFromUrl(scriptQueue[index]).then(function () {
          loadNextScript(index + 1);
        });
      };

      loadNextScript(0);
    };
  })();

  const applyCorrectTargetScript = async function () {
    const locationSignature =
      location.host + location.pathname + location.search;

    if (locationSignature === lastObservedLocationSignature) return;
    lastObservedLocationSignature = locationSignature;

    const filenameList = await fetchJsonFromUrl(
      "http://localhost:8080/static/navigation/target_websites/"
    );

    const resolvedFilename = resolveBestMatchingFilename(filenameList);

    if (resolvedFilename === lastAppliedFilename) return;
    lastAppliedFilename = resolvedFilename;

    if (injectedTargetScriptElement) {
      injectedTargetScriptElement.remove();
      injectedTargetScriptElement = null;
    }

    injectedTargetScriptElement = await injectScriptFromUrl(
      "http://localhost:8080/static/navigation/target_websites/" + resolvedFilename
    );

    loadCoreScriptsOnce();
  };

  const patchHistoryApi = function () {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(this, arguments);
      applyCorrectTargetScript();
    };

    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      applyCorrectTargetScript();
    };

    window.addEventListener("popstate", applyCorrectTargetScript);
  };

  patchHistoryApi();
  setInterval(applyCorrectTargetScript, 300);
  applyCorrectTargetScript();
})();

