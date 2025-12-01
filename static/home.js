if (!window.globalTimeAlreadyRunning) {
    window.globalTimeAlreadyRunning = true;

    window.globalTimeValue = "";
    window.globalLocale = undefined;
    window.globalTimezone = undefined;

    window.globalWeatherData = [];
    window.globalWeatherLoaded = false;

    function updateTimeText() {
        if (!window.globalLocale || !window.globalTimezone) return;
        const t = new Date().toLocaleString(window.globalLocale, {
            timeZone: window.globalTimezone,
            hour12: false
        });
        window.globalTimeValue = t;
        const x = document.getElementById("current-time");
        if (x) x.textContent = t;
    }

    fetch("/database/location")
        .then(r => r.text())
        .then(t => {
            const locale = t.match(/LocaleString:\s*"([^"]+)"/);
            const zone = t.match(/Timezone:\s*"([^"]+)"/);
            window.globalLocale = locale ? locale[1] : undefined;
            window.globalTimezone = zone ? zone[1] : undefined;
            updateTimeText();
            setInterval(updateTimeText, 1000);
        });

    function cacheWeather(v) {
        window.globalWeatherData = v;
        window.globalWeatherLoaded = true;
    }

    function fetchWeather() {
        if (window.globalWeatherLoaded) return;
        fetch("/weather")
            .then(r => r.json())
            .then(j => {
                if (j && j.locations && j.locations.length) {
                    cacheWeather(j.locations);
                }
                attachWeather();
            });
    }

    fetchWeather();
}

function attachTime() {
    const x = document.getElementById("current-time");
    if (x) x.textContent = window.globalTimeValue;
}

function attachWeather() {
    const box = document.getElementById("weather-container");
    if (!box) return;

    box.innerHTML = "";
    if (!window.globalWeatherLoaded) return;

    window.globalWeatherData.forEach(w => {
        const e = document.createElement("div");
        e.className = "weather-box";
        e.textContent = w.location_name + " " + w.temperature + "°C | Wind " + w.wind_speed + " km/h";
        box.appendChild(e);
    });
}

attachTime();
attachWeather();

window.addEventListener("home-page-loaded", () => {
    attachTime();
    attachWeather();
});

