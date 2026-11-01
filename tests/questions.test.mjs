import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeProject, cleanup, readGraph } from './helpers.mjs';
import { validateQuestions, questionViews, recordAnswers, protectAnswers } from '../skills/floorplan/scripts/lib/questions.mjs';
import { projectStatus, applyDocuments, saveAnswers, createBaseline } from '../skills/floorplan/scripts/lib/project-commands.mjs';
import { readBaseline } from '../skills/floorplan/scripts/lib/project.mjs';
const question=()=>({id:'Q1',question:'Como organizar as reservas?',about:['app'],options:[{id:'single',label:'Uma agenda',description:'Reutiliza a operação atual.',recommended:true},{id:'separate',label:'Agendas separadas',description:'Permite equipes independentes, com mais administração.'}]});
const plan=()=>({$schema:'floorplan/plan@2',stage:'scope',objective:'Organizar reservas',files:[],endpoints:[],questions:[question()]});
const input=p=>({id:'Q1',questionHash:questionViews(p)[0].questionHash,selected:['single'],text:'Começar pela equipe atual.'});

test('recommendations are not answers; free text, multiple choice and legacy questions work',()=>{
 const p=plan();assert.equal(questionViews(p)[0].state,'open');assert.equal(p.questions[0].answer,undefined);
 const a=recordAnswers(p,[input(p)]);assert.equal(questionViews(a)[0].state,'answered');assert.equal(p.questions[0].answer,undefined);
 assert.deepEqual(a.questions[0].answer.labels,['Uma agenda']);assert.deepEqual(validateQuestions(a.questions),[]);
 const free=recordAnswers(p,[{...input(p),selected:[],text:'Preciso discutir com a equipe.'}]);assert.equal(free.questions[0].answer.selected.length,0);
 p.questions[0].multiple=true;const many=recordAnswers(p,[{...input(p),selected:['single','separate']}]);assert.equal(many.questions[0].answer.selected.length,2);
 const old={...plan(),questions:['Uma dúvida antiga?']};const v=questionViews(old)[0];const legacy=recordAnswers(old,[{id:v.id,questionHash:v.questionHash,selected:[],text:'Uma resposta própria.'}]);assert.match(legacy.questions[0].id,/^legacy-/);assert.equal(questionViews(legacy)[0].state,'answered');
});

test('bad choices, empty answers, changed definitions and invalid schemas are rejected',()=>{
 const p=plan();for(const a of [{...input(p),selected:['not-an-option']},{...input(p),selected:['single','separate']},{...input(p),selected:[],text:''},{...input(p),questionHash:'outdated'},{...input(p),at:'forged'},{...input(p),text:42},{...input(p),selected:''}]) assert.throws(()=>recordAnswers(p,[a]));
 const q=question();q.options[1].recommended=true;assert.ok(validateQuestions([q]).length);
 q.options[1].recommended=false;q.options[1].id='single';assert.ok(validateQuestions([q]).length);
 assert.ok(validateQuestions([{...question(),answer:{}}]).length);
});

test('answered questions and old labels survive agent edits; stale answers cannot be resolved',()=>{
 const p=recordAnswers(plan(),[input(plan())]);const next=structuredClone(p);delete next.questions[0].answer;
 assert.deepEqual(protectAnswers(p,next).questions[0].answer,p.questions[0].answer);
 assert.throws(()=>protectAnswers(p,{...p,questions:[]}),/Preserve/);
 const fake=structuredClone(p);fake.questions[0].answer.text='Agente inventou isto';assert.throws(()=>protectAnswers(p,fake),/usuário/);
 assert.throws(()=>protectAnswers(plan(),p),/invente/);
 const edited=structuredClone(p);edited.questions[0].options[0].label='Outra proposta';const changed=protectAnswers(p,edited);assert.equal(questionViews(changed)[0].state,'stale');assert.equal(changed.questions[0].answer.labels[0],'Uma agenda');
 edited.questions[0].resolution={answerHash:questionViews(p)[0].answerHash,summary:'Alterado',at:new Date().toISOString()};assert.throws(()=>protectAnswers(p,edited),/revisão/);
});

test('answers persist, enter agent context, resolve with an exact hash and retain immutable baselines',async()=>{
 const root=makeProject({});try{
  await applyDocuments(root,{expectedRevision:projectStatus(root).revision,documents:{'plan.json':plan(),'architecture.json':{project:{name:'Agenda sintética'},nodes:[{id:'app',kind:'ui',label:'Agenda',summary:'Organiza reservas'}]}}});
  const before=projectStatus(root);await createBaseline(root,{id:'before-answers',title:'Antes das respostas',expectedRevision:before.revision});
  const response=await saveAnswers(root,{expectedRevision:before.revision,answers:[input(before.plan)]});assert.notEqual(response.revision,before.revision);
  assert.equal(projectStatus(root).questions[0].state,'answered');assert.equal(readGraph(root).lifecycle.questions[0].answer.text,'Começar pela equipe atual.');
  assert.equal(readGraph(root).health.issues.filter(i=>i.kind==='question').length,1);
  await assert.rejects(saveAnswers(root,{expectedRevision:before.revision,answers:[input(before.plan)]}),/conflict/);
  const current=projectStatus(root), updated=structuredClone(current.plan);updated.objective='Reservas na agenda única';updated.questions[0].resolution={answerHash:current.questions[0].answerHash,summary:'Objetivo e desenho revisados para uma agenda.',at:new Date().toISOString()};
  await applyDocuments(root,{expectedRevision:current.revision,documents:{'plan.json':updated}});
  assert.equal(projectStatus(root).questions[0].state,'resolved');assert.equal(readGraph(root).health.issues.filter(i=>i.kind==='question').length,0);
  const baseline=readBaseline(path.join(root,'floorplan'),'before-answers');assert.equal(baseline.documents['plan.json'].questions[0].answer,undefined);
  const state=projectStatus(root), revised=structuredClone(state.plan);revised.questions[0].question='Como organizar reservas de outra unidade?';await applyDocuments(root,{expectedRevision:state.revision,documents:{'plan.json':revised}});
  assert.equal(projectStatus(root).questions[0].state,'stale');assert.equal(readGraph(root).health.issues.filter(i=>i.kind==='question').length,1);
  const latest=projectStatus(root);await saveAnswers(root,{expectedRevision:latest.revision,answers:[{...input(latest.plan),selected:['separate'],text:'Unidade nova'}]});
  assert.equal(projectStatus(root).questions[0].state,'answered');assert.equal(projectStatus(root).plan.questions[0].resolution,undefined);
  assert.equal(fs.readFileSync(path.join(root,'floorplan','.gitignore'),'utf8').includes('*'),true);
 }finally{cleanup(root);}
});
