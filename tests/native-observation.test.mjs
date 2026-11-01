import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeProject, cleanup, run, readJson, writeJson } from './helpers.mjs';
import { captureSourceRevision, freshObservedScan } from '../skills/floorplan/scripts/lib/native-observation.mjs';

for (const repos of [[], ['.'], ['api', 'web']]) test(`native freshness detects content changes without a HEAD: ${JSON.stringify(repos)}`, () => {
  const root = makeProject({ 'api/book.js': 'export function book(){ return 1; }', 'web/settings.json': '{"enabled":true}' }, { repos });
  try {
    const before = captureSourceRevision(root); assert.equal(before.complete, true); assert.ok(before.hash);
    assert.equal(captureSourceRevision(root).hash, before.hash);
    const scan = { sourceRevision: before, coverage: { filesSeen: 2 }, files: [] };
    assert.equal(freshObservedScan(root, scan).freshness, 'current');
    fs.writeFileSync(path.join(root, 'api/book.js'), 'export function book(){ return 2; }');
    assert.equal(freshObservedScan(root, scan).freshness, 'stale');
    assert.equal(freshObservedScan(root, scan).coverage.complete, false);
    assert.equal(scan.freshness, undefined, 'caller snapshot remains immutable');
    const after = captureSourceRevision(root); fs.writeFileSync(path.join(root, 'web/settings.json'), '{"enabled":false}');
    assert.notEqual(captureSourceRevision(root).hash, after.hash);
  } finally { cleanup(root); }
});

test('new autoloaded files, deletions and renames invalidate the source revision', () => {
  const root = makeProject({ 'src/start.py': 'print(1)' }, { repos: ['.'] });
  try {
    let revision = captureSourceRevision(root);
    fs.writeFileSync(path.join(root, 'src/extra.py'), 'print(2)');
    assert.notEqual(captureSourceRevision(root).hash, revision.hash); revision = captureSourceRevision(root);
    fs.renameSync(path.join(root, 'src/extra.py'), path.join(root, 'src/renamed.py'));
    assert.notEqual(captureSourceRevision(root).hash, revision.hash); revision = captureSourceRevision(root);
    fs.unlinkSync(path.join(root, 'src/start.py'));
    assert.notEqual(captureSourceRevision(root).hash, revision.hash);
  } finally { cleanup(root); }
});

test('private maps, provider data, dependencies and binary assets do not invalidate source facts', () => {
  const root = makeProject({ 'src/home.js': 'export const home=1' });
  try {
    const before = captureSourceRevision(root);
    writeJson(path.join(root, 'floorplan/plan.json'), { objective: 'Private' });
    writeJson(path.join(root, 'floorplan/.cache/snapshot.json'), { private: true });
    writeJson(path.join(root, '.repowise/private.json'), { private: true });
    writeJson(path.join(root, 'node_modules/package.json'), { version: '2' });
    fs.writeFileSync(path.join(root, 'image.png'), 'asset bytes');
    assert.deepEqual(captureSourceRevision(root), before);
  } finally { cleanup(root); }
});

test('unknown coverage, old scans and a different checkout cannot be treated as current', () => {
  const root = makeProject({ 'src/a.js': 'export const a=1' }), other = makeProject({ 'src/a.js': 'export const a=1' });
  try {
    const limited = captureSourceRevision(root, { maxBytes: 2 });
    assert.equal(limited.complete, false); assert.equal(limited.hash, null); assert.ok(limited.errors.length);
    assert.equal(freshObservedScan(root, { sourceRevision: limited }).freshness, 'unknown');
    assert.equal(freshObservedScan(root, { files: [] }).freshness, 'unknown');
    assert.equal(freshObservedScan(other, { sourceRevision: captureSourceRevision(root) }).freshness, 'stale');
    assert.equal(freshObservedScan(root, null), null);
  } finally { cleanup(root); cleanup(other); }
});

test('scanner records a comparable fingerprint; generated map data leaves it unchanged', () => {
  const root = makeProject({ 'src/home.js': 'export const home=1' }, { repos: ['.'] });
  try {
    run('scan.mjs', root);
    const scan = readJson(path.join(root, 'floorplan/.cache/observed.json'));
    assert.equal(scan.sourceRevision.complete, true);
    assert.equal(scan.freshness, 'current');
    assert.equal(freshObservedScan(root, scan).freshness, 'current');
    fs.writeFileSync(path.join(root, 'src/home.js'), 'export const home=2');
    assert.equal(freshObservedScan(root, scan).freshness, 'stale');
  } finally { cleanup(root); }
});

test('symlinked sources cannot escape the project and incomplete observations never become current', () => {
  const root = makeProject({ 'src/home.js': 'export const home=1' }, { repos: ['.'] });
  try {
    fs.symlinkSync('/etc/hosts', path.join(root, 'src/external.js'));
    const revision = captureSourceRevision(root);
    assert.equal(revision.complete, false); assert.equal(revision.hash, null);
    assert.equal(freshObservedScan(root, { sourceRevision: revision }).freshness, 'unknown');
  } finally { cleanup(root); }
});

test('a scan changed during collection is not upgraded to current by a later matching read', () => {
  const root = makeProject({ 'src/home.js': 'export const home=1' });
  try {
    const scan = { sourceRevision: captureSourceRevision(root), freshness: 'stale', coverage: { filesSeen: 1 } };
    assert.equal(freshObservedScan(root, scan).freshness, 'stale');
    assert.equal(freshObservedScan(root, scan).coverage.complete, false);
  } finally { cleanup(root); }
});

test('inventory and directory depth limits report unknown instead of hashing a partial index', () => {
  const root = makeProject({ 'src/a.js': 'export const a=1', 'src/b.js': 'export const b=2' });
  try {
    assert.equal(captureSourceRevision(root, { maxFiles: 1 }).complete, false);
    assert.equal(captureSourceRevision(root, { maxEntries: 1 }).hash, null);
    writeJson(path.join(root, 'a/b/c/d/e/f/g/h/i/j/config.json'), { enabled: true });
    assert.equal(captureSourceRevision(root).complete, false);
  } finally { cleanup(root); }
});
