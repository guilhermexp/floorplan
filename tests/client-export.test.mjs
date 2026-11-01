import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SKILL, makeProject, cleanup, writeJson } from './helpers.mjs';
import { readProject, snapshotBaseline } from '../skills/floorplan/scripts/lib/project.mjs';

const moduleFile = path.join(SKILL, 'scripts/lib/client-export.mjs');
const exportClient = fs.existsSync(moduleFile) ? (await import(moduleFile)).exportClient : () => ({ html: '', name: '' });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1kAAAAASUVORK5CYII=', 'base64');
const privateMarker = 'PRIVATE_INTERNAL_58392';

async function fixture(t) {
  const root = makeProject({}); t.after(() => cleanup(root));
  const dir = path.join(root, 'floorplan');
  writeJson(path.join(dir, 'plan.json'), {
    $schema: 'floorplan/plan@2', stage: 'scope', objective: 'Reservas sem conflito', source: privateMarker,
    scope: { included: ['Reserva por horário'], excluded: ['Entrega em domicílio'] },
    requirements: [{ id: 'reserve', title: 'Confirmar reserva', refs: [`f:${privateMarker}.js`], criteria: [{ id: 'slot', text: 'Só uma reserva por horário' }], evidence: [{ criterionId: 'slot', criterionHash: 'a'.repeat(64), result: 'pass', method: 'teste', at: '2026-01-01T12:00:00Z', revision: privateMarker, details: privateMarker }] }],
    decisions: [{ id: 'database', title: 'Persistência', choice: 'Banco existente', rationale: 'Transações para impedir duplicidade', alternatives: [privateMarker] }],
    questions: [{ question: 'Quem cancela a reserva?', about: [privateMarker] }],
  });
  writeJson(path.join(dir, 'architecture.json'), {
    project: { name: 'Agenda', summary: 'Reserva de horários', entrypoints: [privateMarker] },
    nodes: [{ id: privateMarker, label: 'Agenda de reservas', summary: 'Mantém os horários disponíveis', paths: [privateMarker], details: privateMarker }, { id: 'database', label: 'Reservas salvas', summary: 'Preserva as confirmações' }],
    edges: [{ from: privateMarker, to: 'database', label: 'Confirma o horário' }],
    tour: [{ node: privateMarker, title: 'Escolher horário', note: 'Veja os horários disponíveis' }],
  });
  fs.mkdirSync(path.join(dir, 'visuals')); fs.writeFileSync(path.join(dir, 'visuals/screen.png'), png);
  writeJson(path.join(dir, 'visuals.json'), { version: 1, items: [
    { id: 'v1', screen: privateMarker, title: 'Escolher horário', asset: 'visuals/screen.png', kind: 'proposal', viewport: 'Mobile 390 × 844', notes: privateMarker },
    { id: 'v2', screen: privateMarker, title: 'Confirmação', asset: 'visuals/screen.png', kind: 'capture', viewport: 'Tablet 768 × 1024', sourceUrl: `https://internal.test/${privateMarker}`, createdAt: '2026-01-01T12:00:00Z' },
  ] });
  writeJson(path.join(dir, 'graph.json'), { meta: { root: privateMarker }, project: { name: 'Agenda' }, files: [{ p: privateMarker }], health: { issues: [{ title: privateMarker }] }, recent: { note: privateMarker } });
  await snapshotBaseline(dir, { id: 'scope-1', title: 'Escopo inicial', expectedRevision: readProject(dir).revision });
  return { dir };
}

test('client export freezes scope and images even after original files are changed or removed', async t => {
  const { dir } = await fixture(t);
  writeJson(path.join(dir, 'plan.json'), { objective: 'Nova intenção não entregue' });
  fs.rmSync(path.join(dir, 'visuals'), { recursive: true });
  const exported = exportClient(dir, 'scope-1');
  assert.equal(exported.name, 'scope-1-blueprint.html');
  assert.match(exported.html, /Reservas sem conflito/); assert.match(exported.html, /Entrega em domicílio/);
  assert.doesNotMatch(exported.html, /Nova intenção não entregue/);
  assert.equal(exported.html.split(png.toString('base64')).length - 1, 1, 'shared asset bytes appear once in the artifact');
});

test('private metadata is absent from all exported bytes, not only hidden from view', async t => {
  const { dir } = await fixture(t), { html } = exportClient(dir, 'scope-1');
  assert.match(html, /Agenda de reservas/); assert.match(html, /Quem cancela a reserva/);
  assert.doesNotMatch(html, new RegExp(privateMarker));
  assert.doesNotMatch(html, /internal\.test|floorplan\/visuals\/|visuals\/screen\.png|fetch\(/);
  assert.match(html, /Content-Security-Policy/);
});

test('architecture relationships are projected as public labels without internal identities', async t => {
  const { dir } = await fixture(t), { html } = exportClient(dir, 'scope-1');
  assert.match(html, /Agenda de reservas → Reservas salvas/);
  assert.match(html, /Confirma o horário/);
  assert.doesNotMatch(html, new RegExp(privateMarker));
});

test('user-authored script text remains text and cannot terminate the embedded data element', async t => {
  const { dir } = await fixture(t);
  writeJson(path.join(dir, 'plan.json'), { $schema: 'floorplan/plan@2', stage: 'concept', objective: '</script><script>alert("injected")</script>' });
  await snapshotBaseline(dir, { id: 'scope-2', title: 'Nova versão', expectedRevision: readProject(dir).revision });
  const { html } = exportClient(dir, 'scope-2');
  assert.ok(html); assert.doesNotMatch(html, /<script>alert\("injected"\)<\/script>/);
  assert.match(html, /&lt;\/script&gt;|\\u003c\/script/);
});

test('exported gallery navigates images with buttons and keyboard without network access', async t => {
  const { dir } = await fixture(t), { html } = exportClient(dir, 'scope-1');
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  const data = scripts.find(m => /application\/json/.test(m[1]));
  assert.ok(data, 'presentation data must be present');
  const elements = new Map(), listeners = {};
  const el = () => ({ textContent: '', innerHTML: '', hidden: false, disabled: false, src: '', alt: '', className: '', style: { setProperty() {} }, dataset: {}, setAttribute() {}, appendChild() {}, addEventListener(event, fn) { this[event] = fn; }, querySelectorAll() { return []; } });
  const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, el()); return elements.get(id); }, addEventListener: (event, fn) => { listeners[event] = fn; }, createElement: el };
  document.getElementById('blueprint-data').textContent = data[2];
  const sandbox = { document, window: {}, console };
  for (const script of scripts.filter(m => !/application\/json/.test(m[1]))) vm.runInNewContext(script[2], sandbox);
  assert.equal(document.getElementById('visual-title').textContent, 'Escolher horário');
  assert.equal(document.getElementById('visual-count').textContent, '1 / 2');
  document.getElementById('visual-next').click();
  assert.equal(document.getElementById('visual-title').textContent, 'Confirmação');
  assert.equal(document.getElementById('visual-count').textContent, '2 / 2');
  listeners.keydown({ key: 'ArrowLeft', target: { tagName: 'BODY' }, preventDefault() {} });
  assert.equal(document.getElementById('visual-title').textContent, 'Escolher horário');
  assert.match(document.getElementById('visual-image').src, /^data:image\/png;base64,/);
});
