import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { makeProject, cleanup, run, readGraph, readJson, writeJson } from './helpers.mjs';

const architecture = { project: { name: 'Synthetic planning example' }, nodes: [{ id: 'web', label: 'Aplicativo', kind: 'ui', summary: 'Experiência do usuário', paths: ['src/**'] }] };
const plan = () => ({ $schema: 'floorplan/plan@2', stage: 'concept', objective: 'Organizar reservas', scope: { included: ['Reservas'], excluded: ['Pagamentos'] }, requirements: [{ id: 'booking', title: 'Criar reserva', criteria: [{ id: 'confirmation', text: 'Exibir confirmação ao concluir' }], refs: ['f:src/book.js'] }], decisions: [], files: [], endpoints: [], screens: [] });

test('a concept without fictitious files reaches the map and stays outside Git', () => {
  const root = makeProject({}, { repos: ['.'], arch: architecture });
  try {
    writeJson(path.join(root, 'floorplan/plan.json'), plan());
    run('plan.mjs', root); run('build.mjs', root, '--no-claude-md');
    const graph = readGraph(root);
    assert.equal(graph.lifecycle.plan.objective, 'Organizar reservas');
    assert.equal(graph.files.length, 0);
    assert.equal(graph.lifecycle.plan.requirements[0].criteria[0].id, 'confirmation');
    assert.equal(execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim(), '');
  } finally { cleanup(root); }
});

test('refresh from code keeps planned files and a separate observed snapshot', () => {
  const root = makeProject({ 'src/home.js': 'export function home() { return 1; }' }, { repos: ['.'], arch: architecture });
  try {
    const p = plan(); p.stage = 'implementation'; p.files = [{ path: 'src/home.js', name: 'Início', description: 'Início' }, { path: 'src/book.js', name: 'Reserva', description: 'Criar reserva' }];
    writeJson(path.join(root, 'floorplan/plan.json'), p);
    run('plan.mjs', root); run('build.mjs', root, '--no-claude-md');
    run('refresh.mjs', root, '--from-code', '--no-claude-md');
    const graph = readGraph(root);
    assert.deepEqual(graph.files.map(f => f.p).sort(), ['src/book.js', 'src/home.js']);
    assert.equal(graph.files.find(f => f.p === 'src/book.js').implementation, 'planned');
    assert.equal(graph.files.find(f => f.p === 'src/home.js').implementation, 'observed');
    assert.equal(graph.meta.blueprint, undefined);
    assert.equal(graph.lifecycle.plan.requirements[0].id, 'booking');
    assert.deepEqual(readJson(path.join(root, 'floorplan/.cache/observed.json')).files.filter(f => f.category === 'code').map(f => f.path), ['src/home.js']);
    assert.equal(readJson(path.join(root, 'floorplan/plan.json')).files.length, 2);
    fs.writeFileSync(path.join(root, 'src/home.js'), 'export function home() { return 2; }');
    const before = graph.lifecycle.assessment.observedRevision;
    run('refresh.mjs', root, '--no-claude-md');
    assert.notEqual(readGraph(root).lifecycle.assessment.observedRevision, before);
  } finally { cleanup(root); }
});

test('stable screen identities keep an existing visual associated after URL changes', () => {
  const root = makeProject({}, { arch: architecture });
  try {
    const p = plan(); p.files = [{ path: 'src/home.js', name: 'Início', description: 'Página inicial', screen: '/old' }];
    p.screens = [{ id: 'home', title: 'Início', file: 'src/home.js', url: '/old', node: 'web', aliases: ['screen:web:/old'] }];
    writeJson(path.join(root, 'floorplan/plan.json'), p);
    writeJson(path.join(root, 'floorplan/visuals.json'), { version: 1, items: [{ id: 'mockup', screen: 'screen:web:/old', kind: 'proposal', title: 'Proposta', asset: 'visuals/home.png' }] });
    fs.mkdirSync(path.join(root, 'floorplan/visuals')); fs.writeFileSync(path.join(root, 'floorplan/visuals/home.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
    run('plan.mjs', root); run('build.mjs', root, '--no-claude-md');
    const first = readGraph(root);
    assert.equal(first.screens[0].id, 'home');
    assert.equal(first.visuals[0].screen, 'home');
    p.files[0].screen = '/new'; p.screens[0].url = '/new';
    writeJson(path.join(root, 'floorplan/plan.json'), p);
    run('plan.mjs', root); run('build.mjs', root, '--no-claude-md');
    assert.equal(readGraph(root).visuals[0].screen, 'home');
    assert.equal(readGraph(root).visuals[0].unresolved, undefined);
  } finally { cleanup(root); }
});

test('configuration changes invalidate observations even when code signatures do not change', () => {
  const root = makeProject({ 'src/home.js': '', 'config.json': '{"limit":1}' }, { repos: ['.'], arch: architecture });
  try {
    run('scan.mjs', root); run('build.mjs', root, '--no-claude-md');
    const revision = readGraph(root).lifecycle.assessment.observedRevision;
    assert.ok(readJson(path.join(root, 'floorplan/.cache/observed.json')).files.find(f => f.path === 'src/home.js').h);
    fs.writeFileSync(path.join(root, 'config.json'), '{"limit":2}');
    run('scan.mjs', root); run('build.mjs', root, '--no-claude-md');
    assert.notEqual(readGraph(root).lifecycle.assessment.observedRevision, revision);
  } finally { cleanup(root); }
});


test('editing code immediately revokes passed verification in status, query and rebuilt map', () => {
  const root = makeProject({ 'src/book.js': 'export const book = () => 1;' }, { repos: ['.'], arch: architecture });
  try {
    const p = plan(); p.stage = 'implementation';
    writeJson(path.join(root, 'floorplan/plan.json'), p);
    run('scan.mjs', root); run('build.mjs', root, '--no-claude-md');
    const assessment = readGraph(root).lifecycle.assessment;
    p.requirements[0].evidence = [{ criterionId: 'confirmation', criterionHash: assessment.requirements[0].criteria[0].criterionHash, result: 'pass', method: 'Testar uma reserva com confirmação', at: '2026-11-01T12:00:00Z', revision: assessment.observedRevision }];
    writeJson(path.join(root, 'floorplan/plan.json'), p);
    run('build.mjs', root, '--no-claude-md');
    assert.equal(readGraph(root).lifecycle.assessment.requirements[0].verification, 'passed');
    assert.equal(JSON.parse(run('project.mjs', root, 'status')).assessment.requirements[0].verification, 'passed');
    fs.writeFileSync(path.join(root, 'src/book.js'), 'export const book = () => 2;');
    assert.notEqual(JSON.parse(run('project.mjs', root, 'status')).assessment.requirements[0].verification, 'passed');
    const query = JSON.parse(execFileSync(process.execPath, [path.join(root, 'floorplan/query.mjs'), 'project'], { encoding: 'utf8' }));
    assert.notEqual(query.assessment.requirements[0].verification, 'passed');
    run('build.mjs', root, '--no-claude-md');
    assert.notEqual(readGraph(root).lifecycle.assessment.requirements[0].verification, 'passed');
  } finally { cleanup(root); }
});
