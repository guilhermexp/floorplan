// One planning view over the same project used by the canvas, agent and local baseline store.
(() => {
  const SC = window.Floorplan;
  if (!SC?.graph.lifecycle) return;
  const { h } = SC, server = window.FLOORPLAN_SERVER;
  const editable = !!server && !SC.exported;
  let lifecycle = SC.graph.lifecycle, pending = false;
  const reopenKey = 'floorplan.project.reopen';
  function retainPlanning() {
    try { sessionStorage.setItem(reopenKey, JSON.stringify({ revision: lifecycle.revision, expires: Date.now() + 60_000 })); } catch {}
  }
  function forgetPlanning() { try { sessionStorage.removeItem(reopenKey); } catch {} }
  const text = (pt, en) => window.FloorplanI18n?.get() === 'en' ? en : pt;
  const status = (value) => ({
    concept: text('Conceito', 'Concept'), scope: text('Escopo', 'Scope'), architecture: text('Arquitetura', 'Architecture'), implementation: text('Implementação', 'Implementation'),
    unknown: text('Desconhecida', 'Unknown'), 'not-observed': text('Não observada', 'Not observed'), partial: text('Parcial', 'Partial'), observed: text('Observada', 'Observed'),
    unverified: text('Não verificada', 'Unverified'), passed: text('Verificada', 'Verified'), failed: text('Falhou', 'Failed'), stale: text('Desatualizada', 'Outdated'),
    current: text('Atual', 'Current'), draft: text('Rascunho', 'Draft'), accepted: text('Aceita', 'Accepted'), proposed: text('Em revisão', 'In review'), review: text('Em revisão', 'In review'), superseded: text('Substituída', 'Superseded'),
  }[value] || value || text('Não informada', 'Not specified'));
  const list = (values) => values?.length ? `<ul>${values.map(v => `<li>${h(v)}</li>`).join('')}</ul>` : `<p class="project-muted">${text('Ainda não definido.', 'Not defined yet.')}</p>`;
  const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(window.FloorplanI18n?.get() || 'pt-BR') : text('Data não informada', 'Date not specified');
  const badge = (value) => `<span class="project-badge project-${h(value || 'unknown')}">${h(status(value))}</span>`;
  const css = document.createElement('style');
  css.textContent = `
    #modal .box:has(.project-overview) { width:min(960px,calc(100vw - 32px)); max-width:960px; display:flex; flex-direction:column; overflow:hidden; }
    #modal .box:has(.project-overview) > h2,#modal .box:has(.project-overview) > .ma { flex:none; }
    #modal .box:has(.project-overview) > .mb { min-height:0; overflow:auto; padding-right:4px; }
    .project-overview { font-size:14px; line-height:1.6; }
    .project-overview h3 { margin:0 0 8px; font-size:16px; color:var(--text); }
    .project-overview h4 { margin:0 0 6px; font-size:14px; }
    .project-overview p { margin:6px 0; }
    .project-overview ul { margin:8px 0; padding-left:21px; }
    .project-overview section + section { border-top:1px solid var(--hair-2); margin-top:24px; padding-top:22px; }
    .project-muted { color:var(--text-3); font-size:12px; }
    .project-scope { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
    .project-card { background:rgba(var(--ink),.035); border:1px solid var(--hair-2); border-radius:14px; padding:16px; margin:10px 0; }
    .project-status { display:flex; gap:8px 18px; flex-wrap:wrap; font-size:12px; color:var(--text-2); }
    .project-badge { display:inline-block; padding:2px 8px; border:1px solid var(--hair-2); border-radius:20px; font-size:11px; color:var(--text-2); }
    .project-passed,.project-current { background:rgba(52,211,153,.1); }
    .project-stale,.project-failed { background:var(--warn-bg); color:var(--warn-text); }
    .project-alert { background:var(--warn-bg); color:var(--warn-text); border-radius:10px; padding:10px 12px; font-size:13px; margin:10px 0; }
    .project-baseline { display:flex; gap:12px; justify-content:space-between; align-items:center; }
    .project-baseline > div { min-width:0; }
    .project-baseline .btn { flex:none; }
    .project-form { display:grid; gap:12px; }
    .project-form label { display:grid; gap:5px; font-size:13px; }
    .project-form input { border:1px solid var(--hair-2); border-radius:10px; padding:10px 12px; color:var(--text); background:rgba(var(--ink),.035); font:inherit; }
    .project-form input:focus-visible { outline:2px solid var(--ring); outline-offset:2px; }
    .project-form [hidden],.project-overview [hidden] { display:none; }
    .project-implementation { flex:none; font-size:9px; line-height:1.4; border:1px solid var(--hair-2); border-radius:12px; padding:2px 6px; color:var(--text-3); font-weight:400; }
    .project-implementation.planned { border-style:dashed; }
    @media(max-width:600px) { .project-scope { grid-template-columns:1fr; gap:12px; } .project-baseline { align-items:start; flex-direction:column; } }
  `;
  document.head.appendChild(css);

  const files = new Map((SC.graph.files || []).map(f => [f.p, f]));
  function markImplementation() {
    if (SC.graph.meta.blueprint || !lifecycle.plan) return;
    for (const [ref, card] of SC.state.chipEls || []) {
      if (!ref.startsWith('f:') && !ref.startsWith('m:')) continue;
      const state = files.get(ref.slice(2))?.implementation;
      if (!['planned', 'observed'].includes(state)) continue;
      const head = card.querySelector('.head'); if (!head) continue;
      let badge = card.querySelector('.project-implementation');
      if (!badge) { badge = document.createElement('span'); badge.setAttribute('data-no-translate', ''); head.appendChild(badge); }
      badge.className = 'project-implementation ' + state;
      badge.textContent = state === 'planned' ? text('Planejado', 'Planned') : text('Observado', 'Observed');
      badge.title = state === 'planned' ? text('Previsto no planejamento; ainda não encontrado no código.', 'Planned; not found in the observed code yet.') : text('Encontrado no código. A verificação dos requisitos é independente.', 'Found in code. Requirement verification is separate.');
    }
  }
  SC.on('render', markImplementation);
  SC.on('ready', async () => {
    markImplementation();
    let retained;
    try { retained = JSON.parse(sessionStorage.getItem(reopenKey) || 'null'); } catch {}
    forgetPlanning();
    if (!SC.exported && retained?.revision === lifecycle.revision && retained.expires > Date.now()) await openPlanning();
  });

  async function request(url, options = {}) {
    if (!['/api/project', '/api/project/baseline', '/api/export'].includes(url)) throw new Error('Unsupported project API route');
    const result = await fetch(url, { ...options, headers: { 'x-floorplan-token': server.token, ...(options.body ? { 'content-type': 'application/json' } : {}) } });
    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      throw new Error(error.error || (result.status === 403 ? text('O servidor reiniciou. Recarregue a página.', 'The server restarted. Reload this page.') : text('Não foi possível concluir a operação.', 'The operation could not be completed.')));
    }
    return result;
  }
  const errorText = (e) => e.message === 'Failed to fetch' ? text('O servidor local não respondeu. Reabra o mapa e tente novamente.', 'The local server did not respond. Reopen the map and try again.') : e.message;

  function stackContents() {
    const report = lifecycle.technologyStack;
    if (!report) return `<section><h3>${text('Stack do projeto', 'Project technology stack')}</h3>${list(lifecycle.plan?.stack)}</section>`;
    const language = window.FloorplanI18n?.get() === 'en' ? 2 : 1;
    const plan = lifecycle.plan || {};
    return `<section data-project-stack><h3>${text('Stack do projeto', 'Project technology stack')}</h3>
      <p class="project-muted">${text('Tecnologias, finalidade e escolhas pendentes. Uma escolha planejada não comprova instalação ou implementação.', 'Technologies, purpose and pending choices. A planned choice does not prove installation or implementation.')}</p>
      ${!report.items.length && report.legacy.length ? `<h4>${text('Resumo do plano anterior', 'Legacy plan summary')}</h4>${list(report.legacy)}` : ''}
      ${report.categories.map(([id, pt, en]) => {
        const items = report.items.filter(item => item.category === id);
        return `<details class="project-card" open><summary><b>${h(language === 2 ? en : pt)}</b> · ${items.length || text('Não avaliada', 'Not assessed')}</summary>
          ${items.length ? items.map(item => `<article style="margin-top:14px"><h4>${h(item.technology || (item.status === 'not-needed' ? text('Sem componente', 'No component') : item.purpose))} <span class="project-badge">${h(report.statuses[item.status]?.[language - 1] || item.status)}</span></h4>
            ${item.technology ? `<p>${h(item.purpose)}</p>` : ''}<p class="project-muted">${h(item.rationale)}</p>
            ${item.version ? `<p>${text('Versão / critério', 'Version / criterion')}: ${h(item.version)}</p>` : ''}
            ${(item.decisions || []).map(id => `<p class="project-muted">${text('Decisão', 'Decision')}: ${h(plan.decisions?.find(d => d.id === id)?.title || id)}</p>`).join('')}
            ${(item.questions || []).map(id => `<p class="project-muted">${text('Questão associada', 'Related question')}: ${h(plan.questions?.find(q => q.id === id)?.question || id)}</p>`).join('')}
            ${item.questions?.length ? `<button class="btn soft" data-stack-questions="${h(item.questions[0])}">${text('Abrir perguntas', 'Open questions')}</button>` : ''}</article>`).join('') : `<p class="project-muted">${text('Definir tecnologia ou registrar por que esta categoria não se aplica ao projeto.', 'Choose technologies or explain why this category does not apply to the project.')}</p>`}</details>`;
      }).join('')}</section>`;
  }

  function contents(warning = '') {
    const plan = lifecycle.plan || {}, assessment = lifecycle.assessment || {};
    const requirements = plan.requirements || [], decisions = plan.decisions || [], baselines = lifecycle.baselines || [];
    const states = new Map((assessment.requirements || []).map(r => [r.id, r]));
    const observation = lifecycle.observation;
    const pendingQuestions = (lifecycle.questions || plan.questions || []).filter(q => q.state !== 'resolved');
    return `<div class="project-overview" data-project-root data-no-translate>
      ${warning ? `<p class="project-alert" role="alert">${h(warning)}</p>` : ''}
      <section><div class="project-status">${badge(plan.stage || 'architecture')}<span>${text('Revisão', 'Revision')} ${h((lifecycle.revision || '').slice(0,12))}</span></div>
        <h3 style="margin-top:14px">${text('Objetivo', 'Objective')}</h3><p>${h(plan.objective || SC.graph.project.summary || text('Registre o objetivo do projeto para orientar as decisões.', 'Record the project objective to guide decisions.'))}</p>
        <p class="project-muted">${text('Planejamento salvo localmente, fora do Git. Uma captura ou um arquivo encontrado não comprova que um requisito foi atendido.', 'Planning is stored locally, outside Git. A screenshot or an observed file does not prove a requirement is satisfied.')}</p></section>
      <section class="project-scope"><div><h3>${text('Dentro do escopo', 'In scope')}</h3>${list(plan.scope?.included)}</div><div><h3>${text('Fora do escopo', 'Out of scope')}</h3>${list(plan.scope?.excluded)}</div></section>
      ${stackContents()}
      <section><h3>${text('Requisitos e critérios de aceite', 'Requirements and acceptance criteria')} · ${requirements.length}</h3>
        ${requirements.length ? requirements.map((r,i) => {
          const state = states.get(r.id) || {}, findings = (assessment.findings || []).filter(f => f.requirementId === r.id);
          const navigable = (r.refs || []).filter(ref => SC.exists(ref));
          return `<article class="project-card"><h4>${h(r.title)}</h4>${r.description ? `<p>${h(r.description)}</p>` : ''}
            <div class="project-status"><span>${text('Implementação', 'Implementation')}: ${badge(state.implementation || 'unknown')}</span><span>${text('Verificação', 'Verification')}: ${badge(state.verification || 'unverified')}</span></div>
            ${list((r.criteria || []).map(c => c.text))}
            ${findings.map(f => `<p class="project-alert"><b>${h(f.title)}</b>${f.detail ? `<br>${h(f.detail)}` : ''}</p>`).join('')}
            ${navigable.length ? `<button class="btn soft" data-project-nav="${i}">${text('Ver no canvas', 'Show on canvas')}</button>` : ''}</article>`;
        }).join('') : `<p class="project-muted">${text('Este plano ainda não tem requisitos estruturados. Peça ao agente para registrar o escopo e os critérios de aceite.', 'This plan has no structured requirements yet. Ask the agent to record scope and acceptance criteria.')}</p>`}</section>
      <section><h3>${text('Jornadas de navegação', 'Navigation journeys')} · ${(plan.journeys || []).length}</h3>
        <p class="project-muted">${h((lifecycle.navigation?.covered || 0) + ' / ' + (plan.screens || []).length)} ${text('telas ligadas a jornadas. Cobertura não comprova implementação nem aprovação.', 'screens linked to journeys. Coverage does not prove implementation or approval.')}</p>
        ${(plan.journeys || []).map(j => `<article class="project-card"><h4>${h(j.actor)} · ${h(j.title)}</h4><p>${h(j.goal)}</p><button class="btn soft" data-project-journey="${h(j.id)}">${text('Percorrer mockups', 'Walk through mockups')}</button></article>`).join('')}
        ${(lifecycle.navigation?.findings || []).map(f=>`<p class="project-alert">${h(f.title)} · ${h(f.detail)}</p>`).join('')}</section>
      <section><h3>${text('Decisões de arquitetura', 'Architecture decisions')} · ${decisions.length}</h3>
        ${decisions.length ? decisions.map(d => `<article class="project-card"><h4>${h(d.title)} ${d.status ? badge(d.status) : ''}</h4><p><b>${h(d.choice)}</b></p><p>${h(d.rationale)}</p>
          ${d.alternatives?.length ? `<p class="project-muted">${text('Alternativas consideradas', 'Alternatives considered')}</p>${list(d.alternatives)}` : ''}
          ${d.revisitWhen ? `<p class="project-muted">${text('Rever quando', 'Revisit when')}: ${h(d.revisitWhen)}</p>` : ''}</article>`).join('') : `<p class="project-muted">${text('Nenhuma decisão registrada.', 'No decisions recorded.')}</p>`}</section>
      ${(plan.questions || []).length ? `<section><h3>${text('Questões em aberto', 'Open questions')}</h3>${pendingQuestions.length ? list(pendingQuestions.map(q => typeof q === 'string' ? q : q.question)) : `<p>${text('Todas as respostas foram incorporadas ao plano.', 'All answers have been incorporated into the plan.')}</p>`}<button class="btn soft" data-project-questions>${text('Responder perguntas', 'Answer questions')}</button></section>` : ''}
      ${observation ? `<section><h3>${text('Análise do código', 'Code analysis')}</h3><p>${h(observation.provider || 'Repowise')} · ${badge(observation.freshness || 'unknown')}</p>
        <p class="project-muted">${text('Última observação', 'Last observation')}: ${h(date(observation.capturedAt))}</p>
        ${observation.coverage?.truncated ? `<p class="project-alert">${text('A resposta foi limitada. Itens omitidos não são tratados como ausentes.', 'The response was truncated. Omitted items are not treated as absent.')}</p>` : ''}
        ${(observation.degraded || []).length ? `<p class="project-alert">${h(observation.degraded.join(' · '))}</p>` : ''}</section>` : ''}
      <section><h3>${text('Versões locais do escopo', 'Local scope versions')} · ${baselines.length}</h3>
        <p class="project-muted">${text('Cada versão preserva o escopo e os visuais daquele momento. Criar uma versão não registra aprovação do cliente.', 'Each version preserves the scope and visuals at that moment. Creating a version does not record client approval.')}</p>
        ${baselines.length ? baselines.map((b,i) => `<article class="project-card project-baseline"><div><h4>${h(b.title || b.id)}</h4><p class="project-muted">${h(date(b.createdAt))} · ${h((b.revision || '').slice(0,12))}</p>
          <p class="project-muted">${b.acceptance ? `${text('Aceitação registrada', 'Recorded acceptance')}: ${h(b.acceptance.actor || '')}` : text('Sem aceitação registrada', 'No acceptance recorded')}</p></div>
          ${editable ? `<button class="btn soft" data-project-export="${i}">${text('Exportar para cliente', 'Export for client')}</button>` : ''}</article>`).join('') : `<p>${text('Nenhuma versão salva ainda.', 'No versions saved yet.')}</p>`}
        <p class="project-alert" data-project-error role="alert" hidden></p></section>
    </div>`;
  }

  async function exportBaseline(index, modal) {
    const baseline = lifecycle.baselines?.[index];
    if (!editable || !baseline || pending) return;
    pending = true;
    const error = modal.el.querySelector('[data-project-error]'); error.hidden = true;
    try {
      const response = await request('/api/export', { method: 'POST', body: JSON.stringify({ profile: 'client', baseline: baseline.id }) });
      const name = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') || '')?.[1] || 'blueprint.html';
      const link = document.createElement('a'); link.href = URL.createObjectURL(await response.blob()); link.download = name;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 30000);
      SC.toast(text('Apresentação exportada.', 'Presentation exported.'));
    } catch(e) { error.hidden = false; error.textContent = errorText(e); }
    finally { pending = false; }
  }

  function createBaseline() {
    const expectedRevision = lifecycle.revision;
    const form = SC.modal({
      title: text('Criar versão local', 'Create local version'),
      html: `<div class="project-form" data-no-translate><p>${text('Guarde uma versão do escopo para revisão ou apresentação. Os dados continuam locais e fora do Git.', 'Save a scope version for review or presentation. Data remains local and outside Git.')}</p>
        <label>${text('Identificador', 'Identifier')}<input data-project-baseline-id placeholder="escopo-v1" autocomplete="off" maxlength="80"></label>
        <label>${text('Título', 'Title')}<input data-project-baseline-title placeholder="${text('Escopo inicial', 'Initial scope')}" maxlength="200"></label>
        <p class="project-alert" data-project-error role="alert" hidden></p></div>`,
      actions: [{ label: text('Salvar versão', 'Save version'), primary: true, keepOpen: true, onClick: async (close) => {
        if (pending) return;
        const error = form.el.querySelector('[data-project-error]'); error.hidden = true;
        const id = form.el.querySelector('[data-project-baseline-id]').value.trim(), title = form.el.querySelector('[data-project-baseline-title]').value.trim();
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id) || !title) { error.textContent = text('Informe um identificador com letras, números, hífen ou sublinhado e um título.', 'Enter an identifier with letters, numbers, hyphens or underscores and a title.'); error.hidden = false; return; }
        pending = true;
        try {
          retainPlanning();
          await request('/api/project/baseline', { method: 'POST', body: JSON.stringify({ id, title, expectedRevision }) });
          SC.toast(text('Versão local salva.', 'Local version saved.')); close(); await openPlanning();
        } catch(e) { forgetPlanning(); error.hidden = false; error.textContent = errorText(e); }
        finally { pending = false; }
      } }],
    });
    form.el.querySelector('[data-project-baseline-id]').focus();
  }

  async function openPlanning() {
    let warning = '';
    if (editable) {
      try { lifecycle = await (await request('/api/project')).json(); }
      catch(e) { warning = `${text('Mostrando a última versão disponível.', 'Showing the last available version.')} ${errorText(e)}`; }
    }
    const modal = SC.modal({ title: `${text('Planejamento', 'Planning')} · ${SC.graph.project.name}`, html: contents(warning),
      actions: editable && lifecycle.plan ? [{ label: text('Criar versão local', 'Create local version'), keepOpen: true, primary: true, onClick: createBaseline }] : [],
    });
    modal.el.querySelectorAll('[data-project-nav]').forEach(button => button.onclick = () => {
      const ref = lifecycle.plan.requirements[Number(button.dataset.projectNav)]?.refs?.find(r => SC.exists(r));
      if (ref) { modal.close(); SC.reveal(ref); }
    });
    modal.el.querySelectorAll('[data-project-journey]').forEach(b=>b.onclick=()=>{modal.close();SC.openVisuals?.(b.dataset.projectJourney);});
    const questionsButton = modal.el.querySelector('[data-project-questions]');
    if (questionsButton) questionsButton.onclick = () => SC.openQuestions?.();
    modal.el.querySelectorAll('[data-stack-questions]').forEach(b => b.onclick = () => SC.openQuestions?.(b.dataset.stackQuestions));
    modal.el.querySelectorAll('[data-project-export]').forEach(button => button.onclick = () => exportBaseline(Number(button.dataset.projectExport), modal));
  }

  const button = SC.addHeaderButton({ id: 'btn-project', label: text('Planejamento', 'Planning'), icon: 'layers', title: text('Escopo, critérios, decisões e versões locais', 'Scope, criteria, decisions and local versions'), onClick: openPlanning });
  window.addEventListener('floorplan-language-change', () => {
    button.querySelector('.bl').textContent = text('Planejamento', 'Planning');
    button.setAttribute('aria-label', text('Planejamento', 'Planning'));
    markImplementation();
  });
  SC.addPanelSection('overview', () => ({ html: `<div class="sec" data-no-translate><h3>${text('Planejamento', 'Planning')}</h3><p class="pd">${h(lifecycle.plan?.objective || text('Escopo, decisões e evidências do projeto.', 'Scope, decisions and project evidence.'))}</p><button class="btn soft" data-open-project>${text('Abrir planejamento', 'Open planning')}</button></div>`, bind: el => { el.querySelector('[data-open-project]').onclick = openPlanning; } }));
})();
