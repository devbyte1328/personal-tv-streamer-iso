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
    const combinedText = (location.hostname + location.href).toLowerCase();
    let matchedFilename = null;

    for (const currentFilename of listOfFilenames) {
      const transformedFilename =
        currentFilename
          .replace(/_/g, ".")
          .replace(/=/g, "/")
          .replace(".js", "");

      if (combinedText.includes(transformedFilename)) {
        matchedFilename = currentFilename;
        break;
      }
    }

    if (matchedFilename === null) {
      return "default.js";
    }

    return matchedFilename;
  };

  const loadCoreScripts = function () {
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

  const beginExecution = async function () {
    const filenameList = await fetchJsonFromUrl(
      "http://localhost:8080/static/navigation/target_websites/"
    );

    const selectedFilename = chooseMatchingDomainFile(filenameList);

    injectScriptFromUrl(
      "http://localhost:8080/static/navigation/target_websites/" + selectedFilename,
      function () {
        loadCoreScripts();
      }
    );
  };

  beginExecution();
})();

