/* 의회 구성 차트: 반원 의석 배치도와 막대 */

let chart = 'hemi';

function hemiSeats(N) {
  if (N <= 0) return [];
  const rIn = .4; let R = 1, rows;
  for (; R < 40; R++) {
    const sp = R === 1 ? .6 : (1 - rIn) / (R - 1); rows = []; let cap = 0;
    for (let i = 0; i < R; i++) { const r = R === 1 ? 1 : rIn + (1 - rIn) * i / (R - 1); const c = Math.floor(Math.PI * r / sp) + 1; rows.push({ r, c }); cap += c; }
    if (cap >= N) break;
  }
  const sp = R === 1 ? .6 : (1 - rIn) / (R - 1), capT = rows.reduce((s, x) => s + x.c, 0);
  rows.forEach(x => { x.n = Math.floor(N * x.c / capT); x.f = N * x.c / capT - x.n; });
  let left = N - rows.reduce((s, x) => s + x.n, 0);
  [...rows].sort((a, b) => b.f - a.f).forEach(x => { if (left > 0 && x.n < x.c) { x.n++; left--; } });
  const out = [];
  rows.forEach(x => { for (let k = 0; k < x.n; k++) { const a = x.n === 1 ? Math.PI / 2 : Math.PI * (1 - k / (x.n - 1)); out.push({ x: x.r * Math.cos(a), y: -x.r * Math.sin(a), a }); } });
  out.sort((p, q) => q.a - p.a || (p.x - q.x));
  const rad = Math.min(sp * .42, .05); out.forEach(s => s.rad = rad);
  return out;
}

function seatColors(T) {
  const cols = [];
  store.parties.forEach(p => { T.mg[p.id].forEach((v, i) => { for (let k = 0; k < v; k++) cols.push(p.colors[i]); }); });
  for (let k = 0; k < T.toss; k++) cols.push(TOSS);
  return cols;
}

function renderChart(T) {
  const hs = $('#hemi'), bar = $('#bar');
  hs.style.display = chart === 'hemi' ? 'block' : 'none'; bar.style.display = chart === 'bar' ? 'flex' : 'none';
  if (chart === 'hemi') {
    const S = hemiSeats(T.all), cols = seatColors(T);
    hs.innerHTML = S.map((s, i) => `<circle cx="${s.x.toFixed(4)}" cy="${s.y.toFixed(4)}" r="${s.rad.toFixed(4)}" fill="${cols[i] || TOSS}"/>`).join('') +
      `<text x="0" y="-.08" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size=".28" fill="#eaffff">${T.all}</text><text x="0" y=".02" text-anchor="middle" font-size=".085" fill="#6f9ea2">과반 ${T.maj}</text>`;
  } else {
    bar.innerHTML = '';
    store.parties.forEach(p => T.mg[p.id].forEach((v, i) => {
      if (!v) return; const d = document.createElement('div');
      d.style.width = (v / T.all * 100) + '%'; d.style.background = p.colors[i]; d.title = p.name + ' ' + MARGINS[i] + ' ' + v; bar.appendChild(d);
    }));
    const m = document.createElement('div'); m.className = 'maj'; m.style.left = (T.maj / T.all * 100) + '%'; bar.appendChild(m);
  }
  const lead = [...store.parties].sort((a, b) => T.t[b.id] - T.t[a.id])[0];
  $('#chartMsg').innerHTML = lead && T.t[lead.id] >= T.maj
    ? `<b style="color:${lead.colors[1]}">${esc(lead.name)}</b> 과반 달성 · 경합 ${T.toss}`
    : `과반 <b>${T.maj}</b>석 · 경합 <b>${T.toss}</b>석`;
}

function initChart() {
  $$('.ctog button').forEach(b => b.onclick = () => {
    chart = b.dataset.c; $$('.ctog button').forEach(x => x.classList.toggle('on', x === b)); renderParties();
  });
}
