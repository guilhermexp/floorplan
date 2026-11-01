// Screen references are durable project content, separate from generated code descriptions.
(() => {
  const SC = window.Floorplan, Screens = window.FloorplanScreens;
  if (!SC || !Screens) return;
  const { h } = SC, G = SC.graph, server = window.FLOORPLAN_SERVER;
  const records = G.visuals || [], screens = Screens.list;
  const forScreen = (s) => records.filter((v) => !v.unresolved && v.screen === s.id);
  const kindName = (v) => v.kind === 'capture' ? 'Captura real' : 'Proposta';
  const usable = (v) => v && !v.missing && !!SC.visualSrc(v);
  const stamp = (v) => v.createdAt ? new Date(v.createdAt).toLocaleString('pt-BR') : 'Data não informada';
  const badge = (v) => `<span class="visual-badge ${h(v.kind)}">${kindName(v)}</span>${v.approved ? '<span class="visual-approved">Aprovada</span>' : ''}`;
  const meta = (v) => [v.version, v.viewport, v.state].filter(Boolean).map(h).join(' · ');
  const image = (v, cls = '') => usable(v) ? `<img class="${cls}" src="${h(SC.visualSrc(v))}" alt="${h(v.title)}" loading="lazy" decoding="async">` : '<span class="vs-empty">Imagem indisponível. O registro foi preservado.</span>';
  const source = (v) => v.kind === 'capture' && /^https?:\/\//i.test(v.sourceUrl || '') ? `<a href="${h(v.sourceUrl)}" target="_blank" rel="noopener noreferrer">${h(v.sourceUrl)}</a>` : '';
  const css = document.createElement('style');
  css.textContent = `
.visual-card { display:flex; flex-direction:column; gap:10px; }
.visual-card .title { white-space:normal; font-size:15px; line-height:1.3; }
.visual-card .head { min-height:22px; justify-content:space-between; }
.visual-image { height:300px; min-height:300px; background:#f0f0ee; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#555; }
.visual-image img { width:100%; height:100%; object-fit:contain; pointer-events:none; }
.visual-badge { display:inline-flex; width:max-content; align-items:center; padding:4px 9px; border-radius:20px; font-size:11px; font-weight:600; background:rgba(167,139,250,.16); color:#bfa8fc; }
.visual-badge.capture { background:rgba(52,211,153,.14); color:#3ac996; }
:root[data-theme="light"] .visual-badge { color:#6547a2; }
:root[data-theme="light"] .visual-badge.capture { color:#147755; }
.visual-approved { font-size:10px; color:var(--text-3); padding:4px; }
.vs-dialog { color:var(--text); background:var(--modal-bg); border:1px solid var(--hair-2); border-radius:22px; padding:0; width:min(1160px, calc(100vw - 32px)); max-width:none; max-height:calc(100dvh - 32px); box-shadow:0 24px 100px #0008; }
.vs-dialog::backdrop { background:#0009; backdrop-filter:blur(8px); }
.vs-dialog * { box-sizing:border-box; }
.vs-dialog [hidden] { display:none !important; }
.vs-head { position:sticky; top:0; z-index:2; display:flex; align-items:start; gap:20px; justify-content:space-between; padding:24px 28px 18px; background:var(--modal-bg); border-bottom:1px solid var(--hair-2); }
.vs-head h2 { font-size:23px; font-weight:600; margin:0 0 6px; letter-spacing:-.5px; }
.vs-head p { color:var(--text-3); margin:0; font-size:13px; line-height:1.6; }
.vs-head .btn { flex:none; }
.vs-body { padding:22px 28px 28px; }
.vs-toolbar { display:flex; gap:12px; margin:0 0 18px; }
.vs-toolbar input { flex:1; min-width:0; }
.vs-dialog input:not([type=checkbox]), .vs-dialog select, .vs-dialog textarea { color:var(--text); background:rgba(var(--ink),.05); border:1px solid var(--hair-2); border-radius:10px; font:inherit; padding:11px 12px; min-height:44px; }
.vs-dialog option { color:#181818; background:#fff; }
.vs-dialog input:focus-visible,.vs-dialog select:focus-visible,.vs-dialog textarea:focus-visible,.vs-dialog button:focus-visible { outline:2px solid var(--ring); outline-offset:3px; }
.vs-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:14px; }
.vs-screen { background:rgba(var(--ink),.025); border:1px solid var(--hair-2); border-radius:14px; padding:0; overflow:hidden; text-align:left; color:var(--text); cursor:pointer; font:inherit; transition:border-color .15s; }
.vs-screen:hover { border-color:var(--ring); }
.vs-thumb { height:174px; display:flex; align-items:center; justify-content:center; background:rgba(var(--ink),.04); color:var(--text-3); font-size:12px; }
.vs-thumb img { width:100%; height:100%; object-fit:contain; }
.vs-screen-copy { padding:14px; }
.vs-screen-copy strong { font-size:13px; display:block; margin-bottom:8px; }
.vs-screen-copy small { display:block; line-height:1.7; color:var(--text-3); font-size:11px; }
.vs-coverage { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
.vs-coverage span { background:rgba(var(--ink),.05); border-radius:8px; padding:8px 11px; font-size:12px; color:var(--text-2); }
.vs-coverage b { color:var(--text); margin-right:4px; }
.vs-empty { color:var(--text-3); font-size:13px; line-height:1.6; padding:18px; display:block; }
.vs-panel-row { display:flex; width:100%; align-items:center; gap:12px; border:0; border-radius:10px; padding:9px; margin:5px 0; background:rgba(var(--ink),.03); text-align:left; color:var(--text); cursor:pointer; font:inherit; }
.vs-panel-row img { width:52px; height:70px; object-fit:contain; background:#eee; border-radius:5px; flex:none; }
.vs-panel-row strong { display:block; font-size:12px; margin:7px 0 4px; }
.vs-panel-row small { display:block; color:var(--text-3); font-size:11px; line-height:1.5; }
.vs-actions { display:flex; gap:7px; flex-wrap:wrap; margin-top:14px; }
.vs-actions .btn { min-height:38px; }
.vs-pair { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.vs-side { min-width:0; border:1px solid var(--hair-2); border-radius:14px; overflow:hidden; }
.vs-side-top { padding:16px; display:flex; flex-direction:column; gap:10px; }
.vs-side-top select { width:100%; }
.vs-preview { min-height:280px; background:rgba(var(--ink),.035); display:flex; align-items:center; justify-content:center; }
.vs-preview img { width:100%; height:54vh; object-fit:contain; cursor:zoom-in; }
.vs-details { padding:14px 16px; font-size:12px; line-height:1.7; color:var(--text-3); overflow-wrap:anywhere; }
.vs-details a { color:var(--text-2); }
.vs-details p { margin:6px 0; }
.vs-full { overflow:auto; max-height:65vh; background:rgba(var(--ink),.03); text-align:center; border-radius:12px; }
.vs-full img { max-width:100%; max-height:65vh; object-fit:contain; }
.vs-full.actual img { max-width:none; max-height:none; }
.vs-form { display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:780px; margin:auto; }
.vs-form label { display:flex; flex-direction:column; gap:8px; font-size:13px; color:var(--text-2); }
.vs-form .wide { grid-column:1 / -1; }
.vs-form textarea { resize:vertical; }
.vs-error { padding:12px; color:var(--warn-text); background:var(--warn-bg); border-radius:10px; font-size:13px; }
.vs-notice { color:var(--text-3); font-size:12px; line-height:1.6; padding:12px 0; }
@media(max-width:640px) { .vs-dialog{width:calc(100vw - 12px);max-height:calc(100dvh - 12px);border-radius:14px} .vs-head,.vs-body{padding:16px} .vs-toolbar,.vs-pair{display:flex;flex-direction:column} .vs-form{grid-template-columns:1fr} .vs-grid{grid-template-columns:repeat(2,minmax(0,1fr))} .vs-thumb{height:132px} }
`;
  document.head.append(css);

  function wireImages(el) {
    el.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => {
      const text = document.createElement('span'); text.className = 'vs-empty'; text.textContent = 'Imagem indisponível'; img.replaceWith(text);
    }, { once: true }));
  }
  function dialog(title, subtitle, html) {
    const previous = document.activeElement;
    const el = document.createElement('dialog'); el.className = 'vs-dialog';
    const heading = 'vs-title-' + Math.random().toString(36).slice(2);
    el.setAttribute('aria-labelledby', heading);
    el.innerHTML = `<div class="vs-head"><div><h2 id="${heading}">${h(title)}</h2><p>${h(subtitle)}</p></div><button type="button" class="btn soft" data-dismiss aria-label="Fechar">Fechar</button></div><div class="vs-body">${html}</div>`;
    el.addEventListener('keydown', (e) => e.stopPropagation());
    el.querySelector('[data-dismiss]').onclick = () => el.close();
    el.addEventListener('close', () => { el.remove(); if (previous?.isConnected) previous.focus(); });
    document.body.append(el); wireImages(el); el.showModal();
    return el;
  }

  function enlarge(v) {
    const d = dialog(v.title, [kindName(v), v.version, v.viewport, v.state].filter(Boolean).join(' · '), `<div class="vs-full">${image(v)}</div><div class="vs-actions"><button class="btn soft" data-size>Tamanho original</button></div><div class="vs-details">${badge(v)}<p>${h(stamp(v))}</p>${source(v)}${v.notes ? `<p>${h(v.notes)}</p>` : ''}</div>`);
    d.querySelector('[data-size]').onclick = (e) => {
      const actual = d.querySelector('.vs-full').classList.toggle('actual'); e.target.textContent = actual ? 'Ajustar à janela' : 'Tamanho original';
    };
  }

  function compare(s) {
    const all = forScreen(s);
    const chosen = {};
    const d = dialog(s.name, 'Planejado e implementado · selecione as versões que deseja comparar.', '<div class="vs-pair"></div><div class="vs-notice" data-mismatch></div>');
    const pair = d.querySelector('.vs-pair');
    for (const kind of ['proposal', 'capture']) {
      const list = all.filter((v) => v.kind === kind);
      const side = document.createElement('section'); side.className = 'vs-side';
      side.innerHTML = `<div class="vs-side-top"><b>${kind === 'proposal' ? 'Proposta' : 'Captura real'}</b>${list.length ? `<select aria-label="${kind === 'proposal' ? 'Versão da proposta' : 'Versão da captura'}">${list.map((v) => `<option value="${h(v.id)}">${h([v.title, v.version, v.viewport, v.state].filter(Boolean).join(' · '))}</option>`).join('')}</select>` : ''}</div><div class="vs-preview"></div><div class="vs-details"></div>`;
      const update = () => {
        const v = list.find((v) => v.id === side.querySelector('select')?.value);
        chosen[kind] = v;
        side.querySelector('.vs-preview').innerHTML = v ? image(v) : `<p class="vs-empty">${kind === 'capture' ? 'Ainda não há captura real desta tela. Quando o app estiver funcionando, registre uma captura aqui.' : 'Ainda não há proposta visual para esta tela.'}</p>`;
        side.querySelector('.vs-details').innerHTML = v ? `${badge(v)}<p>${meta(v)}</p><p>${h(stamp(v))}</p>${source(v)}${v.notes ? `<p>${h(v.notes)}</p>` : ''}<button class="btn soft" data-enlarge>Ampliar imagem</button>` : 'As imagens adicionadas aqui ficam vinculadas a esta tela.';
        side.querySelector('img')?.addEventListener('click', () => enlarge(v));
        side.querySelector('[data-enlarge]')?.addEventListener('click', () => enlarge(v)); wireImages(side);
        const a = chosen.proposal, b = chosen.capture;
        d.querySelector('[data-mismatch]').textContent = a && b && (a.viewport !== b.viewport || a.state !== b.state) ? 'Estas imagens têm viewport ou estado diferentes. Confira as etiquetas ao comparar.' : 'Propostas e capturas são registros independentes. Adicionar uma versão preserva as anteriores.';
      };
      pair.append(side); side.querySelector('select')?.addEventListener('change', update); update();
    }
  }

  function upload(s) {
    if (!server || SC.exported) {
      dialog('Adicionar visual', s.name, '<p class="vs-empty">Abra o mapa pelo servidor local para adicionar imagens. Você também pode pedir ao agente para importar uma proposta ou captura nesta tela.</p>'); return;
    }
    const d = dialog('Adicionar visual', s.name + ' · a nova imagem será acrescentada ao histórico.', `<form class="vs-form">
      <label>Tipo<select name="kind"><option value="proposal">Proposta</option><option value="capture">Captura real</option></select></label>
      <label>Título<input name="title" required maxlength="200" placeholder="Ex.: Início no celular"></label>
      <label class="wide">Imagem · PNG, JPEG ou WebP<input type="file" name="image" accept="image/png,image/jpeg,image/webp" required></label>
      <label>Versão<input name="version" value="v1" maxlength="80"></label><label>Viewport<input name="viewport" placeholder="Ex.: Mobile 390 × 844" maxlength="120"></label>
      <label>Estado<input name="state" value="Padrão" maxlength="120"></label><label>Data da imagem<input type="datetime-local" name="createdAt" required></label>
      <label class="wide" data-source hidden>Endereço capturado<input type="url" name="sourceUrl" placeholder="http://localhost:3000/inicio"></label>
      <label class="wide">Notas<textarea name="notes" rows="3" maxlength="2000" placeholder="Contexto, revisão ou diferenças conhecidas"></textarea></label>
      <label class="wide" data-approval><span><input type="checkbox" name="approved"> Proposta aprovada</span></label>
      <p class="vs-error wide" role="alert" hidden></p><button type="submit" class="btn primary wide">Salvar visual</button>
    </form>`);
    const form = d.querySelector('form'), field = (name) => form.elements.namedItem(name);
    field('createdAt').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    field('kind').onchange = () => {
      const capture = field('kind').value === 'capture'; d.querySelector('[data-source]').hidden = !capture;
      field('sourceUrl').required = capture; d.querySelector('[data-approval]').hidden = capture;
    };
    form.onsubmit = async (e) => {
      e.preventDefault(); const btn = form.querySelector('[type=submit]'), err = form.querySelector('[role=alert]');
      err.hidden = true; btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        const file = field('image').files[0];
        if (!file || file.size > 12 * 1024 * 1024) throw new Error('Escolha uma imagem de até 12 MB.');
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(file); });
        const body = { screen: s.id, dataUrl };
        for (const k of ['kind', 'title', 'version', 'viewport', 'state', 'notes']) body[k] = field(k).value;
        body.createdAt = new Date(field('createdAt').value).toISOString();
        body.approved = body.kind === 'proposal' && field('approved').checked;
        if (body.kind === 'capture') body.sourceUrl = field('sourceUrl').value;
        const r = await fetch('/api/visuals', { method: 'POST', headers: { 'content-type': 'application/json', 'x-floorplan-token': server.token }, body: JSON.stringify(body) });
        const result = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(r.status === 403 ? 'O servidor foi reiniciado. Recarregue o mapa e tente novamente.' : result.error || 'Não foi possível salvar o visual.');
        location.hash = 'screen=' + encodeURIComponent(s.id); location.reload();
      } catch (error) { err.textContent = error.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Salvar visual'; }
    };
  }

  function panel(s) {
    const list = forScreen(s), p = list.filter((v) => v.kind === 'proposal').length, c = list.length - p;
    return { top: true, html: `<div class="sec"><h3>Visuais <span class="c">${list.length}</span></h3><p class="pd">${p} proposta${p === 1 ? '' : 's'} · ${c} captura${c === 1 ? '' : 's'} rea${c === 1 ? 'l' : 'is'}</p>
      ${list.length ? list.map((v) => `<button class="vs-panel-row" data-visual="${h(v.id)}">${image(v)}<span>${badge(v)}<strong>${h(v.title)}</strong><small>${meta(v)}</small></span></button>`).join('') : '<p class="pd">Esta tela ainda não tem imagens. Adicione uma proposta ou uma captura real.</p>'}
      <div class="vs-actions"><button class="btn soft" data-canvas>Ver no canvas</button><button class="btn soft" data-compare>Comparar</button>${!SC.exported ? '<button class="btn soft" data-add>Adicionar visual</button>' : ''}</div></div>`, bind: (el) => {
      wireImages(el); el.querySelectorAll('[data-visual]').forEach((b) => b.onclick = () => enlarge(list.find((v) => v.id === b.dataset.visual)));
      el.querySelector('[data-canvas]').onclick = () => Screens.show(s);
      el.querySelector('[data-compare]').onclick = () => compare(s);
      el.querySelector('[data-add]')?.addEventListener('click', () => upload(s));
    } };
  }
  SC.addPanelSection('item', (id) => {
    if (id.startsWith('v:')) { const v = records.find((v) => 'v:' + v.id === id); const s = screens.find((s) => s.id === v?.screen); return s ? panel(s) : null; }
    const matches = screens.filter((s) => 'f:' + s.file === id);
    // A file can back multiple routes. Do not silently associate its images with the first route.
    if (matches.length === 1) return panel(matches[0]);
    if (matches.length > 1) return { top: true, html: `<div class="sec"><h3>Visuais por tela</h3>${matches.map((s) => `<button class="btn soft" data-vscreen="${h(s.id)}">${h(s.url)} · ${forScreen(s).length} visuais</button>`).join('')}</div>`, bind: (el) => el.querySelectorAll('[data-vscreen]').forEach((b) => b.onclick = () => Screens.show(screens.find((s) => s.id === b.dataset.vscreen))) };
    return null;
  });
  SC.addPanelSection('board', () => { const s = screens.find((s) => s.id === SC.state.answer?.screen); return s ? panel(s) : null; });
  SC.on('visual-open', enlarge);
  SC.on('visual-reveal', (v) => {
    const s = screens.find((s) => s.id === v.screen);
    if (s) { Screens.show(s); SC.select('v:' + v.id); }
  });

  function catalog() {
    const proposals = records.filter((v) => !v.unresolved && v.kind === 'proposal').length;
    const captures = records.filter((v) => !v.unresolved && v.kind === 'capture').length;
    const missing = screens.filter((s) => !forScreen(s).some(usable)).length;
    const orphan = records.filter((v) => v.unresolved).length;
    const d = dialog('Visuais das telas', `${G.project.name} · o planejamento e a implementação no mesmo lugar.`, `<div class="vs-coverage"><span><b>${screens.length}</b> telas</span><span><b>${proposals}</b> propostas</span><span><b>${captures}</b> capturas reais</span><span><b>${missing}</b> sem imagem</span></div>
      ${orphan ? `<p class="vs-error">${orphan} visuais sem tela correspondente. Os registros foram preservados em visuals.json para reassociar.</p>` : ''}
      <div class="vs-toolbar"><input type="search" aria-label="Buscar tela" placeholder="Buscar por nome, ID ou endereço…"><select aria-label="Filtrar visuais"><option value="all">Todas as telas</option><option value="proposal">Com propostas</option><option value="capture">Com capturas reais</option><option value="empty">Sem imagem</option></select></div><p class="vs-notice" data-count aria-live="polite"></p><div class="vs-grid"></div>`);
    const grid = d.querySelector('.vs-grid');
    const render = () => {
      const words = d.querySelector('input').value.toLowerCase().split(/\s+/).filter(Boolean), filter = d.querySelector('select').value;
      const list = screens.filter((s) => words.every((w) => `${s.name} ${s.url} ${s.file}`.toLowerCase().includes(w))).filter((s) => filter === 'all' || (filter === 'empty' ? !forScreen(s).some(usable) : forScreen(s).some((v) => v.kind === filter)));
      d.querySelector('[data-count]').textContent = `${list.length} de ${screens.length} telas · escolha uma para abrir no canvas`;
      grid.innerHTML = list.map((s) => {
        const refs = forScreen(s), thumb = refs.find((v) => v.approved && usable(v)) || refs.find(usable), proposals = refs.filter((v) => v.kind === 'proposal').length;
        return `<button class="vs-screen" data-screen="${h(s.id)}"><div class="vs-thumb">${thumb ? image(thumb) : 'Aguardando imagem'}</div><div class="vs-screen-copy"><strong>${h(s.name)}</strong><small>${proposals} propostas · ${refs.length - proposals} capturas reais</small><small>${h(s.url)}</small></div></button>`;
      }).join('');
      if (!list.length) grid.innerHTML = '<p class="vs-empty">Nenhuma tela corresponde a este filtro.</p>';
      grid.querySelectorAll('[data-screen]').forEach((b) => b.onclick = () => { d.close(); Screens.show(screens.find((s) => s.id === b.dataset.screen)); }); wireImages(grid);
    };
    d.querySelector('input').oninput = render; d.querySelector('select').onchange = render; render(); d.querySelector('input').focus();
  }
  SC.addHeaderButton({ id: 'btn-visuals', label: 'Visuais', icon: 'ui', title: 'Propostas e capturas reais por tela', onClick: catalog });
  SC.addPanelSection('overview', () => ({ top: true, html: `<div class="sec"><h3>Planejado e implementado</h3><p class="pd">${screens.length} telas · ${records.filter((v) => !v.unresolved).length} visuais vinculados</p><button class="btn soft" data-catalog>Explorar visuais</button></div>`, bind: (el) => el.querySelector('[data-catalog]').onclick = catalog }));
})();
