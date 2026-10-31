/* 도구 → 표 편집 (YAPms의 Tools · Table): 모든 선거구의 의석수와 결과를 표로 한 번에 고쳐요 */

function renderTable() {
  const q = ($('#tbQ').value || '').trim().toLowerCase();
  const opts = (sel, id) => `<option value="toss"${sel === 'toss' ? ' selected' : ''}>경합</option>` +
    store.parties.filter(p => allowedIn(p, id) || p.id === sel).map(p => `<option value="${p.id}"${sel === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  const rows = mapIds.filter(id => !q || [nameOf(id), id, regionName(region[id]), (MAP.labels || {})[id] || ''].some(s => String(s).toLowerCase().includes(q)))
    .map(id => {
      const x = M.d[id] || { a: {} }, ks = Object.keys(x.a).filter(k => x.a[k] > 0 && party(k));
      const split = ks.length > 1 || (ks.length === 1 && x.a[ks[0]] < seatsOf(id));
      const sel = ks.length === 1 && !split ? ks[0] : 'toss';
      const col = ks.length ? party(ks.sort((a, b) => x.a[b] - x.a[a])[0]).colors[x.m || 0] : TOSS;
      return `<tr data-id="${esc(id)}" class="${x.off ? 'off' : ''}">
        <td><span class="sw" style="background:${col}"></span></td>
        <td><b>${esc(nameOf(id))}</b><small>${esc(id)} · ${esc(regionName(region[id]))}</small></td>
        <td><input type="number" min="1" max="99" value="${seatsOf(id)}" data-f="seats"></td>
        <td>${split ? `<button data-f="split" class="sm">분할됨 ✎</button>` : `<select data-f="win">${opts(sel, id)}</select>`}</td>
        <td><select data-f="m">${MARGINS.map((m, i) => `<option value="${i}"${(x.m || 0) === i ? ' selected' : ''}>${m}</option>`).join('')}</select></td>
        <td><input type="checkbox" data-f="off" ${x.off ? 'checked' : ''} title="비활성"></td>
      </tr>`;
    }).join('');
  $('#tbBody').innerHTML = rows || `<tr><td colspan="6" class="hint">찾는 선거구가 없어요</td></tr>`;
  $('#tbCount').textContent = `${mapIds.length}개 중 ${$('#tbBody').querySelectorAll('tr[data-id]').length}개`;
}

function initTools() {
  $('#toolsBtn').onclick = () => { $('#tbQ').value = ''; renderTable(); $('#mTable').classList.add('open'); };
  $('#tbQ').addEventListener('input', renderTable);
  $('#tbBody').addEventListener('change', e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const id = tr.dataset.id, f = e.target.dataset.f, x = D(id);
    if (x.lock && f !== 'off') { toast('잠긴 선거구예요.'); renderTable(); return; }
    snap();
    if (f === 'seats') {
      const n = Math.max(1, Math.min(99, parseInt(e.target.value) || 1)), old = seatsOf(id); store.seats[id] = n;
      const ks = Object.keys(x.a).filter(k => x.a[k] > 0);
      if (ks.length === 1 && x.a[ks[0]] >= old) x.a[ks[0]] = n; else if (used(x) > n) x.a = {};
      labelsDirty = true; scheduleLabels();
    } else if (f === 'win') {
      const v = e.target.value; x.a = v === 'toss' ? {} : { [v]: seatsOf(id) };
    } else if (f === 'm') x.m = +e.target.value;
    else if (f === 'off') x.off = e.target.checked;
    paintOne(id); refresh(); renderTable();
  });
  $('#tbBody').addEventListener('click', e => {
    const b = e.target.closest('[data-f="split"]'); if (!b) return;
    $('#mTable').classList.remove('open'); openSplit(b.closest('tr').dataset.id);
  });
}

/* 발표 모드 (YAPms의 Presentation): 편집 버튼을 숨기고 지도·차트만 크게 */
function initPresent() {
  const set = on => { document.body.classList.toggle('present', on); requestAnimationFrame(() => { fitBox(boxOf(curView)); scheduleLabels(); }); };
  $('#presentBtn').onclick = () => set(true);
  $('#presentExit').onclick = () => set(false);
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('present') && !$('.modal.open')) set(false); });
}
