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

  let lastAppliedTargetFilename = null;
  let lastKnownLocationSignature = location.hostname + location.pathname + location.search;

  const fetchJsonFromUrl = function (requestedUrl) {
    return new Promise(function (resolveJson) {
      GM_xmlhttpRequest({
        method: "GET",
        url: requestedUrl,
        onload: function (responseObject) {
          const parsedJson = JSON.parse(responseObject.responseText);
          resolveJson(parsedJson);
        }
      });
    });
  };

  const injectScriptFromUrl = function (requestedUrl, callbackFunction) {
    GM_xmlhttpRequest({
      method: "GET",
      url: requestedUrl,
      onload: function (responseObject) {
        GM_addElement(document.head, "script", {
          textContent: responseObject.responseText
        });
        callbackFunction();
      }
    });
  };

  const chooseMatchingDomainFile = function (listOfFilenames) {
    const combinedText = (location.hostname + location.pathname + location.search).toLowerCase();
    let bestMatch = null;
    let bestMatchLength = -1;

    for (const currentFilename of listOfFilenames) {
      const transformedFilename =
        currentFilename
          .replace(/_/g, ".")
          .replace(/=/g, "/")
          .replace(".js", "");

      if (combinedText.includes(transformedFilename)) {
        if (transformedFilename.length > bestMatchLength) {
          bestMatch = currentFilename;
          bestMatchLength = transformedFilename.length;
        }
      }
    }

    if (bestMatch === null) {
      return "default.js";
    }

    return bestMatch;
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

      const loadNextScript = function (indexValue) {
        if (indexValue < scriptQueue.length) {
          injectScriptFromUrl(scriptQueue[indexValue], function () {
            loadNextScript(indexValue + 1);
          });
        }
      };

      loadNextScript(0);
    };
  })();

  const applyTargetScriptIfNeeded = async function () {
    const currentSignature = location.hostname + location.pathname + location.search;
    if (currentSignature === lastKnownLocationSignature) return;

    lastKnownLocationSignature = currentSignature;

    const filenameList = await fetchJsonFromUrl(
      "http://localhost:8080/static/navigation/target_websites/"
    );

    const selectedFilename = chooseMatchingDomainFile(filenameList);

    if (selectedFilename === lastAppliedTargetFilename) return;

    lastAppliedTargetFilename = selectedFilename;

    injectScriptFromUrl(
      "http://localhost:8080/static/navigation/target_websites/" + selectedFilename,
      function () {
        loadCoreScriptsOnce();
      }
    );
  };

  const beginExecution = async function () {
    await applyTargetScriptIfNeeded();

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(this, arguments);
      applyTargetScriptIfNeeded();
    };

    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      applyTargetScriptIfNeeded();
    };

    window.addEventListener("popstate", applyTargetScriptIfNeeded);
    setInterval(applyTargetScriptIfNeeded, 300);
  };

  beginExecution();
})();

