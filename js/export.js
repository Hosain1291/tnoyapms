/* 지도를 이미지(PNG)로 만들기 */

function initExport() {
  $('#imgBtn').onclick = () => {
    const v = curView, b = boxOf(v), pad = 20, sc = Math.min(1, 1400 / b.w);
    const W = Math.round(b.w * sc + pad * 2), Hm = Math.round(b.h * sc + pad * 2), top = 230, W2 = Math.max(W, 900);
    const clone = svg.cloneNode(true);
    clone.setAttribute('viewBox', `${b.x - pad / sc} ${b.y - pad / sc} ${b.w + 2 * pad / sc} ${b.h + 2 * pad / sc}`);
    clone.setAttribute('width', W); clone.setAttribute('height', Hm);
    const ci = clone.querySelector('#coast');
    if (ci) {
      const cg = document.createElementNS(NS, 'g'); cg.setAttribute('fill', 'none'); cg.setAttribute('stroke', '#e6fbfb'); cg.setAttribute('stroke-width', (2.6 / sc).toFixed(2));
      DATA.forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d[2]); cg.appendChild(p); });
      ci.replaceWith(cg);
    }
    clone.querySelectorAll('#g path').forEach(p => {
      p.setAttribute('stroke', p.classList.contains('lock') ? '#8fe3e8' : (p.classList.contains('ctx') ? '#2c4f55' : '#d86a78'));
      p.setAttribute('stroke-width', (0.6 / sc).toFixed(2)); p.setAttribute('fill-rule', 'evenodd'); p.classList.remove('hov');
    });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = W2; c.height = Hm + top; const x = c.getContext('2d');
      x.fillStyle = '#081619'; x.fillRect(0, 0, c.width, c.height);
      x.strokeStyle = '#0f262b'; x.lineWidth = 1;
      for (let gx = 0; gx < W2; gx += 22) { x.beginPath(); x.moveTo(gx + .5, 0); x.lineTo(gx + .5, c.height); x.stroke(); }
      for (let gy = 0; gy < c.height; gy += 22) { x.beginPath(); x.moveTo(0, gy + .5); x.lineTo(W2, gy + .5); x.stroke(); }
      x.fillStyle = '#0a191d'; x.fillRect(0, 0, W2, top); x.fillStyle = '#8fe3e8'; x.fillRect(0, top - 3, W2, 3);
      x.drawImage(img, (W2 - W) / 2, top);
      const T = totals();
      x.fillStyle = '#8fe3e8'; x.font = '700 16px Rajdhani, sans-serif'; x.fillText('TNO MAP · THE NEW ORDER', 28, 40);
      x.fillStyle = '#eaffff'; x.font = '40px Orbit, sans-serif'; x.fillText(v.key === 'all' ? MAP.name : MAP.name + ' — ' + v.name, 28, 88);
      x.fillStyle = '#6f9ea2'; x.font = '18px "IBM Plex Sans KR", sans-serif'; x.fillText(`총 ${T.all}석 · 과반 ${T.maj}석 · 경합 ${T.toss}석`, 28, 120);
      let ly = 158, lx = 28; const sorted = [...store.parties].filter(p => T.t[p.id]).sort((a, b) => T.t[b.id] - T.t[a.id]);
      x.font = '500 19px "IBM Plex Sans KR", sans-serif';
      sorted.forEach(p => {
        const s = p.name + '  ' + T.t[p.id]; const w = x.measureText(s).width + 52;
        if (lx + w > W2 - 260) { lx = 28; ly += 32; }
        x.fillStyle = p.colors[0]; x.fillRect(lx, ly - 16, 20, 20); x.fillStyle = '#eaffff'; x.fillText(s, lx + 28, ly); lx += w;
      });
      const S = hemiSeats(T.all), cols = seatColors(T), R = 95, cx = W2 - 130, cy = top - 30;
      S.forEach((s, i) => { x.beginPath(); x.arc(cx + s.x * R, cy + s.y * R, s.rad * R, 0, Math.PI * 2); x.fillStyle = cols[i] || TOSS; x.fill(); });
      x.fillStyle = '#eaffff'; x.font = '700 28px Rajdhani, sans-serif'; x.textAlign = 'center'; x.fillText(T.all, cx, cy - 8); x.textAlign = 'left';
      $('#imgOut').src = c.toDataURL('image/png'); $('#mImg').classList.add('open');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  };
}
