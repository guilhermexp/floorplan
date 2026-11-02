import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import {validatePlan, readBaseline} from '../skills/floorplan/scripts/lib/project.mjs';
import {technologyStackReport, STACK_CATEGORIES} from '../skills/floorplan/scripts/lib/technology-stack.mjs';
import {applyDocuments, projectStatus, createBaseline} from '../skills/floorplan/scripts/lib/project-commands.mjs';
import {exportClient} from '../skills/floorplan/scripts/lib/client-export.mjs';
import {makeProject, cleanup, readGraph} from './helpers.mjs';
const plan = () => ({$schema:'floorplan/plan@2',stage:'scope',objective:'Organizar agenda',stack:['TypeScript'],decisions:[{id:'D1',title:'Interface',choice:'HTML',rationale:'Necessidade simples',status:'accepted'}],technologyStack:STACK_CATEGORIES.map(([category]) => ({id:category,category,purpose:'Avaliar '+category,rationale:'Definir após descoberta',status:'undecided'}))});
test('stack preserves legacy and requires honest statuses, version criteria and valid references', () => {
  assert.deepEqual(validatePlan({$schema:'floorplan/plan@2',stage:'scope',objective:'Teste',stack:['Legado']}),[]);
  assert.deepEqual(validatePlan(plan()),[]);
  const p=plan(); Object.assign(p.technologyStack[1],{technology:'HTML',version:'Padrões web; validar navegadores alvo',status:'selected',decisions:['D1']});
  assert.deepEqual(validatePlan(p),[]);
  for(const mutate of [p=>p.technologyStack[1].decisions=[],p=>p.technologyStack[1].version='',p=>p.technologyStack[1].questions=['missing'],p=>p.technologyStack[1].category='anything',p=>p.technologyStack[1].status='installed',p=>p.technologyStack[1].id='mobile',p=>p.technologyStack.push({...p.technologyStack[1],id:'other',status:'not-needed'}),p=>p.technologyStack[1].privatePath='secret']) {
    const bad=structuredClone(p);mutate(bad);assert.ok(validatePlan(bad).length);
  }
  assert.ok(validatePlan({...p,$schema:'floorplan/plan@1'}).length);
  assert.ok(validatePlan({...p,technologyStack:[null]}).length);
  assert.ok(validatePlan({...p,technologyStack:'invalid'}).length);
});
test('stack review distinguishes omissions, undecided capacities and categories not applicable',()=>{
  assert.equal(technologyStackReport(null).findings.length,0);
  assert.equal(technologyStackReport({stack:['Legacy']}).missing.length,13);
  const p=plan();p.technologyStack.forEach(i=>i.status='not-needed');
  assert.equal(technologyStackReport(p).findings.length,0);
  p.technologyStack[0].status='undecided';p.technologyStack.pop();
  const r=technologyStackReport(p);assert.deepEqual(r.pending,['mobile']);assert.deepEqual(r.missing,['security']);assert.equal(r.findings.length,2);assert.ok(r.findings.every(f=>f.change && Array.isArray(f.items)));
});
test('stack reaches agent status, review, UI and frozen export without copying private fields', async()=>{
  const root=makeProject({});try {
    const p=plan();p.technologyStack[0].purpose='<script>unsafe()</script>';
    await applyDocuments(root,{expectedRevision:projectStatus(root).revision,documents:{'plan.json':p,'architecture.json':{project:{name:'Agenda sintética'},nodes:[{id:'app',kind:'ui',label:'Agenda',summary:'Agenda'}]}}});
    const state=projectStatus(root),graph=readGraph(root);assert.equal(state.technologyStack.items.length,13);assert.ok(graph.health.issues.some(i=>i.id==='technology-stack:pending'));
    await createBaseline(root,{id:'stack-v1',title:'Stack',expectedRevision:state.revision});
    const html=exportClient(path.join(root,'floorplan'),'stack-v1').html;assert.ok(html.includes('Stack do projeto'));assert.ok(html.includes('&lt;script&gt;unsafe()&lt;/script&gt;'));assert.ok(!html.includes('<script>unsafe()'));
    let modal;
    const SC={graph,h:v=>String(v??'').replace(/</g,'&lt;'),on(){},exported:true,addHeaderButton:o=>{SC.open=o.onClick;return{};},addPanelSection(){},exists:()=>false,modal:o=>{modal=o;return{el:{querySelectorAll:()=>[],querySelector:()=>null}};}};
    vm.runInNewContext(fs.readFileSync(new URL('../skills/floorplan/assets/ui/07-project.js',import.meta.url),'utf8'),{window:{Floorplan:SC,FloorplanI18n:{get:()=> 'pt-BR'},addEventListener(){}},document:{createElement:()=>({}),head:{appendChild(){}}}});
    await SC.open();assert.ok(modal.html.includes('Stack do projeto'));assert.ok(modal.html.includes('API e runtime'));assert.ok(modal.html.includes('A definir'));assert.ok(!modal.html.includes('<script>unsafe()'));
    const changed=structuredClone(state.plan);changed.technologyStack[0].purpose='Versão seguinte';
    await applyDocuments(root,{expectedRevision:state.revision,documents:{'plan.json':changed}});
    assert.equal(readBaseline(path.join(root,'floorplan'),'stack-v1').documents['plan.json'].technologyStack[0].purpose,p.technologyStack[0].purpose);
    assert.equal(exportClient(path.join(root,'floorplan'),'stack-v1').html,html);
  } finally {cleanup(root);}
});
test('the actual frozen viewer API accepts late question and gallery registration', () => {
  const viewer=fs.readFileSync(new URL('../skills/floorplan/assets/viewer.html',import.meta.url),'utf8');
  const start=viewer.indexOf('window.Floorplan = Object.freeze({');
  const apiSource=viewer.slice(start,viewer.indexOf('\ntechnicalFlag =',start));
  // Other viewer capabilities are inert here; execute the actual API declaration,
  // including its freeze, rather than a mutable fake extension object.
  const target={window:{},Object,ext:{actions:{}}};
  const scope=new Proxy(target,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:(k in o?o[k]:()=>{})});
  vm.runInNewContext(`with (scope) { ${apiSource} }`,{scope});
  const api=target.window.Floorplan;assert.equal(Object.isFrozen(api),true);
  let question,journey;api.openQuestions=id=>question=id;api.openVisuals=id=>journey=id;
  api.openQuestions('Q13');api.openVisuals('booking');assert.equal(question,'Q13');assert.equal(journey,'booking');
  api.openQuestions=null;api.openQuestions('Q08');assert.equal(question,'Q08');
});
