import { finding, nextQuestion } from "./feedback.mjs?v=c2407cf0fb5f";
import { analyze, makeExample } from "./model.mjs";
import { copyPlan, comparisonRows, describeChanges, hasSessionPlanWork } from "./checkpoint.mjs?v=0303edf52882";
let checkpoint = null;
let confirmingReplacement = false;
let comparisonMode = "starting";
let state = makeExample("confounded");
let selected = "P1";
let compared = false;
let presetUndo = null;
function rememberPreset(next, trigger, label) {
  // A no-op example must not replace the recoverable custom plan.
  if (JSON.stringify(next) !== JSON.stringify(state)) {
    confirmingReplacement = false;
    presetUndo = { plan: copyPlan(state), selected, trigger, label };
  }
}
const startingPlan = makeExample("confounded");
const initial = analyze(startingPlan);
let exitWarningAttached = false;
function warnBeforeExit(event) {
  event.preventDefault();
  event.returnValue = "";
}
function syncExitWarning() {
  const needed = hasSessionPlanWork(state, startingPlan, checkpoint, presetUndo);
  if (needed === exitWarningAttached) return;
  window[needed ? "addEventListener" : "removeEventListener"]("beforeunload", warnBeforeExit);
  exitWarningAttached = needed;
}
const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const potAnimations = new Set();
function stopPotMotion() {
  for (const animation of potAnimations) animation.cancel();
  potAnimations.clear();
}
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) stopPotMotion();
});
window.addEventListener("beforeprint", stopPotMotion);
function movePotsFrom(previous) {
  if (!previous || reducedMotion.matches || window.matchMedia("print").matches || !CSS.supports("translate", "1px")) return;
  // Read all final positions before starting animations: only transforms animate.
  const moves = [...document.querySelectorAll("[data-pot]")].map((pot) => {
    const from = previous.get(pot.dataset.pot);
    const to = pot.getBoundingClientRect();
    return { pot, dx: from ? from.left - to.left : 0, dy: from ? from.top - to.top : 0 };
  });
  for (const { pot, dx, dy } of moves) {
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    if (typeof pot.animate !== "function") continue;
    const animation = pot.animate(
      [{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }],
      { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    potAnimations.add(animation);
    animation.onfinish = animation.oncancel = () => potAnimations.delete(animation);
  }
}
const plant = (t, id) =>
  `<svg viewBox="0 0 80 100" aria-hidden="true"><path d="M40 64V23M40 43L24 31M40 51L56 36" fill="none" stroke="#41694c" stroke-width="2.5"/><path d="M40 28C18 26 18 9 19 8C36 8 43 16 40 28Z" fill="#759b54"/><path d="M40 36C42 14 61 13 64 14C63 31 53 39 40 36Z" fill="#41694c"/><path d="M28 36C12 36 11 24 12 21C25 20 32 26 28 36Z" fill="#9dbd6d"/><path d="M51 43C54 29 68 29 70 31C67 43 61 48 51 43Z" fill="#86a85f"/><path d="M17 61H63L57 91Q40 98 23 91Z" fill="${t === "A" ? "#b6ce77" : "#d99b7d"}" stroke="#426148" stroke-width="1.3"/><path d="M16 59H64V66H16Z" fill="${t === "A" ? "#d4e88c" : "#ecbba8"}" stroke="#426148" stroke-width="1.3"/><path d="M28 71L31 88" stroke="#fff" opacity=".35" stroke-width="3"/></svg>`;
function announce(text) {
  $("announcement").textContent = text;
}

function render({ focus = null, notice = null, movePots = false } = {}) {
  // Capture the visible, possibly in-flight position before cancelling an old move.
  const previous = movePots && !reducedMotion.matches
    ? new Map([...document.querySelectorAll("[data-pot]")].map((pot) => [pot.dataset.pot, pot.getBoundingClientRect()]))
    : null;
  stopPotMotion();
  syncExitWarning();
  const a = analyze(state);
  $("undo-preset").disabled = !presetUndo;
  $("undo-preset").setAttribute("aria-label", presetUndo?.trigger === "#restore-checkpoint" ? "Undo checkpoint restore" : "Undo example change");
  $("capture-checkpoint").textContent = confirmingReplacement ? "Confirm replacement" : checkpoint ? "Replace checkpoint" : "Capture current plan";
  $("cancel-checkpoint").hidden = !confirmingReplacement;
  $("undo-checkpoint").hidden = presetUndo?.trigger !== "#restore-checkpoint";
  $("restore-checkpoint").disabled = !checkpoint || JSON.stringify(checkpoint.plan) === JSON.stringify(state);
  $("comparison-source").hidden = !checkpoint;
  $("comparison-mode").value = comparisonMode;
  $("checkpoint-status").textContent = confirmingReplacement
    ? "Replace the saved checkpoint with the current plan? The previous checkpoint will be discarded; current edits stay unchanged."
    : checkpoint
    ? `Checkpoint: ${analyze(checkpoint.plan).readingCount} readings. Edit the plan, then compare. Kept only in this tab.`
    : "Capture a checkpoint before editing to compare your own before and after. Kept only in this tab.";
  $("preset-result").textContent = presetUndo?.label ?? "Explore the examples.";
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
                `<button type="button" class="pot" data-pot="${p.id}" aria-pressed="${p.id === selected}" aria-label="${p.id} ${p.treatment}, pot with treatment ${p.treatment}, shelf ${s}">${plant(p.treatment, p.id)}<span class="pot-label">${p.id} <span class="tag ${p.treatment.toLowerCase()}">${p.treatment}</span></span></button>`,
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
    `<div class="next-step"><strong>Next question:</strong> ${nextQuestion(a)}</div>`;
  $("compare").setAttribute("aria-expanded", String(compared));
  $("comparison").hidden = !compared;
  $("compare").textContent = compared
    ? "Hide comparison"
    : comparisonMode === "checkpoint" ? "Compare with checkpoint" : "Compare with starting plan";
  const baseline = comparisonMode === "checkpoint" && checkpoint ? analyze(checkpoint.plan) : initial;
  const before = comparisonRows(baseline);
  const after = comparisonRows(a);
  $("comparison").innerHTML =
    `<dl><dt>${comparisonMode === "checkpoint" ? "Your checkpoint" : "Starting plan"}</dt><dd>Current plan</dd><dt>${before.readings}</dt><dd>${after.readings}</dd><dt>${before.units}</dt><dd>${after.units}</dd><dt>${before.pattern}</dt><dd>${after.pattern}</dd></dl><p>*Only when each pot receives treatment independently. Shared or unknown treatment units stay unknown. Shelf patterns describe the declared pots, not proof of independence or a valid experiment. This compares layouts, not expected plant outcomes.</p>`;
  const differences = describeChanges(comparisonMode === "checkpoint" && checkpoint ? checkpoint.plan : makeExample("confounded"), state);
  const changeSummary = document.createElement("div");
  changeSummary.id = "comparison-changes";
  const heading = document.createElement("p");
  heading.textContent = differences.length ? "What changed" : `No changes since ${comparisonMode === "checkpoint" ? "checkpoint" : "starting plan"}.`;
  changeSummary.append(heading);
  if (differences.length) {
    const list = document.createElement("ul");
    for (const difference of differences) {
      const item = document.createElement("li");
      item.textContent = difference;
      list.append(item);
    }
    changeSummary.append(list);
  }
  $("comparison").append(changeSummary);
  movePotsFrom(previous);
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
  if (e.target.id === "pot-treatment") {
    if (p.treatment !== e.target.value) { presetUndo = null; confirmingReplacement = false; }
    p.treatment = e.target.value;
  } else if (e.target.id === "pot-shelf") {
    if (p.shelf !== Number(e.target.value)) { presetUndo = null; confirmingReplacement = false; }
    p.shelf = Number(e.target.value);
  }
  else return;
  const focus = "#" + e.target.id;
  render({
    focus,
    movePots: e.target.id === "pot-shelf",
    notice: `Pot ${p.id}: treatment ${p.treatment}, shelf ${p.shelf}. ${finding(analyze(state)).title}`,
  });
});
$("readings").addEventListener("input", (e) => {
  if (state.readingsPerPot !== Number(e.target.value)) { presetUndo = null; confirmingReplacement = false; }
  state.readingsPerPot = Number(e.target.value);
  render();
});
$("readings").addEventListener("change", () =>
  announce(
    `${analyze(state).readingCount} readings. ${analyze(state).experimentalUnitCount ?? "Unknown"} experimental units.`,
  ),
);
$("unit").addEventListener("change", (e) => {
  if (state.treatmentUnit !== e.target.value) { presetUndo = null; confirmingReplacement = false; }
  state.treatmentUnit = e.target.value;
  render({ notice: finding(analyze(state)).title });
});
$("confounded").addEventListener("click", () => {
  const next = makeExample("confounded");
  rememberPreset(next, "#confounded", "Starting plan restored.");
  state = next;
  selected = "P1";
  render({
    movePots: true,
    notice:
      "Starting plan restored: six independently treated pots, five readings each, complete treatment and shelf confounding." + (presetUndo ? " Undo example change is available." : ""),
  });
});
$("mixed").addEventListener("click", () => {
  const next = { ...state, pots: makeExample("mixed").pots };
  rememberPreset(next, "#mixed", "Mixed layout applied.");
  state = next;
  selected = "P3";
  render({
    movePots: true,
    notice:
      "Mixed example loaded. Each shelf now has both treatments. Only the complete treatment and shelf confounding pattern is removed." + (presetUndo ? " Undo example change is available." : ""),
  });
});
function undoReplacement() {
  if (!presetUndo) return;
  const previous = presetUndo;
  confirmingReplacement = false;
  state = copyPlan(previous.plan);
  selected = previous.selected;
  presetUndo = null;
  render({
    focus: previous.trigger,
    movePots: true,
    notice: `Previous plan restored. Selected pot ${selected}. ${finding(analyze(state)).title}`,
  });
}
$("undo-preset").addEventListener("click", undoReplacement);
$("undo-checkpoint").addEventListener("click", undoReplacement);
$("capture-checkpoint").addEventListener("click", () => {
  if (checkpoint && !confirmingReplacement) {
    confirmingReplacement = true;
    render({ notice: "Confirm replacement to discard the earlier checkpoint, or cancel to keep it." });
    return;
  }
  confirmingReplacement = false;
  checkpoint = { plan: copyPlan(state), selected };
  comparisonMode = "checkpoint";
  render({ notice: "Current plan captured as your checkpoint. Edit the plan, then compare. Reload clears the checkpoint." });
});
function cancelReplacement() {
  confirmingReplacement = false;
  render({ focus: "#capture-checkpoint", notice: "Replacement cancelled. Your checkpoint and current edits are unchanged." });
}
$("cancel-checkpoint").addEventListener("click", cancelReplacement);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && confirmingReplacement) {
    e.preventDefault();
    cancelReplacement();
  }
});
$("comparison-mode").addEventListener("change", (e) => {
  comparisonMode = e.target.value;
  render({ notice: comparisonMode === "checkpoint" ? "Comparing with your captured checkpoint." : "Comparing with the original starting example." });
});
$("restore-checkpoint").addEventListener("click", () => {
  if (!checkpoint || JSON.stringify(checkpoint.plan) === JSON.stringify(state)) return;
  confirmingReplacement = false;
  presetUndo = { plan: copyPlan(state), selected, trigger: "#restore-checkpoint", label: "Checkpoint restored. Undo until next plan edit." };
  state = copyPlan(checkpoint.plan);
  selected = checkpoint.selected;
  // Restore becomes disabled, so move focus to the available recovery action.
  render({ movePots: true, focus: "#undo-checkpoint", notice: "Checkpoint restored. Undo checkpoint restore is available until the next plan edit." });
});
$("compare").addEventListener("click", () => {
  compared = !compared;
  render();
});
$("print").addEventListener("click", () => window.print());
render();

