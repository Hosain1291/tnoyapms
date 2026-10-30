/* 시작: 지도 목록 불러오기, 메뉴(지도 선택) 그리기, 주소(#)에 따라 화면 바꾸기
   주소 예: #tno-japan--all  (지도 id -- 보기 key) */

function viewProgress(entry, v) {
  const meta = entry.meta;
  let s = null; try { s = JSON.parse(localStorage.getItem(storeKey(meta.id))); } catch (e) { }
  if (!s && meta.id === 'tno-japan') { try { s = JSON.parse(localStorage.getItem('tno-japan-map-v2')); } catch (e) { } }
  const seats = id => (s && s.seats && s.seats[id]) || meta.seats[id] || meta.defaultSeats || 1;
  const d = (s && s.maps && s.maps[v.key] && s.maps[v.key].d) || {};
  let tot = 0, asg = 0, n = 0;
  for (const id in meta.names) {
    // 지역 정보는 SVG에만 있어서, 메뉴에서는 map.json의 regionOf(있으면)로 셉니다
    const r = meta.regionOf ? meta.regionOf[id] : null;
    if (r && !v.regions.includes(r)) continue;
    n++; const S = seats(id); tot += S; const x = d[id];
    if (x && !x.off) asg += Math.min(S, Object.values(x.a || {}).reduce((a, b) => a + b, 0));
  }
  return { n, tot, asg };
}

function renderMenu() {
  const wrap = $('#mapGroups'); wrap.innerHTML = '';
  MAP_LIST.forEach(entry => {
    const meta = entry.meta, base = `maps/${entry.folder}/`;
    const sec = document.createElement('div'); sec.className = 'mgroup';
    sec.innerHTML = `<div class="msec"><h2>${esc(meta.name)}</h2><span class="label">${esc(meta.subtitle || '')}</span></div><div class="cards"></div>`;
    const box = sec.querySelector('.cards');
    meta.views.forEach(v => {
      const { n, tot, asg } = viewProgress(entry, v);
      const [bx, by, bw, bh] = v.box, p = Math.max(bw, bh) * .06;
      const c = document.createElement('button'); c.className = 'card win' + (v.big ? ' big' : '');
      c.innerHTML = `<div class="tb"><span class="t">${esc(v.name)}</span><span class="ctl"><i>—</i><i>❐</i><i>✕</i></span></div>` +
        `<svg class="thumb" viewBox="${bx - p} ${by - p} ${bw + 2 * p} ${bh + 2 * p}" preserveAspectRatio="xMidYMid meet"><image href="${base + (meta.svg || 'map.svg')}" width="${meta.width}" height="${meta.height}"/></svg>` +
        (asg ? `<span class="tag">진행 중</span>` : '') +
        `<div class="cb"><div class="meta">${esc(v.sub || '')} · ${meta.layout === 'presidential' ? `주 ${n} · 선거인단 ${tot}` : `선거구 ${n} · ${tot}석`}</div><div class="prog"><i style="width:${tot ? asg / tot * 100 : 0}%"></i></div></div>`;
      c.onclick = () => { location.hash = meta.id + '--' + v.key; };
      box.appendChild(c);
    });
    wrap.appendChild(sec);
  });
}

function showMenu() {
  curView = null; hideTip();
  $('#editor').classList.remove('open'); $('#menu').style.display = 'block';
  renderMenu(); scrollTo(0, 0);
}

async function route() {
  let h = location.hash.replace('#', '');
  if (h.startsWith('map-')) { location.replace('#tno-japan--' + h.slice(4)); return; } // 예전 주소
  const i = h.indexOf('--');
  if (i < 0) return showMenu();
  const mapId = h.slice(0, i), key = h.slice(i + 2);
  if (!mapEntry(mapId)) return showMenu();
  if (!MAP || MAP.id !== mapId) {
    $('#loading').style.display = 'flex';
    await useMap(mapId); loadStore(); buildMap();
    $('#loading').style.display = 'none';
  }
  const v = viewOf(key); if (!v) return showMenu();
  openView(v);
}

(async function init() {
  initModals(); initEditor(); initChart(); initCode(); initExport(); initPres(); initMobile();
  $('#back').onclick = () => { location.hash = 'menu'; };
  try { await loadMapList(); }
  catch (e) { $('#mapGroups').innerHTML = '<div class="hint">지도 목록(maps/index.json)을 불러오지 못했어요.</div>'; return; }
  addEventListener('hashchange', route);
  route();
})();
