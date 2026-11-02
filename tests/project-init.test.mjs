import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { makeProject, cleanup, run, writeJson } from './helpers.mjs';

test('init protects sources before first publication and preserves subsequent plans', (t) => {
  const root = makeProject({}, { repos: ['.'] }); t.after(() => cleanup(root));
  const initial = JSON.parse(run('project.mjs', root, 'init'));
  const dir = path.join(root, 'floorplan');
  fs.mkdirSync(path.join(dir, 'sources'));
  fs.writeFileSync(path.join(dir, 'sources/request.md'), 'Synthetic room booking request.');
  const plan = { $schema: 'floorplan/plan@2', stage: 'concept', objective: 'Reservar salas', questions: [] };
  writeJson(path.join(dir, 'change.json'), { documents: {
    'plan.json': plan,
    'architecture.json': { project: { name: 'Salas' }, nodes: [{ id: 'reservas', label: 'Reservas', kind: 'service' }] },
  } });
  const applied = JSON.parse(run('project.mjs', root, 'apply', '--input', path.join(dir, 'change.json'), '--revision', initial.revision));
  assert.equal(applied.ok, true);
  assert.ok(fs.existsSync(path.join(dir, 'index.html')));
  const again = JSON.parse(run('project.mjs', root, 'init'));
  assert.equal(again.revision, applied.revision);
  assert.deepEqual(again.plan, plan);
  assert.equal(fs.readFileSync(path.join(dir, 'sources/request.md'), 'utf8'), 'Synthetic room booking request.');
  assert.equal(execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }), '');
});

test('init refuses a project-owned floorplan directory without overwriting it', (t) => {
  const root = makeProject({ 'floorplan/app.js': 'project code' }); t.after(() => cleanup(root));
  assert.throws(() => run('project.mjs', root, 'init'), /already exists/);
  assert.equal(fs.readFileSync(path.join(root, 'floorplan/app.js'), 'utf8'), 'project code');
  assert.equal(fs.existsSync(path.join(root, 'floorplan/.gitignore')), false);
});
