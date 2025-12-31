window.addEventListener("DOMContentLoaded", () => {
    const navigationItems = document.querySelectorAll("#sidebar li[data-url]");
    const sidebarListElement = document.querySelector("#sidebar ul");

    const updateOverlayElement = document.createElement("div");
    updateOverlayElement.style.position = "fixed";
    updateOverlayElement.style.top = "0";
    updateOverlayElement.style.left = "0";
    updateOverlayElement.style.width = "100%";
    updateOverlayElement.style.height = "100%";
    updateOverlayElement.style.background = "rgba(0,0,0,0.6)";
    updateOverlayElement.style.display = "none";
    updateOverlayElement.style.zIndex = "9999";
    updateOverlayElement.style.alignItems = "center";
    updateOverlayElement.style.justifyContent = "center";
    updateOverlayElement.style.flexDirection = "column";
    updateOverlayElement.style.color = "#ffffff";
    updateOverlayElement.style.fontSize = "24px";
    updateOverlayElement.style.fontFamily = "sans-serif";


    const updateTextElement = document.createElement("div");
    updateTextElement.textContent = "Updating system…";

    const updateSpinnerElement = document.createElement("div");
    updateSpinnerElement.style.marginTop = "20px";
    updateSpinnerElement.style.width = "48px";
    updateSpinnerElement.style.height = "48px";
    updateSpinnerElement.style.border = "6px solid #ffffff";
    updateSpinnerElement.style.borderTop = "6px solid transparent";
    updateSpinnerElement.style.borderRadius = "50%";
    updateSpinnerElement.style.animation = "spin 1s linear infinite";

    const spinnerStyleElement = document.createElement("style");
    spinnerStyleElement.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(spinnerStyleElement);

    updateOverlayElement.appendChild(updateTextElement);
    updateOverlayElement.appendChild(updateSpinnerElement);
    document.body.appendChild(updateOverlayElement);

    const websocketLink = new WebSocket("ws://localhost:8765");
    websocketLink.onopen = () => {
        window.websocketLink = websocketLink;
    };

    websocketLink.onmessage = event => {
        if (event.data === "UpdateStarted") {
            updateOverlayElement.style.display = "flex";
            updateTextElement.textContent = "Updating system…";
        }
        if (event.data === "UpdateProgress") {
            updateTextElement.textContent = "Applying update…";
        }
        if (event.data === "UpdateFinished" || event.data === "UpdateFailed") {
            updateOverlayElement.style.display = "none";
        }
    };

    fetch("/update")
        .then(response => response.json())
        .then(updateExists => {
            if (updateExists === true) {
                const updateNavigationItem = document.createElement("li");
                updateNavigationItem.textContent = "Update";
                updateNavigationItem.classList.add("update-indicator");

                updateNavigationItem.addEventListener("click", event => {
                    event.preventDefault();
                    if (websocketLink && websocketLink.readyState === WebSocket.OPEN) {
                        websocketLink.send("UpdateRequest");
                    }
                });

                sidebarListElement.appendChild(updateNavigationItem);
            }
        });

    window.loadPage = async function (requestedPageUrl, selectedNavigationItem) {
        const responseContent = await fetch(requestedPageUrl);
        const responseText = await responseContent.text();
        const parsedDocument = new DOMParser().parseFromString(responseText, "text/html");

        const newContentElement = parsedDocument.querySelector("#content");
        if (newContentElement) {
            document.getElementById("content").innerHTML = newContentElement.innerHTML;
        }

        document.title = parsedDocument.title;

        document.querySelectorAll("#sidebar li").forEach(item => item.classList.remove("active-tab"));
        if (selectedNavigationItem) {
            selectedNavigationItem.classList.add("active-tab");
        }

        if (websocketLink && websocketLink.readyState === WebSocket.OPEN) {
            websocketLink.send("FocusLocalhostBackground");
        }

        if (requestedPageUrl.endsWith("/")) {
            window.dispatchEvent(new Event("home-page-loaded"));
        }
    };

    navigationItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            window.loadPage(item.dataset.url, item);
        });
    });
});

