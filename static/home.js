if (!window.globalTimeAlreadyRunning) {
    window.globalTimeAlreadyRunning = true;
    window.globalTimeValue = "";

    function updateTime() {
        const formattedTime = new Date().toLocaleString(window.globalLocale, {
            timeZone: window.globalTimezone,
            hour12: false
        });
        window.globalTimeValue = formattedTime;
        const timeElement = document.getElementById("current-time");
        if (timeElement) timeElement.textContent = formattedTime;
    }

    fetch("/database/location")
        .then(response => response.text())
        .then(fileText => {
            const localeMatch = fileText.match(/LocaleString:\s*"([^"]+)"/);
            const timezoneMatch = fileText.match(/Timezone:\s*"([^"]+)"/);
            window.globalLocale = localeMatch ? localeMatch[1] : undefined;
            window.globalTimezone = timezoneMatch ? timezoneMatch[1] : undefined;
            updateTime();
            setInterval(updateTime, 1000);
        });

    window.globalWeatherData = [];
    window.globalWeatherLoaded = false;

    function fetchWeatherAndStore() {
        fetch("/weather")
            .then(response => response.json())
            .then(weatherJson => {
                if (weatherJson && weatherJson.locations && weatherJson.locations.length > 0) {
                    window.globalWeatherData = weatherJson.locations;
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
    const timeElement = document.getElementById("current-time");
    if (timeElement) timeElement.textContent = window.globalTimeValue;
}

tryAttachTimeToHomePage();

function attachWeatherToHomePage() {
    const containerElement = document.getElementById("weather-container");
    if (!containerElement) return;
    containerElement.innerHTML = "";
    if (!window.globalWeatherLoaded) return;

    window.globalWeatherData.forEach(locationObject => {
        const weatherBox = document.createElement("div");
        weatherBox.className = "weather-box";
        weatherBox.textContent = locationObject.location_name + " " + locationObject.temperature + "°C | Wind " + locationObject.wind_speed + " km/h";
        containerElement.appendChild(weatherBox);
    });
}

attachWeatherToHomePage();

