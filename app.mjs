import { analyze, makeExample } from "./model.mjs";
let state = makeExample("confounded");
let selected = "P1";
let compared = false;
const initial = analyze(makeExample("confounded"));
const $ = (id) => document.getElementById(id);
const plant = (t, id) =>
  `<svg viewBox="0 0 80 100" aria-hidden="true"><path d="M40 64V23M40 43L24 31M40 51L56 36" fill="none" stroke="#41694c" stroke-width="2.5"/><path d="M40 28C18 26 18 9 19 8C36 8 43 16 40 28Z" fill="#759b54"/><path d="M40 36C42 14 61 13 64 14C63 31 53 39 40 36Z" fill="#41694c"/><path d="M28 36C12 36 11 24 12 21C25 20 32 26 28 36Z" fill="#9dbd6d"/><path d="M51 43C54 29 68 29 70 31C67 43 61 48 51 43Z" fill="#86a85f"/><path d="M17 61H63L57 91Q40 98 23 91Z" fill="${t === "A" ? "#b6ce77" : "#d99b7d"}" stroke="#426148" stroke-width="1.3"/><path d="M16 59H64V66H16Z" fill="${t === "A" ? "#d4e88c" : "#ecbba8"}" stroke="#426148" stroke-width="1.3"/><path d="M28 71L31 88" stroke="#fff" opacity=".35" stroke-width="3"/><text x="40" y="85" text-anchor="middle" font-family="Arial" font-size="13" font-weight="bold" fill="#183e35">${t}</text></svg>`;
function announce(text) {
  $("announcement").textContent = text;
}
function finding(a) {
  if (a.unitUncertain)
    return {
      kind: "unknown",
      title: "First, identify the treatment unit.",
      text: "Shared treatment can make a tray or reservoir the experimental unit. The number of independent units is unknown here, even though the pot and reading counts are known.",
      small:
        "Clarify this assumption with your teacher before interpreting the layout.",
    };
  if (a.oneTreatment)
    return {
      kind: "unknown",
      title: "The comparison is missing a treatment.",
      text: "Both A and B need to be present to compare them. This layout currently contains only one treatment.",
      small: "No claim about sample adequacy is made.",
    };
  if (a.completeConfounding)
    return {
      kind: "confounded",
      title: "Treatment and shelf are tangled.",
      text: "Every A pot is on one shelf; every B pot is on the other. A growth difference could be treatment, location, or both.",
      small: "More readings will not separate those explanations.",
    };
  return {
    kind: "mixed",
    title: "This complete confounding is absent.",
    text: "The declared layout no longer separates A and B entirely by shelf. That removes this specific pattern, not every possible design flaw.",
    small: a.imbalance
      ? "Treatment pot counts differ. Unequal counts need thoughtful planning."
      : "Equal pot counts do not establish enough independent trials.",
  };
}
function render({ focus = null, notice = null } = {}) {
  const a = analyze(state);
  const p = state.pots.find((p) => p.id === selected) || state.pots[0];
  selected = p.id;
  $("shelves").innerHTML = [1, 2]
    .map(
      (s) =>
        `<section class="shelf" aria-labelledby="shelf-${s}"><div class="shelf-header"><h3 id="shelf-${s}">SHELF 0${s}</h3><span>${a.shelves[s].total} POTS · LOCATION ${s}</span></div><div class="pot-row">${
          state.pots
            .filter((p) => p.shelf === s)
            .map(
              (p) =>
                `<button type="button" class="pot" data-pot="${p.id}" aria-pressed="${p.id === selected}" aria-label="${p.id} ${p.treatment}, pot with treatment ${p.treatment}, shelf ${s}">${plant(p.treatment, p.id)}<span class="pot-label">${p.id}<span class="tag ${p.treatment.toLowerCase()}">${p.treatment}</span></span></button>`,
            )
            .join("") ||
          '<span class="empty-shelf">No pots here yet. Select a pot on the other shelf to move it.</span>'
        }</div></section>`,
    )
    .join("");
  $("pot-editor").innerHTML =
    `<div class="editor-title">SELECTED POT<strong>${p.id}</strong></div><div><label for="pot-treatment">Treatment</label><select id="pot-treatment"><option value="A" ${p.treatment === "A" ? "selected" : ""}>Treatment A</option><option value="B" ${p.treatment === "B" ? "selected" : ""}>Treatment B</option></select></div><div><label for="pot-shelf">Location</label><select id="pot-shelf"><option value="1" ${p.shelf === 1 ? "selected" : ""}>Shelf 01</option><option value="2" ${p.shelf === 2 ? "selected" : ""}>Shelf 02</option></select></div>`;
  $("readings-count").textContent = a.readingCount;
  $("units-count").textContent = a.experimentalUnitCount ?? "?";
  $("readings-output").textContent = state.readingsPerPot;
  $("readings").value = state.readingsPerPot;
  $("unit").value = state.treatmentUnit;
  const f = finding(a);
  $("finding").innerHTML =
    `<div class="finding ${f.kind}"><h3>${f.title}</h3><p>${f.text}</p><small>${f.small}</small></div>`;
  $("matrix").innerHTML =
    `<table class="matrix"><caption class="sr-only">Number of pots per treatment and shelf</caption><thead><tr><th scope="col">Location</th><th scope="col">Treatment A</th><th scope="col">Treatment B</th></tr></thead><tbody>${[1, 2].map((s) => `<tr><th scope="row">Shelf 0${s}</th>${["A", "B"].map((t) => `<td><span class="sr-only">${a.shelves[s][t]} pots</span><span aria-hidden="true">${a.shelves[s][t] ? Array(a.shelves[s][t]).fill(`<i class="dot ${t.toLowerCase()}"></i>`).join("") : '<span class="zero">—</span>'}</span></td>`).join("")}</tr>`).join("")}<tr><th scope="row">Total pots</th><td>${a.perTreatment.A}</td><td>${a.perTreatment.B}</td></tr></tbody></table>`;
  $("matrix-explainer").textContent = a.completeConfounding
    ? "The empty opposite cells reveal the catch: shelf membership completely predicts treatment."
    : a.oneTreatment
      ? "Only one treatment is present. There is no A-versus-B comparison to assess."
      : "Read the cells as pot counts, not proof of sufficient replication. Other factors are outside this model.";
  $("next-step").innerHTML =
    `<div class="next-step"><strong>Next question:</strong> ${a.unitUncertain ? "What receives treatment independently: each pot, a tray, or something else?" : a.oneTreatment ? "Which pots will receive the other treatment?" : a.completeConfounding ? "Could you place both treatments on both shelves, then ask your teacher about random allocation?" : "How will you assign treatments, keep measurements consistent, and account for other environmental differences?"}</div>`;
  $("compare").setAttribute("aria-expanded", String(compared));
  $("comparison").hidden = !compared;
  $("compare").textContent = compared
    ? "Hide comparison"
    : "Compare with starting plan";
  $("comparison").innerHTML =
    `<dl><dt>Starting plan</dt><dd>Current plan</dd><dt>${initial.readingCount} readings</dt><dd>${a.readingCount} readings</dd><dt>${initial.experimentalUnitCount} independent pots*</dt><dd>${a.experimentalUnitCount === null ? "Independent units unknown" : a.experimentalUnitCount + " independent pots*"}</dd><dt>Complete shelf confounding</dt><dd>${a.completeConfounding ? "Still present" : a.oneTreatment ? "Comparison unavailable" : "Not detected in declared layout"}</dd></dl><p>*Only when each pot receives treatment independently. This compares layouts, not expected plant outcomes.</p>`;
  if (focus) {
    const el = document.querySelector(focus);
    el?.focus({ preventScroll: true });
  }
  if (notice) announce(notice);
}
$("shelves").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pot]");
  if (!b) return;
  selected = b.dataset.pot;
  render({
    focus: `[data-pot="${selected}"]`,
    notice: `Selected pot ${selected}. Use the treatment and location controls below.`,
  });
});
$("pot-editor").addEventListener("change", (e) => {
  const p = state.pots.find((p) => p.id === selected);
  if (e.target.id === "pot-treatment") p.treatment = e.target.value;
  else if (e.target.id === "pot-shelf") p.shelf = Number(e.target.value);
  else return;
  const focus = "#" + e.target.id;
  render({
    focus,
    notice: `Pot ${p.id}: treatment ${p.treatment}, shelf ${p.shelf}. ${finding(analyze(state)).title}`,
  });
});
$("readings").addEventListener("input", (e) => {
  state.readingsPerPot = Number(e.target.value);
  render();
});
$("readings").addEventListener("change", () =>
  announce(
    `${analyze(state).readingCount} readings. ${analyze(state).experimentalUnitCount ?? "Unknown"} experimental units.`,
  ),
);
$("unit").addEventListener("change", (e) => {
  state.treatmentUnit = e.target.value;
  render({ notice: finding(analyze(state)).title });
});
$("confounded").addEventListener("click", () => {
  state = makeExample("confounded");
  selected = "P1";
  render({
    notice:
      "Starting plan restored: six independently treated pots, five readings each, complete treatment and shelf confounding.",
  });
});
$("mixed").addEventListener("click", () => {
  state = { ...state, pots: makeExample("mixed").pots };
  selected = "P3";
  render({
    notice:
      "Mixed example loaded. Each shelf now has both treatments. Only the complete treatment and shelf confounding pattern is removed.",
  });
});
$("compare").addEventListener("click", () => {
  compared = !compared;
  render();
});
$("print").addEventListener("click", () => window.print());
render();
