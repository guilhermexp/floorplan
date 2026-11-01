// Private, local project revisions. Authored documents stay in the ignored map folder;
// optimistic revisions and a recoverable journal protect CLI and server writers alike.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateQuestions } from './questions.mjs';
import { keepOutOfGit } from './common.mjs';
import { readVisualManifest, readVisualAsset } from './visuals.mjs';

const DOCUMENTS = ['plan.json', 'architecture.json', 'visuals.json', 'custom-flows.json', 'recent-work.json', 'health-dismissed.json'];
const OPTIONAL_DOCUMENTS = new Set(['custom-flows.json', 'recent-work.json', 'health-dismissed.json']);
const GENERATED = ['graph.json', 'index.html', 'artifact.html', 'query.mjs', 'serve.mjs', 'visuals-store.mjs', '.cache/scan.json', '.cache/planned.json', '.cache/observed.json', '.cache/skill.json', '.cache/repowise.json'];
const JOURNAL = '.project-transaction.json';
const LOCK = '.project.lock';
const plain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && !!v.trim();
const identifier = (v) => text(v) && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(v);
const relative = (v) => text(v) && !v.includes('\\') && !v.startsWith('/') && !/^[A-Za-z]:/.test(v) && v.split('/').every((p) => p && p !== '.' && p !== '..');
const iso = (v) => text(v) && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
const canonical = (v) => JSON.stringify(sortKeys(v));
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (plain(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  return value;
}

/** V1 keeps its original compiler validation; V2 adds explicit product contracts. */
export function validatePlan(plan) {
  const errors = [];
  if (!plain(plan)) return ['plan.json must be an object'];
  const schema = plan.$schema || 'floorplan/plan@1';
  if (!['floorplan/plan@1', 'floorplan/plan@2'].includes(schema)) return ['Unsupported plan.$schema'];
  if (schema === 'floorplan/plan@1') return errors;
  const allowed = new Set(['$schema', 'source', 'stack', 'assumptions', 'questions', 'files', 'endpoints', 'stage', 'objective', 'scope', 'requirements', 'decisions', 'screens']);
  const keys = (obj, names, at) => {
    if (!plain(obj)) { errors.push(`${at} must be an object`); return false; }
    for (const k of Object.keys(obj)) if (!names.includes(k)) errors.push(`${at}.${k} is not a supported field`);
    return true;
  };
  const strings = (v, at) => { if (!Array.isArray(v) || v.some((s) => !text(s))) errors.push(`${at} must be an array of non-empty strings`); };
  const optionalText = (v, at) => { if (v !== undefined && !text(v)) errors.push(`${at} must be a non-empty string`); };
  const array = (v, at) => { if (v === undefined) return []; if (!Array.isArray(v)) { errors.push(`${at} must be an array`); return []; } return v; };
  const ids = new Set();
  const entity = (o, at) => {
    if (!identifier(o.id)) errors.push(`${at}.id must be a persistent identifier`);
    else if (ids.has(o.id)) errors.push(`${at}.id is duplicated`);
    else ids.add(o.id);
    if (!text(o.title)) errors.push(`${at}.title is required`);
  };
  for (const key of Object.keys(plan)) if (!allowed.has(key)) errors.push(`plan.${key} is not a supported field`);
  if (!['concept', 'scope', 'architecture', 'implementation'].includes(plan.stage)) errors.push('plan.stage must be concept, scope, architecture or implementation');
  if (!text(plan.objective)) errors.push('plan.objective is required');
  optionalText(plan.source, 'source');
  for (const key of ['stack', 'assumptions']) if (plan[key] !== undefined) strings(plan[key], key);
  if (plan.scope !== undefined && keys(plan.scope, ['included', 'excluded'], 'scope')) {
    for (const key of ['included', 'excluded']) if (plan.scope[key] !== undefined) strings(plan.scope[key], `scope.${key}`);
  }
  const screens = array(plan.screens, 'screens'), screenRefs = new Set();
  screens.forEach((s, i) => {
    const at = `screens[${i}]`;
    if (!keys(s, ['id', 'title', 'url', 'file', 'node', 'aliases'], at)) return;
    entity(s, at);
    if (s.url !== undefined && (!text(s.url) || !s.url.startsWith('/'))) errors.push(`${at}.url must start with /`);
    if (s.file !== undefined && !relative(s.file)) errors.push(`${at}.file must be a relative path`);
    if (s.node !== undefined && !identifier(s.node)) errors.push(`${at}.node must be a node identifier`);
    const refs = [s.id, `screen:${s.id}`, ...array(s.aliases, `${at}.aliases`)];
    for (const ref of new Set(refs)) {
      if (!text(ref)) errors.push(`${at}.aliases must contain non-empty strings`);
      else if (screenRefs.has(ref)) errors.push(`${at}.aliases duplicates another screen identity`);
      else screenRefs.add(ref);
    }
  });
  array(plan.requirements, 'requirements').forEach((r, i) => {
    const at = `requirements[${i}]`;
    if (!keys(r, ['id', 'title', 'description', 'priority', 'status', 'refs', 'criteria', 'evidence'], at)) return;
    entity(r, at); optionalText(r.description, `${at}.description`); optionalText(r.priority, `${at}.priority`);
    if (r.status !== undefined && !['draft', 'proposed', 'review', 'accepted', 'superseded'].includes(r.status)) errors.push(`${at}.status is unsupported`);
    if (r.refs !== undefined) {
      strings(r.refs, `${at}.refs`);
      for (const ref of Array.isArray(r.refs) ? r.refs : []) {
        if (typeof ref !== 'string') continue;
        if (ref.startsWith('f:')) { if (!relative(ref.slice(2))) errors.push(`${at}.refs contains an unsafe file path`); }
        else if (ref.startsWith('n:')) { if (!identifier(ref.slice(2))) errors.push(`${at}.refs contains an invalid node`); }
        else if (ref.startsWith('screen:')) { if (!screenRefs.has(ref)) errors.push(`${at}.refs references an unknown screen`); }
        else errors.push(`${at}.refs must use f:, n: or screen: identifiers`);
      }
    }
    const criteria = new Set();
    if (!Array.isArray(r.criteria)) errors.push(`${at}.criteria must be an array`);
    for (const [j, c] of (Array.isArray(r.criteria) ? r.criteria : []).entries()) {
      const where = `${at}.criteria[${j}]`;
      if (!keys(c, ['id', 'text'], where)) continue;
      if (!identifier(c.id)) errors.push(`${where}.id is required`);
      else if (criteria.has(c.id)) errors.push(`${where}.id is duplicated`);
      else criteria.add(c.id);
      if (!text(c.text)) errors.push(`${where}.text is required`);
    }
    array(r.evidence, `${at}.evidence`).forEach((e, j) => {
      const where = `${at}.evidence[${j}]`;
      if (!keys(e, ['criterionId', 'criterionHash', 'result', 'method', 'at', 'revision', 'details'], where)) return;
      if (!criteria.has(e.criterionId)) errors.push(`${where}.criterionId does not identify a criterion`);
      if (typeof e.criterionHash !== 'string' || !/^[a-f0-9]{64}$/.test(e.criterionHash)) errors.push(`${where}.criterionHash must identify the criterion text that was verified`);
      if (!['pass', 'fail'].includes(e.result)) errors.push(`${where}.result must be pass or fail`);
      if (!text(e.method)) errors.push(`${where}.method is required`);
      if (!iso(e.at)) errors.push(`${where}.at must be an ISO timestamp`);
      if (!text(e.revision)) errors.push(`${where}.revision is required`);
      optionalText(e.details, `${where}.details`);
    });
  });
  array(plan.decisions, 'decisions').forEach((d, i) => {
    const at = `decisions[${i}]`;
    if (!keys(d, ['id', 'title', 'choice', 'rationale', 'alternatives', 'revisitWhen', 'status'], at)) return;
    entity(d, at);
    for (const key of ['choice', 'rationale']) if (!text(d[key])) errors.push(`${at}.${key} is required`);
    optionalText(d.revisitWhen, `${at}.revisitWhen`);
    if (d.alternatives !== undefined) strings(d.alternatives, `${at}.alternatives`);
    if (d.status !== undefined && !['draft', 'proposed', 'review', 'accepted', 'superseded'].includes(d.status)) errors.push(`${at}.status is unsupported`);
  });
  errors.push(...validateQuestions(plan.questions));
  array(plan.files, 'files').forEach((f, i) => {
    const at = `files[${i}]`;
    if (!keys(f, ['path', 'name', 'description', 'screen', 'uses', 'calls', 'services', 'data'], at)) return;
    if (!relative(f.path)) errors.push(`${at}.path must be relative`);
    for (const k of ['name', 'description', 'screen']) optionalText(f[k], `${at}.${k}`);
    for (const k of ['uses', 'calls', 'services', 'data']) if (f[k] !== undefined) strings(f[k], `${at}.${k}`);
  });
  array(plan.endpoints, 'endpoints').forEach((e, i) => {
    const at = `endpoints[${i}]`;
    if (!keys(e, ['method', 'path', 'file', 'access', 'who', 'publicBecause', 'name', 'description'], at)) return;
    for (const k of ['method', 'path', 'file']) if (!text(e[k])) errors.push(`${at}.${k} is required`);
    for (const k of ['access', 'who', 'publicBecause', 'name', 'description']) optionalText(e[k], `${at}.${k}`);
  });
  return errors;
}

function checkedPath(dir, name) {
  if (!relative(name)) throw new Error('Invalid project path');
  const base = path.resolve(dir);
  if (fs.existsSync(base) && fs.lstatSync(base).isSymbolicLink()) throw new Error('Project directory must not be a symlink');
  let current = base;
  for (const part of name.split('/')) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Project paths must not use symlinks'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return current;
}
function documentName(name) { return DOCUMENTS.includes(name) || /^descriptions\/[^/\\\u0000]+\.json$/.test(name); }
function revisionName(name) { return /^revisions\/[a-f0-9]{64}\.json$/.test(name); }
function parse(file, label) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error(`Invalid JSON in ${label}`); } }
function documentBytes(name, value) { return typeof value === 'string' && OPTIONAL_DOCUMENTS.has(name) ? value : JSON.stringify(value, null, 2) + '\n'; }
function atomic(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(tmp, bytes, { flag: 'wx' }); fs.renameSync(tmp, file); }
  finally { fs.rmSync(tmp, { force: true }); }
}
function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return true;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; }
}
function lockOwner(dir) {
  const file = checkedPath(dir, LOCK);
  if (!fs.existsSync(file)) return null;
  try { return parse(file, LOCK); } catch { return { pid: null }; }
}
function restore(dir, before) {
  for (const [name, value] of Object.entries(before)) {
    if (!documentName(name) && !GENERATED.includes(name) && !revisionName(name)) throw new Error('Invalid recovery document path');
    const file = checkedPath(dir, name);
    if (value === null) fs.rmSync(file, { force: true });
    else if (typeof value === 'string') atomic(file, Buffer.from(value, 'base64'));
    else throw new Error('Invalid recovery document');
  }
}
function recover(dir) {
  const journal = checkedPath(dir, JOURNAL);
  if (!fs.existsSync(journal)) return;
  const owner = lockOwner(dir);
  if (owner && alive(owner.pid)) throw new Error('Project publication in progress (lock)');
  const data = parse(journal, JOURNAL);
  if (data.version !== 1 || !plain(data.before)) throw new Error('Invalid project recovery journal');
  restore(dir, data.before);
  fs.unlinkSync(journal);
  if (owner) fs.unlinkSync(checkedPath(dir, LOCK));
}
function readState(dir) {
  const documents = {};
  const names = [...DOCUMENTS], descriptions = checkedPath(dir, 'descriptions');
  if (fs.existsSync(descriptions)) for (const name of fs.readdirSync(descriptions).sort()) {
    if (name.endsWith('.json')) {
      if (!documentName(`descriptions/${name}`)) throw new Error('Invalid description filename');
      names.push(`descriptions/${name}`);
    }
  }
  for (const name of names.sort()) {
    const file = checkedPath(dir, name);
    if (fs.existsSync(file)) {
      try { documents[name] = parse(file, name); }
      catch (e) { if (!OPTIONAL_DOCUMENTS.has(name)) throw e; documents[name] = fs.readFileSync(file, 'utf8'); }
    }
  }
  return { revision: hash(canonical(documents)), documents, plan: documents['plan.json'] || null, architecture: documents['architecture.json'] || null };
}
/** Read authored state. A crashed publication is rolled back before any reader sees it. */
export function readProject(outDir) { recover(outDir); return readState(outDir); }

/** This lock also guards baselines, and checks the existing visual writer's lock. */
export async function withProjectLock(outDir, action, { allowVisualWriter = false } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  checkedPath(outDir, '.gitignore'); keepOutOfGit(outDir);
  recover(outDir);
  const file = checkedPath(outDir, LOCK), existing = lockOwner(outDir);
  if (existing && !alive(existing.pid)) fs.unlinkSync(file);
  let fd;
  try { fd = fs.openSync(file, 'wx'); }
  catch (e) { if (e.code === 'EEXIST') throw new Error('Project lock ocupado; outra alteração está em andamento'); throw e; }
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    if (!allowVisualWriter && fs.existsSync(checkedPath(outDir, '.visuals.lock'))) throw new Error('Visual lock ocupado; uma imagem está sendo adicionada');
    return await action();
  } finally { fs.closeSync(fd); fs.unlinkSync(file); }
}

/** Apply a bounded document update, optionally rebuilding in an isolated staging directory. */
export async function applyProjectChange(outDir, { expectedRevision, documents } = {}, validateCallback) {
  if (!text(expectedRevision)) throw new Error('expectedRevision is required');
  if (!plain(documents) || !Object.keys(documents).length) throw new Error('documents must contain authored project documents');
  for (const [name, value] of Object.entries(documents)) {
    if (!documentName(name) || !relative(name)) throw new Error('Unsupported project document path');
    if (value !== null && !plain(value)) throw new Error(`${name} must be an object or null`);
  }
  return withProjectLock(outDir, async () => {
    const previous = readState(outDir);
    if (previous.revision !== expectedRevision) throw new Error('Project revision conflict; reload before applying');
    const merged = { ...previous.documents, ...documents };
    for (const name of Object.keys(merged)) if (merged[name] === null) delete merged[name];
    const errors = merged['plan.json'] ? validatePlan(merged['plan.json']) : [];
    if (errors.length) throw new Error(errors.join('\n'));
    const staging = checkedPath(outDir, `.cache/project-stage-${crypto.randomUUID()}`);
    fs.mkdirSync(staging, { recursive: true });
    try {
      for (const [name, doc] of Object.entries(merged)) atomic(checkedPath(staging, name), documentBytes(name, doc));
      // Existing scan input is useful to validators. Generated outputs are published only
      // when the callback creates or changes them; old derived files are otherwise retained.
      const cacheInputs = new Map();
      for (const name of GENERATED.filter((name) => name.startsWith('.cache/'))) {
        const file = checkedPath(outDir, name);
        const bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
        cacheInputs.set(name, bytes);
        if (bytes) atomic(checkedPath(staging, name), bytes);
      }
      const candidate = readState(staging);
      if (validateCallback) await validateCallback(staging, candidate);
      if (readState(outDir).revision !== expectedRevision) throw new Error('Project revision conflict during validation');
      if (readState(staging).revision !== candidate.revision) throw new Error('Validator changed authored documents; submit them as a new proposal');
      for (const [name, bytes] of cacheInputs) {
        const file = checkedPath(outDir, name), current = fs.existsSync(file) ? fs.readFileSync(file) : null;
        if (current === null ? bytes !== null : bytes === null || !current.equals(bytes)) throw new Error('Observation revision conflict during validation; rebuild with current facts');
      }
      const publication = new Map(Object.keys(documents).map((name) => [name, merged[name] ? Buffer.from(JSON.stringify(merged[name], null, 2) + '\n') : null]));
      if (validateCallback) for (const name of GENERATED) {
        const file = checkedPath(staging, name);
        if (fs.existsSync(file)) {
          const bytes = fs.readFileSync(file);
          if (!cacheInputs.get(name)?.equals(bytes)) publication.set(name, bytes);
        }
      }
      // Both the previous and accepted state survive cache cleanup. A content-identical
      // revision is reused rather than manufacturing another version of the same scope.
      for (const state of [previous, candidate]) {
        const name = `revisions/${state.revision}.json`;
        if (fs.existsSync(checkedPath(outDir, name))) { readRevision(outDir, state.revision); continue; }
        publication.set(name, Buffer.from(JSON.stringify({ schema: 'floorplan/revision@1', revision: state.revision, createdAt: new Date().toISOString(), documents: state.documents,
          ...(state.revision !== previous.revision ? { previousRevision: previous.revision } : {}) })));
      }
      const before = Object.fromEntries([...publication.keys()].map((name) => {
        const file = checkedPath(outDir, name);
        return [name, fs.existsSync(file) ? fs.readFileSync(file).toString('base64') : null];
      }));
      const journal = checkedPath(outDir, JOURNAL);
      atomic(journal, JSON.stringify({ version: 1, before }));
      try {
        for (const [name, bytes] of publication) {
          const file = checkedPath(outDir, name);
          if (bytes === null) fs.rmSync(file, { force: true }); else atomic(file, bytes);
        }
        fs.unlinkSync(journal);
      } catch (error) { restore(outDir, before); fs.rmSync(journal, { force: true }); throw error; }
      return readState(outDir);
    } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  });
}

function baselineId(id) { if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)) throw new Error('Invalid baseline id'); return id; }
function acceptanceErrors(a) {
  if (!plain(a) || !text(a.actor) || !iso(a.at) || !text(a.evidence)) return ['acceptance requires actor, ISO at and evidence'];
  if (Object.keys(a).some((k) => !['actor', 'at', 'evidence'].includes(k))) return ['Unsupported acceptance field'];
  return [];
}
export async function snapshotBaseline(outDir, { id, title, expectedRevision, acceptance } = {}, prepareCallback) {
  baselineId(id);
  if (!text(title)) throw new Error('Baseline title is required');
  if (!text(expectedRevision)) throw new Error('expectedRevision is required');
  if (acceptance !== undefined) { const errors = acceptanceErrors(acceptance); if (errors.length) throw new Error(errors.join('\n')); }
  return withProjectLock(outDir, async () => {
    const current = readState(outDir);
    if (current.revision !== expectedRevision) throw new Error('Project revision conflict; reload before creating baseline');
    if (prepareCallback) {
      await prepareCallback(outDir, current);
      if (readState(outDir).revision !== expectedRevision) throw new Error('Project revision conflict during baseline preparation');
    }
    const destination = checkedPath(outDir, `baselines/${id}`);
    if (fs.existsSync(destination)) throw new Error('Baseline already exists and is immutable');
    const staging = checkedPath(outDir, `baselines/.pending-${crypto.randomUUID()}`);
    fs.mkdirSync(staging, { recursive: true });
    try {
      const assets = [];
      for (const visual of readVisualManifest(outDir).items) {
        if (assets.some((a) => a.source === visual.asset)) continue;
        const { bytes, mime, ext } = readVisualAsset(outDir, visual.asset);
        const sha256 = hash(bytes), name = `assets/${sha256}${ext}`;
        atomic(checkedPath(staging, name), bytes);
        assets.push({ source: visual.asset, path: name, sha256, mime });
      }
      const graphFile = checkedPath(outDir, 'graph.json');
      const graph = fs.existsSync(graphFile) ? parse(graphFile, 'graph.json') : null;
      if (graph?.lifecycle?.revision && graph.lifecycle.revision !== current.revision) throw new Error('Rebuild graph before creating a baseline for this revision');
      const data = { schema: 'floorplan/baseline@1', id, title: title.trim(), revision: current.revision, createdAt: new Date().toISOString(), documents: current.documents, assets,
        ...(graph ? { graph } : {}), ...(acceptance ? { acceptance } : {}) };
      data.integrity = hash(canonical(data));
      if (readState(outDir).revision !== expectedRevision) throw new Error('Project revision conflict while snapshotting');
      atomic(checkedPath(staging, 'baseline.json'), JSON.stringify(data));
      fs.renameSync(staging, destination);
      return { ...data, directory: destination };
    } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  });
}
export function readBaseline(outDir, id) {
  const result = baselineManifest(outDir, id);
  for (const asset of result.assets) {
    const file = checkedPath(result.directory, asset.path);
    if (!fs.existsSync(file) || hash(fs.readFileSync(file)) !== asset.sha256) throw new Error('Baseline asset is missing or changed');
  }
  return result;
}
function baselineManifest(outDir, id) {
  const directory = checkedPath(outDir, `baselines/${baselineId(id)}`);
  const data = parse(checkedPath(directory, 'baseline.json'), 'baseline.json');
  if (data.schema !== 'floorplan/baseline@1' || data.id !== id || !plain(data.documents) || !Array.isArray(data.assets)) throw new Error('Invalid baseline');
  const { integrity, ...content } = data;
  if (integrity !== hash(canonical(content))) throw new Error('Baseline integrity changed');
  for (const asset of data.assets) {
    if (!/^assets\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(asset.path || '')) throw new Error('Invalid baseline asset path');
  }
  return { ...data, directory };
}
export function listBaselines(outDir) {
  const dir = checkedPath(outDir, 'baselines');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((id) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)).map((id) => {
    const { title, revision, createdAt, acceptance } = baselineManifest(outDir, id);
    return { id, title, revision, createdAt, ...(acceptance ? { acceptance } : {}) };
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function readRevision(outDir, revision) {
  if (typeof revision !== 'string' || !/^[a-f0-9]{64}$/.test(revision)) throw new Error('Invalid revision');
  const data = parse(checkedPath(outDir, `revisions/${revision}.json`), 'revision snapshot');
  if (data.schema !== 'floorplan/revision@1' || data.revision !== revision || !plain(data.documents) || hash(canonical(data.documents)) !== revision) throw new Error('Revision snapshot integrity changed');
  return data;
}
export function listRevisions(outDir) {
  const dir = checkedPath(outDir, 'revisions');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => /^[a-f0-9]{64}\.json$/.test(name)).map((name) => {
    const { revision, createdAt, previousRevision } = readRevision(outDir, name.slice(0, -5));
    return { revision, createdAt, ...(previousRevision ? { previousRevision } : {}) };
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.revision.localeCompare(b.revision));
}
