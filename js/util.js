/* 공통 도구: 선택자, 색 계산, 알림, 확인창 */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';

const MARGINS = ['확정', '유력', '우세', '경합우세'];
const TOSS = '#1d3a40';          // 경합·미정 색
const CTX_FILL = '#0e2125';      // 다른 지역(보기 밖) 색

const hexRgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixC = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
/* 기본색 하나로 확정·유력·우세·경합우세 네 단계 색 만들기 */
const shades = base => [base, mixC(base, '#e6fbfb', .3), mixC(base, '#e6fbfb', .5), mixC(base, '#e6fbfb', .68)];
const lum = h => { const [r, g, b] = hexRgb(h); return .299 * r + .587 * g + .114 * b; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(t) {
  const el = $('#toast'); el.textContent = t; el.style.display = 'block';
  clearTimeout(toast.h); toast.h = setTimeout(() => el.style.display = 'none', 1800);
}

let cfFn = null;
function confirmBox(t, j, fn) {
  $('#cfT').textContent = t; $('#mConfirmT').textContent = t; $('#cfJ').textContent = j;
  cfFn = fn; $('#mConfirm').classList.add('open');
}

function initModals() {
  $$('.modal').forEach(m => m.addEventListener('click', e => {
    if (e.target === m || e.target.classList.contains('close')) m.classList.remove('open');
  }));
  $('#cfOk').onclick = () => { $('#mConfirm').classList.remove('open'); cfFn && cfFn(); };
}
