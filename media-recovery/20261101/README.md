# Recovered capture inputs — not a finished film

Recovered 2026-11-01 after the active workspace no longer contained the TrialMap media directories. This recovery-only branch does not change main, the deployed app, or the submitted entry.

## Verified inputs

- 787bad74e861e514ef82904037870072552f0bd6: 11 actual-app screenshots plus state-proof.json; source capture script remains at this branch root.
- 9168c7b54909bcf6d70584198a0051a13e6be128: 240 actual keyboard-interaction frames, additional capture evidence and state proof. Deduplicated to 19 distinct files (17 distinct frames); recovery-map.json preserves every original filename and byte hash.
- manifest.json records exact official artifact digests and recovered ZIP digests. The preservation workflow checked every restored member byte-for-byte against the downloaded archive before committing.
- Recovery job: https://github.com/sharonbasovich/trialmap/actions/runs/41298466079
- Run `python media-recovery/20261101/verify.py` from a checkout to verify archives without extraction or network.

The ZIPs together occupy 3,299,800 bytes rather than retaining the 26,182,328-byte original archives. These are actual UI captures, not newly recorded video or generated UI. Their original capture scripts remain in Git history. Main app source stays c273a51d4e2d867a2f729a318bf04dd5be144bbf.

## Missing / deliberately not asserted

The finished 37.5-second silent edit and 12-second AV proof were not present in this workspace. A recorded historical output hash alone cannot recover those bytes. Audio sources and editorial assembly dependencies must be recovered and verified before rebuilding. Any recovered script is historical source, not proof of a successful new render.

Both original v6 candidates remain rejected. There has been no actual auditory acceptance or normal-speed creative approval. Do not publish these inputs as a finished film, claim listening occurred, or substitute technical verification for creative review. No new generation credits were used.
