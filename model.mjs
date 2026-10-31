/**
 * TrialMap's deliberately bounded classroom plant-plan checks.
 * Counts describe the declared plan, not power, validity, safety or independence.
 * No state is mutated and no information is persisted or transmitted.
 */
const TREATMENTS = ["A", "B"];
const UNIT_MODES = ["pot", "shared", "unknown"];
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Return all actionable input errors without coercing untrusted values. */
export function validate(state) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!isRecord(state)) {
    return {
      valid: false,
      errors: [{ field: "state", message: "Provide a plan object." }],
    };
  }
  if (!Array.isArray(state.pots)) {
    add("pots", "Provide a list of pots.");
  } else {
    if (state.pots.length < 1 || state.pots.length > 12) {
      add("pots", "Use between 1 and 12 pots in this bounded prototype.");
    }
    const ids = new Set();
    Array.from(state.pots).forEach((pot, index) => {
      const field = `pots[${index}]`;
      if (!isRecord(pot)) {
        add(field, "Each pot must be an object.");
        return;
      }
      if (typeof pot.id !== "string" || !pot.id.trim()) {
        add(`${field}.id`, "Give each pot a nonempty text identifier.");
      } else {
        const id = pot.id.trim();
        if (ids.has(id)) add(`${field}.id`, "Pot identifiers must be unique.");
        ids.add(id);
      }
      if (!TREATMENTS.includes(pot.treatment))
        add(`${field}.treatment`, "Choose treatment A or B.");
      if (pot.shelf !== 1 && pot.shelf !== 2)
        add(`${field}.shelf`, "Choose shelf 1 or 2.");
    });
  }
  if (
    !Number.isInteger(state.readingsPerPot) ||
    state.readingsPerPot < 1 ||
    state.readingsPerPot > 30
  ) {
    add(
      "readingsPerPot",
      "Choose a whole number of readings per pot from 1 to 30.",
    );
  }
  if (!UNIT_MODES.includes(state.treatmentUnit)) {
    add(
      "treatmentUnit",
      "Declare independently treated pots, shared treatment, or unknown treatment units.",
    );
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Count known units only when the caller explicitly declares independently
 * treated pots. Shared trays need tray assignment data this prototype lacks.
 * completeConfounding concerns the declared treatment/shelf pattern only.
 */
export function analyze(state) {
  const validation = validate(state);
  if (!validation.valid) {
    const error = new TypeError(
      "Invalid TrialMap plan: " +
        validation.errors.map(({ message }) => message).join(" "),
    );
    error.validationErrors = validation.errors;
    throw error;
  }
  const shelves = { 1: { A: 0, B: 0, total: 0 }, 2: { A: 0, B: 0, total: 0 } };
  const perTreatment = { A: 0, B: 0 };
  for (const pot of state.pots) {
    perTreatment[pot.treatment] += 1;
    shelves[pot.shelf][pot.treatment] += 1;
    shelves[pot.shelf].total += 1;
  }
  const potCount = state.pots.length;
  const readingCount = potCount * state.readingsPerPot;
  const unitUncertain = state.treatmentUnit !== "pot";
  const experimentalUnitCount = unitUncertain ? null : potCount;
  const oneTreatment = perTreatment.A === 0 || perTreatment.B === 0;
  const completeConfounding =
    !oneTreatment &&
    ((shelves[1].A > 0 &&
      shelves[1].B === 0 &&
      shelves[2].B > 0 &&
      shelves[2].A === 0) ||
      (shelves[1].B > 0 &&
        shelves[1].A === 0 &&
        shelves[2].A > 0 &&
        shelves[2].B === 0));
  const imbalance = perTreatment.A !== perTreatment.B;
  const warnings = [];
  if (unitUncertain)
    warnings.push({
      code: "UNIT_UNCERTAIN",
      message:
        state.treatmentUnit === "shared"
          ? "Treatment is shared across pots. A tray or another treated group may be the experimental unit; this plan does not contain enough information to count those units."
          : "The treatment unit is not confirmed. Pot counts cannot yet be treated as experimental-unit counts.",
    });
  if (oneTreatment)
    warnings.push({
      code: "ONE_TREATMENT",
      message:
        "Only one treatment is represented. This plan cannot compare treatment A with treatment B.",
    });
  if (completeConfounding)
    warnings.push({
      code: "COMPLETE_CONFOUNDING",
      message:
        "Treatment and shelf are completely linked in the declared layout. This comparison cannot separate the treatment effect from a shelf effect.",
    });
  if (imbalance)
    warnings.push({
      code: "UNEQUAL_POT_COUNTS",
      message:
        "The treatments have unequal pot counts. This is a planning prompt, not a judgment that the experiment is invalid.",
    });
  return {
    potCount,
    readingCount,
    experimentalUnitCount,
    unitUncertain,
    perTreatment,
    shelves,
    completeConfounding,
    imbalance,
    oneTreatment,
    warnings,
  };
}

/** Fresh synthetic examples; neither is a certification of a sound experiment. */
export function makeExample(mode = "confounded") {
  if (mode !== "confounded" && mode !== "mixed")
    throw new TypeError("Choose confounded or mixed example.");
  return {
    pots: [
      { id: "P1", treatment: "A", shelf: 1 },
      { id: "P2", treatment: "A", shelf: 1 },
      { id: "P3", treatment: "A", shelf: mode === "mixed" ? 2 : 1 },
      { id: "P4", treatment: "B", shelf: mode === "mixed" ? 1 : 2 },
      { id: "P5", treatment: "B", shelf: 2 },
      { id: "P6", treatment: "B", shelf: 2 },
    ],
    readingsPerPot: 5,
    treatmentUnit: "pot",
  };
}
