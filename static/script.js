document.addEventListener('DOMContentLoaded', () => {
  const sidebarItems = document.querySelectorAll('#sidebar li[data-url]');
  const player = document.getElementById('persistent-player');
  let playerPreloaded = false;

  let carouselState = null;

  const getCarouselState = () => {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return null;

    const hiddenLeft = carousel.querySelector('#hidden-preloaded-left-video');
    const left = carousel.querySelector('#left-video');
    const center = carousel.querySelector('#center-video');
    const right = carousel.querySelector('#right-video');
    const hiddenRight = carousel.querySelector('#hidden-preloaded-right-video');
    const hiddenUnloadedRight = carousel.querySelector('#hidden-unloaded-right-video');
    if (!hiddenLeft || !left || !center || !right || !hiddenRight || !hiddenUnloadedRight) return null;

    carouselState = {
      carousel,
      videos: [hiddenLeft, left, center, right, hiddenRight, hiddenUnloadedRight]
    };
    return carouselState;
  };

  const setRole = (el, role, order) => {
    if (role === 'center') el.className = 'center-video';
    else if (role === 'left') el.className = 'side-video left-video';
    else if (role === 'right') el.className = 'side-video right-video';
    else el.className = 'hidden-video';
    el.id = `${role}-video`;
    el.style.order = String(order);
  };

  const applyRoles = (v) => {
    setRole(v[0], 'hidden-preloaded-left', 0);
    setRole(v[1], 'left', 1);
    setRole(v[2], 'center', 2);
    setRole(v[3], 'right', 3);
    setRole(v[4], 'hidden-preloaded-right', 4);
    setRole(v[5], 'hidden-unloaded-right', 5);
  };

  function rotateLeft() {
    const state = getCarouselState();
    if (!state) return;
    const v = state.videos;
    const rotated = [v[1], v[2], v[3], v[4], v[5], v[0]];
    state.videos = rotated;
    applyRoles(rotated);
  }

  function rotateRight() {
    const state = getCarouselState();
    if (!state) return;
    const v = state.videos;
    const rotated = [v[5], v[0], v[1], v[2], v[3], v[4]];
    state.videos = rotated;
    applyRoles(rotated);
  }

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'left-carousel-btn') rotateLeft();
    if (e.target && e.target.id === 'right-carousel-btn') rotateRight();
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
        carouselState = null;
        player.style.display = 'block';
        player.style.visibility = 'hidden';

        requestAnimationFrame(() => {
          player.style.display = 'none';
          player.style.visibility = '';
          playerPreloaded = true;
        });
      }
    } catch (e) {}
  })();

  async function loadPage(url, clickedItem) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    const newContent = doc.querySelector('#content');
    if (newContent) document.getElementById('content').innerHTML = newContent.innerHTML;

    const newPlayer = doc.getElementById('persistent-player');
    if (newPlayer && newPlayer.innerHTML.trim()) {
      if (!playerPreloaded) {
        player.innerHTML = newPlayer.innerHTML;
        carouselState = null;
      }
      player.style.display = 'block';
    } else {
      player.style.display = 'none';
    }

    document.title = doc.title;

    sidebarItems.forEach((i) => i.classList.remove('active-tab'));
    clickedItem.classList.add('active-tab');
  }

  sidebarItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      loadPage(item.dataset.url, item);
    });
  });
});
