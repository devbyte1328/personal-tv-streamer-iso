document.addEventListener('DOMContentLoaded', () => {
    const sidebarItems = document.querySelectorAll('#sidebar li[data-url]');
    const player = document.getElementById('persistent-player');

    let playerPreloaded = false;

    document.addEventListener('click', e => {
        if (e.target && e.target.id === 'left-carousel-btn') {
            console.log("Pressed Left Carousel Button!");
        }
        if (e.target && e.target.id === 'right-carousel-btn') {
            console.log("Pressed Right Carousel Button!");
        }
    });

    (async () => {
        try {
            const res = await fetch('/curated');
            const txt = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(txt, 'text/html');
            const pp = doc.getElementById('persistent-player');

            if (pp && pp.innerHTML.trim()) {
                player.innerHTML = pp.innerHTML;
                player.style.display = 'block';
                player.style.visibility = 'hidden';

                requestAnimationFrame(() => {
                    player.style.display = 'none';
                    player.style.visibility = '';
                    playerPreloaded = true;
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
            if (!playerPreloaded) {
                player.innerHTML = newPlayer.innerHTML;
            }
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

