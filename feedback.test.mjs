import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, makeExample } from './model.mjs';
import { finding, nextQuestion } from './feedback.mjs';
for (const treatment of ['A', 'B']) for (const unit of ['shared', 'unknown']) {
  test(`combined diagnosis preserves both issues: all ${treatment}, ${unit}`, () => {
    const plan = makeExample('confounded');
    plan.pots.forEach(p => p.treatment = treatment);
    plan.treatmentUnit = unit;
    const a = analyze(plan);
    assert.equal(a.oneTreatment, true);
    assert.equal(a.unitUncertain, true);
    assert.match(finding(a).text, /Both A and B/);
    assert.match(finding(a).text, /independent treatment unit is not yet clear/);
    assert.match(nextQuestion(a), /treatment independently/);
    assert.match(nextQuestion(a), /which will receive B/);
    // Fixing only one problem must leave the other visible.
    plan.pots[0].treatment = treatment === 'A' ? 'B' : 'A';
    assert.match(finding(analyze(plan)).title, /identify the treatment unit/);
    plan.pots[0].treatment = treatment;
    plan.treatmentUnit = 'pot';
    assert.match(finding(analyze(plan)).title, /missing a treatment/);
  });
}
test('existing separate warning and mixed-layout feedback remains bounded', () => {
  assert.match(finding(analyze(makeExample('confounded'))).title, /tangled/);
  assert.match(finding(analyze(makeExample('mixed'))).title, /confounding is absent/);
  assert.match(finding(analyze(makeExample('mixed'))).text, /not every possible design flaw/);
});
