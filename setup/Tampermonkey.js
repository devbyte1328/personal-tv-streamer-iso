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

  const files = [
    "http://localhost:8080/static/navigation/core.js",
    "http://localhost:8080/static/navigation/focus.js",
    "http://localhost:8080/static/navigation/input.js",
    "http://localhost:8080/static/navigation/virtual_keyboard.js"
  ];

  function loadFile(i) {
    if (i >= files.length) return;
    GM_xmlhttpRequest({
      method: "GET",
      url: files[i],
      onload: res => {
        GM_addElement(document.head, "script", { textContent: res.responseText });
        loadFile(i + 1);
      }
    });
  }

  loadFile(0);
})();

