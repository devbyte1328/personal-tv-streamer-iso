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

    window.globalWeatherData = [];
    window.globalWeatherLoaded = false;

    function fetchWeatherAndStore() {
        fetch("/weather")
            .then(r => r.json())
            .then(j => {
                if (j && j.locations && j.locations.length > 0) {
                    window.globalWeatherData = j.locations;
                    window.globalWeatherLoaded = true;
                } else {
                    window.globalWeatherData = [];
                    window.globalWeatherLoaded = false;
                }
                attachWeatherToHomePage();
            });
    }

    fetchWeatherAndStore();
    setInterval(fetchWeatherAndStore, 60000);
}

function tryAttachTimeToHomePage() {
    const el = document.getElementById("current-time");
    if (el) el.textContent = window.globalTimeValue;
}

tryAttachTimeToHomePage();

function attachWeatherToHomePage() {
    const el = document.getElementById("weather-container");
    if (!el) return;
    el.innerHTML = "";
    if (!window.globalWeatherLoaded) return;
    window.globalWeatherData.forEach(loc => {
        const box = document.createElement("div");
        box.className = "weather-box";
        box.textContent = loc.name + " " + loc.temperature + "°C | Wind " + loc.windspeed + " km/h";
        el.appendChild(box);
    });
}

attachWeatherToHomePage();

