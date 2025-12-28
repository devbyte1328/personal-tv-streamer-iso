window.addEventListener("DOMContentLoaded", () => {
    const navigationItems = document.querySelectorAll("#sidebar li[data-url]");
    const sidebarListElement = document.querySelector("#sidebar ul");

    const websocketLink = new WebSocket("ws://localhost:8765");
    websocketLink.onopen = () => {
        window.websocketLink = websocketLink;
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

