// The CLI and local server use the same validated publication path.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mapDir } from './common.mjs';
import { readProject, applyProjectChange, snapshotBaseline, listBaselines, validatePlan } from './project.mjs';
import { planToScan } from './blueprint.mjs';
import { assessProject } from './assessment.mjs';
import { readRepowise } from './repowise.mjs';
import { freshObservedScan } from './native-observation.mjs';

const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;

export function projectStatus(root) {
  const dir = mapDir(root), state = readProject(dir);
  const observedScan = freshObservedScan(root, json(path.join(dir, '.cache/observed.json')));
  const graph = json(path.join(dir, 'graph.json'));
  const observation = readRepowise(dir, root);
  return { revision: state.revision, plan: state.plan, assessment: assessProject({ plan: state.plan, observedScan, graph, observation }), baselines: listBaselines(dir), observation };
}

export function compileProject(root, dir = mapDir(root), { historyDir = dir, requireAssigned = false } = {}) {
  const plan = json(path.join(dir, 'plan.json'));
  const observed = json(path.join(dir, '.cache/observed.json'));
  const previous = json(path.join(dir, '.cache/scan.json'));
  const result = plan ? planToScan(plan, root) : null;
  if (result?.errors.length) throw new Error(result.errors.join('\n'));
  const scan = observed || result?.scan || previous;
  if (!scan) throw new Error('Crie o plano ou execute scan.mjs antes de compilar.');
  fs.mkdirSync(path.join(dir, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cache/scan.json'), JSON.stringify(scan));
  if (result) fs.writeFileSync(path.join(dir, '.cache/planned.json'), JSON.stringify(result.scan));
  const lockFile = path.join(dir, '.project.lock');
  const ownsLock = fs.existsSync(lockFile) && json(lockFile)?.pid === process.pid;
  try {
    execFileSync(process.execPath, [path.join(scripts, 'build.mjs'), root, '--out', dir, '--history-dir', historyDir, '--no-claude-md', ...(ownsLock ? ['--lock-owner', String(process.pid)] : [])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
  } catch (e) { throw new Error(String(e.stdout || '') + String(e.stderr || '') || e.message); }
  const graph = json(path.join(dir, 'graph.json'));
  if (requireAssigned && graph.meta.counts.unassigned) throw new Error(`${graph.meta.counts.unassigned} planned file(s) fall under no node's paths in architecture.json (add or widen globs)`);
  return graph;
}

export async function applyDocuments(root, { expectedRevision, documents, requireAssigned = false }) {
  const dir = mapDir(root);
  const state = readProject(dir);
  if (state.revision !== expectedRevision) throw new Error('Project revision conflict: atualize o planejamento antes de aplicar.');
  documents = preserveScreenIdentities(dir, state, documents);
  return applyProjectChange(dir, { expectedRevision, documents }, async staging => {
    // Copy only validated visual files. Never follow a project symlink into another folder.
    const { readVisualManifest, visualAssetPath } = await import('./visuals.mjs');
    for (const item of readVisualManifest(staging).items) {
      const source = visualAssetPath(dir, item.asset);
      const destination = path.join(staging, item.asset);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination, fs.constants.COPYFILE_FICLONE);
    }
    compileProject(root, staging, { historyDir: dir, requireAssigned });
  });
}

// Identity changes belong to the authored transaction, not to a disposable graph.
// Previous aliases survive a proposal that omits them, and legacy visual references
// are converted only when there is exactly one intended screen.
function preserveScreenIdentities(dir, state, documents) {
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) return documents;
  const submitted = Object.hasOwn(documents, 'plan.json') ? documents['plan.json'] : state.plan;
  if (submitted?.$schema !== 'floorplan/plan@2' || !Array.isArray(submitted.screens)) return documents;
  const plan = structuredClone(submitted);
  const previous = Array.isArray(state.plan?.screens) ? state.plan.screens : [];
  let graph; try { graph = json(path.join(dir, 'graph.json')); } catch { graph = null; }
  const detected = Array.isArray(graph?.screens) ? graph.screens : [];
  const aliasesOf = (screen) => Array.isArray(screen?.aliases) ? screen.aliases : [];
  const fileCounts = new Map();
  for (const screen of plan.screens) if (screen?.file) fileCounts.set(screen.file, (fileCounts.get(screen.file) || 0) + 1);
  plan.screens = plan.screens.map((screen) => {
    if (!screen || typeof screen !== 'object' || !screen.id) return screen; // schema validation owns the diagnostic
    const old = previous.find((s) => s.id === screen.id);
    let matches = detected.filter((s) => s.id === screen.id || aliasesOf(screen).includes(s.id) || aliasesOf(old).includes(s.id));
    if (!matches.length && screen.file) {
      matches = detected.filter((s) => s.file === screen.file);
      if (matches.length > 1 && screen.url) matches = matches.filter((s) => s.url === screen.url);
    }
    if (matches.length > 1) throw new Error(`Tela ambígua: ${screen.id}. Informe aliases ou arquivo e URL inequívocos.`);
    const matched = matches[0];
    const fileAliases = screen.file && fileCounts.get(screen.file) === 1 ? [screen.file, `f:${screen.file}`] : [];
    const aliases = [...new Set([...aliasesOf(old), ...aliasesOf(screen), ...(matched ? [matched.id, ...aliasesOf(matched)] : []), ...fileAliases])].filter((ref) => ref !== screen.id);
    return { ...screen, aliases };
  });
  const destinations = new Map();
  for (const screen of plan.screens) if (screen?.id) for (const alias of [screen.id, ...aliasesOf(screen)]) {
    if (!destinations.has(alias)) destinations.set(alias, new Set());
    destinations.get(alias).add(screen.id);
  }
  // Requirements added before stable identities retain their content and refer to the
  // same screen as its visuals. Explicit file/module references keep their meaning.
  if (Array.isArray(plan.requirements)) plan.requirements = plan.requirements.map((requirement) => {
    if (!Array.isArray(requirement?.refs)) return requirement;
    return { ...requirement, refs: requirement.refs.map((ref) => {
      const matches = typeof ref === 'string' && ref.startsWith('screen:') ? destinations.get(ref) : null;
      return matches?.size === 1 ? [...matches][0] : ref;
    }) };
  });
  const output = { ...documents };
  if (JSON.stringify(plan) !== JSON.stringify(submitted) || Object.hasOwn(documents, 'plan.json')) output['plan.json'] = plan;
  const manifest = Object.hasOwn(documents, 'visuals.json') ? documents['visuals.json'] : state.documents['visuals.json'];
  if (manifest && Array.isArray(manifest.items)) {
    const items = manifest.items.map((item) => {
      const matches = destinations.get(item?.screen);
      return matches?.size === 1 ? { ...item, screen: [...matches][0] } : item;
    });
    if (JSON.stringify(items) !== JSON.stringify(manifest.items)) output['visuals.json'] = { ...manifest, items };
  }
  return output;
}

/** Explicit, reversible migration: no invented requirements, approval or evidence. */
export async function migrateProject(root, { expectedRevision } = {}) {
  const dir = mapDir(root), state = readProject(dir);
  if (state.revision !== expectedRevision) throw new Error('Project revision conflict: atualize antes de migrar.');
  if (!state.plan) throw new Error('Não há plan.json para migrar.');
  if (state.plan.$schema === 'floorplan/plan@2') return { revision: state.revision, migrated: false, screens: state.plan.screens?.length || 0 };
  if (state.plan.$schema && state.plan.$schema !== 'floorplan/plan@1') throw new Error('Unsupported plan.$schema for migration');
  const arch = state.architecture;
  const objective = state.plan.objective || arch?.project?.summary || arch?.project?.description || `Planejamento de ${arch?.project?.name || 'projeto'}`;
  const plan = { ...state.plan, $schema: 'floorplan/plan@2', stage: state.plan.stage || (state.plan.files?.length ? 'architecture' : 'concept'), objective,
    requirements: state.plan.requirements || [], decisions: state.plan.decisions || [], screens: state.plan.screens || [] };
  // Legacy screen references acquire aliases below. Defer only that relationship
  // check; the actual requirements are untouched and fully validated on application.
  const preflight = { ...plan, requirements: Array.isArray(plan.requirements) ? plan.requirements.map((r) => (
    r && typeof r === 'object' && Array.isArray(r.refs)
      ? { ...r, refs: r.refs.filter((ref) => !(typeof ref === 'string' && ref.startsWith('screen:'))) }
      : r
  )) : plan.requirements };
  const errors = validatePlan(preflight);
  if (errors.length) throw new Error(errors.join('\n'));
  let graph = json(path.join(dir, 'graph.json'));
  if (!graph || graph.lifecycle?.revision && graph.lifecycle.revision !== state.revision) graph = compileProject(root);
  if (!state.plan.screens?.length) {
    const fileCounts = new Map();
    for (const s of graph.screens || []) if (s.file) fileCounts.set(s.file, (fileCounts.get(s.file) || 0) + 1);
    plan.screens = (graph.screens || []).map((screen) => ({
      id: `screen:${crypto.randomUUID()}`, title: screen.name || screen.url || 'Tela planejada',
      ...(screen.url ? { url: screen.url } : {}), ...(screen.file ? { file: screen.file } : {}), ...(screen.app ? { node: screen.app } : {}),
      aliases: [...new Set([screen.id, ...(screen.aliases || []), ...(screen.file && fileCounts.get(screen.file) === 1 ? [screen.file, `f:${screen.file}`] : [])])],
    }));
  }
  const result = await applyDocuments(root, { expectedRevision, documents: { 'plan.json': plan } });
  return { revision: result.revision, migrated: true, screens: result.plan.screens?.length || 0 };
}

export async function createBaseline(root, options) {
  const dir = mapDir(root), current = readProject(dir);
  if (current.revision !== options.expectedRevision) throw new Error('Project revision conflict: atualize o planejamento antes de salvar a versão.');
  // Rebuild before taking the snapshot so the artifact and documents describe the same revision.
  const baseline = await snapshotBaseline(dir, options, () => compileProject(root));
  compileProject(root);
  return { id: baseline.id, title: baseline.title, revision: baseline.revision, createdAt: baseline.createdAt, acceptance: baseline.acceptance || null };
}

export function validateProject(root) {
  const dir = mapDir(root), state = readProject(dir);
  const errors = state.plan ? validatePlan(state.plan) : ['O projeto ainda não tem plan.json.'];
  if (state.plan) errors.push(...planToScan(state.plan, root).errors.filter(e => !errors.includes(e)));
  if (!state.architecture?.project?.name || !Array.isArray(state.architecture?.nodes)) errors.push('architecture.json precisa de project.name e nodes.');
  if (!errors.length) {
    fs.mkdirSync(path.join(dir, '.cache'), { recursive: true });
    const staging = fs.mkdtempSync(path.join(dir, '.cache/validate-'));
    try {
      for (const [name, value] of Object.entries(state.documents)) {
        const destination = path.join(staging, name);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, typeof value === 'string' ? value : JSON.stringify(value));
      }
      fs.mkdirSync(path.join(staging, '.cache'), { recursive: true });
      for (const name of ['scan.json', 'observed.json', 'repowise.json']) {
        const source = path.join(dir, '.cache', name);
        if (fs.existsSync(source)) fs.copyFileSync(source, path.join(staging, '.cache', name));
      }
      compileProject(root, staging, { historyDir: dir });
      if (readProject(dir).revision !== state.revision) errors.push('O planejamento mudou durante a validação. Valide novamente.');
    } catch (e) { errors.push(e.message); }
    finally { fs.rmSync(staging, { recursive: true, force: true }); }
  }
  return { valid: errors.length === 0, errors, revision: state.revision };
}
