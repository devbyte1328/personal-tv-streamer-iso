window.addEventListener("DOMContentLoaded", function handleDomLoadedEvent() {
    if (!window.loadPage) {
        return;
    }

    var persistentPlayer = document.getElementById("persistent-player");
    var persistentPlayerIsReady = false;
    var carouselState = null;

    var generalVideoList = [];
    var trailerVideoList = [];
    var thumbnailVideoList = [];

    var generalVideosUrl = "http://localhost:8080/database/pulled/curated-youtube-general-videos";
    var trailerVideosUrl = "http://localhost:8080/database/pulled/curated-youtube-trailer-videos";

    function waitMilliseconds(duration) {
        return new Promise(function waitResolve(resolveFunction) {
            setTimeout(resolveFunction, duration);
        });
    }

    async function pullCuratedVideos() {
        for (;;) {
            try {
                var generalResponse = await fetch(generalVideosUrl);
                var trailerResponse = await fetch(trailerVideosUrl);

                if (!generalResponse.ok || !trailerResponse.ok) {
                    throw new Error("Unable to load videos.");
                }

                var generalText = (await generalResponse.text()).trim();
                var trailerText = (await trailerResponse.text()).trim();

                var generalRawLines = generalText.split("\n").map(function convertToTrimmed(line) {
                    return line.trim();
                }).filter(function keepNonEmpty(value) {
                    return Boolean(value);
                });

                var trailerRawLines = trailerText.split("\n").map(function convertToTrimmed(line) {
                    return line.trim();
                }).filter(function keepNonEmpty(value) {
                    return Boolean(value);
                });

                if (generalRawLines.length === 0 || trailerRawLines.length === 0) {
                    throw new Error("No valid lines.");
                }

                var parsedGeneralList = generalRawLines.map(function parseGeneralLine(line) {
                    var firstSpaceIndex = line.indexOf(" ");
                    var videoIdentifier = line.slice(0, firstSpaceIndex).trim();
                    var videoTitle = line.slice(firstSpaceIndex + 1).trim();
                    return {
                        videoId: videoIdentifier,
                        videoTitle: videoTitle
                    };
                });

                generalVideoList = parsedGeneralList.slice();

                var parsedTrailerList = trailerRawLines.map(function parseTrailerLine(line) {
                    var firstSpaceIndex = line.indexOf(" ");
                    var videoIdentifier = line.slice(0, firstSpaceIndex).trim();
                    var videoTitle = line.slice(firstSpaceIndex + 1).trim();
                    return {
                        videoId: videoIdentifier,
                        videoTitle: videoTitle
                    };
                });

                var randomIndex = Math.floor(Math.random() * parsedTrailerList.length);
                var chosenTrailer = parsedTrailerList[randomIndex];
                trailerVideoList = [chosenTrailer];

                thumbnailVideoList = parsedGeneralList.map(function mapGeneral(entry) {
                    return entry.videoId;
                }).concat(parsedTrailerList.map(function mapTrailer(entry) {
                    return entry.videoId;
                }));

                break;
            } catch (error) {
                await waitMilliseconds(1000);
            }
        }
    }

    function buildFullVideoSource(videoIdentifier) {
        var address = "";
        address = address +
            "https://www.youtube.com/embed/" +
            videoIdentifier +
            "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0" +
            "&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=" +
            videoIdentifier;
        return address;
    }

    function buildNavigableVideoAddress(videoIdentifier) {
        var address = "";
        address = address + "https://www.youtube.com/watch?v=" + videoIdentifier;
        return address;
    }

    function buildThumbnailSource(videoIdentifier) {
        var address = "";
        address = address + "https://i.ytimg.com/vi/" + videoIdentifier + "/hqdefault.jpg";
        return address;
    }

    function buildThumbnailGrid() {
        var gridElement = document.getElementById("thumbnail-grid-container");
        if (!gridElement) {
            return;
        }
        if (gridElement.children.length > 0) {
            return;
        }

        thumbnailVideoList.forEach(function createThumbnailElement(identifier) {
            var imageElement = document.createElement("img");
            imageElement.src = buildThumbnailSource(identifier);
            imageElement.dataset.videoId = identifier;
            gridElement.appendChild(imageElement);
        });

        addOverlaysToThumbnails();
    }

    function refreshFrameSources(frames) {
        frames.forEach(function refreshFrame(frame, indexNumber) {
            var videoIdentifier = frame.dataset.videoId;

            if (indexNumber < 5) {
                var fullAddress = buildFullVideoSource(videoIdentifier);
                if (frame.src !== fullAddress) {
                    frame.src = fullAddress;
                }
            } else {
                var thumbnailAddress = buildThumbnailSource(videoIdentifier);
                if (frame.src !== thumbnailAddress) {
                    frame.src = thumbnailAddress;
                }
            }
        });
    }

    function buildCarousel() {
        var container = document.getElementById("carousel-container");
        if (!container) {
            return;
        }
        if (container.children.length > 0) {
            return;
        }

        container.innerHTML = "";

        generalVideoList.forEach(function addFrame(item, indexNumber) {
            var createdFrame = document.createElement("iframe");
            createdFrame.dataset.videoId = item.videoId;
            createdFrame.dataset.videoTitle = item.videoTitle;

            if (indexNumber < 5) {
                createdFrame.src = buildFullVideoSource(item.videoId);
            } else {
                createdFrame.src = buildThumbnailSource(item.videoId);
            }

            container.appendChild(createdFrame);
        });

        var frameList = Array.from(container.querySelectorAll("iframe"));
        carouselState = {
            container: container,
            frames: frameList
        };

        assignCarouselPositions(frameList);
        refreshFrameSources(frameList);
        addOverlaysToCarouselVideos();
    }

    function assignVisualPosition(element, role, orderNumber) {
        if (role === "center") {
            element.className = "center-video";
        } else if (role === "left") {
            element.className = "side-video left-video";
        } else if (role === "right") {
            element.className = "side-video right-video";
        } else {
            element.className = "hidden-video";
        }

        element.dataset.position = role;
        element.style.order = String(orderNumber);
    }

    function assignCarouselPositions(frames) {
        if (frames.length < 5) {
            return;
        }

        assignVisualPosition(frames[0], "hidden-preloaded-left", 0);
        assignVisualPosition(frames[1], "left", 1);
        assignVisualPosition(frames[2], "center", 2);
        assignVisualPosition(frames[3], "right", 3);
        assignVisualPosition(frames[4], "hidden-preloaded-right", 4);

        var orderNumber = 5;

        for (var indexNumber = 5; indexNumber < frames.length; indexNumber++) {
            assignVisualPosition(frames[indexNumber], "hidden-unloaded-" + (indexNumber - 4), orderNumber);
            orderNumber = orderNumber + 1;
        }
    }

    function shiftCarouselLeft() {
        if (!carouselState) {
            return;
        }

        var frames = carouselState.frames;
        var rotated = [frames[frames.length - 1]].concat(frames.slice(0, -1));
        carouselState.frames = rotated;

        assignCarouselPositions(rotated);
        refreshFrameSources(rotated);

        addOverlaysToCarouselVideos();
    }

    function shiftCarouselRight() {
        if (!carouselState) {
            return;
        }

        var frames = carouselState.frames;
        var rotated = frames.slice(1).concat([frames[0]]);
        carouselState.frames = rotated;

        assignCarouselPositions(rotated);
        refreshFrameSources(rotated);

        addOverlaysToCarouselVideos();
    }

    function buildTrailer() {
        var frame = document.getElementById("standalone-trailer-frame");
        var titleElement = document.getElementById("standalone-trailer-title");

        if (!frame || !titleElement) {
            return;
        }
        if (frame.src.trim() !== "") {
            return;
        }

        var trailerInfo = trailerVideoList[0];
        frame.src = buildFullVideoSource(trailerInfo.videoId);
        titleElement.textContent = trailerInfo.videoTitle;

        addOverlayToTrailer();
    }

    function addOverlayToTrailer() {
        var overlayElement = document.getElementById("standalone-trailer-overlay");
        var frameElement = document.getElementById("standalone-trailer-frame");

        if (!overlayElement || !frameElement) {
            return;
        }

        var videoIdentifier = trailerVideoList[0].videoId;
        var navigableAddress = buildNavigableVideoAddress(videoIdentifier);

        function handlePress() {
            window.location.href = navigableAddress;
        }

        overlayElement.onclick = handlePress;
    }

    function addOverlaysToCarouselVideos() {
        if (!carouselState) {
            return;
        }

        var container = carouselState.container;
        var frames = carouselState.frames;

        var existingOverlays = Array.from(container.querySelectorAll(".carousel-overlay"));
        existingOverlays.forEach(function removeOverlay(overlayElement) {
            overlayElement.remove();
        });

        frames.forEach(function forEachFrame(frame) {
            var position = frame.dataset.position;
            if (!position) {
                return;
            }
            if (position.startsWith("hidden")) {
                return;
            }

            var overlayElement = document.createElement("div");
            overlayElement.className = "carousel-overlay";

            var boundingBox = frame.getBoundingClientRect();

            overlayElement.style.width = boundingBox.width + "px";
            overlayElement.style.height = boundingBox.height + "px";

            overlayElement.style.left = frame.offsetLeft + "px";
            overlayElement.style.top = frame.offsetTop + "px";

            var videoIdentifier = frame.dataset.videoId;
            var navigableAddress = buildNavigableVideoAddress(videoIdentifier);

            overlayElement.onclick = function handlePress() {
                window.location.href = navigableAddress;
            };

            container.appendChild(overlayElement);
        });
    }

    function addOverlaysToThumbnails() {
        var gridElement = document.getElementById("thumbnail-grid-container");
        if (!gridElement) {
            return;
        }

        var images = Array.from(gridElement.querySelectorAll("img"));

        images.forEach(function wrapThumbnail(imageElement) {
            if (imageElement.parentNode.classList && imageElement.parentNode.classList.contains("thumbnail-wrapper")) {
                return;
            }

            var wrapperElement = document.createElement("div");
            wrapperElement.className = "thumbnail-wrapper";
            wrapperElement.style.position = "relative";
            wrapperElement.style.width = "100%";
            wrapperElement.style.height = "100%";

            imageElement.parentNode.insertBefore(wrapperElement, imageElement);
            wrapperElement.appendChild(imageElement);

            var overlayElement = document.createElement("div");
            overlayElement.className = "thumbnail-overlay";

            var videoIdentifier = imageElement.dataset.videoId;
            var navigableAddress = buildNavigableVideoAddress(videoIdentifier);

            overlayElement.onclick = function handlePress() {
                window.location.href = navigableAddress;
            };

            wrapperElement.appendChild(overlayElement);
        });
    }

    document.addEventListener("click", function handleClick(event) {
        if (event.target.id === "left-carousel-btn") {
            shiftCarouselLeft();
        }
        if (event.target.id === "right-carousel-btn") {
            shiftCarouselRight();
        }
    });

    (async function initialize() {
        await pullCuratedVideos();

        try {
            var response = await fetch("/curated");
            var raw = await response.text();
            var parsed = new DOMParser().parseFromString(raw, "text/html");
            var embeddedPlayer = parsed.getElementById("persistent-player");

            if (embeddedPlayer && embeddedPlayer.innerHTML.trim()) {
                persistentPlayer.innerHTML = embeddedPlayer.innerHTML;
                persistentPlayer.style.display = "block";
                persistentPlayer.style.visibility = "hidden";

                requestAnimationFrame(function showPlayer() {
                    persistentPlayer.style.display = "none";
                    persistentPlayer.style.visibility = "";
                    persistentPlayerIsReady = true;
                });
            }

            buildCarousel();
            buildTrailer();
            buildThumbnailGrid();
        } catch (error) {}
    })();

    var originalLoadPage = window.loadPage;

    window.loadPage = async function loadNewPage(url, navigationItem) {
        await originalLoadPage(url, navigationItem);

        var reply = await fetch(url);
        var raw = await reply.text();
        var parsed = new DOMParser().parseFromString(raw, "text/html");

        var freshPlayer = parsed.getElementById("persistent-player");
        if (freshPlayer && freshPlayer.innerHTML.trim()) {
            if (!persistentPlayerIsReady) {
                persistentPlayer.innerHTML = freshPlayer.innerHTML;
            }
            persistentPlayer.style.display = "block";
        } else {
            persistentPlayer.style.display = "none";
        }

        buildCarousel();
        buildTrailer();
        buildThumbnailGrid();
    };

    (async function additionalInitialization() {
        await pullCuratedVideos();
        buildCarousel();
        buildTrailer();
        buildThumbnailGrid();
    })();
});

