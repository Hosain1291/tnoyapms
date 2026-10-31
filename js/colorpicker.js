/* 색 고르기 창: 색상판 · 색조 막대 · HEX/RGB 입력 · 추천색 · 최근 색
   스포이드: ① 화면 스포이드(크롬·엣지 PC) ② 이미지에서 고르기 ③ 지도에서 고르기 */

const CP_PRESETS = ['#d23c3c', '#9e2a2b', '#e06070', '#e39a2d', '#c9b02c', '#45a157', '#2fa7a0', '#2aa6ad',
  '#3d7bd9', '#2f4f9c', '#8e5bd0', '#d14d82', '#9a6332', '#6b4a33', '#9aa3a8', '#4a4f55', '#eaeaea', '#111111'];
let cp = { h: 0, s: 0, v: 0, old: '#000000', cb: null }, mapPickCb = null;

const cpHexToHsv = hex => {
  let [r, g, b] = hexRgb(hex).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return { h, s: mx ? d / mx : 0, v: mx };
};
const cpHsvToHex = (h, s, v) => {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return toHex([f(5), f(3), f(1)].map(x => x * 255));
};
const cpHex = () => cpHsvToHex(cp.h, cp.s, cp.v);
const cpValid = s => /^#?[0-9a-f]{6}$/i.test(s.trim()) ? '#' + s.trim().replace('#', '').toLowerCase() : (/^#?[0-9a-f]{3}$/i.test(s.trim()) ? '#' + s.trim().replace('#', '').split('').map(c => c + c).join('').toLowerCase() : null);

function cpRecent() { try { return JSON.parse(localStorage.getItem('tnomap:recentColors')) || []; } catch (e) { return []; } }
function cpPushRecent(c) { try { const r = [c, ...cpRecent().filter(x => x !== c)].slice(0, 12); localStorage.setItem('tnomap:recentColors', JSON.stringify(r)); } catch (e) { } }

function openColorPicker(initial, cb) {
  const c = cpValid(initial || '') || '#888888';
  cp = { ...cpHexToHsv(c), old: c, cb };
  $('#cpOld').style.background = c;
  $('#cpImgWrap').hidden = true;
  cpRender(false); cpSwatches();
  $('#mColor').classList.add('open');
}

function cpRender(fire = true) {
  const hex = cpHex();
  $('#cpSV').style.backgroundColor = cpHsvToHex(cp.h, 1, 1);
  $('#cpSVk').style.left = (cp.s * 100) + '%'; $('#cpSVk').style.top = ((1 - cp.v) * 100) + '%'; $('#cpSVk').style.background = hex;
  $('#cpHk').style.left = (cp.h / 360 * 100) + '%'; $('#cpHk').style.background = cpHsvToHex(cp.h, 1, 1);
  $('#cpNew').style.background = hex;
  if (document.activeElement !== $('#cpHex')) $('#cpHex').value = hex;
  const [r, g, b] = hexRgb(hex);
  [['#cpR', r], ['#cpG', g], ['#cpB', b]].forEach(([s, v]) => { if (document.activeElement !== $(s)) $(s).value = v; });
  if (fire && cp.cb) cp.cb(hex);
}
function cpSet(hex) { const c = cpValid(hex); if (!c) return; Object.assign(cp, cpHexToHsv(c)); cpRender(); }

function cpSwatches() {
  const mk = list => list.map(c => `<button class="cpsw" style="background:${c}" data-c="${c}" title="${c}"></button>`).join('');
  const mapCols = MAP && MAP.parties ? [...new Set(MAP.parties.flatMap(([, c]) => Array.isArray(c) ? c.slice(0, 3) : [c]))] : [];
  $('#cpPresets').innerHTML = (mapCols.length ? `<div class="cp-sub">이 지도의 기본 정당 색</div>` + mk(mapCols) + `<div class="cp-sub">기타</div>` : '') + mk(CP_PRESETS);
  const r = cpRecent(); $('#cpRecent').innerHTML = r.length ? mk(r) : '<span class="hint" style="margin:0">아직 없어요</span>';
}

/* 끌어서 고르기 (마우스·터치 공통) */
function cpDrag(el, onMove) {
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) { }
    const mv = ev => { const r = el.getBoundingClientRect(); onMove(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height))); };
    mv(e);
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}

/* 지도의 선거구 색 읽기 (줄무늬면 가장 큰 몫의 색) */
function fillColorOf(id) {
  const f = els[id] && els[id].getAttribute('fill'); if (!f) return null;
  if (f.startsWith('#')) return f;
  const m = f.match(/url\(#([^)]+)\)/); if (!m) return null;
  const r = document.getElementById(m[1]); const rect = r && r.querySelector('rect[fill^="#"]');
  return rect ? rect.getAttribute('fill') : null;
}

function initColorPicker() {
  initPageDropper();
  cpDrag($('#cpSV'), (x, y) => { cp.s = x; cp.v = 1 - y; cpRender(); });
  cpDrag($('#cpH'), x => { cp.h = Math.min(359.9, x * 360); cpRender(); });
  $('#cpHex').addEventListener('input', () => { const c = cpValid($('#cpHex').value); if (c) { Object.assign(cp, cpHexToHsv(c)); cpRender(); } });
  ['#cpR', '#cpG', '#cpB'].forEach(s => $(s).addEventListener('input', () => {
    const v = ['#cpR', '#cpG', '#cpB'].map(q => Math.max(0, Math.min(255, parseInt($(q).value) || 0)));
    Object.assign(cp, cpHexToHsv(toHex(v))); cpRender();
  }));
  $('#mColor').addEventListener('click', e => { const b = e.target.closest('.cpsw'); if (b) cpSet(b.dataset.c); });
  $('#cpOld').onclick = () => cpSet(cp.old);
  $('#cpOk').onclick = () => { cpPushRecent(cpHex()); $('#mColor').classList.remove('open'); };
  $('#cpCancel').onclick = $('#cpX').onclick = () => { cpSet(cp.old); $('#mColor').classList.remove('open'); };

  // ① 화면 스포이드
  $('#cpDrop').onclick = async () => {
    // 크롬·엣지: 브라우저 기본 스포이드
    if (window.EyeDropper) {
      try { const r = await new EyeDropper().open(); cpSet(r.sRGBHex); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }  // 막혀 있으면 아래 화면 캡처 방식으로
    }
    // 파이어폭스·사파리·휴대폰: 화면 공유 없이 이 페이지 안에서 바로 고르기
    pageDropper();
  };

  // ② 이미지에서 고르기
  $('#cpImgBtn').onclick = () => $('#cpFile').click();
  $('#cpFile').onchange = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const cv = $('#cpCanvas'), maxW = 600, sc = Math.min(1, maxW / img.width);
      cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      $('#cpImgWrap').hidden = false; URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };
  const pickAt = (e, commit) => {
    const cv = $('#cpCanvas'), r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * cv.width), y = Math.floor((e.clientY - r.top) / r.height * cv.height);
    if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return;
    const d = cv.getContext('2d').getImageData(x, y, 1, 1).data; const hex = toHex([d[0], d[1], d[2]]);
    $('#cpLens').style.background = hex; $('#cpLensTxt').textContent = hex;
    if (commit) cpSet(hex);
  };
  $('#cpCanvas').addEventListener('pointermove', e => pickAt(e, e.buttons > 0 || e.pointerType === 'touch'));
  $('#cpCanvas').addEventListener('pointerdown', e => pickAt(e, true));
  $('#cpImgClose').onclick = () => { $('#cpImgWrap').hidden = true; };

  // ③ 지도에서 고르기
  $('#cpMapBtn').onclick = () => {
    const open = $$('.modal.open'); open.forEach(m => m.classList.remove('open'));
    toast('지도에서 색을 가져올 선거구를 누르세요.');
    mapPickCb = id => {
      mapPickCb = null; open.forEach(m => m.classList.add('open'));
      const c = fillColorOf(id); if (c) cpSet(c); else toast('이 선거구에서는 색을 읽지 못했어요.');
    };
  };
}

/* 색 칸(버튼)을 색 고르기 창과 연결: <button class="cbtn" data-...> */
function colorButton(btn, get, set) {
  const paint = () => { btn.style.background = get(); btn.title = get(); };
  btn.onclick = () => openColorPicker(get(), c => { set(c); paint(); });
  paint(); return paint;
}

/* ---------- 페이지 스포이드 (EyeDropper가 없는 브라우저용, 화면 공유 없음) ----------
   지도 위: 지금 보이는 지도를 그림으로 그려 두고 그 픽셀 색을 읽어요 (경계선·해안선까지 정확)
   그 밖: 마우스 아래 요소의 배경색(정당 색 칸, 추천 색, 버튼 등)을 읽어요 */
let pd = null;

const rgbToHex = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); if (v.length > 3 && v[3] === 0) return null; return toHex(v.slice(0, 3)); };

function elementColor(el) {
  for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
    if (e instanceof SVGElement) {
      const f = e.getAttribute && e.getAttribute('fill');
      if (f && f.startsWith('#')) return f;
      const m = f && f.match(/url\(#([^)]+)\)/);
      if (m) { const r = document.getElementById(m[1]); const rc = r && r.querySelector('rect[fill^="#"]'); if (rc) return rc.getAttribute('fill'); }
      continue;
    }
    const c = rgbToHex(getComputedStyle(e).backgroundColor);
    if (c) return c;
  }
  return rgbToHex(getComputedStyle(document.body).backgroundColor) || '#000000';
}

function rasterMap() {
  return new Promise(res => {
    const r = svg.getBoundingClientRect(); if (!r.width || !$('#editor').classList.contains('open')) return res(null);
    const dpr = Math.min(2, devicePixelRatio || 1);
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', NS); clone.setAttribute('width', r.width); clone.setAttribute('height', r.height);
    const ci = clone.querySelector('#coast');
    if (ci) {
      const cg = document.createElementNS(NS, 'g'); cg.setAttribute('fill', 'none'); cg.setAttribute('stroke', '#e6fbfb');
      cg.setAttribute('stroke-width', (2.6 * MAP.width / 1600).toFixed(2)); cg.setAttribute('stroke-linejoin', 'round');
      DATA.forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d[2]); if (d[3]) p.setAttribute('transform', d[3]); cg.appendChild(p); });
      ci.replaceWith(cg);
    }
    // 화면과 같은 선 색·굵기
    clone.querySelectorAll('#g path').forEach(p => {
      p.setAttribute('stroke', p.classList.contains('lock') ? '#8fe3e8' : p.classList.contains('ctx') ? '#2c4f55' : strokeColor());
      p.setAttribute('stroke-width', (0.6 * vb.w / r.width).toFixed(3)); p.setAttribute('fill-rule', 'evenodd');
      if (p.classList.contains('ctx')) p.setAttribute('fill', CTX_FILL);
    });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      const x = c.getContext('2d'); x.fillStyle = '#081619'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height); res({ c, r, dpr });
    };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  });
}

async function pageDropper() {
  const open = $$('.modal.open'); open.forEach(m => m.classList.add('peek'));   // 창은 반투명하게 비켜 두기
  const ov = $('#pdOverlay'); ov.hidden = false; $('#pdTip').hidden = true;
  pd = { open, map: null, last: null };
  pd.map = await rasterMap();
}

function pdColorAt(x, y, touch) {
  const ov = $('#pdOverlay');
  ov.style.pointerEvents = 'none';
  const el = document.elementFromPoint(x, y);
  ov.style.pointerEvents = '';
  // 손가락은 경계선에 걸리기 쉬워서, 터치일 때는 선거구 자체 색을 읽어요
  if (!touch && pd && pd.map && el && (el === svg || svg.contains(el) || el.closest('#mapWrap')) && !el.closest('button,.modal,#mParties,#mBar,#modeTag')) {
    const { c, r, dpr } = pd.map;
    const px = Math.floor((x - r.left) * dpr), py = Math.floor((y - r.top) * dpr);
    if (px >= 0 && py >= 0 && px < c.width && py < c.height) {
      const d = c.getContext('2d').getImageData(px, py, 1, 1).data; return toHex([d[0], d[1], d[2]]);
    }
  }
  return el ? elementColor(el) : null;
}

function pdClose(pickHex) {
  $('#pdOverlay').hidden = true;
  if (pd) pd.open.forEach(m => m.classList.remove('peek'));
  if (pickHex) { cpSet(pickHex); toast('색을 가져왔어요: ' + pickHex); }
  pd = null;
}

function initPageDropper() {
  const ov = $('#pdOverlay'), tip = $('#pdTip');
  const show = e => {
    if (!pd) return;
    const hex = pdColorAt(e.clientX, e.clientY, e.pointerType !== 'mouse'); pd.last = hex; if (!hex) return;
    tip.hidden = false; $('#pdSw').style.background = hex; $('#pdHex').textContent = hex;
    const off = e.pointerType === 'touch' ? -70 : 18;   // 손가락에 가리지 않게 위로
    tip.style.left = Math.min(innerWidth - 120, e.clientX + 16) + 'px';
    tip.style.top = Math.max(4, Math.min(innerHeight - 40, e.clientY + off)) + 'px';
  };
  ov.addEventListener('pointermove', show);
  ov.addEventListener('pointerdown', show);
  // 손을 떼면 색을 정하고, 뒤따르는 click까지 이 막(overlay)이 받은 뒤 닫아요 (아래 창이 눌리지 않게)
  let pend = null, tm = null;
  ov.addEventListener('pointerup', e => { show(e); pend = pd && pd.last; clearTimeout(tm); tm = setTimeout(() => { if (pd) pdClose(pend); }, 450); });
  ov.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (pd) { clearTimeout(tm); pdClose(pend || pd.last); } });
  $('#pdCancel').onclick = e => { e.stopPropagation(); pdClose(null); };
  $('#pdCancel').addEventListener('pointerup', e => e.stopPropagation());
  $('#pdCancel').addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('keydown', e => { if (e.key === 'Escape' && pd) pdClose(null); });
}
