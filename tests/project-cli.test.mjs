import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeProject, cleanup, run, readGraph, readJson, writeJson } from './helpers.mjs';

test('validate runs architecture compilation without publishing a map or changing authored files', () => {
  const root = makeProject({});
  try {
    const p = { $schema: 'floorplan/plan@2', stage: 'concept', objective: 'Validar a arquitetura', files: [] };
    const a = { project: { name: 'Validação' }, nodes: [{ id: 'app', label: 'Aplicativo', kind: 'invalid' }] };
    writeJson(path.join(root, 'floorplan/plan.json'), p);
    writeJson(path.join(root, 'floorplan/architecture.json'), a);
    assert.throws(() => run('project.mjs', root, 'validate'), /Command failed/);
    assert.equal(fs.existsSync(path.join(root, 'floorplan/graph.json')), false);
    assert.deepEqual(readJson(path.join(root, 'floorplan/architecture.json')), a);
    a.nodes[0].kind = 'ui';
    writeJson(path.join(root, 'floorplan/architecture.json'), a);
    assert.equal(JSON.parse(run('project.mjs', root, 'validate')).valid, true);
    assert.equal(fs.existsSync(path.join(root, 'floorplan/graph.json')), false);
  } finally { cleanup(root); }
});

test('project CLI applies a validated revision, rejects stale writes, and keeps a durable local baseline', () => {
  const root = makeProject({});
  try {
    const state = JSON.parse(run('project.mjs', root, 'status'));
    const input = path.join(root, 'input.json');
    const documents = {
      'plan.json': { $schema: 'floorplan/plan@2', stage: 'concept', objective: 'Proteger o escopo', files: [], endpoints: [] },
      'architecture.json': { project: { name: 'Exemplo sintético' }, nodes: [{ id: 'app', label: 'Aplicativo', kind: 'ui', summary: 'Experiência' }] },
    };
    writeJson(input, { documents });
    const applied = JSON.parse(run('project.mjs', root, 'apply', '--input', input, '--revision', state.revision));
    assert.equal(readGraph(root).lifecycle.plan.objective, 'Proteger o escopo');
    assert.equal(readGraph(root).lifecycle.revision, applied.revision);
    assert.throws(() => run('project.mjs', root, 'apply', '--input', input, '--revision', state.revision), /Command failed/);
    assert.equal(readJson(path.join(root, 'floorplan/plan.json')).objective, 'Proteger o escopo');
    const baseline = JSON.parse(run('project.mjs', root, 'baseline', '--id', 'scope-v1', '--title', 'Escopo inicial', '--revision', applied.revision));
    assert.equal(baseline.id, 'scope-v1');
    assert.equal(readGraph(root).lifecycle.baselines[0].id, 'scope-v1');
    fs.rmSync(path.join(root, 'floorplan/.cache'), { recursive: true });
    const recovered = JSON.parse(run('project.mjs', root, 'status'));
    assert.equal(recovered.baselines[0].id, 'scope-v1');
    assert.equal(recovered.plan.objective, 'Proteger o escopo');
  } finally { cleanup(root); }
});

test('failed architecture compilation leaves authored documents and rendered map unchanged', () => {
  const root = makeProject({});
  try {
    const rev = JSON.parse(run('project.mjs', root, 'status')).revision;
    const input = path.join(root, 'input.json');
    writeJson(input, { documents: { 'plan.json': { $schema: 'floorplan/plan@2', stage: 'concept', objective: 'Validar a arquitetura', files: [] }, 'architecture.json': { project: { name: 'Erro' }, nodes: [{ id: 'app', label: 'Aplicativo', kind: 'not-a-kind' }] } } });
    assert.throws(() => run('project.mjs', root, 'apply', '--input', input, '--revision', rev), /Command failed/);
    assert.equal(fs.existsSync(path.join(root, 'floorplan/plan.json')), false);
    assert.equal(fs.existsSync(path.join(root, 'floorplan/index.html')), false);
  } finally { cleanup(root); }
});

function legacyProject() {
  const plan = { $schema: 'floorplan/plan@1', source: 'docs/request.md', stack: ['Web'], assumptions: ['A confirmar com o cliente'], questions: ['Quais horários serão oferecidos?'], files: [{ path: 'web/app/page.tsx', name: 'Início', description: 'Mostra horários.', screen: '/' }], endpoints: [] };
  const root = makeProject({}, { arch: { project: { name: 'Exemplo', summary: 'Organizar horários disponíveis' }, nodes: [{ id: 'app', label: 'Aplicativo', kind: 'ui', summary: 'Experiência de agendamento', paths: ['web/**'] }] } });
  const dir = path.join(root, 'floorplan'); writeJson(path.join(dir, 'plan.json'), plan);
  run('plan.mjs', root); run('build.mjs', root, '--no-claude-md');
  const oldScreen = readGraph(root).screens[0].id;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1kAAAAASUVORK5CYII=', 'base64');
  fs.mkdirSync(path.join(dir, 'visuals')); fs.writeFileSync(path.join(dir, 'visuals/mockup.png'), png);
  writeJson(path.join(dir, 'visuals.json'), { version: 1, items: [{ id: 'original', title: 'Proposta', kind: 'proposal', screen: oldScreen, asset: 'visuals/mockup.png', approved: true }] });
  run('build.mjs', root, '--no-claude-md');
  return { root, dir, plan, oldScreen, png };
}

test('migration gives legacy screens durable identities and keeps visuals through a later URL rename', () => {
  const { root, dir, plan, oldScreen, png } = legacyProject();
  try {
    const before = JSON.parse(run('project.mjs', root, 'status'));
    const migrated = JSON.parse(run('project.mjs', root, 'migrate', '--revision', before.revision));
    const saved = readJson(path.join(dir, 'plan.json'));
    assert.equal(saved.$schema, 'floorplan/plan@2');
    assert.equal(saved.stage, 'architecture');
    assert.equal(saved.objective, 'Organizar horários disponíveis');
    assert.deepEqual(saved.files, plan.files);
    assert.deepEqual(saved.requirements, []);
    assert.deepEqual(saved.decisions, []);
    const stableId = saved.screens[0].id;
    assert.notEqual(stableId, oldScreen);
    assert.ok(saved.screens[0].aliases.includes(oldScreen));
    assert.equal(readJson(path.join(dir, 'visuals.json')).items[0].screen, stableId);
    assert.equal(readJson(path.join(dir, 'visuals.json')).items[0].approved, true);
    const again = JSON.parse(run('project.mjs', root, 'migrate', '--revision', migrated.revision));
    assert.equal(again.revision, migrated.revision);
    assert.equal(readJson(path.join(dir, 'plan.json')).screens[0].id, stableId);
    saved.files[0].screen = '/inicio'; saved.screens[0].url = '/inicio'; delete saved.screens[0].aliases;
    const input = path.join(root, 'rename.json'); writeJson(input, { documents: { 'plan.json': saved } });
    run('project.mjs', root, 'apply', '--input', input, '--revision', again.revision);
    const graph = readGraph(root);
    assert.equal(graph.screens.find((s) => s.id === stableId).url, '/inicio');
    assert.equal(graph.visuals[0].screen, stableId);
    assert.equal(graph.visuals[0].unresolved, undefined);
    assert.ok(readJson(path.join(dir, 'plan.json')).screens[0].aliases.includes(oldScreen));
    assert.deepEqual(fs.readFileSync(path.join(dir, 'visuals/mockup.png')), png);
    assert.ok(fs.readdirSync(path.join(dir, 'revisions')).length >= 3);
    assert.match(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), /^\*$/m);
  } finally { cleanup(root); }
});

test('migration rejects stale revisions and unsupported legacy fields without losing source data', () => {
  const { root, dir } = legacyProject();
  try {
    const old = fs.readFileSync(path.join(dir, 'plan.json'));
    assert.throws(() => run('project.mjs', root, 'migrate', '--revision', 'stale'), (e) => /revision conflict/.test(e.stderr));
    assert.deepEqual(fs.readFileSync(path.join(dir, 'plan.json')), old);
    const plan = readJson(path.join(dir, 'plan.json')); plan.customerSpecific = { preserve: true }; writeJson(path.join(dir, 'plan.json'), plan);
    const before = JSON.parse(run('project.mjs', root, 'status'));
    assert.throws(() => run('project.mjs', root, 'migrate', '--revision', before.revision), (e) => /customerSpecific/.test(e.stderr));
    assert.deepEqual(readJson(path.join(dir, 'plan.json')).customerSpecific, { preserve: true });
    assert.equal(readJson(path.join(dir, 'plan.json')).$schema, 'floorplan/plan@1');
  } finally { cleanup(root); }
});

test('migration preserves authored requirements and normalizes their legacy screen references', () => {
  const { root, dir, oldScreen } = legacyProject();
  try {
    const plan = readJson(path.join(dir, 'plan.json'));
    const requirement = { id: 'req:horarios', title: 'Mostrar horários disponíveis', description: 'Pedido registrado antes da identidade estável.', refs: [oldScreen, 'f:web/app/page.tsx'], criteria: [{ id: 'criterion:horarios', text: 'Não oferecer horários ocupados.' }] };
    plan.requirements = [requirement]; writeJson(path.join(dir, 'plan.json'), plan);
    const before = JSON.parse(run('project.mjs', root, 'status'));
    run('project.mjs', root, 'migrate', '--revision', before.revision);
    const saved = readJson(path.join(dir, 'plan.json'));
    assert.deepEqual(saved.requirements[0], { ...requirement, refs: [saved.screens[0].id, 'f:web/app/page.tsx'] });
    assert.equal(readGraph(root).lifecycle.assessment.requirements[0].unresolved.length, 0);
    assert.equal(readJson(path.join(dir, 'visuals.json')).items[0].screen, saved.screens[0].id);
  } finally { cleanup(root); }
});

test('migration still rejects a genuinely missing legacy screen reference without deleting it', () => {
  const { root, dir } = legacyProject();
  try {
    const plan = readJson(path.join(dir, 'plan.json'));
    plan.requirements = [{ id: 'req:missing', title: 'Tela ausente', refs: ['screen:missing:/absent'], criteria: [] }];
    writeJson(path.join(dir, 'plan.json'), plan);
    const before = JSON.parse(run('project.mjs', root, 'status'));
    assert.throws(() => run('project.mjs', root, 'migrate', '--revision', before.revision), (e) => /unknown screen/.test(e.stderr));
    assert.deepEqual(readJson(path.join(dir, 'plan.json')), plan);
    assert.equal(readJson(path.join(dir, 'plan.json')).$schema, 'floorplan/plan@1');
  } finally { cleanup(root); }
});
