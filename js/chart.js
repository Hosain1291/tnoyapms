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
  store.parties.forEach(p => { T.mg[p.id].forEach((v, i) => { for (let k = 0; k < v; k++) cols.push(p.colors[OPT.leans ? i : 0]); }); });
  for (let k = 0; k < T.toss; k++) cols.push(TOSS);
  return cols;
}

function renderChart(T) {
  const hs = $('#hemi'), bar = $('#bar'), pie = $('#pie');
  hs.style.display = chart === 'hemi' ? 'block' : 'none'; bar.style.display = chart === 'bar' ? 'flex' : 'none'; pie.style.display = chart === 'pie' ? 'block' : 'none';
  if (chart === 'pie') {
    // 원 차트: 정당(강도별) → 경합 순서로 조각
    const segs = []; store.parties.forEach(p => T.mg[p.id].forEach((v, i) => { if (v) segs.push([v, p.colors[OPT.leans ? i : 0]]); }));
    if (T.toss) segs.push([T.toss, TOSS]);
    let a0 = -Math.PI / 2, out = '';
    const R = 1, r0 = .52;
    segs.forEach(([v, c]) => {
      const a1 = a0 + v / T.all * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0;
      if (v === T.all) out += `<circle r="${(R + r0) / 2}" fill="none" stroke="${c}" stroke-width="${R - r0}"/>`;
      else out += `<path d="M${Math.cos(a0) * R} ${Math.sin(a0) * R}A${R} ${R} 0 ${big} 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R}L${Math.cos(a1) * r0} ${Math.sin(a1) * r0}A${r0} ${r0} 0 ${big} 0 ${Math.cos(a0) * r0} ${Math.sin(a0) * r0}Z" fill="${c}"/>`;
      a0 = a1;
    });
    const mA = -Math.PI / 2 + T.maj / T.all * Math.PI * 2;
    out += `<line x1="${Math.cos(mA) * (r0 - .05)}" y1="${Math.sin(mA) * (r0 - .05)}" x2="${Math.cos(mA) * (R + .05)}" y2="${Math.sin(mA) * (R + .05)}" stroke="#eaffff" stroke-width=".025"/>`;
    out += `<text y=".08" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size=".32" fill="#eaffff">${T.all}</text><text y=".26" text-anchor="middle" font-size=".1" fill="#6f9ea2">과반 ${T.maj}</text>`;
    pie.innerHTML = out;
  }
  if (chart === 'hemi') {
    const S = hemiSeats(T.all), cols = seatColors(T);
    hs.innerHTML = S.map((s, i) => `<circle cx="${s.x.toFixed(4)}" cy="${s.y.toFixed(4)}" r="${s.rad.toFixed(4)}" fill="${cols[i] || TOSS}"/>`).join('') +
      `<text x="0" y="-.08" text-anchor="middle" font-family="Rajdhani,sans-serif" font-weight="700" font-size=".28" fill="#eaffff">${T.all}</text><text x="0" y=".02" text-anchor="middle" font-size=".085" fill="#6f9ea2">과반 ${T.maj}</text>`;
  } else {
    bar.innerHTML = '';
    store.parties.forEach(p => T.mg[p.id].forEach((v, i) => {
      if (!v) return; const d = document.createElement('div');
      d.style.width = (v / T.all * 100) + '%'; d.style.background = p.colors[OPT.leans ? i : 0]; d.title = p.name + ' ' + MARGINS[i] + ' ' + v; bar.appendChild(d);
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
