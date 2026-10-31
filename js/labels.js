/* 지도 위 숫자 (YAPms의 Region Texts)
   선거구 가운데에 의석수를 쓰고, 미국처럼 map.json 에 "labelCode": true 면 약자도 같이 써요.
   화면에서 너무 작은 선거구는 글자를 숨겨요 (확대하면 나타나요). */

let labelInfo = {};      // id -> {x, y, w, h}
let labelsDirty = true, labelRAF = 0;

/* 가장 큰 고리(본토)의 무게중심 — 섬이 멀리 있는 선거구도 본토에 글자가 가요 */
function ringCentroid(d) {
  if (/[^MLZ0-9eE.,\s-]/.test(d)) return null;   // 곡선·상대좌표가 있으면 bbox로
  let best = null;
  for (const ring of d.split('M')) {
    const n = (ring.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number); if (n.length < 6) continue;
    let A = 0, cx = 0, cy = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i + 1 < n.length; i += 2) {
      const xa = n[i], ya = n[i + 1], j = (i + 2) % (n.length - n.length % 2), xb = n[j], yb = n[j + 1];
      const f = xa * yb - xb * ya; A += f; cx += (xa + xb) * f; cy += (ya + yb) * f;
      x0 = Math.min(x0, xa); y0 = Math.min(y0, ya); x1 = Math.max(x1, xa); y1 = Math.max(y1, ya);
    }
    A /= 2; if (!A) continue;
    const c = { x: cx / (6 * A), y: cy / (6 * A), w: x1 - x0, h: y1 - y0, a: Math.abs(A) };
    if (!best || c.a > best.a) best = c;
  }
  return best;
}

function buildLabels() {
  const lg = $('#labels'); lg.innerHTML = ''; labelInfo = {};
  const pos = MAP.labelPos || {};
  DATA.forEach(([id, r, d, tf]) => {
    let c = !tf && ringCentroid(d);
    if (!c || !isFinite(c.x)) {          // 변환이 있거나 곡선이면 화면 bbox로
      try {
        const b = els[id].getBBox(), m = els[id].transform.baseVal.consolidate();
        let x = b.x + b.width / 2, y = b.y + b.height / 2, w = b.width, h = b.height;
        if (m) { const M2 = m.matrix; const X = M2.a * x + M2.c * y + M2.e, Y = M2.b * x + M2.d * y + M2.f; x = X; y = Y; w *= Math.abs(M2.a); h *= Math.abs(M2.d); }
        c = { x, y, w, h };
      } catch (e) { return; }
    }
    if (pos[id]) { c.x = pos[id][0]; c.y = pos[id][1]; }
    labelInfo[id] = c;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', c.x.toFixed(1)); t.setAttribute('y', c.y.toFixed(1)); t.dataset.id = id;
    lg.appendChild(t);
  });
  labelsDirty = true;
}

function labelTextColor(id) {
  if (OPT.labelColor === 'white') return '#ffffff';
  if (OPT.labelColor === 'black') return '#000000';
  const x = M && M.d[id]; let c = TOSS;
  if (x && x.off) c = '#0a1a1d';
  else if (x) { const es = Object.entries(x.a).filter(([k, v]) => v > 0 && party(k)).sort((a, b) => b[1] - a[1]); if (es.length) c = party(es[0][0]).colors[x.m || 0]; }
  return lum(c) > 150 ? '#071215' : '#ffffff';
}

function labelOne(id) {
  const t = $('#labels').querySelector(`text[data-id="${CSS.escape(id)}"]`); if (!t) return;
  const code = MAP.labelCode, S = seatsOf(id);
  t.textContent = '';
  if (code) {
    const a = document.createElementNS(NS, 'tspan'); a.textContent = id; a.setAttribute('x', t.getAttribute('x')); a.setAttribute('dy', '-0.15em'); t.appendChild(a);
    const b = document.createElementNS(NS, 'tspan'); b.textContent = S; b.setAttribute('x', t.getAttribute('x')); b.setAttribute('dy', '1.05em'); t.appendChild(b);
  } else t.textContent = S;
  t.setAttribute('fill', labelTextColor(id));
}

function updateLabels() {
  const lg = $('#labels'); if (!lg || !MAP) return;
  lg.style.display = OPT.labels ? '' : 'none';
  if (!OPT.labels) return;
  const r = svg.getBoundingClientRect(); if (!r.width) return;
  const k = Math.max(vb.w / r.width, vb.h / r.height), px = LABEL_PX[OPT.labelSize] || 13;
  lg.setAttribute('font-size', (px * k).toFixed(3));
  const lines = MAP.labelCode ? 2.1 : 1;
  if (labelsDirty) lg.querySelectorAll('text').forEach(t => delete t.dataset.ok);
  lg.querySelectorAll('text').forEach(t => {
    const id = t.dataset.id, c = labelInfo[id];
    const show = inMap[id] && c && c.w / k > px * (MAP.labelCode ? 1.9 : 1.3) && c.h / k > px * lines * 1.05;
    t.style.display = show ? '' : 'none';
    if (show && !t.dataset.ok) { labelOne(id); t.dataset.ok = 1; }
  });
  labelsDirty = false;
}
function scheduleLabels() { cancelAnimationFrame(labelRAF); labelRAF = requestAnimationFrame(updateLabels); }
function refreshLabel(id) { const t = $('#labels') && $('#labels').querySelector(`text[data-id="${CSS.escape(id)}"]`); if (t) { if (OPT.labels && t.style.display !== 'none') { labelOne(id); t.dataset.ok = 1; } else delete t.dataset.ok; } }
