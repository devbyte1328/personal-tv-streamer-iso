(function () {
  'use strict';

  const { state } = window.STNAV_CORE;

  const numberSym = {
    '`': ['`', '~'],
    '1': ['1', '!'],
    '2': ['2', '@'],
    '3': ['3', '#'],
    '4': ['4', '$'],
    '5': ['5', '%'],
    '6': ['6', '^'],
    '7': ['7', '&'],
    '8': ['8', '*'],
    '9': ['9', '('],
    '0': ['0', ')'],
    '-': ['-', '_'],
    '=': ['=', '+'],
  };

  const punctSym = {
    '[': ['[', '{'],
    ']': [']', '}'],
    '\\': ['\\', '|'],
    ';': [';', ':'],
    "'": ["'", '"'],
    ',': [',', '<'],
    '.': ['.', '>'],
    '/': ['/', '?'],
  };

  const layout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
    ['🌐', 'SPACE', '⬅', '➡'],
  ];

  const wide = { SPACE: 8, BACKSPACE: 2, CAPS: 2, SHIFT: 2.5, ENTER: 2.5, '🌐': 2 };

  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = 'http://localhost:8080/static/navigation/virtual_keyboard.css';
  document.head.appendChild(cssLink);

  const vk = document.createElement('div');
  vk.id = 'stnav_virtual_keyboard';

  const display = document.createElement('div');
  display.id = 'stnav_vk_display';
  vk.appendChild(display);

  const keyRows = [];
  const keys = [];

  layout.forEach((row, ri) => {
    const r = document.createElement('div');
    r.className = 'stnav_vk_row';
    const rk = [];
    row.forEach((label, ci) => {
      const k = document.createElement('div');
      k.className = 'stnav_vk_key';
      k.textContent = label;
      k.dataset.key = label;
      k.dataset.row = ri;
      k.dataset.col = ci;
      k.style.flex = wide[label] ? String(wide[label]) : '1';
      r.appendChild(k);
      rk.push(k);
      keys.push(k);
    });
    keyRows.push(rk);
    vk.appendChild(r);
  });

  document.body.appendChild(vk);

  let current = null;
  let vkInputTarget = null;
  let caps = false;
  let shift = false;
  let autoFirstCap = true;

  let TIP = null;
  if (window.TextInputProcessor) {
    try {
      TIP = new TextInputProcessor();
      TIP.beginInputTransaction(document);
    } catch (e) {
      TIP = null;
    }
  }

  const isText = (el) =>
    el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

  const findInput = () =>
    document.activeElement && isText(document.activeElement)
      ? document.activeElement
      : document.querySelector('input[type="search"],input[role="searchbox"],input[type="text"],textarea');

  const firstCharMode = () => {
    if (!vkInputTarget) return false;
    if (!autoFirstCap) return false;
    return (vkInputTarget.value || '').length === 0;
  };

  const updateDisplay = () => {
    if (!vkInputTarget) {
      display.textContent = '';
      return;
    }
    const val = vkInputTarget.value || '';
    const s = vkInputTarget.selectionStart || 0;
    display.innerHTML = '';
    const before = document.createTextNode(val.slice(0, s));
    const caret = document.createElement('span');
    caret.className = 'stnav_vk_caret';
    const after = document.createTextNode(val.slice(s));
    display.appendChild(before);
    display.appendChild(caret);
    display.appendChild(after);
  };

  const updateLabels = () => {
    const first = firstCharMode();
    keys.forEach((k) => {
      const base = k.dataset.key;
      if (base.length === 1) {
        if (/^[A-Za-z]$/.test(base)) {
          if (first) k.textContent = base.toUpperCase();
          else k.textContent = caps ^ shift ? base.toUpperCase() : base.toLowerCase();
        } else if (numberSym[base]) {
          const pair = numberSym[base];
          k.textContent = caps || shift ? pair[1] : pair[0];
        } else if (punctSym[base]) {
          const pair = punctSym[base];
          k.textContent = shift ? pair[1] : pair[0];
        } else {
          k.textContent = base;
        }
      }
    });
    updateDisplay();
  };

  const selectKey = (el) => {
    if (current) current.classList.remove('stnav_vk_selected');
    current = el;
    el.classList.add('stnav_vk_selected');
    const r = el.getBoundingClientRect();
    const m = 20;
    if (r.top < m || r.bottom > innerHeight - m) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const computeBaseHeight = () => {
    const base = Math.min(400, window.innerHeight * 0.55);
    return Math.max(350, base);
  };

  const adjustVKPosition = () => {
    const extra = window.outerHeight - window.innerHeight;
    const offset = extra > 0 ? Math.round(extra / 2) : 0;
    const height = computeBaseHeight() + offset;
    vk.style.bottom = '0px';
    vk.style.height = `${height}px`;
  };

  window.addEventListener('resize', adjustVKPosition);
  window.addEventListener('fullscreenchange', adjustVKPosition);
  adjustVKPosition();

  const showVK = () => {
    vkInputTarget = findInput();
    autoFirstCap = true;
    updateLabels();
    updateDisplay();
    adjustVKPosition();
    vk.style.display = 'flex';
    selectKey(keyRows[0][0]);
  };

  const hideVK = () => {
    vk.style.display = 'none';
    if (current) current.classList.remove('stnav_vk_selected');
    current = null;
  };

  const clearAll = () => {
    if (!vkInputTarget) return;
    vkInputTarget.value = '';
    vkInputTarget.dispatchEvent(new Event('input', { bubbles: true }));
    autoFirstCap = true;
    updateDisplay();
  };

  const outputChar = (ch) => {
    if (!vkInputTarget) return;
    vkInputTarget.focus();
    if (TIP) {
      TIP.flushPendingComposition();
      TIP.commitComposition(ch);
      updateDisplay();
      return;
    }
    const val = vkInputTarget.value;
    const s = vkInputTarget.selectionStart;
    const e = vkInputTarget.selectionEnd;
    const nv = val.slice(0, s) + ch + val.slice(e);
    vkInputTarget.value = nv;
    vkInputTarget.setSelectionRange(s + ch.length, s + ch.length);
    vkInputTarget.dispatchEvent(new Event('input', { bubbles: true }));
    autoFirstCap = false;
    updateDisplay();
  };

  const delChar = () => {
    if (!vkInputTarget) return;
    vkInputTarget.focus();
    if (TIP) {
      TIP.flushPendingComposition();
      TIP.commitComposition('\b');
      updateDisplay();
      return;
    }
    const val = vkInputTarget.value;
    const s = vkInputTarget.selectionStart;
    const e = vkInputTarget.selectionEnd;
    if (s === 0 && e === 0) return;
    const from = s === e ? s - 1 : s;
    const nv = val.slice(0, from) + val.slice(e);
    vkInputTarget.value = nv;
    vkInputTarget.setSelectionRange(from, from);
    vkInputTarget.dispatchEvent(new Event('input', { bubbles: true }));
    if (vkInputTarget.value.length === 0) autoFirstCap = true;
    updateDisplay();
  };

  const center = (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  const moveVK = (dir) => {
    if (!current) return;
    const k = current.dataset.key;
    if (dir === 'down' && (k === '[' || k === ']' || k === '\\')) {
      const t = keys.find((x) => x.dataset.key === 'ENTER');
      if (t) return selectKey(t);
    }
    if (dir === 'up' && (k === '.' || k === '/')) {
      const t = keys.find((x) => x.dataset.key === 'ENTER');
      if (t) return selectKey(t);
    }
    if (dir === 'up' && k === 'ENTER') {
      const t = keys.find((x) => x.dataset.key === ']');
      if (t) return selectKey(t);
    }
    const [cx, cy] = center(current);
    let best = null;
    let bestScore = Infinity;
    let bestP = Infinity;
    keys.forEach((keyEl) => {
      if (keyEl === current) return;
      const [x, y] = center(keyEl);
      let dx = x - cx;
      let dy = y - cy;
      let p, s;
      if (dir === 'up') {
        p = cy - y;
        if (p <= 1) return;
        s = Math.abs(dx);
      } else if (dir === 'down') {
        p = y - cy;
        if (p <= 1) return;
        s = Math.abs(dx);
      } else if (dir === 'left') {
        p = cx - x;
        if (p <= 1) return;
        s = Math.abs(dy);
      } else if (dir === 'right') {
        p = x - cx;
        if (p <= 1) return;
        s = Math.abs(dy);
      } else return;
      const w = dir === 'left' || dir === 'right' ? 30 : 2;
      const sc = p + s * w;
      if (sc < bestScore || (sc === bestScore && p < bestP)) {
        best = keyEl;
        bestScore = sc;
        bestP = p;
      }
    });
    if (best) selectKey(best);
  };

  const keyOutput = (key) => {
    if (/^[a-z]$/i.test(key)) {
      if (firstCharMode()) return key.toUpperCase();
      return caps ^ shift ? key.toUpperCase() : key.toLowerCase();
    }
    if (numberSym[key]) {
      const pair = numberSym[key];
      return caps || shift ? pair[1] : pair[0];
    }
    if (punctSym[key]) {
      const pair = punctSym[key];
      return shift ? pair[1] : pair[0];
    }
    return key;
  };

  const moveCursor = (dir) => {
    if (!vkInputTarget) return;
    vkInputTarget.focus();
    const val = vkInputTarget.value || '';
    const s = vkInputTarget.selectionStart;
    const e = vkInputTarget.selectionEnd;
    const pos = dir === 'left' ? Math.max(0, s - 1) : Math.min(val.length, e + 1);
    vkInputTarget.setSelectionRange(pos, pos);
    if (vkInputTarget.value.length === 0) autoFirstCap = true;
    updateLabels();
  };

  const press = (el) => {
    const key = el.dataset.key;
    if (key === 'SHIFT') {
      if (firstCharMode()) {
        autoFirstCap = false;
      } else {
        shift = !shift;
        vk.classList.toggle('stnav_vk_shift_on', shift);
      }
      updateLabels();
      return;
    }
    if (key === 'CAPS') {
      caps = !caps;
      vk.classList.toggle('stnav_vk_caps_on', caps);
      updateLabels();
      return;
    }
    if (key === 'BACKSPACE') {
      delChar();
      shift = false;
      vk.classList.remove('stnav_vk_shift_on');
      updateLabels();
      return;
    }
    if (key === 'ENTER') {
      hideVK();
      state.typingMode = false;
      state.navEnabled = false;
      Promise.resolve().then(() => {
        if (vkInputTarget) {
          vkInputTarget.focus();
          const v = vkInputTarget.value || '';
          vkInputTarget.setSelectionRange(v.length, v.length);
        }
        state.ws.send('SearchEnter');
      });
      return;
    }
    if (key === 'SPACE') {
      outputChar(' ');
      shift = false;
      vk.classList.remove('stnav_vk_shift_on');
      updateLabels();
      return;
    }
    if (key === '🌐') {
      shift = false;
      vk.classList.remove('stnav_vk_shift_on');
      updateLabels();
      return;
    }
    if (key === '⬅') {
      moveCursor('left');
      shift = false;
      vk.classList.remove('stnav_vk_shift_on');
      updateLabels();
      return;
    }
    if (key === '➡') {
      moveCursor('right');
      shift = false;
      vk.classList.remove('stnav_vk_shift_on');
      updateLabels();
      return;
    }
    const ch = keyOutput(key);
    if (ch) {
      outputChar(ch);
      shift = false;
      vk.classList.remove('stnav_vk_shift_on');
      updateLabels();
    }
  };

  document.addEventListener(
    'keydown',
    (e) => {
      if (!state.typingMode) return;
      e.preventDefault();
      e.stopPropagation();
      const k = e.key;
      if (k === 'Escape') {
        clearAll();
        state.typingMode = false;
        hideVK();
        return;
      }
      if (k === 'ArrowLeft') return moveVK('left');
      if (k === 'ArrowRight') return moveVK('right');
      if (k === 'ArrowUp') return moveVK('up');
      if (k === 'ArrowDown') return moveVK('down');
      if (k === 'Enter') return press(current);
    },
    true,
  );

  vk.addEventListener('click', (e) => {
    if (!state.typingMode) return;
    const el = e.target.closest('.stnav_vk_key');
    if (!el) return;
    selectKey(el);
    press(el);
  });

  setInterval(() => {
    if (state.typingMode && vk.style.display === 'none') showVK();
    if (!state.typingMode && vk.style.display !== 'none') hideVK();
    updateDisplay();
    adjustVKPosition();
  }, 120);

  let lastURL = location.href;
  const restoreNav = () => {
    if (location.href !== lastURL) {
      lastURL = location.href;
      state.navEnabled = true;
    }
  };

  window.addEventListener('popstate', restoreNav);
  window.addEventListener('hashchange', restoreNav);
  const obs = new MutationObserver(restoreNav);
  obs.observe(document, { subtree: true, childList: true });

})();

