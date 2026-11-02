// Optional local Repowise adapter. Public CLI for indexing, JSON-RPC stdio for evidence.
// No database reads, global setup, arbitrary tools, generated code or model calls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { keepOutOfGit } from './common.mjs';
import { withProjectLock } from './project.mjs';

const TOOLS = ['get_overview', 'get_context', 'get_health', 'get_change_risk'];
const LIMIT = 4 * 1024 * 1024;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : [];
const string = value => typeof value === 'string' ? value : '';
const env = () => ({ ...process.env, DO_NOT_TRACK: '1', REPOWISE_NO_HINTS: '1', REPOWISE_SKIP_EDITOR_SETUP: '1', REPOWISE_NO_SAVE_KEY: '1', REPOWISE_MCP_DEBUG_META: '1' });
function executable(command = 'repowise') {
  const c = typeof command === 'string' ? { file: command, args: [] } : command;
  if (!record(c) || typeof c.file !== 'string' || !c.file || !Array.isArray(c.args || []) || (c.args || []).some(a => typeof a !== 'string')) throw new Error('Invalid Repowise executable');
  return { file: c.file, args: c.args || [] };
}

function terminate(child, signal = 'SIGKILL') {
  try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal); else child.kill(signal); } catch {}
}

function run(command, args, cwd, timeoutMs, signal) {
  const { file, args: prefix } = executable(command);
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('aborted'), { code: 'aborted' }));
    const child = spawn(file, [...prefix, ...args], { cwd, env: env(), stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, detached: process.platform !== 'win32' });
    let output = '', failure;
    const fail = code => { failure ||= Object.assign(new Error(code), { code }); terminate(child); };
    const aborted = () => fail('aborted');
    signal?.addEventListener('abort', aborted, { once: true });
    const timer = setTimeout(() => fail('timeout'), timeoutMs);
    child.stdout.on('data', chunk => { output += chunk.toString(); if (Buffer.byteLength(output) > LIMIT) fail('output_limit'); });
    child.on('error', e => { clearTimeout(timer); signal?.removeEventListener('abort', aborted); reject(Object.assign(new Error(e.code === 'ENOENT' ? 'Repowise unavailable' : 'Repowise could not start'), { code: e.code })); });
    child.on('close', code => { clearTimeout(timer); signal?.removeEventListener('abort', aborted); if (failure) reject(failure); else if (code !== 0) reject(Object.assign(new Error('Repowise command failed'), { code: 'exit', exitCode: code })); else resolve(output); });
  });
}

/** Availability is a capability check, never an installation or global configuration change. */
export async function detectRepowise({ command = 'repowise', timeoutMs = 5000, signal } = {}) {
  try {
    const text = await run(command, ['--version'], process.cwd(), timeoutMs, signal);
    const version = /\bversion\s+(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/i.exec(text)?.[1];
    return version ? { available: true, version } : { available: false, reason: 'unknown_version' };
  } catch (e) { return { available: false, reason: e.code === 'ENOENT' ? 'not_installed' : e.code || 'unavailable' }; }
}

function privateIndex(root) {
  const dir = path.join(root, '.repowise');
  for (const filename of [dir, path.join(dir, '.gitignore')]) {
    if (fs.existsSync(filename) && fs.lstatSync(filename).isSymbolicLink()) throw new Error('Repowise index must be local to the repository');
  }
  const tracked = keepOutOfGit(dir);
  if (!fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').split(/\r?\n/).includes('*')) throw new Error('Cannot keep Repowise index private');
  return tracked;
}

/** Explicit opt-in only. Fast structural index; no automatic installation or editor setup. */
export async function initializeRepowise(root, { command = 'repowise', timeoutMs = 120000, signal } = {}) {
  root = fs.realpathSync(path.resolve(root));
  if (privateIndex(root)) throw new Error('O Git já rastreia arquivos de .repowise/. Revise essa situação antes de inicializar.');
  if (fs.existsSync(path.join(root, '.repowise', 'state.json'))) return { initialized: false, existing: true };
  await run(command, ['init', root, '--mode','fast','--no-prose','--embedder','mock','--no-editor-setup','--no-hook','--no-agents','--no-claude-md','--no-codex','--no-distill-hook','--no-save-key','--no-onboarding','--no-workspace','--yes','--progress','json'], root, timeoutMs, signal);
  return { initialized: true, existing: false };
}

// A short-lived MCP client: only newline JSON-RPC, bounded responses and a closed tool surface.
// Server instructions and suggested commands are data, never executed by this adapter.
function session(command, root, timeoutMs, signal) {
  const { file, args } = executable(command);
  const child = spawn(file, [...args, 'mcp', root, '--no-workspace', '--transport', 'stdio', '--tools', TOOLS.join(',')], {
    cwd: root, env: env(), stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true, detached: process.platform !== 'win32',
  });
  const pending = new Map();
  let id = 0, buffer = '', failure;
  const closed = new Promise(resolve => child.once('close', resolve));
  function fail(code) {
    failure ||= Object.assign(new Error(code), { code });
    for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(failure); }
    pending.clear(); terminate(child);
  }
  const aborted = () => fail('aborted');
  signal?.addEventListener('abort', aborted, { once: true });
  if (signal?.aborted) fail('aborted');
  child.on('error', e => fail(e.code || 'process_error'));
  child.stdin.on('error', () => fail('process_closed'));
  child.on('close', () => { signal?.removeEventListener('abort', aborted); if (pending.size) fail('process_closed'); });
  child.stdout.on('data', chunk => {
    buffer += chunk.toString();
    if (Buffer.byteLength(buffer) > LIMIT) return fail('response_limit');
    let at;
    while ((at = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { return fail('invalid_json_rpc'); }
      if (msg.jsonrpc !== '2.0') return fail('invalid_json_rpc');
      // No client capabilities were advertised. Never fulfill unsolicited server requests.
      if (msg.method) {
        if (msg.id !== undefined) child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Unsupported request' } }) + '\n');
        continue;
      }
      const waiter = pending.get(msg.id); if (!waiter) continue;
      pending.delete(msg.id); clearTimeout(waiter.timer);
      if (msg.error) waiter.reject(Object.assign(new Error('MCP request failed'), { code: 'rpc_error' })); else waiter.resolve(msg.result);
    }
  });
  function request(method, params) {
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => fail('timeout'), timeoutMs);
      pending.set(requestId, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n');
    });
  }
  return {
    async start() {
      const result = await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'floorplan', version: '1' } });
      if (!result?.protocolVersion || !result?.serverInfo) throw Object.assign(new Error('Invalid MCP handshake'), { code: 'invalid_handshake' });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    },
    async call(name, args) {
      if (!TOOLS.includes(name)) throw new Error('Unsupported Repowise tool');
      const result = await request('tools/call', { name, arguments: args });
      if (result?.isError) throw Object.assign(new Error('Repowise tool failed'), { code: 'tool_error' });
      let payload = result?.structuredContent?.result;
      if (!payload) {
        try { payload = JSON.parse(list(result?.content).find(c => c.type === 'text')?.text || ''); }
        catch { throw Object.assign(new Error('Invalid Repowise response'), { code: 'invalid_payload' }); }
      }
      if (!record(payload) || !record(payload._meta) || ![3, 4].includes(payload._meta.contract_version)) {
        throw Object.assign(new Error('Unsupported Repowise response contract'), { code: 'unsupported_contract' });
      }
      if (payload.error) throw Object.assign(new Error('Repowise could not answer'), { code: 'provider_error' });
      return payload;
    },
    async close() {
      child.stdin.end(); terminate(child, 'SIGTERM');
      const timer = setTimeout(() => terminate(child), 1000);
      await closed; clearTimeout(timer);
    },
  };
}

export function sourceRevision(root) {
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024, timeout: 10000 });
  try {
    const commit = git(['rev-parse', 'HEAD']).toString().trim();
    const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
    // Include content, not just git status: editing a dirty file twice must invalidate the first read.
    const digest = crypto.createHash('sha256').update(commit).update(status).update(git(['diff', 'HEAD', '--binary']));
    const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).toString().split('\0').filter(Boolean);
    let bytes = 0;
    for (const name of untracked) {
      const filename = path.join(root, name), stat = fs.lstatSync(filename);
      digest.update(name);
      if (stat.isSymbolicLink()) { digest.update(fs.readlinkSync(filename)); continue; }
      bytes += stat.size;
      if (bytes > 16 * 1024 * 1024) return { commit, dirty: status.length > 0, hash: null, reason: 'untracked_content_limit' };
      if (stat.isFile()) digest.update(fs.readFileSync(filename));
    }
    return { commit, dirty: status.length > 0, hash: digest.digest('hex') };
  } catch { return { commit: null, hash: null, reason: 'revision_unavailable' }; }
}

function applyMeta(out, payload, tool) {
  const m = payload._meta;
  out.contractVersions = [...new Set([...out.contractVersions, m.contract_version])];
  if (m.indexed_commit) out.revision.indexedCommit = m.indexed_commit;
  if (m.index_scope?.fingerprint) out.revision.providerRevision = m.index_scope.fingerprint;
  if (m.stale_warning || m.index_behind || m.working_tree_dirty || m.server_stale) {
    out.freshness = 'stale'; out.limitations.push(string(m.stale_warning) || 'O índice não corresponde ao estado atual do código.');
  }
  if (m.degraded || m.state?.degraded || m.embedder_degraded) {
    out.degraded.push(...list(m.degraded), ...list(m.state?.degraded_reasons));
    if (!out.degraded.length) out.degraded.push(tool);
  }
  const truncated = !!(payload.truncated || m.omitted || m.state?.truncated || m.completeness?.capped || list(payload.dropped_targets).length);
  out.coverage.truncated ||= truncated;
  if (m.omitted) out.recovery.push({ tool, refs: list(m.omitted.refs), instruction: string(m.omitted.restore) });
  out.coverage.unresolved.push(...list(payload.dropped_targets).map(v => typeof v === 'string' ? v : v?.target).filter(Boolean));
  if (m.index_scope?.status && m.index_scope.status !== 'complete') out.limitations.push(`Índice: ${m.index_scope.status}.`);
  if (m.index_scope?.run_mode === 'fast') out.limitations.push('Índice rápido: histórico e documentação podem estar incompletos.');
  for (const reason of list(m.index_scope?.analysis?.unavailable)) out.degraded.push(String(reason));
  if (m.index_scope?.dropped_files) for (const [reason, group] of Object.entries(m.index_scope.dropped_files)) {
    if (group?.count) out.coverage.excluded.push({ reason, count: group.count, paths: list(group.paths), truncated: !!group.truncated });
  }
  if (m.state?.partial || m.recovery_unavailable) out.limitations.push(`Resposta parcial de ${tool}.`);
  if (m.semantic_search === false) out.limitations.push('Busca semântica indisponível; os fatos estruturais continuam utilizáveis.');
  if (m.health_analysis) {
    out.healthEvidence = { status: m.health_analysis.status, analyzedAt: m.health_analyzed_at || m.health_analysis.analyzed_at || null, commit: m.health_analyzed_commit || m.health_analysis.analyzed_commit || null, sourceBytesVerified: m.health_analysis.live_verification?.source_bytes_verified === true };
    if (out.healthEvidence.status !== 'available') out.limitations.push('A análise de saúde não tem proveniência completa.');
  }
}

function normalizeFindings(out, data) {
  const groups = [[list(data.top_findings || data.findings), 'maintainability'], [list(data.fix_first?.items), 'architecture'], [list(data.doc_drift?.findings), 'documentation']];
  const seen = new Set();
  for (const [rows, kind] of groups) for (const row of rows) {
    if (!record(row)) continue;
    const file = string(row.file_path || row.file || row.document || row.target?.file || row.target);
    const title = string(row.title || row.name || row.biomarker_type || row.reason) || 'Revisar evidência do código';
    const id = `repowise:${row.id || row.finding_id || hash(JSON.stringify([kind, file, title, row.line])).slice(0,20)}`;
    if (seen.has(id)) continue; seen.add(id);
    out.findings.push({ id, kind, severity: ['high','medium','low'].includes(row.severity) ? row.severity : 'medium', title,
      detail: string(row.detail || row.description || row.why || row.reason), file: file || null, line: Number.isInteger(row.line) ? row.line : null,
      items: file ? [`f:${file}`] : [], locations: [], needsReview: true,
      confidence: row.confidence ?? null, evidence: { provider: 'repowise', capturedAt: out.capturedAt, indexedCommit: out.revision.indexedCommit || null },
    });
  }
  if (data.doc_drift?.findings_basis || data.doc_drift?.basis) out.limitations.push(string(data.doc_drift.findings_basis || data.doc_drift.basis));
  for (const [rows, total] of [[data.top_findings, data.top_findings_total], [data.fix_first?.items, data.fix_first?.items_total], [data.doc_drift?.findings, data.doc_drift?.findings_total]]) {
    if (Number.isFinite(total) && total > list(rows).length) out.coverage.truncated = true;
  }
}

/** Collect a bounded snapshot. Provider failure is data, never a false clean bill of health. */
export async function collectRepowise(root, { command = 'repowise', targets = [], update = false, risk = false, timeoutMs = 60000, signal } = {}) {
  root = fs.realpathSync(path.resolve(root));
  if (!Array.isArray(targets) || targets.length > 100 || targets.some(t => typeof t !== 'string' || !t || t.startsWith('-') || path.isAbsolute(t) || path.win32.isAbsolute(t) || /(^|[\\/])\.\.([\\/]|$)/.test(t) || /[\0\r\n]/.test(t))) throw new Error('Invalid target: use at most 100 repository-relative paths or path::Symbol identifiers');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 100 || timeoutMs > 600000) throw new Error('Invalid timeout');
  targets = [...new Set(targets)];
  const tracked = privateIndex(root);
  const before = sourceRevision(root);
  const out = { schema: 'floorplan/observation@1', provider: 'repowise', providerVersion: null, repoId: hash(root), capturedAt: new Date().toISOString(), status: 'ready', freshness: 'unknown',
    revision: { commit: before.commit, workingTreeHash: before.hash }, contractVersions: [],
    coverage: { filesSeen: null, filesAnalyzed: null, requestedTargets: targets.length, returnedTargets: 0, unresolved: [], excluded: [], truncated: false },
    contexts: [], findings: [], limitations: [], degraded: [], recovery: [], errors: [],
  };
  if (tracked) { out.status = 'error'; out.errors.push({ code: 'tracked_provider_data', message: 'O Git já rastreia arquivos de .repowise/. Revise essa situação antes de indexar; nenhum arquivo foi removido do Git.' }); return out; }
  const provider = await detectRepowise({ command, timeoutMs: Math.min(timeoutMs, 5000), signal });
  if (!provider.available) { out.status = 'unavailable'; out.errors.push({ code: provider.reason, message: 'Repowise não está disponível. O mapa nativo continua utilizável.' }); return out; }
  out.providerVersion = provider.version;
  if (update) try {
    await run(command, ['update', root, '--index-only', '--working-tree', '--no-workspace', '--no-agents', '--progress', 'json'], root, timeoutMs, signal);
  } catch (e) { out.errors.push({ code: 'update_failed', reason: e.code, message: 'O índice não pôde ser atualizado; os dados anteriores não comprovam o estado atual.' }); }
  const client = session(command, root, timeoutMs, signal);
  try {
    await client.start();
    const queries = [['get_overview', { include: ['scope'] }], ['get_health', { include: ['doc_drift','refactoring'], only: ['kpis','top_findings','fix_first','doc_drift'], limit: 25 }]];
    if (targets.length) queries.push(['get_context', { targets, include: ['callers','callees','health','doc_drift'] }]);
    if (risk) queries.push(['get_change_risk', {}]);
    for (const [tool, args] of queries) {
      try {
        const data = await client.call(tool, args);
        applyMeta(out, data, tool);
        if (tool === 'get_overview') {
          out.coverage.filesSeen = data.code_health?.file_count ?? data.code_files ?? null;
          out.summary = { title: string(data.title), entrypoints: list(data.entry_points).filter(v => typeof v === 'string') };
        }
        if (tool === 'get_health') {
          out.coverage.filesAnalyzed = data.kpis?.file_count ?? null;
          out.health = { average: data.kpis?.average_health ?? null, unanalysedFiles: data.unanalysed_file_count ?? data.unscored_files ?? null };
          normalizeFindings(out, data);
        }
        if (tool === 'get_context') {
          if (!record(data.targets)) throw Object.assign(new Error('Invalid context response'), { code: 'invalid_context' });
          for (const target of targets) {
            const c = data.targets[target];
            if (!record(c) || c.error || c.unresolved || c.found === false) { out.coverage.unresolved.push(target); continue; }
            const contextPath = string(c.path) || target.split('::')[0];
            if (['file','symbol'].includes(c.type)) {
              const absolute = path.resolve(root, contextPath);
              if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute)) {
                out.coverage.unresolved.push(target); out.freshness = 'stale';
                out.limitations.push(`O índice ainda retorna um arquivo ausente neste checkout: ${target}.`); continue;
              }
            }
            out.contexts.push({ target, path: contextPath, kind: string(c.type), summary: string(c.docs?.summary), symbols: list(c.docs?.symbols), callers: list(c.callers), callees: list(c.callees), callersBasis: c.callers_basis || null, calleesBasis: c.callees_basis || null });
            if (c.freshness?.is_stale || c.freshness?.working_tree) out.freshness = 'stale';
          }
        }
        if (tool === 'get_change_risk') out.changeRisk = { summary: string(data.summary || data.directive?.headline), reviewPriority: data.review_priority || data.band || null, changedFiles: list(data.changed_files), tests: data.impacted_tests || data.tests || null, directive: data.directive || null, healthDelta: data.health_delta || null };
      } catch (e) { out.errors.push({ code: e.code || 'query_failed', tool, message: `Não foi possível obter ${tool}.` }); }
    }
  } catch (e) { out.errors.push({ code: e.code || 'connection_failed', message: 'Não foi possível consultar o índice local.' }); }
  finally { await client.close(); }
  const after = sourceRevision(root);
  const unchanged = before.hash && after.hash === before.hash;
  const indexed = out.revision.indexedCommit;
  if (out.freshness !== 'stale' && unchanged && indexed && before.commit?.startsWith(indexed) && !before.dirty && !out.errors.length) out.freshness = 'current';
  // A dirty checkout requires the provider to prove target freshness; a successful update alone is insufficient.
  if (before.dirty && out.freshness !== 'stale') out.limitations.push('Há alterações sem commit; a atualidade dos fatos deve ser conferida por alvo.');
  if (!unchanged) { if (before.hash) out.freshness = 'stale'; out.limitations.push(before.hash ? 'O código mudou durante a coleta; atualize a análise.' : 'Não foi possível identificar uma revisão completa do código.'); }
  if (out.errors.some(e => e.code === 'update_failed')) out.freshness = 'unknown';
  out.coverage.returnedTargets = out.contexts.length;
  for (const key of ['limitations','degraded']) out[key] = [...new Set(out[key].filter(Boolean))];
  out.coverage.unresolved = [...new Set(out.coverage.unresolved)];
  out.status = out.errors.length && !out.contractVersions.length ? 'error' : out.errors.length || out.limitations.length || out.degraded.length || out.coverage.truncated || out.coverage.unresolved.length || out.freshness !== 'current' ? 'partial' : 'ready';
  return out;
}

/** Atomic provider cache. A failed attempt retains dated last-usable evidence, never its current verdict. */
export async function persistRepowise(outDir, observation) {
  if (observation?.schema !== 'floorplan/observation@1' || observation.provider !== 'repowise') throw new Error('Invalid Repowise observation');
  return withProjectLock(outDir, async () => {
  const cache = path.join(outDir, '.cache'); fs.mkdirSync(cache, { recursive: true });
  if (fs.lstatSync(cache).isSymbolicLink()) throw new Error('Observation cache must remain inside the project map');
  const filename = path.join(cache, 'repowise.json');
  let previous; try { previous = JSON.parse(fs.readFileSync(filename, 'utf8')); } catch {}
  const saved = { ...observation };
  if ((['unavailable','error'].includes(saved.status) || saved.errors?.length) && previous) {
    const usable = ['ready','partial'].includes(previous.status) ? previous : previous.lastUsable;
    if (usable) { const { lastUsable, ...value } = usable; saved.lastUsable = { ...value, freshness: 'stale' }; }
  }
  const tmp = `${filename}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try { fs.writeFileSync(tmp, JSON.stringify(saved, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); fs.renameSync(tmp, filename); }
  finally { try { fs.unlinkSync(tmp); } catch {} }
  return saved;
  });
}

/** Read a dated cache for this exact checkout. Never attach another repository's evidence. */
export function readRepowise(outDir, root) {
  const filename = path.join(outDir, '.cache', 'repowise.json');
  if (!fs.existsSync(filename)) return null;
  const failed = code => ({ schema: 'floorplan/observation@1', provider: 'repowise', status: 'error', freshness: 'unknown', contexts: [], findings: [], limitations: [], errors: [{ code, message: 'O cache de análise não pode ser usado neste projeto. Execute observe.mjs novamente.' }] });
  let out;
  try { out = JSON.parse(fs.readFileSync(filename, 'utf8')); } catch { return failed('invalid_cache'); }
  if (out.schema !== 'floorplan/observation@1' || out.provider !== 'repowise' || !record(out.revision)) return failed('invalid_cache');
  root = fs.realpathSync(path.resolve(root));
  if (out.repoId !== hash(root)) return failed('foreign_repository');
  const current = sourceRevision(root);
  if (!current.hash || !out.revision.workingTreeHash) {
    if (out.freshness !== 'stale') out.freshness = 'unknown';
    out.limitations = [...list(out.limitations), 'A revisão do cache não pôde ser comparada com o código atual.'];
  } else if (out.revision.workingTreeHash !== current.hash) {
    out.freshness = 'stale';
    out.limitations = [...list(out.limitations), 'O código mudou desde esta análise. Execute observe.mjs --update para conferir.'];
  }
  if (out.status === 'ready' && out.freshness !== 'current') out.status = 'partial';
  return out;
}
