# TrialMap

**Reviewed educational prototype. [Open the live demo](https://sharonbasovich.github.io/trialmap/). [Submitted to STEMergent Hacks 2026](https://devpost.com/software/trialmap-we0k6o). Not a scientific-validity guarantee.**
An educational classroom plant-trial planner: distinguish repeated readings from independent treatment units, and spot complete treatment–location confounding before growing plants.

## Run

Node 22+; `npm ci`, `npm start` then open http://localhost:4173. Runtime has no third-party dependencies. `npm run build` creates a deployable static `dist/` using relative paths.

## Verify

`npm run check && npm test` runs syntax and domain checks (including exhaustive 5,460 layouts against a pairwise oracle). `npx playwright install chromium && npm run test:browser` runs actual Chromium interaction/mobile/accessibility checks and writes screenshots/PDF under `evidence/`. Browser testing may require a supported environment; unit tests are not visual acceptance.

## Demo

Six independently treated pots, three A on shelf1 and three B on shelf2, measured five times:30 readings but6 units. Increase readings; the location confounding remains. Move a pot or try the mixed layout; only the specific complete-confounding pattern clears. Select shared treatment and unit count becomes unknown. Compare to starting plan and print the plan.

## Limits

Two treatments and two shelf locations, six pots in the UI. A unit count is known only after the user explicitly declares each pot independently treated. Shared trays may be units; this tool cannot infer their count. No significance, sample-size/power, validity, randomization, safety or yield prediction. Other confounding remains possible. No humans, animals or hazardous experiments. No student/teacher validation or adoption claims. This is not an original invention of experimental-design assistance; NC3Rs EDA is an existing broader tool.

All data stays in memory in the tab; no persistence, accounts, telemetry or automatic uploads. Reload discards changes. Printing uses the browser/system print destination selected by the user. The static host receives ordinary page requests; scientific inputs are not sent by app code.

Sources and adaptation notes are in the app and BUILD-BASELINE.md. Original source and inline vector artwork, AI-assisted. Fresh implementation started October31 2026 at04:02UTC, after verified event opening04:00UTC. No pre-window code/assets. The initial independently reviewed four-file app source is `f6c67e0e05c62e62026e9d15a50d662713015f85`; subsequent reviewed changes are in [current source](https://github.com/sharonbasovich/trialmap/tree/main). Source/domain and actual Chromium desktop/mobile/print reviews passed; this is not teacher/student validation. Live-host verification runs separately in the Verify live TrialMap Pages workflow.
