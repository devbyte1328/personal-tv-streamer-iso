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
        return new Promise(function resolveLater(resolveFunction) {
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

                var generalLines = generalText.split("\n").map(function trim(line) {
                    return line.trim();
                }).filter(Boolean);

                var trailerLines = trailerText.split("\n").map(function trim(line) {
                    return line.trim();
                }).filter(Boolean);

                if (generalLines.length === 0 || trailerLines.length === 0) {
                    throw new Error("Invalid data.");
                }

                var parsedGeneralList = generalLines.map(function mapGeneral(line) {
                    var indexOfSpace = line.indexOf(" ");
                    var videoIdentifier = line.slice(0, indexOfSpace).trim();
                    var videoTitle = line.slice(indexOfSpace + 1).trim();
                    return { videoId: videoIdentifier, videoTitle: videoTitle };
                });

                generalVideoList = parsedGeneralList.slice();

                var parsedTrailerList = trailerLines.map(function mapTrailer(line) {
                    var indexOfSpace = line.indexOf(" ");
                    var videoIdentifier = line.slice(0, indexOfSpace).trim();
                    var videoTitle = line.slice(indexOfSpace + 1).trim();
                    return { videoId: videoIdentifier, videoTitle: videoTitle };
                });

                var chosenTrailer = parsedTrailerList[Math.floor(Math.random() * parsedTrailerList.length)];
                trailerVideoList = [chosenTrailer];

                thumbnailVideoList = parsedGeneralList.map(function mapGeneralId(entry) {
                    return entry.videoId;
                }).concat(parsedTrailerList.map(function mapTrailerId(entry) {
                    return entry.videoId;
                }));

                break;
            } catch (error) {
                await waitMilliseconds(1000);
            }
        }
    }

    function buildFullVideoSource(videoIdentifier) {
        return (
            "https://www.youtube.com/embed/" +
            videoIdentifier +
            "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0" +
            "&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=" +
            videoIdentifier
        );
    }

    function buildNavigableVideoAddress(videoIdentifier) {
        return "https://www.youtube.com/watch?v=" + videoIdentifier;
    }

    function buildThumbnailSource(videoIdentifier) {
        return "https://i.ytimg.com/vi/" + videoIdentifier + "/hqdefault.jpg";
    }

    function buildThumbnailGrid() {
        var grid = document.getElementById("thumbnail-grid-container");
        if (!grid) return;
        if (grid.children.length > 0) return;

        thumbnailVideoList.forEach(function addOne(identifier) {
            var wrapper = document.createElement("div");
            wrapper.className = "thumbnail-wrapper";

            var img = document.createElement("img");
            img.src = buildThumbnailSource(identifier);
            img.dataset.videoId = identifier;

            var overlay = document.createElement("div");
            overlay.className = "thumbnail-overlay";
            overlay.dataset.videoId = identifier;

            wrapper.appendChild(img);
            wrapper.appendChild(overlay);
            grid.appendChild(wrapper);
        });

        addThumbnailHandlers();
    }

    function refreshFrameSources(frames) {
        frames.forEach(function refresh(frame, index) {
            var id = frame.dataset.videoId;
            if (index < 5) {
                var fullSource = buildFullVideoSource(id);
                if (frame.src !== fullSource) {
                    frame.src = fullSource;
                }
            } else {
                var thumbSource = buildThumbnailSource(id);
                if (frame.src !== thumbSource) {
                    frame.src = thumbSource;
                }
            }
        });
    }

    function buildCarousel() {
        var container = document.getElementById("carousel-container");
        if (!container) return;
        if (container.children.length > 0) return;

        container.innerHTML = "";

        generalVideoList.forEach(function insertFrame(entry, index) {
            var frame = document.createElement("iframe");
            frame.dataset.videoId = entry.videoId;
            frame.dataset.videoTitle = entry.videoTitle;
            frame.src = index < 5 ? buildFullVideoSource(entry.videoId) : buildThumbnailSource(entry.videoId);
            container.appendChild(frame);
        });

        var frames = Array.from(container.querySelectorAll("iframe"));
        carouselState = { container: container, frames: frames };

        assignCarouselPositions(frames);
        refreshFrameSources(frames);
        addCarouselOverlays();
    }

    function assignVisualPosition(element, role, order) {
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
        element.style.order = String(order);
    }

    function assignCarouselPositions(frames) {
        if (frames.length < 5) return;

        assignVisualPosition(frames[0], "hidden-preloaded-left", 0);
        assignVisualPosition(frames[1], "left", 1);
        assignVisualPosition(frames[2], "center", 2);
        assignVisualPosition(frames[3], "right", 3);
        assignVisualPosition(frames[4], "hidden-preloaded-right", 4);

        var order = 5;
        for (var i = 5; i < frames.length; i++) {
            assignVisualPosition(frames[i], "hidden-unloaded-" + (i - 4), order++);
        }
    }

    function shiftCarouselLeft() {
        if (!carouselState) return;
        var frames = carouselState.frames;

        var rotated = [frames[frames.length - 1]].concat(frames.slice(0, -1));
        carouselState.frames = rotated;

        assignCarouselPositions(rotated);
        refreshFrameSources(rotated);
        addCarouselOverlays();
    }

    function shiftCarouselRight() {
        if (!carouselState) return;
        var frames = carouselState.frames;

        var rotated = frames.slice(1).concat(frames[0]);
        carouselState.frames = rotated;

        assignCarouselPositions(rotated);
        refreshFrameSources(rotated);
        addCarouselOverlays();
    }

    function buildTrailer() {
        var frame = document.getElementById("standalone-trailer-frame");
        var title = document.getElementById("standalone-trailer-title");

        if (!frame || !title) return;
        if (frame.src.trim() !== "") return;

        var chosen = trailerVideoList[0];
        frame.src = buildFullVideoSource(chosen.videoId);
        title.textContent = chosen.videoTitle;

        positionTrailerOverlay();
        addTrailerHandler();
    }

    function positionTrailerOverlay() {
        var overlay = document.getElementById("standalone-trailer-overlay");
        var frame = document.getElementById("standalone-trailer-frame");
        if (!overlay || !frame) return;

        var rect = frame.getBoundingClientRect();
        var wrapperRect = frame.parentNode.getBoundingClientRect();

        var left = frame.offsetLeft;
        var top = frame.offsetTop;

        overlay.style.left = left + "px";
        overlay.style.top = top + "px";
        overlay.style.width = frame.offsetWidth + "px";
        overlay.style.height = frame.offsetHeight + "px";
    }

    function addTrailerHandler() {
        var overlay = document.getElementById("standalone-trailer-overlay");
        if (!overlay) return;

        var videoIdentifier = trailerVideoList[0].videoId;
        var address = buildNavigableVideoAddress(videoIdentifier);

        overlay.onclick = function navigate() {
            window.location.href = address;
        };
    }

    function addCarouselOverlays() {
        if (!carouselState) return;

        var container = carouselState.container;
        var frames = carouselState.frames;

        var old = Array.from(container.querySelectorAll(".carousel-overlay"));
        old.forEach(function remove(item) {
            item.remove();
        });

        frames.forEach(function createOverlay(frame) {
            var position = frame.dataset.position;
            if (!position) return;
            if (position.startsWith("hidden")) return;

            var overlay = document.createElement("div");
            overlay.className = "carousel-overlay";

            var left = frame.offsetLeft;
            var top = frame.offsetTop;
            var width = frame.offsetWidth;
            var height = frame.offsetHeight;

            overlay.style.left = left + "px";
            overlay.style.top = top + "px";
            overlay.style.width = width + "px";
            overlay.style.height = height + "px";

            var address = buildNavigableVideoAddress(frame.dataset.videoId);

            overlay.onclick = function navigate() {
                window.location.href = address;
            };

            container.appendChild(overlay);
        });
    }

    function addThumbnailHandlers() {
        var overlays = Array.from(document.querySelectorAll(".thumbnail-overlay"));

        overlays.forEach(function assign(overlay) {
            var videoId = overlay.dataset.videoId;
            var address = buildNavigableVideoAddress(videoId);

            overlay.onclick = function go() {
                window.location.href = address;
            };
        });
    }

    document.addEventListener("click", function handleClick(event) {
        if (event.target.id === "left-carousel-btn") shiftCarouselLeft();
        if (event.target.id === "right-carousel-btn") shiftCarouselRight();
    });

    window.addEventListener("resize", function repositionEverything() {
        positionTrailerOverlay();
        addCarouselOverlays();
    });

    (async function initialize() {
        await pullCuratedVideos();

        try {
            var response = await fetch("/curated");
            var raw = await response.text();
            var parsed = new DOMParser().parseFromString(raw, "text/html");
            var embedded = parsed.getElementById("persistent-player");

            if (embedded && embedded.innerHTML.trim()) {
                persistentPlayer.innerHTML = embedded.innerHTML;
                persistentPlayer.style.display = "block";
                persistentPlayer.style.visibility = "hidden";

                requestAnimationFrame(function reveal() {
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

        var fresh = parsed.getElementById("persistent-player");

        if (fresh && fresh.innerHTML.trim()) {
            if (!persistentPlayerIsReady) {
                persistentPlayer.innerHTML = fresh.innerHTML;
            }
            persistentPlayer.style.display = "block";
        } else {
            persistentPlayer.style.display = "none";
        }

        buildCarousel();
        buildTrailer();
        buildThumbnailGrid();

        requestAnimationFrame(function reposition() {
            positionTrailerOverlay();
            addCarouselOverlays();
        });
    };

    (async function finalize() {
        await pullCuratedVideos();
        buildCarousel();
        buildTrailer();
        buildThumbnailGrid();

        requestAnimationFrame(function reposition() {
            positionTrailerOverlay();
            addCarouselOverlays();
        });
    })();
});
