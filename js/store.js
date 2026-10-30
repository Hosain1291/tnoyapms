/* 저장: 지도마다 브라우저에 따로 저장하고, 저장 코드로 옮길 수 있어요. */

let store = null;
const storeKey = mapId => 'tnomap:' + mapId;

function freshStore(meta) {
  const seats = {};
  ids.forEach(id => seats[id] = defaultSeat(id));
  return {
    v: 3, map: meta.id, parties: meta.parties.map(([n, c], i) => ({ id: 'p' + (i + 1), name: n, colors: shades(c) })),
    seats, maps: {}, nextId: meta.parties.length + 1, sel: 'p1'
  };
}

function normalize(s) {
  const f = freshStore(MAP);
  if (!s || !Array.isArray(s.parties)) return f;
  s.seats = Object.assign(f.seats, s.seats || {});
  s.maps = s.maps || {}; s.nextId = s.nextId || s.parties.length + 1; s.map = MAP.id;
  s.parties.forEach(p => { if (!p.colors || p.colors.length < 4) p.colors = shades(p.color || '#888888'); });
  if (s.sel !== 'toss' && !s.parties.find(p => p.id === s.sel)) s.sel = s.parties[0] ? s.parties[0].id : 'toss';
  return s;
}

/* 의석수를 바꿀 때: 한 정당이 다 가진 선거구는 새 의석수만큼 그 정당 몫, 넘치는 분할은 비움 */
function applySeats(s, src) {
  ids.forEach(id => {
    const old = s.seats[id], n = src[id] != null ? src[id] : defaultSeat(id); s.seats[id] = n;
    Object.values(s.maps).forEach(mp => {
      const x = mp.d[id]; if (!x) return;
      const ks = Object.keys(x.a).filter(k => x.a[k] > 0);
      if (ks.length === 1 && x.a[ks[0]] >= old) x.a[ks[0]] = n;
      else if (Object.values(x.a).reduce((a, b) => a + b, 0) > n) x.a = {};
    });
  });
}

function readStore(mapId) {
  try { const s = JSON.parse(localStorage.getItem(storeKey(mapId))); if (s) return s; } catch (e) { }
  if (mapId === 'tno-japan') { // 예전 버전에서 저장한 작업 가져오기
    try { const s = JSON.parse(localStorage.getItem('tno-japan-map-v2')); if (s) return s; } catch (e) { }
  }
  return null;
}
function loadStore() { store = normalize(readStore(MAP.id)); }
function save() { try { localStorage.setItem(storeKey(MAP.id), JSON.stringify(store)); } catch (e) { } }

const party = pid => store.parties.find(p => p.id === pid);

/* 저장 코드 */
const encode = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decode = s => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));

function initCode() {
  $('#codeBtn').onclick = () => { $('#codeTxt').value = encode(store); $('#codeMsg').textContent = ''; $('#mCode').classList.add('open'); };
  $('#codeCopy').onclick = async () => {
    const t = $('#codeTxt');
    try { await navigator.clipboard.writeText(t.value); $('#codeMsg').textContent = '복사했어요.'; }
    catch (e) { t.select(); $('#codeMsg').textContent = '자동 복사가 막혀 있어요. 선택된 코드를 직접 복사하세요.'; }
  };
  $('#codeLoad').onclick = () => {
    try {
      const s = decode($('#codeTxt').value);
      if (!s.parties || !s.seats) throw 0;
      if (s.map && s.map !== MAP.id) { $('#codeMsg').textContent = '다른 지도의 저장 코드예요.'; return; }
      store = normalize(s); save(); $('#mCode').classList.remove('open');
      openView(curView); toast('불러왔어요.');
    } catch (e) { $('#codeMsg').textContent = '코드를 읽을 수 없어요. 전체를 빠짐없이 붙여넣었는지 확인하세요.'; }
  };
}
