import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {validatePlan,readBaseline} from '../skills/floorplan/scripts/lib/project.mjs';
import {validateNavigation,navigationReport} from '../skills/floorplan/scripts/lib/navigation.mjs';
import {applyDocuments,projectStatus,createBaseline} from '../skills/floorplan/scripts/lib/project-commands.mjs';
import {exportClient} from '../skills/floorplan/scripts/lib/client-export.mjs';
import {makeProject,cleanup,readGraph} from './helpers.mjs';
const plan=()=>({$schema:'floorplan/plan@2',stage:'scope',objective:'Reservar horários',screens:[{id:'agenda',title:'Agenda',node:'app'},{id:'done',title:'Confirmada',node:'app'},{id:'error',title:'Conflito',node:'app'}],journeys:[{id:'book',title:'Reservar',actor:'Cliente',goal:'Obter confirmação',steps:[{id:'choose',screen:'agenda'},{id:'done',screen:'done',end:true},{id:'conflict',screen:'error'}],path:['choose','done'],transitions:[{from:'choose',to:'done',action:'Confirmar',kind:'forward'},{from:'choose',to:'conflict',action:'Mostrar conflito',condition:'Horário ocupado',kind:'error'},{from:'conflict',to:'choose',action:'Tentar outro horário',kind:'recovery'}]}]});
test('navigation accepts branches and repeated screens with distinct step identity',()=>{
 const p=plan();assert.deepEqual(validatePlan(p),[]);assert.equal(navigationReport(p).covered,3);
 p.journeys[0].steps[2].screen='agenda';assert.deepEqual(validateNavigation(p),[]);assert.equal(navigationReport(p).uncovered[0].id,'error');
 const legacy={...p};delete legacy.journeys;assert.deepEqual(validatePlan(legacy),[]);assert.equal(navigationReport(legacy).findings.length,1);
});
test('navigation rejects dangling refs, disconnected branches, missing actions and traps',()=>{
 const bad=[p=>p.journeys[0].steps[0].screen='missing',p=>p.journeys[0].path=['choose','conflict','done'],p=>p.journeys[0].steps[1].end=false,p=>p.journeys[0].transitions.pop(),p=>p.journeys[0].transitions[1].condition='',p=>p.journeys[0].transitions[0].action='',p=>p.journeys[0].steps.push({id:'alone',screen:'agenda',end:true}),p=>p.journeys[0].steps[1].id='choose',p=>p.journeys[0].requirements=['R404'],p=>p.journeys[0].transitions.push({from:'unknown',to:'done',kind:'forward',action:'Go'})];
 for(const change of bad){const p=plan();change(p);assert.ok(validateNavigation(p).length);}
 const cycle=plan();cycle.journeys[0].transitions[2].to='conflict';assert.ok(validateNavigation(cycle).some(e=>e.includes('no path to an outcome')));
});
test('player follows declared path, branches and actual history without jumping to catalog neighbors',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../skills/floorplan/assets/ui/34-journeys.js',import.meta.url),'utf8'),context);
 const player=context.FloorplanJourneys.createPlayer(plan().journeys[0]);assert.equal(player.next().to,'done');assert.equal(player.go('unknown'),false);
 assert.equal(player.go('conflict'),true);assert.equal(player.next(),null);assert.equal(player.outgoing()[0].to,'choose');assert.equal(player.go('done'),false);
 player.go('choose');assert.equal(player.current,'choose');player.back();assert.equal(player.current,'conflict');player.back();assert.equal(player.current,'choose');
 player.inspect('done');assert.equal(player.history.length,0);assert.equal(player.next(),null);assert.equal(player.step.end,true);
});
test('journeys enter graph, status, review and immutable client baseline without leaking private fields',async()=>{
 const root=makeProject({});try{
  const p=plan();await applyDocuments(root,{expectedRevision:projectStatus(root).revision,documents:{'plan.json':p,'architecture.json':{project:{name:'Agenda sintética'},nodes:[{id:'app',kind:'ui',label:'Agenda',summary:'Reservas'}]}}});
  const state=projectStatus(root);assert.equal(state.navigation.covered,3);assert.equal(readGraph(root).navigation.journeys[0].path[0],'choose');
  await createBaseline(root,{id:'with-journeys',title:'Jornadas',expectedRevision:state.revision});
  const html=exportClient(path.join(root,'floorplan'),'with-journeys').html;
  const payload=JSON.parse(/<script id="blueprint-data" type="application\/json">(.*?)<\/script>/s.exec(html)[1]);
  assert.equal(payload.journeys[0].steps[0].title,'Agenda');assert.equal(payload.journeys[0].transitions[1].condition,'Horário ocupado');assert.ok(html.includes('journey-select'));
  for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
  const changed=structuredClone(state.plan);changed.journeys=[];await applyDocuments(root,{expectedRevision:state.revision,documents:{'plan.json':changed}});
  assert.ok(readGraph(root).health.issues.some(i=>i.id==='navigation:uncovered'));
  assert.equal(readBaseline(path.join(root,'floorplan'),'with-journeys').documents['plan.json'].journeys.length,1);
  assert.equal(exportClient(path.join(root,'floorplan'),'with-journeys').html,html);
 }finally{cleanup(root);}
});
