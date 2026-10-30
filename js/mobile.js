/* 모바일: 지도 위 정당 고르기 줄, 누른 선거구 아래쪽 막대(의석 분할 바로가기), 길게 눌러 분할 */

let mbId = null, lastTouch = false;
const isTouchUI = () => lastTouch || matchMedia('(max-width:820px), (pointer:coarse)').matches;

function renderMobileParties(T) {
  const box = $('#mParties'); if (!box) return;
  const chip = (pid, name, color, n) =>
    `<button data-pid="${pid}" class="${store.sel === pid ? 'on' : ''}"><span class="sw" style="background:${color}"></span>${esc(name)} <b>${n}</b></button>`;
  box.innerHTML = chip('toss', '경합', TOSS, T.toss) + store.parties.map(p => chip(p.id, p.cand && isPres() ? p.cand : p.name, p.colors[0], T.t[p.id])).join('');
  if (mbId) updMBar();
}

function showMBar(id) { mbId = id; $('#mBar').hidden = false; updMBar(); }
function hideMBar() { mbId = null; $('#mBar').hidden = true; }
function updMBar() {
  const id = mbId; if (!id || !M) return;
  const x = M.d[id] || { a: {} }, S = seatsOf(id);
  const parts = store.parties.filter(p => x.a[p.id]).map(p => `${p.name} ${x.a[p.id]}`);
  const u = Object.values(x.a).reduce((a, b) => a + b, 0);
  if (u < S) parts.push(`경합 ${S - u}`);
  $('#mbName').textContent = nameOf(id);
  $('#mbInfo').textContent = `${isPres() ? '선거인단 ' + S : S + '석'} · ` + (x.off ? '비활성' : parts.join(' · ')) + (x.lock ? ' · 잠김' : '');
}

function initMobile() {
  $('#mParties').addEventListener('click', e => {
    const b = e.target.closest('[data-pid]'); if (!b) return;
    store.sel = b.dataset.pid; refresh(); updTag();
  });
  $('#mbSplit').onclick = () => {
    const x = D(mbId); if (x.off || x.lock) { toast('비활성이거나 잠긴 선거구예요.'); return; }
    openSplit(mbId);
  };
  $('#mbClear').onclick = () => {
    const x = D(mbId); if (x.lock) { toast('잠긴 선거구예요.'); return; }
    snap(); x.a = {}; x.m = 0; paintOne(mbId); refresh();
  };
  $('#mbClose').onclick = hideMBar;
  // 분할 창을 닫으면 아래 막대도 새로 고침
  $('#mSplit').addEventListener('click', () => setTimeout(() => mbId && updMBar(), 0));
}
