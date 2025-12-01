if (!window.globalTimeAlreadyRunning) {
    window.globalTimeAlreadyRunning = true;

    window.globalTimeValue = "";
    window.globalLocale = undefined;
    window.globalTimezone = undefined;

    window.globalWeatherData = [];
    window.globalWeatherLoaded = false;

    function updateDisplayedTime() {
        if (!window.globalLocale || !window.globalTimezone) return;
        const timeText = new Date().toLocaleString(window.globalLocale, {
            timeZone: window.globalTimezone,
            hour12: false
        });
        window.globalTimeValue = timeText;
        const timeElement = document.getElementById("current-time");
        if (timeElement) timeElement.textContent = timeText;
    }

    fetch("/database/location")
        .then(r => r.text())
        .then(responseText => {
            const localeMatch = responseText.match(/LocaleString:\s*"([^"]+)"/);
            const timezoneMatch = responseText.match(/Timezone:\s*"([^"]+)"/);
            window.globalLocale = localeMatch ? localeMatch[1] : undefined;
            window.globalTimezone = timezoneMatch ? timezoneMatch[1] : undefined;
            updateDisplayedTime();
            setInterval(updateDisplayedTime, 1000);
        });

    function storeWeatherData(value) {
        window.globalWeatherData = value;
        window.globalWeatherLoaded = true;
    }

    function requestWeather() {
        if (window.globalWeatherLoaded) return;
        fetch("/weather")
            .then(r => r.json())
            .then(weather => {
                if (weather && weather.locations && weather.locations.length) {
                    storeWeatherData(weather.locations);
                }
                attachWeather();
            });
    }

    requestWeather();
}

function attachTime() {
    const element = document.getElementById("current-time");
    if (element) element.textContent = window.globalTimeValue;
}

function attachWeather() {
    const container = document.getElementById("weather-container");
    if (!container) return;

    container.innerHTML = "";
    if (!window.globalWeatherLoaded) return;

    window.globalWeatherData.forEach(item => {
        const entry = document.createElement("div");
        entry.className = "weather-box";
        entry.textContent =
            item.location_name +
            " " +
            item.temperature +
            "°C | Wind " +
            item.wind_speed +
            " km/h";
        container.appendChild(entry);
    });
}

attachTime();
attachWeather();

window.addEventListener("home-page-loaded", () => {
    attachTime();
    attachWeather();
});

