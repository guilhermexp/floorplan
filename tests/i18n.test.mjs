import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { SKILL } from './helpers.mjs';
const source = fs.readFileSync(path.join(SKILL,'assets/ui/01-language.js'),'utf8');
function boot(saved = new Map()) {
  const observers = [], label = {textContent:''};
  const el = (skip = false) => ({nodeType:1,closest:()=>skip ? {} : null,querySelectorAll:()=>[],hasAttribute:()=>false});
  const body = el(), texts = [
    {data:'Overview',parentElement:el()}, {data:'Fechar',parentElement:el()},
    {data:'apps/mobile/src/screens/Home.tsx',parentElement:el()},
    {data:'Overview',parentElement:el(true)},
  ];
  body.texts = texts;
  const button = {querySelector:()=>label,setAttribute(){}};
  const document = {body,documentElement:{},createTreeWalker:(root)=>{let i=0;return {nextNode:()=>root.texts?.[i++] || null};}};
  const window = {Floorplan:{addHeaderButton:()=>button},dispatchEvent(){}};
  const context = {window,document,NodeFilter:{SHOW_TEXT:4},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},MutationObserver:class {constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){}},CustomEvent:class {},console};
  vm.runInNewContext(source,context);
  return {i18n:window.FloorplanI18n,texts,document,saved,observer:observers[0]};
}
test('Portuguese is the default; project paths and code are preserved',()=>{
  const b=boot();assert.equal(b.i18n.get(),'pt-BR');assert.equal(b.document.documentElement.lang,'pt-BR');assert.equal(b.texts[0].data,'Visão geral');assert.equal(b.texts[2].data,'apps/mobile/src/screens/Home.tsx');assert.equal(b.texts[3].data,'Overview');assert.equal(b.i18n.ownsText(b.texts[0]),true);assert.equal(b.i18n.ownsText(b.texts[2]),false);
});
test('switching language is reversible and persists across reopening',()=>{
  const b=boot();b.i18n.set('en');assert.equal(b.texts[0].data,'Overview');assert.equal(b.texts[1].data,'Close');assert.equal(boot(b.saved).i18n.get(),'en');b.i18n.set('pt-BR');assert.equal(b.texts[1].data,'Fechar');assert.equal(boot(b.saved).i18n.get(),'pt-BR');
});
test('dynamic UI labels translate without changing identifiers, numbers or image dimensions',()=>{
  const b=boot();assert.equal(b.i18n.t('Screen · 2 cards'),'Tela · 2 cartões');assert.equal(b.i18n.t('Everything behind /users/:id'),'Tudo por trás de /users/:id');assert.equal(b.i18n.t('Mobile 390 × 844'),'Mobile 390 × 844');b.texts[0].data='Screens';b.observer.cb([{type:'childList',target:b.document.body}]);assert.equal(b.texts[0].data,'Telas');b.i18n.set('en');assert.equal(b.texts[0].data,'Screens');
});
