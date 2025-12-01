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
        if (!window.globalLocale || !window.globalTimezone) {
            return;
        }

        var currentMomentInTime = new Date();

        var writtenTime = currentMomentInTime.toLocaleTimeString(
            window.globalLocale,
            { timeZone: window.globalTimezone, hour12: false }
        );

        var writtenDate = currentMomentInTime.toLocaleDateString(
            window.globalLocale,
            { timeZone: window.globalTimezone }
        );

        var writtenWeekday = currentMomentInTime.toLocaleDateString(
            window.globalLocale,
            { timeZone: window.globalTimezone, weekday: "long" }
        );

        var writtenMonth = currentMomentInTime.toLocaleDateString(
            window.globalLocale,
            { timeZone: window.globalTimezone, month: "long" }
        );

        window.globalTimeValue = writtenTime;
        window.globalDateValue = writtenDate;
        window.globalDayMonthValue = writtenWeekday + " | " + writtenMonth;

        var timeElementOnPage = document.getElementById("current-time");
        var dateElementOnPage = document.getElementById("current-date");
        var dayAndMonthElementOnPage = document.getElementById("current-day-month");

        if (timeElementOnPage !== null) {
            timeElementOnPage.textContent = writtenTime;
        }
        if (dateElementOnPage !== null) {
            dateElementOnPage.textContent = writtenDate;
        }
        if (dayAndMonthElementOnPage !== null) {
            dayAndMonthElementOnPage.textContent = window.globalDayMonthValue;
        }
    }

    fetch("/database/location")
        .then(function(receivedResponse) {
            return receivedResponse.text();
        })
        .then(function(receivedText) {
            var foundLocale = receivedText.match(/LocaleString:\s*"([^"]+)"/);
            var foundTimezone = receivedText.match(/Timezone:\s*"([^"]+)"/);

            if (foundLocale) {
                window.globalLocale = foundLocale[1];
            } else {
                window.globalLocale = undefined;
            }

            if (foundTimezone) {
                window.globalTimezone = foundTimezone[1];
            } else {
                window.globalTimezone = undefined;
            }

            updateDisplayedTimeAndDate();
            setInterval(updateDisplayedTimeAndDate, 1000);
        });

    function storeWeatherDataInMemory(weatherList) {
        window.globalWeatherData = weatherList;
        window.globalWeatherLoaded = true;
    }

    function requestWeatherInformation() {
        fetch("/weather")
            .then(function(receivedResponse) {
                return receivedResponse.json();
            })
            .then(function(receivedWeatherData) {
                if (receivedWeatherData && receivedWeatherData.locations) {
                    storeWeatherDataInMemory(receivedWeatherData.locations);
                }
                attachWeather();
            });
    }

    requestWeatherInformation();
}

function attachTime() {
    var timeElementOnPage = document.getElementById("current-time");
    var dateElementOnPage = document.getElementById("current-date");
    var dayAndMonthElementOnPage = document.getElementById("current-day-month");

    if (timeElementOnPage !== null) {
        timeElementOnPage.textContent = window.globalTimeValue;
    }
    if (dateElementOnPage !== null) {
        dateElementOnPage.textContent = window.globalDateValue;
    }
    if (dayAndMonthElementOnPage !== null) {
        dayAndMonthElementOnPage.textContent = window.globalDayMonthValue;
    }
}

function determineWeatherIcon(temperatureValue) {
    if (temperatureValue <= 0) {
        return "❄️";
    }
    if (temperatureValue <= 10) {
        return "🌥️";
    }
    if (temperatureValue <= 20) {
        return "⛅";
    }
    if (temperatureValue <= 30) {
        return "☀️";
    }
    return "🔥";
}

function attachWeather() {
    var weatherContainerOnPage = document.getElementById("weather-container");
    if (weatherContainerOnPage === null) {
        return;
    }

    weatherContainerOnPage.innerHTML = "";

    if (window.globalWeatherLoaded === false) {
        weatherContainerOnPage.textContent = "Loading...";
        return;
    }

    var currentIndex = 0;
    while (currentIndex < window.globalWeatherData.length) {
        var currentWeatherItem = window.globalWeatherData[currentIndex];

        var weatherBoxElement = document.createElement("div");
        weatherBoxElement.className = "weather-box";

        var chosenWeatherSymbol = determineWeatherIcon(currentWeatherItem.temperature);

        var locationElement = document.createElement("div");
        locationElement.className = "weather-location";
        locationElement.textContent = currentWeatherItem.location_name;

        var detailElement = document.createElement("div");
        detailElement.className = "weather-details";
        detailElement.textContent =
            chosenWeatherSymbol +
            " " +
            currentWeatherItem.temperature +
            "°C | Wind " +
            currentWeatherItem.wind_speed +
            " km/h";

        weatherBoxElement.appendChild(locationElement);
        weatherBoxElement.appendChild(detailElement);
        weatherContainerOnPage.appendChild(weatherBoxElement);

        currentIndex = currentIndex + 1;
    }
}

attachTime();
attachWeather();

window.addEventListener("home-page-loaded", function() {
    attachTime();
    attachWeather();
});

