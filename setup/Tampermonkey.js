// ==UserScript==
// @name         Streamer TV Airmouse Navigation
// @match        *://*/*
// @match        file://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @connect      localhost
// ==/UserScript==

(function () {
  'use strict';

  function determineActiveTargetScript() {
    var currentLocationHostname = window.location.hostname.toLowerCase();
    var currentLocationHref = window.location.href.toLowerCase();
    var mappingList = [
      {
        domainText: "watch.plex.tv",
        scriptPath: "http://localhost:8080/static/navigation/target_websites/plex.js"
      },
      {
        domainText: "tiktok.com",
        scriptPath: "http://localhost:8080/static/navigation/target_websites/tiktok.js"
      },
      {
        domainText: "music.youtube.com",
        scriptPath: "http://localhost:8080/static/navigation/target_websites/youtube-music.js"
      },
      {
        domainText: "youtube.com/shorts",
        scriptPath: "http://localhost:8080/static/navigation/target_websites/youtube-shorts.js"
      },
      {
        domainText: "youtube.com",
        scriptPath: "http://localhost:8080/static/navigation/target_websites/youtube.js"
      },
      {
        domainText: "localhost",
        scriptPath: "http://localhost:8080/static/navigation/target_websites/localhost.js"
      },
      {
        domainText: "127.0.0.1",
        scriptPath: "http://localhost:8080/static/navigation/target_websites/localhost.js"
      }
    ];
    var selectedPath = "http://localhost:8080/static/navigation/target_websites/default.js";
    var mappingIndex = 0;
    while (mappingIndex < mappingList.length) {
      var entry = mappingList[mappingIndex];
      if (
        currentLocationHostname.indexOf(entry.domainText) !== -1 ||
        currentLocationHref.indexOf(entry.domainText) !== -1
      ) {
        selectedPath = entry.scriptPath;
        break;
      }
      mappingIndex = mappingIndex + 1;
    }
    return selectedPath;
  }

  function retrieveFileContentAndInjectIntoDocument(fileAddress, completionProcedure) {
    GM_xmlhttpRequest({
      method: "GET",
      url: fileAddress,
      onload: function (responseObject) {
        GM_addElement(document.head, "script", { textContent: responseObject.responseText });
        completionProcedure();
      }
    });
  }

  function sequentiallyInjectCoreScripts() {
    var scriptAddresses = [
      "http://localhost:8080/static/navigation/core.js",
      "http://localhost:8080/static/navigation/focus.js",
      "http://localhost:8080/static/navigation/input.js",
      "http://localhost:8080/static/navigation/virtual_keyboard.js"
    ];

    function beginSequentialInjection(currentIndex) {
      if (currentIndex >= scriptAddresses.length) {
        return;
      }
      retrieveFileContentAndInjectIntoDocument(
        scriptAddresses[currentIndex],
        function () {
          beginSequentialInjection(currentIndex + 1);
        }
      );
    }
    beginSequentialInjection(0);
  }

  function beginLoadingProcedures() {
    var chosenTargetScriptAddress = determineActiveTargetScript();
    retrieveFileContentAndInjectIntoDocument(
      chosenTargetScriptAddress,
      function () {
        sequentiallyInjectCoreScripts();
      }
    );
  }

  beginLoadingProcedures();
})();
