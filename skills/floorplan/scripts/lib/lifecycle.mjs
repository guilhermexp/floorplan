// Projection only: intention and observations remain separate on disk.
export function mergeProjectScans(planned, observed) {
  if (!planned) return observed;
  if (!observed) return { ...planned, files: planned.files.map(f => ({ ...f, implementation: 'planned' })) };
  const merge = (a = [], b = [], key = JSON.stringify) => [...new Map([...a, ...b].map(x => [key(x), x])).values()];
  const byPath = new Map(planned.files.map(f => [f.path, { ...f, implementation: 'planned' }]));
  for (const f of observed.files) byPath.set(f.path, { ...byPath.get(f.path), ...f, implementation: 'observed' });
  const combined = { ...observed, files: [...byPath.values()], nodeLinks: planned.nodeLinks || [] };
  for (const field of ['edges', 'extEdges', 'http', 'hosts']) combined[field] = merge(planned[field], observed[field]);
  combined.routes = merge(planned.routes, observed.routes, r => `${r.file}\0${r.method}\0${r.path}`);
  combined.externals = merge(planned.externals, observed.externals, e => e.id);
  return combined;
}

// Explicit identities win; old URL-derived IDs remain aliases for existing visual manifests.
export function stableScreens(plan, detected, graph) {
  const result = [...detected], used = new Set();
  for (const screen of plan?.screens || []) {
    let matches = result.filter(s => !used.has(s) && (s.id === screen.id || screen.aliases?.includes(s.id)));
    if (!matches.length && screen.file) matches = result.filter(s => !used.has(s) && s.file === screen.file && (!screen.url || s.url === screen.url));
    if (matches.length > 1) throw new Error(`Tela ambígua: ${screen.id}. Informe arquivo e URL.`);
    const current = matches[0];
    const value = {
      ...(current || {}), id: screen.id, name: screen.title,
      url: screen.url || current?.url || '', file: screen.file || current?.file || null,
      app: screen.node || current?.app || graph.nodes[0]?.id || '', fw: current?.fw || 'plan',
      description: current?.description || '',
      aliases: [...new Set([...(screen.aliases || []), ...(current && current.id !== screen.id ? [current.id] : [])])],
      behind: current?.behind || (screen.node ? [{ id: 'n:' + screen.node, kind: 'screen', note: 'Tela planejada' }] : []),
    };
    if (current) { result[result.indexOf(current)] = value; used.add(value); }
    else { result.push(value); used.add(value); }
  }
  return result;
}
