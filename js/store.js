/* 저장: 지도마다 브라우저에 따로 저장하고, 저장 코드로 옮길 수 있어요. */

let store = null;
const storeKey = mapId => 'tnomap:' + mapId;

/* map.json 의 기본 정당: [이름, 색] 또는 [이름, [확정, 유력, 우세, 경합우세]] */
function defaultParties(meta) {
  return meta.parties.map((e, i) => { const o = partyEntry(e); return { id: 'p' + (i + 1), name: o.name, cand: (meta.candidates || [])[i] || '', colors: o.colors, regions: o.regions, group: o.group }; });
}

/* 기본 정당 목록으로 바꾸기: 이름이 같은 정당의 칠한 결과는 그대로 옮겨요 */
function resetParties(s) {
  const fresh = defaultParties(MAP), byName = Object.fromEntries(fresh.map(p => [p.name, p.id]));
  const remap = {}; s.parties.forEach(p => { if (byName[p.name]) remap[p.id] = byName[p.name]; });
  Object.values(s.maps).forEach(mp => { for (const id in mp.d) { const a = mp.d[id].a, na = {}; for (const k in a) if (remap[k]) na[remap[k]] = a[k]; mp.d[id].a = na; } });
  s.parties = fresh; s.nextId = fresh.length + 1; s.sel = fresh[0] ? fresh[0].id : 'toss';
}

function freshStore(meta) {
  const seats = {};
  ids.forEach(id => seats[id] = defaultSeat(id));
  return {
    v: 3, map: meta.id, parties: defaultParties(meta),
    seats, maps: {}, nextId: meta.parties.length + 1, sel: 'p1'
  };
}

function normalize(s) {
  const f = freshStore(MAP);
  if (!s || !Array.isArray(s.parties)) return f;
  s.seats = Object.assign(f.seats, s.seats || {});
  s.maps = s.maps || {}; s.nextId = s.nextId || s.parties.length + 1; s.map = MAP.id;
  s.parties.forEach(p => { if (!p.colors || p.colors.length < 4) p.colors = shades(p.color || '#888888'); });
  // 예전 기본 정당을 아직 그대로 쓰고, 칠한 곳이 하나도 없으면 새 기본 정당으로 바꿔요
  const old = MAP.oldDefaultParties;
  if (old && s.parties.map(p => p.name).join('|') === old.join('|') &&
      !Object.values(s.maps).some(mp => Object.values(mp.d || {}).some(x => Object.values(x.a || {}).some(v => v > 0)))) resetParties(s);
  fillPartyMeta(s);
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
