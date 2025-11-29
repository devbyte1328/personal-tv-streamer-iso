document.addEventListener("DOMContentLoaded", () => {
    const navigationItems = document.querySelectorAll("#sidebar li[data-url]");
    const persistentPlayer = document.getElementById("persistent-player");
    let persistentPlayerIsReady = false;
    let carouselState = null;

    const generalVideoList = [
        "jH5Gq7G4X-s",
        "on1pjsxYOwc",
        "5BPTO2_-zUs",
        "FHPKkKc2hE4",
        "2rVvvu7aMQQ",
        "STZCFSWRDq8",
        "k3u4uUaiH_4",
        "dP-81C_tckU",
        "OlbOOzX_fDs",
        "HRiCRmPYAl8",
        "rilFfbm7j8k"
    ];

    const trailerVideoList = [
        "EXV_WAKwGc4"
    ];

    const thumbnailVideoList = [
        "TNlEtPJPjJk",
        "T7oExc711xE",
        "dP-81C_tckU",
        "GeEvVO7Op1E",
        "k3u4uUaiH_4",
        "r6DPYgsmAXY",
        "ILkj5qbbfDM",
        "WxCbrOo1mnE",
        "6NnLfbTCM2I",
        "STZCFSWRDq8",
        "19TTjiSXVac",
        "2rVvvu7aMQQ",
        "hr-NaxerMqg",
        "fhyHNqxLrTs",
        "fiqTPjhNywI",
        "MfRzxFhqLLo",
        "_uiUiYBJrIA",
        "UxjKu7cpFa4",
        "8NzjH64Ukq8",
        "x1k4pWasm3E"
    ];

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
            const imgElement = document.createElement("img");
            imgElement.src = buildThumbnailSource(id);
            imgElement.dataset.videoId = id;
            grid.appendChild(imgElement);
        });
    };

    const refreshFrameSources = frames => {
        frames.forEach((frame, index) => {
            const frameId = frame.dataset.videoId;
            if (index < 5) {
                const fullSource = buildFullVideoSource(frameId);
                if (frame.src !== fullSource) frame.src = fullSource;
            } else {
                const thumbnail = buildThumbnailSource(frameId);
                if (frame.src !== thumbnail) frame.src = thumbnail;
            }
        });
    };

    const buildCarousel = () => {
        const container = document.getElementById("carousel-container");
        if (!container) return;
        if (container.children.length > 0) return;

        container.innerHTML = "";
        generalVideoList.forEach((id, index) => {
            const frame = document.createElement("iframe");
            frame.dataset.videoId = id;
            frame.src = index < 5 ? buildFullVideoSource(id) : buildThumbnailSource(id);
            container.appendChild(frame);
        });

        const frames = Array.from(container.querySelectorAll("iframe"));
        carouselState = { container, frames };

        assignCarouselPositions(frames);
        refreshFrameSources(frames);
    };

    const assignVisualPosition = (element, role, orderValue) => {
        element.className =
            role === "center" ? "center-video" :
            role === "left" ? "side-video left-video" :
            role === "right" ? "side-video right-video" :
            "hidden-video";
        element.dataset.position = role;
        element.style.order = String(orderValue);
    };

    const assignCarouselPositions = frames => {
        if (frames.length < 5) return;
        assignVisualPosition(frames[0], "hidden-preloaded-left", 0);
        assignVisualPosition(frames[1], "left", 1);
        assignVisualPosition(frames[2], "center", 2);
        assignVisualPosition(frames[3], "right", 3);
        assignVisualPosition(frames[4], "hidden-preloaded-right", 4);
        let counter = 5;
        for (let i = 5; i < frames.length; i++) {
            assignVisualPosition(frames[i], "hidden-unloaded-" + (i - 4), counter);
            counter++;
        }
    };

    const shiftCarouselLeft = () => {
        if (!carouselState) return;
        const frames = carouselState.frames;
        const rotated = [frames[frames.length - 1], ...frames.slice(0, frames.length - 1)];
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
        const trailerFrame = document.getElementById("standalone-trailer-frame");
        if (!trailerFrame) return;
        if (trailerFrame.src && trailerFrame.src.trim() !== "") return;
        trailerFrame.src = buildFullVideoSource(trailerVideoList[0]);
    };

    document.addEventListener("click", event => {
        if (event.target && event.target.id === "left-carousel-btn") shiftCarouselLeft();
        if (event.target && event.target.id === "right-carousel-btn") shiftCarouselRight();
    });

    (async () => {
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

    async function loadPage(url, navigationItem) {
        const reply = await fetch(url);
        const raw = await reply.text();
        const parsed = new DOMParser().parseFromString(raw, "text/html");
        const freshContent = parsed.querySelector("#content");
        if (freshContent) {
            document.getElementById("content").innerHTML = freshContent.innerHTML;
        }
        const freshPlayer = parsed.getElementById("persistent-player");
        if (freshPlayer && freshPlayer.innerHTML.trim()) {
            if (!persistentPlayerIsReady) {
                persistentPlayer.innerHTML = freshPlayer.innerHTML;
            }
            persistentPlayer.style.display = "block";
        } else {
            persistentPlayer.style.display = "none";
        }
        document.title = parsed.title;
        navigationItems.forEach(x => x.classList.remove("active-tab"));
        navigationItem.classList.add("active-tab");
        buildCarousel();
        buildTrailer();
        buildThumbnailGrid();
    }

    navigationItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            loadPage(item.dataset.url, item);
        });
    });

    buildCarousel();
    buildTrailer();
    buildThumbnailGrid();
});
