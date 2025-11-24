document.addEventListener('DOMContentLoaded', () => {
    const sidebarItems = document.querySelectorAll('#sidebar li[data-url]');
    const player = document.getElementById('persistent-player');

    // preload persistent player from the curated page so video starts playing immediately in the background
    (async () => {
        try {
            const res = await fetch('/curated');
            const txt = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(txt, 'text/html');
            const pp = doc.getElementById('persistent-player');
            if (pp && pp.innerHTML.trim()) {
                // inject the player iframe
                player.innerHTML = pp.innerHTML;
                // briefly make it visible but hidden to trigger loading
                player.style.display = 'block';
                player.style.visibility = 'hidden';
                requestAnimationFrame(() => {
                    player.style.display = 'none';
                    player.style.visibility = '';
                });
            }
        } catch (e) {
            console.error(e);
        }
    })();

    async function loadPage(url, clickedItem) {
        const response = await fetch(url);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const newContent = doc.querySelector('#content');
        if (newContent) {
            document.getElementById('content').innerHTML = newContent.innerHTML;
        }

        const newPlayer = doc.getElementById('persistent-player');
        if (newPlayer && newPlayer.innerHTML.trim()) {
            player.style.display = 'block';
        } else {
            player.style.display = 'none';
        }

        document.title = doc.title;

        sidebarItems.forEach(i => i.classList.remove('active-tab'));
        clickedItem.classList.add('active-tab');
    }

    sidebarItems.forEach(item => {
        item.addEventListener('click', event => {
            event.preventDefault();
            loadPage(item.dataset.url, item);
        });
    });
});

