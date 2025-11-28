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
    "OlbOOzX_fDs"
  ];

  const createCarouselIfAbsent = () => {
    const carouselContainerElement = document.getElementById("carousel-container");
    if (!carouselContainerElement) return;
    if (carouselContainerElement.children.length > 0) return;

    carouselContainerElement.innerHTML = "";

    youtubeVideoIdentifierList.forEach((currentVideoIdentifier, currentIndex) => {
      const newFrameElement = document.createElement("iframe");
      if (currentIndex < 5) {
        newFrameElement.src =
          "https://www.youtube.com/embed/" +
          currentVideoIdentifier +
          "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=" +
          currentVideoIdentifier;
      } else {
        newFrameElement.src =
          "https://i.ytimg.com/vi/" + currentVideoIdentifier + "/hqdefault.jpg";
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
  };

  const assignPositionToElement = (element, positionName, orderNumber) => {
    if (positionName === "center") {
      element.className = "center-video";
    } else if (positionName === "left") {
      element.className = "side-video left-video";
    } else if (positionName === "right") {
      element.className = "side-video right-video";
    } else {
      element.className = "hidden-video";
    }

    element.id = positionName + "-video";
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

    const frameList = info.frameList;

    const reorderedList = [
      frameList[1],
      frameList[2],
      frameList[3],
      frameList[4],
      ...frameList.slice(5),
      frameList[0]
    ];

    info.frameList = reorderedList;
    assignCarouselPositions(reorderedList);
  };

  const rotateCarouselRight = () => {
    const info = carouselInformation;
    if (!info) return;

    const frameList = info.frameList;

    const reorderedList = [
      frameList[frameList.length - 1],
      frameList[0],
      frameList[1],
      frameList[2],
      frameList[3],
      ...frameList.slice(4, frameList.length - 1)
    ];

    info.frameList = reorderedList;
    assignCarouselPositions(reorderedList);
  };

  document.addEventListener("click", event => {
    if (event.target && event.target.id === "left-carousel-btn") {
      rotateCarouselLeft();
    }
    if (event.target && event.target.id === "right-carousel-btn") {
      rotateCarouselRight();
    }
  });

  (async () => {
    try {
      const response = await fetch("/curated");
      const responseText = await response.text();

      const parsedDocument = new DOMParser().parseFromString(
        responseText,
        "text/html"
      );

      const loadedPersistentPlayerElement =
        parsedDocument.getElementById("persistent-player");

      if (
        loadedPersistentPlayerElement &&
        loadedPersistentPlayerElement.innerHTML.trim()
      ) {
        persistentVideoPlayerElement.innerHTML =
          loadedPersistentPlayerElement.innerHTML;

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
    const responseText = await response.text();

    const parsedDocument = new DOMParser().parseFromString(
      responseText,
      "text/html"
    );

    const newContentElement = parsedDocument.querySelector("#content");
    if (newContentElement) {
      document.getElementById("content").innerHTML =
        newContentElement.innerHTML;
    }

    const newlyLoadedPersistentPlayer =
      parsedDocument.getElementById("persistent-player");

    if (
      newlyLoadedPersistentPlayer &&
      newlyLoadedPersistentPlayer.innerHTML.trim()
    ) {
      if (!persistentPlayerHasBeenPreloaded) {
        persistentVideoPlayerElement.innerHTML =
          newlyLoadedPersistentPlayer.innerHTML;
      }
      persistentVideoPlayerElement.style.display = "block";
    } else {
      persistentVideoPlayerElement.style.display = "none";
    }

    document.title = parsedDocument.title;

    sidebarNavigationItems.forEach(item =>
      item.classList.remove("active-tab")
    );
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

