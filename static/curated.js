window.addEventListener("DOMContentLoaded", () => {
    if (!window.loadPage) return;

    const persistentPlayer = document.getElementById("persistent-player");
    let persistentPlayerIsReady = false;
    let carouselState = null;

    let generalVideoList = [];
    let trailerVideoList = [];
    let thumbnailVideoList = [];

    const generalVideosUrl = "http://localhost:8080/database/pulled/curated-youtube-general-videos";
    const trailerVideosUrl = "http://localhost:8080/database/pulled/curated-youtube-trailer-videos";

    const pullCuratedVideos = async () => {
        for (;;) {
            try {
                const generalResponse = await fetch(generalVideosUrl);
                const trailerResponse = await fetch(trailerVideosUrl);

                if (!generalResponse.ok || !trailerResponse.ok) throw new Error();

                const generalText = (await generalResponse.text()).trim();
                const trailerText = (await trailerResponse.text()).trim();

                const generalRawLines = generalText.split("\n").map(s => s.trim()).filter(Boolean);
                const trailerRawLines = trailerText.split("\n").map(s => s.trim()).filter(Boolean);

                if (generalRawLines.length === 0 || trailerRawLines.length === 0) throw new Error();

                const parsedGeneralList = generalRawLines.map(line => {
                    const firstSpaceIndex = line.indexOf(" ");
                    const videoId = line.slice(0, firstSpaceIndex).trim();
                    const videoTitle = line.slice(firstSpaceIndex + 1).trim();
                    return { videoId, videoTitle };
                });

                generalVideoList = [...parsedGeneralList];

                const parsedTrailerList = trailerRawLines.map(line => {
                    const firstSpaceIndex = line.indexOf(" ");
                    const videoId = line.slice(0, firstSpaceIndex).trim();
                    const videoTitle = line.slice(firstSpaceIndex + 1).trim();
                    return { videoId, videoTitle };
                });

                const pickedTrailer = parsedTrailerList[Math.floor(Math.random() * parsedTrailerList.length)];
                trailerVideoList = [pickedTrailer];

                thumbnailVideoList = [
                    ...parsedGeneralList.map(x => x.videoId),
                    ...parsedTrailerList.map(x => x.videoId)
                ];

                break;
            } catch {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };

    const buildFullVideoSource = id =>
        "https://www.youtube.com/embed/" + id +
        "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=" + id;

    const buildThumbnailSource = id =>
        "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";

    const buildThumbnailGrid = () => {
        const grid = document.getElementById("thumbnail-grid-container");
        if (!grid) return;
        if (grid.children.length > 0) return;
        thumbnailVideoList.forEach(id => {
            const img = document.createElement("img");
            img.src = buildThumbnailSource(id);
            img.dataset.videoId = id;
            grid.appendChild(img);
        });
    };

    const refreshFrameSources = frames => {
        frames.forEach((frame, index) => {
            const id = frame.dataset.videoId;
            if (index < 5) {
                const fullSource = buildFullVideoSource(id);
                if (frame.src !== fullSource) frame.src = fullSource;
            } else {
                const thumbnailSource = buildThumbnailSource(id);
                if (frame.src !== thumbnailSource) frame.src = thumbnailSource;
            }
        });
    };

    const buildCarousel = () => {
        const container = document.getElementById("carousel-container");
        if (!container) return;
        if (container.children.length > 0) return;

        container.innerHTML = "";

        generalVideoList.forEach((item, index) => {
            const frame = document.createElement("iframe");
            frame.dataset.videoId = item.videoId;
            frame.dataset.videoTitle = item.videoTitle;
            frame.src = index < 5 ? buildFullVideoSource(item.videoId) : buildThumbnailSource(item.videoId);
            container.appendChild(frame);
        });

        const frames = Array.from(container.querySelectorAll("iframe"));
        carouselState = { container, frames };
        assignCarouselPositions(frames);
        refreshFrameSources(frames);
    };

    const assignVisualPosition = (element, role, order) => {
        element.className =
            role === "center" ? "center-video" :
            role === "left" ? "side-video left-video" :
            role === "right" ? "side-video right-video" :
            "hidden-video";
        element.dataset.position = role;
        element.style.order = String(order);
    };

    const assignCarouselPositions = frames => {
        if (frames.length < 5) return;

        assignVisualPosition(frames[0], "hidden-preloaded-left", 0);
        assignVisualPosition(frames[1], "left", 1);
        assignVisualPosition(frames[2], "center", 2);
        assignVisualPosition(frames[3], "right", 3);
        assignVisualPosition(frames[4], "hidden-preloaded-right", 4);

        let order = 5;
        for (let i = 5; i < frames.length; i++) {
            assignVisualPosition(frames[i], "hidden-unloaded-" + (i - 4), order++);
        }
    };

    const shiftCarouselLeft = () => {
        if (!carouselState) return;
        const frames = carouselState.frames;
        const rotated = [frames[frames.length - 1], ...frames.slice(0, -1)];
        carouselState.frames = rotated;
        assignCarouselPositions(rotated);
        refreshFrameSources(rotated);
    };

    const shiftCarouselRight = () => {
        if (!carouselState) return;
        const frames = carouselState.frames;
        const rotated = [...frames.slice(1), frames[0]];
        carouselState.frames = rotated;
        assignCarouselPositions(rotated);
        refreshFrameSources(rotated);
    };

    const buildTrailer = () => {
        const frame = document.getElementById("standalone-trailer-frame");
        const titleBox = document.getElementById("standalone-trailer-title");
        if (!frame || !titleBox) return;
        if (frame.src.trim() !== "") return;

        const { videoId, videoTitle } = trailerVideoList[0];
        frame.src = buildFullVideoSource(videoId);
        titleBox.textContent = videoTitle;
    };

    document.addEventListener("click", event => {
        if (event.target.id === "left-carousel-btn") shiftCarouselLeft();
        if (event.target.id === "right-carousel-btn") shiftCarouselRight();
    });

    (async () => {
        await pullCuratedVideos();

        try {
            const response = await fetch("/curated");
            const raw = await response.text();
            const parsed = new DOMParser().parseFromString(raw, "text/html");
            const embeddedPlayer = parsed.getElementById("persistent-player");

            if (embeddedPlayer && embeddedPlayer.innerHTML.trim()) {
                persistentPlayer.innerHTML = embeddedPlayer.innerHTML;
                persistentPlayer.style.display = "block";
                persistentPlayer.style.visibility = "hidden";

                requestAnimationFrame(() => {
                    persistentPlayer.style.display = "none";
                    persistentPlayer.style.visibility = "";
                    persistentPlayerIsReady = true;
                });
            }

            buildCarousel();
            buildTrailer();
            buildThumbnailGrid();
        } catch {}
    })();

    const originalLoadPage = window.loadPage;

    window.loadPage = async function (url, navigationItem) {
        await originalLoadPage(url, navigationItem);

        const reply = await fetch(url);
        const raw = await reply.text();
        const parsed = new DOMParser().parseFromString(raw, "text/html");

        const freshPlayer = parsed.getElementById("persistent-player");
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

    (async () => {
        await pullCuratedVideos();
        buildCarousel();
        buildTrailer();
        buildThumbnailGrid();
    })();
});

