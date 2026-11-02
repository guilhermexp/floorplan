// Authored UX journeys are distinct from technical flows and observed implementation.
const text = v => typeof v === 'string' && !!v.trim();
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const array = v => Array.isArray(v) ? v : [];
const id = v => text(v) && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(v);
export function validateNavigation(plan) {
  if (plan.journeys === undefined) return [];
  const errors = [], fail = s => errors.push(s);
  if (!Array.isArray(plan.journeys)) return ['journeys must be an array'];
  const screens = new Set(array(plan.screens).filter(object).map(s => s.id));
  const requirements = new Set(array(plan.requirements).filter(object).map(r => r.id)), ids = new Set();
  const keys = (v, allowed, at) => {
    if (!object(v)) { fail(`${at} must be an object`); return false; }
    for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(`${at}.${k} is unsupported`);
    return true;
  };
  for (const [i,j] of plan.journeys.entries()) {
    const at = `journeys[${i}]`;
    if (!keys(j,['id','title','actor','goal','requirements','steps','path','transitions'],at)) continue;
    if (!id(j.id) || ids.has(j.id)) fail(`${at}.id must be unique and persistent`); ids.add(j.id);
    for (const key of ['title','actor','goal']) if (!text(j[key])) fail(`${at}.${key} is required`);
    if (j.requirements !== undefined && (!Array.isArray(j.requirements) || j.requirements.some(r => !requirements.has(r)))) fail(`${at}.requirements references an unknown requirement`);
    if (!Array.isArray(j.steps) || !j.steps.length) { fail(`${at}.steps must not be empty`); continue; }
    const steps = new Map();
    for (const [n,s] of j.steps.entries()) {
      const where = `${at}.steps[${n}]`;
      if (!keys(s,['id','screen','note','end'],where)) continue;
      if (!id(s.id) || steps.has(s.id)) fail(`${where}.id must be unique and persistent`); steps.set(s.id,s);
      if (!screens.has(s.screen)) fail(`${where}.screen must reference a persistent plan.screens ID`);
      if (s.note !== undefined && !text(s.note)) fail(`${where}.note must not be empty`);
      if (s.end !== undefined && typeof s.end !== 'boolean') fail(`${where}.end must be boolean`);
    }
    const transitions = Array.isArray(j.transitions) ? j.transitions : [];
    if (!Array.isArray(j.transitions)) fail(`${at}.transitions must be an array`);
    const edges = new Set();
    for (const [n,e] of transitions.entries()) {
      const where = `${at}.transitions[${n}]`;
      if (!keys(e,['from','to','action','condition','kind'],where)) continue;
      if (!steps.has(e.from) || !steps.has(e.to)) fail(`${where} references an unknown step`);
      if (!text(e.action)) fail(`${where}.action is required`);
      if (!['forward','alternative','error','recovery','back'].includes(e.kind)) fail(`${where}.kind is unsupported`);
      if (e.condition !== undefined && !text(e.condition)) fail(`${where}.condition must not be empty`);
      if (['alternative','error'].includes(e.kind) && !text(e.condition)) fail(`${where}.condition is required for a branch`);
      const key = JSON.stringify([e.from,e.to,e.action,e.condition]);
      if (edges.has(key)) fail(`${where} duplicates a transition`); edges.add(key);
    }
    const route = Array.isArray(j.path) ? j.path : [];
    if (!route.length || route.some(s => !steps.has(s)) || new Set(route).size !== route.length) fail(`${at}.path must contain a non-empty unique sequence of known steps (use separate step IDs when revisiting a screen)`);
    for (let n=1;n<route.length;n++) if (!transitions.some(e => e?.from===route[n-1] && e?.to===route[n] && e.kind!=='back')) fail(`${at}.path has no transition from ${route[n-1]} to ${route[n]}`);
    if (route.length && !steps.get(route.at(-1))?.end) fail(`${at}.path must end at a step marked end`);
    const walk = (starts,reverse=false) => {
      const visited = new Set(starts), queue = [...starts];
      for (let n=0;n<queue.length;n++) for (const e of transitions) {
        if (!object(e)) continue;
        const from = reverse?e.to:e.from, to = reverse?e.from:e.to;
        if (from===queue[n] && steps.has(to) && !visited.has(to)) { visited.add(to); queue.push(to); }
      }
      return visited;
    };
    const reached = walk(route.slice(0,1)), exits = walk([...steps.values()].filter(s => s.end).map(s => s.id),true);
    for (const s of steps.keys()) {
      if (!reached.has(s)) fail(`${at}: unreachable step ${s}`);
      if (!exits.has(s)) fail(`${at}: step ${s} has no path to an outcome`);
    }
  }
  return errors;
}
export function navigationReport(plan, graph) {
  const journeys = array(plan?.journeys).filter(object), screens = array(plan?.screens).filter(object);
  const used = new Set(journeys.flatMap(j => array(j.steps).filter(object).map(s => s.screen)));
  const uncovered = screens.filter(s => !used.has(s.id)).map(s => ({id:s.id,title:s.title}));
  const findings = uncovered.length ? [{id:'navigation:uncovered',kind:'navigation',severity:'medium',title:`${uncovered.length} telas sem jornada de navegação`,detail:uncovered.map(s=>s.title).join(' · '),items:[],locations:[],change:'Complete as jornadas em plan.journeys conforme references/navigation.md. Preserve IDs, imagens e decisões em aberto.'}] : [];
  if (graph) {
    const available = new Set((graph.screens || []).map(s=>s.id));
    const missing = [...used].filter(s=>!available.has(s));
    if(missing.length) findings.push({id:'navigation:unavailable',kind:'navigation',severity:'medium',title:`${missing.length} telas de jornadas indisponíveis no mapa`,detail:'As etapas continuam no plano; associe as telas ao mapa para visualizar seus mockups.',items:[],locations:[],change:'Complete as jornadas em plan.journeys conforme references/navigation.md. Preserve IDs, imagens e decisões em aberto.'});
  }
  return {journeys,covered:screens.length-uncovered.length,total:screens.length,uncovered,findings};
}
