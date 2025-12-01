window.addEventListener("DOMContentLoaded", () => {
    const navigationItems = document.querySelectorAll("#sidebar li[data-url]");

    window.loadPage = async function (url, clickedItem) {
        const reply = await fetch(url);
        const text = await reply.text();
        const parsed = new DOMParser().parseFromString(text, "text/html");

        const freshContent = parsed.querySelector("#content");
        if (freshContent) {
            document.getElementById("content").innerHTML = freshContent.innerHTML;
        }

        document.title = parsed.title;

        navigationItems.forEach(item => item.classList.remove("active-tab"));
        clickedItem.classList.add("active-tab");

        if (url.endsWith("/")) {
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

