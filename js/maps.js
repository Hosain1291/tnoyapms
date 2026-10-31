/* 지도 불러오기
   maps/index.json 에 적힌 폴더마다 map.json(설정)과 map.svg(선거구 모양)를 읽어요.
   새 지도를 넣으려면 maps/ 아래에 폴더를 만들고 index.json 에 한 줄 추가하면 돼요. */

const MAP_LIST = [];          // [{id, folder, meta}]
let MAP = null;               // 지금 열린 지도의 map.json
let MAP_BASE = '';            // 지금 열린 지도의 폴더 경로
let DATA = [];                // [[id, region, d], ...]
let ids = [], region = {};
let FULL = { x: 0, y: 0, w: 1600, h: 1600 };
const svgCache = {};

async function loadMapList() {
  const idx = await (await fetch('maps/index.json', { cache: 'no-cache' })).json();
  for (const m of idx.maps) {
    const meta = await (await fetch(`maps/${m.folder}/map.json`, { cache: 'no-cache' })).json();
    MAP_LIST.push({ id: meta.id || m.id, folder: m.folder, meta });
  }
}

const mapEntry = id => MAP_LIST.find(m => m.id === id);

async function useMap(id) {
  const e = mapEntry(id); if (!e) return false;
  if (MAP && MAP.id === id) return true;
  MAP = e.meta; MAP_BASE = `maps/${e.folder}/`;
  let txt = svgCache[id];
  if (!txt) { txt = await (await fetch(MAP_BASE + (MAP.svg || 'map.svg'), { cache: 'no-cache' })).text(); svgCache[id] = txt; }
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const alias = MAP.regionAlias || {};
  DATA = [...doc.querySelectorAll('path[id]')].map(p => {
    const r = p.getAttribute('data-region') || 'default';
    return [p.id, alias[r] || r, p.getAttribute('d')];
  });
  ids = DATA.map(d => d[0]);
  region = Object.fromEntries(DATA.map(d => [d[0], d[1]]));
  FULL = { x: 0, y: 0, w: MAP.width, h: MAP.height };
  return true;
}

const nameOf = id => (MAP.names && MAP.names[id]) || id;
const regionName = r => (MAP.regions && MAP.regions[r]) || r;
const defaultSeat = id => (MAP.seats && MAP.seats[id]) || MAP.defaultSeats || 1;
const viewOf = key => MAP.views.find(v => v.key === key);
const boxOf = v => ({ x: v.box[0], y: v.box[1], w: v.box[2], h: v.box[3] });
const idsOfView = v => ids.filter(id => v.regions.includes(region[id]));
