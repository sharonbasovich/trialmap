import test from 'node:test';
import assert from 'node:assert/strict';
import { copyPlan, comparisonRows } from './checkpoint.mjs';
import { analyze, makeExample } from './model.mjs';

test('checkpoint and restored plans never alias nested pot edits', () => {
  const original = makeExample('confounded');
  const snapshot = copyPlan(original);
  original.pots[0].shelf = 2;
  original.readingsPerPot = 20;
  original.treatmentUnit = 'shared';
  assert.equal(snapshot.pots[0].shelf, 1);
  assert.equal(snapshot.readingsPerPot, 5);
  assert.equal(snapshot.treatmentUnit, 'pot');
  const restored = copyPlan(snapshot);
  restored.pots[0].treatment = 'B';
  assert.equal(snapshot.pots[0].treatment, 'A');
});
test('both sides of comparison describe their actual layout and unit assumptions', () => {
  const plan = makeExample('mixed');
  assert.match(comparisonRows(analyze(plan)).pattern, /not detected/);
  for (const mode of ['shared', 'unknown']) {
    plan.treatmentUnit = mode;
    assert.equal(comparisonRows(analyze(plan)).units, 'Independent units unknown');
    assert.match(comparisonRows(analyze(plan)).pattern, /not detected/);
  }
  plan.pots.forEach(p => p.treatment = 'A');
  assert.equal(comparisonRows(analyze(plan)).pattern, 'Comparison unavailable: one treatment');
  assert.equal(comparisonRows(analyze(makeExample('confounded'))).readings, '30 readings');
  assert.equal(comparisonRows(analyze(makeExample('confounded'))).pattern, 'Complete shelf confounding');
});

test('change descriptions reveal equal-total pot swaps and assumption changes', async () => {
  const { describeChanges } = await import('./checkpoint.mjs');
  const before = makeExample('mixed');
  const after = copyPlan(before);
  assert.deepEqual(describeChanges(before, after), []);
  after.pots[0].shelf = before.pots[0].shelf === 1 ? 2 : 1;
  after.pots[1].treatment = 'B';
  after.readingsPerPot = 20;
  after.treatmentUnit = 'shared';
  const changes = describeChanges(before, after).join(' ');
  assert.match(changes, /Readings per pot: 5 → 20/);
  assert.match(changes, /shared treatment; units unknown/);
  assert.match(changes, /P1: treatment/);
  assert.match(changes, /P2: treatment/);
});

import { hasSessionPlanWork } from './checkpoint.mjs';
test('exit warning protects changed plans and recoverable snapshots without mutating them', () => {
  const initial = makeExample('confounded');
  const current = copyPlan(initial);
  assert.equal(hasSessionPlanWork(current, initial, null, null), false);
  for (const mutate of [p => p.readingsPerPot++, p => p.treatmentUnit = 'shared', p => p.pots[0].shelf = 2, p => p.pots[0].treatment = 'B']) {
    const changed = copyPlan(initial); mutate(changed);
    const before = JSON.stringify(changed);
    assert.equal(hasSessionPlanWork(changed, initial, null, null), true);
    assert.equal(JSON.stringify(changed), before);
  }
  assert.equal(hasSessionPlanWork(current, initial, {plan: copyPlan(initial)}, null), true);
  assert.equal(hasSessionPlanWork(current, initial, null, {plan: makeExample('mixed')}), true);
  assert.equal(hasSessionPlanWork(copyPlan(initial), initial, null, null), false);
});
