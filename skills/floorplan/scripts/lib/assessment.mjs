// Compare declared requirements with dated observations. Presence is not verification.
import crypto from 'node:crypto';

export function criterionRevision(criterion) {
  return crypto.createHash('sha256').update(JSON.stringify([criterion?.id || '', criterion?.text || ''])).digest('hex');
}

/** Stable across scans of unchanged content; a body change invalidates old evidence. */
export function observationRevision(scan) {
  if (!scan || scan.blueprint) return null;
  const sorted = (rows) => rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const facts = {
    files: sorted((scan.files || []).map((f) => [f.path, f.h || null, !!f.tooLarge])),
    routes: sorted((scan.routes || []).map((r) => [r.file, r.method, r.path])),
    repos: sorted((scan.repos || []).map((r) => [r.path, r.head || null])),
  };
  return crypto.createHash('sha256').update(JSON.stringify(facts)).digest('hex');
}

export function assessProject({ plan, observedScan, graph, observation } = {}) {
  const observedRevision = observationRevision(observedScan);
  const coverage = observation?.coverage || observedScan?.coverage || null;
  const skipped = Array.isArray(coverage?.skipped || observedScan?.skipped) ? (coverage?.skipped || observedScan.skipped) : [];
  const excluded = skipped.filter((s) => s.reason === 'ignored directory' || /worktree of/.test(s.reason || ''));
  const incomplete = !!(coverage?.truncated || coverage?.complete === false || skipped.length > excluded.length || observation?.degraded?.length || observation?.freshness && observation.freshness !== 'current' || observedScan?.freshness && observedScan.freshness !== 'current' || observedScan?.errors?.length);
  const known = !!observedRevision && !incomplete;
  const files = new Map((observedScan?.files || []).map((f) => [f.path, f]));
  const findings = [];
  const add = (kind, title, detail, r, items = [], severity = 'medium') => findings.push({
    id: `${kind}${r ? ':' + r.id : ''}`, kind, severity, title, detail, ...(r ? { requirementId: r.id } : {}), items,
    locations: [], notes: {},
    fix: `Revise ${r ? `o requisito ${r.id} (${r.title})` : 'a cobertura da análise'} no Floorplan: ${detail} Leia o plano, o código relacionado e as evidências antes de propor uma mudança. Não marque como verificado sem executar a validação para a revisão atual.`,
  });
  if (incomplete) add('analysis-incomplete', 'Análise incompleta ou desatualizada', 'A cobertura disponível não permite concluir que código ausente foi removido. Atualize a observação antes de verificar o escopo.');
  function pathsFor(ref) {
    if (ref.startsWith('f:')) return [ref.slice(2)];
    if (ref.startsWith('n:')) {
      const ids = new Set([ref.slice(2)]);
      for (let changed = true; changed;) {
        changed = false;
        for (const n of graph?.nodes || []) if (ids.has(n.parent) && !ids.has(n.id)) { ids.add(n.id); changed = true; }
      }
      return (graph?.files || []).filter((f) => ids.has(f.n)).map((f) => f.p);
    }
    if (ref.startsWith('screen:')) {
      const declared = (plan?.screens || []).find((s) => s.id === ref || `screen:${s.id}` === ref || s.aliases?.includes(ref));
      if (declared?.file) return [declared.file];
      const screen = (graph?.screens || []).find((s) => s.id === ref || declared && (s.id === declared.id || s.file === declared.file));
      return screen?.file ? [screen.file] : [];
    }
    return [];
  }
  const requirements = (Array.isArray(plan?.requirements) ? plan.requirements : []).map((r) => {
    const refs = Array.isArray(r.refs) ? r.refs : [], criteria = (Array.isArray(r.criteria) ? r.criteria : []).map((c) => ({ ...c, criterionHash: criterionRevision(c) }));
    const unresolved = refs.filter((ref) => typeof ref !== 'string' || !pathsFor(ref).length);
    const targets = [...new Set(refs.filter((ref) => typeof ref === 'string').flatMap(pathsFor))];
    const missing = targets.filter((p) => !files.has(p));
    const present = targets.length - missing.length;
    const missingExcluded = missing.some((p) => excluded.some((s) => p === s.path || p.startsWith(`${s.path}/`)));
    let implementation = 'unknown';
    if (known && targets.length && !unresolved.length && !missingExcluded) implementation = !missing.length ? 'observed' : present ? 'partial' : 'not-observed';
    // A partial index still supplies positive evidence; it cannot prove absence.
    if (observedRevision && (!observedScan.freshness || observedScan.freshness === 'current') && (!observation || observation.freshness === 'current') && targets.length && !unresolved.length && !missing.length) implementation = 'observed';
    if (!refs.length || unresolved.length) add('requirement-unlinked', 'Requisito sem vínculo técnico resolvido', 'Associe o requisito às telas, arquivos ou módulos correspondentes quando a solução estiver definida.', r, refs, 'low');
    if (!criteria.length) add('requirement-no-criteria', 'Requisito sem critérios de aceite', 'Registre um comportamento observável para distinguir implementação de conclusão.', r, refs);
    const evidence = Array.isArray(r.evidence) ? r.evidence : [];
    const latest = new Map();
    for (const e of evidence) if (criteria.some((c) => c.id === e.criterionId) && ['pass', 'fail'].includes(e.result) && e.method && Number.isFinite(Date.parse(e.at)) && e.revision) {
      if (!latest.has(e.criterionId) || Date.parse(e.at) >= Date.parse(latest.get(e.criterionId).at)) latest.set(e.criterionId, e);
    }
    const current = criteria.map((c) => latest.get(c.id));
    const contentKnown = known && !targets.some((p) => files.has(p) && !files.get(p).h);
    let verification = 'unverified';
    if (contentKnown && current.some((e, i) => e?.result === 'fail' && e.revision === observedRevision && e.criterionHash === criteria[i].criterionHash)) verification = 'failed';
    else if (current.some(Boolean) && (!contentKnown || current.some((e, i) => e && (e.revision !== observedRevision || e.criterionHash !== criteria[i].criterionHash)))) verification = 'stale';
    else if (known && current.length && current.every((e) => e?.result === 'pass')) verification = 'passed';
    if (verification === 'stale') add('evidence-stale', 'Verificação precisa ser atualizada', 'O código ou a atualidade da análise mudou desde a evidência registrada.', r, refs);
    if (verification === 'failed') add('criterion-failed', 'Critério de aceite falhou', 'Há evidência de falha para a revisão observada. Consulte o resultado antes de considerar o requisito concluído.', r, refs, 'high');
    return { id: r.id, title: r.title, refs, criteria, implementation, verification, missing, unresolved };
  });
  const summary = { total: requirements.length, observed: 0, partial: 0, unknown: 0, 'not-observed': 0, unverified: 0, passed: 0, failed: 0, stale: 0 };
  for (const r of requirements) { summary[r.implementation]++; summary[r.verification]++; }
  return { requirements, findings, summary, observedRevision, coverage };
}
