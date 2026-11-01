// User-owned screen references. Never generated over by scan, plan or refresh.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_ITEMS = 5000;
const allowed = new Map([['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp']]);
const manifestPath = (outDir) => path.join(outDir, 'visuals.json');
const text = (v, name, max = 500, required = false) => {
  if (v == null || v === '') { if (required) throw new Error(`${name} is required`); return ''; }
  if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008]/.test(v)) throw new Error(`${name} must be text (up to ${max} characters)`);
  const clean = v.trim();
  if (required && !clean) throw new Error(`${name} is required`);
  return clean;
};
export function imageType(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Image must be between 1 byte and 12 MiB');
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii', 12, 16) === 'IHDR') return { mime: 'image/png', ext: '.png' };
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mime: 'image/jpeg', ext: '.jpg' };
  if (bytes.length >= 16 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.toString('ascii', 12, 15) === 'VP8') return { mime: 'image/webp', ext: '.webp' };
  throw new Error('Image must contain PNG, JPEG or WebP bytes');
}
export function decodeImageDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 100) throw new Error('Image exceeds 12 MiB');
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m || m[2].length % 4) throw new Error('Expected a base64 PNG, JPEG or WebP image');
  const bytes = Buffer.from(m[2], 'base64');
  if (imageType(bytes).mime !== m[1]) throw new Error('Image content does not match its declared type');
  return bytes;
}
export function validateVisual(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Visual must be an object');
  const id = text(item.id, 'id', 100, true);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('id may contain only letters, numbers, underscores and hyphens');
  if (!['proposal', 'capture'].includes(item.kind)) throw new Error('kind must be proposal or capture');
  const v = { id, screen: text(item.screen, 'screen', 1000, true), kind: item.kind, title: text(item.title, 'title', 200, true), asset: text(item.asset, 'asset', 500, true) };
  for (const k of ['viewport', 'state', 'version', 'createdAt', 'sourceUrl', 'notes']) {
    const value = text(item[k], k, k === 'notes' ? 5000 : k === 'sourceUrl' ? 2000 : 200);
    if (value) v[k] = value;
  }
  if (item.approved != null && typeof item.approved !== 'boolean') throw new Error('approved must be true or false');
  if (typeof item.approved === 'boolean') v.approved = item.approved;
  if (v.createdAt && (!/^\d{4}-\d{2}-\d{2}T/.test(v.createdAt) || !Number.isFinite(Date.parse(v.createdAt)))) throw new Error('createdAt must be an ISO date and time');
  if (v.sourceUrl) {
    let u; try { u = new URL(v.sourceUrl); } catch { throw new Error('sourceUrl must be an http(s) URL'); }
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('sourceUrl must be an http(s) URL without embedded credentials');
  }
  if (v.kind === 'capture' && (!v.createdAt || !v.sourceUrl)) throw new Error('Captures require createdAt and sourceUrl');
  return v;
}
export function readVisualManifest(outDir) {
  const file = manifestPath(outDir);
  if (!fs.existsSync(file)) return { version: 1, items: [] };
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error('visuals.json must not be a symlink');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data?.version !== 1 || !Array.isArray(data.items) || data.items.length > MAX_ITEMS) throw new Error('visuals.json must have version:1 and an items array (up to 5000 records)');
  const seen = new Set();
  const items = data.items.map((item) => {
    const v = validateVisual(item);
    if (seen.has(v.id)) throw new Error(`Duplicate visual id: ${v.id}`);
    seen.add(v.id); return v;
  });
  return { version: 1, items };
}
/** Check lexical AND real paths; reject symlinks even if their destination is temporarily missing. */
export function visualAssetPath(outDir, asset, { missingOK = false } = {}) {
  if (typeof asset !== 'string' || !/^visuals\/[a-zA-Z0-9_./ -]+$/.test(asset) || asset.includes('\\') || asset.split('/').some((p) => p === '.' || p === '..' || !p) || !allowed.has(path.extname(asset).toLowerCase())) throw new Error('Asset must be a PNG/JPEG/WebP path inside floorplan/visuals/');
  const base = path.resolve(outDir), file = path.resolve(base, asset);
  if (!file.startsWith(path.join(base, 'visuals') + path.sep)) throw new Error('Asset escapes the visuals folder');
  let current = base;
  for (const part of asset.split('/')) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Visual assets must not use symlinks'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  if (!fs.existsSync(file)) { if (missingOK) return file; throw new Error(`Missing visual asset: ${asset}`); }
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > MAX_IMAGE_BYTES) throw new Error('Invalid visual asset or image exceeds 12 MiB');
  return file;
}
export function readVisualAsset(outDir, asset) {
  const file = visualAssetPath(outDir, asset);
  const bytes = fs.readFileSync(file), type = imageType(bytes);
  if (allowed.get(path.extname(file).toLowerCase()) !== type.mime) throw new Error('Image file extension does not match its content');
  return { bytes, ...type };
}
function resolveScreen(graph, ref) {
  const exact = (graph.screens || []).find((s) => s.id === ref);
  if (exact) return exact;
  const matches = (graph.screens || []).filter((s) => s.file === ref || 'f:' + s.file === ref);
  if (matches.length > 1) throw new Error(`Screen file is ambiguous; use a screen ID: ${ref}`);
  return matches[0];
}
export function buildVisuals({ graph, outDir, warn = () => {} }) {
  return readVisualManifest(outDir).items.map((v) => {
    const screen = resolveScreen(graph, v.screen);
    const file = visualAssetPath(outDir, v.asset, { missingOK: true });
    const missing = !fs.existsSync(file);
    if (!missing) readVisualAsset(outDir, v.asset);
    if (missing) warn(`Visual ${v.id}: missing image ${v.asset}`);
    if (!screen) warn(`Visual ${v.id}: screen not found (${v.screen}); reference retained`);
    return { ...v, screen: screen?.id || v.screen, ...(screen ? { file: screen.file } : { unresolved: true }), ...(missing ? { missing: true } : { src: v.asset }) };
  });
}
function atomicWrite(file, data) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, data, { flag: 'wx' }); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
/** Append, rebuild, roll back only this addition if rebuild fails. Lock also serializes CLI/server uploads. */
export function addVisual({ outDir, graph, metadata, bytes, rebuild = () => {} }) {
  const type = imageType(bytes);
  const id = crypto.randomUUID();
  const item = validateVisual({ ...metadata, id, asset: `visuals/${id}${type.ext}`, createdAt: metadata.createdAt || (metadata.kind === 'proposal' ? new Date().toISOString() : '') });
  const screen = resolveScreen(graph, item.screen);
  if (!screen) throw new Error('Screen not found; choose an existing screen from this map');
  item.screen = screen.id;
  fs.mkdirSync(outDir, { recursive: true });
  const lock = path.join(outDir, '.visuals.lock');
  let fd;
  try { fd = fs.openSync(lock, 'wx'); } catch (e) { if (e.code === 'EEXIST') throw new Error('Another image is being added. Please try again shortly.'); throw e; }
  const manifest = manifestPath(outDir);
  let old, asset, wrote = false;
  try {
    const data = readVisualManifest(outDir);
    if (data.items.length >= MAX_ITEMS) throw new Error('The visual catalog has reached 5000 records');
    old = fs.existsSync(manifest) ? fs.readFileSync(manifest) : null;
    asset = visualAssetPath(outDir, item.asset, { missingOK: true });
    fs.mkdirSync(path.dirname(asset), { recursive: true });
    fs.writeFileSync(asset, bytes, { flag: 'wx' });
    data.items.push(item);
    atomicWrite(manifest, JSON.stringify(data, null, 2) + '\n'); wrote = true;
    rebuild();
    return buildVisuals({ graph, outDir }).find((v) => v.id === id);
  } catch (error) {
    if (wrote) { if (old === null) fs.unlinkSync(manifest); else atomicWrite(manifest, old); }
    if (asset && fs.existsSync(asset)) fs.unlinkSync(asset);
    throw error;
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
export function embedVisuals(items, outDir) {
  return (items || []).map((v) => {
    if (v.missing) return { ...v, src: undefined };
    const { bytes, mime } = readVisualAsset(outDir, v.asset);
    return { ...v, src: `data:${mime};base64,${bytes.toString('base64')}` };
  });
}
