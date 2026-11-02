// Session-only snapshots; deliberately separate from the scientific model.
export function copyPlan(plan) {
  return structuredClone(plan);
}
export function comparisonRows(analysis) {
  return {
    readings: `${analysis.readingCount} readings`,
    units: analysis.experimentalUnitCount === null
      ? 'Independent units unknown' : `${analysis.experimentalUnitCount} independent pots*`,
    pattern: analysis.oneTreatment ? 'Comparison unavailable: one treatment'
      : analysis.completeConfounding ? 'Complete shelf confounding'
        : 'Complete shelf confounding not detected',
  };
}

export function describeChanges(before, after) {
  const changes = [];
  const units = { pot: 'each pot treated independently', shared: 'shared treatment; units unknown', unknown: 'treatment unit unknown' };
  if (before.readingsPerPot !== after.readingsPerPot)
    changes.push(`Readings per pot: ${before.readingsPerPot} → ${after.readingsPerPot}.`);
  if (before.treatmentUnit !== after.treatmentUnit)
    changes.push(`Treatment unit: ${units[before.treatmentUnit]} → ${units[after.treatmentUnit]}.`);
  for (const pot of after.pots) {
    const old = before.pots.find(p => p.id === pot.id);
    if (old && (old.shelf !== pot.shelf || old.treatment !== pot.treatment))
      changes.push(`${pot.id}: treatment ${old.treatment}, shelf ${old.shelf} → treatment ${pot.treatment}, shelf ${pot.shelf}.`);
  }
  return changes;
}
