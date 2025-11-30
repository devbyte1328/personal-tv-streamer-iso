window.addEventListener("DOMContentLoaded", () => {
    const navigationItems = document.querySelectorAll("#sidebar li[data-url]");

    window.loadPage = async function (url, navigationItem) {
        const reply = await fetch(url);
        const raw = await reply.text();
        const parsed = new DOMParser().parseFromString(raw, "text/html");

        const freshContent = parsed.querySelector("#content");
        if (freshContent) {
            document.getElementById("content").innerHTML = freshContent.innerHTML;
        }

        document.title = parsed.title;

        navigationItems.forEach(x => x.classList.remove("active-tab"));
        navigationItem.classList.add("active-tab");
    };

    navigationItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            window.loadPage(item.dataset.url, item);
        });
    });
});

