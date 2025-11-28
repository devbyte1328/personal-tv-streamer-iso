document.addEventListener("DOMContentLoaded", () => {
  const sidebarNavigationItems = document.querySelectorAll("#sidebar li[data-url]");
  const persistentVideoPlayerElement = document.getElementById("persistent-player");

  let persistentPlayerHasBeenPreloaded = false;
  let carouselInformation = null;

  const youtubeVideoIdentifierList = [
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

  const generateVideoSource = identifier =>
    "https://www.youtube.com/embed/" +
    identifier +
    "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=" +
    identifier;

  const generateThumbnailSource = identifier =>
    "https://i.ytimg.com/vi/" + identifier + "/hqdefault.jpg";

  const ensureFrameSourcesMatchPositions = frameList => {
    frameList.forEach((frameElement, index) => {
      const identifier = frameElement.dataset.videoId;
      if (index < 5) {
        const desiredSource = generateVideoSource(identifier);
        if (frameElement.src !== desiredSource) frameElement.src = desiredSource;
      } else {
        const desiredSource = generateThumbnailSource(identifier);
        if (frameElement.src !== desiredSource) frameElement.src = desiredSource;
      }
    });
  };

  const createCarouselIfAbsent = () => {
    const carouselContainerElement = document.getElementById("carousel-container");
    if (!carouselContainerElement) return;
    if (carouselContainerElement.children.length > 0) return;

    carouselContainerElement.innerHTML = "";

    youtubeVideoIdentifierList.forEach((identifier, index) => {
      const newFrameElement = document.createElement("iframe");
      newFrameElement.dataset.videoId = identifier;
      if (index < 5) {
        newFrameElement.src = generateVideoSource(identifier);
      } else {
        newFrameElement.src = generateThumbnailSource(identifier);
      }
      carouselContainerElement.appendChild(newFrameElement);
    });

    const carouselFrameList = Array.from(
      carouselContainerElement.querySelectorAll("iframe")
    );

    carouselInformation = {
      carouselElement: carouselContainerElement,
      frameList: carouselFrameList
    };

    assignCarouselPositions(carouselFrameList);
    ensureFrameSourcesMatchPositions(carouselFrameList);
  };

  const assignPositionToElement = (element, positionName, orderNumber) => {
    element.className =
      positionName === "center"
        ? "center-video"
        : positionName === "left"
        ? "side-video left-video"
        : positionName === "right"
        ? "side-video right-video"
        : "hidden-video";

    element.dataset.position = positionName;
    element.style.order = String(orderNumber);
  };

  const assignCarouselPositions = frameList => {
    if (frameList.length < 5) return;

    assignPositionToElement(frameList[0], "hidden-preloaded-left", 0);
    assignPositionToElement(frameList[1], "left", 1);
    assignPositionToElement(frameList[2], "center", 2);
    assignPositionToElement(frameList[3], "right", 3);
    assignPositionToElement(frameList[4], "hidden-preloaded-right", 4);

    let positionCounter = 5;
    for (let index = 5; index < frameList.length; index++) {
      assignPositionToElement(
        frameList[index],
        "hidden-unloaded-" + (index - 4),
        positionCounter
      );
      positionCounter++;
    }
  };

  const rotateCarouselLeft = () => {
    const info = carouselInformation;
    if (!info) return;

    const list = info.frameList;
    const reordered = [
      list[1],
      list[2],
      list[3],
      list[4],
      ...list.slice(5),
      list[0]
    ];

    info.frameList = reordered;
    assignCarouselPositions(reordered);
    ensureFrameSourcesMatchPositions(reordered);
  };

  const rotateCarouselRight = () => {
    const info = carouselInformation;
    if (!info) return;

    const list = info.frameList;
    const reordered = [
      list[list.length - 1],
      list[0],
      list[1],
      list[2],
      list[3],
      ...list.slice(4, list.length - 1)
    ];

    info.frameList = reordered;
    assignCarouselPositions(reordered);
    ensureFrameSourcesMatchPositions(reordered);
  };

  document.addEventListener("click", event => {
    if (event.target && event.target.id === "left-carousel-btn") rotateCarouselLeft();
    if (event.target && event.target.id === "right-carousel-btn") rotateCarouselRight();
  });

  (async () => {
    try {
      const response = await fetch("/curated");
      const text = await response.text();

      const parsed = new DOMParser().parseFromString(text, "text/html");
      const loaded = parsed.getElementById("persistent-player");

      if (loaded && loaded.innerHTML.trim()) {
        persistentVideoPlayerElement.innerHTML = loaded.innerHTML;
        persistentVideoPlayerElement.style.display = "block";
        persistentVideoPlayerElement.style.visibility = "hidden";

        requestAnimationFrame(() => {
          persistentVideoPlayerElement.style.display = "none";
          persistentVideoPlayerElement.style.visibility = "";
          persistentPlayerHasBeenPreloaded = true;
        });
      }

      createCarouselIfAbsent();
    } catch {}
  })();

  async function loadRequestedPage(requestedUrl, clickedNavigationItem) {
    const response = await fetch(requestedUrl);
    const text = await response.text();

    const parsed = new DOMParser().parseFromString(text, "text/html");
    const newContentElement = parsed.querySelector("#content");
    if (newContentElement) {
      document.getElementById("content").innerHTML = newContentElement.innerHTML;
    }

    const newlyLoadedPersistentPlayer = parsed.getElementById("persistent-player");

    if (newlyLoadedPersistentPlayer && newlyLoadedPersistentPlayer.innerHTML.trim()) {
      if (!persistentPlayerHasBeenPreloaded) {
        persistentVideoPlayerElement.innerHTML =
          newlyLoadedPersistentPlayer.innerHTML;
      }
      persistentVideoPlayerElement.style.display = "block";
    } else {
      persistentVideoPlayerElement.style.display = "none";
    }

    document.title = parsed.title;

    sidebarNavigationItems.forEach(item => item.classList.remove("active-tab"));
    clickedNavigationItem.classList.add("active-tab");

    createCarouselIfAbsent();
  }

  sidebarNavigationItems.forEach(navigationItem => {
    navigationItem.addEventListener("click", event => {
      event.preventDefault();
      loadRequestedPage(navigationItem.dataset.url, navigationItem);
    });
  });

  createCarouselIfAbsent();
});

