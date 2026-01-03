browser.webNavigation.onCommitted.addListener(d => {
  if (d.frameId === 0) console.log("New URL:");
});

browser.webNavigation.onCompleted.addListener(d => {
  if (d.frameId === 0) console.log("Website finished loading");
});

