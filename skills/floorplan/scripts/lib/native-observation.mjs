// A bounded, local fingerprint of the scanner's source inputs. No Git HEAD is required.
// Hashes never contain source text; private map/provider folders and assets are excluded.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { classify, discover, HARD_IGNORE_DIRS, WALK_IGNORE_DIRS, MAP_DIR, LEGACY_MAP_DIR, isMapDir, toPosix } from './common.mjs';

const SOURCE = new Set(['code', 'config', 'docs', 'data']);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const DEFAULTS = { maxBytes: 64 * 1024 * 1024, maxFileBytes: 4 * 1024 * 1024, maxFiles: 20000, maxEntries: 50000, timeoutMs: 5000 };

/** Exact content + inventory + checkout identity. Any limit/error makes hash unusable. */
export function captureSourceRevision(root, options = {}) {
  const limits = { ...DEFAULTS, ...options }, errors = [], rows = [], seen = new Set();
  const started = Date.now(); let bytes = 0, entriesSeen = 0, stopped = false, realRoot;
  const error = (reason, file) => { if (errors.length < 32) errors.push({ reason, ...(file ? { file } : {}) }); };
  const available = () => {
    if (stopped) return false;
    if (Date.now() - started > limits.timeoutMs) { error('source fingerprint timed out'); stopped = true; return false; }
    if (entriesSeen > limits.maxEntries) { error('source inventory limit exceeded'); stopped = true; return false; }
    return true;
  };
  try { realRoot = fs.realpathSync(root); } catch { return { hash: null, complete: false, errors: [{ reason: 'source root is unavailable' }] }; }
  const rootId = digest(realRoot);
  const ignored = relative => {
    const parts = relative.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      if (HARD_IGNORE_DIRS.has(parts[i]) || parts[i] === '.repowise') return true;
      if ([MAP_DIR, LEGACY_MAP_DIR].includes(parts[i]) && isMapDir(path.join(realRoot, ...parts.slice(0, i + 1)))) return true;
    }
    return false;
  };
  const add = relative => {
    if (!available() || seen.has(relative) || ignored(relative)) return;
    seen.add(relative); entriesSeen++;
    if (relative.startsWith('/') || relative.split('/').some(p => p === '..')) { error('invalid source path'); return; }
    const file = path.join(realRoot, relative);
    let stat;
    try { stat = fs.lstatSync(file); } catch (e) { if (e.code !== 'ENOENT') error('source metadata unavailable', relative); return; }
    if (stat.isSymbolicLink()) { error('symbolic source is not observed', relative); return; }
    if (!stat.isFile() || !SOURCE.has(classify(relative, stat.size).category)) return;
    // Refuse parent symlinks too, including tracked paths returned by Git.
    try {
      const resolved = fs.realpathSync(file);
      if (resolved !== file) { error('symbolic source is not observed', relative); return; }
    } catch { error('source unavailable', relative); return; }
    if (rows.length >= limits.maxFiles || stat.size > limits.maxFileBytes || bytes + stat.size > limits.maxBytes) { error('source content limit exceeded', relative); stopped = true; return; }
    try {
      // Read no more than the remaining budget even if the file grows after stat.
      const cap = Math.min(limits.maxFileBytes, limits.maxBytes - bytes) + 1;
      const fd = fs.openSync(file, 'r');
      let content;
      try {
        const chunks = []; let total = 0;
        while (total < cap) {
          const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, cap - total));
          const count = fs.readSync(fd, chunk, 0, chunk.length, null);
          if (!count) break;
          chunks.push(chunk.subarray(0, count)); total += count;
        }
        content = Buffer.concat(chunks, total);
      } finally { fs.closeSync(fd); }
      bytes += content.length;
      if (bytes > limits.maxBytes || content.length > limits.maxFileBytes) { error('source content limit exceeded', relative); stopped = true; return; }
      // Scanner treats NUL-containing content as a binary asset, not source.
      if (content.includes(0)) return;
      rows.push([relative, digest(content)]);
    } catch { error('source content unavailable', relative); }
  };
  // Reuse scanner discovery for its worktree policy. The bounded walk below also
  // detects its silent depth/read/loose-file limits instead of claiming completeness.
  let discovered;
  try { discovered = discover(realRoot, { includeWorktrees: !!options.includeWorktrees }); }
  catch { error('source discovery failed'); return { rootId, hash: null, complete: false, errors }; }
  const repositories = new Set(discovered.repos.map(repo => repo.abs));
  const walk = (dir, depth) => {
    if (!available()) return;
    const relative = toPosix(path.relative(realRoot, dir));
    if (dir !== realRoot && ignored(relative + '/placeholder')) return;
    if (fs.existsSync(path.join(dir, '.git'))) {
      if (!repositories.has(dir)) return; // duplicate worktree excluded by the scanner
      try {
        const output = execFileSync('git', ['-C', dir, 'ls-files', '-co', '--exclude-standard', '-z'], {
          encoding: 'utf8', timeout: Math.max(1, limits.timeoutMs - (Date.now() - started)), maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
        });
        for (const name of output.split('\0').filter(Boolean)) { if (!available()) break; add(toPosix(path.join(relative, name))); }
      } catch { error('Git source inventory unavailable or limited', relative || '.'); }
      return;
    }
    if (depth > 8) { error('source discovery depth limit exceeded', relative); return; }
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { error('source directory unavailable', relative || '.'); return; }
    entriesSeen += entries.length;
    if (!available()) return;
    if (entries.filter(e => e.isFile()).length > 500) { error('source directory exceeds scanner loose-file limit', relative || '.'); return; }
    for (const entry of entries) {
      if (!available()) break;
      const next = path.join(dir, entry.name), rel = toPosix(path.relative(realRoot, next));
      if (entry.isSymbolicLink()) { if (!ignored(rel)) error('symbolic source is not observed', rel); continue; }
      if (entry.isDirectory()) {
        if (WALK_IGNORE_DIRS.has(entry.name) || (entry.name.startsWith('.') && entry.name !== '.github')) continue;
        walk(next, depth + 1);
      } else if (entry.isFile()) add(rel);
    }
  };
  walk(realRoot, 0);
  if (discovered.loose.length >= 5000) error('scanner loose-file limit reached');
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  return { rootId, hash: errors.length ? null : digest(JSON.stringify([rootId, rows])), complete: !errors.length, ...(errors.length ? { errors } : {}) };
}

/** Read-only comparison: old/incomplete scans stay unknown, never silently fresh. */
export function freshObservedScan(root, scan) {
  if (!scan || scan.blueprint) return scan;
  const before = scan.sourceRevision;
  const now = before?.complete && before?.hash ? captureSourceRevision(root, { includeWorktrees: !!scan.includeWorktrees }) : null;
  const freshness = !before?.complete || !before?.hash || !now?.complete ? 'unknown'
    : before.rootId !== now.rootId || before.hash !== now.hash ? 'stale'
    : scan.freshness === 'stale' || scan.freshness === 'unknown' ? scan.freshness : 'current';
  return { ...scan, freshness, ...(freshness !== 'current' ? { coverage: { ...scan.coverage, complete: false }, freshnessErrors: now?.errors || before?.errors || [{ reason: freshness === 'stale' ? 'source changed after the scan' : 'scan has no comparable source fingerprint' }] } : {}) };
}
