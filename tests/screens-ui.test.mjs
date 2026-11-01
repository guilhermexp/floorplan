import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SKILL } from './helpers.mjs';

const screen = (id, aliases = []) => ({ id, aliases, name: 'Página inicial', url: '/inicio', file: 'web/page.js', app: 'app', behind: [{ id: 'f:web/page.js', kind: 'screen', note: '' }] });
function boot(screens, ref) {
  const boards = [], replacements = [], viewerEvents = {}, browserEvents = {};
  const element = () => ({ style: {}, classList: { add() {}, remove() {}, contains: () => false }, appendChild() {}, contains: () => false });
  const location = { hash: '#screen=' + encodeURIComponent(ref) };
  const history = { pushState() { throw new Error('Restoring a screen must not push browser history'); }, replaceState(_state, _title, url) { replacements.push(url); location.hash = url; } };
  const document = { createElement: element, head: element(), body: element() };
  const window = { addEventListener: (name, fn) => { browserEvents[name] = fn; }, Floorplan: {
    graph: { screens, nodes: [{ id: 'app', label: 'Aplicativo' }], visuals: [{ id: 'mockup', screen: screens[0].id }] },
    h: value => String(value), exists: () => true, showBoard: board => boards.push(board),
    addHeaderButton: element, addPanelSection() {}, on: (name, fn) => { viewerEvents[name] = fn; },
  } };
  vm.runInNewContext(fs.readFileSync(path.join(SKILL, 'assets/ui/30-screens.js'), 'utf8'), { window, document, location, history, URLSearchParams });
  return { boards, replacements, location, ready: viewerEvents.ready, popstate: browserEvents.popstate };
}

test('legacy screen links open the migrated screen with its visual and canonicalize without adding history', () => {
  const b = boot([screen('screen:persistent', ['screen:app:/old'])], 'screen:app:/old');
  b.ready();
  assert.equal(b.boards.length, 1);
  assert.equal(b.boards[0].screen, 'screen:persistent');
  assert.deepEqual(Array.from(b.boards[0].items, item => item.id), ['v:mockup', 'f:web/page.js']);
  assert.equal(new URLSearchParams(b.location.hash.slice(1)).get('screen'), 'screen:persistent');
  assert.equal(b.replacements.length, 1);
  b.location.hash = '#screen=' + encodeURIComponent('screen:app:/old'); b.popstate();
  assert.equal(b.boards.at(-1).screen, 'screen:persistent');
});

test('exact screen IDs win and ambiguous aliases never choose an arbitrary screen', () => {
  const direct = boot([screen('screen:first', ['shared']), screen('screen:second', ['screen:first', 'shared'])], 'screen:first');
  direct.ready(); assert.equal(direct.boards[0].screen, 'screen:first'); assert.equal(direct.replacements.length, 0);
  const ambiguous = boot([screen('screen:first', ['shared']), screen('screen:second', ['shared'])], 'shared');
  ambiguous.ready(); assert.equal(ambiguous.boards.length, 0); assert.equal(ambiguous.replacements.length, 0);
});
