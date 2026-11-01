import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as projectStore from '../skills/floorplan/scripts/lib/project.mjs';
import { makeProject, cleanup, writeJson, readJson } from './helpers.mjs';
import { validatePlan, readProject, applyProjectChange, snapshotBaseline, readBaseline, listBaselines } from '../skills/floorplan/scripts/lib/project.mjs';

const concept = () => ({ $schema: 'floorplan/plan@2', stage: 'concept', objective: 'Organizar reservas', requirements: [{ id: 'reservas', title: 'Reservar um horário', criteria: [{ id: 'disponivel', text: 'Somente horários disponíveis podem ser reservados.' }] }] });
const project = (t) => {
  const root = makeProject({}); t.after(() => cleanup(root));
  const dir = path.join(root, 'floorplan');
  writeJson(path.join(dir, 'plan.json'), concept());
  writeJson(path.join(dir, 'architecture.json'), { project: { name: 'Exemplo' }, nodes: [{ id: 'reservas', label: 'Reservas', kind: 'module' }] });
  return dir;
};

test('concept plans do not invent files and legacy plans remain readable', () => {
  assert.deepEqual(validatePlan(concept()), []);
  assert.deepEqual(validatePlan({ $schema: 'floorplan/plan@1', files: [{ path: 'app.js' }] }), []);
});

test('unknown v2 fields and duplicate IDs are rejected instead of silently omitted', () => {
  const plan = concept(); plan.requirments = [];
  plan.requirements.push({ ...plan.requirements[0] });
  const errors = validatePlan(plan).join('\n');
  assert.match(errors, /requirments/);
  assert.match(errors, /duplicate|duplicad/i);
});

test('criteria and evidence must be structurally valid and refer to a real criterion', () => {
  const plan = concept(); plan.requirements[0].evidence = [{ criterionId: 'missing', result: 'pass', method: 'test', at: 'yesterday', revision: '' }];
  const errors = validatePlan(plan).join('\n');
  assert.match(errors, /criterionId/);
  assert.match(errors, /revision/);
  assert.match(errors, /at/);
  plan.requirements[0].criteria = 'looks done';
  assert.match(validatePlan(plan).join('\n'), /criteria/);
});

test('unsafe file references and unsupported schema versions fail validation', () => {
  const plan = concept(); plan.requirements[0].refs = ['f:../private.env', 'r:4'];
  assert.match(validatePlan(plan).join('\n'), /refs/);
  assert.match(validatePlan({ ...plan, $schema: 'floorplan/plan@9' }).join('\n'), /schema/);
});

test('revision includes authored descriptions and visuals, but not builds or cache', (t) => {
  const dir = project(t), before = readProject(dir).revision;
  writeJson(path.join(dir, '.cache/scan.json'), { generatedAt: Date.now() });
  writeJson(path.join(dir, 'graph.json'), { nodes: [] });
  assert.equal(readProject(dir).revision, before);
  writeJson(path.join(dir, 'descriptions/main.json'), { files: { 'a.js': { name: 'A' } } });
  assert.notEqual(readProject(dir).revision, before);
  const described = readProject(dir).revision;
  writeJson(path.join(dir, 'visuals.json'), { version: 1, items: [] });
  assert.notEqual(readProject(dir).revision, described);
});

test('existing Portuguese description filenames remain readable', (t) => {
  const dir = project(t);
  writeJson(path.join(dir, 'descriptions/páginas.json'), { files: { 'app.js': { name: 'Página inicial' } } });
  assert.equal(readProject(dir).documents['descriptions/páginas.json'].files['app.js'].name, 'Página inicial');
});

test('malformed optional dismissal notes retain their exact bytes across unrelated edits', async (t) => {
  const dir = project(t), file = path.join(dir, 'health-dismissed.json');
  const raw = '{this is a hand-edited incomplete note'; fs.writeFileSync(file, raw);
  const state = readProject(dir);
  const next = await applyProjectChange(dir, { expectedRevision: state.revision, documents: { 'plan.json': { ...concept(), objective: 'Continua editável' } } });
  assert.equal(fs.readFileSync(file, 'utf8'), raw);
  assert.equal(projectStore.readRevision(dir, state.revision).documents['health-dismissed.json'], raw);
  await applyProjectChange(dir, { expectedRevision: next.revision, documents: { 'health-dismissed.json': { dismissed: [] } } });
  assert.deepEqual(readJson(file), { dismissed: [] });
});

test('a validated update is applied and all local project data remains ignored', async (t) => {
  const dir = project(t), previous = readProject(dir), next = { ...concept(), objective: 'Nova finalidade' };
  const result = await applyProjectChange(dir, { expectedRevision: previous.revision, documents: { 'plan.json': next } }, async (staged) => {
    assert.equal(readJson(path.join(staged, 'plan.json')).objective, 'Nova finalidade');
    assert.equal(readJson(path.join(dir, 'plan.json')).objective, 'Organizar reservas');
  });
  assert.equal(result.plan.objective, 'Nova finalidade');
  assert.notEqual(result.revision, previous.revision);
  assert.match(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), /^\*$/m);
  assert.equal(fs.existsSync(path.join(dir, '.project.lock')), false);
});

test('stale proposals and failed validators leave the current project intact', async (t) => {
  const dir = project(t), before = readProject(dir);
  await assert.rejects(applyProjectChange(dir, { expectedRevision: 'old', documents: { 'plan.json': concept() } }), /revision|revisão/i);
  await assert.rejects(applyProjectChange(dir, { expectedRevision: before.revision, documents: { 'plan.json': { ...concept(), objective: 'Invalid' } } }, () => { throw new Error('Rejected by build'); }), /Rejected by build/);
  assert.equal(readProject(dir).revision, before.revision);
});

test('another process cannot write during an in-flight validation', async (t) => {
  const dir = project(t), revision = readProject(dir).revision;
  let proceed, ready;
  const gate = new Promise((resolve) => { proceed = resolve; });
  const started = new Promise((resolve) => { ready = resolve; });
  const first = applyProjectChange(dir, { expectedRevision: revision, documents: { 'plan.json': { ...concept(), objective: 'Primeira' } } }, async () => { ready(); await gate; });
  await started;
  try { await assert.rejects(applyProjectChange(dir, { expectedRevision: revision, documents: { 'plan.json': concept() } }), /lock|ocupad|andamento/i); }
  finally { proceed(); await first; }
  assert.equal(readProject(dir).plan.objective, 'Primeira');
});

test('direct edits made during validation are not overwritten', async (t) => {
  const dir = project(t), before = readProject(dir);
  await assert.rejects(applyProjectChange(dir, { expectedRevision: before.revision, documents: { 'plan.json': { ...concept(), objective: 'Proposta antiga' } } }, () => {
    writeJson(path.join(dir, 'plan.json'), { ...concept(), objective: 'Edição externa' });
  }), /revision|revisão/i);
  assert.equal(readProject(dir).plan.objective, 'Edição externa');
});

test('project updates refuse path traversal and symlink destinations', async (t) => {
  const dir = project(t), revision = readProject(dir).revision;
  await assert.rejects(applyProjectChange(dir, { expectedRevision: revision, documents: { '../leak.json': {} } }), /document|path|caminho/i);
  const outside = path.join(path.dirname(dir), 'outside.json'); writeJson(outside, { untouched: true });
  fs.symlinkSync(outside, path.join(dir, 'custom-flows.json'));
  assert.throws(() => readProject(dir), /symlink|simbólic/i);
  assert.deepEqual(readJson(outside), { untouched: true });
});

test('baseline freezes documents and original image bytes and survives cache removal', async (t) => {
  const dir = project(t);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1kAAAAASUVORK5CYII=', 'base64');
  fs.mkdirSync(path.join(dir, 'visuals')); fs.writeFileSync(path.join(dir, 'visuals/tela.png'), png);
  writeJson(path.join(dir, 'visuals.json'), { version: 1, items: [{ id: 'one', screen: 'chat', kind: 'proposal', title: 'Chat', asset: 'visuals/tela.png' }] });
  writeJson(path.join(dir, 'graph.json'), { project: { name: 'Exemplo' }, visuals: [{ id: 'one', src: 'visuals/tela.png' }] });
  const result = await snapshotBaseline(dir, { id: 'escopo-v1', title: 'Escopo inicial', expectedRevision: readProject(dir).revision });
  fs.writeFileSync(path.join(dir, 'visuals/tela.png'), 'changed');
  writeJson(path.join(dir, 'plan.json'), { ...concept(), objective: 'Outro escopo' });
  fs.rmSync(path.join(dir, '.cache'), { recursive: true, force: true });
  const frozen = readBaseline(dir, result.id);
  assert.equal(frozen.documents['plan.json'].objective, 'Organizar reservas');
  assert.deepEqual(fs.readFileSync(path.join(frozen.directory, frozen.assets[0].path)), png);
  assert.equal(frozen.graph.project.name, 'Exemplo');
  assert.deepEqual(listBaselines(dir).map((b) => b.id), ['escopo-v1']);
  await assert.rejects(snapshotBaseline(dir, { id: 'escopo-v1', title: 'Overwrite', expectedRevision: readProject(dir).revision }), /exist/i);
});

test('baseline acceptance needs an actor, timestamp and evidence; IDs cannot escape storage', async (t) => {
  const dir = project(t), expectedRevision = readProject(dir).revision;
  await assert.rejects(snapshotBaseline(dir, { id: 'v1', title: 'Escopo', expectedRevision, acceptance: { actor: 'Cliente' } }), /acceptance/);
  await assert.rejects(snapshotBaseline(dir, { id: '../outside', title: 'Escopo', expectedRevision }), /id/);
  assert.throws(() => readBaseline(dir, '../outside'), /id/);
});

test('successful changes keep durable local revisions but rejected proposals do not', async (t) => {
  const dir = project(t), before = readProject(dir);
  const after = await applyProjectChange(dir, { expectedRevision: before.revision, documents: { 'plan.json': { ...concept(), objective: 'Revisão seguinte' } } });
  await assert.rejects(applyProjectChange(dir, { expectedRevision: after.revision, documents: { 'plan.json': { ...concept(), objective: 'Nunca aceita' } } }, () => { throw new Error('Rejected'); }));
  fs.rmSync(path.join(dir, '.cache'), { recursive: true, force: true });
  assert.deepEqual(projectStore.listRevisions(dir).map((r) => r.revision).sort(), [before.revision, after.revision].sort());
  assert.equal(projectStore.readRevision(dir, before.revision).documents['plan.json'].objective, 'Organizar reservas');
  assert.equal(projectStore.readRevision(dir, after.revision).previousRevision, before.revision);
});

test('a process killed halfway through publication is rolled back before another read', (t) => {
  const dir = project(t), before = readProject(dir);
  const moduleUrl = new URL('../skills/floorplan/scripts/lib/project.mjs', import.meta.url).href;
  const script = `import fs from 'node:fs'; import path from 'node:path';
    import { applyProjectChange } from ${JSON.stringify(moduleUrl)};
    const dir = process.argv[1], revision = process.argv[2];
    const rename = fs.renameSync;
    fs.renameSync = (from, to) => { rename(from, to); if (to === path.join(dir, 'plan.json') && fs.existsSync(path.join(dir, '.project-transaction.json'))) process.exit(91); };
    await applyProjectChange(dir, { expectedRevision: revision, documents: {'plan.json': ${JSON.stringify({ ...concept(), objective: 'Interrompida' })}, 'architecture.json': {project:{name:'Interrompida'},nodes:[]}} });`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, dir, before.revision], { encoding: 'utf8' });
  assert.equal(child.status, 91, child.stderr);
  assert.equal(fs.existsSync(path.join(dir, '.project-transaction.json')), true);
  assert.equal(readProject(dir).revision, before.revision);
  assert.equal(readJson(path.join(dir, 'architecture.json')).project.name, 'Exemplo');
  assert.equal(fs.existsSync(path.join(dir, '.project-transaction.json')), false);
  assert.equal(fs.existsSync(path.join(dir, '.project.lock')), false);
});

test('a baseline refuses a graph built for a different author revision', async (t) => {
  const dir = project(t);
  writeJson(path.join(dir, 'graph.json'), { lifecycle: { revision: 'previous-revision' }, nodes: [] });
  await assert.rejects(snapshotBaseline(dir, { id: 'stale', title: 'Velha', expectedRevision: readProject(dir).revision }), /graph|grafo|rebuild/i);
  assert.deepEqual(listBaselines(dir), []);
});

test('editing baseline documents is detected instead of silently changing an old delivery', async (t) => {
  const dir = project(t);
  const baseline = await snapshotBaseline(dir, { id: 'v1', title: 'Original', expectedRevision: readProject(dir).revision });
  const manifest = path.join(baseline.directory, 'baseline.json'), changed = readJson(manifest);
  changed.documents['plan.json'].objective = 'Alteração posterior'; writeJson(manifest, changed);
  assert.throws(() => readBaseline(dir, 'v1'), /changed|integrity|alterad/i);
});

test('a newer analyzer observation rejects a stale staged build without overwriting its facts', async (t) => {
  const dir = project(t), revision = readProject(dir).revision;
  writeJson(path.join(dir, '.cache/repowise.json'), { generation: 'old' });
  await assert.rejects(applyProjectChange(dir, { expectedRevision: revision, documents: { 'plan.json': { ...concept(), objective: 'Nova' } } }, () => {
    writeJson(path.join(dir, '.cache/repowise.json'), { generation: 'new' });
  }), /conflict/i);
  assert.equal(readJson(path.join(dir, '.cache/repowise.json')).generation, 'new');
  assert.equal(readProject(dir).revision, revision);
});

test('baseline preparation runs under the project lock and captures its generated graph', async (t) => {
  const dir = project(t), revision = readProject(dir).revision;
  const result = await snapshotBaseline(dir, { id: 'prepared', title: 'Preparada', expectedRevision: revision }, async (lockedDir) => {
    await assert.rejects(applyProjectChange(dir, { expectedRevision: revision, documents: { 'plan.json': concept() } }), /lock|ocupad/i);
    writeJson(path.join(lockedDir, 'graph.json'), { lifecycle: { revision }, project: { name: 'Preparado' } });
  });
  assert.equal(result.graph.project.name, 'Preparado');
});
