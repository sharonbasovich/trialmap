import test from "node:test";
import assert from "node:assert/strict";
import { validate, analyze, makeExample } from "./model.mjs";

const clone = (value) => structuredClone(value);
const deepFreeze = (value) => {
  Object.freeze(value);
  for (const child of Object.values(value))
    if (child && typeof child === "object") deepFreeze(child);
  return value;
};

test("six independent pots and five repeated readings yield six units, not thirty", () => {
  const result = analyze(makeExample());
  assert.equal(result.potCount, 6);
  assert.equal(result.readingCount, 30);
  assert.equal(result.experimentalUnitCount, 6);
  assert.deepEqual(result.perTreatment, { A: 3, B: 3 });
  assert.equal(result.completeConfounding, true);
  assert.equal(result.imbalance, false);
});

test("mixed shelf example removes only the complete-confounding warning", () => {
  const result = analyze(makeExample("mixed"));
  assert.equal(result.completeConfounding, false);
  assert.deepEqual(result.shelves, {
    1: { A: 2, B: 1, total: 3 },
    2: { A: 1, B: 2, total: 3 },
  });
  assert.equal(result.experimentalUnitCount, 6);
  assert.equal(result.readingCount, 30);
  assert.equal("validExperiment" in result, false);
  assert.equal("power" in result, false);
});

test("more readings do not resolve complete confounding or create units", () => {
  const plan = makeExample();
  for (let readings = 1; readings <= 30; readings++) {
    plan.readingsPerPot = readings;
    const result = analyze(plan);
    assert.equal(result.completeConfounding, true);
    assert.equal(result.experimentalUnitCount, 6);
    assert.equal(result.readingCount, 6 * readings);
  }
});

test("shared and unknown treatment units remain unknown without a fabricated tray count", () => {
  for (const treatmentUnit of ["shared", "unknown"]) {
    const plan = { ...makeExample(), treatmentUnit };
    const result = analyze(plan);
    assert.equal(result.experimentalUnitCount, null);
    assert.equal(result.unitUncertain, true);
    assert.equal(result.readingCount, 30);
    assert.deepEqual(result.perTreatment, { A: 3, B: 3 });
    assert.ok(
      result.warnings.some((warning) => warning.code === "UNIT_UNCERTAIN"),
    );
  }
});

test("one treatment and unequal counts are separate planning warnings", () => {
  const plan = makeExample();
  plan.pots.forEach((pot) => (pot.treatment = "A"));
  const result = analyze(plan);
  assert.equal(result.oneTreatment, true);
  assert.equal(result.completeConfounding, false);
  assert.equal(result.imbalance, true);
  assert.deepEqual(
    result.warnings.map((warning) => warning.code),
    ["ONE_TREATMENT", "UNEQUAL_POT_COUNTS"],
  );
});

test("co-location on one shelf is not complete treatment/shelf confounding", () => {
  const plan = makeExample();
  plan.pots.forEach((pot) => (pot.shelf = 1));
  assert.equal(analyze(plan).completeConfounding, false);
});

test("exhaustive independent pairwise oracle for all layouts with 1–6 pots (5460 cases)", () => {
  let count = 0;
  for (let n = 1; n <= 6; n++) {
    for (let encoded = 0; encoded < 4 ** n; encoded++) {
      let bits = encoded;
      const pots = Array.from({ length: n }, (_, index) => {
        const digit = bits % 4;
        bits = Math.floor(bits / 4);
        return {
          id: `p${index}`,
          treatment: digit < 2 ? "A" : "B",
          shelf: (digit % 2) + 1,
        };
      });
      const a = pots.filter((pot) => pot.treatment === "A");
      const b = pots.filter((pot) => pot.treatment === "B");
      // Independent oracle: both treatments exist and no cross-treatment pair
      // shares a location. With exactly two shelves this implies full separation.
      const oracle =
        a.length > 0 &&
        b.length > 0 &&
        a.every((left) => b.every((right) => left.shelf !== right.shelf));
      const result = analyze({ pots, readingsPerPot: 3, treatmentUnit: "pot" });
      assert.equal(result.completeConfounding, oracle, JSON.stringify(pots));
      assert.equal(result.potCount, n);
      assert.equal(result.experimentalUnitCount, n);
      assert.equal(result.readingCount, n * 3);
      assert.equal(result.perTreatment.A, a.length);
      assert.equal(result.perTreatment.B, b.length);
      assert.equal(result.imbalance, a.length !== b.length);
      assert.equal(result.shelves[1].total + result.shelves[2].total, n);
      count++;
    }
  }
  assert.equal(count, 5460);
});

test("shelf label and treatment label swaps leave confounding unchanged", () => {
  for (const mode of ["confounded", "mixed"]) {
    const original = makeExample(mode);
    const reversed = clone(original);
    reversed.pots.forEach((pot) => {
      pot.treatment = pot.treatment === "A" ? "B" : "A";
      pot.shelf = 3 - pot.shelf;
    });
    assert.equal(
      analyze(original).completeConfounding,
      analyze(reversed).completeConfounding,
    );
  }
});

test("pot limits accept 1 and 12, reject zero and 13", () => {
  for (const n of [0, 1, 12, 13]) {
    const plan = {
      pots: Array.from({ length: n }, (_, i) => ({
        id: `P${i}`,
        treatment: i % 2 ? "A" : "B",
        shelf: 1,
      })),
      readingsPerPot: 1,
      treatmentUnit: "pot",
    };
    assert.equal(validate(plan).valid, n >= 1 && n <= 12);
  }
});

test("reading count rejects coercions, fractions and nonfinite values", () => {
  for (const value of [
    undefined,
    null,
    "5",
    0,
    -1,
    1.5,
    31,
    NaN,
    Infinity,
    -Infinity,
    true,
  ]) {
    const plan = { ...makeExample(), readingsPerPot: value };
    assert.equal(validate(plan).valid, false);
    assert.throws(() => analyze(plan), TypeError);
  }
  assert.equal(
    analyze({ ...makeExample(), readingsPerPot: 30 }).readingCount,
    180,
  );
});

test("missing, blank and duplicate pot identifiers are rejected", () => {
  for (const id of [undefined, null, 4, "", "  "]) {
    const plan = makeExample();
    plan.pots[0].id = id;
    assert.equal(validate(plan).valid, false);
  }
  const plan = makeExample();
  plan.pots[1].id = " P1 ";
  assert.equal(validate(plan).valid, false);
});

test("invalid records, shelves, treatments and unit declarations are rejected", () => {
  for (const state of [null, undefined, [], "x", 4])
    assert.equal(validate(state).valid, false);
  for (const pots of [null, undefined, {}, "x", [null], [5], Array(3)])
    assert.equal(validate({ ...makeExample(), pots }).valid, false);
  for (const value of ["1", 0, 3, null, undefined, NaN]) {
    const plan = makeExample();
    plan.pots[0].shelf = value;
    assert.equal(validate(plan).valid, false);
  }
  for (const value of ["a", "C", "", null, 1]) {
    const plan = makeExample();
    plan.pots[0].treatment = value;
    assert.equal(validate(plan).valid, false);
  }
  for (const value of ["tray", "", undefined, null, 1])
    assert.equal(
      validate({ ...makeExample(), treatmentUnit: value }).valid,
      false,
    );
});

test("validation reports multiple actionable errors and analyze preserves details", () => {
  const plan = {
    pots: [{ id: "", treatment: "C", shelf: 9 }],
    readingsPerPot: 0,
    treatmentUnit: "no",
  };
  const result = validate(plan);
  assert.equal(result.errors.length, 5);
  assert.ok(
    result.errors.every(
      (error) =>
        typeof error.field === "string" && typeof error.message === "string",
    ),
  );
  assert.throws(
    () => analyze(plan),
    (error) => error.validationErrors.length === 5,
  );
});

test("pure functions preserve frozen input and examples are fresh instances", () => {
  const input = deepFreeze(makeExample());
  const before = JSON.stringify(input);
  validate(input);
  analyze(input);
  assert.equal(JSON.stringify(input), before);
  const a = makeExample();
  const b = makeExample();
  a.pots[0].shelf = 2;
  assert.equal(b.pots[0].shelf, 1);
  const result = analyze(b);
  result.perTreatment.A = 99;
  assert.equal(analyze(b).perTreatment.A, 3);
  assert.throws(() => makeExample("invalid"), TypeError);
});
