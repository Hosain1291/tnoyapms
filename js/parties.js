/* 정당: 지역별 묶음(TNO처럼 내지 / 할당 의석 조선 / 할당 의석 대만), 출마 지역 제한, 정당 관리 창(YAPms의 Candidates) */

const partyGroups = () => (MAP && MAP.partyGroups && MAP.partyGroups.length) ? MAP.partyGroups : [{ key: 'all', name: '' }];
/* 이 정당이 이 선거구에 나올 수 있나 */
const allowedIn = (p, id) => !p.regions || !p.regions.length || p.regions.includes(region[id]);
/* 지금 보기에 보일 정당 (출마 지역이 보기와 겹치는 정당) */
const partyInView = p => !curView || !p.regions || !p.regions.length || p.regions.some(r => curView.regions.includes(r));
/* 화면 순서(묶음 순서 → 목록 순서)로 지금 보기의 정당 */
function visibleParties() {
  const gs = partyGroups(), out = [];
  gs.forEach(g => store.parties.forEach(p => { if ((p.group || gs[0].key) === g.key && partyInView(p)) out.push(p); }));
  store.parties.forEach(p => { if (!gs.some(g => g.key === (p.group || gs[0].key)) && partyInView(p) && !out.includes(p)) out.push(p); });
  return out;
}
function cantRunMsg(p, id) {
  const rs = (p.regions || []).map(regionName).join('·');
  toast(`${p.name}은(는) ${rs} 선거구에만 나와요.`);
}

/* map.json 기본 정당 정보를 저장된 정당에 채워 넣기 (예전 저장본 호환) */
function fillPartyMeta(s) {
  const defs = {}; (MAP.parties || []).forEach(e => { const o = partyEntry(e); defs[o.name] = o; });
  s.parties.forEach(p => {
    const d = defs[p.name];
    if (p.regions === undefined) p.regions = d ? d.regions : null;
    if (p.group === undefined) p.group = d ? d.group : null;
  });
}
/* map.json 정당 한 줄: [이름, 색] / [이름, [4색]] / {name, colors|color, regions, group, note} */
function partyEntry(e) {
  if (Array.isArray(e)) return { name: e[0], colors: Array.isArray(e[1]) ? e[1].slice(0, 4) : shades(e[1]), regions: null, group: null };
  return { name: e.name, colors: e.colors ? e.colors.slice(0, 4) : shades(e.color || '#888888'), regions: e.regions || null, group: e.group || null, note: e.note };
}

/* ---------- 정당 관리 창 ---------- */
function renderManager() {
  const gs = partyGroups(), regs = Object.keys(MAP.regions || {}), pres = isPres();
  const rows = store.parties.map((p, i) => `
   <div class="pm-row" data-id="${p.id}">
    <div class="pm-ord"><button data-a="up" ${i ? '' : 'disabled'}>▲</button><button data-a="down" ${i < store.parties.length - 1 ? '' : 'disabled'}>▼</button></div>
    <button class="cbtn pm-col" data-a="color" style="background-image:none;background-color:${p.colors[0]}" title="색 고르기"></button>
    <div class="pm-main">
     <div class="pm-line"><input data-f="name" value="${esc(p.name)}" placeholder="정당 이름">${pres ? `<input data-f="cand" value="${esc(p.cand || '')}" placeholder="후보 이름">` : ''}</div>
     ${gs.length > 1 || regs.length > 1 ? `<div class="pm-line small">
      ${gs.length > 1 ? `<select data-f="group">${gs.map(g => `<option value="${g.key}"${(p.group || gs[0].key) === g.key ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}</select>` : ''}
      ${regs.length > 1 ? `<span class="pm-regs" title="출마 지역 (아무것도 안 고르면 전체)">${regs.map(r => `<button data-a="reg" data-r="${r}" class="${p.regions && p.regions.includes(r) ? 'on' : ''}">${esc(regionName(r))}</button>`).join('')}<em>${!p.regions || !p.regions.length ? '전체 지역' : ''}</em></span>` : ''}
     </div>` : ''}
    </div>
    <button class="pm-del" data-a="del" title="삭제">✕</button>
   </div>`).join('');
  $('#pmList').innerHTML = rows;
}

function deleteParty(pid, after) {
  const p = party(pid);
  confirmBox(`'${p.name}' 삭제`, '모든 보기에서 이 정당이 가진 의석이 경합으로 돌아가요.', () => {
    store.parties = store.parties.filter(x => x.id !== p.id);
    Object.values(store.maps).forEach(mp => { for (const id in mp.d) delete mp.d[id].a[p.id]; });
    if (store.sel === p.id) store.sel = store.parties[0] ? store.parties[0].id : 'toss';
    undoS = []; redoS = []; paintAll(); refresh(); updTag(); after && after();
  });
}

function initPartyManager() {
  $('#pmBtn').onclick = () => { renderManager(); $('#mPM').classList.add('open'); };
  $('#pmList').addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const row = b.closest('.pm-row'), pid = row.dataset.id, p = party(pid), i = store.parties.indexOf(p);
    const a = b.dataset.a;
    if (a === 'up' || a === 'down') {
      const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= store.parties.length) return;
      [store.parties[i], store.parties[j]] = [store.parties[j], store.parties[i]]; refresh(); renderManager();
    } else if (a === 'color') {
      openColorPicker(p.colors[0], c => { p.colors = shades(c); b.style.backgroundColor = c; paintAll(); refresh(); });
    } else if (a === 'reg') {
      const r = b.dataset.r; let rs = p.regions ? [...p.regions] : [];
      rs = rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r];
      p.regions = rs.length && rs.length < Object.keys(MAP.regions).length ? rs : null;
      refresh(); renderManager();
    } else if (a === 'del') deleteParty(pid, renderManager);
  });
  $('#pmList').addEventListener('input', e => {
    const f = e.target.dataset.f; if (!f) return;
    const p = party(e.target.closest('.pm-row').dataset.id);
    if (f === 'name') p.name = e.target.value; else if (f === 'cand') p.cand = e.target.value;
    refresh(); updTag();
  });
  $('#pmList').addEventListener('change', e => {
    if (e.target.dataset.f !== 'group') return;
    party(e.target.closest('.pm-row').dataset.id).group = e.target.value; refresh();
  });
  $('#pmAdd').onclick = () => {
    const pal = ['#8e5bd0', '#2aa6ad', '#c9b02c', '#d14d82', '#9b6b45', '#3e9c84', '#86a83a', '#5a62c9'];
    const id = 'p' + (store.nextId++);
    const gs = partyGroups(), g = curView ? (gs.find(x => (x.regions || []).some(r => curView.regions.includes(r))) || gs[0]) : gs[0];
    store.parties.push({ id, name: '새 정당 ' + (store.parties.length + 1), colors: shades(pal[store.parties.length % pal.length]), regions: g.regions || null, group: g.key });
    refresh(); renderManager();
    const inp = $('#pmList').querySelector(`.pm-row[data-id="${id}"] input[data-f="name"]`); if (inp) { inp.focus(); inp.select(); inp.scrollIntoView({ block: 'nearest' }); }
  };
  $('#pmReset').onclick = () => confirmBox('기본 정당으로', `정당 목록을 이 지도의 기본 정당(${MAP.parties.length}개)으로 바꿔요. 이름이 같은 정당이 칠한 곳은 그대로 남아요.`, () => {
    snap(); resetParties(store); undoS = []; redoS = []; paintAll(); refresh(); updTag(); renderManager();
  });
}
