/* 옵션 (YAPms의 Options): 지도 숫자, 글자 크기·색, 경계선 색·굵기, 해안선, 말풍선, 차트 강도, 지도 잠금 */

const OPT_DEFAULT = {
  labels: true, labelSize: 2, labelColor: 'auto',
  stroke: 'pink', strokeW: 1, coast: true,
  tooltip: true, leans: true, lockMap: false
};
const LABEL_PX = [9, 11, 13, 16, 20];
const STROKE_COLORS = { pink: '#d86a78', bg: '#081619', white: '#e6fbfb', black: '#000000', cyan: '#8fe3e8' };
let OPT = { ...OPT_DEFAULT };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('tnomap:options')) || {}); } catch (e) { }
const saveOpt = () => { try { localStorage.setItem('tnomap:options', JSON.stringify(OPT)); } catch (e) { } };
const strokeColor = () => STROKE_COLORS[OPT.stroke] || STROKE_COLORS.pink;

function applyOptions() {
  const r = document.documentElement.style;
  r.setProperty('--stroke', strokeColor());
  r.setProperty('--swm', OPT.strokeW);
  const c = $('#coast'); if (c) c.style.display = OPT.coast ? '' : 'none';
  document.body.classList.toggle('notip', !OPT.tooltip);
  document.body.classList.toggle('maplocked', !!OPT.lockMap);
  if (typeof updateLabels === 'function' && M) { labelsDirty = true; updateLabels(); }
  if (M) renderParties();
}

function renderOptions() {
  const seg = (key, items) => `<div class="seg" data-k="${key}">${items.map(([v, t]) => `<button data-v="${v}" class="${String(OPT[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const tog = (key, t, sub) => `<label class="tog"><span><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" data-k="${key}" ${OPT[key] ? 'checked' : ''}><i></i></label>`;
  $('#optBody').innerHTML = `
   <div class="ogrp"><div class="olab">지도 글자</div>
    ${tog('labels', '지도에 의석수 표시', '선거구 위에 숫자(미국은 주 약자도)를 보여줘요')}
    <div class="orow"><span>글자 크기</span>${seg('labelSize', [[0, '아주 작게'], [1, '작게'], [2, '보통'], [3, '크게'], [4, '아주 크게']])}</div>
    <div class="orow"><span>글자 색</span>${seg('labelColor', [['auto', '자동'], ['white', '흰색'], ['black', '검은색']])}</div></div>
   <div class="ogrp"><div class="olab">경계선</div>
    <div class="orow"><span>경계선 색</span>${seg('stroke', [['pink', '분홍'], ['cyan', '하늘'], ['white', '흰색'], ['black', '검은색'], ['bg', '배경색']])}</div>
    <div class="orow"><span>경계선 굵기</span><input type="range" min="0" max="3" step="0.25" value="${OPT.strokeW}" data-k="strokeW"><b class="num" id="swv">${Math.round(OPT.strokeW * 100)}%</b></div>
    ${tog('coast', '해안선 표시', '바깥 경계를 흰 선으로 강조해요')}</div>
   <div class="ogrp"><div class="olab">보기</div>
    ${tog('tooltip', '말풍선 표시', '마우스를 올리면 선거구 정보를 보여줘요')}
    ${tog('leans', '차트에 강도 나눠 보기', '확정·유력·우세·경합우세를 색 농도로 구분해요')}
    ${tog('lockMap', '지도 잠금', '실수로 칠해지지 않게 편집을 막아요')}</div>`;
}

function initOptions() {
  $('#optBtn').onclick = () => { renderOptions(); $('#mOpt').classList.add('open'); };
  $('#optBody').addEventListener('click', e => {
    const b = e.target.closest('.seg button'); if (!b) return;
    const k = b.parentElement.dataset.k, v = b.dataset.v;
    OPT[k] = isNaN(+v) ? v : +v; saveOpt(); renderOptions(); applyOptions();
  });
  $('#optBody').addEventListener('input', e => {
    const t = e.target, k = t.dataset.k; if (!k) return;
    OPT[k] = t.type === 'checkbox' ? t.checked : +t.value;
    if (k === 'strokeW') $('#swv').textContent = Math.round(OPT.strokeW * 100) + '%';
    saveOpt(); applyOptions();
  });
  $('#optReset').onclick = () => { OPT = { ...OPT_DEFAULT }; saveOpt(); renderOptions(); applyOptions(); };
  applyOptions();
}
