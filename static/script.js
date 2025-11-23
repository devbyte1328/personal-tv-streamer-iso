document.addEventListener('DOMContentLoaded', () => {
    const sidebarItems = document.querySelectorAll('#sidebar li[data-url]');
    const player = document.getElementById('persistent-player');

    async function loadPage(url, clickedItem) {
        const response = await fetch(url);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        document.getElementById('content').innerHTML =
            doc.querySelector('#content').innerHTML;

        document.title = doc.title;

        sidebarItems.forEach(i => i.classList.remove('active-tab'));
        clickedItem.classList.add('active-tab');

        if (url.includes('/curated')) {
            player.style.display = 'block';
        } else {
            player.style.display = 'none';
        }
    }

    sidebarItems.forEach(item => {
        item.addEventListener('click', event => {
            event.preventDefault();
            loadPage(item.dataset.url, item);
        });
    });
});

