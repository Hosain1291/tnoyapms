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
  $('#cpPresets').innerHTML = mk(CP_PRESETS);
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
  initScreenDropper();
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
    // 파이어폭스·사파리 등: 화면을 한 장 캡처해서 돋보기로 고르기
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) { screenDropper(); return; }
    toast('이 기기에서는 화면 스포이드를 쓸 수 없어요. 🖼 이미지에서 고르기를 써 보세요.');
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

/* ---------- 화면 캡처 스포이드 (EyeDropper가 없는 브라우저용) ---------- */
async function screenDropper() {
  let stream;
  try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); }
  catch (e) {
    if (e && e.name === 'NotAllowedError') toast('화면 공유를 허용해야 스포이드를 쓸 수 있어요.');
    else toast('여기서는 화면 캡처가 막혀 있어요. GitHub Pages 주소에서 써 보세요.');
    return;
  }
  const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream;
  try { await video.play(); } catch (e) { }
  await new Promise(r => { if (video.videoWidth) r(); else video.onloadedmetadata = () => r(); });
  await new Promise(r => setTimeout(r, 250));   // 공유 안내창이 사라질 시간
  const cv = $('#sdCanvas'); cv.width = video.videoWidth; cv.height = video.videoHeight;
  cv.getContext('2d').drawImage(video, 0, 0);
  stream.getTracks().forEach(tr => tr.stop());
  const ov = $('#sdOverlay'); ov.hidden = false;
  $('#sdInfo').textContent = '원하는 곳을 누르세요 · Esc 취소';
}

function initScreenDropper() {
  const ov = $('#sdOverlay'), cv = $('#sdCanvas'), lens = $('#sdLens'), lx = lens.getContext('2d');
  const N = 11, Z = 11;  // 11×11 픽셀을 11배로
  lens.width = lens.height = N * Z;
  const at = e => {  // 화면에 맞춰 줄어든(가운데 정렬) 그림 기준 좌표
    const r = cv.getBoundingClientRect(), s = Math.min(r.width / cv.width, r.height / cv.height);
    const ox = r.left + (r.width - cv.width * s) / 2, oy = r.top + (r.height - cv.height * s) / 2;
    return { x: Math.floor((e.clientX - ox) / s), y: Math.floor((e.clientY - oy) / s) };
  };
  const colorAt = (x, y) => { const d = cv.getContext('2d').getImageData(Math.max(0, Math.min(cv.width - 1, x)), Math.max(0, Math.min(cv.height - 1, y)), 1, 1).data; return toHex([d[0], d[1], d[2]]); };
  const move = e => {
    const { x, y } = at(e);
    lx.imageSmoothingEnabled = false; lx.clearRect(0, 0, lens.width, lens.height);
    lx.drawImage(cv, x - (N >> 1), y - (N >> 1), N, N, 0, 0, N * Z, N * Z);
    lx.strokeStyle = '#fff'; lx.lineWidth = 2; lx.strokeRect((N >> 1) * Z, (N >> 1) * Z, Z, Z);
    const hex = colorAt(x, y);
    const wrap = $('#sdLensWrap'); wrap.hidden = false;
    const off = e.pointerType === 'touch' ? -150 : 20;  // 손가락에 가리지 않게
    wrap.style.left = Math.min(innerWidth - 140, Math.max(4, e.clientX + 20)) + 'px';
    wrap.style.top = Math.min(innerHeight - 160, Math.max(4, e.clientY + off)) + 'px';
    $('#sdHex').textContent = hex; $('#sdSw').style.background = hex;
  };
  const close = () => { ov.hidden = true; $('#sdLensWrap').hidden = true; };
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerdown', e => { move(e); });
  cv.addEventListener('pointerup', e => { const { x, y } = at(e); cpSet(colorAt(x, y)); close(); toast('색을 가져왔어요.'); });
  $('#sdCancel').onclick = close;
  addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden) close(); });
}
