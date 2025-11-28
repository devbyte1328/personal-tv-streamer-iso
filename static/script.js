document.addEventListener('DOMContentLoaded', () => {
  const sidebarItems = document.querySelectorAll('#sidebar li[data-url]');
  const player = document.getElementById('persistent-player');
  let playerPreloaded = false;
  let carouselState = null;

  const videoIds = [
    "jH5Gq7G4X-s",
    "on1pjsxYOwc",
    "5BPTO2_-zUs",
    "FHPKkKc2hE4",
    "2rVvvu7aMQQ",
    "STZCFSWRDq8",
    "k3u4uUaiH_4",
    "dP-81C_tckU",
    "HDqPksuZE-k",
    "X2NuC5qNn8o"
  ];

  const buildCarousel = () => {
    const c = document.getElementById('carousel-container');
    c.innerHTML = '';
    videoIds.forEach((id, i) => {
      const f = document.createElement('iframe');
      if (i < 5) {
        const url = "https://www.youtube.com/embed/" + id + "?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1&loop=1&playlist=" + id;
        f.src = url;
      } else {
        f.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
      }
      c.appendChild(f);
    });
    const videos = Array.from(c.querySelectorAll('iframe'));
    carouselState = { carousel: c, videos };
    applyRoles(videos);
  };

  const setRole = (el, role, order) => {
    if (role === 'center') el.className = 'center-video';
    else if (role === 'left') el.className = 'side-video left-video';
    else if (role === 'right') el.className = 'side-video right-video';
    else el.className = 'hidden-video';
    el.id = role + '-video';
    el.style.order = String(order);
  };

  const applyRoles = (v) => {
    setRole(v[0], 'hidden-preloaded-left', 0);
    setRole(v[1], 'left', 1);
    setRole(v[2], 'center', 2);
    setRole(v[3], 'right', 3);
    setRole(v[4], 'hidden-preloaded-right', 4);
    let o = 5;
    for (let i = 5; i < v.length; i++) {
      setRole(v[i], 'hidden-unloaded-' + (i - 4), o);
      o++;
    }
  };

  const rotateLeft = () => {
    const s = carouselState || getState();
    if (!s) return;
    const v = s.videos;
    const r = [v[1], v[2], v[3], v[4], v[5], ...v.slice(6), v[0]];
    s.videos = r;
    applyRoles(r);
  };

  const rotateRight = () => {
    const s = carouselState || getState();
    if (!s) return;
    const v = s.videos;
    const r = [v[v.length - 1], v[0], v[1], v[2], v[3], v[4], ...v.slice(5, v.length - 1)];
    s.videos = r;
    applyRoles(r);
  };

  const getState = () => {
    const c = document.getElementById('carousel-container');
    if (!c) return null;
    const videos = Array.from(c.querySelectorAll('iframe'));
    if (!videos.length) return null;
    carouselState = { carousel: c, videos };
    return carouselState;
  };

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'left-carousel-btn') rotateLeft();
    if (e.target && e.target.id === 'right-carousel-btn') rotateRight();
  });

  (async () => {
    try {
      const r = await fetch('/curated');
      const t = await r.text();
      const p = new DOMParser().parseFromString(t, 'text/html');
      const pp = p.getElementById('persistent-player');
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
    } catch {}
  })();

  async function loadPage(url, clickedItem) {
    const r = await fetch(url);
    const t = await r.text();
    const p = new DOMParser().parseFromString(t, 'text/html');

    const newContent = p.querySelector('#content');
    if (newContent) document.getElementById('content').innerHTML = newContent.innerHTML;

    const np = p.getElementById('persistent-player');
    if (np && np.innerHTML.trim()) {
      if (!playerPreloaded) {
        player.innerHTML = np.innerHTML;
        carouselState = null;
      }
      player.style.display = 'block';
    } else {
      player.style.display = 'none';
    }

    document.title = p.title;

    sidebarItems.forEach((i) => i.classList.remove('active-tab'));
    clickedItem.classList.add('active-tab');

    buildCarousel();
  }

  sidebarItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      loadPage(item.dataset.url, item);
    });
  });

  buildCarousel();
});

