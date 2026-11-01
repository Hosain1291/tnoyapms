/* 편집 화면: 지도 그리기, 칠하기(YAPms 방식), 분할·비활성·잠금, 되돌리기, 확대·이동 */

let curView = null, M = null, mapIds = [], inMap = {};
let mode = 'fill', dragMode = false;
let selM = null;   // 정당 칸에서 고른 강도 (null이면 누를 때마다 단계 순환)
let undoS = [], redoS = [];
let els = {}, builtFor = null, labelsBuiltFor = null;
let svg, g, defs;

/* ---------- 지도 그리기 ---------- */
function buildMap() {
  if (builtFor === MAP.id) return;
  g.innerHTML = ''; els = {};
  DATA.forEach(([id, r, d, tf]) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); if (tf) p.setAttribute('transform', tf); p.dataset.id = id; g.appendChild(p); els[id] = p;
  });
  labelsBuiltFor = null;
  // 해안선: 흰 테두리를 선거구 아래에 깔아서 바깥쪽 경계만 보이게 해요
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP.width} ${MAP.height}" width="${MAP.width}" height="${MAP.height}"><g fill="none" stroke="#e6fbfb" stroke-width="${(2.6 * MAP.width / 1600).toFixed(2)}" stroke-linejoin="round">${DATA.map(d => `<path d="${d[2]}"${d[3] ? ` transform="${d[3]}"` : ''}/>`).join('')}</g></svg>`;
  $('#coast').setAttribute('href', URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })));
  $('#coast').setAttribute('width', MAP.width); $('#coast').setAttribute('height', MAP.height);
  builtFor = MAP.id;
}

const D = id => M.d[id] || (M.d[id] = { a: {}, m: 0 });
const seatsOf = id => store.seats[id];
const used = x => Object.values(x.a).reduce((s, v) => s + v, 0);
function owner(id) {
  const x = M.d[id]; if (!x) return null;
  const ks = Object.keys(x.a).filter(k => x.a[k] > 0 && party(k));
  return ks.length === 1 && x.a[ks[0]] >= seatsOf(id) ? ks[0] : null;
}

function districtFill(id) {
  const x = M.d[id];
  if (x && x.off) return 'url(#offPat)';
  if (!x) return TOSS;
  const es = Object.entries(x.a).filter(([k, v]) => v > 0 && party(k));
  if (!es.length) return TOSS;
  const tot = seatsOf(id), u = es.reduce((s, [, v]) => s + v, 0), toss = Math.max(0, tot - u);
  // 1등이 한 정당이면 그 정당 색으로 통합 (예: 4:2 → 4석 정당 색)
  // 1등이 동률이면 동률인 정당끼리 줄무늬 (예: 3:3), 미정 의석이 1등과 같으면 미정도 줄무늬에 넣기
  const top = Math.max(...es.map(([, v]) => v));
  const tied = es.filter(([, v]) => v === top);
  if (tied.length === 1 && toss < top) return party(tied[0][0]).colors[mOf(x, tied[0][0])];
  let parts;
  if (toss > top) { es.sort((a, b) => b[1] - a[1]); parts = es.map(([k, v]) => [party(k).colors[mOf(x, k)], v]); parts.push([TOSS, toss]); }  // 대부분 미정: 정해진 만큼만 비율로
  else { parts = tied.map(([k]) => [party(k).colors[mOf(x, k)], 1]); if (toss === top) parts.push([TOSS, 1]); }
  const key = 'st' + parts.map(([c, v]) => c.slice(1) + '_' + v).join('-');
  if (!document.getElementById(key)) {
    const W = 7, T = parts.reduce((s, [, v]) => s + v, 0);
    const pat = document.createElementNS(NS, 'pattern'); pat.id = key;
    pat.setAttribute('patternUnits', 'userSpaceOnUse'); pat.setAttribute('width', W); pat.setAttribute('height', W); pat.setAttribute('patternTransform', 'rotate(45)');
    let x0 = 0;
    parts.forEach(([c, v]) => { const w = W * v / T; const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x0); r.setAttribute('y', 0); r.setAttribute('width', w + .05); r.setAttribute('height', W); r.setAttribute('fill', c); pat.appendChild(r); x0 += w; });
    defs.appendChild(pat);
  }
  return 'url(#' + key + ')';
}
function baseDefs() { defs.innerHTML = '<pattern id="offPat" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><rect width="5" height="5" fill="#0a1a1d"/><rect width="1.4" height="5" fill="#24484e"/></pattern>'; }
function paintOne(id) { const p = els[id]; if (!inMap[id]) return; p.setAttribute('fill', districtFill(id)); const x = M.d[id]; p.classList.toggle('lock', !!(x && x.lock)); refreshLabel(id); }
function paintAll() { labelsDirty = true; scheduleLabels(); baseDefs(); ids.forEach(id => { if (inMap[id]) paintOne(id); else { els[id].setAttribute('fill', CTX_FILL); els[id].classList.remove('lock'); } }); }

/* ---------- 합계 ---------- */
function totals() {
  const t = {}, mg = {}; store.parties.forEach(p => { t[p.id] = 0; mg[p.id] = [0, 0, 0, 0]; });
  let all = 0, toss = 0;
  mapIds.forEach(id => {
    const x = M.d[id]; if (x && x.off) return;
    const s = seatsOf(id); all += s; let u = 0;
    if (x) for (const k in x.a) if (t[k] !== undefined && x.a[k] > 0) { const v = Math.min(x.a[k], s - u); t[k] += v; mg[k][mOf(x, k)] += v; u += v; }
    toss += s - u;
  });
  return { t, mg, all, toss, maj: Math.floor(all / 2) + 1 };
}

/* ---------- 정당 목록 ---------- */
function renderParties() {
  const T = totals(), box = $('#parties'); box.innerHTML = '';
  const mk = (pid, name, cols, tot, mg, k) => {
    const el = document.createElement('div'); el.className = 'party' + (store.sel === pid ? ' sel' : ''); el.dataset.id = pid;
    const pp = party(pid), note = (pp && pp.note) || (MAP.partyNotes && MAP.partyNotes[name]);
    el.innerHTML = `<span class="key">${k}</span><span class="nm">${esc(name)}${note ? `<small>${esc(note)}</small>` : ''}</span><span class="tot">${tot}</span>` +
      (pid === 'toss' ? '<span></span>' : '<button class="ed" title="정당 편집">✎</button>') +
      (mg ? `<div class="mg">${mg.map((v, i) => `<span data-m="${i}" class="${store.sel === pid && selM === i ? 'msel' : ''}" style="background:${cols[i]};color:${lum(cols[i]) > 140 ? '#111' : '#f4ffff'}" title="${MARGINS[i]}로 칠하기">${v}</span>`).join('')}</div>`
        : `<div class="mg"><span style="background:${TOSS};color:#d3f1f2">미정</span></div>`);
    el.onclick = e => {
      if (e.target.classList.contains('ed')) { openParty(pid); return; }
      const mc = e.target.closest('[data-m]');
      if (mc && pid !== 'toss') { const m = +mc.dataset.m; selM = (store.sel === pid && selM === m) ? null : m; }   // 강도 칸: 그 강도로 칠하기 (한 번 더 누르면 해제)
      else selM = null;
      store.sel = pid; save(); renderParties(); updTag();
    };
    box.appendChild(el);
  };
  mk('toss', '경합 · 미정', null, T.toss, null, '0');
  // TNO처럼 묶음별로 (내지 / 할당 의석 조선 / 할당 의석 대만)
  const gs = partyGroups(), vis = visibleParties();
  gs.forEach(gr => {
    const list = vis.filter(p => (p.group || gs[0].key) === gr.key); if (!list.length) return;
    if (gr.name && gs.length > 1) { const hd = document.createElement('div'); hd.className = 'pgroup'; hd.innerHTML = `<span>◈</span>${esc(gr.name)}`; box.appendChild(hd); }
    list.forEach(p => { const i = vis.indexOf(p); mk(p.id, p.name, p.colors, T.t[p.id], T.mg[p.id], i < 9 ? i + 1 : ''); });
  });
  vis.filter(p => !gs.some(gr => gr.key === (p.group || gs[0].key))).forEach(p => { const i = vis.indexOf(p); mk(p.id, p.name, p.colors, T.t[p.id], T.mg[p.id], i < 9 ? i + 1 : ''); });
  renderChart(T);
  if (isPres()) renderPres(T);
  renderMobileParties(T);
}
function refresh() { renderParties(); updUndo(); save(); }

/* ---------- 되돌리기 ---------- */
function snap() { undoS.push(JSON.stringify(M.d)); if (undoS.length > 150) undoS.shift(); redoS = []; updUndo(); }
function undo() { if (!undoS.length) return; redoS.push(JSON.stringify(M.d)); M.d = JSON.parse(undoS.pop()); paintAll(); refresh(); }
function redo() { if (!redoS.length) return; undoS.push(JSON.stringify(M.d)); M.d = JSON.parse(redoS.pop()); paintAll(); refresh(); }
function updUndo() { $('#undo').disabled = !undoS.length; $('#redo').disabled = !redoS.length; }

/* ---------- 칠하기 ---------- */
function clickDistrict(id) {
  if (OPT.lockMap && !(typeof mapPickCb === 'function' && mapPickCb)) { showTip(id); if (isTouchUI()) showMBar(id); toast('지도 잠금 중이에요. 옵션에서 풀 수 있어요.'); return; }
  if (typeof mapPickCb === 'function' && mapPickCb) { mapPickCb(id); return; }  // 색 고르기: 지도에서 고르기
  const x = D(id);
  if (mode === 'disable') { snap(); x.off = !x.off; paintOne(id); refresh(); showTip(id); if (isTouchUI()) showMBar(id); return; }
  if (mode === 'lock') { snap(); x.lock = !x.lock; paintOne(id); refresh(); showTip(id); if (isTouchUI()) showMBar(id); return; }
  if (x.off) { toast('비활성 선거구예요. 비활성 모드에서 다시 켜세요.'); if (isTouchUI()) showMBar(id); return; }
  if (x.lock) { toast('잠긴 선거구예요. 잠금 모드에서 풀 수 있어요.'); return; }
  if (mode === 'split') { openSplit(id); return; }
  snap();
  if (store.sel !== 'toss' && !allowedIn(party(store.sel), id)) { cantRunMsg(party(store.sel), id); return; }
  if (store.sel === 'toss') { x.a = {}; x.m = 0; delete x.pm; }
  else if (selM != null) { x.a = { [store.sel]: seatsOf(id) }; x.m = selM; delete x.pm; }   // 정당 칸에서 고른 강도로
  else if (owner(id) === store.sel) { x.m = ((x.m || 0) + 1) % 4; delete x.pm; }   // 같은 정당이면 단계 순환
  else { x.a = { [store.sel]: seatsOf(id) }; x.m = 0; delete x.pm; }
  paintOne(id); refresh(); showTip(id);
  if (isTouchUI()) showMBar(id);
}
function dragPaint(id) {
  if (OPT.lockMap) return;
  const x = D(id); if (x.off || x.lock) return;
  if (store.sel !== 'toss' && !allowedIn(party(store.sel), id)) return;
  if (store.sel === 'toss') { if (!used(x)) return; x.a = {}; x.m = 0; delete x.pm; }
  else { const m = selM != null ? selM : 0; if (owner(id) === store.sel && mOf(x, store.sel) === m) return; x.a = { [store.sel]: seatsOf(id) }; x.m = m; delete x.pm; }
  paintOne(id);
}

const MODE_KO = { fill: '칠하기', split: '의석 분할', disable: '비활성', lock: '잠금' };
function setMode(m) { mode = m; $$('#modes button').forEach(x => x.classList.toggle('on', x.dataset.mode === m)); updTag(); }
function updTag() {
  const p = store.sel === 'toss' ? '경합' : (party(store.sel) || {}).name;
  $('#modeTag').innerHTML = `모드 <b>${MODE_KO[mode]}</b>` + (mode === 'fill' ? ` · ${esc(p)}` + (store.sel !== 'toss' ? ` · ${selM != null ? MARGINS[selM] + ' 고정' : '단계 순환'}` : '') + (dragMode ? ' · 드래그' : '') : '');
}

/* ---------- 의석 분할 창 ---------- */
let spId = null;
function openSplit(id) {
  if (OPT.lockMap) { toast('지도 잠금 중이에요. 옵션에서 풀 수 있어요.'); return; } spId = id; renderSplit(); $('#mSplit').classList.add('open'); hideTip(); snap(); }
function renderSplit() {
  const x = D(spId), S = seatsOf(spId), u = used(x);
  $('#mSplitT').textContent = '의석 분할 · ' + nameOf(spId);
  $('#spJ').textContent = spId + ' · ' + regionName(region[spId]);
  $('#spSeats').textContent = S; $('#spMargin').value = x.m || 0;
  const msel = pid => `<select class="pmsel" data-pid="${pid}" title="이 정당의 강도">${MARGINS.map((m, i) => `<option value="${i}"${mOf(x, pid) === i ? ' selected' : ''}>${m}</option>`).join('')}</select>`;
  const L = $('#spList'); L.innerHTML = '';
  store.parties.filter(p => allowedIn(p, spId) || x.a[p.id]).forEach(p => {
    const v = x.a[p.id] || 0; const r = document.createElement('div'); r.className = 'alloc';
    r.innerHTML = `<span class="sw" style="background:${p.colors[mOf(x, p.id)]}"></span><span class="n">${esc(p.name)}</span>${v ? msel(p.id) : '<span class="pmsel-sp"></span>'}<button>−</button><span class="v">${v}</span><button>+</button>`;
    const [mi, pl] = r.querySelectorAll('button');
    mi.onclick = () => { if (v > 0) { x.a[p.id] = v - 1; if (!x.a[p.id]) delete x.a[p.id]; spUpd(); } };
    pl.onclick = () => { if (u < S) { x.a[p.id] = v + 1; spUpd(); } };
    L.appendChild(r);
  });
  $('#spLeft').textContent = u < S ? `남은 의석 ${S - u}석 (경합)` : '모든 의석이 배정됐어요.';
}
function spUpd() { paintOne(spId); refresh(); renderSplit(); }

/* ---------- 정당 편집 창 ---------- */
let ptId = null;
function paintPartyColors() {
  const p = party(ptId); if (!p) return;
  const fill = (b, c) => { b.style.backgroundImage = 'none'; b.style.backgroundColor = c; b.title = c; };
  fill($('#ptBase'), p.colors[0]);
  $$('#mParty [data-i]').forEach(b => fill(b, p.colors[+b.dataset.i]));
}
function openParty(pid) {
  ptId = pid; const p = party(pid);
  $('#ptName').value = p.name; $('#ptCand').value = p.cand || '';
  paintPartyColors();
  $('#mParty').classList.add('open');
}

/* ---------- 확대·이동 ---------- */
let vb = { x: 0, y: 0, w: 1600, h: 1600 };
const setVB = () => { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); scheduleLabels(); };
function fitBox(b) {
  const r = svg.getBoundingClientRect(); if (!r.width) return;
  const pad = .05; let w = b.w * (1 + pad * 2), h = b.h * (1 + pad * 2); const ar = r.width / r.height;
  if (w / h < ar) w = h * ar; else h = w / ar;
  vb = { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h }; setVB();
}
function toSvg(cx, cy) {
  const r = svg.getBoundingClientRect(); const s = Math.max(vb.w / r.width, vb.h / r.height);
  const ox = (r.width - vb.w / s) / 2, oy = (r.height - vb.h / s) / 2;
  return { x: vb.x + (cx - r.left - ox) * s, y: vb.y + (cy - r.top - oy) * s };
}
function zoomAt(f, cx, cy) {
  const p = toSvg(cx, cy); const nw = Math.min(FULL.w * 3, Math.max(FULL.w / 64, vb.w * f)); const k = nw / vb.w;
  vb = { x: p.x - (p.x - vb.x) * k, y: p.y - (p.y - vb.y) * k, w: vb.w * k, h: vb.h * k }; setVB();
}

/* ---------- 말풍선 ---------- */
let tipXY = [0, 0];
function showTip(id, cx, cy) {
  const tip = $('#tip');
  if (cx !== undefined) tipXY = [cx, cy];
  const x = M.d[id] || { a: {} }, S = seatsOf(id);
  let h = `<div><span class="t">${esc(nameOf(id))}</span><span class="j">${id}</span></div><div style="color:var(--mute);font-size:12px">${esc(regionName(region[id]))} · ${isPres() ? '선거인단 ' + S : S + '석'}${x.off ? ' · 비활성' : ''}${x.lock ? ' · 잠김' : ''}</div>` + (MAP.seatNotes && MAP.seatNotes[id] ? `<div class="tnote">${esc(MAP.seatNotes[id])}</div>` : '');
  if (!x.off) {
    let u = 0;
    store.parties.forEach(p => { const v = x.a[p.id]; if (v) { u += v; h += `<div class="l"><span class="sw" style="background:${p.colors[mOf(x, p.id)]}"></span>${esc(p.name)} <span style="color:var(--mute);font-size:11px">${MARGINS[mOf(x, p.id)]}</span><b style="margin-left:auto">${v}</b></div>`; } });
    if (u < S) h += `<div class="l" style="color:var(--mute)"><span class="sw" style="background:${TOSS}"></span>경합 <b style="margin-left:auto">${S - u}</b></div>`;
  }
  tip.innerHTML = h; tip.style.display = 'block';
  const [px, py] = tipXY, w = tip.offsetWidth, hh = tip.offsetHeight;
  tip.style.left = Math.min(innerWidth - w - 8, px + 14) + 'px'; tip.style.top = Math.min(innerHeight - hh - 8, py + 14) + 'px';
}
function hideTip() { $('#tip').style.display = 'none'; }

/* ---------- 지도 열기 ---------- */
function openView(v) {
  curView = v;
  store.maps[v.key] = store.maps[v.key] || { d: {} }; M = store.maps[v.key];
  mapIds = idsOfView(v); inMap = {}; mapIds.forEach(id => inMap[id] = true);
  ids.forEach(id => els[id].classList.toggle('ctx', !inMap[id]));
  undoS = []; redoS = []; hideMBar();
  $('#menu').style.display = 'none'; $('#editor').classList.add('open');
  $('#mapTitle').textContent = v.key === 'all' ? `${MAP.name} — ${MAP.subtitle || ''}` : `${MAP.name} · ${v.name}`;
  $('#mapWinTitle').textContent = 'MAP · ' + v.name;
  $('#mapTag').textContent = 'THE NEW ORDER · ' + (MAP.tag || MAP.name);
  $('#pres').hidden = $('#presFoot').hidden = !isPres(); $('#chartSec').hidden = isPres();
  $('#spSeatLbl').textContent = isPres() ? '이 주의 선거인단 수' : '이 선거구 의석수';
  paintAll(); refresh(); updTag();
  requestAnimationFrame(() => { if (labelsBuiltFor !== MAP.id) { buildLabels(); labelsBuiltFor = MAP.id; } fitBox(boxOf(v)); labelsDirty = true; updateLabels(); });
}

/* ---------- 버튼·마우스·키보드 연결 ---------- */
function initEditor() {
  svg = $('#map'); g = $('#g'); defs = $('#defs');

  $('#undo').onclick = undo; $('#redo').onclick = redo;
  $$('#modes button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $('#dragBtn').onclick = () => { dragMode = !dragMode; $('#dragBtn').classList.toggle('on', dragMode); updTag(); };

  $('#fillAll').onclick = () => {
    if (store.sel === 'toss') { toast('먼저 정당을 고르세요.'); return; }
    const p = party(store.sel);
    confirmBox('남은 곳 채우기', `아직 칠하지 않은 선거구를 모두 '${p.name}' 확정으로 칠해요.`, () => {
      snap(); mapIds.forEach(id => { const x = D(id); if (x.off || x.lock || used(x) || !allowedIn(p, id)) return; x.a = { [p.id]: seatsOf(id) }; x.m = selM != null ? selM : 0; delete x.pm; });
      paintAll(); refresh();
    });
  };
  $('#clearMap').onclick = () => confirmBox('지도 초기화', '이 지도의 칠한 내용, 비활성, 잠금을 모두 지워요. 되돌리기로 복구할 수 있어요.', () => { snap(); M.d = {}; paintAll(); refresh(); });
  $('#bulkApply').onclick = () => {
    const n = Math.max(1, Math.min(30, parseInt($('#bulkSeats').value) || 3));
    confirmBox('의석수 일괄 적용', `모든 선거구를 ${n}석으로 바꿔요. 한 정당이 다 가진 선거구는 그대로 그 정당 몫이 되고, 나눠진 선거구는 비워져요.`, () => {
      snap(); const src = {}; ids.forEach(id => src[id] = n); applySeats(store, src); paintAll(); refresh();
    });
  };
  $('#seatReset').onclick = () => confirmBox('기본 의석수로 되돌리기', '모든 선거구를 지도에 정해진 기본 의석수로 되돌려요. 한 정당이 다 가진 선거구는 그대로 그 정당 몫이 돼요.', () => {
    snap(); applySeats(store, MAP.seats || {}); paintAll(); refresh();
  });

  // 분할 창
  // 모두 같은 강도로
  $('#spMargin').onchange = () => { const x = D(spId); x.m = +$('#spMargin').value; delete x.pm; spUpd(); };
  // 정당별 강도
  $('#spList').addEventListener('change', e => {
    const s = e.target.closest('.pmsel'); if (!s) return;
    const x = D(spId); x.pm = x.pm || {}; x.pm[s.dataset.pid] = +s.value; spUpd();
  });
  $$('#mSplit [data-seat]').forEach(b => b.onclick = () => {
    const old = seatsOf(spId), n = Math.max(1, Math.min(30, old + +b.dataset.seat)); if (n === old) return;
    store.seats[spId] = n;
    Object.values(store.maps).forEach(mp => {
      const x = mp.d[spId]; if (!x) return; const ks = Object.keys(x.a).filter(k => x.a[k] > 0);
      if (ks.length === 1 && x.a[ks[0]] === old) { x.a[ks[0]] = n; return; }
      let u = used(x); const ord = ks.sort((a, b) => x.a[a] - x.a[b]);
      while (u > n) { const k = ord.find(k => x.a[k] > 0); x.a[k]--; if (!x.a[k]) delete x.a[k]; u--; }
    });
    spUpd();
  });
  $('#spClear').onclick = () => { D(spId).a = {}; spUpd(); };

  // 정당 편집 창
  $('#ptName').oninput = () => { party(ptId).name = $('#ptName').value; refresh(); updTag(); };
  $('#ptCand').oninput = () => { party(ptId).cand = $('#ptCand').value; refresh(); };
  // 색 칸을 누르면 색 고르기 창 (스포이드 지원)
  $('#ptBase').onclick = () => openColorPicker(party(ptId).colors[0], c => { party(ptId).colors = shades(c); paintPartyColors(); paintAll(); refresh(); });
  $$('#mParty [data-i]').forEach(b => b.onclick = () => openColorPicker(party(ptId).colors[+b.dataset.i], c => { party(ptId).colors[+b.dataset.i] = c; paintPartyColors(); paintAll(); refresh(); }));
  $('#ptDel').onclick = () => {
    const p = party(ptId); $('#mParty').classList.remove('open');
    confirmBox(`'${p.name}' 삭제`, '모든 보기에서 이 정당이 가진 의석이 경합으로 돌아가요.', () => {
      store.parties = store.parties.filter(x => x.id !== p.id);
      Object.values(store.maps).forEach(mp => { for (const id in mp.d) delete mp.d[id].a[p.id]; });
      if (store.sel === p.id) store.sel = store.parties[0] ? store.parties[0].id : 'toss';
      undoS = []; redoS = []; paintAll(); refresh(); updTag();
    });
  };
  $('#resetParties').onclick = () => confirmBox('기본 정당으로', `정당 목록을 이 지도의 기본 정당(${MAP.parties.length}개)으로 바꿔요. 이름이 같은 정당이 칠한 곳은 그대로 남고, 나머지는 경합으로 돌아가요.`, () => {
    snap(); resetParties(store); undoS = []; redoS = []; paintAll(); refresh(); updTag();
  });
  $('#addParty').onclick = () => {
    const pal = ['#8e5bd0', '#2aa6ad', '#c9b02c', '#d14d82', '#9b6b45', '#3e9c84', '#86a83a', '#5a62c9'];
    const id = 'p' + (store.nextId++);
    const gs = partyGroups(), gr = curView ? (gs.find(x => (x.regions || []).some(r => curView.regions.includes(r)) && curView.key !== 'all') || gs[0]) : gs[0];
    store.parties.push({ id, name: '새 정당 ' + (store.parties.length + 1), colors: shades(pal[store.parties.length % pal.length]), regions: curView && curView.key !== 'all' ? (gr.regions || null) : null, group: gr.key });
    store.sel = id; refresh(); updTag(); openParty(id);
    setTimeout(() => { $('#ptName').focus(); $('#ptName').select(); }, 30);
  };

  // 확대 버튼
  $('#zin').onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(1 / 1.4, r.left + r.width / 2, r.top + r.height / 2); };
  $('#zout').onclick = () => { const r = svg.getBoundingClientRect(); zoomAt(1.4, r.left + r.width / 2, r.top + r.height / 2); };
  $('#zfit').onclick = () => fitBox(boxOf(curView));

  // 마우스·터치
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
  const ptrs = new Map(); let drag = null, moved = false, pinch = null, painting = null, hovEl = null;
  const distAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.dataset && el.dataset.id && inMap[el.dataset.id] ? el.dataset.id : null; };
  const setHov = id => { const el = id ? els[id] : null; if (el === hovEl) return; hovEl && hovEl.classList.remove('hov'); hovEl = el; if (el) { el.classList.add('hov'); el.parentNode.appendChild(el); } };
  let lpTimer = null, lpFired = false;
  const cancelLP = () => { clearTimeout(lpTimer); lpTimer = null; };
  svg.addEventListener('pointerdown', e => {
    if (e.button === 2) return; try { svg.setPointerCapture(e.pointerId); } catch (er) { } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
    lastTouch = e.pointerType === 'touch'; lpFired = false; cancelLP();
    const id = e.target.dataset && e.target.dataset.id;
    // 길게 누르면(0.5초) 의석 분할 창
    if (e.pointerType !== 'mouse' && id && inMap[id] && ptrs.size === 1) {
      lpTimer = setTimeout(() => {
        lpTimer = null; if (moved || ptrs.size !== 1) return;
        const x = D(id); lpFired = true; drag = null; painting = null;
        if (x.off || x.lock) { toast('비활성이거나 잠긴 선거구예요.'); return; }
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) { }
        showMBar(id); openSplit(id);
      }, 500);
    }
    if (ptrs.size === 1 && mode === 'fill' && (dragMode || e.shiftKey) && id && inMap[id]) { painting = { start: id, x: e.clientX, y: e.clientY, began: false }; return; }
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, vb: { ...vb }, id };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; drag = null; painting = null; moved = true; cancelLP(); }
  });
  svg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) { const id = e.target.dataset && e.target.dataset.id; if (id && inMap[id]) { setHov(id); showTip(id, e.clientX, e.clientY); } else { setHov(null); hideTip(); } return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(pinch.d / d, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch.d = d; return; }
    if (painting) {
      if (!painting.began && Math.abs(e.clientX - painting.x) + Math.abs(e.clientY - painting.y) > 4) { cancelLP(); painting.began = true; snap(); dragPaint(painting.start); }
      if (painting.began) { const id = distAt(e.clientX, e.clientY); if (id) dragPaint(id); }
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 8) { moved = true; cancelLP(); }
      if (moved) { const r = svg.getBoundingClientRect(); const s = Math.max(vb.w / r.width, vb.h / r.height); vb.x = drag.vb.x - dx * s; vb.y = drag.vb.y - dy * s; setVB(); hideTip(); }
    }
  });
  const endPtr = e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); cancelLP();
    if (lpFired) { if (ptrs.size === 0) { drag = null; pinch = null; painting = null; } return; }
    if (ptrs.size === 0) {
      if (painting) { if (painting.began) refresh(); else clickDistrict(painting.start); painting = null; }
      else if (drag && !moved && drag.id && inMap[drag.id]) clickDistrict(drag.id);
      drag = null; pinch = null;
    } else if (ptrs.size < 2) pinch = null;
  };
  svg.addEventListener('pointerup', endPtr); svg.addEventListener('pointercancel', endPtr);
  svg.addEventListener('contextmenu', e => {
    e.preventDefault(); const id = e.target.dataset && e.target.dataset.id;
    if (id && inMap[id]) { const x = D(id); if (x.off || x.lock) { toast('비활성이거나 잠긴 선거구예요.'); return; } openSplit(id); }
  });
  svg.addEventListener('pointerleave', () => { hideTip(); setHov(null); });

  // 키보드
  addEventListener('keydown', e => {
    if (!curView || !$('#editor').classList.contains('open') || $('.modal.open') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'f') setMode('fill'); else if (k === 's') setMode('split'); else if (k === 'd') setMode('disable'); else if (k === 'l') setMode('lock');
    else if (k === '0' || k === '`') { store.sel = 'toss'; selM = null; refresh(); updTag(); }
    else if (/^[1-9]$/.test(k)) { const p = visibleParties()[+k - 1]; if (p) { if (store.sel === p.id && e.shiftKey) selM = selM == null ? 0 : (selM + 1) % 4; else if (store.sel !== p.id) selM = null; store.sel = p.id; refresh(); updTag(); } }
    else if (['q', 'w', 'e', 'r'].includes(k) && store.sel !== 'toss') { const m = 'qwer'.indexOf(k); selM = selM === m ? null : m; refresh(); updTag(); }
  });
}
