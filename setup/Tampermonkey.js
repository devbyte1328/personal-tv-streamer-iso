// ==UserScript==
// @name         Streamer TV Airmouse Navigation
// @match        *://*/*
// @match        file://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @connect      localhost
// ==/UserScript==

(() => {
  "use strict";

  const fetchJson = url =>
    new Promise(resolve =>
      GM_xmlhttpRequest({
        method: "GET",
        url,
        onload: r => resolve(JSON.parse(r.responseText))
      })
    );

  const injectScript = (url, next) =>
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: r => {
        GM_addElement(document.head, "script", { textContent: r.responseText });
        next();
      }
    });

  const domainMatch = filenames => {
    const text = (location.hostname + location.href).toLowerCase();
    const match = filenames.find(f =>
      text.includes(
        f.replace(/_/g, ".")
         .replace(/=/g, "/")
         .replace(".js", "")
      )
    );
    return match || "default.js";
  };

  const loadCore = () => {
    const queue = [
      "http://localhost:8080/static/navigation/core.js",
      "http://localhost:8080/static/navigation/focus.js",
      "http://localhost:8080/static/navigation/input.js",
      "http://localhost:8080/static/navigation/virtual_keyboard.js"
    ];
    const run = index =>
      index < queue.length &&
      injectScript(queue[index], () => run(index + 1));
    run(0);
  };

  const start = async () => {
    const files = await fetchJson("http://localhost:8080/static/navigation/target_websites/");
    const chosen = domainMatch(files);
    injectScript(
      `http://localhost:8080/static/navigation/target_websites/${chosen}`,
      () => loadCore()
    );
  };

  start();
})();

