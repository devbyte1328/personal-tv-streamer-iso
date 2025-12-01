if (!window.globalTimeAlreadyRunning) {
    window.globalTimeAlreadyRunning = true;
    window.globalTimeValue = "";

    function updateTime() {
        const time = new Date().toLocaleString(window.globalLocale, {
            timeZone: window.globalTimezone,
            hour12: false
        });
        window.globalTimeValue = time;
        const el = document.getElementById("current-time");
        if (el) el.textContent = time;
    }

    fetch("/database/location")
        .then(r => r.text())
        .then(t => {
            const locale = t.match(/LocaleString:\s*"([^"]+)"/);
            const zone = t.match(/Timezone:\s*"([^"]+)"/);

            window.globalLocale = locale ? locale[1] : undefined;
            window.globalTimezone = zone ? zone[1] : undefined;

            updateTime();
            setInterval(updateTime, 1000);
        });
}

function tryAttachTimeToHomePage() {
    const el = document.getElementById("current-time");
    if (el) el.textContent = window.globalTimeValue;
}

tryAttachTimeToHomePage();

