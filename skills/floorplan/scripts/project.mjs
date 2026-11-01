#!/usr/bin/env node
// Private project operations. All generated data remains in the project's ignored floorplan/ folder.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, mapDir } from './lib/common.mjs';
import { projectStatus, applyDocuments, createBaseline, validateProject, migrateProject } from './lib/project-commands.mjs';

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args._[0] || '.');
const command = args._[1] || 'status';
try {
  let result;
  if (command === 'status') result = projectStatus(root);
  else if (command === 'migrate') result = await migrateProject(root, { expectedRevision: args.revision });
  else if (command === 'validate') { result = validateProject(root); if (!result.valid) process.exitCode = 1; }
  else if (command === 'apply') {
    if (typeof args.input !== 'string') throw new Error('Informe --input com {documents:{...}} e --revision.');
    const input = JSON.parse(fs.readFileSync(path.resolve(args.input), 'utf8'));
    result = await applyDocuments(root, { documents: input.documents, expectedRevision: args.revision });
    result = { revision: result.revision, ok: true };
  } else if (command === 'baseline') result = await createBaseline(root, { id: args.id, title: args.title, expectedRevision: args.revision });
  else if (command === 'export') {
    if (typeof args.output !== 'string' || typeof args.baseline !== 'string') throw new Error('Informe --baseline e --output.');
    const { exportClient } = await import('./lib/client-export.mjs');
    const output = exportClient(mapDir(root), args.baseline);
    const destination = path.resolve(args.output);
    fs.writeFileSync(destination, output.html);
    result = { file: destination, baseline: args.baseline };
  } else throw new Error('Comandos: status | validate | migrate | apply | baseline | export');
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.error(JSON.stringify({ error: e.message })); process.exitCode = 1; }
