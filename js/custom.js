/* 내 지도 (YAPms의 Custom): SVG 파일을 올리면 그 지도로 바로 칠할 수 있어요.
   올린 지도는 이 브라우저(IndexedDB)에 저장돼요. 다른 사람에게도 보이게 하려면 maps 폴더에 넣으면 돼요. */

const IDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('tnomap', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('maps', { keyPath: 'id' });
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('maps', mode); const q = fn(t.objectStore('maps')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); },
  all() { return this.tx('readonly', s => s.getAll()); },
  put(v) { return this.tx('readwrite', s => s.put(v)); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); }
};

async function loadCustomMaps() {
  try {
    const list = await IDB.all();
    (list || []).forEach(m => { if (!mapEntry(m.id)) MAP_LIST.push({ id: m.id, folder: null, meta: m.meta, svgText: m.svg, custom: true }); });
  } catch (e) { /* IndexedDB를 못 쓰는 환경 */ }
}

/* 올린 SVG를 우리 형식(선거구마다 path + id + 변환)으로 바꾸기 */
function convertSVG(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const src = doc.querySelector('svg'); if (!src || doc.querySelector('parsererror')) throw new Error('SVG 파일이 아니에요.');
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1000px;height:1000px;visibility:hidden';
  const root = document.importNode(src, true); root.setAttribute('width', '1000'); root.setAttribute('height', '1000');
  host.appendChild(root); document.body.appendChild(host);
  try {
    const vbA = root.viewBox && root.viewBox.baseVal && root.viewBox.baseVal.width ? root.viewBox.baseVal : null;
    const rootInv = root.getScreenCTM().inverse();
    const shapes = [...root.querySelectorAll('path,polygon,polyline,rect,circle,ellipse')]
      .filter(el => !el.closest('defs,clipPath,mask,pattern,symbol,marker') && (el.getAttribute('fill') || '') !== 'none');
    if (!shapes.length) throw new Error('칠할 수 있는 도형(path·polygon 등)이 없어요.');
    const seen = {}, out = [];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    shapes.forEach((el, i) => {
      let d = '';
      const g = n => parseFloat(el.getAttribute(n)) || 0;
      if (el.tagName === 'path') d = el.getAttribute('d') || '';
      else if (el.tagName === 'polygon' || el.tagName === 'polyline') d = 'M' + (el.getAttribute('points') || '').trim() + 'Z';
      else if (el.tagName === 'rect') { const x = g('x'), y = g('y'), w = g('width'), h = g('height'); d = `M${x} ${y}h${w}v${h}h${-w}Z`; }
      else { const cx = g('cx'), cy = g('cy'), rx = el.tagName === 'circle' ? g('r') : g('rx'), ry = el.tagName === 'circle' ? g('r') : g('ry'); d = `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`; }
      if (!d) return;
      const m = rootInv.multiply(el.getScreenCTM());   // 도형 좌표 → SVG 전체 좌표
      let bb; try { bb = el.getBBox(); } catch (e) { return; }
      if (!bb.width && !bb.height) return;
      [[bb.x, bb.y], [bb.x + bb.width, bb.y + bb.height], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y]].forEach(([x, y]) => {
        const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f; x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
      });
      let id = (el.id || el.getAttribute('data-id') || el.getAttribute('name') || '').trim() || ('구역' + (i + 1));
      if (seen[id]) id = id + '_' + (++seen[id]); else seen[id] = 1;
      const t = el.querySelector('title');
      out.push({ id, d, m: [m.a, m.b, m.c, m.d, m.e, m.f], name: el.getAttribute('data-name') || (t && t.textContent.trim()) || id, region: el.getAttribute('data-region') || (el.parentElement && el.parentElement.id && el.parentElement !== root ? el.parentElement.id : 'default'), seats: parseInt(el.getAttribute('data-seats')) || null });
    });
    if (!out.length) throw new Error('칠할 수 있는 도형이 없어요.');
    // 전체를 (0,0)부터 시작하게 옮기기
    const pad = 4, W = Math.ceil(x1 - x0 + pad * 2), H = Math.ceil(y1 - y0 + pad * 2), dx = -x0 + pad, dy = -y0 + pad;
    const paths = out.map(o => { const [a, b, c, d, e, f] = o.m; return `<path id="${escAttr(o.id)}" data-region="${escAttr(o.region)}" transform="matrix(${[a, b, c, d, e + dx, f + dy].map(v => +v.toFixed(5)).join(' ')})" d="${escAttr(o.d)}"/>`; }).join('\n');
    return { W, H, list: out, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g fill="#1a3a40" stroke="#d86a78" stroke-width="1" fill-rule="evenodd">\n${paths}\n</g></svg>` };
  } finally { host.remove(); }
}
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let pendingCustom = null;
function initCustom() {
  $('#cuFile').onchange = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        pendingCustom = convertSVG(rd.result);
        $('#cuName').value = f.name.replace(/\.svg$/i, '');
        $('#cuInfo').textContent = `선거구(도형) ${pendingCustom.list.length}개를 찾았어요.`;
        $('#cuSeats').value = 1; $('#cuLayout').value = 'parliament';
        $('#mCustom').classList.add('open');
      } catch (er) { toast(er.message || 'SVG를 읽지 못했어요.'); }
    };
    rd.readAsText(f);
  };
  $('#cuSave').onclick = async () => {
    const c = pendingCustom; if (!c) return;
    const name = $('#cuName').value.trim() || '내 지도', seats = Math.max(1, parseInt($('#cuSeats').value) || 1), pres = $('#cuLayout').value === 'presidential';
    const id = 'custom-' + Date.now().toString(36);
    const regions = [...new Set(c.list.map(o => o.region))];
    const meta = {
      id, name, subtitle: '내가 올린 지도', tag: 'CUSTOM MAP', custom: true, svg: 'map.svg', width: c.W, height: c.H,
      layout: pres ? 'presidential' : undefined,
      regions: Object.fromEntries(regions.map(r => [r, r === 'default' ? '전체' : r])), regionAlias: {},
      views: [{ key: 'all', name, sub: '내 지도', regions, box: [0, 0, c.W, c.H], big: true }],
      parties: pres ? [['후보 A', '#3d7bd9'], ['후보 B', '#d23c3c'], ['제3후보', '#c9b02c']] : [['정당 A', '#d23c3c'], ['정당 B', '#3d7bd9'], ['정당 C', '#45a157'], ['정당 D', '#e39a2d'], ['무소속', '#9aa3a8']],
      defaultSeats: seats,
      seats: Object.fromEntries(c.list.map(o => [o.id, o.seats || seats])),
      names: Object.fromEntries(c.list.map(o => [o.id, o.name])),
      regionOf: Object.fromEntries(c.list.map(o => [o.id, o.region]))
    };
    try { await IDB.put({ id, meta, svg: c.svg }); } catch (e) { toast('이 브라우저에는 지도를 저장할 수 없어요.'); return; }
    MAP_LIST.push({ id, folder: null, meta, svgText: c.svg, custom: true });
    pendingCustom = null; $('#mCustom').classList.remove('open');
    location.hash = id + '--all';
  };
}

async function deleteCustom(id) {
  const e = mapEntry(id); if (!e) return;
  confirmBox(`'${e.meta.name}' 지우기`, '이 브라우저에 저장된 지도와 칠한 내용이 모두 지워져요. 되돌릴 수 없어요.', async () => {
    try { await IDB.del(id); } catch (er) { }
    try { localStorage.removeItem(storeKey(id)); } catch (er) { }
    MAP_LIST.splice(MAP_LIST.indexOf(e), 1); renderMenu(); toast('지웠어요.');
  });
}
