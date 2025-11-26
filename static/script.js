document.addEventListener('DOMContentLoaded', () => {
  const sidebarItems = document.querySelectorAll('#sidebar li[data-url]');
  const player = document.getElementById('persistent-player');
  let playerPreloaded = false;

  let carouselState = null;

  const getCarouselState = () => {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return null;

    const left = carousel.querySelector('#left-video');
    const center = carousel.querySelector('#center-video');
    const right = carousel.querySelector('#right-video');
    if (!left || !center || !right) return null;

    if (
      carouselState &&
      carouselState.carousel === carousel &&
      carousel.contains(carouselState.left) &&
      carousel.contains(carouselState.center) &&
      carousel.contains(carouselState.right)
    ) {
      return carouselState;
    }

    carouselState = { carousel, left, center, right };
    return carouselState;
  };

  const setRole = (el, role, order) => {
    el.className = role === 'center' ? 'center-video' : `side-video ${role}-video`;
    el.id = `${role}-video`;
    el.style.order = String(order);
  };

  const applyRoles = (left, center, right) => {
    setRole(left, 'left', 0);
    setRole(center, 'center', 1);
    setRole(right, 'right', 2);
    carouselState = { ...(carouselState || {}), left, center, right };
  };

  function rotateLeft() {
    const state = getCarouselState();
    if (!state) return;

    const { left, center, right } = state;
    applyRoles(right, left, center);
  }

  function rotateRight() {
    const state = getCarouselState();
    if (!state) return;

    const { left, center, right } = state;
    applyRoles(left, right, center);
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

