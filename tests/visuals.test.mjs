import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { REPO, makeProject, run, readGraph, writeJson, cleanup } from './helpers.mjs';
import { addVisual, buildVisuals, validateVisual, decodeImageDataUrl, readVisualManifest, visualAssetPath } from '../skills/floorplan/scripts/lib/visuals.mjs';

// Genuine 1x1 PNG, not a real customer's screenshot.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const screens = [{ id: 'screen:web:/', file: 'web/app/page.tsx' }];
const graph = { screens };
const meta = { screen: screens[0].id, kind: 'proposal', title: 'Home proposal', viewport: '390x844', state: 'default', version: 'v1', approved: true };
const fixture = () => { const root = makeProject({}); fs.cpSync(path.join(REPO, 'tests/fixtures/blueprint'), root, { recursive: true }); run('plan.mjs', root); run('build.mjs', root); return root; };

test('append keeps proposal and capture distinct, with metadata and source bytes intact', () => {
  const root = makeProject({}), outDir = path.join(root, 'floorplan');
  try {
    const proposal = addVisual({ outDir, graph, metadata: meta, bytes: png });
    const capture = addVisual({ outDir, graph, metadata: { ...meta, kind: 'capture', title: 'Implemented home', createdAt: '2026-11-01T08:00:00Z', sourceUrl: 'http://127.0.0.1:3000/' }, bytes: png });
    assert.notEqual(proposal.id, capture.id);
    assert.equal(proposal.screen, screens[0].id);
    assert.equal(proposal.file, screens[0].file);
    assert.equal(capture.sourceUrl, 'http://127.0.0.1:3000/');
    assert.equal(capture.viewport, '390x844');
    assert.deepEqual(fs.readFileSync(path.join(outDir, proposal.asset)), png);
    assert.deepEqual(readVisualManifest(outDir).items.map((v) => v.kind), ['proposal', 'capture']);
  } finally { cleanup(root); }
});

test('rejects unsupported image content, mismatched MIME, unknown screens and incomplete capture metadata', () => {
  const root = makeProject({}), outDir = path.join(root, 'floorplan');
  try {
    assert.throws(() => decodeImageDataUrl('data:image/jpeg;base64,' + png.toString('base64')), /does not match/);
    assert.throws(() => decodeImageDataUrl('data:image/png;base64,' + Buffer.from('<svg/>').toString('base64')), /PNG/);
    assert.throws(() => addVisual({ outDir, graph, metadata: { ...meta, screen: 'missing' }, bytes: png }), /Screen not found/);
    assert.throws(() => addVisual({ outDir, graph, metadata: { ...meta, kind: 'capture' }, bytes: png }), /require createdAt and sourceUrl/);
    assert.throws(() => validateVisual({ ...meta, id: 'x', asset: 'visuals/x.png', sourceUrl: 'javascript:alert(1)' }), /http/);
    assert.equal(fs.existsSync(path.join(outDir, 'visuals.json')), false);
  } finally { cleanup(root); }
});

test('file references resolve exactly; ambiguous files are rejected', () => {
  const root = makeProject({}), outDir = path.join(root, 'floorplan');
  try {
    const visual = addVisual({ outDir, graph, metadata: { ...meta, screen: screens[0].file }, bytes: png });
    assert.equal(visual.screen, screens[0].id);
    assert.throws(() => addVisual({ outDir, graph: { screens: [...screens, { ...screens[0], id: 'other' }] }, metadata: { ...meta, screen: screens[0].file }, bytes: png }), /ambiguous/);
  } finally { cleanup(root); }
});

test('missing assets and orphaned screen associations remain visible as warnings without rewriting the manifest', () => {
  const root = makeProject({}), outDir = path.join(root, 'floorplan');
  try {
    const v = addVisual({ outDir, graph, metadata: meta, bytes: png });
    const before = fs.readFileSync(path.join(outDir, 'visuals.json'), 'utf8');
    fs.unlinkSync(path.join(outDir, v.asset));
    const warnings = [];
    const [missing] = buildVisuals({ outDir, graph: { screens: [] }, warn: (s) => warnings.push(s) });
    assert.equal(missing.missing, true); assert.equal(missing.unresolved, true); assert.equal(missing.src, undefined);
    assert.equal(warnings.length, 2);
    assert.equal(fs.readFileSync(path.join(outDir, 'visuals.json'), 'utf8'), before);
  } finally { cleanup(root); }
});

test('asset paths cannot traverse or follow a symlink outside the visual folder', () => {
  const root = makeProject({}), outDir = path.join(root, 'floorplan');
  try {
    for (const asset of ['../secret.png', 'visuals/../../secret.png', '/tmp/secret.png', 'visuals/%2e%2e/secret.png', 'visuals/a.svg']) assert.throws(() => visualAssetPath(outDir, asset, { missingOK: true }), /Asset/);
    fs.mkdirSync(outDir);
    const elsewhere = path.join(root, 'elsewhere'); fs.mkdirSync(elsewhere);
    fs.symlinkSync(elsewhere, path.join(outDir, 'visuals'), 'dir');
    assert.throws(() => addVisual({ outDir, graph, metadata: meta, bytes: png }), /symlink/);
    assert.deepEqual(fs.readdirSync(elsewhere), []);
  } finally { cleanup(root); }
});

test('a failed rebuild rolls back only the attempted addition', () => {
  const root = makeProject({}), outDir = path.join(root, 'floorplan');
  try {
    const original = addVisual({ outDir, graph, metadata: meta, bytes: png });
    const before = fs.readFileSync(path.join(outDir, 'visuals.json'), 'utf8');
    assert.throws(() => addVisual({ outDir, graph, metadata: meta, bytes: png, rebuild() { throw new Error('Build failed'); } }), /Build failed/);
    assert.equal(fs.readFileSync(path.join(outDir, 'visuals.json'), 'utf8'), before);
    assert.deepEqual(fs.readdirSync(path.join(outDir, 'visuals')), [path.basename(original.asset)]);
    assert.equal(fs.existsSync(path.join(outDir, '.visuals.lock')), false);
  } finally { cleanup(root); }
});

test('CLI import survives blueprint refresh and export travels with its images only when requested', () => {
  const root = fixture(), outDir = path.join(root, 'floorplan');
  try {
    const screen = readGraph(root).screens[0];
    const source = path.join(root, 'original.png'); fs.writeFileSync(source, png);
    const result = JSON.parse(run('visuals.mjs', root, 'add', '--screen', screen.file, '--kind', 'proposal', '--image', source, '--title', 'Original idea', '--approved'));
    assert.equal(result.ok, true);
    const before = fs.readFileSync(path.join(outDir, 'visuals.json'), 'utf8');
    run('refresh.mjs', root);
    assert.equal(fs.readFileSync(path.join(outDir, 'visuals.json'), 'utf8'), before);
    assert.deepEqual(fs.readFileSync(source), png);
    const exported = path.join(root, 'share.html');
    const serve = path.join(outDir, 'serve.mjs');
    execFileSync(process.execPath, [serve, '--export', exported, '--include', 'visuals']);
    const parse = () => JSON.parse(/<script>window\.FLOORPLAN = (.*?);<\/script>/s.exec(fs.readFileSync(exported, 'utf8'))[1]);
    assert.equal(parse().visuals[0].src, 'data:image/png;base64,' + png.toString('base64'));
    assert.equal(parse().visuals[0].approved, true);
    execFileSync(process.execPath, [serve, '--export', exported]);
    assert.equal(parse().visuals, undefined);
  } finally { cleanup(root); }
});

test('real-code maps accept captures and retain them when source code is rescanned', () => {
  const root = makeProject({
    'web/package.json': JSON.stringify({ dependencies: { next: '14.0.0' } }),
    'web/app/page.tsx': 'export default function Home() { return <main>Hello</main>; }',
  }, { arch: { project: { name: 'Real test app', summary: 'A tiny source-code fixture.' }, nodes: [{ id: 'web', kind: 'ui', label: 'Website', summary: 'Home page.', paths: ['web/**'] }] } });
  try {
    run('scan.mjs', root); run('build.mjs', root);
    const graph = readGraph(root), outDir = path.join(root, 'floorplan');
    assert.equal(graph.meta.blueprint, undefined);
    assert.equal(graph.screens.length, 1);
    const visual = addVisual({ outDir, graph, metadata: { ...meta, screen: graph.screens[0].id, kind: 'capture', sourceUrl: 'http://localhost:3000/', createdAt: '2026-11-01T08:00:00Z' }, bytes: png, rebuild: () => run('build.mjs', root) });
    fs.writeFileSync(path.join(root, 'web/app/page.tsx'), 'export default function Home() { return <main>Hello again</main>; }');
    run('refresh.mjs', root);
    assert.equal(readGraph(root).visuals[0].id, visual.id);
    assert.equal(readGraph(root).visuals[0].kind, 'capture');
    assert.ok(fs.existsSync(path.join(outDir, '.cache/skill.json')), 'code map can rebuild after local imports');
  } finally { cleanup(root); }
});

test('the upload API requires token and origin, validates captures, persists and rebuilds', async () => {
  const root = fixture(), outDir = path.join(root, 'floorplan');
  let server;
  try {
    server = spawn(process.execPath, [path.join(outDir, 'serve.mjs'), '--port', String(23000 + Math.floor(Math.random() * 10000)), '--no-open'], { cwd: root, env: { ...process.env, FLOORPLAN_CLAUDE: path.join(root, 'none'), FLOORPLAN_CODEX: path.join(root, 'none'), FLOORPLAN_NO_PROMPTS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const base = await new Promise((resolve, reject) => {
      let out = ''; const timer = setTimeout(() => reject(new Error(out)), 20000);
      server.stdout.on('data', (d) => { out += d; const m = /Floorplan: (http:\/\/\S+)/.exec(out); if (m) { clearTimeout(timer); resolve(m[1]); } });
      server.stderr.on('data', (d) => { out += d; });
      server.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Exited ${code}: ${out}`)); });
    });
    const token = /"token":"([0-9a-f]+)"/.exec(await (await fetch(base)).text())[1];
    const screen = readGraph(root).screens[0];
    const payload = { screen: screen.id, kind: 'capture', title: 'Test browser capture', createdAt: '2026-11-01T08:00:00Z', sourceUrl: 'http://localhost:3000/', dataUrl: 'data:image/png;base64,' + png.toString('base64') };
    const post = (body, headers = {}) => fetch(base + '/api/visuals', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    assert.equal((await post(payload)).status, 403);
    assert.equal((await post(payload, { 'x-floorplan-token': token, origin: 'https://elsewhere.example' })).status, 403);
    assert.equal((await post({ ...payload, sourceUrl: '' }, { 'x-floorplan-token': token })).status, 400);
    const added = await post(payload, { 'x-floorplan-token': token });
    assert.equal(added.status, 201);
    const data = await added.json(); assert.equal(data.visual.kind, 'capture');
    // A browser reload immediately after the 201 must see the new map, before the file watcher fires.
    const immediateHtml = await (await fetch(base + '/')).text();
    const immediateGraph = JSON.parse(/<script>window\.FLOORPLAN = (.*?);<\/script>/s.exec(immediateHtml)[1]);
    assert.equal(immediateGraph.visuals[0].title, payload.title);
    assert.equal(immediateGraph.visuals[0].id, data.visual.id);
    assert.equal(readGraph(root).visuals[0].id, data.visual.id);
    const image = await fetch(base + '/' + data.visual.src);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    const listed = await (await fetch(base + '/api/visuals', { headers: { 'x-floorplan-token': token } })).json();
    assert.equal(listed.visuals.length, 1);
  } finally {
    if (server && server.exitCode === null) await new Promise((resolve) => { server.once('exit', resolve); server.kill(); });
    cleanup(root);
  }
});
