#!/usr/bin/env node
// Add a proposal or a real capture; source images are copied, never modified.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { addVisual, MAX_IMAGE_BYTES } from './lib/visuals.mjs';
const args = process.argv.slice(2), root = path.resolve(args.shift() || '.');
const command = args.shift();
const opt = (name) => { const i = args.indexOf('--' + name); return i < 0 ? undefined : args[i + 1]; };
try {
  if (command !== 'add' || !opt('image')) throw new Error('Usage: node visuals.mjs ROOT add --screen FILE_OR_ID --kind proposal|capture --image PATH --title TITLE [--viewport mobile] [--state default] [--version v1] [--approved] [--created-at ISO] [--source-url URL] [--notes TEXT]');
  const image = path.resolve(opt('image'));
  if (!fs.statSync(image).isFile() || fs.statSync(image).size > MAX_IMAGE_BYTES) throw new Error('Image must be a file of at most 12 MiB');
  const outDir = path.join(root, 'floorplan');
  const graph = JSON.parse(fs.readFileSync(path.join(outDir, 'graph.json'), 'utf8'));
  const metadata = Object.fromEntries(['screen','kind','title','viewport','state','version','notes'].map((k) => [k,opt(k)]));
  metadata.createdAt = opt('created-at'); metadata.sourceUrl = opt('source-url');
  if (args.includes('--approved')) metadata.approved = true;
  const v = addVisual({ outDir, graph, metadata, bytes: fs.readFileSync(image), rebuild() {
    execFileSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'build.mjs'), root], { stdio: 'pipe' });
  } });
  console.log(JSON.stringify({ ok: true, visual: v }, null, 2));
} catch (e) { console.error(`Could not add visual: ${e.message}`); process.exitCode = 1; }
