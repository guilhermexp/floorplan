// A client presentation is an allowlisted projection of one immutable local baseline.
// It never reads current documents or live image paths, and its gallery works offline.
import fs from 'node:fs';
import path from 'node:path';
import { readBaseline } from './project.mjs';

const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const text = value => typeof value === 'string' ? value : '';
const array = value => Array.isArray(value) ? value : [];
const strings = value => array(value).filter(v => typeof v === 'string');
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('pt-BR', { timeZone: 'UTC' }) + ' UTC' : 'Data não informada';
const list = values => values.length ? `<ul>${values.map(v => `<li>${h(v)}</li>`).join('')}</ul>` : '<p class="muted">Ainda não definido.</p>';
const card = (title, body) => `<article class="card"><h3>${h(title)}</h3>${body}</article>`;

/** Returns the complete offline artifact; the caller decides where to save/download it. */
export function exportClient(outDir, baselineId) {
  const baseline = readBaseline(outDir, baselineId);
  const plan = baseline.documents['plan.json'] || {}, arch = baseline.documents['architecture.json'] || {};
  const manifest = baseline.documents['visuals.json'];
  const assets = [], assetIndex = new Map(), visuals = [];
  const frozen = new Map(baseline.assets.map(a => [a.source, a]));
  for (const visual of array(manifest?.items)) {
    const asset = frozen.get(visual.asset);
    if (!asset) throw new Error('A versão selecionada não contém uma imagem referenciada.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(asset.mime)) throw new Error('Formato de imagem não suportado na apresentação.');
    let index = assetIndex.get(asset.sha256);
    if (index === undefined) {
      index = assets.length;
      assets.push(`data:${asset.mime};base64,${fs.readFileSync(path.join(baseline.directory, asset.path)).toString('base64')}`);
      assetIndex.set(asset.sha256, index);
    }
    visuals.push({ title: text(visual.title), kind: visual.kind === 'capture' ? 'capture' : 'proposal', viewport: text(visual.viewport), version: text(visual.version), state: text(visual.state), createdAt: text(visual.createdAt), asset: index });
  }
  // Only product-facing fields are copied. No spread of plan, graph, decision, visual,
  // or evidence objects: unknown future fields remain private by default.
  const labels = new Map(array(arch.nodes).map(n => [n.id, text(n.label)]));
  const product = {
    name: text(arch.project?.name) || 'Projeto', summary: text(arch.project?.summary),
    objective: text(plan.objective) || text(arch.project?.summary),
    included: strings(plan.scope?.included), excluded: strings(plan.scope?.excluded),
    requirements: array(plan.requirements).map(r => ({ title: text(r.title), description: text(r.description), criteria: array(r.criteria).map(c => text(c.text)) })),
    decisions: array(plan.decisions).map(d => ({ title: text(d.title), choice: text(d.choice), rationale: text(d.rationale) })),
    questions: array(plan.questions).map(q => typeof q === 'string' ? q : text(q.question)),
    areas: array(arch.nodes).map(n => ({ title: text(n.label), summary: text(n.summary) })),
    relationships: array(arch.edges).filter(e => labels.has(e.from) && labels.has(e.to)).map(e => ({ from: labels.get(e.from), to: labels.get(e.to), label: text(e.label) })),
    tour: array(arch.tour).map(s => ({ title: text(s.title), note: text(s.note) })),
    flows: array(arch.flows).map(f => ({ title: text(f.title), description: text(f.description), steps: array(f.steps).map(s => typeof s === 'string' ? '' : text(s.note)).filter(Boolean) })),
  };
  const accepted = baseline.acceptance ? `Aceitação registrada por ${h(baseline.acceptance.actor)} em ${h(date(baseline.acceptance.at))}.` : 'Em revisão · sem aceitação registrada.';
  const payload = JSON.stringify({ visuals, assets }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${h(product.name)} · ${h(baseline.title)}</title>
<style>
:root{color-scheme:light dark;--bg:#f6f6f4;--card:#fff;--ink:#1b1d1c;--muted:#666c68;--line:#dcdedb;--soft:#efefed;--accent:#4d6454}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 ui-sans-serif,system-ui,-apple-system,sans-serif}main{max-width:1120px;margin:auto;padding:56px 28px 80px}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(30px,6vw,48px);letter-spacing:-1.4px;line-height:1.1;margin:10px 0 18px}h2{font-size:25px;letter-spacing:-.6px;margin-bottom:18px}h3{font-size:17px;line-height:1.4;margin-bottom:10px}p{margin-bottom:12px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:700;color:var(--accent)}.muted{color:var(--muted);font-size:13px}.intro{max-width:780px;font-size:19px}.stamp{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin:22px 0}.stamp span,.badge{border:1px solid var(--line);border-radius:20px;padding:4px 11px}.badge{font-size:12px}.badge.capture{background:#26895614}.badge.proposal{background:#8066b514}section{padding-top:36px;margin-top:30px;border-top:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px}.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px}.card p:last-child,.card ul:last-child{margin-bottom:0}ul,ol{padding-left:22px}li+li{margin-top:6px}.tour{counter-reset:step;list-style:none;padding:0;display:grid;gap:12px}.tour li{counter-increment:step;padding:18px 20px 18px 54px;position:relative;background:var(--card);border:1px solid var(--line);border-radius:16px}.tour li::before{content:counter(step);position:absolute;left:20px;top:18px;font-size:13px;font-weight:700;color:var(--accent)}.tour p{font-size:14px}.gallery{display:grid;grid-template-columns:210px minmax(0,1fr);gap:22px}.thumbnails{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:start;max-height:760px;overflow:auto;padding:3px}.thumbnail{min-width:0;border:1px solid transparent;background:var(--soft);border-radius:10px;padding:8px;color:var(--ink);cursor:pointer;text-align:left}.thumbnail[aria-current=true]{border-color:var(--ink)}.thumbnail img{display:block;height:120px;max-width:100%;width:auto;margin:0 auto 6px;border:1px solid #454545;border-radius:8px;object-fit:contain;background:#fff}.thumbnail span{display:block;font-size:10px;line-height:1.4}.preview{min-width:0}.preview-top{display:flex;align-items:start;justify-content:space-between;gap:14px}.preview-top h3{margin-bottom:4px}.stage{min-height:300px;display:flex;align-items:center;justify-content:center;padding:22px 10px}.device{--ratio:.462;width:min(100%,calc(65vh * var(--ratio)));aspect-ratio:var(--ratio);border:2px solid #343434;border-radius:27px;overflow:hidden;background:#fff;box-shadow:0 10px 32px #0002}.device img{display:block;width:100%;height:100%;object-fit:contain}.device.tablet{border-radius:22px}.device.browser{border-radius:12px;aspect-ratio:auto}.device.browser::before{content:'●  ●  ●';display:block;background:#e7e7e7;color:#888;padding:3px 10px;font-size:9px;letter-spacing:2px}.device.browser img{aspect-ratio:var(--ratio);height:auto}.gallery-controls{display:flex;justify-content:center;align-items:center;gap:18px;padding:10px}.button{border:1px solid var(--line);border-radius:30px;min-width:44px;min-height:44px;background:var(--card);color:var(--ink);cursor:pointer;font:inherit}.button:disabled{opacity:.3;cursor:default}button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}[hidden]{display:none!important}footer{margin-top:54px;border-top:1px solid var(--line);padding-top:20px}.noscript{padding:12px;background:var(--soft)}
@media(prefers-color-scheme:dark){:root{--bg:#121413;--card:#1b1e1c;--ink:#ebedeb;--muted:#a3aaa5;--line:#353b37;--soft:#242a26;--accent:#adc9b5}}
@media(max-width:720px){main{padding:32px 18px 50px}.gallery{grid-template-columns:1fr}.thumbnails{display:flex;max-height:160px;order:2;overflow:auto}.thumbnail{min-width:94px}.thumbnail img{height:90px}.stage{padding:14px 0}.device{width:min(100%,calc(60vh * var(--ratio)))}.preview-top{flex-wrap:wrap}section{margin-top:22px;padding-top:24px}}
@media print{body{background:white;color:black}main{max-width:none;padding:0}.card,.tour li{break-inside:avoid}.gallery-controls,.thumbnails{display:none}.gallery{display:block}.device{width:260px;box-shadow:none}.stamp{margin-top:12px}}
</style></head><body><main>
<header><div class="eyebrow">Blueprint do projeto</div><h1>${h(product.name)}</h1><p class="intro">${h(product.objective)}</p>
<div class="stamp"><span>${h(baseline.title)}</span><span>${h(date(baseline.createdAt))}</span><span>Revisão ${h(baseline.revision.slice(0,12))}</span></div><p class="muted">${accepted}</p></header>
<section><h2>Escopo desta versão</h2><div class="grid">${card('Incluído', list(product.included))}${card('Fora do escopo', list(product.excluded))}</div></section>
${product.requirements.length ? `<section><h2>O que será entregue</h2><div class="grid">${product.requirements.map(r => card(r.title, `${r.description ? `<p>${h(r.description)}</p>` : ''}<p class="muted">Critérios de aceite</p>${list(r.criteria)}`)).join('')}</div></section>` : ''}
${product.areas.length ? `<section><h2>Como o projeto se organiza</h2><div class="grid">${product.areas.map(n => card(n.title, `<p>${h(n.summary)}</p>`)).join('')}</div>
${product.relationships.length ? `<ol class="tour" aria-label="Relações entre as partes">${product.relationships.map(e => `<li><h3>${h(e.from)} → ${h(e.to)}</h3>${e.label ? `<p>${h(e.label)}</p>` : ''}</li>`).join('')}</ol>` : ''}</section>` : ''}
${product.tour.length ? `<section><h2>Conheça a jornada</h2><ol class="tour">${product.tour.map(s => `<li>${s.title ? `<h3>${h(s.title)}</h3>` : ''}<p>${h(s.note)}</p></li>`).join('')}</ol></section>` : ''}
${product.flows.length ? `<section><h2>Fluxos principais</h2><div class="grid">${product.flows.map(f => card(f.title, `<p>${h(f.description)}</p>${f.steps.length ? `<ol>${f.steps.map(s => `<li>${h(s)}</li>`).join('')}</ol>` : ''}`)).join('')}</div></section>` : ''}
${visuals.length ? `<section id="visuals"><h2>Telas do projeto</h2><p class="muted">Propostas e capturas desta versão. Use as setas ou selecione uma miniatura para navegar.</p>
<div class="gallery"><div class="thumbnails" id="visual-thumbnails" aria-label="Miniaturas das telas"></div><div class="preview"><div class="preview-top"><div><h3 id="visual-title"></h3><p class="muted" id="visual-meta"></p></div><span class="badge" id="visual-kind"></span></div><div class="stage"><div class="device" id="visual-device"><img id="visual-image" alt=""></div></div><nav class="gallery-controls" aria-label="Navegação das telas"><button class="button" id="visual-prev" aria-label="Imagem anterior">←</button><span id="visual-count" aria-live="polite"></span><button class="button" id="visual-next" aria-label="Próxima imagem">→</button></nav></div></div><noscript><p class="noscript">Ative JavaScript para navegar pelas ${visuals.length} imagens incorporadas a este arquivo.</p></noscript></section>` : ''}
${product.decisions.length ? `<section><h2>Decisões da solução</h2><div class="grid">${product.decisions.map(d => card(d.title, `<p><b>${h(d.choice)}</b></p><p>${h(d.rationale)}</p>`)).join('')}</div></section>` : ''}
${product.questions.length ? `<section><h2>Decisões ainda em aberto</h2>${list(product.questions)}</section>` : ''}
<footer><p class="muted">Esta apresentação preserva uma versão do planejamento. Propostas visuais e implementação observada não substituem a verificação dos critérios de aceite. Gerado com Floorplan.</p></footer>
</main><script id="blueprint-data" type="application/json">${payload}</script>
<script>
(() => {
  const data = JSON.parse(document.getElementById('blueprint-data').textContent);
  if (!data.visuals.length) return;
  const get = id => document.getElementById(id);
  const title = get('visual-title'), meta = get('visual-meta'), kind = get('visual-kind'), image = get('visual-image'), device = get('visual-device');
  const previous = get('visual-prev'), next = get('visual-next'), counter = get('visual-count'), thumbnails = get('visual-thumbnails');
  let index = 0;
  const buttons = data.visuals.map((visual, position) => {
    const button = document.createElement('button'); button.className = 'thumbnail'; button.setAttribute('aria-label', visual.title);
    const img = document.createElement('img'); img.src = data.assets[visual.asset]; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    const label = document.createElement('span'); label.textContent = visual.title;
    button.appendChild(img); button.appendChild(label); button.addEventListener('click', () => show(position)); thumbnails.appendChild(button); return button;
  });
  function show(position) {
    index = Math.max(0, Math.min(data.visuals.length - 1, position));
    const visual = data.visuals[index], viewport = visual.viewport || '', dimensions = /(\\d+)\\s*[x×]\\s*(\\d+)/i.exec(viewport);
    const ratio = dimensions && +dimensions[2] > 0 ? +dimensions[1] / +dimensions[2] : 390 / 844;
    const tablet = /tablet|ipad/i.test(viewport), browser = /desktop|browser|web|navegador/i.test(viewport) || (!/mobile|phone|celular|android/i.test(viewport) && ratio > 1 && !tablet);
    device.className = 'device ' + (tablet ? 'tablet' : browser ? 'browser' : 'phone'); device.style.setProperty('--ratio', Math.max(.25, Math.min(3, ratio)));
    title.textContent = visual.title; image.src = data.assets[visual.asset]; image.alt = visual.title;
    meta.textContent = [visual.version, visual.viewport, visual.state, visual.kind === 'capture' && visual.createdAt ? visual.createdAt : ''].filter(Boolean).join(' · ');
    kind.textContent = visual.kind === 'capture' ? 'Captura real' : 'Proposta'; kind.className = 'badge ' + visual.kind;
    counter.textContent = (index + 1) + ' / ' + data.visuals.length; previous.disabled = index === 0; next.disabled = index === data.visuals.length - 1;
    buttons.forEach((button, i) => button.setAttribute('aria-current', i === index ? 'true' : 'false'));
  }
  previous.addEventListener('click', () => show(index - 1)); next.addEventListener('click', () => show(index + 1));
  document.addEventListener('keydown', event => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  show(0);
})();
</script></body></html>`;
  return { html, name: `${baseline.id}-blueprint.html` };
}
