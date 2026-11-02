// Screen references are durable project content, separate from generated code descriptions.
(() => {
  const SC = window.Floorplan, Screens = window.FloorplanScreens;
  if (!SC || !Screens) return;
  const { h } = SC, G = SC.graph, server = window.FLOORPLAN_SERVER;
  const records = G.visuals || [], screens = Screens.list;
  const forScreen = (s) => records.filter((v) => !v.unresolved && v.screen === s.id);
  const kindName = (v) => v.kind === 'capture' ? 'Captura real' : 'Proposta';
  const usable = (v) => v && !v.missing && !!SC.visualSrc(v);
  const stamp = (v) => v.createdAt ? new Date(v.createdAt).toLocaleString(window.FloorplanI18n?.get() || 'pt-BR') : 'Data não informada';
  const badge = (v) => `<span class="visual-badge ${h(v.kind)}">${kindName(v)}</span>${v.approved ? '<span class="visual-approved">Aprovada</span>' : ''}`;
  const meta = (v) => [v.version, v.viewport, v.state].filter(Boolean).map(h).join(' · ');
  const image = (v, cls = '') => usable(v) ? `<img class="${cls}" src="${h(SC.visualSrc(v))}" alt="${h(v.title)}" loading="lazy" decoding="async">` : '<span class="vs-empty">Imagem indisponível. O registro foi preservado.</span>';
  // Match the canvas proportions, while allowing the gallery to identify tablet and browser chrome.
  function deviceFrame(v) {
    if (!usable(v)) return image(v);
    const viewport = v.viewport || '', match = /(\d+)\s*[x×]\s*(\d+)/i.exec(viewport);
    const width = match && +match[1] > 0 ? +match[1] : 0, height = match && +match[2] > 0 ? +match[2] : 0;
    const measured = width && height ? width / height : 0;
    const tablet = /tablet|ipad/i.test(viewport), browser = /desktop|browser|web|navegador/i.test(viewport);
    const phone = /mobile|phone|android|celular/i.test(viewport);
    const type = tablet ? 'tablet' : browser ? 'browser' : phone ? 'phone' : width && height && Math.min(width,height) >= 600 && Math.max(width,height) <= 1400 && Math.max(measured,1/measured) <= 1.6 ? 'tablet' : measured > 1 ? 'browser' : 'phone';
    const ratio = Math.max(.25,Math.min(3,measured || (type === 'browser' ? 1.5 : type === 'tablet' ? .75 : 390/844)));
    const chrome = type === 'browser' ? '<div class="vs-browser-chrome" aria-hidden="true"><svg viewBox="0 0 30 8"><circle cx="4" cy="4" r="2"/><circle cx="15" cy="4" r="2"/><circle cx="26" cy="4" r="2"/></svg><span></span></div>' : '';
    return `<div class="vs-device vs-device-${type}" style="--device-ratio:${ratio}">${chrome}${image(v)}</div>`;
  }
  const source = (v) => v.kind === 'capture' && /^https?:\/\//i.test(v.sourceUrl || '') ? `<a href="${h(v.sourceUrl)}" target="_blank" rel="noopener noreferrer">${h(v.sourceUrl)}</a>` : '';
  const css = document.createElement('style');
  css.textContent = `
.card.visual-card { padding:0; gap:0; background:transparent; box-shadow:none; border-radius:0; overflow:visible; }
.node:hover .card.visual-card, .node.sel .card.visual-card { background:transparent; box-shadow:none; }
.visual-card .visual-image, .vs-device { background:#fff; border:2px solid #343434; border-radius:28px; box-shadow:0 5px 18px #0002; overflow:hidden; color:#555; }
.visual-card .visual-image { height:calc(var(--visual-height) - 56px); flex:none; width:100%; display:flex; align-items:center; justify-content:center; }
.visual-card.visual-desktop .visual-image, .vs-device-browser { border-radius:12px; }
.visual-card .visual-image img { display:block; width:100%; height:100%; object-fit:contain; pointer-events:none; }
.node.sel .visual-card .visual-image { outline:1px solid var(--ring); outline-offset:3px; }
svg.dim .node:not(.hl) .card.visual-card > * { opacity:1; }
html.wk svg.dim .node:not(.hl):has(.visual-card) foreignObject { opacity:1; }
.visual-caption { height:56px; padding:10px 2px 0; }
.visual-caption-top { display:flex; gap:8px; align-items:center; }
.visual-title { font-size:12px; font-weight:500; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
.visual-caption-meta { font-size:10px; color:var(--text-3); margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.visual-caption .visual-badge { font-size:9px; padding:2px 6px; flex:none; }
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
.vs-screen { background:transparent; border:0; border-radius:14px; padding:0; overflow:visible; text-align:left; color:var(--text); cursor:pointer; font:inherit; transition:border-color .15s; }
.vs-screen:hover .vs-device { outline:1px solid var(--ring); outline-offset:3px; }
.vs-thumb { height:174px; container-type:size; display:flex; align-items:center; justify-content:center; background:transparent; color:var(--text-3); font-size:12px; }
.vs-device { --device-bar:0px; flex:none; width:min(calc(100cqw - 12px),calc((100cqh - var(--device-bar) - 12px) * var(--device-ratio))); }
.vs-device img { display:block; width:100%; height:auto; aspect-ratio:var(--device-ratio); object-fit:contain; }
.vs-device-tablet { border-radius:20px; }
.vs-device-browser { --device-bar:24px; }
.vs-browser-chrome { height:var(--device-bar); display:flex; gap:12px; align-items:center; padding:0 9px; background:#f0f0f0; border-bottom:1px solid #ddd; }
.vs-browser-chrome svg { width:30px; height:8px; fill:#929292; flex:none; }
.vs-browser-chrome span { height:50%; width:62%; background:#fff; border-radius:4px; }
.vs-thumb .vs-device { border-width:1px; border-radius:9px; box-shadow:0 2px 7px #0002; }
.vs-thumb .vs-device-browser { --device-bar:10px; border-radius:5px; }
.vs-thumb .vs-browser-chrome { padding:0 3px; gap:4px; }
.vs-thumb .vs-browser-chrome svg { width:16px; height:5px; }
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
.vs-gallery[open] { display:flex; flex-direction:column; width:calc(100vw - 32px); height:calc(100dvh - 32px); overflow:hidden; }
.vs-gallery > .vs-head { flex:none; padding:14px 20px 12px; }
.vs-gallery .vs-head h2 { font-size:20px; }
.vs-gallery > .vs-body { display:flex; flex-direction:column; flex:1; min-height:0; padding:12px 20px 16px; overflow:hidden; }
.vs-gallery .vs-coverage, .vs-gallery .vs-toolbar, .vs-gallery [data-count] { flex:none; }
.vs-gallery .vs-browser { flex:1; overflow:hidden; }
.vs-gallery .vs-library { height:100%; overflow:auto; padding:4px; }
.vs-gallery .vs-thumb { height:clamp(220px,30dvh,360px); }
.vs-browser { min-height:0; }
.vs-preview-pane[hidden] { display:none; }
.vs-browsing { overflow:hidden; }
.vs-browsing .vs-coverage { display:none; }
.vs-browsing .vs-toolbar { flex:none; margin-bottom:6px; }
.vs-browsing [data-count] { margin:0 0 8px; padding:6px 0; flex:none; }
.vs-browsing .vs-browser { display:grid; grid-template-columns:clamp(300px,25vw,420px) minmax(0,1fr); gap:20px; flex:1; overflow:hidden; }
.vs-browsing .vs-library { overflow:auto; min-height:0; padding:2px 8px 4px 2px; }
.vs-browsing .vs-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.vs-browsing .vs-thumb { height:clamp(200px,26dvh,300px); }
.vs-browsing .vs-screen-copy { padding:10px; }
.vs-browsing .vs-screen-copy small { display:none; }
.vs-browsing .vs-screen-copy strong { font-size:11px; margin:0; }
.vs-screen[aria-current=true] .vs-device { outline:2px solid var(--ring); outline-offset:3px; }
.vs-preview-pane { display:flex; flex-direction:column; gap:12px; min-width:0; min-height:0; }
.vs-preview-heading { display:flex; gap:14px; justify-content:space-between; align-items:start; flex:none; }
.vs-preview-heading h3 { margin:0 0 5px; font-size:17px; font-weight:600; }
.vs-preview-heading p { margin:0; color:var(--text-3); font-size:12px; line-height:1.6; }
.vs-carousel-image { flex:1; min-height:0; container-type:size; display:flex; align-items:center; justify-content:center; overflow:hidden; background:transparent; }
.vs-carousel-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; flex:none; flex-wrap:wrap; }
.vs-carousel-nav { display:flex; align-items:center; gap:12px; }
.vs-carousel-nav .btn { min-height:44px; min-width:44px; font-size:20px; }
.vs-carousel-nav span { font-size:12px; color:var(--text-3); font-variant-numeric:tabular-nums; min-width:64px; text-align:center; }
.vs-carousel-footer .vs-actions { margin:0; }
.vs-toolbar [data-journey] { max-width:38%; }
.vs-step-note { margin:0; flex:none; max-height:44px; overflow:auto; font-size:12px; line-height:1.5; color:var(--text-2); }
.vs-transitions { flex:none; font-size:12px; }
.vs-transitions summary { cursor:pointer; padding:6px 0; }
.vs-transitions [data-transitions] { display:flex; gap:8px; max-height:110px; overflow:auto; padding:4px; }
.vs-transitions button { display:flex; flex-direction:column; align-items:flex-start; flex-shrink:0; border-radius:10px; text-align:left; min-width:180px; max-width:300px; white-space:normal; }
.vs-transitions small { display:block; font-size:11px; color:var(--text-3); margin-top:4px; }
.vs-actions [data-version] { max-width:220px; }
@media(max-width:760px) { .vs-toolbar [data-journey] { max-width:100%; } }

@media(max-width:760px) { .vs-browsing .vs-browser{grid-template-columns:minmax(0,1fr)} .vs-browsing .vs-library{display:none} .vs-gallery[open]{width:calc(100vw - 12px);height:calc(100dvh - 12px);max-height:calc(100dvh - 12px)} .vs-browsing .vs-body{padding:12px} .vs-preview-heading h3{font-size:15px} .vs-carousel-nav{gap:6px} }
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

  function catalog(initialJourney) {
    const journeys = G.navigation?.journeys || [], byScreen = new Map(screens.map(s=>[s.id,s]));
    const d = dialog('Visuais das telas', `${G.project.name} · navegue pelas jornadas ou consulte o catálogo completo.`, `
      <div class="vs-toolbar"><select data-journey aria-label="Jornada de navegação">${journeys.map(j=>`<option value="${h(j.id)}">${h(j.actor)} · ${h(j.title)}</option>`).join('')}<option value="">Todas as telas · catálogo</option></select><input data-search type="search" aria-label="Buscar tela" placeholder="Buscar nas miniaturas…"><select data-kind aria-label="Filtrar visuais"><option value="all">Todos os visuais</option><option value="proposal">Propostas</option><option value="capture">Capturas reais</option><option value="empty">Sem imagem</option></select></div>
      <p class="vs-notice" data-count aria-live="polite"></p><div class="vs-browser"><div class="vs-library"><div class="vs-grid"></div></div><section class="vs-preview-pane" aria-label="Preview da imagem" hidden>
      <div class="vs-preview-heading"><div><h3 data-preview-title tabindex="-1"></h3><p data-preview-meta></p></div><button class="btn soft" data-thumbnails>Miniaturas</button></div>
      <p class="vs-step-note" data-step-note></p><div class="vs-carousel-image"></div>
      <details class="vs-transitions" hidden><summary>Ações e caminhos desta etapa</summary><div data-transitions></div></details>
      <div class="vs-carousel-footer"><div class="vs-carousel-nav"><button class="btn soft" data-prev aria-label="Etapa anterior">←</button><span data-position aria-live="polite"></span><button class="btn soft" data-next aria-label="Próxima etapa">→</button></div><div class="vs-actions"><select data-version aria-label="Versão da imagem" hidden></select><button class="btn soft" data-expand>Ampliar</button><button class="btn soft" data-open-canvas>Abrir no canvas</button></div></div></section></div>`);
    d.classList.add('vs-gallery');
    const grid = d.querySelector('.vs-grid'), pane=d.querySelector('.vs-preview-pane'), journeySelect=d.querySelector('[data-journey]');
    if(typeof initialJourney==='string' && journeys.some(j=>j.id===initialJourney)) journeySelect.value=initialJourney;
    let journey, player, slides=[], index=-1, currentVisual;
    const versions = new Map();
    const kind = () => d.querySelector('[data-kind]').value;
    const refs = screen => forScreen(screen).filter(v=>!['proposal','capture'].includes(kind()) || v.kind===kind());
    const selectedVisual = (screen, step) => {
      const list=refs(screen);
      return list.find(v=>v.id===versions.get(step || screen.id)) || list.find(v=>v.approved && usable(v)) || list.find(usable) || list[0];
    };
    function previousStep() { const pos=journey?.path.indexOf(player.current); return pos>0 ? journey.path[pos-1] : null; }
    function preview(next, focus=false) {
      if (!slides.length) { pane.hidden=true; d.classList.remove('vs-browsing'); index=-1; return; }
      index=Math.max(0,Math.min(slides.length-1,next));
      const slide=slides[index], screen=slide.screen, step=slide.step;
      if(player && player.current!==step.id) player.inspect(step.id);
      currentVisual=journey ? selectedVisual(screen,step.id) : slide.visual;
      pane.hidden=false; d.classList.add('vs-browsing');
      d.querySelector('[data-preview-title]').textContent=screen.name;
      d.querySelector('[data-preview-meta]').textContent=currentVisual ? [kindName(currentVisual),currentVisual.version,currentVisual.viewport,currentVisual.state].filter(Boolean).join(' · ') : 'Sem visual correspondente ao filtro. A etapa continua na jornada.';
      d.querySelector('[data-step-note]').textContent=step ? [step.note,step.end?'Resultado desta jornada.':''].filter(Boolean).join(' ') : '';
      d.querySelector('[data-step-note]').hidden=!step;
      d.querySelector('.vs-carousel-image').innerHTML=currentVisual ? deviceFrame(currentVisual) : '<p class="vs-empty">Esta etapa ainda não tem uma imagem disponível neste filtro.</p>';
      const routeIndex=journey?.path.indexOf(step?.id);
      d.querySelector('[data-position]').textContent=journey ? routeIndex>=0?`${routeIndex+1} / ${journey.path.length}`:'Alternativa' : `${index+1} / ${slides.length}`;
      const nextEdge=player?.next();
      d.querySelector('[data-prev]').disabled=journey ? !player.history.length && !previousStep() : index===0;
      d.querySelector('[data-next]').disabled=journey ? !nextEdge : index===slides.length-1;
      d.querySelector('[data-next]').title=nextEdge ? [nextEdge.action,nextEdge.condition].filter(Boolean).join(' — ') : journey?'Escolha uma ação desta etapa ou volte.':'Próxima imagem';
      d.querySelector('[data-expand]').disabled=!usable(currentVisual);
      d.querySelector('[data-open-canvas]').disabled=!byScreen.has(screen.id);
      const selector=d.querySelector('[data-version]'), list=journey?refs(screen):[];
      selector.hidden=list.length<2;
      selector.innerHTML=list.map(v=>`<option value="${h(v.id)}">${h([kindName(v),v.version,v.state].filter(Boolean).join(' · '))}</option>`).join('');
      if(currentVisual) selector.value=currentVisual.id;
      const edges=player?.outgoing() || [], branchBox=d.querySelector('.vs-transitions');
      branchBox.hidden=!edges.length;
      // Conditions are explicit: choosing a transition previews a proposal, never executes it.
      d.querySelector('[data-transitions]').innerHTML=edges.map((e,n)=>`<button class="btn soft" data-edge="${n}"><b>${h(e.action)}</b>${e.condition?`<small>${h(e.condition)}</small>`:''}<small>→ ${h(byScreen.get(journey.steps.find(s=>s.id===e.to)?.screen)?.name || journey.steps.find(s=>s.id===e.to)?.screen)}</small></button>`).join('');
      branchBox.open=!!journey && !nextEdge && edges.length>0 && !step.end;
      d.querySelectorAll('[data-edge]').forEach(b=>b.onclick=()=>{ if(player.go(edges[+b.dataset.edge].to)) preview(slides.findIndex(s=>s.step.id===player.current)); });
      grid.querySelectorAll('[data-slide]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.slide===index)));
      wireImages(pane);
      if(focus) d.querySelector('[data-preview-title]').focus({preventScroll:true});
    }
    function move(delta) {
      if(!journey) return preview(index+delta);
      if(delta>0) { const edge=player.next(); if(!edge || !player.go(edge.to)) return; }
      else if(!player.back()) { const target=previousStep(); if(!target) return; player.inspect(target); }
      preview(slides.findIndex(s=>s.step.id===player.current));
    }
    function render(reset=false) {
      const old=slides[index], words=d.querySelector('[data-search]').value.toLowerCase().split(/\s+/).filter(Boolean);
      if(reset) { journey=journeys.find(j=>j.id===journeySelect.value); player=journey?window.FloorplanJourneys.createPlayer(journey):null; }
      if(journey) {
        const ordered=[...journey.path,...journey.steps.map(s=>s.id).filter(id=>!journey.path.includes(id))];
        slides=ordered.map(id=>{const step=journey.steps.find(s=>s.id===id);return {step,screen:byScreen.get(step.screen) || {id:step.screen,name:'Tela indisponível no mapa',url:'',file:''}};});
      } else {
        slides=screens.filter(s=>words.every(w=>`${s.name} ${s.url} ${s.file}`.toLowerCase().includes(w))).filter(s=>kind()!=='empty' || !forScreen(s).some(usable)).flatMap(screen=>{
          const list=refs(screen); if(['proposal','capture'].includes(kind()) && !list.length) return [];
          return list.length?list.map(visual=>({screen,visual})):[{screen}];
        });
      }
      const seen=new Set();
      grid.innerHTML=slides.map((slide,i)=>{
        const {screen,step}=slide;
        if(!journey && seen.has(screen.id)) return ''; seen.add(screen.id);
        if(journey && (!words.every(w=>`${screen.name} ${screen.url} ${step.note||''}`.toLowerCase().includes(w)) || kind()==='empty' && forScreen(screen).some(usable))) return '';
        const visual=journey?selectedVisual(screen,step.id):slide.visual, pos=journey?.path.indexOf(step?.id);
        return `<button class="vs-screen" data-slide="${i}"><div class="vs-thumb">${visual?deviceFrame(visual):'Aguardando imagem'}</div><div class="vs-screen-copy"><strong>${journey?pos>=0?`${pos+1}. `:'Alternativa · ':''}${h(screen.name)}</strong><small>${h(screen.url)}</small></div></button>`;
      }).join('') || '<p class="vs-empty">Nenhuma miniatura corresponde à busca.</p>';
      d.querySelector('[data-count]').textContent=journey ? `${journey.actor} · ${journey.goal} · Proposta de navegação. A busca filtra miniaturas, sem pular etapas.` : `${new Set(slides.map(s=>s.screen.id)).size} telas · Catálogo por grupo e endereço; não representa uma jornada.`;
      grid.querySelectorAll('[data-slide]').forEach(b=>b.onclick=()=>preview(+b.dataset.slide,true));wireImages(grid);
      if(journey) preview(slides.findIndex(s=>s.step.id===player.current));
      else if(!pane.hidden) { const kept=reset?-1:slides.findIndex(s=>s.visual?.id===old?.visual?.id && s.screen.id===old?.screen.id); preview(kept<0?0:kept); }
    }
    d.querySelector('[data-prev]').onclick=()=>move(-1);d.querySelector('[data-next]').onclick=()=>move(1);
    d.querySelector('[data-thumbnails]').onclick=()=>{pane.hidden=true;d.classList.remove('vs-browsing');};
    d.querySelector('[data-expand]').onclick=()=>{if(usable(currentVisual)) enlarge(currentVisual);};
    d.querySelector('[data-open-canvas]').onclick=()=>{const s=byScreen.get(slides[index]?.screen.id);if(s){d.close();Screens.show(s);}};
    d.querySelector('[data-version]').onchange=e=>{versions.set(slides[index].step.id,e.target.value);preview(index);};
    d.addEventListener('keydown',e=>{if(pane.hidden || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
    journeySelect.onchange=()=>render(true);d.querySelector('[data-search]').oninput=()=>render();d.querySelector('[data-kind]').onchange=()=>render();render(true);
  }
  SC.openVisuals = catalog;
  SC.addHeaderButton({ id: 'btn-visuals', label: 'Visuais', icon: 'ui', title: 'Propostas e capturas reais por tela', onClick: catalog });
  SC.addPanelSection('overview', () => ({ top: true, html: `<div class="sec"><h3>Planejado e implementado</h3><p class="pd">${screens.length} telas · ${records.filter((v) => !v.unresolved).length} visuais vinculados</p><button class="btn soft" data-catalog>Explorar visuais</button></div>`, bind: (el) => el.querySelector('[data-catalog]').onclick = catalog }));
})();
