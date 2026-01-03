browser.webNavigation.onCommitted.addListener(d => {
  if (d.frameId === 0) {
    fetch("http://localhost:8080/url-control-start-spinner", { method: "GET", keepalive: true });
  }
});

browser.webNavigation.onCompleted.addListener(d => {
  if (d.frameId === 0) {
    fetch("http://localhost:8080/url-control-stop-spinner", { method: "GET", keepalive: true });
  }
});

