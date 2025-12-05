window.addEventListener("DOMContentLoaded", () => {
    const navigationItems = document.querySelectorAll("#sidebar li[data-url]");

    const websocketLink = new WebSocket("ws://localhost:8765");
    websocketLink.onopen = () => {
        window.websocketLink = websocketLink;
    };

    window.loadPage = async function (requestedPageUrl, selectedNavigationItem) {
        const responseContent = await fetch(requestedPageUrl);
        const responseText = await responseContent.text();
        const parsedDocument = new DOMParser().parseFromString(responseText, "text/html");

        const newContentElement = parsedDocument.querySelector("#content");
        if (newContentElement) {
            document.getElementById("content").innerHTML = newContentElement.innerHTML;
        }

        document.title = parsedDocument.title;

        navigationItems.forEach(item => item.classList.remove("active-tab"));
        selectedNavigationItem.classList.add("active-tab");

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

