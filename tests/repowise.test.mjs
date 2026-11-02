import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const moduleURL = new URL('../skills/floorplan/scripts/lib/repowise.mjs', import.meta.url);
async function adapter() {
  assert.ok(fs.existsSync(moduleURL), 'the Repowise adapter must exist');
  return import(moduleURL);
}
function fixture(t, mode = 'normal') {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'floorplan-repowise-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const fake = path.join(dir, 'provider.cjs');
  fs.writeFileSync(path.join(dir, 'booking.py'), 'def reserve():\n    return 1\n');
  fs.writeFileSync(fake, `
const fs=require('node:fs'), readline=require('node:readline');
const mode=${JSON.stringify(mode)};
const args=process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(path.join(dir, 'calls.jsonl'))},JSON.stringify(args)+'\\n');
if(args[0]==='--version'){console.log('repowise, version 0.56.0');process.exit(0);}
if(args[0]==='init'){
 for(const flag of ['--no-editor-setup','--no-hook','--no-agents','--no-claude-md','--no-codex','--no-distill-hook','--no-save-key','--no-workspace','--no-prose'])if(!args.includes(flag))process.exit(6);
 if(args[args.indexOf('--mode')+1]!=='fast')process.exit(6);
 fs.writeFileSync(require('node:path').join(args[1],'.repowise','state.json'),'{}');process.exit(0);
}
if(args[0]==='update'){
 if(!args.includes('--index-only')||!args.includes('--working-tree')||!args.includes('--no-workspace')||!args.includes('--no-agents')) process.exit(9);
 if(mode==='update-failure')process.exit(4);
 process.exit(0);
}
if(args[0]!=='mcp'||!args.includes('--no-workspace'))process.exit(7);
if(mode==='timeout'){setInterval(()=>{},1000);return;}
const base={contract_version:mode==='future'?99:3,indexed_commit:'abc123',live_head:'abc123',index_behind:false,completeness:{capped:false}};
readline.createInterface({input:process.stdin}).on('line',line=>{
 const q=JSON.parse(line);if(q.id===undefined)return;
 if(q.method==='initialize')return console.log(JSON.stringify({jsonrpc:'2.0',id:q.id,result:{protocolVersion:'2024-11-05',capabilities:{},serverInfo:{name:'repowise',version:'1'}}}));
 if(q.method!=='tools/call')process.exit(8);
 const name=q.params.name;
 let value={_meta:base};
 if(name==='get_overview')value={code_health:{file_count:2},entry_points:['booking.py'],_meta:base};
 if(name==='get_context')value={targets:{'booking.py':{type:'file',path:'booking.py',docs:{summary:'Calcula a reserva',symbols:[{name:'reserve',kind:'function',line:3}]},callers:[{file:'app.py',imports:true}],callees:[],callees_basis:{note:'Only resolved edges'}}},_meta:base};
 if(name==='get_health')value={kpis:{file_count:2},top_findings:[{id:'f1',title:'Condição redundante',file_path:'booking.py',line:3,severity:'low',detail:'O ramo repete a mesma operação.'}],_meta:base};
 if(mode==='truncated'&&name==='get_context'){value._meta={...base,omitted:{refs:['abc'],restore:'repowise expand abc'},state:{truncated:true,partial:true},degraded:['resolver'],stale_warning:'A target differs in the working tree'};value.dropped_targets=['app.py'];}
 if(mode==='malformed'&&name==='get_overview')value={unexpected:true};
 if(mode==='tool-error'&&name==='get_health')return console.log(JSON.stringify({jsonrpc:'2.0',id:q.id,result:{isError:true,content:[{type:'text',text:'failed'}]}}));
 const result=mode==='text-wire'?{content:[{type:'text',text:JSON.stringify(value)}]}:{structuredContent:{result:value}};
 console.log(JSON.stringify({jsonrpc:'2.0',id:q.id,result}));
});
`);
  return { dir, command: { file: process.execPath, args: [fake] }, calls: () => fs.readFileSync(path.join(dir, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) };
}
const observeURL = new URL('../skills/floorplan/scripts/observe.mjs', import.meta.url);
const observeFile = fileURLToPath(observeURL);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) { for (let i = 0; i < 200; i++) { if (check()) return; await pause(50); } assert.fail('expected observable effect did not arrive'); }

test('CLI writes a private observation and reports failure with a nonzero status', async t => {
  assert.ok(fs.existsSync(observeURL), 'observe CLI must exist');
  const f = fixture(t);
  const args = [observeFile, f.dir, '--repowise', f.command.file, '--repowise-arg', f.command.args[0], '--target', 'booking.py', '--no-rebuild'];
  const result = JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8' }));
  assert.equal(result.provider, 'repowise');
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir, 'floorplan/.cache/repowise.json'))).contexts[0].path, 'booking.py');
  assert.throws(() => execFileSync(process.execPath, [observeFile, f.dir, '--repowise', path.join(f.dir, 'missing'), '--no-rebuild'], { stdio: 'pipe' }), e => e.status === 1);
});

test('foreground watcher has one owner, observes repeated dirty-file edits and releases its lock', async t => {
  assert.ok(fs.existsSync(observeURL), 'observe CLI must exist');
  const f = fixture(t);
  execFileSync('git', ['init', '-q', f.dir]);
  fs.writeFileSync(path.join(f.dir, '.gitignore'), 'provider.cjs\ncalls.jsonl\n');
  fs.writeFileSync(path.join(f.dir, 'booking.py'), 'value = 1\n');
  execFileSync('git', ['-C', f.dir, 'add', 'booking.py', '.gitignore']);
  execFileSync('git', ['-C', f.dir, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture']);
  const args = [observeFile, f.dir, '--repowise', f.command.file, '--repowise-arg', f.command.args[0], '--watch', '--interval', '200', '--no-rebuild'];
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const closed = new Promise(resolve => child.on('close', resolve));
  t.after(() => child.kill('SIGKILL'));
  let output = ''; child.stdout.on('data', c => output += c); child.stderr.on('data', c => output += c);
  const lock = path.join(f.dir, 'floorplan/.cache/observe.lock');
  await until(() => output.includes('"provider":"repowise"'));
  assert.ok(fs.existsSync(lock));
  assert.throws(() => execFileSync(process.execPath, args, { stdio: 'pipe' }), e => e.status === 1);
  const calls = () => f.calls().filter(a => a[0] === 'update').length;
  const first = calls();
  fs.writeFileSync(path.join(f.dir, 'booking.py'), 'value = 2\n');
  await until(() => calls() > first);
  await pause(600);
  const second = calls();
  fs.writeFileSync(path.join(f.dir, 'booking.py'), 'value = 3\n');
  await until(() => calls() > second);
  child.kill('SIGTERM');
  assert.equal(await closed, 0);
  assert.equal(fs.existsSync(lock), false);
});

test('reads structured provider evidence without treating code presence as verification', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t);
  const observation = await collectRepowise(f.dir, { command: f.command, targets: ['booking.py'] });
  assert.equal(observation.provider, 'repowise');
  assert.equal(observation.providerVersion, '0.56.0');
  assert.equal(observation.contexts[0].path, 'booking.py');
  assert.equal(observation.contexts[0].callers[0].file, 'app.py');
  assert.equal(observation.findings[0].items[0], 'f:booking.py');
  assert.equal(observation.findings[0].needsReview, true);
  assert.equal(observation.coverage.requestedTargets, 1);
  assert.equal(observation.coverage.returnedTargets, 1);
  assert.equal(observation.verification, undefined);
  assert.equal(f.calls().filter(a => a[0] === 'mcp').length, 1);
});

test('a truncated degraded stale response remains visibly partial with recovery references', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t, 'truncated');
  const observation = await collectRepowise(f.dir, { command: f.command, targets: ['booking.py', 'app.py'] });
  assert.equal(observation.status, 'partial');
  assert.equal(observation.freshness, 'stale');
  assert.equal(observation.coverage.truncated, true);
  assert.ok(observation.coverage.unresolved.includes('app.py'));
  assert.ok(observation.degraded.includes('resolver'));
  assert.deepEqual(observation.recovery[0].refs, ['abc']);
});

test('unavailable executable is unknown, not a healthy empty project', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t);
  const observation = await collectRepowise(f.dir, { command: path.join(f.dir, 'missing') });
  assert.equal(observation.status, 'unavailable');
  assert.equal(observation.freshness, 'unknown');
  assert.ok(observation.errors.length);
});

for (const mode of ['future', 'malformed', 'tool-error', 'timeout']) test(`${mode} provider does not produce a complete observation`, async t => {
  const { collectRepowise } = await adapter(), f = fixture(t, mode);
  const observation = await collectRepowise(f.dir, { command: f.command, timeoutMs: mode === 'timeout' ? 150 : 5000 });
  assert.ok(['partial', 'error', 'unavailable'].includes(observation.status));
  assert.ok(observation.errors.length);
});

test('supports both MCP structuredContent and its official JSON text encoding', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t, 'text-wire');
  const observation = await collectRepowise(f.dir, { command: f.command, targets: ['booking.py'] });
  assert.equal(observation.contexts[0].summary, 'Calcula a reserva');
});

test('updates the exact repository with no model, workspace expansion or agent file generation', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t);
  await collectRepowise(f.dir, { command: f.command, update: true });
  const update = f.calls().find(a => a[0] === 'update');
  assert.equal(update[1], f.dir);
  for (const flag of ['--index-only', '--working-tree', '--no-workspace', '--no-agents']) assert.ok(update.includes(flag));
  assert.equal(f.calls().some(a => a[0] === 'init'), false);
});

test('failed update cannot keep a previous current verdict', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t, 'update-failure');
  const observation = await collectRepowise(f.dir, { command: f.command, update: true });
  assert.equal(observation.freshness, 'unknown');
  assert.ok(observation.errors.some(e => e.code === 'update_failed'));
});

test('observation persistence stays ignored and retains the last usable evidence on provider failure', async t => {
  const { persistRepowise } = await adapter(), f = fixture(t);
  execFileSync('git', ['init', '-q', f.dir]);
  const out = path.join(f.dir, 'floorplan');
  await persistRepowise(out, { schema: 'floorplan/observation@1', provider: 'repowise', status: 'ready', freshness: 'current', capturedAt: '2026-01-01T00:00:00Z', contexts: [{ path: 'booking.py' }], findings: [], errors: [] });
  await persistRepowise(out, { schema: 'floorplan/observation@1', provider: 'repowise', status: 'unavailable', freshness: 'unknown', capturedAt: '2026-01-02T00:00:00Z', contexts: [], findings: [], errors: [{ code: 'unavailable' }] });
  const saved = JSON.parse(fs.readFileSync(path.join(out, '.cache', 'repowise.json')));
  assert.equal(saved.status, 'unavailable');
  assert.equal(saved.lastUsable.contexts[0].path, 'booking.py');
  assert.equal(saved.lastUsable.capturedAt, '2026-01-01T00:00:00Z');
  assert.equal(execFileSync('git', ['-C', f.dir, 'status', '--porcelain', '--', 'floorplan'], { encoding: 'utf8' }), '');
});

test('rejects outside-repository and option-looking context targets', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t);
  for (const target of ['../other.py', '/private/app.py', '--help']) {
    await assert.rejects(collectRepowise(f.dir, { command: f.command, targets: [target] }), /target/i);
  }
});

test('provider index files stay out of Git even when editor setup is disabled', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t);
  execFileSync('git', ['init', '-q', f.dir]);
  await collectRepowise(f.dir, { command: f.command });
  assert.ok(fs.existsSync(path.join(f.dir, '.repowise', '.gitignore')));
  fs.writeFileSync(path.join(f.dir, '.repowise', 'state.json'), '{"private":true}');
  assert.equal(execFileSync('git', ['-C', f.dir, 'status', '--porcelain', '--', '.repowise'], { encoding: 'utf8' }), '');
});

test('already tracked provider data refuses indexing rather than silently publishing project evidence', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t);
  execFileSync('git', ['init', '-q', f.dir]);
  fs.mkdirSync(path.join(f.dir, '.repowise'));
  fs.writeFileSync(path.join(f.dir, '.repowise', 'state.json'), '{}');
  execFileSync('git', ['-C', f.dir, 'add', '.repowise/state.json']);
  const result = await collectRepowise(f.dir, { command: f.command, update: true });
  assert.equal(result.status, 'error');
  assert.ok(result.errors.some(e => e.code === 'tracked_provider_data'));
  assert.equal(fs.existsSync(path.join(f.dir, 'calls.jsonl')), false);
});

test('aborting an observation terminates the waiting child before its normal timeout', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t, 'timeout');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300);
  const started = Date.now();
  const result = await collectRepowise(f.dir, { command: f.command, signal: controller.signal, timeoutMs: 5000 });
  clearTimeout(timer);
  assert.ok(Date.now() - started < 2500, 'cancellation must not leave the provider waiting');
  assert.ok(result.errors.some(e => e.code === 'aborted'));
});

test('reading cached evidence after a body edit marks it stale and refuses a different repository', async t => {
  const { collectRepowise, persistRepowise, readRepowise } = await adapter(), f = fixture(t);
  assert.equal(typeof readRepowise, 'function', 'cache readers need a freshness boundary');
  execFileSync('git', ['init', '-q', f.dir]);
  fs.writeFileSync(path.join(f.dir, '.gitignore'), 'provider.cjs\ncalls.jsonl\n');
  fs.writeFileSync(path.join(f.dir, 'booking.py'), 'value = 1\n');
  execFileSync('git', ['-C', f.dir, 'add', 'booking.py', '.gitignore']);
  execFileSync('git', ['-C', f.dir, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture']);
  const result = await collectRepowise(f.dir, { command: f.command, targets: ['booking.py'] });
  const out = path.join(f.dir, 'floorplan');
  await persistRepowise(out, result);
  fs.writeFileSync(path.join(f.dir, 'booking.py'), 'value = 2\n');
  assert.equal(readRepowise(out, f.dir).freshness, 'stale');
  const other = fixture(t);
  const foreign = readRepowise(out, other.dir);
  assert.equal(foreign.status, 'error');
  assert.equal(foreign.contexts.length, 0);
  assert.ok(foreign.errors.some(e => e.code === 'foreign_repository'));
});

test('a provider that still serves a deleted file cannot claim that target exists', async t => {
  const { collectRepowise } = await adapter(), f = fixture(t);
  fs.unlinkSync(path.join(f.dir, 'booking.py'));
  const out = await collectRepowise(f.dir, { command: f.command, targets: ['booking.py'] });
  assert.equal(out.contexts.length, 0);
  assert.ok(out.coverage.unresolved.includes('booking.py'));
  assert.equal(out.freshness, 'stale');
});

test('cache writes respect an active project publication lock', async t => {
  const { persistRepowise } = await adapter(), f = fixture(t);
  const { withProjectLock } = await import('../skills/floorplan/scripts/lib/project.mjs');
  const outDir = path.join(f.dir, 'floorplan');
  await withProjectLock(outDir, async () => {
    await assert.rejects(async () => persistRepowise(outDir, { schema: 'floorplan/observation@1', provider: 'repowise', status: 'ready' }), /lock/i);
  });
  assert.equal(fs.existsSync(path.join(outDir, '.cache/repowise.json')), false);
});

test('explicit initialization builds a private index without installing hooks and never reinitializes existing indexes', async t => {
  const { initializeRepowise } = await adapter(), f = fixture(t);
  assert.equal(typeof initializeRepowise, 'function');
  await initializeRepowise(f.dir, { command: f.command });
  await initializeRepowise(f.dir, { command: f.command });
  assert.equal(f.calls().filter(a => a[0] === 'init').length, 1);
  assert.ok(fs.existsSync(path.join(f.dir, '.repowise/.gitignore')));
  assert.equal(fs.existsSync(path.join(f.dir, 'AGENTS.md')), false);
});

test('CLI reports a failed map rebuild as failure while preserving the collected evidence', async t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.dir, 'floorplan'));
  fs.writeFileSync(path.join(f.dir, 'floorplan/architecture.json'), '{"invalid":true}');
  assert.throws(() => execFileSync(process.execPath, [observeFile, f.dir, '--repowise', f.command.file, '--repowise-arg', f.command.args[0], '--target', 'booking.py'], { stdio: 'pipe' }), e => e.status === 1);
  const saved = JSON.parse(fs.readFileSync(path.join(f.dir, 'floorplan/.cache/repowise.json')));
  assert.ok(saved.errors.some(e => e.code === 'rebuild_failed'));
  assert.equal(saved.contexts[0].path, 'booking.py');
});
