if (!window.globalTimeAlreadyRunning) {
    window.globalTimeAlreadyRunning = true;

    window.globalTimeValue = "";
    window.globalDateValue = "";
    window.globalDayMonthValue = "";
    window.globalLocale = undefined;
    window.globalTimezone = undefined;

    window.globalWeatherData = [];
    window.globalWeatherLoaded = false;

    function updateDisplayedTimeAndDate() {
        if (!window.globalLocale || !window.globalTimezone) return;

        const now = new Date();

        const timeText = now.toLocaleTimeString(window.globalLocale, {
            timeZone: window.globalTimezone,
            hour12: false
        });

        const dateText = now.toLocaleDateString(window.globalLocale, {
            timeZone: window.globalTimezone
        });

        const weekdayText = now.toLocaleDateString(window.globalLocale, {
            timeZone: window.globalTimezone,
            weekday: "long"
        });

        const monthText = now.toLocaleDateString(window.globalLocale, {
            timeZone: window.globalTimezone,
            month: "long"
        });

        window.globalTimeValue = timeText;
        window.globalDateValue = dateText;
        window.globalDayMonthValue = weekdayText + " | " + monthText;

        const timeElement = document.getElementById("current-time");
        const dateElement = document.getElementById("current-date");
        const dayMonthElement = document.getElementById("current-day-month");

        if (timeElement) timeElement.textContent = timeText;
        if (dateElement) dateElement.textContent = dateText;
        if (dayMonthElement) dayMonthElement.textContent = window.globalDayMonthValue;
    }

    fetch("/database/location")
        .then(r => r.text())
        .then(text => {
            const localeMatch = text.match(/LocaleString:\s*"([^"]+)"/);
            const timezoneMatch = text.match(/Timezone:\s*"([^"]+)"/);
            window.globalLocale = localeMatch ? localeMatch[1] : undefined;
            window.globalTimezone = timezoneMatch ? timezoneMatch[1] : undefined;
            updateDisplayedTimeAndDate();
            setInterval(updateDisplayedTimeAndDate, 1000);
        });

    function storeWeatherData(value) {
        window.globalWeatherData = value;
        window.globalWeatherLoaded = true;
    }

    function requestWeather() {
        fetch("/weather")
            .then(r => r.json())
            .then(weather => {
                if (weather && weather.locations) {
                    storeWeatherData(weather.locations);
                }
                attachWeather();
            });
    }

    requestWeather();
}

function attachTime() {
    const t = document.getElementById("current-time");
    const d = document.getElementById("current-date");
    const m = document.getElementById("current-day-month");

    if (t) t.textContent = window.globalTimeValue;
    if (d) d.textContent = window.globalDateValue;
    if (m) m.textContent = window.globalDayMonthValue;
}

function determineWeatherIcon(temp) {
    if (temp <= 0) return "❄️";
    if (temp <= 10) return "🌥️";
    if (temp <= 20) return "⛅";
    if (temp <= 30) return "☀️";
    return "🔥";
}

function attachWeather() {
    const container = document.getElementById("weather-container");
    if (!container) return;

    container.innerHTML = "";

    if (!window.globalWeatherLoaded) {
        container.textContent = "Loading...";
        return;
    }

    window.globalWeatherData.forEach(item => {
        const box = document.createElement("div");
        box.className = "weather-box";

        const icon = determineWeatherIcon(item.temperature);

        const location = document.createElement("div");
        location.className = "weather-location";
        location.textContent = item.location_name;

        const details = document.createElement("div");
        details.className = "weather-details";
        details.textContent =
            icon +
            " " +
            item.temperature +
            "°C | Wind " +
            item.wind_speed +
            " km/h";

        box.appendChild(location);
        box.appendChild(details);
        container.appendChild(box);
    });
}

attachTime();
attachWeather();

window.addEventListener("home-page-loaded", () => {
    attachTime();
    attachWeather();
});

