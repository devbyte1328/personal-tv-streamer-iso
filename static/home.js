if (window.globalTimeAlreadyRunning === undefined || window.globalTimeAlreadyRunning === null) {
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

    function beginLocationRetrieval() {
        fetch("/database/location")
            .then(function(receivedResponse) {
                return receivedResponse.text();
            })
            .then(function(receivedText) {
                var foundLocaleMatch = receivedText.match(/LocaleString:\s*"([^"]+)"/);
                var foundTimezoneMatch = receivedText.match(/Timezone:\s*"([^"]+)"/);

                if (foundLocaleMatch) {
                    window.globalLocale = foundLocaleMatch[1];
                } else {
                    window.globalLocale = undefined;
                }

                if (foundTimezoneMatch) {
                    window.globalTimezone = foundTimezoneMatch[1];
                } else {
                    window.globalTimezone = undefined;
                }

                updateDisplayedTimeAndDate();
                setInterval(updateDisplayedTimeAndDate, 1000);
            });
    }

    beginLocationRetrieval();

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
                if (receivedWeatherData !== null &&
                    receivedWeatherData !== undefined &&
                    receivedWeatherData.locations !== undefined &&
                    receivedWeatherData.locations !== null) {
                    storeWeatherDataInMemory(receivedWeatherData.locations);
                }
                attachWeather();
            });
    }

    requestWeatherInformation();

    function buildFullHomeVideoSource(fullVideoIdentifier) {
        var constructedAddress = "";
        constructedAddress = constructedAddress +
            "https://www.youtube.com/embed/" +
            fullVideoIdentifier +
            "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0" +
            "&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=" +
            fullVideoIdentifier;
        return constructedAddress;
    }

    function startHomeVideoListRetrievalProcess() {
        var generalVideosUrl = "http://localhost:8080/database/pulled/curated-youtube-general-videos";
        var trailerVideosUrl = "http://localhost:8080/database/pulled/curated-youtube-trailer-videos";

        function loadVideoListFromUrl(fullUrl, finalCallback) {
            fetch(fullUrl)
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
                    var cleaningIndex = 0;

                    while (cleaningIndex < separatedTextLines.length) {
                        var currentLine = separatedTextLines[cleaningIndex];
                        var trimmedCurrentLine = currentLine.trim();
                        if (trimmedCurrentLine !== "") {
                            cleanedList.push(trimmedCurrentLine);
                        }
                        cleaningIndex = cleaningIndex + 1;
                    }

                    var parsedList = [];
                    var parsingIndex = 0;

                    while (parsingIndex < cleanedList.length) {
                        var currentRawLine = cleanedList[parsingIndex];
                        var indexOfSpace = currentRawLine.indexOf(" ");

                        var extractedIdentifier = currentRawLine.slice(
                            0,
                            indexOfSpace
                        ).trim();

                        var extractedTitle = currentRawLine.slice(
                            indexOfSpace + 1
                        ).trim();

                        parsedList.push({
                            videoIdentifier: extractedIdentifier,
                            videoTitle: extractedTitle
                        });

                        parsingIndex = parsingIndex + 1;
                    }

                    finalCallback(parsedList);
                })
                .catch(function() {
                    finalCallback([]);
                });
        }

        function fetchBothLists(finalCallback) {
            loadVideoListFromUrl(generalVideosUrl, function(generalList) {
                loadVideoListFromUrl(trailerVideosUrl, function(trailerList) {
                    var combinedList = generalList.concat(trailerList);
                    finalCallback(combinedList);
                });
            });
        }

        fetchBothLists(function(fullCombinedList) {
            window.globalHomeVideoAvailableList = fullCombinedList;
            window.globalHomeVideoInformationHasLoaded = false;
            chooseHomeVideoForDisplay();
            updateHomeVideoOnPage();
        });
    }

    startHomeVideoListRetrievalProcess();

    function chooseHomeVideoForDisplay() {
        if (window.globalHomeVideoAvailableList.length === 0) {
            return;
        }

        var totalNumberOfVideos = window.globalHomeVideoAvailableList.length;
        var selectedRandomIndex = Math.floor(Math.random() * totalNumberOfVideos);

        var chosenVideoObject = window.globalHomeVideoAvailableList[selectedRandomIndex];

        window.globalHomeVideoChosenIdentifier = chosenVideoObject.videoIdentifier;
        window.globalHomeVideoChosenTitle = chosenVideoObject.videoTitle;
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

        var fullyConstructedAddress = buildFullHomeVideoSource(
            window.globalHomeVideoChosenIdentifier
        );

        videoFrameElement.src = fullyConstructedAddress;
        videoTitleElement.textContent = window.globalHomeVideoChosenTitle;
    }
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
    window.globalHomeVideoInformationHasLoaded = false;
    chooseHomeVideoForDisplay();
    updateHomeVideoOnPage();
});

