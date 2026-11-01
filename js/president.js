/* 대통령 선거 화면 (TNO 스타일): 위쪽 후보·선거인단 막대, 아래쪽 주별 선거인단 목록
   map.json 에 "layout": "presidential" 이 있는 지도에서만 보여요. */

const isPres = () => MAP && MAP.layout === 'presidential';

function portraitSVG(color) {
  // 실제 인물 사진 대신 쓰는 실루엣
  return `<svg viewBox="0 0 58 64"><rect width="58" height="64" fill="${mixC(color, '#071215', .55)}"/>
    <circle cx="29" cy="24" r="11" fill="${mixC(color, '#e6fbfb', .25)}"/>
    <path d="M8 64 C10 44 20 39 29 39 C38 39 48 44 50 64 Z" fill="${mixC(color, '#e6fbfb', .25)}"/></svg>`;
}

/* 주마다 이긴 정당(가장 많이 가진 정당) */
function winnerOf(id) {
  const x = M.d[id]; if (!x || x.off) return null;
  let best = null, bv = 0;
  for (const k in x.a) if (x.a[k] > bv && party(k)) { best = k; bv = x.a[k]; }
  return best;
}

function renderPres(T) {
  const [L, R] = store.parties;
  const lab = p => p ? esc(p.cand ? `${p.cand} (${p.name})` : p.name) : '';
  $('#pnL').innerHTML = lab(L); $('#pnR').innerHTML = lab(R);
  $('#pevL').textContent = L ? T.t[L.id] : 0; $('#pevR').textContent = R ? T.t[R.id] : 0;
  $('#pevL').style.color = L ? L.colors[1] : ''; $('#pevR').style.color = R ? R.colors[1] : '';
  $('#ppL').innerHTML = L ? portraitSVG(L.colors[0]) : ''; $('#ppR').innerHTML = R ? portraitSVG(R.colors[0]) : '';

  // 막대: 왼쪽 후보 → 제3후보들 → 경합 → 오른쪽 후보
  const bar = $('#pbar'); bar.innerHTML = '';
  const seg = (v, c, t) => { if (!v) return; const d = document.createElement('div'); d.style.width = (v / T.all * 100) + '%'; d.style.background = c; d.title = t; bar.appendChild(d); };
  if (L) seg(T.t[L.id], L.colors[0], L.name);
  store.parties.slice(2).forEach(p => seg(T.t[p.id], p.colors[0], p.name));
  seg(T.toss, TOSS, '경합');
  if (R) seg(T.t[R.id], R.colors[0], R.name);
  const mk = document.createElement('div'); mk.className = 'mk'; mk.style.left = (T.maj / T.all * 100) + '%'; bar.appendChild(mk);
  const w = $('#pwin'); w.style.left = (T.maj / T.all * 100) + '%';
  const won = store.parties.find(p => T.t[p.id] >= T.maj);
  w.innerHTML = won ? `<span style="color:${won.colors[1]}">${esc(won.cand || won.name)}</span><small>당선 확정</small>` : `${T.maj}<small>To Win</small>`;

  // 주별 목록
  const list = $('#evList');
  const lab2 = MAP.labels || {};
  list.innerHTML = [...mapIds].sort((a, b) => (lab2[a] || a).localeCompare(lab2[b] || b)).map(id => {
    const x = M.d[id], wp = winnerOf(id), p = wp && party(wp);
    const col = x && x.off ? '#3a5a60' : p ? p.colors[mOf(x, wp)] : 'var(--text)';
    return `<div data-id="${id}" style="color:${col}"><span>${esc(lab2[id] || nameOf(id))}</span><b>${seatsOf(id)}</b></div>`;
  }).join('');

  // 정당별 합계
  $('#pSplit').innerHTML = `<h5>PARTY SPLIT</h5>` + store.parties.map(p => `<div style="color:${p.colors[1]}"><span>${esc(p.name)}</span><span>${T.t[p.id]}</span></div>`).join('') +
    `<div style="color:var(--mute)"><span>경합</span><span>${T.toss}</span></div><div style="color:#eaffff;border-top:1px solid var(--line2);margin-top:2px"><span>합계</span><span>${T.all}</span></div>`;
}

function initPres() {
  // 목록에서 주에 마우스를 올리면 지도에 표시, 누르면 칠하기
  $('#evList').addEventListener('mouseover', e => { const d = e.target.closest('[data-id]'); if (d) { const r = d.getBoundingClientRect(); showTip(d.dataset.id, r.right, r.top - 60); } });
  $('#evList').addEventListener('mouseleave', hideTip);
  $('#evList').addEventListener('click', e => { const d = e.target.closest('[data-id]'); if (d) clickDistrict(d.dataset.id); });
}
