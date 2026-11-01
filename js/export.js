/* 내보내기: PNG 이미지 · SVG 파일 · JSON 파일, 그리고 JSON 불러오기 */

/* 지금 보기의 색칠된 지도를 SVG 문자열로 (해안선·줄무늬 포함) */
function mapSVG(pad = 20) {
  const v = curView, b = boxOf(v), sc = Math.min(1, 1400 / b.w);
  const W = Math.round(b.w * sc + pad * 2), H = Math.round(b.h * sc + pad * 2);
  const clone = svg.cloneNode(true);
  clone.removeAttribute('id'); clone.removeAttribute('style');
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('viewBox', `${b.x - pad / sc} ${b.y - pad / sc} ${b.w + 2 * pad / sc} ${b.h + 2 * pad / sc}`);
  clone.setAttribute('width', W); clone.setAttribute('height', H);
  const ci = clone.querySelector('#coast');
  if (ci && !OPT.coast) ci.remove();
  else if (ci) {
    const cg = document.createElementNS(NS, 'g'); cg.setAttribute('fill', 'none'); cg.setAttribute('stroke', '#e6fbfb');
    cg.setAttribute('stroke-width', (2.6 * MAP.width / 1600 / sc).toFixed(2)); cg.setAttribute('stroke-linejoin', 'round');
    DATA.forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d[2]); if (d[3]) p.setAttribute('transform', d[3]); cg.appendChild(p); });
    ci.replaceWith(cg);
  }
  clone.querySelectorAll('#g path').forEach(p => {
    const id = p.dataset.id;
    p.setAttribute('id', id); p.removeAttribute('data-id');
    p.setAttribute('stroke', p.classList.contains('lock') ? '#8fe3e8' : (p.classList.contains('ctx') ? '#2c4f55' : strokeColor()));
    p.setAttribute('stroke-width', (0.6 * OPT.strokeW * MAP.width / 1600 / sc).toFixed(2)); p.setAttribute('fill-rule', 'evenodd');
    p.removeAttribute('class');
    if (inMap[id]) { const t = document.createElementNS(NS, 'title'); t.textContent = `${nameOf(id)} (${seatsOf(id)})`; p.appendChild(t); }
  });
  const lg = clone.querySelector('#labels');
  if (lg) { lg.removeAttribute('id'); if (!OPT.labels) lg.remove(); else { lg.setAttribute('font-family', 'Rajdhani, Arial, sans-serif'); lg.setAttribute('font-weight', '700'); lg.setAttribute('text-anchor', 'middle'); lg.setAttribute('dominant-baseline', 'central'); lg.querySelectorAll('text').forEach(t => { if (t.style.display === 'none') t.remove(); else t.removeAttribute('data-id'); }); } }
  return { str: new XMLSerializer().serializeToString(clone), W, H };
}

/* 결과 데이터 (JSON) — 다시 불러올 수 있도록 저장 상태(store)도 같이 넣어요 */
function resultJSON() {
  const T = totals();
  const districts = mapIds.map(id => {
    const x = M.d[id] || { a: {} };
    const alloc = {}, margins = {}; store.parties.forEach(p => { if (x.a[p.id]) { alloc[p.name] = x.a[p.id]; margins[p.name] = MARGINS[mOf(x, p.id)]; } });
    const u = Object.values(x.a).reduce((a, b) => a + b, 0);
    const w = isPres() ? winnerOf(id) : owner(id);
    return {
      id, name: nameOf(id), region: regionName(region[id]), seats: seatsOf(id),
      result: alloc, tossup: Math.max(0, seatsOf(id) - u), margin: u ? margins : null,
      winner: w ? party(w).name : null, disabled: !!x.off, locked: !!x.lock
    };
  });
  return {
    app: 'TNO map', version: 1, exported: new Date().toISOString(),
    map: MAP.id, mapName: MAP.name, view: curView.key, viewName: curView.name,
    totals: {
      seats: T.all, majority: T.maj, tossup: T.toss,
      parties: store.parties.map(p => ({ name: p.name, candidate: p.cand || undefined, color: p.colors[0], seats: T.t[p.id], byMargin: Object.fromEntries(MARGINS.map((m, i) => [m, T.mg[p.id][i]])) }))
    },
    districts,
    store
  };
}

/* 파일 받기 (막힌 곳에서는 복사로 대신) */
function download(name, text, type) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    $('#exMsg').textContent = `'${name}' 파일을 받았어요. 받아지지 않았다면 아래 복사 버튼을 쓰세요.`;
  } catch (e) { $('#exMsg').textContent = '이 화면에서는 파일 받기가 막혀 있어요. 복사 버튼을 쓰세요.'; }
}
async function copyText(text, what) {
  try { await navigator.clipboard.writeText(text); $('#exMsg').textContent = `${what}을(를) 복사했어요.`; }
  catch (e) { $('#exMsg').textContent = '복사가 막혀 있어요. 이 기능은 GitHub Pages 주소에서 써 주세요.'; }
}
const fileBase = () => `tno-map_${MAP.id}_${curView.key}_${new Date().toISOString().slice(0, 10)}`;

function showPNG() {
  const v = curView, { str, W, H: Hm } = mapSVG(), top = 230, W2 = Math.max(W, 900);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = W2; c.height = Hm + top; const x = c.getContext('2d');
    x.fillStyle = '#081619'; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = '#0f262b'; x.lineWidth = 1;
    for (let gx = 0; gx < W2; gx += 22) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, c.height); x.stroke(); }
    for (let gy = 0; gy < c.height; gy += 22) { x.beginPath(); x.moveTo(0, gy + .5); x.lineTo(W2, gy + .5); x.stroke(); }
    x.fillStyle = '#0a191d'; x.fillRect(0, 0, W2, top); x.fillStyle = '#8fe3e8'; x.fillRect(0, top - 3, W2, 3);
    x.drawImage(img, (W2 - W) / 2, top);
    const T = totals();
    x.fillStyle = '#8fe3e8'; x.font = '700 16px Rajdhani, sans-serif'; x.fillText('TNO MAP · THE NEW ORDER', 28, 40);
    x.fillStyle = '#eaffff'; x.font = '40px Orbit, sans-serif'; x.fillText(v.key === 'all' ? MAP.name : MAP.name + ' — ' + v.name, 28, 88);
    x.fillStyle = '#6f9ea2'; x.font = '18px "IBM Plex Sans KR", sans-serif';
    x.fillText(isPres() ? `선거인단 ${T.all} · 당선선 ${T.maj} · 경합 ${T.toss}` : `총 ${T.all}석 · 과반 ${T.maj}석 · 경합 ${T.toss}석`, 28, 120);
    let ly = 158, lx = 28; const sorted = [...store.parties].filter(p => T.t[p.id]).sort((a, b) => T.t[b.id] - T.t[a.id]);
    x.font = '500 19px "IBM Plex Sans KR", sans-serif';
    sorted.forEach(p => {
      const s = (isPres() && p.cand ? p.cand : p.name) + '  ' + T.t[p.id]; const w = x.measureText(s).width + 52;
      if (lx + w > W2 - 260) { lx = 28; ly += 32; }
      x.fillStyle = p.colors[0]; x.fillRect(lx, ly - 16, 20, 20); x.fillStyle = '#eaffff'; x.fillText(s, lx + 28, ly); lx += w;
    });
    const S = hemiSeats(T.all), cols = seatColors(T), R = 95, cx = W2 - 130, cy = top - 30;
    S.forEach((s, i) => { x.beginPath(); x.arc(cx + s.x * R, cy + s.y * R, s.rad * R, 0, Math.PI * 2); x.fillStyle = cols[i] || TOSS; x.fill(); });
    x.fillStyle = '#eaffff'; x.font = '700 28px Rajdhani, sans-serif'; x.textAlign = 'center'; x.fillText(T.all, cx, cy - 8); x.textAlign = 'left';
    const url = c.toDataURL('image/png');
    $('#imgOut').src = url; $('#mExport').classList.remove('open'); $('#mImg').classList.add('open');
    $('#pngDl').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = fileBase() + '.png'; document.body.appendChild(a); a.click(); a.remove(); };
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
}

function importJSON(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result);
      const s = j.store || j;
      if (!s.parties || !s.seats) throw 0;
      const mapId = j.map || s.map;
      if (mapId && mapId !== MAP.id) { $('#exMsg').textContent = `다른 지도(${mapId})의 파일이에요. 그 지도를 열고 불러오세요.`; return; }
      store = normalize(s); save();
      $('#mExport').classList.remove('open');
      const v = (j.view && viewOf(j.view)) || curView;
      if (v !== curView) location.hash = MAP.id + '--' + v.key; else openView(v);
      toast('JSON을 불러왔어요.');
    } catch (e) { $('#exMsg').textContent = 'TNO map에서 저장한 JSON 파일이 아니에요.'; }
  };
  rd.readAsText(file);
}

function initExport() {
  $('#imgBtn').onclick = () => { $('#exMsg').textContent = ''; $('#mExport').classList.add('open'); };
  $('#exPng').onclick = showPNG;
  $('#exSvg').onclick = () => download(fileBase() + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + mapSVG().str, 'image/svg+xml');
  $('#exJson').onclick = () => download(fileBase() + '.json', JSON.stringify(resultJSON(), null, 1), 'application/json');
  $('#exSvgCopy').onclick = () => copyText(mapSVG().str, 'SVG');
  $('#exJsonCopy').onclick = () => copyText(JSON.stringify(resultJSON(), null, 1), 'JSON');
  $('#exLoad').onclick = () => $('#exFile').click();
  $('#exFile').onchange = e => { const f = e.target.files[0]; if (f) importJSON(f); e.target.value = ''; };
}
