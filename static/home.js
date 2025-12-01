if (!window.globalTimeAlreadyRunning) {
    window.globalTimeAlreadyRunning = true;

    window.globalTimeValue = "";
    window.globalDateValue = "";
    window.globalDayMonthValue = "";
    window.globalLocale = undefined;
    window.globalTimezone = undefined;

    window.globalWeatherData = [];
    window.globalWeatherLoaded = false;

    window.globalHomeVideoInformationHasLoaded = false;
    window.globalHomeVideoAvailableList = [];
    window.globalHomeVideoChosenIdentifier = "";
    window.globalHomeVideoChosenTitle = "";

    function updateDisplayedTimeAndDate() {
        if (window.globalLocale === undefined || window.globalTimezone === undefined) {
            return;
        }

        var currentPointInTime = new Date();

        var displayedTime = currentPointInTime.toLocaleTimeString(
            window.globalLocale,
            { timeZone: window.globalTimezone, hour12: false }
        );

        var displayedDate = currentPointInTime.toLocaleDateString(
            window.globalLocale,
            { timeZone: window.globalTimezone }
        );

        var displayedWeekday = currentPointInTime.toLocaleDateString(
            window.globalLocale,
            { timeZone: window.globalTimezone, weekday: "long" }
        );

        var displayedMonth = currentPointInTime.toLocaleDateString(
            window.globalLocale,
            { timeZone: window.globalTimezone, month: "long" }
        );

        window.globalTimeValue = displayedTime;
        window.globalDateValue = displayedDate;
        window.globalDayMonthValue = displayedWeekday + " | " + displayedMonth;

        var timeElementOnPage = document.getElementById("current-time");
        var dateElementOnPage = document.getElementById("current-date");
        var dayAndMonthElementOnPage = document.getElementById("current-day-month");

        if (timeElementOnPage !== null) {
            timeElementOnPage.textContent = displayedTime;
        }
        if (dateElementOnPage !== null) {
            dateElementOnPage.textContent = displayedDate;
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

    function buildFullHomeVideoSource(sourceIdentifier) {
        var combinedAddress = "";
        combinedAddress += "https://www.youtube.com/embed/";
        combinedAddress += sourceIdentifier;
        combinedAddress += "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0";
        combinedAddress += "&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=";
        combinedAddress += sourceIdentifier;
        return combinedAddress;
    }

    function startHomeVideoListRetrievalProcess() {
        var retrievalShouldContinue = true;

        function attemptToRetrieveList() {
            if (retrievalShouldContinue === false) {
                return;
            }

            fetch("http://localhost:8080/database/pulled/curated-youtube-trailer-videos")
                .then(function(receivedResponse) {
                    if (!receivedResponse.ok) {
                        throw new Error("Unacceptable response");
                    }
                    return receivedResponse.text();
                })
                .then(function(receivedText) {
                    var trimmedTextBlock = receivedText.trim();
                    var separatedTextLines = trimmedTextBlock.split("\n");
                    var cleanedList = [];
                    var walkingIndex = 0;

                    while (walkingIndex < separatedTextLines.length) {
                        var currentLine = separatedTextLines[walkingIndex];
                        var trimmedCurrentLine = currentLine.trim();
                        if (trimmedCurrentLine !== "") {
                            cleanedList.push(trimmedCurrentLine);
                        }
                        walkingIndex = walkingIndex + 1;
                    }

                    if (cleanedList.length === 0) {
                        throw new Error("Empty collection");
                    }

                    var parsedList = [];
                    var readingIndex = 0;

                    while (readingIndex < cleanedList.length) {
                        var currentRawLine = cleanedList[readingIndex];
                        var locationOfFirstSpace = currentRawLine.indexOf(" ");
                        var extractedIdentifier = currentRawLine.slice(0, locationOfFirstSpace).trim();
                        var extractedTitle = currentRawLine.slice(locationOfFirstSpace + 1).trim();

                        parsedList.push({
                            videoIdentifier: extractedIdentifier,
                            videoTitle: extractedTitle
                        });

                        readingIndex = readingIndex + 1;
                    }

                    window.globalHomeVideoAvailableList = parsedList;
                    retrievalShouldContinue = false;
                    chooseHomeVideoForDisplay();
                    updateHomeVideoOnPage();
                })
                .catch(function() {
                    setTimeout(function() {
                        attemptToRetrieveList();
                    }, 1000);
                });
        }

        attemptToRetrieveList();
    }

    function chooseHomeVideoForDisplay() {
        if (window.globalHomeVideoAvailableList.length === 0) {
            return;
        }

        var totalCount = window.globalHomeVideoAvailableList.length;
        var randomIndex = Math.floor(Math.random() * totalCount);
        var selectedVideo = window.globalHomeVideoAvailableList[randomIndex];

        window.globalHomeVideoChosenIdentifier = selectedVideo.videoIdentifier;
        window.globalHomeVideoChosenTitle = selectedVideo.videoTitle;
        window.globalHomeVideoInformationHasLoaded = true;
    }

    function updateHomeVideoOnPage() {
        var videoFrameElement = document.getElementById("standalone-home-video-frame");
        var videoTitleElement = document.getElementById("standalone-home-video-title");

        if (videoFrameElement === null || videoTitleElement === null) {
            return;
        }

        if (window.globalHomeVideoInformationHasLoaded === false) {
            return;
        }

        var constructedAddress = buildFullHomeVideoSource(window.globalHomeVideoChosenIdentifier);
        videoFrameElement.src = constructedAddress;
        videoTitleElement.textContent = window.globalHomeVideoChosenTitle;
    }

    startHomeVideoListRetrievalProcess();
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

    var walkingIndex = 0;
    while (walkingIndex < window.globalWeatherData.length) {
        var currentWeatherItem = window.globalWeatherData[walkingIndex];

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

        walkingIndex = walkingIndex + 1;
    }
}

attachTime();
attachWeather();

window.addEventListener("home-page-loaded", function() {
    attachTime();
    attachWeather();
});

