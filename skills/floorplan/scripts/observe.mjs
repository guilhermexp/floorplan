#!/usr/bin/env node
// Local optional analysis. The foreground watcher is the sole update supervisor: no hooks,
// secondary Repowise watcher, global setup or model-based page generation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mapDir, keepOutOfGit } from './lib/common.mjs';
import { collectRepowise, persistRepowise, sourceRevision, initializeRepowise } from './lib/repowise.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const options = { targets: [], prefix: [], interval: 3000, timeoutMs: 60000, rebuild: true };
const argv = process.argv.slice(2);
function usage() {
  console.log('Uso: node observe.mjs <projeto> [--init] [--update] [--target caminho] [--risk] [--watch] [--interval 3000] [--timeout 60000] [--repowise executável] [--repowise-arg argumento] [--no-rebuild]');
  console.log('--init cria um índice estrutural local sem instalar hooks/configurações de editor. --watch acompanha em primeiro plano; Ctrl+C encerra o supervisor e seus processos.');
}
function parse() {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { usage(); return false; }
    if (['--init','--watch','--update','--risk','--no-rebuild'].includes(a)) { if (a === '--no-rebuild') options.rebuild = false; else options[a.slice(2)] = true; continue; }
    if (['--target','--interval','--timeout','--repowise','--repowise-arg'].includes(a)) {
      const value = argv[++i]; if (!value) throw new Error(`Falta o valor de ${a}`);
      if (a === '--target') options.targets.push(value);
      if (a === '--repowise-arg') options.prefix.push(value);
      if (a === '--repowise') options.command = value;
      if (a === '--interval') options.interval = Number(value);
      if (a === '--timeout') options.timeoutMs = Number(value);
      continue;
    }
    if (a.startsWith('-') || options.root) throw new Error(`Argumento não reconhecido: ${a}`);
    options.root = a;
  }
  if (!Number.isFinite(options.interval) || options.interval < 200 || options.interval > 60000) throw new Error('Intervalo deve ser de 200 a 60000 ms.');
  return true;
}

function lockSupervisor(outDir) {
  const filename = path.join(outDir, '.cache', 'observe.lock');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const token = crypto.randomBytes(16).toString('hex');
  function create() { const fd = fs.openSync(filename, 'wx', 0o600); try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, token, startedAt: new Date().toISOString() })); } finally { fs.closeSync(fd); } }
  try { create(); } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    let previous; try { previous = JSON.parse(fs.readFileSync(filename, 'utf8')); } catch {}
    let dead = false;
    if (Number.isInteger(previous?.pid) && previous.pid > 0) try { process.kill(previous.pid, 0); } catch (e) { dead = e.code === 'ESRCH'; }
    if (!dead) throw new Error('Já existe um supervisor de observação para este projeto. Encerre-o antes de iniciar outro.');
    fs.unlinkSync(filename); create();
  }
  return () => { try { if (JSON.parse(fs.readFileSync(filename, 'utf8')).token === token) fs.unlinkSync(filename); } catch {} };
}

function sleep(ms, signal) {
  return new Promise(resolve => {
    if (signal.aborted) return resolve();
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, ms); signal.addEventListener('abort', finish, { once: true });
  });
}

function refresh(root, outDir, signal) {
  if (!fs.existsSync(path.join(outDir, 'architecture.json'))) return Promise.resolve();
  // An existing map follows the standard refresh path; a first observation builds it from the scan.
  const commands = fs.existsSync(path.join(outDir, 'graph.json')) ? [['refresh.mjs', '--from-code', '--no-claude-md']] : [['scan.mjs'], ['build.mjs', '--no-claude-md']];
  return commands.reduce((previous, args) => previous.then(() => new Promise((resolve, reject) => {
    if (signal.aborted) return resolve();
    const child = spawn(process.execPath, [path.join(HERE, args[0]), root, ...args.slice(1)], { stdio: ['ignore','pipe','pipe'], windowsHide: true, detached: process.platform !== 'win32' });
    let failure, size = 0;
    const kill = () => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} };
    const timer = setTimeout(() => { failure = 'Tempo de reconstrução excedido.'; kill(); }, options.timeoutMs);
    const bounded = b => { size += b.length; if (size > 4 * 1024 * 1024) { failure = 'Saída de reconstrução excedeu o limite.'; kill(); } };
    child.stdout.on('data', bounded); child.stderr.on('data', bounded);
    signal.addEventListener('abort', kill, { once: true });
    child.on('error', () => { failure = 'Não foi possível iniciar a reconstrução do mapa.'; });
    child.on('close', code => {
      clearTimeout(timer); signal.removeEventListener('abort', kill);
      if (signal.aborted) resolve(); else if (code !== 0 || failure) reject(new Error(failure || 'A análise foi salva, mas a reconstrução do mapa falhou.')); else resolve();
    });
  })), Promise.resolve());
}

async function main() {
  if (!parse()) return;
  const root = fs.realpathSync(path.resolve(options.root || '.'));
  const outDir = mapDir(root);
  const tracked = keepOutOfGit(outDir);
  if (tracked) throw new Error('O Git já rastreia dados de floorplan/. Revise essa situação antes de observar; nenhum arquivo foi removido.');
  const release = lockSupervisor(outDir);
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  const command = { file: options.command || 'repowise', args: options.prefix };
  let previousHash;
  try {
    if (options.init) await initializeRepowise(root, { command, timeoutMs: options.timeoutMs, signal: controller.signal });
    if (options.watch && !sourceRevision(root).hash) throw new Error('O acompanhamento precisa de um repositório Git com revisão identificável.');
    do {
      const current = sourceRevision(root).hash;
      if (previousHash === undefined || current !== previousHash) {
        const result = await collectRepowise(root, { command, targets: options.targets, update: !!(options.update || options.watch), risk: !!options.risk, timeoutMs: options.timeoutMs, signal: controller.signal });
        if (controller.signal.aborted) break;
        await persistRepowise(outDir, result);
        // Collection is serialized with rebuild. Edits that arrive meanwhile are picked up next pass.
        previousHash = result.revision.workingTreeHash;
        if (options.rebuild) try { await refresh(root, outDir, controller.signal); }
        catch (e) { result.errors.push({ code: 'rebuild_failed', message: e.message }); result.status = 'partial'; await persistRepowise(outDir, result); }
        if (controller.signal.aborted) break;
        console.log(JSON.stringify(result));
        if (!options.watch && (result.errors.length || ['error','unavailable'].includes(result.status))) process.exitCode = 1;
      }
      if (!options.watch) break;
      await sleep(options.interval, controller.signal);
    } while (!controller.signal.aborted);
  } finally { release(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}

main().catch(e => { console.error(`✗ ${e.message}`); process.exitCode = 1; });
