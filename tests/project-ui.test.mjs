import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SKILL } from './helpers.mjs';

const file = path.join(SKILL, 'assets/ui/07-project.js');
const lifecycle = () => ({
  revision: 'revision-one',
  plan: { '$schema': 'floorplan/plan@2', stage: 'scope', objective: 'Reservar <sem filas>', scope: { included: ['Reserva online'], excluded: ['Entrega'] },
    requirements: [{ id: 'req:reserve', title: 'Reservar um horário', refs: ['f:src/reserve.js'], criteria: [{ id: 'criterion:slot', text: 'Não aceitar dois pedidos no mesmo horário' }] }],
    decisions: [{ id: 'decision:storage', title: 'Persistência', choice: 'Banco existente', rationale: 'Reutilizar as transações disponíveis', revisitWhen: 'Separar somente com carga medida' }] },
  assessment: { requirements: [{ id: 'req:reserve', implementation: 'partial', verification: 'stale' }], findings: [{ id: 'f:gap', title: 'Revisar disponibilidade', detail: 'O código mudou após a verificação', requirementId: 'req:reserve' }] },
  baselines: [{ id: 'scope-1', title: 'Escopo inicial', revision: 'revision-old', createdAt: '2026-01-01T12:00:00Z' }],
});

function boot({ exported = false, served = true, state = lifecycle(), response, language = 'pt-BR', files = [], blueprint = false, saved = new Map() } = {}) {
  const headers = [], modals = [], requests = [], navigation = [], messages = [], events = {};
  const element = () => ({ innerHTML: '', textContent: '', hidden: true, value: '', disabled: false, dataset: {}, style: {}, children: new Map(),
    querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, element()); return this.children.get(selector); },
    querySelectorAll(selector) {
      const attr = /^\[([\w-]+)\]$/.exec(selector)?.[1]; if (!attr) return [];
      if (!this.children.has(selector + ':all')) this.children.set(selector + ':all', [...this.innerHTML.matchAll(new RegExp(`${attr}="([^"]*)"`, 'g'))].map(match => {
        const child = element(); child.dataset[attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = match[1]; return child;
      }));
      return this.children.get(selector + ':all');
    }, setAttribute() {}, appendChild() {}, remove() {}, click() {}, focus() {} });
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const document = { head: element(), body: element(), createElement: element };
  const cards = new Map(files.map(file => {
    let badge;
    const head = { appendChild(el) { badge = el; } };
    const card = { querySelector(selector) { return selector === '.head' ? head : selector === '.project-implementation' ? badge : null; }, get badge() { return badge; } };
    return ['f:' + file.p, card];
  }));
  const window = { FLOORPLAN_SERVER: served ? { token: 'local-token' } : undefined, FloorplanI18n: { get: () => language }, addEventListener: (name, fn) => { events[name] = fn; }, Floorplan: {
    graph: { lifecycle: state, project: { name: 'Agenda' }, meta: blueprint ? { blueprint: {} } : {}, screens: [], files }, state: { chipEls: cards }, h, exported,
    on: (event, fn) => { events[event] = fn; },
    addHeaderButton: b => { headers.push(b); return element(); }, addPanelSection() {},
    modal: options => { const el = element(); el.innerHTML = options.html; const m = { ...options, el, close() { m.closed = true; } }; modals.push(m); return m; },
    exists: ref => ref === 'f:src/reserve.js', reveal: ref => navigation.push(ref), open: ref => navigation.push(ref),
    toast: text => messages.push(text), copy() {}, icons: {},
  } };
  const fetch = async (url, opts = {}) => { requests.push({ url, ...opts }); return response ? response(url, opts) : { ok: true, json: async () => state }; };
  const sessionStorage = { setItem: (key, value) => saved.set(key, value), getItem: key => saved.get(key), removeItem: key => saved.delete(key) };
  vm.runInNewContext(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '', { window, document, fetch, sessionStorage, URL: { createObjectURL: () => 'blob:local', revokeObjectURL() {} }, setTimeout: fn => fn(), Date, console });
  return { headers, modals, requests, navigation, messages, events, cards, saved };
}

test('planning shows scope, evidence state and decisions separately; project content is escaped', async () => {
  const b = boot();
  assert.equal(b.headers.length, 1, 'the planning entry point must be available');
  await b.headers[0].onClick();
  const m = b.modals.at(-1);
  assert.match(m.html, /Reservar &lt;sem filas&gt;/);
  assert.match(m.html, /Reserva online/); assert.match(m.html, /Entrega/);
  assert.match(m.html, /Não aceitar dois pedidos/); assert.match(m.html, /Parcial/); assert.match(m.html, /Desatualizada/);
  assert.match(m.html, /O código mudou após a verificação/); assert.match(m.html, /Reutilizar as transações/);
  assert.doesNotMatch(m.html, /Reservar <sem filas>/);
});

test('saving a local baseline sends the displayed revision and never invents client acceptance', async () => {
  const b = boot(); await b.headers[0]?.onClick();
  assert.ok(b.modals.length, 'planning must open');
  const create = b.modals.at(-1).actions.find(a => /Criar versão/.test(a.label));
  assert.ok(create, 'local baseline action must exist'); create.onClick();
  const form = b.modals.at(-1);
  form.el.querySelector('[data-project-baseline-id]').value = 'scope-2';
  form.el.querySelector('[data-project-baseline-title]').value = 'Segunda revisão';
  await form.actions.find(a => /Salvar/.test(a.label)).onClick(form.close);
  const req = b.requests.find(r => r.url === '/api/project/baseline');
  assert.ok(req); assert.equal(req.method, 'POST'); assert.equal(req.headers['x-floorplan-token'], 'local-token');
  assert.deepEqual(JSON.parse(req.body), { id: 'scope-2', title: 'Segunda revisão', expectedRevision: 'revision-one' });
});

test('baseline conflict stays visible and does not report a successful save', async () => {
  const b = boot({ response: async url => url === '/api/project/baseline'
    ? { ok: false, status: 409, json: async () => ({ error: 'A revisão mudou. Atualize o planejamento.' }) }
    : { ok: true, json: async () => lifecycle() } });
  await b.headers[0]?.onClick(); assert.ok(b.modals.length);
  b.modals.at(-1).actions.find(a => /Criar versão/.test(a.label)).onClick();
  const form = b.modals.at(-1);
  form.el.querySelector('[data-project-baseline-id]').value = 'scope-2';
  form.el.querySelector('[data-project-baseline-title]').value = 'Nova versão';
  await form.actions.find(a => /Salvar/.test(a.label)).onClick(form.close);
  assert.match(form.el.querySelector('[data-project-error]').textContent, /revisão mudou/);
  assert.equal(form.closed, undefined); assert.equal(b.messages.length, 0);
});

test('offline and exported presentations remain readable without mutation or fetch actions', async () => {
  for (const opts of [{ served: false }, { exported: true }]) {
    const b = boot(opts); await b.headers[0]?.onClick(); assert.ok(b.modals.length);
    assert.match(b.modals.at(-1).html, /Escopo inicial/);
    assert.equal(b.modals.at(-1).actions.filter(a => /Criar versão/.test(a.label)).length, 0);
    assert.equal(b.requests.length, 0);
  }
});

test('English labels do not translate the user-authored project data', async () => {
  const b = boot({ language: 'en' }); await b.headers[0]?.onClick(); assert.ok(b.modals.length);
  assert.equal(b.headers[0].label, 'Planning');
  assert.match(b.modals.at(-1).html, /Partial/); assert.match(b.modals.at(-1).html, /Outdated/);
  assert.match(b.modals.at(-1).html, /Reservar um horário/);
});

test('requirement navigation reveals its existing canvas reference', async () => {
  const b = boot(); await b.headers[0].onClick();
  const modal = b.modals.at(-1), buttons = modal.el.querySelectorAll('[data-project-nav]');
  assert.equal(buttons.length, 1); buttons[0].onclick();
  assert.deepEqual(b.navigation, ['f:src/reserve.js']); assert.equal(modal.closed, true);
});

test('client export requests the selected immutable baseline, not current project content', async () => {
  const state = lifecycle(); state.baselines.push({ id: 'scope-2', title: 'Segunda versão', revision: 'revision-two' });
  const b = boot({ state, response: async url => url === '/api/export'
    ? { ok: true, headers: { get: () => 'attachment; filename="apresentacao.html"' }, blob: async () => ({}) }
    : { ok: true, json: async () => state } });
  await b.headers[0].onClick();
  const buttons = b.modals.at(-1).el.querySelectorAll('[data-project-export]');
  assert.equal(buttons.length, 2); await buttons[0].onclick();
  const req = b.requests.find(r => r.url === '/api/export');
  assert.ok(req); assert.equal(req.method, 'POST'); assert.equal(req.headers['x-floorplan-token'], 'local-token');
  assert.deepEqual(JSON.parse(req.body), { profile: 'client', baseline: 'scope-1' });
  assert.equal(b.messages.length, 1);
});

test('hybrid canvas distinguishes planned and observed files without adding badges to pure blueprints', () => {
  const files = [{ p: 'a.js', implementation: 'planned' }, { p: 'b.js', implementation: 'observed' }];
  const b = boot({ files }); b.events.render?.();
  assert.equal(b.cards.get('f:a.js').badge?.textContent, 'Planejado');
  assert.equal(b.cards.get('f:b.js').badge?.textContent, 'Observado');
  const planned = boot({ files, blueprint: true }); planned.events.render?.();
  assert.equal(planned.cards.get('f:a.js').badge, undefined);
});

test('successful baseline creation reopens planning once after the server reload', async () => {
  const b = boot(); await b.headers[0].onClick();
  b.modals.at(-1).actions.find(a => /Criar versão/.test(a.label)).onClick();
  const form = b.modals.at(-1);
  form.el.querySelector('[data-project-baseline-id]').value = 'scope-new';
  form.el.querySelector('[data-project-baseline-title]').value = 'Revisão local';
  await form.actions.find(a => /Salvar/.test(a.label)).onClick(form.close);
  const reloaded = boot({ saved: b.saved }); await reloaded.events.ready?.();
  assert.equal(reloaded.modals.length, 1, 'the saved planning context should survive SSE reload');
  const again = boot({ saved: b.saved }); await again.events.ready?.();
  assert.equal(again.modals.length, 0, 'later unrelated reloads must not reopen a closed modal');
});
