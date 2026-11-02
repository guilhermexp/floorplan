import test from 'node:test';
import assert from 'node:assert/strict';
import { assessProject, observationRevision } from '../skills/floorplan/scripts/lib/assessment.mjs';
import * as assessmentModule from '../skills/floorplan/scripts/lib/assessment.mjs';

const requirement = () => ({ id: 'book', title: 'Reservar', refs: ['f:api/book.js', 'f:web/book.js'], criteria: [{ id: 'available', text: 'Impede reserva duplicada.' }] });
const scan = () => ({ files: [{ path: 'api/book.js', h: 'body1' }, { path: 'web/book.js', h: 'body2' }], repos: [{ path: '.', head: 'commit1' }], routes: [] });
const assessment = (req, observedScan, extra = {}) => assessProject({ plan: { requirements: [req] }, observedScan, ...extra });

test('having files does not imply that a requirement has passed its acceptance criteria', () => {
  const result = assessment(requirement(), scan());
  assert.equal(result.requirements[0].implementation, 'observed');
  assert.equal(result.requirements[0].verification, 'unverified');
});

test('absent analysis is unknown; a complete scan can identify partial implementation', () => {
  assert.equal(assessment(requirement(), null).requirements[0].implementation, 'unknown');
  const partial = scan(); partial.files.pop();
  assert.equal(assessment(requirement(), partial).requirements[0].implementation, 'partial');
  assert.equal(assessment(requirement(), { files: [], routes: [], repos: [] }).requirements[0].implementation, 'not-observed');
});

test('degraded or truncated observations cannot assert that missing code was deleted', () => {
  const result = assessment(requirement(), { files: [], routes: [] }, { observation: { freshness: 'current', coverage: { truncated: true }, degraded: [] } });
  assert.equal(result.requirements[0].implementation, 'unknown');
  assert.ok(result.findings.some((f) => f.kind === 'analysis-incomplete'));
});

test('a body-only change invalidates evidence, even with unchanged symbols', () => {
  const req = requirement(), before = scan();
  req.evidence = [{ criterionId: 'available', criterionHash: assessmentModule.criterionRevision(req.criteria[0]), result: 'pass', method: 'node --test', at: '2026-11-01T12:00:00Z', revision: observationRevision(before) }];
  assert.equal(assessment(req, before).requirements[0].verification, 'passed');
  const after = scan(); after.files[0].h = 'body-edited';
  assert.equal(assessment(req, after).requirements[0].verification, 'stale');
});

test('scan timestamps do not invalidate unchanged evidence and order does not alter revision', () => {
  const before = scan(); before.generatedAt = '2026-11-01T12:00:00Z';
  const after = scan(); after.generatedAt = '2026-11-02T12:00:00Z'; after.files.reverse();
  assert.equal(observationRevision(before), observationRevision(after));
});

test('current failed evidence remains failed and incomplete criteria remain unverified', () => {
  const req = requirement(), observed = scan();
  req.evidence = [{ criterionId: 'available', criterionHash: assessmentModule.criterionRevision(req.criteria[0]), result: 'fail', method: 'node --test', at: '2026-11-01T12:00:00Z', revision: observationRevision(observed) }];
  assert.equal(assessment(req, observed).requirements[0].verification, 'failed');
  req.evidence[0].result = 'pass'; req.criteria.push({ id: 'owner', text: 'Somente o tutor pode reservar.' });
  assert.equal(assessment(req, observed).requirements[0].verification, 'unverified');
});

test('screen and module links inspect actual files, not merely planned canvas cards', () => {
  const req = requirement(); req.refs = ['screen:checkout'];
  const graph = { screens: [{ id: 'screen:checkout', file: 'web/book.js' }], files: [{ p: 'web/book.js', n: 'booking' }] };
  assert.equal(assessment(req, { files: [], routes: [] }, { graph }).requirements[0].implementation, 'not-observed');
  req.refs = ['n:booking'];
  assert.equal(assessment(req, scan(), { graph }).requirements[0].implementation, 'observed');
});

test('unlinked requirements and unsupported assessment inputs remain explicit', () => {
  const req = requirement(); req.refs = [];
  const result = assessment(req, scan());
  assert.equal(result.requirements[0].implementation, 'unknown');
  assert.ok(result.findings.some((f) => f.kind === 'requirement-unlinked'));
  assert.ok(result.summary.unverified > 0);
});

test('files with no content hash cannot substantiate fresh verification', () => {
  const req = requirement(), observed = scan(); delete observed.files[0].h;
  req.evidence = [{ criterionId: 'available', criterionHash: assessmentModule.criterionRevision(req.criteria[0]), result: 'pass', method: 'node --test', at: '2026-11-01T12:00:00Z', revision: observationRevision(observed) }];
  assert.equal(assessment(req, observed).requirements[0].verification, 'stale');
});

test('native discovery skips prevent absent-file conclusions', () => {
  const observed = { files: [], routes: [], coverage: { skipped: [{ path: 'large-dir', reason: 'limit' }] } };
  assert.equal(assessment(requirement(), observed).requirements[0].implementation, 'unknown');
});

test('intentional cache exclusions do not hide missing application files', () => {
  const observed = { files: [], routes: [], coverage: { skipped: [{ path: 'floorplan/.cache', reason: 'ignored directory' }] } };
  assert.equal(assessment(requirement(), observed).requirements[0].implementation, 'not-observed');
  const req = requirement(); req.refs = ['f:floorplan/.cache/private.js'];
  assert.equal(assessment(req, observed).requirements[0].implementation, 'unknown');
});

test('changing criterion text invalidates earlier verification on unchanged code', () => {
  const req = requirement(), observed = scan();
  const criterionHash = assessmentModule.criterionRevision(req.criteria[0]);
  req.evidence = [{ criterionId: 'available', criterionHash, result: 'pass', method: 'node --test', at: '2026-11-01T12:00:00Z', revision: observationRevision(observed) }];
  assert.equal(assessment(req, observed).requirements[0].verification, 'passed');
  req.criteria[0].text = 'Impede reserva duplicada e exige autorização do tutor.';
  const result = assessment(req, observed);
  assert.equal(result.requirements[0].verification, 'stale');
  assert.notEqual(result.requirements[0].criteria[0].criterionHash, criterionHash);
});

test('partial analysis can report positive file evidence without claiming complete coverage', () => {
  const result = assessment(requirement(), scan(), { observation: { freshness: 'current', coverage: { truncated: true }, degraded: [] } });
  assert.equal(result.requirements[0].implementation, 'observed');
  assert.equal(result.requirements[0].verification, 'unverified');
});

test('a current failed criterion remains actionable even while another criterion is stale', () => {
  const req = requirement(), observed = scan();
  req.criteria.push({ id: 'authorization', text: 'Exige autorização.' });
  req.evidence = req.criteria.map((c, i) => ({ criterionId: c.id, criterionHash: assessmentModule.criterionRevision(c), result: i ? 'fail' : 'pass', method: 'node --test', at: '2026-11-01T12:00:00Z', revision: i ? observationRevision(observed) : 'old' }));
  const result = assessment(req, observed);
  assert.equal(result.requirements[0].verification, 'failed');
  const finding = result.findings.find((f) => f.kind === 'criterion-failed');
  assert.equal(typeof finding.fix, 'string');
  assert.match(finding.fix, /book/);
});
